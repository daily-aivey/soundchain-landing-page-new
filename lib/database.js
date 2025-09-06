// Database utilities for storing email signups
// Supports multiple storage backends for different deployment environments

const GOAL = 5000;

// Storage adapter interface
class StorageAdapter {
  async getCount() { throw new Error('Not implemented'); }
  async addEmail(email) { throw new Error('Not implemented'); }
  async emailExists(email) { throw new Error('Not implemented'); }
}

// Vercel KV Storage (recommended for Vercel deployments)
class VercelKVAdapter extends StorageAdapter {
  constructor() {
    super();
    this.kv = null;
    this.initKV();
  }

  async initKV() {
    if (typeof window !== 'undefined') return; // Only run on server
    
    try {
      // Dynamically import Vercel KV to avoid build issues when not available
      const { kv } = await import('@vercel/kv');
      this.kv = kv;
    } catch (e) {
      console.log('Vercel KV not available:', e.message);
    }
  }

  async getCount() {
    if (!this.kv) return 0;
    try {
      const count = await this.kv.get('signup_count');
      return count || 0;
    } catch (e) {
      console.error('KV getCount error:', e);
      return 0;
    }
  }

  async addEmail(email) {
    if (!this.kv) return false;
    try {
      // Check if email already exists
      const exists = await this.kv.sismember('emails', email.toLowerCase());
      if (exists) return false;

      // Add email to set and increment count atomically
      const pipeline = this.kv.pipeline();
      pipeline.sadd('emails', email.toLowerCase());
      pipeline.incr('signup_count');
      await pipeline.exec();
      
      return true;
    } catch (e) {
      console.error('KV addEmail error:', e);
      return false;
    }
  }

  async emailExists(email) {
    if (!this.kv) return false;
    try {
      return await this.kv.sismember('emails', email.toLowerCase());
    } catch (e) {
      console.error('KV emailExists error:', e);
      return false;
    }
  }
}

// Simple JSON file storage (for local development)
class FileAdapter extends StorageAdapter {
  constructor() {
    super();
    this.filePath = './data/signups.json';
    this.fs = null;
    this.path = null;
    this.initFS();
  }

  async initFS() {
    if (typeof window !== 'undefined') return; // Only run on server
    
    try {
      this.fs = await import('fs/promises');
      this.path = await import('path');
      
      // Ensure data directory exists
      const dir = this.path.dirname(this.filePath);
      try {
        await this.fs.access(dir);
      } catch {
        await this.fs.mkdir(dir, { recursive: true });
      }
    } catch (e) {
      console.log('File system not available:', e.message);
    }
  }

  async readData() {
    if (!this.fs) return { emails: [], count: 0 };
    
    try {
      const data = await this.fs.readFile(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      // File doesn't exist or is invalid, return default
      return { emails: [], count: 0 };
    }
  }

  async writeData(data) {
    if (!this.fs) return false;
    
    try {
      await this.fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (e) {
      console.error('File write error:', e);
      return false;
    }
  }

  async getCount() {
    const data = await this.readData();
    return data.count || 0;
  }

  async addEmail(email) {
    const data = await this.readData();
    const emailLower = email.toLowerCase();
    
    // Check if email already exists
    if (data.emails.includes(emailLower)) {
      return false;
    }
    
    // Add email and increment count
    data.emails.push(emailLower);
    data.count = data.emails.length;
    
    return await this.writeData(data);
  }

  async emailExists(email) {
    const data = await this.readData();
    return data.emails.includes(email.toLowerCase());
  }
}

// PostgreSQL adapter (for production databases)
class PostgreSQLAdapter extends StorageAdapter {
  constructor() {
    super();
    this.pool = null;
    this.initDB();
  }

  async initDB() {
    if (typeof window !== 'undefined') return; // Only run on server
    
    try {
      // Dynamically import pg to avoid build issues when not available
      const { Pool } = await import('pg');
      
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      // Create table if it doesn't exist
      await this.createTable();
    } catch (e) {
      console.log('PostgreSQL not available:', e.message);
    }
  }

  async createTable() {
    if (!this.pool) return;
    
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS signups (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create index for faster lookups
      await this.pool.query(`
        CREATE INDEX IF NOT EXISTS idx_signups_email 
        ON signups(email)
      `);
    } catch (e) {
      console.error('Table creation error:', e);
    }
  }

  async getCount() {
    if (!this.pool) return 0;
    
    try {
      const result = await this.pool.query('SELECT COUNT(*) as count FROM signups');
      return parseInt(result.rows[0].count) || 0;
    } catch (e) {
      console.error('PostgreSQL getCount error:', e);
      return 0;
    }
  }

  async addEmail(email) {
    if (!this.pool) return false;
    
    try {
      await this.pool.query(
        'INSERT INTO signups (email) VALUES ($1)',
        [email.toLowerCase()]
      );
      return true;
    } catch (e) {
      if (e.code === '23505') { // Unique violation
        return false; // Email already exists
      }
      console.error('PostgreSQL addEmail error:', e);
      return false;
    }
  }

  async emailExists(email) {
    if (!this.pool) return false;
    
    try {
      const result = await this.pool.query(
        'SELECT COUNT(*) as count FROM signups WHERE email = $1',
        [email.toLowerCase()]
      );
      return parseInt(result.rows[0].count) > 0;
    } catch (e) {
      console.error('PostgreSQL emailExists error:', e);
      return false;
    }
  }
}

// Environment variables storage (simple, stateless)
class EnvAdapter extends StorageAdapter {
  async getCount() {
    // For demo purposes, you could store count in environment variable
    // In production, this should be a proper database
    return parseInt(process.env.SIGNUP_COUNT || '0');
  }

  async addEmail(email) {
    // This adapter doesn't actually store emails persistently
    // It's mainly for testing or very simple setups
    console.log('EnvAdapter: Would add email:', email);
    return true;
  }

  async emailExists(email) {
    // Cannot check duplicates without persistent storage
    return false;
  }
}

// Factory function to create the appropriate storage adapter
function createStorageAdapter() {
  // Check for Vercel KV environment variables (preferred for Vercel)
  if (process.env.KV_URL && process.env.KV_REST_API_URL) {
    console.log('Using Vercel KV storage adapter');
    return new VercelKVAdapter();
  }
  
  // Check for PostgreSQL database URL (for traditional databases)
  if (process.env.DATABASE_URL) {
    console.log('Using PostgreSQL storage adapter');
    return new PostgreSQLAdapter();
  }
  
  // Check if we're in a file system environment (local dev)
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    console.log('Using File storage adapter for development');
    return new FileAdapter();
  }
  
  // Fallback to environment adapter
  console.log('Using Environment storage adapter (fallback)');
  return new EnvAdapter();
}

// Main database interface
let storageAdapter = null;

function getStorageAdapter() {
  if (!storageAdapter) {
    storageAdapter = createStorageAdapter();
  }
  return storageAdapter;
}

// Public API functions
export async function getSignupCount() {
  const adapter = getStorageAdapter();
  return await adapter.getCount();
}

export async function addSignup(email) {
  const adapter = getStorageAdapter();
  return await adapter.addEmail(email);
}

export async function checkEmailExists(email) {
  const adapter = getStorageAdapter();
  return await adapter.emailExists(email);
}

export function getGoal() {
  return GOAL;
}

export async function getProgress() {
  const count = await getSignupCount();
  return {
    count,
    goal: GOAL,
    percentage: Math.max(0, Math.min(100, (count / GOAL) * 100))
  };
}
