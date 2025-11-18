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
    const response = await api.get<ConversationsResponse>('/twilio-chat/api/conversaciones');
    return response.data.conversaciones;
  },

  // Get messages for a specific conversation
  getMessages: async (conversationId: string): Promise<Message[]> => {
    const response = await api.get<MessagesResponse>(`/twilio-chat/api/mensajes/${conversationId}`);
    return response.data.mensajes;
  },

  // Send a message
  sendMessage: async (conversationId: string, message: string): Promise<void> => {
    const payload: SendMessageRequest = {
      conversation_id: conversationId,
      mensaje: message,
    };
    await api.post('/twilio-chat/api/enviar-mensaje', payload);
  },
};

export default api;
