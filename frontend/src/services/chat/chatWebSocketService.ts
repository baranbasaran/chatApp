import { Manager } from "socket.io-client";
import { Chat, Message } from "../../types/chat";
import { getStoredToken } from "../../utils/auth";
import { logger } from "../../utils/logger";

// Define a minimal interface for what we need from the socket
interface WebSocket {
  connected: boolean;
  auth: { token?: string };
  connect(): void;
  disconnect(): void;
  emit(event: string, ...args: any[]): void;
  on(event: string, callback: (...args: any[]) => void): void;
  once(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
}

export interface ChatWebSocketService {
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  onMessage(handler: (message: Message, chatId: string) => void): void;
  onTyping(
    handler: (chatId: string, isTyping: boolean, userId: string) => void
  ): void;
  onNewChat(handler: (chat: Chat) => void): void;
  sendMessage(chatId: string, message: Message): void;
  sendTyping(chatId: string, isTyping: boolean, userId: string): void;
  joinChat(chatId: string): void;
}

export class SocketIOChatService implements ChatWebSocketService {
  private static instance: SocketIOChatService;
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private connectionPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): SocketIOChatService {
    if (!SocketIOChatService.instance) {
      SocketIOChatService.instance = new SocketIOChatService();
    }
    return SocketIOChatService.instance;
  }

  public async connect(): Promise<void> {
    // If there's an existing connection promise, return it
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // If already connected, return immediately
    if (this.isConnected()) {
      return Promise.resolve();
    }

    this.isConnecting = true;
    logger.info("ChatWebSocketService", "Initiating WebSocket connection");

    const promise = new Promise<void>(async (resolve, reject) => {
      try {
        // Try to get token from auth service first
        const token = getStoredToken();

        if (!token) {
          logger.error(
            "ChatWebSocketService",
            "No authentication token found in any storage location"
          );
          throw new Error("No authentication token found");
        }

        logger.debug("ChatWebSocketService", "Using token for connection", {
          token: token.slice(0, 10) + "...",
        });

        const manager = new Manager("http://localhost:3000", {
          transports: ["websocket"],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          reconnectionDelayMax: 5000,
          timeout: 10000,
          autoConnect: false,
          forceNew: true,
          auth: {
            token: token,
          },
        });

        // Create socket and set auth token
        this.socket = manager.socket("/") as unknown as WebSocket;

        // Connect and wait for connection
        this.socket.connect();
        await this.waitForConnection();

        // Setup handlers after successful connection
        this.setupConnectionStateHandlers();
        this.setupMessageHandlers();

        logger.info("ChatWebSocketService", "WebSocket connected successfully");
        resolve();
      } catch (error) {
        logger.error(
          "ChatWebSocketService",
          "Error during connection setup",
          error
        );
        this.isConnecting = false;
        this.connectionPromise = null;
        reject(error);
      }
    });

    this.connectionPromise = promise;
    return promise;
  }

  private waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Socket not initialized"));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error("Connection timeout"));
      }, 10000); // Increased timeout to 10 seconds

      this.socket.once("connect", () => {
        clearTimeout(timeout);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.once("connect_error", (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private setupConnectionStateHandlers(): void {
    if (!this.socket) return;

    this.socket.on("disconnect", (reason: string) => {
      logger.warn("ChatWebSocketService", "WebSocket disconnected", { reason });
      this.isConnecting = false;

      if (reason !== "io client disconnect") {
        this.attemptReconnect();
      }
    });

    this.socket.on("connect_error", (error: Error) => {
      logger.error("ChatWebSocketService", "Connection error", error);
      this.isConnecting = false;
      this.attemptReconnect();
    });

    this.socket.on("error", (error: Error) => {
      logger.error("ChatWebSocketService", "WebSocket error", error);
      this.isConnecting = false;
      this.attemptReconnect();
    });
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error("ChatWebSocketService", "Max reconnection attempts reached");
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    logger.info("ChatWebSocketService", "Attempting to reconnect", {
      attempt: this.reconnectAttempts + 1,
      delay,
    });

    await new Promise((resolve) => setTimeout(resolve, delay));
    this.reconnectAttempts++;
    await this.connect();
  }

  public disconnect(): void {
    if (this.socket) {
      logger.info("ChatWebSocketService", "Disconnecting WebSocket");
      this.socket.disconnect();
      this.socket = null;
      this.connectionPromise = null;
    }
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  private setupMessageHandlers(): void {
    if (!this.socket) {
      logger.warn(
        "ChatWebSocketService",
        "Cannot set up message handlers - no socket"
      );
      return;
    }

    // Clear any existing handlers
    ["message", "newMessage", "messageReceived", "typing", "chat:new"].forEach(
      (event) => {
        this.socket?.off(event, () => {
          logger.debug("ChatWebSocketService", `Cleared handler for ${event}`);
        });
      }
    );

    // Log all incoming events for debugging
    this.socket.on("*", (event: string, ...args: any[]) => {
      logger.debug("ChatWebSocketService", "Received WebSocket event", {
        event,
        args,
      });
    });
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }
  }

  public onMessage(handler: (message: Message, chatId: string) => void): void {
    this.ensureConnected().then(() => {
      if (!this.socket) {
        logger.warn(
          "ChatWebSocketService",
          "Cannot set up message handler - no socket connection"
        );
        return;
      }

      const messageHandler = (payload: {
        chatId: string;
        message: Message;
      }) => {
        logger.debug("ChatWebSocketService", "Message received via WebSocket", {
          chatId: payload.chatId,
          messageId: payload.message._id,
          content: payload.message.content,
        });
        handler(payload.message, payload.chatId);
      };

      // Listen for multiple possible event names
      ["message", "newMessage", "messageReceived"].forEach((eventName) => {
        this.socket?.off(eventName, messageHandler);
        this.socket?.on(eventName, messageHandler);
      });
    });
  }

  public onTyping(
    handler: (chatId: string, isTyping: boolean, userId: string) => void
  ): void {
    if (!this.socket) {
      logger.warn(
        "ChatWebSocketService",
        "Cannot set up typing handler - no socket connection"
      );
      return;
    }

    const typingHandler = (payload: {
      chatId: string;
      isTyping: boolean;
      userId: string;
    }) => {
      logger.debug("ChatWebSocketService", "Typing status received", payload);
      handler(payload.chatId, payload.isTyping, payload.userId);
    };

    // Remove existing handler
    this.socket.off("typing", typingHandler);

    // Add new handler
    this.socket.on("typing", typingHandler);
  }

  public onNewChat(handler: (chat: Chat) => void): void {
    if (!this.socket) {
      logger.warn(
        "ChatWebSocketService",
        "Cannot set up new chat handler - no socket connection"
      );
      return;
    }

    const chatHandler = (chat: Chat) => {
      logger.debug("ChatWebSocketService", "New chat received", chat);
      handler(chat);
    };

    // Remove existing handler
    this.socket.off("chat:new", chatHandler);

    // Add new handler
    this.socket.on("chat:new", chatHandler);
  }

  public sendMessage(chatId: string, message: Message): void {
    this.ensureConnected().then(() => {
      if (!this.isConnected()) {
        logger.warn(
          "ChatWebSocketService",
          "Cannot send message - not connected"
        );
        return;
      }

      logger.debug("ChatWebSocketService", "Sending message via WebSocket", {
        chatId,
        messageId: message._id,
        content: message.content,
      });

      // Try both event names to ensure compatibility
      this.socket?.emit("message", { chatId, message });
      this.socket?.emit("newMessage", { chatId, message });
    });
  }

  public sendTyping(chatId: string, isTyping: boolean, userId: string): void {
    if (!this.isConnected()) {
      logger.warn(
        "ChatWebSocketService",
        "Cannot send typing status - not connected"
      );
      return;
    }

    logger.debug("ChatWebSocketService", "Sending typing status", {
      chatId,
      isTyping,
      userId,
    });
    this.socket?.emit("typing", { chatId, isTyping, userId });
  }

  public joinChat(chatId: string): void {
    this.ensureConnected().then(() => {
      if (!this.isConnected()) {
        logger.warn("ChatWebSocketService", "Cannot join chat - not connected");
        return;
      }

      logger.debug("ChatWebSocketService", "Joining chat", { chatId });
      this.socket?.emit("joinChat", chatId);
      this.socket?.emit("join", chatId);
    });
  }
}
