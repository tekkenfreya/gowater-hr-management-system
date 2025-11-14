export interface User {
  id: number;
  email: string;
  name: string;
  employeeId?: string;
  role: 'admin' | 'employee' | 'manager' | 'boss';
  position?: string;
  department?: string;
  employeeName?: string;
  avatar?: string;
  force_password_reset?: boolean;
  last_password_change?: string;
}

export interface LoginCredentials {
  username: string; // Can be email or employee_id
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