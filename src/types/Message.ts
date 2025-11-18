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
  conversation_id: string;
  mensaje: string;
}
