export interface Activity {
  id: number;
  title: string;
  description?: string;
  location?: string;
  date: string;
  rules?: string;
  created_by: number;
  created_at: string;
  participant_count: number;
  is_participant: boolean;
}

export interface ActivityParticipant {
  id: number;
  username: string;
  first_name?: string;
  last_name?: string;
  profile_image?: string;
  is_organizer: boolean;
  joined_at: string;
}

export interface ActivityDetails extends Activity {
  participants: ActivityParticipant[];
}

export interface ActivityCreate {
  title: string;
  description?: string;
  location?: string;
  date: string;
  rules?: string;
  rule_ids?: number[];
}

export interface ActivityUpdate {
  title?: string;
  description?: string;
  location?: string;
  date?: string;
  rules?: string;
}

export interface JoinLeaveActivityResponse {
  message: string;
  is_participant: boolean;
  participant_count: number;
}