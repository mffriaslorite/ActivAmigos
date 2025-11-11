export interface Group {
  id: number;
  name: string;
  description?: string;
  rules?: string;
  created_by: number;
  created_at: string;
  member_count: number;
  is_member: boolean;
}

export interface GroupMember {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  profile_image?: string;
  is_admin: boolean;
  joined_at: string;
  semaphore_color: 'grey' | 'light_green' | 'dark_green' | 'yellow' | 'red';
  warning_count: number;
}

export interface GroupDetails extends Group {
  members: GroupMember[];
}

export interface GroupCreate {
  name: string;
  description?: string;
  rules?: string;
  rule_ids?: number[];
}

export interface GroupUpdate {
  name?: string;
  description?: string;
  rules?: string;
}

export interface JoinLeaveResponse {
  message: string;
  is_member: boolean;
  member_count: number;
}