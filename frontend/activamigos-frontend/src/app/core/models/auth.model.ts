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
  hint_info?: {
    hint: string;
    animals: string[];
  };
  auto_refreshed?: boolean;
}

export interface PasswordHintResponse {
  hint: string;
  animals: string[];
}

export interface AnimalsResponse {
  animals: string[];
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ChangePasswordResponse {
  message: string;
  hint_info: {
    hint: string;
    animals: string[];
  };
}
