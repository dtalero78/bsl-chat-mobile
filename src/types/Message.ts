// Backend message format (Twilio)
export interface TwilioMessage {
  sid: string;
  body: string | null;
  direction: 'inbound' | 'outbound';
  date_sent: string;
  from: string;
  to: string;
  status: string;
  media_count: string;
  source: 'twilio';
}

// Backend message format (Whapi)
export interface WhapiMessage {
  id: string;
  body: string | null;
  from_me: boolean;
  timestamp: number;
  status?: string;
  source: 'whapi';
}

// Frontend unified message format
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
  success: boolean;
  count: number;
  total: number;
  source: 'twilio' | 'whapi' | 'twilio_and_whapi';
  numero: string;
  twilio_messages?: TwilioMessage[];
  whapi_messages?: WhapiMessage[];
}

export interface SendMessageRequest {
  to: string;
  message: string;
  source?: 'auto' | 'twilio' | 'whapi';
}
