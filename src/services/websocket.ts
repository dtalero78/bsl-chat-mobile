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
      reconnectionDelayMax: 10000,
      timeout: 20000,
      autoConnect: true,
      forceNew: false,
      // Keep-alive configuration
      pingInterval: 25000,  // Match server config
      pingTimeout: 60000,   // Match server config
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

    this.socket.on('disconnect', (reason) => {
      console.log('🔴 WebSocket disconnected:', reason);
      this.connected = false;
      this.onConnectionChange?.(false);

      // Reconectar automáticamente si la desconexión fue inesperada
      if (reason === 'io server disconnect') {
        // El servidor forzó la desconexión, reconectar
        console.log('🔄 Reconectando por desconexión del servidor...');
        this.socket?.connect();
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 Reconectado después de ${attemptNumber} intentos`);
      this.connected = true;
      this.onConnectionChange?.(true);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Intento de reconexión #${attemptNumber}`);
    });

    this.socket.on('reconnect_error', (error) => {
      console.log('❌ Error en reconexión:', error.message);
    });

    this.socket.on('reconnect_failed', () => {
      console.log('❌ Falló la reconexión después de todos los intentos');
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

    // ✅ NUEVO: Evento de cambio de estado de mensaje (read receipts)
    this.socket.on('message_status', (data: { message_id: string; status: string; numero: string }) => {
      console.log('🔄 Message status updated:', data.message_id, data.status);
      this.onMessageStatusUpdate?.(data.message_id, data.status);
    });

    // Legacy event (mantener por compatibilidad)
    this.socket.on('message_status_update', (data: { message_id: string; status: string }) => {
      console.log('🔄 Message status updated (legacy):', data.message_id, data.status);
      this.onMessageStatusUpdate?.(data.message_id, data.status);
    });

    // ✅ NUEVO: Evento de actualización de conversación (chat updates)
    this.socket.on('conversation_update', (data: any) => {
      console.log('🔄 Conversation updated:', data.numero, 'Event type:', data.event_type);

      // Transformar al formato Conversation si es necesario
      const conversation: Partial<Conversation> = {
        id: data.numero,
        name: data.nombre,
        phone: data.numero,
        profile_pic_url: data.profile_picture,
        last_message: data.last_message,
        last_message_time: data.last_message_time || data.last_read_timestamp,
      };

      this.onConversationUpdate?.(conversation as Conversation);
    });

    // Legacy event (mantener por compatibilidad)
    this.socket.on('conversation_updated', (data: Conversation) => {
      console.log('🔄 Conversation updated (legacy):', data.id);
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
