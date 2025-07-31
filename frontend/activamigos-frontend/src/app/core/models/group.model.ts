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

export interface GroupCreate {
  name: string;
  description?: string;
  rules?: string;
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