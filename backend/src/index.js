const express = require('express');
const http = require('http');
const { Server: IOServer } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { runMigration } = require('./config/database');
const authRoutes = require('./api/auth');
const calendarRoutes = require('./api/calendars');
const eventRoutes = require('./api/events');
const organizationRoutes = require('./api/organizations');
const taskRoutes = require('./api/tasks');
const aiRoutes = require('./api/ai');

const app = express();
const PORT = process.env.PORT || 8000;

// CORS configuration (must come before other middleware)
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests or same-origin requests)
    if (!origin) return callback(null, true);
    
    // Get allowed origins from environment variable (comma-separated)
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001'
        ];
    
    // In development, be more permissive
    if (process.env.NODE_ENV === 'development') {
      // Check if origin matches any allowed origin or is a localhost variant
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
      if (allowedOrigins.indexOf(origin) !== -1 || isLocalhost) {
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Enable CORS for all routes (before other middleware)
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Security middleware (after CORS)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/calendars', calendarRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
const startServer = async () => {
  try {
    // Run database migration
    await runMigration();
    const server = http.createServer(app);
    const io = new IOServer(server, {
      path: '/ws/ai',
      cors: {
        origin: corsOptions.origin,
        credentials: true,
      },
    });

    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) {
          return next(new Error('Missing token'));
        }
        
        const { verifyToken } = require('./middleware/auth');
        const decoded = verifyToken(token);
        const User = require('./models/User');
        const user = await User.findById(decoded.id);
        
        if (!user) {
          return next(new Error('User not found'));
        }
        
        socket.data.user = user;
        next();
      } catch (e) {
        console.error('Socket.IO auth error:', e.message);
        next(new Error('Invalid token'));
      }
    });

    // Import AI services for Socket.IO handler
    const conversationManager = require('./services/ai/conversationManager');
    const intentRouter = require('./services/ai/intentRouter');
    const nlpEventService = require('./services/ai/nlpEventService');
    const nlpTaskService = require('./services/ai/nlpTaskService');
    const queryProcessor = require('./services/ai/queryProcessor');
    const Calendar = require('./models/Calendar');
    const Task = require('./models/Task');
    const Event = require('./models/Event');
    const openaiService = require('./services/openaiService');
    const User = require('./models/User');

    io.on('connection', async (socket) => {
      console.log('Socket.IO connected:', socket.id, 'user', socket.data?.user?.id);
      
      const user = socket.data?.user;
      if (!user) {
        socket.emit('chat:error', { message: 'Authentication failed' });
        socket.disconnect();
        return;
      }

      socket.emit('chat:info', { message: 'Connected to AI Socket.IO' });

      socket.on('chat:send', async (payload = {}) => {
        try {
          const { message, conversation_id, model, temperature, max_tokens } = payload;
          const text = typeof message === 'string' ? message.trim() : '';
          
          if (!text) {
            return socket.emit('chat:error', { message: 'Empty message' });
          }

          // Check if OpenAI is enabled
          if (!openaiService.isEnabled()) {
            return socket.emit('chat:error', { 
              message: 'AI Assistant is not available. OpenAI API key is not configured.' 
            });
          }

          // Role-based access control for models
          const requestedModel = model || process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
          if (requestedModel.toLowerCase().includes('gpt-4') && user.role !== 'admin') {
            return socket.emit('chat:error', { 
              message: 'Access to gpt-4 model is restricted to admin users.' 
            });
          }

          // Fetch user context
          const calendars = await Calendar.findByUserId(user.id);
          const tasks = await Task.findByUserId(user.id, { status: 'todo' });
          const pendingTasks = tasks.filter(t => t.status === 'todo' || t.status === 'in_progress');
          const now = new Date();
          const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          const events = await Event.findByUserId(user.id, now.toISOString(), nextWeek.toISOString());

          const userContext = {
            calendars: calendars.map(c => ({ id: c.id, name: c.name, color: c.color })),
            tasks: pendingTasks.slice(0, 10).map(t => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              due_date: t.due_date,
            })),
            events: events.slice(0, 10).map(e => ({
              id: e.id,
              title: e.title,
              start_time: e.start_time,
              end_time: e.end_time,
              calendar_name: e.calendar_name,
            })),
          };

          // Classify intent
          const intentResult = await intentRouter.classifyIntent(text, {
            conversation_id,
            ...userContext,
          });

          let aiResponseContent = '';
          let actionResult = null;
          let finalConversationId = conversation_id;

          // Route to appropriate handler based on intent
          switch (intentResult.intent) {
            case intentRouter.INTENTS.CREATE_EVENT:
              actionResult = await nlpEventService.createEventFromNL(
                user.id,
                text,
                userContext
              );
              aiResponseContent = actionResult.message;
              break;

            case intentRouter.INTENTS.CREATE_TASK:
              actionResult = await nlpTaskService.createTaskFromNL(
                user.id,
                text,
                userContext
              );
              aiResponseContent = actionResult.message;
              break;

            case intentRouter.INTENTS.QUERY_CALENDAR:
            case intentRouter.INTENTS.QUERY_TASK:
              const queryResult = await queryProcessor.processQuery(
                text,
                {
                  events: userContext.events || [],
                  tasks: userContext.tasks || [],
                  calendars: userContext.calendars || [],
                }
              );
              aiResponseContent = queryResult.answer;
              if (queryResult.events.length > 0 || queryResult.tasks.length > 0) {
                actionResult = {
                  events: queryResult.events,
                  tasks: queryResult.tasks,
                };
              }
              break;

            case intentRouter.INTENTS.SCHEDULING:
              const schedulingResponse = await conversationManager.processMessage(
                user.id,
                text,
                conversation_id,
                userContext,
                {
                  promptType: 'SCHEDULING_ASSISTANT',
                  model: requestedModel,
                  temperature: temperature || 0.7,
                  maxTokens: max_tokens || 1000,
                }
              );
              aiResponseContent = schedulingResponse.message;
              finalConversationId = schedulingResponse.conversation_id;
              break;

            default:
              // General chat - use conversation manager
              const chatResponse = await conversationManager.processMessage(
                user.id,
                text,
                conversation_id,
                userContext,
                {
                  model: requestedModel,
                  temperature: temperature || 0.7,
                  maxTokens: max_tokens || 1000,
                }
              );
              aiResponseContent = chatResponse.message;
              finalConversationId = chatResponse.conversation_id;
              break;
          }

          // Get or create conversation
          const conversation = await conversationManager.getOrCreateConversation(
            user.id,
            conversation_id
          );

          // Save user message
          await conversationManager.addMessage(
            conversation.id,
            'user',
            text,
            { intent: intentResult.intent }
          );

          // Stream response (simulate streaming by sending chunks)
          // In a real implementation, you would use OpenAI's streaming API
          const words = aiResponseContent.split(/(\s+)/);
          for (let i = 0; i < words.length; i++) {
            socket.emit('chat:chunk', { delta: words[i] });
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Send final message
          socket.emit('chat:final', { 
            message: aiResponseContent,
            conversation_id: conversation.id,
            intent: intentResult.intent,
            action: actionResult,
          });

          // Save assistant response
          await conversationManager.addMessage(
            conversation.id,
            'assistant',
            aiResponseContent,
            { intent: intentResult.intent, action: actionResult }
          );

        } catch (error) {
          console.error('chat:send error', error);
          socket.emit('chat:error', { 
            message: error.message || 'Failed to process message. Please try again.' 
          });
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket.IO disconnected:', socket.id);
      });
    });

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔗 API base URL: http://localhost:${PORT}/api`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🧠 AI WS (Socket.IO) endpoint: ws://localhost:${PORT}/ws/ai`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = app;