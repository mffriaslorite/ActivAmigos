export interface User {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  profile_image?: string;
}

export interface Message {
  id: number;
  content: string;
  timestamp: string;
  sender_id: number;
  sender: User;
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