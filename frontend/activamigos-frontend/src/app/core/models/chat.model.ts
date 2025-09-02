export interface Message {
  id: number;
  content: string;
  timestamp: string;
  sender_id: number;
  sender_name: string;
  sender_username: string;
  chat_type: 'group' | 'activity';
  chat_id: number;
}

export interface ChatRoom {
  id: number;
  type: 'group' | 'activity';
  name: string;
  member_count: number;
  message_count: number;
  status: 'active' | 'inactive';
}

export interface ChatMessage {
  id: number;
  content: string;
  timestamp: string;
  sender_id: number;
  sender_name: string;
  sender_username: string;
  isCurrentUser: boolean;
}

export interface ChatPagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ChatHistoryResponse {
  messages: ChatMessage[];
  pagination: ChatPagination;
}

export interface SendMessageRequest {
  content: string;
  user_id: number;
}

export interface SendMessageResponse {
  status: string;
  message: Message;
}

export interface ChatStatus {
  chat_type: 'group' | 'activity';
  chat_id: number;
  member_count: number;
  message_count: number;
  status: string;
}

// WebSocket event types
export interface WebSocketEvents {
  connect: () => void;
  disconnect: () => void;
  connected: (data: { status: string; sid: string }) => void;
  joined_chat: (data: { status: string; chat_type: string; chat_id: number; room: string }) => void;
  left_chat: (data: { status: string; chat_type: string; chat_id: number }) => void;
  new_message: (message: Message) => void;
  message_sent: (data: { status: string; message_id: number }) => void;
  error: (data: { message: string }) => void;
}

// WebSocket emit events
export interface WebSocketEmitEvents {
  join_chat: (data: { user_id: number; chat_type: string; chat_id: number }) => void;
  leave_chat: (data: { chat_type: string; chat_id: number }) => void;
  send_message: (data: { user_id: number; content: string; chat_type: string; chat_id: number }) => void;
}