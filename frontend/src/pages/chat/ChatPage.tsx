import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogoutButton } from '../../components/LogoutButton';
import { ChatList } from '../../components/chat/ChatList';
import { ChatWindow } from '../../components/chat/ChatWindow';

export const ChatPage: React.FC = () => {
  const { state } = useAuth();
  const { isAuthenticated, isLoading } = state;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-2xl font-semibold text-gray-900">Chat</h1>
            <LogoutButton />
          </div>
        </div>
      </div>
      <main className="flex-1 max-w-7xl w-full mx-auto py-6 sm:px-6 lg:px-8">
        <div className="h-[calc(100vh-7rem)] flex">
          <div className="w-1/3 border-r">
            <ChatList />
          </div>
          <div className="flex-1">
            <ChatWindow />
          </div>
        </div>
      </main>
    </div>
  );
}; 