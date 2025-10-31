const express = require('express');
const Task = require('../models/Task');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, taskCreateSchema, taskUpdateSchema } = require('../middleware/validation');

const router = express.Router();

// Get all tasks for the authenticated user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      calendar_id: req.query.calendar_id
    };
    
    // Remove undefined filters
    Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);
    
    const tasks = await Task.findByUserId(req.user.id, filters);
    res.json({
      tasks: tasks.map(task => task.toJSON())
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific task by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByIdAndUserId(id, req.user.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({
      task: task.toJSON()
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new task
router.post('/', authenticateToken, validateRequest(taskCreateSchema), async (req, res) => {
  try {
    const task = await Task.create({
      user_id: req.user.id,
      ...req.body
    });

    res.status(201).json({
      message: 'Task created successfully',
      task: task.toJSON()
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to create task. Please try again.' 
    });
  }
});

// Update task
router.put('/:id', authenticateToken, validateRequest(taskUpdateSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByIdAndUserId(id, req.user.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updatedTask = await task.update(req.body);

    res.json({
      message: 'Task updated successfully',
      task: updatedTask.toJSON()
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to update task. Please try again.' 
    });
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findByIdAndUserId(id, req.user.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.delete();

    res.json({
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

