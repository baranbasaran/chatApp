// src/server.ts
import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { Express } from 'express';
import { socketHandler } from './socket';

export const createServer = (app: Express): HttpServer => {
  const httpServer = new HttpServer(app);
  
  // Socket.io setup
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Attach socket.io to request object
  app.use((req: any, res, next) => {
    req.io = io;
    next();
  });

  // Initialize socket handlers
  socketHandler(io);

  return httpServer;
};
