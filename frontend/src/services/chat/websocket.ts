import { Message } from '../../types/chat';
import io from 'socket.io-client';

type WebSocketEventType = 
  | 'message'
  | 'messageReceived'
  | 'typing'
  | 'read'
  | 'delivered'
  | 'user_status'
  | 'joinChat'
  | 'newMessage'
  | 'join'
  | 'userOnline'
  | 'userOffline'
  | 'onlineUsers';

interface WebSocketEvent {
  type: WebSocketEventType;
  payload: any;
}

type EventHandler = (payload: any) => void;

export class WebSocketService {
  private socket: ReturnType<typeof io> | null = null;
  private eventHandlers: Map<string, EventHandler[]> = new Map();

  constructor(private baseUrl: string = 'http://localhost:3000') {}

  connect(token: string) {
    console.log('[WebSocket] Attempting to connect with token:', token ? 'present' : 'missing');
    console.log('[WebSocket] Current socket state:', this.socket ? 'exists' : 'null');
    
    if (this.socket?.connected) {
      console.log('[WebSocket] Socket already connected, reusing existing connection');
      return this.socket;
    }

    if (this.socket) {
      console.log('[WebSocket] Socket exists but not connected, cleaning up first');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.socket = io(this.baseUrl, {
      auth: {
        token
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected successfully, socket id:', this.socket?.id);
      // Re-register all event handlers on reconnection
      this.setupEventHandlers();
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('[WebSocket] Disconnected, reason:', reason);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, attempt to reconnect
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('[WebSocket] Connection error:', error.message);
    });

    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('[WebSocket] Reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('[WebSocket] Attempting to reconnect, attempt #', attemptNumber);
    });

    // Set up handlers for all registered events
    this.setupEventHandlers();

    return this.socket;
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    // Clear existing listeners for specific events
    this.socket.off('messageReceived');
    this.socket.off('userTyping');

    this.socket.on('messageReceived', (payload: { chatId: string; message: Message }) => {
      console.log('[WebSocket] Received new message:', payload);
      const handlers = this.eventHandlers.get('messageReceived');
      handlers?.forEach(handler => handler(payload));
    });

    this.socket.on('userTyping', (payload: { chatId: string; isTyping: boolean }) => {
      console.log('[WebSocket] User typing status changed:', payload);
      const handlers = this.eventHandlers.get('typing');
      handlers?.forEach(handler => handler(payload));
    });

    // Re-register all custom event handlers
    this.eventHandlers.forEach((handlers, event) => {
      if (event !== 'messageReceived' && event !== 'typing') {
        this.socket?.off(event); // Remove existing listeners first
        this.socket?.on(event, (payload: unknown) => {
          console.log('[WebSocket] Received event:', event, payload);
          handlers.forEach(handler => handler(payload));
        });
      }
    });
  }

  on(event: WebSocketEventType, handler: EventHandler) {
    const handlers = this.eventHandlers.get(event) || [];
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, handlers);
      // If socket is already connected, set up the handler
      if (this.socket?.connected) {
        this.socket.on(event, (payload: unknown) => {
          console.log('[WebSocket] Received event:', event, payload);
          handler(payload);
        });
      }
    }
    handlers.push(handler);
  }

  off(event: WebSocketEventType, handler: EventHandler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      this.eventHandlers.set(
        event,
        handlers.filter(h => h !== handler)
      );
      if (this.socket?.connected && handlers.length === 0) {
        this.socket.off(event);
      }
    }
  }

  send(type: WebSocketEventType, payload: any) {
    if (this.socket?.connected) {
      console.log('[WebSocket] Sending event:', type, payload);
      this.socket.emit(type, payload);
    } else {
      console.error('[WebSocket] Socket.IO is not connected');
    }
  }

  sendMessage(chatId: string, message: Partial<Message>) {
    this.send('newMessage', { chatId, message });
  }

  sendTyping(chatId: string, isTyping: boolean) {
    this.send('typing', { chatId, isTyping });
  }

  sendRead(chatId: string, messageIds: string[]) {
    this.send('read', { chatId, messageIds });
  }

  disconnect() {
    console.log('[WebSocket] Disconnect called, socket state:', this.socket ? 'exists' : 'null');
    if (this.socket) {
      console.log('[WebSocket] Cleaning up socket connection');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventHandlers.clear();
  }
} 