import { Manager } from "socket.io-client";
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

class WebSocketManager {
  private static instance: WebSocketManager;
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Initial delay in milliseconds
  private eventHandlers: Map<string, Function[]> = new Map();
  private isConnecting = false;

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public connect(): void {
    if (this.isConnected() || this.isConnecting) {
      logger.debug(
        "WebSocketManager",
        "Connection already exists or in progress"
      );
      return;
    }

    this.isConnecting = true;
    logger.info("WebSocketManager", "Initiating WebSocket connection");

    try {
      const token = getStoredToken();
      if (!token) {
        logger.error("WebSocketManager", "No authentication token found");
        return;
      }

      const manager = new Manager("http://localhost:3000", {
        transports: ["websocket"],
        reconnection: false, // We'll handle reconnection manually
      });

      // Create socket and set auth token
      this.socket = manager.socket("/") as unknown as WebSocket;
      this.socket.auth = { token };

      this.setupConnectionStateHandlers();
    } catch (error) {
      logger.error("WebSocketManager", "Error during connection setup", error);
      this.isConnecting = false;
      this.attemptReconnect();
    }
  }

  private setupConnectionStateHandlers(): void {
    if (!this.socket) return;

    this.socket.on("connect", () => {
      logger.info("WebSocketManager", "WebSocket connected successfully");
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
    });

    this.socket.on("connect_error", (error: Error) => {
      logger.error("WebSocketManager", "Connection error", error);
      this.isConnecting = false;
      this.attemptReconnect();
    });

    this.socket.on("disconnect", (reason: string) => {
      logger.warn("WebSocketManager", "WebSocket disconnected", { reason });
      this.isConnecting = false;
      if (reason === "io server disconnect") {
        // Server initiated disconnect, attempt to reconnect
        this.attemptReconnect();
      }
    });

    this.socket.on("error", (error: Error) => {
      logger.error("WebSocketManager", "WebSocket error", error);
      this.isConnecting = false;
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error(
        "WebSocketManager",
        "Max reconnection attempts reached, giving up"
      );
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    logger.info("WebSocketManager", "Attempting to reconnect", {
      attempt: this.reconnectAttempts + 1,
      delay,
    });

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  public disconnect(): void {
    if (this.socket) {
      logger.info("WebSocketManager", "Disconnecting WebSocket");
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public send(event: string, data: unknown): void {
    if (!this.isConnected()) {
      logger.warn("WebSocketManager", "Cannot send message - not connected");
      return;
    }

    logger.debug("WebSocketManager", "Sending event", { event, data });
    this.socket?.emit(event, data);
  }

  public on(event: string, callback: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }

    this.eventHandlers.get(event)?.push(callback);
    logger.debug("WebSocketManager", "Registered event handler", { event });

    if (this.socket) {
      this.socket.on(event, (...args: unknown[]) => {
        logger.debug("WebSocketManager", "Received event", {
          event,
          args,
        });
        callback(...args);
      });
    }
  }

  public off(event: string, callback: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index !== -1) {
        handlers.splice(index, 1);
        logger.debug("WebSocketManager", "Removed event handler", { event });
      }
    }

    if (this.socket) {
      this.socket.off(event, callback as (...args: unknown[]) => void);
    }
  }
}

export default WebSocketManager;
