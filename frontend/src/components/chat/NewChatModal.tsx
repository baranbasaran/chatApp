import { useState, useEffect } from 'react';
import { User } from '../../types/auth';
import { useChat } from '../../context/chat/ChatContext';
import { useDebounce } from '../../hooks/useDebounce';
import { userService } from '../../services/userService';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Extend the User type to include _id
interface UserWithId extends User {
  _id: string;
}

export function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserWithId[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (!debouncedSearch) {
      setUsers([]);
      return;
    }

    const searchUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await userService.searchUsers({
          query: debouncedSearch,
        });
        setUsers(result.users);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred');
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    searchUsers();
  }, [debouncedSearch]);

  const startChat = async (userId: string) => {
    try {
      console.log('Starting chat with user:', userId); // Debug log
      const response = await fetch('http://localhost:3000/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('chat_auth_token')}`,
        },
        body: JSON.stringify({
          participants: [userId],
          isGroup: false
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create chat');
      }

      const data = await response.json();
      onClose();
      // The chat will be added to the list via WebSocket event
    } catch (error) {
      console.error('Error creating chat:', error);
      setError(error instanceof Error ? error.message : 'Failed to create chat');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">New Chat</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600">{error}</div>
        )}

        <div className="max-h-60 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {users.map((user) => (
                <li
                  key={user._id}
                  className="py-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => startChat(user._id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-lg text-gray-600">
                          {user.username[0].toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.username}
                      </p>
                      {user.firstName && user.lastName && (
                        <p className="text-sm text-gray-500 truncate">
                          {`${user.firstName} ${user.lastName}`}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!isLoading && users.length === 0 && searchQuery && (
            <p className="text-center text-gray-500 py-4">No users found</p>
          )}
        </div>
      </div>
    </div>
  );
} 