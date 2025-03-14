import { Request, Response } from 'express';
import { Message } from '../models/Message';
import { Chat } from '../models/Chat';
import mongoose from 'mongoose';

export const getChats = async (req: Request, res: Response) => {
  try {
    const chats = await Chat.find({
      participants: { $in: [req.user?._id] },
    })
      .populate('participants', '-password')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.json({ chats });
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createChat = async (req: Request, res: Response) => {
  try {
    const { participants, name, isGroup = false } = req.body;
    console.log('Creating chat with:', { name, isGroup, participants, userId: req.user?._id });

    if (!participants || !Array.isArray(participants)) {
      return res.status(400).json({ message: 'Participants array is required' });
    }

    // For direct messages, check if chat already exists
    if (!isGroup) {
      const existingChat = await Chat.findOne({
        isGroup: false,
        participants: {
          $all: [req.user?._id, participants[0]],
          $size: 2,
        },
      }).populate('participants', '-password');

      if (existingChat) {
        return res.json({ chat: existingChat });
      }
    }

    // Create new chat
    const chat = new Chat({
      name: isGroup ? name : undefined,
      isGroup,
      participants: isGroup ? [req.user?._id, ...participants] : [req.user?._id, participants[0]],
    });

    await chat.save();
    await chat.populate('participants', '-password');

    // Notify participants about new chat
    const io = (req as any).io;
    if (io) {
      chat.participants.forEach((participant: any) => {
        if (participant._id.toString() !== req.user?._id?.toString()) {
          io.to(participant._id.toString()).emit('chat:new', chat);
        }
      });
    }

    res.status(201).json({ chat });
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await Message.find({ chatId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sender', '-password');

    res.json({ messages: messages.reverse() }); // Return in chronological order
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Create and save message
    const message = new Message({
      chatId,
      content,
      sender: req.user?._id,
    });

    await message.save();
    await message.populate('sender', '-password');

    // Update chat's last message and time
    chat.lastMessage = message._id;
    await chat.save();

    // Emit socket event for new message
    const io = (req as any).io;
    if (io) {
      chat.participants.forEach((participantId: mongoose.Types.ObjectId) => {
        if (participantId.toString() !== req.user?._id?.toString()) {
          io.to(participantId.toString()).emit('message:new', {
            chatId,
            message,
          });
        }
      });
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const markMessagesAsRead = async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;

    await Message.updateMany(
      {
        chatId,
        sender: { $ne: req.user?._id },
        status: { $ne: 'read' },
      },
      {
        $set: { status: 'read' },
      }
    );

    // Emit socket event for read messages
    const io = (req as any).io;
    if (io) {
      io.to(chatId).emit('messages:read', {
        chatId,
        userId: req.user?._id,
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}; 