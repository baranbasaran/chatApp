import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { User } from '../models/User';

let io: Server;

export const initializeSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.handshake.auth.userId;
    
    if (userId) {
      // Update user status to online
      await User.findByIdAndUpdate(userId, { status: 'online' });
      
      // Join user to their personal room
      socket.join(userId);
      
      // Broadcast user's online status
      socket.broadcast.emit('user_status', { userId, status: 'online' });
    }

    socket.on('join_chat', (chatId: string) => {
      socket.join(chatId);
      console.log(`User ${socket.id} joined chat: ${chatId}`);
    });

    socket.on('typing', ({ chatId, userId }) => {
      socket.to(chatId).emit('user_typing', { chatId, userId });
    });

    socket.on('disconnect', async () => {
      if (userId) {
        // Update user status to offline
        await User.findByIdAndUpdate(userId, {
          status: 'offline',
          lastSeen: new Date()
        });
        
        // Broadcast user's offline status
        socket.broadcast.emit('user_status', {
          userId,
          status: 'offline',
          lastSeen: new Date()
        });
      }
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}; 