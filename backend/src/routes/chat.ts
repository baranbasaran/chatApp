import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getChats,
  createChat,
  getMessages,
  sendMessage,
  markMessagesAsRead,
} from '../controllers/chatController';
import { getUsers } from '../controllers/userController';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

// Users route (should come before generic chat routes)
router.get('/users', getUsers);

// Chat routes
router.get('/', getChats);
router.post('/', createChat);

// Message routes
router.get('/:chatId/messages', getMessages);
router.post('/:chatId/messages', sendMessage);
router.put('/:chatId/messages/read', markMessagesAsRead);

export default router; 