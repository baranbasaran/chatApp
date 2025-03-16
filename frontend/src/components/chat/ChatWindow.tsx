import { useEffect, useRef, useState, useMemo, useCallback, useReducer } from 'react';
import { useChat } from '../../context/ChatContext';
import { Message } from '../../types/chat';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import React from 'react';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

// Wrap MessageBubble with React.memo to prevent unnecessary re-renders
const MessageBubble = React.memo(({ message, isOwnMessage }: MessageBubbleProps) => {
  console.log(`[Debug] Rendering MessageBubble for message ${message._id}`);
  
  if (!message) return null;

  return (
    <div className={`flex w-full mb-4 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex items-end max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isOwnMessage ? 'ml-2' : 'mr-2'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isOwnMessage ? 'bg-blue-500' : 'bg-gray-300'
          }`}>
            <span className={`text-sm ${isOwnMessage ? 'text-white' : 'text-gray-600'}`}>
              {message.sender?.username?.[0]?.toUpperCase() || '?'}
            </span>
          </div>
        </div>

        {/* Message Content */}
        <div className={`rounded-lg px-4 py-2 ${
          isOwnMessage 
            ? 'bg-blue-500 text-white rounded-br-none' 
            : 'bg-gray-100 text-gray-900 rounded-bl-none'
        }`}>
          {/* Username */}
          <p className={`text-xs mb-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
            {message.sender?.username || 'Unknown User'}
          </p>
          
          {/* Message text */}
          <p className="text-sm break-words">{message.content}</p>

          {/* Timestamp and status */}
          <div className={`text-xs mt-1 flex items-center ${
            isOwnMessage ? 'justify-end text-blue-100' : 'justify-start text-gray-500'
          }`}>
            <span>{message.timestamp && format(new Date(message.timestamp), 'HH:mm')}</span>
            {isOwnMessage && message.status && (
              <span className="ml-2">
                {message.status === 'sent' && '✓'}
                {message.status === 'delivered' && '✓✓'}
                {message.status === 'read' && (
                  <span className="text-blue-300">✓✓</span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// Add display name for debugging
MessageBubble.displayName = 'MessageBubble';

// Extract MessageList into a separate memoized component
interface MessageListProps {
  messages: Message[];
  loggedInUserId: string;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

const MessageList = React.memo(({ messages, loggedInUserId, messagesEndRef }: MessageListProps) => {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map(message => (
        <MessageBubble
          key={message._id}
          message={message}
          isOwnMessage={message.sender._id === loggedInUserId}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
});

MessageList.displayName = 'MessageList';

// Create a debounced typing handler
const useDebounce = (callback: () => void, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(callback, delay);
  }, [callback, delay]);
};

interface ChatHeaderProps {
  otherParticipant: any;
  isTyping: boolean;
  loggedInUser: any;
}

const ChatHeader = React.memo(({ otherParticipant, isTyping, loggedInUser }: ChatHeaderProps) => {
  return (
    <div className="flex items-center px-4 py-3 border-b">
      <div className="flex items-center flex-1">
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
          <span className="text-lg text-gray-600">
            {otherParticipant.username?.[0]?.toUpperCase() || '?'}
          </span>
        </div>
        <div className="ml-3">
          <h3 className="text-gray-900 font-medium">
            {otherParticipant.username || 'Unknown User'}
          </h3>
          {isTyping && (
            <p className="text-xs text-gray-500">typing...</p>
          )}
        </div>
      </div>
      <div className="flex items-center">
        <div className="mr-3 text-right">
          <p className="text-sm text-gray-600">Logged in as</p>
          <p className="text-gray-900 font-medium">{loggedInUser.username}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
          <span className="text-sm text-white">
            {loggedInUser.username?.[0]?.toUpperCase() || '?'}
          </span>
        </div>
      </div>
    </div>
  );
});

ChatHeader.displayName = 'ChatHeader';

interface MessageInputState {
  value: string;
  isTyping: boolean;
  lastTypingTime: number;
}

type MessageInputAction = 
  | { type: 'SET_VALUE'; payload: string }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'CLEAR' };

function messageInputReducer(state: MessageInputState, action: MessageInputAction): MessageInputState {
  switch (action.type) {
    case 'SET_VALUE':
      return { ...state, value: action.payload, lastTypingTime: Date.now() };
    case 'SET_TYPING':
      return { ...state, isTyping: action.payload };
    case 'CLEAR':
      return { ...state, value: '', isTyping: false };
    default:
      return state;
  }
}

interface MessageInputProps {
  onSend: (message: string) => Promise<void>;
  onTyping: () => void;
}

const MessageInput = React.memo(({ onSend, onTyping }: MessageInputProps) => {
  const [state, dispatch] = useReducer(messageInputReducer, {
    value: '',
    isTyping: false,
    lastTypingTime: 0
  });

  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    dispatch({ type: 'SET_VALUE', payload: newValue });
    
    if (!state.isTyping) {
      dispatch({ type: 'SET_TYPING', payload: true });
      onTyping();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      dispatch({ type: 'SET_TYPING', payload: false });
    }, 1000);
  }, [onTyping, state.isTyping]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.value.trim()) return;
    
    try {
      await onSend(state.value.trim());
      dispatch({ type: 'CLEAR' });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [onSend, state.value]);

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <div className="flex space-x-4">
        <input
          type="text"
          value={state.value}
          onChange={handleChange}
          placeholder="Type a message..."
          className="flex-1 rounded-full border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!state.value.trim()}
          className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </form>
  );
});

MessageInput.displayName = 'MessageInput';

const ChatWindowContent = React.memo(() => {
  const { state: authState } = useAuth();
  const { state: chatState, loadMessages, sendMessage } = useChat();
  const { activeChat, messages } = chatState;
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loggedInUser = authState.user;

  const chatMessages = useMemo(() => {
    if (!activeChat?._id) return [];
    return messages[activeChat._id] || [];
  }, [activeChat?._id, messages[activeChat?._id ?? '']]);

  const otherParticipant = useMemo(() => {
    if (!activeChat?.participants || !loggedInUser) return null;
    return activeChat.participants.find(
      participant => participant._id !== loggedInUser._id
    );
  }, [activeChat?.participants, loggedInUser?._id]);

  useEffect(() => {
    if (activeChat?._id) {
      loadMessages(activeChat._id);
    }
  }, [activeChat?._id, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleTyping = useCallback(() => {
    setIsTyping(true);
  }, []);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!activeChat?._id) return;
    await sendMessage(activeChat._id, message);
  }, [activeChat?._id, sendMessage]);

  if (!loggedInUser) return null;
  if (!activeChat) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Select a chat to start messaging</p>
      </div>
    );
  }
  if (!otherParticipant) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Invalid chat participants</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      <ChatHeader 
        otherParticipant={otherParticipant}
        isTyping={isTyping}
        loggedInUser={loggedInUser}
      />
      <MessageList 
        messages={chatMessages}
        loggedInUserId={loggedInUser._id}
        messagesEndRef={messagesEndRef}
      />
      <MessageInput 
        onSend={handleSendMessage}
        onTyping={handleTyping}
      />
    </div>
  );
});

ChatWindowContent.displayName = 'ChatWindowContent';

export function ChatWindow() {
  return <ChatWindowContent />;
} 