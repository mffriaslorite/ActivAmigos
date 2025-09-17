export interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  profile_image?: string;
}

export enum MessageType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  WARNING = 'WARNING',
  BAN = 'BAN'
}

export interface Message {
  id: number;
  content: string;
  timestamp: string;
  message_type: MessageType;
  context_type?: string;
  context_id?: number;
  sender_id?: number; // Nullable for system messages
  sender?: User;
  group_id?: number;
  activity_id?: number;
}

export interface CreateMessage {
  content: string;
  group_id?: number;
  activity_id?: number;
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