import { Message, Chat } from '../../types/chat';

type WebSocketEventType = 
  | 'message'
  | 'typing'
  | 'read'
  | 'delivered'
  | 'user_status';

interface WebSocketEvent {
  type: WebSocketEventType;
  payload: any;
}

type EventHandler = (payload: any) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<WebSocketEventType, EventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 1000;

  constructor(private baseUrl: string = 'ws://localhost:3000/ws') {}

  connect(token: string) {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(`${this.baseUrl}?token=${token}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const wsEvent: WebSocketEvent = JSON.parse(event.data);
        this.handleEvent(wsEvent);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect(token);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private attemptReconnect(token: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(token);
    }, this.reconnectTimeout * Math.pow(2, this.reconnectAttempts));
  }

  on(event: WebSocketEventType, handler: EventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(handler);
  }

  off(event: WebSocketEventType, handler: EventHandler) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      this.eventHandlers.set(
        event,
        handlers.filter(h => h !== handler)
      );
    }
  }

  private handleEvent(event: WebSocketEvent) {
    const handlers = this.eventHandlers.get(event.type);
    handlers?.forEach(handler => handler(event.payload));
  }

  sendMessage(chatId: string, message: Partial<Message>) {
    this.send('message', { chatId, message });
  }

  sendTyping(chatId: string, isTyping: boolean) {
    this.send('typing', { chatId, isTyping });
  }

  sendRead(chatId: string, messageIds: string[]) {
    this.send('read', { chatId, messageIds });
  }

  private send(type: WebSocketEventType, payload: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
    this.eventHandlers.clear();
  }
} 