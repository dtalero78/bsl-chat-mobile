export interface Message {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  body: string | null;
  timestamp: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
  media_url?: string | null;
}

export interface MessagesResponse {
  mensajes: Message[];
}

export interface SendMessageRequest {
  to: string;
  message: string;
  source?: 'auto' | 'twilio' | 'whapi';
}
