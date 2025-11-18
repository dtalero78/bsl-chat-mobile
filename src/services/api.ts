import axios from 'axios';
import { ConversationsResponse, Conversation } from '../types/Conversation';
import { MessagesResponse, Message, SendMessageRequest } from '../types/Message';

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

    console.log('📦 Response:', response.status, 'Conversaciones:', conversationsArray.length);
    return conversationsArray;
  },

  // Get messages for a specific conversation
  getMessages: async (conversationId: string): Promise<Message[]> => {
    console.log('🔵 Fetching messages for:', conversationId);
    const response = await api.get<MessagesResponse>(`/twilio-chat/api/conversacion/${conversationId}`);
    console.log('📦 Messages response:', response.status, 'Messages:', response.data.mensajes?.length || 0);
    return response.data.mensajes || [];
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
};

export default api;
