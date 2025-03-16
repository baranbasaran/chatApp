import { format } from 'date-fns';
import { Message } from '../../types/chat';
import { useAuth } from '../../context/AuthContext';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { state: authState } = useAuth();
  const loggedInUser = authState.user;

  if (!loggedInUser) {
    return null;
  }

  const isOwnMessage = message.sender._id === loggedInUser._id;
  const messageTime = format(new Date(message.timestamp), 'HH:mm');

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-200'
        }`}
      >
        <p className="text-sm">{message.content}</p>
        <p className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
          {messageTime}
        </p>
      </div>
    </div>
  );
} 