export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'employee' | 'manager';
  department?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}


export interface AuthResponse {
  user: User;
  token: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}