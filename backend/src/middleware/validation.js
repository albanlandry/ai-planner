const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message)
      });
    }
    
    req.body = value;
    next();
  };
};

// User validation schemas
const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(2).max(255).required(),
  password: Joi.string().min(6).required()
});

const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const userUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(255),
  avatar_url: Joi.string().uri()
});

// Calendar validation schemas
const calendarCreateSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#3B82F6'),
  is_primary: Joi.boolean().default(false)
});

const calendarUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
  is_primary: Joi.boolean()
});

// Event validation schemas
const eventCreateSchema = Joi.object({
  calendar_id: Joi.string().uuid().required(),
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).allow(''),
  start_time: Joi.date().iso().required(),
  end_time: Joi.date().iso().greater(Joi.ref('start_time')).required(),
  is_all_day: Joi.boolean().default(false),
  location: Joi.string().max(255).allow(''),
  attendees: Joi.array().items(Joi.object({
    email: Joi.string().email(),
    name: Joi.string().min(1).max(255)
  })),
  recurrence_rule: Joi.object({
    frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly'),
    interval: Joi.number().integer().min(1),
    end_date: Joi.date().iso(),
    count: Joi.number().integer().min(1)
  })
});

const eventUpdateSchema = Joi.object({
  title: Joi.string().min(1).max(255),
  description: Joi.string().max(1000).allow(''),
  start_time: Joi.date().iso(),
  end_time: Joi.date().iso(),
  is_all_day: Joi.boolean(),
  location: Joi.string().max(255).allow(''),
  attendees: Joi.array().items(Joi.object({
    email: Joi.string().email(),
    name: Joi.string().min(1).max(255)
  })),
  recurrence_rule: Joi.object({
    frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly'),
    interval: Joi.number().integer().min(1),
    end_date: Joi.date().iso(),
    count: Joi.number().integer().min(1)
  })
});

module.exports = {
  validateRequest,
  userRegistrationSchema,
  userLoginSchema,
  userUpdateSchema,
  calendarCreateSchema,
  calendarUpdateSchema,
  eventCreateSchema,
  eventUpdateSchema
};