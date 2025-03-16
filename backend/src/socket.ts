import { Server, Socket } from 'socket.io';

interface User {
  userId: string;
  socketId: string;
}

let onlineUsers: User[] = [];

export const socketHandler = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    // Handle user joining
    socket.on('join', (userId: string) => {
      // Remove any existing socket connections for this user
      onlineUsers = onlineUsers.filter(user => user.userId !== userId);
      
      // Add new connection
      onlineUsers.push({
        userId,
        socketId: socket.id
      });

      // Join user's personal room
      socket.join(userId);
      
      // Broadcast online status
      io.emit('userOnline', userId);
      
      // Send current online users to the newly connected user
      socket.emit('onlineUsers', onlineUsers.map(user => user.userId));
    });

    // Handle chat room joining
    socket.on('joinChat', (chatId: string) => {
      socket.join(chatId);
      console.log('User joined chat:', chatId);
    });

    // Handle typing status
    socket.on('typing', (data: { chatId: string; isTyping: boolean }) => {
      socket.to(data.chatId).emit('userTyping', {
        chatId: data.chatId,
        isTyping: data.isTyping
      });
    });

    // Handle new messages
    socket.on('newMessage', (data: { chatId: string; message: any }) => {
      console.log('New message received:', data);
      // Emit to all users in the chat room except the sender
      socket.to(data.chatId).emit('messageReceived', {
        chatId: data.chatId,
        message: data.message
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const user = onlineUsers.find(user => user.socketId === socket.id);
      if (user) {
        onlineUsers = onlineUsers.filter(u => u.socketId !== socket.id);
        io.emit('userOffline', user.userId);
      }
      console.log('User disconnected:', socket.id);
    });
  });
}; 