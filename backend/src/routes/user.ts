import { Router } from 'express';
import { getUsers, searchUsers } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// Route to get all users except the current user
router.get('/', getUsers);

// Route to search users
router.get('/search', searchUsers);

export default router; 