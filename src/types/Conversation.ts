export interface ConversationData {
  nombre: string;
  numero: string;
  last_message: string | null;
  last_message_time: string | null;
  profile_picture: string | null;
  message_count: number;
  source: 'twilio' | 'whapi';
}

export interface Conversation {
  id: string;
  name: string;
  phone: string;
  last_message: string | null;
  last_message_time: string | null;
  profile_pic_url: string | null;
  unread_count: number;
  source: 'twilio' | 'whapi';
}

export interface ConversationsResponse {
  conversaciones: { [key: string]: ConversationData };
}
