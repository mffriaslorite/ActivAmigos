export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  BANNED = 'BANNED'
}

export enum SemaphoreColor {
  GREY = 'grey',           // Not participating
  LIGHT_GREEN = 'light_green',  // Joined but never chatted
  DARK_GREEN = 'dark_green',    // Joined and chatted
  YELLOW = 'yellow',       // Has warnings
  RED = 'red'             // Banned
}

export interface Warning {
  id: number;
  context_type: string;
  context_id: number;
  target_user_id: number;
  target_user: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
  };
  issued_by: number;
  issuer: {
    id: number;
    username: string;
    first_name?: string;
    last_name?: string;
  };
  reason: string;
  created_at: string;
}

export interface ModerationStatus {
  warning_count: number;
  status: MembershipStatus | 'NOT_MEMBER';
  semaphore_color: SemaphoreColor;
  can_chat?: boolean;
  last_chat_at?: string;
}

export interface IssueWarningRequest {
  context_type: 'GROUP' | 'ACTIVITY';
  context_id: number;
  target_user_id: number;
  reason: string;
}

export interface IssueWarningResponse {
  message: string;
  warning: Warning;
  warning_count: number;
  banned: boolean;
}

export interface Membership {
  id: number;
  user_id: number;
  group_id?: number;
  activity_id?: number;
  warning_count: number;
  status: MembershipStatus;
  joined_at: string;
  role: string;
  is_active: boolean;
  last_chat_at?: string;
  user?: any;
}

// WebSocket events
export interface UserBannedEvent {
  user_id: number;
  username: string;
  reason: string;
  warning_count: number;
}

export interface WarningIssuedEvent {
  user_id: number;
  username: string;
  reason: string;
  warning_count: number;
}

export interface UserUnbannedEvent {
  user_id: number;
  username: string;
}