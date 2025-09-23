export interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_image?: string;
  bio?: string;
  role?: 'USER' | 'ORGANIZER' | 'SUPERADMIN';
  is_active: boolean;
  created_at: string;
  last_login?: string;
  email_verified?: boolean;
}
