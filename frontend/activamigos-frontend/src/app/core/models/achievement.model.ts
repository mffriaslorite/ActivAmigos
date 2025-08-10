export interface Achievement {
  id: number;
  title: string;
  description: string;
  icon_url?: string;
  points_reward: number;
  created_at: string;
}

export interface UserAchievement {
  id: number;
  user_id: number;
  achievement_id: number;
  date_earned: string;
  achievement: Achievement;
}

export interface UserPoints {
  id: number;
  user_id: number;
  points: number;
  level: number;
  progress_to_next_level: number;
  updated_at: string;
}

export interface GamificationState {
  points: number;
  level: number;
  progress_to_next_level: number;
  earned_achievements: UserAchievement[];
}

export interface UpdateGamificationRequest {
  points?: number;
  achievement_id?: number;
}