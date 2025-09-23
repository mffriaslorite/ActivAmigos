import { User } from './user.model';

export interface LoginRequest {
  username: string;
  password: string;
  remember_me?: boolean;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
}

export interface PasswordHint {
  hint_available: boolean;
  hint_type?: 'ANIMAL_LIST';
  animals?: string[];
}

export interface AnimalListResponse {
  animals: string[];
}
