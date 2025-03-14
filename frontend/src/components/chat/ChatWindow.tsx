import { useEffect, useRef, useState } from 'react';
import { useChat } from '../../context/chat/ChatContext';
import { Message } from '../../types/chat';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
}

function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  if (!message) return null;

  return (
    <div
      className={`flex items-end space-x-2 mb-4 ${
        isOwnMessage ? 'flex-row-reverse space-x-reverse' : 'flex-row'
      }`}
    >
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
      <div
        className={`max-w-[60%] rounded-t-lg px-4 py-2 ${
          isOwnMessage
            ? 'bg-blue-500 text-white rounded-bl-lg rounded-br-none'
            : 'bg-gray-100 text-gray-900 rounded-br-lg rounded-bl-none'
        }`}
      >
        {/* Show username for both own and received messages */}
        <p className={`text-xs mb-1 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
          {message.sender?.username || 'Unknown User'}
        </p>
        
        {/* Message text */}
        <p className="text-sm break-words">{message.content}</p>

        {/* Timestamp and status */}
        <div
          className={`text-xs mt-1 flex justify-end items-center ${
            isOwnMessage ? 'text-blue-100' : 'text-gray-500'
          }`}
        >
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
  );
}

export function ChatWindow() {
  const { state, loadMessages, sendMessage } = useChat();
  const { activeChat, messages } = state;
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get logged in user from localStorage
  const loggedInUser = JSON.parse(localStorage.getItem('chat_user') || '{}');

  useEffect(() => {
    if (activeChat?._id) {
      console.log('Loading messages for chat:', activeChat._id);
      loadMessages(activeChat._id);
    }
  }, [activeChat, loadMessages]);

  useEffect(() => {
    if (activeChat?._id) {
      console.log('Messages state for current chat:', messages[activeChat._id]);
    }
  }, [messages, activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      // TODO: Notify server that user is typing
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      // TODO: Notify server that user stopped typing
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChat?._id || !newMessage.trim()) return;

    try {
      await sendMessage(activeChat._id, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (!activeChat) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Select a chat to start messaging</p>
      </div>
    );
  }

  // Ensure we have an array of messages
  const chatMessages = Array.isArray(messages[activeChat._id]) 
    ? messages[activeChat._id] 
    : [];

  // Get the other participant (the one who's not the logged-in user)
  const otherParticipant = activeChat.participants?.find(
    participant => participant._id !== loggedInUser._id
  );

  if (!otherParticipant) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Invalid chat participants</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Chat Header */}
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
            {activeChat.isTyping && (
              <p className="text-xs text-gray-500">typing...</p>
            )}
          </div>
        </div>
        {/* Current User Info */}
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {chatMessages.map(message => {
          // Determine if the message is from the logged-in user
          const isCurrentUserMessage = message.sender._id === loggedInUser._id;
          
          return (
            <div
              key={message._id}
              className={`flex w-full mb-4 ${
                isCurrentUserMessage ? 'justify-end' : 'justify-start'
              }`}
            >
              <div className={`flex items-end max-w-[70%] ${
                isCurrentUserMessage ? 'flex-row-reverse' : 'flex-row'
              }`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 ${
                  isCurrentUserMessage ? 'ml-2' : 'mr-2'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isCurrentUserMessage ? 'bg-blue-500' : 'bg-gray-300'
                  }`}>
                    <span className={`text-sm ${
                      isCurrentUserMessage ? 'text-white' : 'text-gray-600'
                    }`}>
                      {message.sender?.username?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                </div>

                {/* Message Content */}
                <div className={`rounded-lg px-4 py-2 ${
                  isCurrentUserMessage
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-900 rounded-bl-none'
                }`}>
                  <p className="text-sm break-words">{message.content}</p>
                  <div className={`text-xs mt-1 flex ${
                    isCurrentUserMessage ? 'justify-end' : 'justify-start'
                  }`}>
                    <span className={
                      isCurrentUserMessage ? 'text-blue-100' : 'text-gray-500'
                    }>
                      {message.timestamp && format(new Date(message.timestamp), 'HH:mm')}
                    </span>
                    {isCurrentUserMessage && message.status && (
                      <span className="ml-2 text-blue-100">
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
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 rounded-full border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
} 