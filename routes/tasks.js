import { Router } from 'express';
const router = Router();
import auth from '../middleware/auth.js';
import Task from '../models/Task.js';
import { body, param, validationResult } from 'express-validator';

// Custom error handler to send validation errors
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ status: false, errors: errors.array() });
  }
  next();
};

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: The created task
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 */

// Create a task
router.post('/', [
    auth,
    body('title').notEmpty().withMessage('Title is required'),
    body('dueDate').optional().isISO8601().toDate().withMessage('Invalid due date'),
    validateRequest,
  ], async (req, res) => {
  try {
    const { title, description, dueDate } = req.body;
    const task = new Task({
      user: req.userId,
      title,
      description,
      dueDate,
    });
    const savedTask = await task.save();
    if (savedTask) {
      res.status(201).json({ status: true, message: 'Task created successfully', task: savedTask });
    } else {
      throw new Error('Task not saved');
    }
  } catch (error) {
    res.status(500).json({ status: false, error: 'Error creating task' });
  }
});

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks for a user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

router.get('/', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.userId });
    res.json({ status: true, message: 'Tasks retrieved successfully', tasks });
  } catch (error) {
    res.status(500).json({ status: false, error: 'Error fetching tasks' });
  }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get a specific task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the task to retrieve
 *     responses:
 *       200:
 *         description: The task
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

router.get('/:id', [
  auth,
  param('id').isMongoId().withMessage('Invalid task ID'),
  validateRequest,
], async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.userId });
    if (!task) {
      return res.status(404).json({ status: false, message: 'Task not found' });
    }
    res.json({ status: true, message: 'Task retrieved successfully', task });
  } catch (error) {
    res.status(500).json({ status: false, error: 'Error fetching task' });
  }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update a specific task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the task to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               completed:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: The updated task
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

router.put('/:id', [
  auth,
  param('id').isMongoId().withMessage('Invalid task ID'),
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('dueDate').optional().isISO8601().toDate().withMessage('Invalid due date'),
  body('completed').optional().isBoolean().withMessage('Completed must be a boolean'),
  validateRequest,
], async (req, res) => {
  try {
    const { title, description, dueDate, completed } = req.body;
    const updatedTask = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { title, description, dueDate, completed },
      { new: true }
    );
    if (updatedTask) {
      res.json({ status: true, message: 'Task updated successfully', task: updatedTask });
    } else {
      res.status(404).json({ status: false, message: 'Task not found' });
    }
  } catch (error) {
    res.status(500).json({ status: false, error: 'Error updating task' });
  }
});

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a specific task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the task to delete
 *     responses:
 *       200:
 *         description: Confirmation message
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Task deleted successfully
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */

router.delete('/:id', [
  auth,
  param('id').isMongoId().withMessage('Invalid task ID'),
  validateRequest,
], async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (task) {
      res.json({ status: true, message: 'Task deleted successfully' });
    } else {
      res.status(404).json({ status: false, message: 'Task not found' });
    }
  } catch (error) {
    res.status(500).json({ status: false, error: 'Error deleting task' });
  }
});

export default router;
