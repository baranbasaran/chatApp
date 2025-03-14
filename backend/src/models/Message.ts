import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { IChat } from './Chat';

export interface IMessage extends Document {
  content: string;
  sender: IUser['_id'];
  chatId: IChat['_id'];
  type: 'text' | 'image' | 'file';
  status: 'sent' | 'delivered' | 'read';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
    thumbnailUrl?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    content: {
      type: String,
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    chatId: {
      type: Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file'],
      default: 'text',
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    metadata: {
      fileName: String,
      fileSize: Number,
      mimeType: String,
      thumbnailUrl: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
messageSchema.index({ chatId: 1, createdAt: -1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema); 