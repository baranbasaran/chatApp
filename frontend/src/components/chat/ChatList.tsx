import { useEffect, useState } from 'react';
import { useChat } from '../../context/chat/ChatContext';
import { Chat } from '../../types/chat';
import { formatDistanceToNow } from 'date-fns';
import { NewChatModal } from './NewChatModal';

interface ChatItemProps {
  chat: Chat;
  isActive: boolean;
  onClick: () => void;
}

function ChatItem({ chat, isActive, onClick }: ChatItemProps) {
  // Find the other participant (assuming current user is always first)
  const otherParticipant = chat.participants?.[1];

  if (!otherParticipant) {
    return null; // Don't render invalid chats
  }

  return (
    <div
      className={`flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer ${
        isActive ? 'bg-gray-100' : ''
      }`}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="relative">
        <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
          <span className="text-lg text-gray-600">
            {otherParticipant.username?.[0]?.toUpperCase() || '?'}
          </span>
        </div>
        {chat.isTyping && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        )}
      </div>

      {/* Chat Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {otherParticipant.username || 'Unknown User'}
          </h3>
          {chat.lastMessage && (
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {chat.lastMessage && (
            <p className="text-sm text-gray-500 truncate">
              {chat.lastMessage.content}
            </p>
          )}
          {chat.unreadCount && chat.unreadCount > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-blue-500 rounded-full">
              {chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatList() {
  const { state, setActiveChat, loadChats } = useChat();
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        await loadChats();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chats');
        console.error('Error loading chats:', err);
      }
    };

    fetchChats();
  }, [loadChats]);

  // Add debug logging
  console.log('Chat state:', state);
  console.log('Chats:', state.chats);
  console.log('Is chats an array?', Array.isArray(state.chats));

  if (state.isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  // Ensure chats is an array
  const chats = Array.isArray(state.chats) ? state.chats : [];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <button
          onClick={() => setIsNewChatModalOpen(true)}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No chats yet
          </div>
        ) : (
          chats.map((chat) => (
            <ChatItem
              key={chat._id}
              chat={chat}
              isActive={state.activeChat?._id === chat._id}
              onClick={() => setActiveChat(chat)}
            />
          ))
        )}
      </div>

      {isNewChatModalOpen && (
        <NewChatModal
          isOpen={isNewChatModalOpen}
          onClose={() => setIsNewChatModalOpen(false)}
        />
      )}
    </div>
  );
} 