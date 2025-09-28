export interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  profile_image?: string;
}

export interface Message {
  id: number;
  context_type: 'GROUP' | 'ACTIVITY';
  context_id: number;
  content: string;
  created_at: string;
  sender_id: number;
  sender: User;
  is_system?: boolean;
}

export interface CreateMessage {
  content: string;
  context_type: 'GROUP' | 'ACTIVITY';
  context_id: number;
}

export interface ChatRoom {
  type: 'group' | 'activity';
  id: number;
  name: string;
}

export interface MessageListQuery {
  page?: number;
  per_page?: number;
  before?: string;
}