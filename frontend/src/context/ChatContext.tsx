import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { ChatState, ChatAction, Chat } from "../types/chat";
import { SocketIOChatService } from "../services/chat/chatWebSocketService";
import { getStoredToken } from "../utils/auth";
import { logger } from "../utils/logger";
import { useAuth } from "./AuthContext";

// Initialize WebSocket service
const wsService = SocketIOChatService.getInstance();

const initialState: ChatState = {
  activeChat: null,
  chats: [],
  messages: {},
  isLoading: false,
  error: null,
  typingStatus: {},
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  logger.debug("ChatReducer", "Action received", {
    type: action.type,
    payload: "payload" in action ? action.payload : undefined,
  });

  switch (action.type) {
    case "SET_ACTIVE_CHAT":
      return {
        ...state,
        activeChat: action.payload,
      };
    case "SET_CHATS":
      return {
        ...state,
        chats: action.payload,
      };
    case "ADD_CHAT":
      return {
        ...state,
        chats: [action.payload, ...state.chats],
      };
    case "UPDATE_CHAT_WITH_MESSAGE": {
      const { chat, message } = action.payload;
      const otherChats = state.chats.filter((c) => c._id !== chat._id);
      const updatedChat = { ...chat, lastMessage: message };

      // Check if message already exists in the messages array
      const existingMessages = state.messages[chat._id] || [];
      const messageExists = existingMessages.some((m) => m._id === message._id);

      if (messageExists) {
        logger.debug("ChatContext", "Message already exists, skipping update");
        return state;
      }

      // Update chat list to show latest message first
      const updatedChats = [updatedChat, ...otherChats];

      return {
        ...state,
        chats: updatedChats,
        activeChat:
          state.activeChat?._id === chat._id ? updatedChat : state.activeChat,
        messages: {
          ...state.messages,
          [chat._id]: [...existingMessages, message],
        },
      };
    }
    case "UPDATE_CHAT":
      logger.debug("ChatContext", "Updating chat", {
        chatToUpdate: action.payload,
        existingChat: state.chats.find((c) => c._id === action.payload._id),
      });

      const updatedChat = {
        ...action.payload,
        lastMessage:
          action.payload.lastMessage ||
          state.chats.find((c) => c._id === action.payload._id)?.lastMessage,
      };

      // Move the updated chat to the top of the list if it has a new message
      const otherChats = state.chats.filter(
        (c) => c._id !== action.payload._id
      );
      const updatedChats = action.payload.lastMessage
        ? [updatedChat, ...otherChats]
        : [updatedChat, ...otherChats];

      return {
        ...state,
        chats: updatedChats,
        activeChat:
          state.activeChat?._id === action.payload._id
            ? updatedChat
            : state.activeChat,
      };
    case "SET_MESSAGES":
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: action.payload.messages,
        },
      };
    case "ADD_MESSAGE":
      const updatedMessages = {
        ...state.messages,
        [action.payload.chatId]: [
          ...(state.messages[action.payload.chatId] || []),
          action.payload.message,
        ],
      };
      logger.debug("ChatContext", "Updated messages state", updatedMessages);
      return {
        ...state,
        messages: updatedMessages,
      };
    case "UPDATE_MESSAGE":
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.chatId]: state.messages[action.payload.chatId].map(
            (message) =>
              message._id === action.payload.message._id
                ? action.payload.message
                : message
          ),
        },
      };
    case "SET_TYPING":
      return {
        ...state,
        typingStatus: {
          ...state.typingStatus,
          [action.payload.chatId]: action.payload.isTyping,
        },
      };
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
      };
    case "CLEAR_ERROR":
      return {
        ...state,
        error: null,
      };
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
}

interface ChatContextType {
  state: ChatState;
  setActiveChat: (chat: Chat) => void;
  sendMessage: (chatId: string, content: string) => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  loadChats: () => Promise<void>;
  sendTypingStatus: (chatId: string, isTyping: boolean) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const prevStateRef = useRef(state);
  const currentStateRef = useRef(state);
  const typingTimeoutsRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const { state: authState } = useAuth();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  // Keep currentStateRef up to date
  useEffect(() => {
    currentStateRef.current = state;
  }, [state]);

  // Debug state changes
  useEffect(() => {
    const stateKeys = [
      "activeChat",
      "chats",
      "messages",
      "isLoading",
      "error",
    ] as const;
    const changes = stateKeys.filter(
      (key) => state[key] !== prevStateRef.current[key]
    );

    if (changes.length > 0) {
      logger.debug("ChatContext", "State changed", {
        changes,
        prevState: prevStateRef.current,
        newState: state,
      });
    }
    prevStateRef.current = state;
  }, [state]);

  const loadChats = useCallback(async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });

      const token = localStorage.getItem("chat_auth_token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const fetchChats = async (retryCount = 0, maxRetries = 3) => {
        try {
          const response = await fetch("http://localhost:3000/api/chats", {
            headers: {
              Authorization: `Bearer ${token}`,
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          });

          if (!response.ok) {
            if (response.status === 401) {
              throw new Error("Authentication failed. Please log in again.");
            }
            throw new Error("Failed to load chats");
          }

          const data = await response.json();
          logger.debug("ChatContext", "Received chats", data);

          const chats = data.chats || [];
          logger.debug("ChatContext", "Processed chats", chats);

          dispatch({ type: "SET_CHATS", payload: chats });
        } catch (error) {
          logger.error("ChatContext", "Error loading chats", error);
          if (retryCount < maxRetries) {
            logger.info(
              "ChatContext",
              `Retrying chat load (${retryCount + 1}/${maxRetries})`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * Math.pow(2, retryCount))
            );
            return fetchChats(retryCount + 1, maxRetries);
          }
          throw error;
        }
      };

      await fetchChats();
    } catch (error) {
      logger.error("ChatContext", "Error loading chats", error);
      dispatch({
        type: "SET_ERROR",
        payload:
          error instanceof Error ? error.message : "Failed to load chats",
      });
      dispatch({ type: "SET_CHATS", payload: [] });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  // Initialize WebSocket connection and handlers
  useEffect(() => {
    if (!authState.isAuthenticated) {
      logger.info("ChatContext", "Not authenticated, skipping WebSocket setup");
      return;
    }

    logger.info("ChatContext", "Setting up WebSocket event handlers");
    let isSubscribed = true;

    const setupWebSocket = async () => {
      try {
        await wsService.connect();
        reconnectAttemptsRef.current = 0; // Reset attempts on successful connection

        if (!isSubscribed) return;

        wsService.onMessage((message, chatId) => {
          if (!isSubscribed) return;

          const currentState = currentStateRef.current;

          logger.debug("ChatContext", "Received message via WebSocket", {
            chatId,
            messageId: message._id,
            state: {
              chatsCount: currentState.chats.length,
              activeChatId: currentState.activeChat?._id,
              messageCount: currentState.messages[chatId]?.length || 0,
            },
          });

          const existingChat = currentState.chats.find((c) => {
            const matches = c._id === chatId;
            logger.debug("ChatContext", "Comparing chat IDs", {
              chatId,
              currentChatId: c._id,
              matches,
              chatDetails: c,
            });
            return matches;
          });

          const currentUserId = JSON.parse(
            localStorage.getItem("chat_user") || "{}"
          )._id;

          if (message.sender?._id === currentUserId) {
            logger.debug("ChatContext", "Skipping own message");
            return;
          }

          const existingMessages = currentState.messages[chatId] || [];
          const messageExists = existingMessages.some(
            (m) => m._id === message._id
          );

          if (messageExists) {
            logger.debug("ChatContext", "Message already exists, skipping", {
              messageId: message._id,
            });
            return;
          }

          if (!existingChat) {
            logger.warn(
              "ChatContext",
              "Chat not found in state, attempting to load chats",
              {
                chatId,
                availableChats: currentState.chats.map((c) => ({
                  id: c._id,
                  name: c.name,
                  participants: c.participants,
                })),
              }
            );
            loadChats();
            return;
          }

          logger.debug("ChatContext", "Processing new message", {
            chatId,
            messageId: message._id,
            existingChat: {
              id: existingChat._id,
              name: existingChat.name,
              participants: existingChat.participants,
            },
          });

          dispatch({
            type: "ADD_MESSAGE",
            payload: { chatId, message },
          });

          dispatch({
            type: "UPDATE_CHAT",
            payload: { ...existingChat, lastMessage: message },
          });
        });

        // Handle typing status updates with debounce
        wsService.onTyping((chatId, isTyping, userId) => {
          if (!isSubscribed) return;

          const currentUserId = JSON.parse(
            localStorage.getItem("chat_user") || "{}"
          )._id;
          if (userId === currentUserId) {
            return;
          }

          // Clear existing timeout for this chat
          if (typingTimeoutsRef.current[chatId]) {
            clearTimeout(typingTimeoutsRef.current[chatId]);
          }

          dispatch({
            type: "SET_TYPING",
            payload: { chatId, isTyping },
          });

          if (isTyping) {
            typingTimeoutsRef.current[chatId] = setTimeout(() => {
              if (isSubscribed) {
                dispatch({
                  type: "SET_TYPING",
                  payload: { chatId, isTyping: false },
                });
              }
              delete typingTimeoutsRef.current[chatId];
            }, 3000);
          }
        });

        // Handle new chat creation
        wsService.onNewChat((chat) => {
          if (!isSubscribed) return;
          dispatch({
            type: "ADD_CHAT",
            payload: chat,
          });
        });

        // Load initial chats
        await loadChats();
      } catch (error) {
        logger.error("ChatContext", "Error setting up WebSocket", error);

        // Attempt to reconnect with exponential backoff
        if (
          isSubscribed &&
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
        ) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );
          logger.info("ChatContext", `Attempting reconnect in ${delay}ms`, {
            attempt: reconnectAttemptsRef.current + 1,
            maxAttempts: MAX_RECONNECT_ATTEMPTS,
          });

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            setupWebSocket();
          }, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          logger.error("ChatContext", "Max reconnection attempts reached");
          dispatch({
            type: "SET_ERROR",
            payload:
              "Unable to establish WebSocket connection. Please refresh the page.",
          });
        }
      }
    };

    setupWebSocket();

    // Cleanup function
    return () => {
      isSubscribed = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
      wsService.disconnect();
    };
  }, [authState.isAuthenticated, loadChats]);

  // Join chat room and load messages when active chat changes
  useEffect(() => {
    if (state.activeChat) {
      logger.info("ChatContext", "Joining chat room", state.activeChat._id);
      wsService.joinChat(state.activeChat._id);
      logger.info("ChatContext", "Loading messages for active chat");
      loadMessages(state.activeChat._id);
    }
  }, [state.activeChat?._id]);

  const loadMessages = useCallback(async (chatId: string) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const response = await fetch(
        `http://localhost:3000/api/chats/${chatId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${getStoredToken()}`,
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      logger.debug("ChatContext", "Received messages data", data);

      const messages = Array.isArray(data) ? data : data.messages || [];
      logger.debug("ChatContext", "Processed messages array", messages);

      dispatch({
        type: "SET_MESSAGES",
        payload: { chatId, messages },
      });
    } catch (error) {
      logger.error("ChatContext", "Error loading messages", error);
      dispatch({
        type: "SET_MESSAGES",
        payload: { chatId, messages: [] },
      });
      dispatch({
        type: "SET_ERROR",
        payload:
          error instanceof Error ? error.message : "Failed to load messages",
      });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  }, []);

  const setActiveChat = useCallback((chat: Chat) => {
    dispatch({ type: "SET_ACTIVE_CHAT", payload: chat });
  }, []);

  const sendMessage = useCallback(
    async (chatId: string, content: string) => {
      try {
        const response = await fetch(
          `http://localhost:3000/api/chats/${chatId}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getStoredToken()}`,
            },
            body: JSON.stringify({ content }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const data = await response.json();
        const message = data.message || data;

        logger.debug("ChatContext", "Message created, sending via WebSocket", {
          chatId,
          messageId: message._id,
        });

        // Update local state first
        const existingChat = currentStateRef.current.chats.find(
          (chat) => chat._id === chatId
        );
        if (existingChat) {
          // Add message to messages array
          dispatch({
            type: "ADD_MESSAGE",
            payload: { chatId, message },
          });

          // Update chat with latest message
          const updatedChat = {
            ...existingChat,
            lastMessage: message,
            updatedAt: new Date().toISOString(),
          };

          dispatch({
            type: "UPDATE_CHAT",
            payload: updatedChat,
          });
        }

        // Send message through WebSocket after updating local state
        wsService.sendMessage(chatId, message);
      } catch (error) {
        logger.error("ChatContext", "Error sending message", error);
        dispatch({
          type: "SET_ERROR",
          payload:
            error instanceof Error ? error.message : "Failed to send message",
        });
      }
    },
    [] // Remove state.chats dependency
  );

  const userId = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("chat_user") || "{}")._id;
    } catch (error) {
      logger.error("ChatContext", "Error parsing user data", error);
      return null;
    }
  }, []);

  const sendTypingStatus = useCallback(
    (chatId: string, isTyping: boolean) => {
      if (!userId) return;
      wsService.sendTyping(chatId, isTyping, userId);
    },
    [userId]
  );

  return (
    <ChatContext.Provider
      value={{
        state,
        setActiveChat,
        sendMessage,
        loadMessages,
        loadChats,
        sendTypingStatus,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

// Custom hook to use chat context
export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
