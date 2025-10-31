const intentRouter = require('../../../services/ai/intentRouter');
const openaiService = require('../../../services/openaiService');

// Mock OpenAI service
jest.mock('../../../services/openaiService');

describe('Intent Router', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('classifyIntent', () => {
    it('should classify CREATE_EVENT intent when OpenAI is enabled', async () => {
      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          intent: 'create_event',
          confidence: 0.9,
          entities: {
            event_title: 'Meeting with John',
            date_mention: 'tomorrow',
            time_mention: '2pm',
            action_type: 'create',
          },
        }),
      });

      const result = await intentRouter.classifyIntent(
        'Schedule a meeting with John tomorrow at 2pm'
      );

      expect(result.intent).toBe('create_event');
      expect(result.confidence).toBe(0.9);
      expect(result.entities).toBeDefined();
      expect(openaiService.chatCompletion).toHaveBeenCalled();
    });

    it('should classify CREATE_TASK intent', async () => {
      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          intent: 'create_task',
          confidence: 0.85,
          entities: {
            task_title: 'Review report',
            priority_mention: 'high',
            action_type: 'create',
          },
        }),
      });

      const result = await intentRouter.classifyIntent(
        'Add a high priority task to review report'
      );

      expect(result.intent).toBe('create_task');
      expect(result.confidence).toBe(0.85);
    });

    it('should classify QUERY_CALENDAR intent', async () => {
      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          intent: 'query_calendar',
          confidence: 0.95,
          entities: {
            action_type: 'query',
          },
        }),
      });

      const result = await intentRouter.classifyIntent('What do I have tomorrow?');

      expect(result.intent).toBe('query_calendar');
      expect(result.confidence).toBe(0.95);
    });

    it('should fallback to keyword-based classification when OpenAI is disabled', async () => {
      openaiService.isEnabled.mockReturnValue(false);

      const result = await intentRouter.classifyIntent(
        'Schedule a meeting tomorrow at 2pm'
      );

      expect(result.intent).toBe('create_event');
      expect(result.confidence).toBe(0.7);
      expect(openaiService.chatCompletion).not.toHaveBeenCalled();
    });

    it('should fallback when OpenAI API returns invalid JSON', async () => {
      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: 'This is not JSON',
      });

      const result = await intentRouter.classifyIntent('Schedule a meeting');

      // Should fallback to keyword-based
      expect(result.intent).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should fallback when OpenAI API throws error', async () => {
      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockRejectedValue(new Error('API Error'));

      const result = await intentRouter.classifyIntent('Schedule a meeting');

      // Should fallback to keyword-based
      expect(result.intent).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should default to GENERAL_CHAT for unknown intents', async () => {
      openaiService.isEnabled.mockReturnValue(true);
      openaiService.chatCompletion.mockResolvedValue({
        content: JSON.stringify({
          intent: 'unknown_intent',
          confidence: 0.5,
          entities: {},
        }),
      });

      const result = await intentRouter.classifyIntent('Hello, how are you?');

      expect(result.intent).toBe('general_chat');
    });

    it('should handle keyword-based classification for CREATE_TASK', async () => {
      openaiService.isEnabled.mockReturnValue(false);
      const result = await intentRouter.classifyIntent('Create a new task for tomorrow');
      expect(result.intent).toBe('create_task');
    });

    it('should handle keyword-based classification for QUERY_TASK', async () => {
      openaiService.isEnabled.mockReturnValue(false);
      const result = await intentRouter.classifyIntent('Show me all my tasks');
      expect(result.intent).toBe('query_task');
    });

    it('should handle keyword-based classification for general chat', async () => {
      openaiService.isEnabled.mockReturnValue(false);
      const result = await intentRouter.classifyIntent('Hello, how can you help me?');
      expect(result.intent).toBe('general_chat');
    });
  });

  describe('INTENTS constants', () => {
    it('should export all intent types', () => {
      expect(intentRouter.INTENTS.CREATE_EVENT).toBe('create_event');
      expect(intentRouter.INTENTS.CREATE_TASK).toBe('create_task');
      expect(intentRouter.INTENTS.QUERY_CALENDAR).toBe('query_calendar');
      expect(intentRouter.INTENTS.QUERY_TASK).toBe('query_task');
      expect(intentRouter.INTENTS.SCHEDULING).toBe('scheduling');
      expect(intentRouter.INTENTS.GENERAL_CHAT).toBe('general_chat');
    });
  });
});

