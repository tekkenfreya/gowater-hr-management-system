import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from './supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'gowater-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'employee' | 'manager';
  department?: string;
  employeeName?: string;
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'employee' | 'manager';
  department?: string;
  employeeName?: string;
}

export class AuthService {
  private db = getDb();

  async initialize() {
    await this.db.initialize();
    await this.createDefaultAdmin();
  }

  private async createDefaultAdmin() {
    try {
      const existingAdmin = await this.db.get('users', { role: 'admin' });

      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await this.db.insert('users', {
          email: 'admin@gowater.com',
          password_hash: hashedPassword,
          name: 'System Administrator',
          role: 'admin',
          department: 'IT'
        });
        console.log('Default admin account created successfully');
      }
    } catch (error) {
      console.error('Error creating default admin:', error);
    }
  }

  async login(email: string, password: string): Promise<LoginResult> {
    try {
      const user = await this.db.get('users', { email, status: 'active' });

      if (!user) {
        return { success: false, error: 'Invalid email or password' };
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return { success: false, error: 'Invalid email or password' };
      }

      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        employeeName: user.employee_name
      };

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return { success: true, user: authUser, token };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  async createUser(userData: CreateUserData, _createdBy?: number): Promise<{ success: boolean; error?: string; userId?: number }> {
    try {
      // Check if user already exists
      const existingUser = await this.db.get('users', { email: userData.email });
      if (existingUser) {
        return { success: false, error: 'User with this email already exists' };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Insert user
      const newUser = await this.db.insert('users', {
        email: userData.email,
        password_hash: hashedPassword,
        name: userData.name,
        role: userData.role || 'employee',
        department: userData.department,
        employee_name: userData.employeeName
      });
      
      return { success: true, userId: newUser?.id };
    } catch (error) {
      console.error('Create user error:', error);
      return { success: false, error: 'Failed to create user account' };
    }
  }

  async verifyToken(token: string): Promise<AuthUser | null> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
      
      const user = await this.db.get('users', { id: decoded.userId, status: 'active' });

      if (!user) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        employeeName: user.employee_name
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  async getAllUsers(): Promise<AuthUser[]> {
    try {
      const users = await this.db.all('users', { status: 'active' }, 'created_at');

      return users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        employeeName: user.employee_name
      }));
    } catch (error) {
      console.error('Get all users error:', error);
      return [];
    }
  }

  async updateUserStatus(userId: number, status: 'active' | 'inactive'): Promise<boolean> {
    try {
      await this.db.update('users', { status, updated_at: new Date() }, { id: userId });
      return true;
    } catch (error) {
      console.error('Update user status error:', error);
      return false;
    }
  }

  async deleteUser(userId: number): Promise<boolean> {
    try {
      await this.db.update('users', { status: 'inactive', updated_at: new Date() }, { id: userId });
      return true;
    } catch (error) {
      console.error('Delete user error:', error);
      return false;
    }
  }

  async updateUserProfile(userId: number, profileData: {
    name?: string;
    department?: string;
    employeeName?: string;
    role?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date()
      };

      if (profileData.name !== undefined) updateData.name = profileData.name;
      if (profileData.department !== undefined) updateData.department = profileData.department;
      if (profileData.employeeName !== undefined) updateData.employee_name = profileData.employeeName;
      if (profileData.role !== undefined) updateData.role = profileData.role;

      await this.db.update('users', updateData, { id: userId });
      return { success: true };
    } catch (error) {
      console.error('Update user profile error:', error);
      return { success: false, error: 'Failed to update profile' };
    }
  }
}

// Singleton instance
let authServiceInstance: AuthService | null = null;

export function getAuthService(): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
}