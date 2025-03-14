import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { IMessage } from './Message';

export interface IChat extends Document {
  participants: mongoose.Types.ObjectId[];
  lastMessage?: IMessage['_id'];
  unreadCount: { [key: string]: number };
  createdAt: Date;
  updatedAt: Date;
}

const chatSchema = new Schema<IChat>(
  {
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Ensure chat has exactly 2 participants (for direct messages)
chatSchema.pre('save', function (next) {
  if (this.participants.length !== 2) {
    next(new Error('Chat must have exactly 2 participants'));
  } else {
    next();
  }
});

export const Chat = mongoose.model<IChat>('Chat', chatSchema); 