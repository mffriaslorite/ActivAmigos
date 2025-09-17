export enum UserRole {
  USER = 'USER',
  ORGANIZER = 'ORGANIZER',
  SUPERADMIN = 'SUPERADMIN'
}

export interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_image?: string;
  bio?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  email_verified?: boolean;
  password_hint_type?: string;
}
