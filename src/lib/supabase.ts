import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for public operations (with RLS enabled)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database interface matching our existing SQLite implementation
export class SupabaseDatabase {
  private client = supabaseAdmin;
  private initialized = false;

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Test connection by querying users table
      const { error } = await this.client.from('users').select('count').limit(1);
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist
        throw error;
      }
      
      this.initialized = true;
      console.log('Supabase database initialized successfully');
    } catch (error) {
      console.error('Supabase database initialization error:', error);
      throw error;
    }
  }

  // SQLite-compatible methods for easy migration
  async run(sql: string, _params: unknown[] = []): Promise<void> {
    // For INSERT/UPDATE/DELETE operations, convert to Supabase operations
    // This is a simplified approach - you may need to enhance based on actual SQL used
    throw new Error('Use Supabase table operations instead of raw SQL');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get<T = any>(table: string, conditions: Record<string, unknown> = {}): Promise<T | undefined> {
    let query = this.client.from(table).select('*');
    
    Object.keys(conditions).forEach(key => {
      query = query.eq(key, conditions[key]);
    });
    
    const { data, error } = await query.single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    return data as T;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async all<T = any>(table: string, conditions: Record<string, unknown> = {}, orderBy?: string): Promise<T[]> {
    let query = this.client.from(table).select('*');
    
    Object.keys(conditions).forEach(key => {
      if (key.includes('_range')) {
        // Handle date range queries
        const field = key.replace('_range', '');
        const [start, end] = conditions[key] as [string, string];
        query = query.gte(field, start).lte(field, end);
      } else {
        query = query.eq(key, conditions[key]);
      }
    });
    
    if (orderBy) {
      query = query.order(orderBy, { ascending: false });
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw error;
    }
    
    return data as T[];
  }

  // Enhanced Supabase methods
  async insert(table: string, data: Record<string, unknown>) {
    const { data: result, error } = await this.client
      .from(table)
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return result;
  }

  async update(table: string, data: Record<string, unknown>, conditions: Record<string, unknown>) {
    let query = this.client.from(table).update(data);
    
    Object.keys(conditions).forEach(key => {
      query = query.eq(key, conditions[key]);
    });
    
    const { data: result, error } = await query.select();
    
    if (error) throw error;
    return result;
  }

  async delete(table: string, conditions: Record<string, unknown>) {
    let query = this.client.from(table).delete();
    
    Object.keys(conditions).forEach(key => {
      query = query.eq(key, conditions[key]);
    });
    
    const { error } = await query;
    
    if (error) throw error;
  }

  // Raw SQL execution for complex queries (use sparingly)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async executeRawSQL<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
    const { data, error } = await this.client.rpc('execute_sql', { 
      query: sql, 
      params: params 
    });
    
    if (error) throw error;
    return data as T[];
  }

  async close(): Promise<void> {
    // Supabase handles connection pooling, no need to close
    return Promise.resolve();
  }
}

// Singleton instance
let dbInstance: SupabaseDatabase | null = null;

export function getDb(): SupabaseDatabase {
  if (!dbInstance) {
    dbInstance = new SupabaseDatabase();
  }
  return dbInstance;
}

export default getDb;