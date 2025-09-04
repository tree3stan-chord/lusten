import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'lusten.db');

// Database schema for storing user refresh tokens
// This extends the existing database with a new table
export function initializeRefreshTokensTable() {
  const db = new Database(DB_PATH);
  
  try {
    db.exec(`
      -- User refresh tokens for background processing
      CREATE TABLE IF NOT EXISTS user_refresh_tokens (
        user_id TEXT PRIMARY KEY REFERENCES users(spotify_id) ON DELETE CASCADE,
        encrypted_refresh_token TEXT NOT NULL,
        expires_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        is_active BOOLEAN DEFAULT TRUE
      );
      
      -- Job queue for background processing
      CREATE TABLE IF NOT EXISTS spotify_refresh_jobs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(spotify_id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
        priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
        time_range TEXT DEFAULT 'medium_term',
        scheduled_at TEXT DEFAULT (datetime('now')),
        started_at TEXT,
        completed_at TEXT,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Refresh logs for monitoring
      CREATE TABLE IF NOT EXISTS spotify_refresh_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(spotify_id) ON DELETE CASCADE,
        job_id TEXT REFERENCES spotify_refresh_jobs(id) ON DELETE SET NULL,
        status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
        cached BOOLEAN DEFAULT FALSE,
        tracks_analyzed INTEGER,
        artists_analyzed INTEGER,
        recent_tracks_analyzed INTEGER,
        time_range TEXT,
        duration_ms INTEGER,
        error_message TEXT,
        spotify_rate_limit_hit BOOLEAN DEFAULT FALSE,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_refresh_jobs_status ON spotify_refresh_jobs(status);
      CREATE INDEX IF NOT EXISTS idx_refresh_jobs_scheduled ON spotify_refresh_jobs(scheduled_at);
      CREATE INDEX IF NOT EXISTS idx_refresh_jobs_user ON spotify_refresh_jobs(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_logs_user ON spotify_refresh_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_logs_created ON spotify_refresh_logs(created_at);
    `);
  } finally {
    db.close();
  }
}

// Interfaces for the new tables
export interface UserRefreshToken {
  user_id: string;
  encrypted_refresh_token: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface SpotifyRefreshJob {
  id: string;
  user_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  time_range: string;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  created_at: string;
}

export interface SpotifyRefreshLog {
  id: string;
  user_id: string;
  job_id: string | null;
  status: 'success' | 'failed' | 'skipped';
  cached: boolean;
  tracks_analyzed: number | null;
  artists_analyzed: number | null;
  recent_tracks_analyzed: number | null;
  time_range: string | null;
  duration_ms: number | null;
  error_message: string | null;
  spotify_rate_limit_hit: boolean;
  created_at: string;
}

// Simple encryption/decryption for refresh tokens
// In production, use a more robust encryption method
function encryptToken(token: string): string {
  const key = process.env.REFRESH_TOKEN_ENCRYPTION_KEY || 'default-key-change-me';
  // This is a very basic encoding - use proper encryption in production
  return Buffer.from(token + key).toString('base64');
}

function decryptToken(encryptedToken: string): string {
  const key = process.env.REFRESH_TOKEN_ENCRYPTION_KEY || 'default-key-change-me';
  // This is a very basic decoding - use proper decryption in production
  const decoded = Buffer.from(encryptedToken, 'base64').toString();
  return decoded.replace(key, '');
}

// Database operations for refresh tokens
export function storeUserRefreshToken(userId: string, refreshToken: string): boolean {
  const db = new Database(DB_PATH);
  
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO user_refresh_tokens 
      (user_id, encrypted_refresh_token, updated_at)
      VALUES (?, ?, datetime('now'))
    `);
    
    const result = stmt.run(userId, encryptToken(refreshToken));
    return result.changes > 0;
  } finally {
    db.close();
  }
}

export function getUserRefreshToken(userId: string): string | null {
  const db = new Database(DB_PATH);
  
  try {
    const stmt = db.prepare(`
      SELECT encrypted_refresh_token 
      FROM user_refresh_tokens 
      WHERE user_id = ? AND is_active = TRUE
    `);
    
    const row = stmt.get(userId) as { encrypted_refresh_token: string } | undefined;
    return row ? decryptToken(row.encrypted_refresh_token) : null;
  } finally {
    db.close();
  }
}

export function revokeUserRefreshToken(userId: string): boolean {
  const db = new Database(DB_PATH);
  
  try {
    const stmt = db.prepare(`
      UPDATE user_refresh_tokens 
      SET is_active = FALSE, updated_at = datetime('now')
      WHERE user_id = ?
    `);
    
    const result = stmt.run(userId);
    return result.changes > 0;
  } finally {
    db.close();
  }
}

// Job queue operations
export function createRefreshJob(
  userId: string,
  priority: SpotifyRefreshJob['priority'] = 'medium',
  timeRange: string = 'medium_term',
  scheduledAt?: Date
): SpotifyRefreshJob {
  const db = new Database(DB_PATH);
  
  try {
    const jobId = `job_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const scheduled = scheduledAt || new Date();
    
    const stmt = db.prepare(`
      INSERT INTO spotify_refresh_jobs 
      (id, user_id, priority, time_range, scheduled_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(jobId, userId, priority, timeRange, scheduled.toISOString());
    
    const job = db.prepare('SELECT * FROM spotify_refresh_jobs WHERE id = ?')
      .get(jobId) as SpotifyRefreshJob;
      
    return job;
  } finally {
    db.close();
  }
}

export function getPendingJobs(limit: number = 50): SpotifyRefreshJob[] {
  const db = new Database(DB_PATH);
  
  try {
    const stmt = db.prepare(`
      SELECT * FROM spotify_refresh_jobs 
      WHERE status = 'pending' 
        AND scheduled_at <= datetime('now')
        AND retry_count < max_retries
      ORDER BY 
        CASE priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
        END,
        scheduled_at ASC
      LIMIT ?
    `);
    
    return stmt.all(limit) as SpotifyRefreshJob[];
  } finally {
    db.close();
  }
}

export function updateJobStatus(
  jobId: string,
  status: SpotifyRefreshJob['status'],
  errorMessage?: string
): boolean {
  const db = new Database(DB_PATH);
  
  try {
    let query = `UPDATE spotify_refresh_jobs SET status = ?`;
    const params: any[] = [status];
    
    if (status === 'running') {
      query += `, started_at = datetime('now')`;
    } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      query += `, completed_at = datetime('now')`;
    }
    
    if (status === 'failed') {
      query += `, retry_count = retry_count + 1`;
      if (errorMessage) {
        query += `, error_message = ?`;
        params.push(errorMessage);
      }
    }
    
    query += ` WHERE id = ?`;
    params.push(jobId);
    
    const result = db.prepare(query).run(...params);
    return result.changes > 0;
  } finally {
    db.close();
  }
}

export function logRefreshAttempt(logData: Omit<SpotifyRefreshLog, 'id' | 'created_at'>): string {
  const db = new Database(DB_PATH);
  
  try {
    const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const stmt = db.prepare(`
      INSERT INTO spotify_refresh_logs 
      (id, user_id, job_id, status, cached, tracks_analyzed, artists_analyzed, 
       recent_tracks_analyzed, time_range, duration_ms, error_message, spotify_rate_limit_hit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      logId,
      logData.user_id,
      logData.job_id,
      logData.status,
      logData.cached,
      logData.tracks_analyzed,
      logData.artists_analyzed,
      logData.recent_tracks_analyzed,
      logData.time_range,
      logData.duration_ms,
      logData.error_message,
      logData.spotify_rate_limit_hit
    );
    
    return logId;
  } finally {
    db.close();
  }
}

// Monitoring functions
export function getRefreshStats(hours: number = 24): {
  total_jobs: number;
  successful: number;
  failed: number;
  cached: number;
  avg_duration_ms: number;
  rate_limited: number;
} {
  const db = new Database(DB_PATH);
  
  try {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total_jobs,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN cached = 1 THEN 1 ELSE 0 END) as cached,
        AVG(duration_ms) as avg_duration_ms,
        SUM(CASE WHEN spotify_rate_limit_hit = 1 THEN 1 ELSE 0 END) as rate_limited
      FROM spotify_refresh_logs 
      WHERE created_at > datetime('now', '-${hours} hours')
    `);
    
    return stmt.get() as any;
  } finally {
    db.close();
  }
}