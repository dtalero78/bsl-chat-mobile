import { io, Socket } from 'socket.io-client';
import { Message } from '../types/Message';
import { Conversation } from '../types/Conversation';

const SOCKET_URL = 'https://bsl-utilidades-yp78a.ondigitalocean.app';

class WebSocketService {
  private socket: Socket | null = null;
  private connected: boolean = false;

  // Callbacks
  public onNewMessage: ((message: Message) => void) | null = null;
  public onMessageStatusUpdate: ((messageId: string, status: string) => void) | null = null;
  public onConversationUpdate: ((conversation: Conversation) => void) | null = null;
  public onConversationRead: ((conversationId: string) => void) | null = null;
  public onConnectionChange: ((connected: boolean) => void) | null = null;

  connect() {
    if (this.socket && this.connected) {
      console.log('⚠️ Socket already connected');
      return;
    }

    console.log('🔵 Connecting to WebSocket...');

    this.socket = io(`${SOCKET_URL}/twilio-chat`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 20000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('🟢 WebSocket connected');
      this.connected = true;
      this.onConnectionChange?.(true);
    });

    this.socket.on('disconnect', () => {
      console.log('🔴 WebSocket disconnected');
      this.connected = false;
      this.onConnectionChange?.(false);
    });

    this.socket.on('connect_error', (error) => {
      console.log('❌ WebSocket connection error:', error.message);
    });

    // Chat events - backend sends 'new_message' (not 'nuevo_mensaje')
    this.socket.on('new_message', (data: any) => {
      console.log('📨 New message received from backend:', data);

      // Transform backend format to our Message format
      const message: Message = {
        id: data.message_sid || data.message_id || `temp-${Date.now()}`,
        conversation_id: data.numero, // numero is the clean phone number
        // ✅ Usar direction del backend si está disponible (después de CAMBIO 1)
        direction: data.direction || (data.from.includes('+573153369631') ? 'outbound' : 'inbound'),
        body: data.body,
        timestamp: data.timestamp,
        status: data.status || 'delivered',  // ← Usar status del backend
      };

      this.onNewMessage?.(message);
    });

    this.socket.on('message_status_update', (data: { message_id: string; status: string }) => {
      console.log('🔄 Message status updated:', data.message_id, data.status);
      this.onMessageStatusUpdate?.(data.message_id, data.status);
    });

    this.socket.on('conversation_updated', (data: Conversation) => {
      console.log('🔄 Conversation updated:', data.id);
      this.onConversationUpdate?.(data);
    });

    this.socket.on('conversation_read', (data: { numero: string }) => {
      console.log('📖 Conversation marked as read:', data.numero);
      this.onConversationRead?.(data.numero);
    });
  }

  disconnect() {
    if (this.socket) {
      console.log('🔴 Disconnecting from WebSocket...');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.onConnectionChange?.(false);
    }
  }

  joinConversation(conversationId: string) {
    if (this.socket && this.connected) {
      this.socket.emit('join_conversation', conversationId);
      console.log('📥 Joined conversation:', conversationId);
    }
  }

  leaveConversation(conversationId: string) {
    if (this.socket && this.connected) {
      this.socket.emit('leave_conversation', conversationId);
      console.log('📤 Left conversation:', conversationId);
    }
  }

  sendTypingIndicator(conversationId: string, isTyping: boolean) {
    if (this.socket && this.connected) {
      this.socket.emit('typing', {
        conversation_id: conversationId,
        is_typing: isTyping,
      });
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
