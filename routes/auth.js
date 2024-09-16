import { Router } from 'express';
const router = Router();
import pkg from 'bcryptjs';
const { hash, compare } = pkg;
import pkg2 from 'jsonwebtoken';
const { sign } = pkg2;
import User from '../models/User.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Create a new account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: The created user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 * 
 */

router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ status: false, message: 'User already exists' });
      
    const hashedPassword = await hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();
    res.status(201).json({ status: true, message: 'User created successfully' });
  } catch (error) {
    res.status(500).json({ status: false, message: error });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Error logging in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ status: false, message: 'Invalid credentials' });
    }
    const isMatch = await compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ status: false, message: 'Invalid credentials' });
    }
    const token = sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({status: true, message: 'Login successful', data: token });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Error logging in' });
  }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Error logging out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.post('/logout', async (req, res) => {
  try {
    // Since JWT tokens are stateless and stored on the client side, 
    // logging out typically involves clearing the token from the client.
    // For example, if using cookies, you would clear the cookie that holds the token.

    // For demonstration purposes, let's assume clearing a cookie named 'jwtToken':
    res.clearCookie('jwtToken');
    
    // Alternatively, if using local storage:
    // res.json({ status: true, message: 'Logged out successfully' });
    
    // Respond with success message
    res.json({ status: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ status: false, message: 'Error logging out' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Error logging in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

router.post('/sync-files', async (req, res) => {
  const { localFolder } = req.body;
  const remoteFolder = './snaarp';
  const lastSyncFile = path.join(remoteFolder, '.last_sync');
  if (!localFolder) {
    return res.status(400).send('Local folder path is required');
  }
  try {
    await fs.mkdir(remoteFolder, { recursive: true });
    let lastSyncTime;
    try {
      lastSyncTime = parseInt(await fs.readFile(lastSyncFile, 'utf8'), 10);
    } catch (err) {
      console.log(`No previous sync time found. Starting fresh sync.`);
      lastSyncTime = 0;
    }
    const files = await fs.readdir(localFolder);
    let syncedFiles = 0;
    let skippedFiles = 0;
    for (const file of files) {
      if (file === '.last_sync') {
        continue; // Skip .last_sync file
      }
      const filePath = path.join(localFolder, file);
      // Check if the file is encrypted before any further processing
      // if (await isFileEncrypted(filePath)) {
      //   console.log(`Skipping file: ${file} (encrypted)`);
      //   skippedFiles++;
      //   continue;
      // }
      const stats = await fs.stat(filePath);
      const fileExtension = path.extname(file).toLowerCase();
      // Skip specific file extensions
      const skipExtensions = ['.ico', '.ini'];
      if (skipExtensions.includes(fileExtension)) {
        console.log(`Skipping file: ${file} (excluded extension)`);
        skippedFiles++;
        continue;
      }
      const remoteFilePath = path.join(remoteFolder, file);
      
      let shouldSync = false;
      try {
        const remoteStats = await fs.stat(remoteFilePath);
        // File exists in both places, check if local is newer
        shouldSync = stats.mtimeMs > remoteStats.mtimeMs;
      } catch (err) {
        // File doesn't exist in remote folder, so it's new
        shouldSync = true;
      }
      if (shouldSync) {
        await fs.copyFile(filePath, remoteFilePath);
        console.log(`Synced file: ${file}`);
        syncedFiles++;
      } else {
        console.log(`Skipping file: ${file} (not modified)`);
        skippedFiles++;
      }
    }
    await fs.writeFile(lastSyncFile, Date.now().toString());
    
    res.json({
      status: true,
      message: 'Sync completed successfully',
      data: {
        syncedFiles,
        skippedFiles,
        totalProcessed: syncedFiles + skippedFiles
      }
    });
  } catch (err) {
    console.error(`Error during sync process: ${err.message}`);
    res.status(500).json({
      status: 'error',
      message: 'Error syncing files',
      error: {
        description: err.message,
        code: err.code || 'UNKNOWN_ERROR'
      }
    });
  }
});

export default router;