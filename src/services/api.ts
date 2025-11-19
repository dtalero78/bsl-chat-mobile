import axios from 'axios';
import { ConversationsResponse, Conversation } from '../types/Conversation';
import { MessagesResponse, Message, SendMessageRequest, TwilioMessage, WhapiMessage } from '../types/Message';

const BASE_URL = 'https://bsl-utilidades-yp78a.ondigitalocean.app';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const chatApi = {
  // Get all conversations
  getConversations: async (): Promise<Conversation[]> => {
    console.log('🔵 Fetching conversations from:', BASE_URL + '/twilio-chat/api/conversaciones');
    // Request more conversations to include all Twilio + Whapi
    const response = await api.get<ConversationsResponse>('/twilio-chat/api/conversaciones?limit=200');

    // Transform object to array
    const conversationsObj = response.data.conversaciones;
    const conversationsArray: Conversation[] = Object.entries(conversationsObj).map(([id, data]) => ({
      id,
      name: data.nombre,
      phone: data.numero,
      last_message: data.last_message,
      last_message_time: data.last_message_time,
      profile_pic_url: data.profile_picture,
      unread_count: data.message_count,
      source: data.source,
    }));

    // Sort by last_message_time (most recent first)
    conversationsArray.sort((a, b) => {
      if (!a.last_message_time) return 1; // Put conversations without messages at the end
      if (!b.last_message_time) return -1;
      return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
    });

    console.log('📦 Response:', response.status, 'Conversaciones:', conversationsArray.length);
    return conversationsArray;
  },

  // Get messages for a specific conversation
  getMessages: async (conversationId: string): Promise<Message[]> => {
    console.log('🔵 Fetching messages for:', conversationId);
    const response = await api.get<MessagesResponse>(`/twilio-chat/api/conversacion/${conversationId}`);

    const messages: Message[] = [];

    // Transform Twilio messages
    if (response.data.twilio_messages) {
      response.data.twilio_messages.forEach((msg: TwilioMessage, index: number) => {
        // Use sid if available, otherwise use timestamp + index for uniqueness
        const messageId = msg.sid
          ? `twilio_${msg.sid}`
          : `twilio_${conversationId}_${msg.date_sent}_${index}`;

        messages.push({
          id: messageId,
          conversation_id: conversationId,
          direction: msg.direction,
          body: msg.body,
          timestamp: msg.date_sent,
          status: msg.status as any,
        });
      });
    }

    // Transform Whapi messages
    if (response.data.whapi_messages) {
      response.data.whapi_messages.forEach((msg: WhapiMessage, index: number) => {
        // Use id if available, otherwise use timestamp + index for uniqueness
        const messageId = msg.id
          ? `whapi_${msg.id}`
          : `whapi_${conversationId}_${msg.timestamp}_${index}`;

        messages.push({
          id: messageId,
          conversation_id: conversationId,
          direction: msg.from_me ? 'outbound' : 'inbound',
          body: msg.body,
          timestamp: new Date(msg.timestamp * 1000).toISOString(),
          status: msg.status as any,
        });
      });
    }

    // Sort by timestamp (oldest first)
    messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    console.log('📦 Messages response:', response.status, 'Messages:', messages.length);
    return messages;
  },

  // Send a message
  sendMessage: async (conversationId: string, message: string): Promise<void> => {
    const payload: SendMessageRequest = {
      to: conversationId,
      message: message,
      source: 'auto', // Auto-detect whapi or twilio
    };
    console.log('📤 Sending message to:', conversationId, 'Message:', message.substring(0, 20));
    await api.post('/twilio-chat/api/enviar-mensaje', payload);
    console.log('✅ Message sent successfully');
  },

  // Register push notification token
  registerPushToken: async (expoPushToken: string): Promise<void> => {
    try {
      console.log('📤 Registering push token:', expoPushToken);
      await api.post('/twilio-chat/api/register-push-token', {
        token: expoPushToken,
        platform: 'ios',
      });
      console.log('✅ Push token registered successfully');
    } catch (error) {
      console.error('❌ Error registering push token:', error);
      throw error;
    }
  },
};

export default api;
