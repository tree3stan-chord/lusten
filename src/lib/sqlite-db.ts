import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.join(process.cwd(), 'data', 'lusten.db')

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.dirname(DB_PATH)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Database migrations for schema updates
function runMigrations() {
  const db = new Database(DB_PATH)
  
  try {
    console.log('🔄 Checking for database migrations...')
    
    // Get current table structure
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>
    
    // Only run migrations if users table exists (existing database)
    if (tables.some(table => table.name === 'users')) {
      console.log('📊 Existing database detected, checking for schema updates...')
      
      // Check users table columns
      const columns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>
      const columnNames = columns.map(col => col.name)
      
      let migrationsRun = 0
      
      // Migration 1: Add custom avatar columns
      if (!columnNames.includes('custom_avatar_url')) {
        console.log('  ➕ Adding custom_avatar_url column...')
        db.prepare('ALTER TABLE users ADD COLUMN custom_avatar_url TEXT').run()
        migrationsRun++
      }
      
      if (!columnNames.includes('avatar_updated_at')) {
        console.log('  ➕ Adding avatar_updated_at column...')
        db.prepare('ALTER TABLE users ADD COLUMN avatar_updated_at TEXT').run()
        migrationsRun++
      }

      // Migration 2: Add genres column to rooms table
      const roomColumns = db.prepare("PRAGMA table_info(rooms)").all() as Array<{ name: string }>
      const roomColumnNames = roomColumns.map(col => col.name)

      if (!roomColumnNames.includes('genres')) {
        console.log('  ➕ Adding genres column to rooms table...')
        db.prepare('ALTER TABLE rooms ADD COLUMN genres TEXT').run()
        migrationsRun++

        // Auto-populate genres for existing rooms based on owner's top genres
        console.log('  🎵 Populating genres for existing rooms...')
        const rooms = db.prepare('SELECT id, owner_id FROM rooms WHERE owner_id IS NOT NULL').all() as Array<{ id: string, owner_id: string }>

        for (const room of rooms) {
          const stats = db.prepare('SELECT top_genres FROM user_spotify_stats WHERE user_id = ?').get(room.owner_id) as { top_genres: string } | undefined
          if (stats && stats.top_genres) {
            try {
              const topGenres = JSON.parse(stats.top_genres) as Array<{ name: string, count: number }>
              const genreNames = topGenres.slice(0, 3).map(g => g.name)
              db.prepare('UPDATE rooms SET genres = ? WHERE id = ?').run(JSON.stringify(genreNames), room.id)
            } catch (e) {
              // Skip rooms with invalid genre data
            }
          }
        }
      }

      // Future migrations go here...
      
      if (migrationsRun > 0) {
        console.log(`✅ Applied ${migrationsRun} database migrations successfully`)
      } else {
        console.log('✅ Database schema is up to date')
      }
    } else {
      console.log('🆕 New database detected, will create fresh schema')
    }
  } catch (error) {
    console.error('❌ Migration error:', error)
    // Don't throw - let app continue with existing schema
  } finally {
    db.close()
  }
}

// Initialize database with schema
function initializeDatabase() {
  ensureDataDir()
  const db = new Database(DB_PATH)
  
  // Enable foreign key constraints
  db.exec('PRAGMA foreign_keys = ON')
  
  // Run migrations before schema creation (for existing databases)
  runMigrations()
  
  // Create tables
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      spotify_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      avatar_url TEXT,
      custom_avatar_url TEXT,
      avatar_updated_at TEXT,
      profile_room_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Rooms table
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL CHECK (type IN ('private', 'public', 'profile')),
      owner_id TEXT REFERENCES users(spotify_id) ON DELETE SET NULL,
      max_users INTEGER DEFAULT 50,
      password TEXT,
      genres TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TEXT DEFAULT (datetime('now')),
      last_active TEXT DEFAULT (datetime('now'))
    );

    -- Friendships table
    CREATE TABLE IF NOT EXISTS friendships (
      id TEXT PRIMARY KEY,
      user1_id TEXT NOT NULL REFERENCES users(spotify_id) ON DELETE CASCADE,
      user2_id TEXT NOT NULL REFERENCES users(spotify_id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('pending', 'accepted')),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user1_id, user2_id),
      CHECK(user1_id != user2_id)
    );

    -- Room bans table (for kicked/banned users)
    CREATE TABLE IF NOT EXISTS room_bans (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(spotify_id) ON DELETE CASCADE,
      banned_by TEXT NOT NULL REFERENCES users(spotify_id) ON DELETE CASCADE,
      ban_type TEXT NOT NULL CHECK (ban_type IN ('kick', 'ban')) DEFAULT 'kick',
      reason TEXT,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(room_id, user_id)
    );

    -- User status table (for Discord-style activity tracking)
    CREATE TABLE IF NOT EXISTS user_status (
      user_id TEXT PRIMARY KEY REFERENCES users(spotify_id) ON DELETE CASCADE,
      is_online BOOLEAN DEFAULT FALSE,
      visibility TEXT NOT NULL DEFAULT 'online' CHECK (visibility IN ('online', 'idle', 'dnd', 'invisible')),
      last_active TEXT DEFAULT (datetime('now')),
      current_room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
      spotify_track_id TEXT,
      spotify_track_name TEXT,
      spotify_artist_name TEXT,
      spotify_album_name TEXT,
      spotify_is_playing BOOLEAN DEFAULT FALSE,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms(type);
    CREATE INDEX IF NOT EXISTS idx_rooms_owner ON rooms(owner_id);
    CREATE INDEX IF NOT EXISTS idx_rooms_last_active ON rooms(last_active);
    CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(is_active);
    CREATE INDEX IF NOT EXISTS idx_room_bans_room ON room_bans(room_id);
    CREATE INDEX IF NOT EXISTS idx_room_bans_user ON room_bans(user_id);
    CREATE INDEX IF NOT EXISTS idx_room_bans_expires ON room_bans(expires_at);
    CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON friendships(user1_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON friendships(user2_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
    CREATE INDEX IF NOT EXISTS idx_user_status_online ON user_status(is_online);
    CREATE INDEX IF NOT EXISTS idx_user_status_visibility ON user_status(visibility);
    CREATE INDEX IF NOT EXISTS idx_user_status_room ON user_status(current_room_id);
    CREATE INDEX IF NOT EXISTS idx_user_status_updated ON user_status(updated_at);

    -- User's custom Top 5 picks (songs, albums, artists)
    CREATE TABLE IF NOT EXISTS user_top_picks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(spotify_id) ON DELETE CASCADE,
      position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 5),
      type TEXT NOT NULL CHECK (type IN ('song', 'album', 'artist')),
      spotify_id TEXT NOT NULL,
      spotify_data TEXT NOT NULL, -- JSON string with name, images, artist info, etc.
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, position)
    );

    -- Cached Spotify stats for automated Top 3s display
    CREATE TABLE IF NOT EXISTS user_spotify_stats (
      user_id TEXT PRIMARY KEY REFERENCES users(spotify_id) ON DELETE CASCADE,
      top_artists TEXT, -- JSON array of top 3 artists with images, genres
      top_albums TEXT,  -- JSON array of top 3 albums with images, artists  
      top_genres TEXT,  -- JSON array of top 3 genres with counts
      last_updated TEXT DEFAULT (datetime('now'))
    );

    -- Additional indexes for social features
    CREATE INDEX IF NOT EXISTS idx_user_top_picks_user ON user_top_picks(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_top_picks_position ON user_top_picks(user_id, position);

    -- Room play history (for real-time genre detection and analytics)
    CREATE TABLE IF NOT EXISTS room_play_history (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      track_id TEXT NOT NULL,
      track_name TEXT NOT NULL,
      artist_ids TEXT NOT NULL,
      artist_names TEXT NOT NULL,
      detected_genres TEXT,
      played_at TEXT DEFAULT (datetime('now')),
      played_by TEXT REFERENCES users(spotify_id) ON DELETE SET NULL
    );

    -- Indexes for play history queries
    CREATE INDEX IF NOT EXISTS idx_room_history_room ON room_play_history(room_id);
    CREATE INDEX IF NOT EXISTS idx_room_history_played_at ON room_play_history(played_at);
    CREATE INDEX IF NOT EXISTS idx_room_history_room_time ON room_play_history(room_id, played_at DESC);
  `)

  return db
}

// Get database connection
function getDb() {
  return initializeDatabase()
}

// Database schema types
export interface User {
  spotify_id: string
  name: string
  avatar_url: string | null
  profile_room_id: string | null
  created_at: string
}

export interface Room {
  id: string
  name: string
  description: string | null
  type: 'private' | 'public' | 'profile'
  owner_id: string | null
  max_users: number
  password: string | null
  genres: string | null
  is_active: boolean
  created_at: string
  last_active: string
}

export interface Friendship {
  id: string
  user1_id: string
  user2_id: string
  status: 'pending' | 'accepted'
  created_at: string
}

export interface UserStatus {
  user_id: string
  is_online: boolean
  visibility: 'online' | 'idle' | 'dnd' | 'invisible'
  last_active: string
  current_room_id: string | null
  spotify_track_id: string | null
  spotify_track_name: string | null
  spotify_artist_name: string | null
  spotify_album_name: string | null
  spotify_is_playing: boolean
  updated_at: string
}

export interface UserWithStatus extends User {
  status?: UserStatus
}

export interface RoomBan {
  id: string
  room_id: string
  user_id: string
  banned_by: string
  ban_type: 'kick' | 'ban'
  reason: string | null
  expires_at: string | null
  created_at: string
}

// Social features interfaces
export interface UserTopPick {
  id: string
  user_id: string
  position: number
  type: 'song' | 'album' | 'artist'
  spotify_id: string
  spotify_data: string // JSON string
  created_at: string
  updated_at: string
}

export interface ParsedTopPick extends Omit<UserTopPick, 'spotify_data'> {
  spotify_data: {
    name: string
    artist?: string // For songs and albums
    artists?: string[] // For albums with multiple artists
    images: Array<{ url: string; width: number; height: number }>
    external_urls?: { spotify: string }
    release_date?: string // For albums
    duration_ms?: number // For songs
    genres?: string[] // For artists
  }
}

export interface UserSpotifyStats {
  user_id: string
  top_artists: string // JSON string
  top_albums: string // JSON string  
  top_genres: string // JSON string
  last_updated: string
}

export interface ParsedSpotifyStats extends Omit<UserSpotifyStats, 'top_artists' | 'top_albums' | 'top_genres'> {
  top_artists: Array<{
    id: string
    name: string
    images: Array<{ url: string; width: number; height: number }>
    genres: string[]
    popularity: number
  }>
  top_albums: Array<{
    id: string
    name: string
    artist: string
    images: Array<{ url: string; width: number; height: number }>
    release_date: string
  }>
  top_genres: Array<{
    name: string
    count: number
  }>
}

// User operations
export function createUser(userData: Omit<User, 'created_at'>): User {
  const db = getDb()
  
  // Check if user already exists
  const existingUser = db.prepare('SELECT * FROM users WHERE spotify_id = ?').get(userData.spotify_id) as User | undefined
  if (existingUser) {
    db.close()
    return existingUser
  }

  const stmt = db.prepare(`
    INSERT INTO users (spotify_id, name, avatar_url, profile_room_id)
    VALUES (?, ?, ?, ?)
  `)
  
  stmt.run(userData.spotify_id, userData.name, userData.avatar_url, userData.profile_room_id)
  
  const user = db.prepare('SELECT * FROM users WHERE spotify_id = ?').get(userData.spotify_id) as User
  db.close()
  return user
}

export function getUserById(spotify_id: string): User | null {
  const db = getDb()
  const user = db.prepare('SELECT * FROM users WHERE spotify_id = ?').get(spotify_id) as User | undefined
  db.close()
  return user || null
}

export function updateUser(spotify_id: string, updates: Partial<User>): User | null {
  const db = getDb()
  
  const setClause = Object.keys(updates)
    .filter(key => key !== 'spotify_id' && key !== 'created_at')
    .map(key => `${key} = ?`)
    .join(', ')
  
  if (setClause) {
    const values = Object.keys(updates)
      .filter(key => key !== 'spotify_id' && key !== 'created_at')
      .map(key => updates[key as keyof typeof updates])
    
    const stmt = db.prepare(`UPDATE users SET ${setClause} WHERE spotify_id = ?`)
    stmt.run(...values, spotify_id)
  }
  
  const user = db.prepare('SELECT * FROM users WHERE spotify_id = ?').get(spotify_id) as User | undefined
  db.close()
  return user || null
}

// Room operations
export function createRoom(roomData: Omit<Room, 'created_at' | 'last_active'>): Room {
  const db = getDb()

  const stmt = db.prepare(`
    INSERT INTO rooms (id, name, description, type, owner_id, max_users, password, genres, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    roomData.id,
    roomData.name,
    roomData.description,
    roomData.type,
    roomData.owner_id,
    roomData.max_users,
    roomData.password,
    roomData.genres,
    roomData.is_active
  )

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomData.id) as Room
  db.close()
  return room
}

export function getRoomById(id: string): Room | null {
  const db = getDb()
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as Room | undefined
  db.close()
  return room || null
}

export function updateRoom(id: string, updates: Partial<Room>): Room | null {
  const db = getDb()
  
  const setClause = Object.keys(updates)
    .filter(key => key !== 'id' && key !== 'created_at')
    .map(key => `${key} = ?`)
    .join(', ')
  
  if (setClause) {
    const values = Object.keys(updates)
      .filter(key => key !== 'id' && key !== 'created_at')
      .map(key => updates[key as keyof typeof updates])
    
    const stmt = db.prepare(`UPDATE rooms SET ${setClause}, last_active = datetime('now') WHERE id = ?`)
    stmt.run(...values, id)
  } else {
    // Just update last_active
    db.prepare('UPDATE rooms SET last_active = datetime(\'now\') WHERE id = ?').run(id)
  }
  
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as Room | undefined
  db.close()
  return room || null
}

export function deleteRoom(id: string): boolean {
  const db = getDb()
  const result = db.prepare('DELETE FROM rooms WHERE id = ?').run(id)
  db.close()
  return result.changes > 0
}

export function getPublicRooms(): Room[] {
  const db = getDb()
  const rooms = db.prepare('SELECT * FROM rooms WHERE type IN (\'public\', \'profile\') ORDER BY last_active DESC').all() as Room[]
  db.close()
  return rooms
}

export function getUserProfileRoom(spotify_id: string): Room | null {
  const db = getDb()
  const room = db.prepare('SELECT * FROM rooms WHERE type = \'profile\' AND owner_id = ?').get(spotify_id) as Room | undefined
  db.close()
  return room || null
}

// Profile room management
export function createOrUpdateProfileRoom(userId: string, roomName: string): Room {
  const db = getDb()

  // Delete existing profile room if any
  db.prepare('DELETE FROM rooms WHERE type = \'profile\' AND owner_id = ?').run(userId)

  // Generate room ID
  const roomId = Math.random().toString(36).substring(2, 15)

  // Get user's top genres for the room
  let genres: string | null = null
  const stats = db.prepare('SELECT top_genres FROM user_spotify_stats WHERE user_id = ?').get(userId) as { top_genres: string } | undefined
  if (stats && stats.top_genres) {
    try {
      const topGenres = JSON.parse(stats.top_genres) as Array<{ name: string, count: number }>
      const genreNames = topGenres.slice(0, 3).map(g => g.name)
      genres = JSON.stringify(genreNames)
    } catch (e) {
      // If parsing fails, leave genres as null
    }
  }

  // Create new profile room
  const stmt = db.prepare(`
    INSERT INTO rooms (id, name, description, type, owner_id, max_users, password, genres, is_active)
    VALUES (?, ?, NULL, 'profile', ?, 50, NULL, ?, TRUE)
  `)

  stmt.run(roomId, roomName, userId, genres)

  // Update user's profile_room_id
  db.prepare('UPDATE users SET profile_room_id = ? WHERE spotify_id = ?').run(roomId, userId)

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as Room
  db.close()
  return room
}

// Friendship operations
export function sendFriendRequest(fromUserId: string, toUserId: string): Friendship | null {
  if (fromUserId === toUserId) return null
  
  const db = getDb()
  
  // Check if friendship already exists
  const existingFriendship = db.prepare(`
    SELECT * FROM friendships 
    WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
  `).get(fromUserId, toUserId, toUserId, fromUserId) as Friendship | undefined
  
  if (existingFriendship) {
    db.close()
    return null
  }
  
  // Check if both users exist
  const fromUser = db.prepare('SELECT spotify_id FROM users WHERE spotify_id = ?').get(fromUserId)
  const toUser = db.prepare('SELECT spotify_id FROM users WHERE spotify_id = ?').get(toUserId)
  
  if (!fromUser || !toUser) {
    db.close()
    return null
  }
  
  const friendshipId = Math.random().toString(36).substring(2, 15)
  
  const stmt = db.prepare(`
    INSERT INTO friendships (id, user1_id, user2_id, status)
    VALUES (?, ?, ?, 'pending')
  `)
  
  stmt.run(friendshipId, fromUserId, toUserId)
  
  const friendship = db.prepare('SELECT * FROM friendships WHERE id = ?').get(friendshipId) as Friendship
  db.close()
  return friendship
}

export function acceptFriendRequest(friendshipId: string): Friendship | null {
  const db = getDb()
  
  const stmt = db.prepare('UPDATE friendships SET status = \'accepted\' WHERE id = ?')
  const result = stmt.run(friendshipId)
  
  if (result.changes === 0) {
    db.close()
    return null
  }
  
  const friendship = db.prepare('SELECT * FROM friendships WHERE id = ?').get(friendshipId) as Friendship
  db.close()
  return friendship
}

export function getFriendships(userId: string): Friendship[] {
  const db = getDb()
  const friendships = db.prepare(`
    SELECT * FROM friendships 
    WHERE user1_id = ? OR user2_id = ?
    ORDER BY created_at DESC
  `).all(userId, userId) as Friendship[]
  db.close()
  return friendships
}

export function getFriends(userId: string): User[] {
  const db = getDb()
  
  const friendships = db.prepare(`
    SELECT * FROM friendships 
    WHERE (user1_id = ? OR user2_id = ?) AND status = 'accepted'
  `).all(userId, userId) as Friendship[]
  
  if (friendships.length === 0) {
    db.close()
    return []
  }
  
  const friendIds = friendships.map(f => 
    f.user1_id === userId ? f.user2_id : f.user1_id
  )
  
  const placeholders = friendIds.map(() => '?').join(',')
  const friends = db.prepare(`SELECT * FROM users WHERE spotify_id IN (${placeholders})`).all(...friendIds) as User[]
  
  db.close()
  return friends
}

export function getPendingFriendRequests(userId: string): { friendship: Friendship; user: User }[] {
  const db = getDb()
  
  const friendships = db.prepare(`
    SELECT * FROM friendships 
    WHERE user2_id = ? AND status = 'pending'
    ORDER BY created_at DESC
  `).all(userId) as Friendship[]
  
  if (friendships.length === 0) {
    db.close()
    return []
  }
  
  const userIds = friendships.map(f => f.user1_id)
  const placeholders = userIds.map(() => '?').join(',')
  const users = db.prepare(`SELECT * FROM users WHERE spotify_id IN (${placeholders})`).all(...userIds) as User[]
  
  const result = friendships.map(friendship => ({
    friendship,
    user: users.find(user => user.spotify_id === friendship.user1_id)!
  })).filter(item => item.user)
  
  db.close()
  return result
}

// Add decline and search functions
export function declineFriendRequest(friendshipId: string): boolean {
  const db = getDb()
  const result = db.prepare('DELETE FROM friendships WHERE id = ? AND status = \'pending\'').run(friendshipId)
  db.close()
  return result.changes > 0
}

export function searchUsers(query: string, currentUserId: string): User[] {
  const db = getDb()
  
  // Search by name or spotify_id, exclude current user and existing friends
  const users = db.prepare(`
    SELECT * FROM users 
    WHERE (name LIKE ? OR spotify_id LIKE ?) 
    AND spotify_id != ?
    AND spotify_id NOT IN (
      SELECT CASE 
        WHEN user1_id = ? THEN user2_id 
        ELSE user1_id 
      END 
      FROM friendships 
      WHERE (user1_id = ? OR user2_id = ?) 
      AND status IN ('pending', 'accepted')
    )
    LIMIT 10
  `).all(
    `%${query}%`, 
    `%${query}%`, 
    currentUserId,
    currentUserId, 
    currentUserId, 
    currentUserId
  ) as User[]
  
  db.close()
  return users
}

// User Status Management Functions

export function updateUserStatus(
  userId: string, 
  statusData: Partial<Omit<UserStatus, 'user_id'>>
): UserStatus | null {
  const db = getDb()
  
  const updateFields = []
  const updateValues = []
  
  // Build dynamic update query
  if (statusData.is_online !== undefined) {
    updateFields.push('is_online = ?')
    updateValues.push(statusData.is_online)
  }
  if (statusData.visibility !== undefined) {
    updateFields.push('visibility = ?')
    updateValues.push(statusData.visibility)
  }
  if (statusData.current_room_id !== undefined) {
    updateFields.push('current_room_id = ?')
    updateValues.push(statusData.current_room_id)
  }
  if (statusData.spotify_track_id !== undefined) {
    updateFields.push('spotify_track_id = ?')
    updateValues.push(statusData.spotify_track_id)
  }
  if (statusData.spotify_track_name !== undefined) {
    updateFields.push('spotify_track_name = ?')
    updateValues.push(statusData.spotify_track_name)
  }
  if (statusData.spotify_artist_name !== undefined) {
    updateFields.push('spotify_artist_name = ?')
    updateValues.push(statusData.spotify_artist_name)
  }
  if (statusData.spotify_album_name !== undefined) {
    updateFields.push('spotify_album_name = ?')
    updateValues.push(statusData.spotify_album_name)
  }
  if (statusData.spotify_is_playing !== undefined) {
    updateFields.push('spotify_is_playing = ?')
    updateValues.push(statusData.spotify_is_playing)
  }
  
  // Always update last_active and updated_at
  updateFields.push('last_active = datetime(\'now\')')
  updateFields.push('updated_at = datetime(\'now\')')
  
  updateValues.push(userId)
  
  // Insert or update status
  db.prepare(`
    INSERT INTO user_status (user_id, is_online, visibility, last_active, updated_at)
    VALUES (?, FALSE, 'online', datetime('now'), datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      ${updateFields.join(', ')}
  `).run(userId, ...updateValues)
  
  // Return updated status
  const status = db.prepare('SELECT * FROM user_status WHERE user_id = ?').get(userId) as UserStatus | undefined
  db.close()
  return status || null
}

export function getUserStatus(userId: string): UserStatus | null {
  const db = getDb()
  const status = db.prepare('SELECT * FROM user_status WHERE user_id = ?').get(userId) as UserStatus | undefined
  db.close()
  return status || null
}

export function setUserVisibility(userId: string, visibility: UserStatus['visibility']): boolean {
  const db = getDb()
  const result = db.prepare(`
    INSERT INTO user_status (user_id, visibility, is_online, last_active, updated_at)
    VALUES (?, ?, FALSE, datetime('now'), datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      visibility = ?, 
      updated_at = datetime('now')
  `).run(userId, visibility, visibility)
  
  db.close()
  return result.changes > 0
}

export function getActiveUsers(): UserWithStatus[] {
  const db = getDb()
  
  // Get users who are online and not invisible, with their status info
  const users = db.prepare(`
    SELECT 
      u.*,
      s.is_online,
      s.visibility,
      s.last_active,
      s.current_room_id,
      s.spotify_track_name,
      s.spotify_artist_name,
      s.spotify_album_name,
      s.spotify_is_playing,
      r.name as room_name
    FROM users u
    JOIN user_status s ON u.spotify_id = s.user_id
    LEFT JOIN rooms r ON s.current_room_id = r.id
    WHERE s.is_online = TRUE 
      AND s.visibility != 'invisible'
      AND s.last_active > datetime('now', '-15 minutes')
    ORDER BY 
      CASE WHEN s.current_room_id IS NOT NULL THEN 0 ELSE 1 END,
      CASE WHEN s.spotify_is_playing = TRUE THEN 0 ELSE 1 END,
      s.updated_at DESC
    LIMIT 20
  `).all() as Array<{
    spotify_id: string;
    name: string;
    avatar_url: string | null;
    profile_room_id: string | null;
    created_at: string;
    is_online: boolean;
    visibility: 'online' | 'idle' | 'dnd' | 'invisible';
    last_active: string;
    current_room_id: string | null;
    spotify_track_name: string | null;
    spotify_artist_name: string | null;
    spotify_album_name: string | null;
    spotify_is_playing: boolean;
    updated_at: string;
    room_name: string | null;
  }>
  
  db.close()
  
  // Transform to UserWithStatus format
  return users.map(row => ({
    spotify_id: row.spotify_id,
    name: row.name,
    avatar_url: row.avatar_url,
    profile_room_id: row.profile_room_id,
    created_at: row.created_at,
    status: {
      user_id: row.spotify_id,
      is_online: row.is_online,
      visibility: row.visibility,
      last_active: row.last_active,
      current_room_id: row.current_room_id,
      spotify_track_id: null,
      spotify_track_name: row.spotify_track_name,
      spotify_artist_name: row.spotify_artist_name,
      spotify_album_name: row.spotify_album_name,
      spotify_is_playing: row.spotify_is_playing,
      updated_at: row.updated_at,
    }
  }))
}

export function markUserOnline(userId: string): void {
  updateUserStatus(userId, { is_online: true })
}

export function markUserOffline(userId: string): void {
  updateUserStatus(userId, { is_online: false })
}

export function cleanupInactiveUsers(): number {
  const db = getDb()
  // Mark users as offline if they haven't been active for more than 5 minutes
  const result = db.prepare(`
    UPDATE user_status 
    SET is_online = FALSE, updated_at = datetime('now')
    WHERE is_online = TRUE 
      AND last_active < datetime('now', '-5 minutes')
  `).run()
  
  db.close()
  return result.changes
}

// Room Management Functions

export function getRoom(roomId: string): Room | null {
  const db = getDb()
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as Room | undefined
  db.close()
  return room || null
}

export function updateRoomDetails(
  roomId: string,
  updates: Partial<Omit<Room, 'id' | 'created_at'>>
): Room | null {
  const db = getDb()

  const updateFields = []
  const updateValues = []

  if (updates.name !== undefined) {
    updateFields.push('name = ?')
    updateValues.push(updates.name)
  }
  if (updates.description !== undefined) {
    updateFields.push('description = ?')
    updateValues.push(updates.description)
  }
  if (updates.type !== undefined) {
    updateFields.push('type = ?')
    updateValues.push(updates.type)
  }
  if (updates.max_users !== undefined) {
    updateFields.push('max_users = ?')
    updateValues.push(updates.max_users)
  }
  if (updates.password !== undefined) {
    updateFields.push('password = ?')
    updateValues.push(updates.password)
  }
  if (updates.genres !== undefined) {
    updateFields.push('genres = ?')
    updateValues.push(updates.genres)
  }
  if (updates.is_active !== undefined) {
    updateFields.push('is_active = ?')
    updateValues.push(updates.is_active)
  }

  if (updateFields.length === 0) {
    db.close()
    return null
  }

  updateFields.push('last_active = datetime(\'now\')')
  updateValues.push(roomId)

  const result = db.prepare(`
    UPDATE rooms
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `).run(...updateValues)

  if (result.changes > 0) {
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as Room | undefined
    db.close()
    return room || null
  }

  db.close()
  return null
}

export function deleteRoomPermanently(roomId: string, deletedBy: string): boolean {
  const db = getDb()
  
  try {
    db.exec('BEGIN TRANSACTION')
    
    // Mark room as inactive first
    db.prepare('UPDATE rooms SET is_active = FALSE WHERE id = ?').run(roomId)
    
    // Clear user status for users in this room
    db.prepare('UPDATE user_status SET current_room_id = NULL WHERE current_room_id = ?').run(roomId)
    
    // Add a record of who deleted the room (optional)
    // Could extend this with a room_history table if needed
    
    // Actually delete the room
    const result = db.prepare('DELETE FROM rooms WHERE id = ?').run(roomId)
    
    db.exec('COMMIT')
    db.close()
    return result.changes > 0
  } catch (error) {
    db.exec('ROLLBACK')
    db.close()
    throw error
  }
}

export function kickUserFromRoom(
  roomId: string, 
  userId: string, 
  kickedBy: string, 
  reason: string | null = null,
  banType: 'kick' | 'ban' = 'kick'
): boolean {
  const db = getDb()
  
  try {
    db.exec('BEGIN TRANSACTION')
    
    // Remove user from room in user_status
    db.prepare('UPDATE user_status SET current_room_id = NULL WHERE user_id = ? AND current_room_id = ?')
      .run(userId, roomId)
    
    // Add ban record
    const banId = Math.random().toString(36).substr(2, 15)
    db.prepare(`
      INSERT OR REPLACE INTO room_bans (id, room_id, user_id, banned_by, ban_type, reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(banId, roomId, userId, kickedBy, banType, reason)
    
    db.exec('COMMIT')
    db.close()
    return true
  } catch (error) {
    db.exec('ROLLBACK')
    db.close()
    console.error('Error kicking user:', error)
    return false
  }
}

export function isUserBannedFromRoom(roomId: string, userId: string): boolean {
  const db = getDb()
  
  const ban = db.prepare(`
    SELECT * FROM room_bans 
    WHERE room_id = ? AND user_id = ? 
    AND (expires_at IS NULL OR expires_at > datetime('now'))
  `).get(roomId, userId) as RoomBan | undefined
  
  db.close()
  return !!ban
}

export function unbanUserFromRoom(roomId: string, userId: string): boolean {
  const db = getDb()
  
  const result = db.prepare('DELETE FROM room_bans WHERE room_id = ? AND user_id = ?')
    .run(roomId, userId)
  
  db.close()
  return result.changes > 0
}

export function getRoomBans(roomId: string): Array<RoomBan & { user: User }> {
  const db = getDb()
  
  const bans = db.prepare(`
    SELECT rb.*, u.name, u.avatar_url, u.spotify_id
    FROM room_bans rb
    JOIN users u ON rb.user_id = u.spotify_id
    WHERE rb.room_id = ?
    AND (rb.expires_at IS NULL OR rb.expires_at > datetime('now'))
    ORDER BY rb.created_at DESC
  `).all(roomId) as Array<RoomBan & User>
  
  db.close()
  
  return bans.map(ban => ({
    id: ban.id,
    room_id: ban.room_id,
    user_id: ban.user_id,
    banned_by: ban.banned_by,
    ban_type: ban.ban_type,
    reason: ban.reason,
    expires_at: ban.expires_at,
    created_at: ban.created_at,
    user: {
      spotify_id: ban.spotify_id,
      name: ban.name,
      avatar_url: ban.avatar_url,
      profile_room_id: ban.profile_room_id,
      created_at: ban.created_at
    }
  }))
}

// ── Avatar Management Functions ──────────────────────────────────────────

export function updateUserAvatar(userId: string, avatarUrl: string): boolean {
  const db = getDb()
  
  const result = db.prepare(`
    UPDATE users 
    SET custom_avatar_url = ?, avatar_updated_at = datetime('now')
    WHERE spotify_id = ?
  `).run(avatarUrl, userId)
  
  db.close()
  return result.changes > 0
}

export function getUserAvatarInfo(userId: string): { custom_avatar_url: string | null; avatar_updated_at: string | null } | null {
  const db = getDb()
  
  const result = db.prepare(`
    SELECT custom_avatar_url, avatar_updated_at 
    FROM users 
    WHERE spotify_id = ?
  `).get(userId) as { custom_avatar_url: string | null; avatar_updated_at: string | null } | undefined
  
  db.close()
  return result || null
}

export function deleteUserAvatar(userId: string): boolean {
  const db = getDb()
  
  const result = db.prepare(`
    UPDATE users 
    SET custom_avatar_url = NULL, avatar_updated_at = NULL
    WHERE spotify_id = ?
  `).run(userId)
  
  db.close()
  return result.changes > 0
}

// ── Room Ownership Transfer ──────────────────────────────────────────────

export function transferRoomOwnership(roomId: string, newOwnerId: string): boolean {
  const db = getDb()
  
  const result = db.prepare('UPDATE rooms SET owner_id = ? WHERE id = ?')
    .run(newOwnerId, roomId)
  
  db.close()
  return result.changes > 0
}

// ── Social Features: Top 5 Management ────────────────────────────────────

export function getUserTopPicks(userId: string): ParsedTopPick[] {
  const db = getDb()
  
  const picks = db.prepare(`
    SELECT * FROM user_top_picks 
    WHERE user_id = ? 
    ORDER BY position ASC
  `).all(userId) as UserTopPick[]
  
  db.close()
  
  return picks.map(pick => ({
    ...pick,
    spotify_data: JSON.parse(pick.spotify_data)
  }))
}

export function setUserTopPick(
  userId: string,
  position: number,
  type: 'song' | 'album' | 'artist',
  spotifyId: string,
  spotifyData: ParsedTopPick['spotify_data']
): ParsedTopPick {
  const db = getDb()
  const id = Math.random().toString(36).substring(2, 15)
  
  // Use INSERT OR REPLACE to handle position conflicts
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO user_top_picks 
    (id, user_id, position, type, spotify_id, spotify_data, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `)
  
  stmt.run(id, userId, position, type, spotifyId, JSON.stringify(spotifyData))
  
  const result = db.prepare('SELECT * FROM user_top_picks WHERE id = ?')
    .get(id) as UserTopPick
  
  db.close()
  
  return {
    ...result,
    spotify_data: JSON.parse(result.spotify_data)
  }
}

export function deleteUserTopPick(userId: string, position: number): boolean {
  const db = getDb()
  
  const result = db.prepare(`
    DELETE FROM user_top_picks 
    WHERE user_id = ? AND position = ?
  `).run(userId, position)
  
  db.close()
  return result.changes > 0
}

export function reorderUserTopPicks(userId: string, newOrder: Array<{ id: string; position: number }>): boolean {
  const db = getDb()
  
  try {
    db.exec('BEGIN TRANSACTION')
    
    const stmt = db.prepare(`
      UPDATE user_top_picks 
      SET position = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `)
    
    for (const item of newOrder) {
      stmt.run(item.position, item.id, userId)
    }
    
    db.exec('COMMIT')
    db.close()
    return true
  } catch (error) {
    db.exec('ROLLBACK')
    db.close()
    console.error('Error reordering top picks:', error)
    return false
  }
}

// ── Social Features: Spotify Stats Management ───────────────────────────

export function getUserSpotifyStats(userId: string): ParsedSpotifyStats | null {
  const db = getDb()
  
  const stats = db.prepare(`
    SELECT * FROM user_spotify_stats 
    WHERE user_id = ?
  `).get(userId) as UserSpotifyStats | undefined
  
  db.close()
  
  if (!stats) return null
  
  return {
    user_id: stats.user_id,
    last_updated: stats.last_updated,
    top_artists: stats.top_artists ? JSON.parse(stats.top_artists) : [],
    top_albums: stats.top_albums ? JSON.parse(stats.top_albums) : [],
    top_genres: stats.top_genres ? JSON.parse(stats.top_genres) : []
  }
}

export function updateUserSpotifyStats(
  userId: string,
  stats: {
    top_artists: ParsedSpotifyStats['top_artists']
    top_albums: ParsedSpotifyStats['top_albums']
    top_genres: ParsedSpotifyStats['top_genres']
  }
): boolean {
  const db = getDb()

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO user_spotify_stats
    (user_id, top_artists, top_albums, top_genres, last_updated)
    VALUES (?, ?, ?, ?, datetime('now'))
  `)

  const result = stmt.run(
    userId,
    JSON.stringify(stats.top_artists),
    JSON.stringify(stats.top_albums),
    JSON.stringify(stats.top_genres)
  )

  db.close()
  return result.changes > 0
}

export function deleteUserSpotifyStats(userId: string): boolean {
  const db = getDb()

  const result = db.prepare(`
    DELETE FROM user_spotify_stats
    WHERE user_id = ?
  `).run(userId)

  db.close()
  return result.changes > 0
}

// ── Genre Discovery Functions ────────────────────────────────────────────

export interface RoomWithGenres extends Room {
  parsedGenres: string[]
}

export function getRoomsByGenre(genre: string): RoomWithGenres[] {
  const db = getDb()

  // Get all active public/profile rooms
  const rooms = db.prepare(`
    SELECT * FROM rooms
    WHERE type IN ('public', 'profile')
      AND is_active = TRUE
    ORDER BY last_active DESC
  `).all() as Room[]

  db.close()

  // Filter rooms that contain the genre in their genres JSON array
  return rooms
    .map(room => {
      if (!room.genres) return null

      try {
        const parsedGenres = JSON.parse(room.genres) as string[]
        // Case-insensitive genre matching
        if (parsedGenres.some(g => g.toLowerCase() === genre.toLowerCase())) {
          return { ...room, parsedGenres }
        }
      } catch (e) {
        // Skip rooms with invalid JSON
      }
      return null
    })
    .filter((room): room is RoomWithGenres => room !== null)
}

export function getPopularGenres(): Array<{ name: string; count: number }> {
  const db = getDb()

  // Get all genres from active rooms
  const rooms = db.prepare(`
    SELECT genres FROM rooms
    WHERE type IN ('public', 'profile')
      AND is_active = TRUE
      AND genres IS NOT NULL
  `).all() as Array<{ genres: string }>

  db.close()

  // Count genre occurrences
  const genreCounts = new Map<string, number>()

  for (const room of rooms) {
    try {
      const genres = JSON.parse(room.genres) as string[]
      for (const genre of genres) {
        const normalizedGenre = genre.trim()
        genreCounts.set(normalizedGenre, (genreCounts.get(normalizedGenre) || 0) + 1)
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }

  // Convert to array and sort by count
  return Array.from(genreCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
}

export function searchRoomsByGenres(genres: string[]): RoomWithGenres[] {
  const db = getDb()

  // Get all active public/profile rooms
  const rooms = db.prepare(`
    SELECT * FROM rooms
    WHERE type IN ('public', 'profile')
      AND is_active = TRUE
    ORDER BY last_active DESC
  `).all() as Room[]

  db.close()

  const lowerGenres = genres.map(g => g.toLowerCase())

  // Filter rooms that contain any of the specified genres
  return rooms
    .map(room => {
      if (!room.genres) return null

      try {
        const parsedGenres = JSON.parse(room.genres) as string[]
        const hasMatch = parsedGenres.some(g =>
          lowerGenres.includes(g.toLowerCase())
        )

        if (hasMatch) {
          return { ...room, parsedGenres }
        }
      } catch (e) {
        // Skip rooms with invalid JSON
      }
      return null
    })
    .filter((room): room is RoomWithGenres => room !== null)
}

// Get all public rooms with parsed genres
export function getPublicRoomsWithGenres(): RoomWithGenres[] {
  const db = getDb()

  const rooms = db.prepare(`
    SELECT * FROM rooms
    WHERE type IN ('public', 'profile')
      AND is_active = TRUE
    ORDER BY last_active DESC
  `).all() as Room[]

  db.close()

  return rooms.map(room => {
    let parsedGenres: string[] = []
    if (room.genres) {
      try {
        parsedGenres = JSON.parse(room.genres) as string[]
      } catch (e) {
        // Leave as empty array
      }
    }
    return { ...room, parsedGenres }
  })
}

// ── Social Features: Mutual Friends & Suggestions ───────────────────────

export function getMutualFriends(userId1: string, userId2: string): User[] {
  const db = getDb()

  // Get friends of both users
  const user1Friends = db.prepare(`
    SELECT CASE
      WHEN user1_id = ? THEN user2_id
      ELSE user1_id
    END as friend_id
    FROM friendships
    WHERE (user1_id = ? OR user2_id = ?)
      AND status = 'accepted'
  `).all(userId1, userId1, userId1) as Array<{ friend_id: string }>

  const user2Friends = db.prepare(`
    SELECT CASE
      WHEN user1_id = ? THEN user2_id
      ELSE user1_id
    END as friend_id
    FROM friendships
    WHERE (user1_id = ? OR user2_id = ?)
      AND status = 'accepted'
  `).all(userId2, userId2, userId2) as Array<{ friend_id: string }>

  // Find intersection
  const user1FriendIds = new Set(user1Friends.map(f => f.friend_id))
  const mutualFriendIds = user2Friends
    .map(f => f.friend_id)
    .filter(id => user1FriendIds.has(id))

  if (mutualFriendIds.length === 0) {
    db.close()
    return []
  }

  // Get user details for mutual friends
  const placeholders = mutualFriendIds.map(() => '?').join(',')
  const mutualFriends = db.prepare(`
    SELECT * FROM users WHERE spotify_id IN (${placeholders})
  `).all(...mutualFriendIds) as User[]

  db.close()
  return mutualFriends
}

export function getFriendSuggestions(userId: string, limit = 10): Array<User & { reason: string; score: number }> {
  const db = getDb()

  // Get user's current friends and pending requests
  const existingConnections = db.prepare(`
    SELECT CASE
      WHEN user1_id = ? THEN user2_id
      ELSE user1_id
    END as connected_id
    FROM friendships
    WHERE (user1_id = ? OR user2_id = ?)
  `).all(userId, userId, userId) as Array<{ connected_id: string }>

  const excludedIds = new Set([userId, ...existingConnections.map(c => c.connected_id)])

  // Get user's top genres for matching
  const userStats = db.prepare('SELECT top_genres FROM user_spotify_stats WHERE user_id = ?')
    .get(userId) as { top_genres: string } | undefined

  let userGenres: string[] = []
  if (userStats?.top_genres) {
    try {
      const parsed = JSON.parse(userStats.top_genres) as Array<{ name: string }>
      userGenres = parsed.map(g => g.name.toLowerCase())
    } catch (e) {
      // Invalid JSON
    }
  }

  // Get all users with genres
  const allUsersWithGenres = db.prepare(`
    SELECT u.*, s.top_genres
    FROM users u
    LEFT JOIN user_spotify_stats s ON u.spotify_id = s.user_id
    WHERE s.top_genres IS NOT NULL
  `).all() as Array<User & { top_genres: string }>

  db.close()

  // Score each user based on genre overlap
  const suggestions: Array<User & { reason: string; score: number }> = []

  for (const user of allUsersWithGenres) {
    if (excludedIds.has(user.spotify_id)) continue

    try {
      const theirGenres = JSON.parse(user.top_genres) as Array<{ name: string }>
      const theirGenreNames = theirGenres.map(g => g.name.toLowerCase())

      // Calculate genre overlap
      const overlap = userGenres.filter(g => theirGenreNames.includes(g))
      const score = overlap.length

      if (score > 0) {
        suggestions.push({
          ...user,
          top_genres: undefined as any, // Remove internal field
          reason: `Shares ${overlap.slice(0, 2).join(', ')} genres`,
          score
        })
      }
    } catch (e) {
      // Skip users with invalid genre data
    }
  }

  // Sort by score (descending) and return top N
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// ── Room Play History & Genre Analysis ──────────────────────────────────

export interface RoomPlayHistoryEntry {
  id: string
  room_id: string
  track_id: string
  track_name: string
  artist_ids: string // JSON array
  artist_names: string // JSON array
  detected_genres: string | null // JSON array
  played_at: string
  played_by: string | null
}

export interface ParsedPlayHistoryEntry extends Omit<RoomPlayHistoryEntry, 'artist_ids' | 'artist_names' | 'detected_genres'> {
  artist_ids: string[]
  artist_names: string[]
  detected_genres: string[]
}

export interface RoomGenreAnalysis {
  room_id: string
  current_genres: string[]
  suggested_genres: string[]
  genre_stats: Array<{ genre: string; count: number; percentage: number }>
  total_tracks: number
  confidence: 'high' | 'medium' | 'low'
  should_update: boolean
}

export function addToPlayHistory(
  roomId: string,
  trackId: string,
  trackName: string,
  artistIds: string[],
  artistNames: string[],
  detectedGenres: string[],
  playedBy: string | null
): RoomPlayHistoryEntry {
  const db = getDb()
  const id = Math.random().toString(36).substring(2, 15)

  const stmt = db.prepare(`
    INSERT INTO room_play_history
    (id, room_id, track_id, track_name, artist_ids, artist_names, detected_genres, played_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    roomId,
    trackId,
    trackName,
    JSON.stringify(artistIds),
    JSON.stringify(artistNames),
    JSON.stringify(detectedGenres),
    playedBy
  )

  const entry = db.prepare('SELECT * FROM room_play_history WHERE id = ?').get(id) as RoomPlayHistoryEntry

  db.close()
  return entry
}

export function getRecentPlayHistory(roomId: string, limit = 20): ParsedPlayHistoryEntry[] {
  const db = getDb()

  const entries = db.prepare(`
    SELECT * FROM room_play_history
    WHERE room_id = ?
    ORDER BY played_at DESC
    LIMIT ?
  `).all(roomId, limit) as RoomPlayHistoryEntry[]

  db.close()

  return entries.map(entry => ({
    ...entry,
    artist_ids: JSON.parse(entry.artist_ids),
    artist_names: JSON.parse(entry.artist_names),
    detected_genres: entry.detected_genres ? JSON.parse(entry.detected_genres) : []
  }))
}

export function analyzeRoomGenres(roomId: string): RoomGenreAnalysis {
  const db = getDb()

  // Get current room genres
  const room = db.prepare('SELECT genres FROM rooms WHERE id = ?').get(roomId) as { genres: string | null } | undefined
  const currentGenres: string[] = room?.genres ? JSON.parse(room.genres) : []

  // Get recent play history
  const entries = db.prepare(`
    SELECT * FROM room_play_history
    WHERE room_id = ?
    ORDER BY played_at DESC
    LIMIT 20
  `).all(roomId) as RoomPlayHistoryEntry[]

  db.close()

  if (entries.length === 0) {
    return {
      room_id: roomId,
      current_genres: currentGenres,
      suggested_genres: [],
      genre_stats: [],
      total_tracks: 0,
      confidence: 'low',
      should_update: false
    }
  }

  // Count genres across all entries
  const genreCounts = new Map<string, number>()

  entries.forEach(entry => {
    if (entry.detected_genres) {
      try {
        const genres = JSON.parse(entry.detected_genres) as string[]
        genres.forEach(genre => {
          genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1)
        })
      } catch (e) {
        // Skip invalid JSON
      }
    }
  })

  // Calculate statistics
  const totalTracks = entries.length
  const genreStats = Array.from(genreCounts.entries())
    .map(([genre, count]) => ({
      genre,
      count,
      percentage: Math.round((count / totalTracks) * 100)
    }))
    .sort((a, b) => b.count - a.count)

  // Suggest top 3 genres that appear in >30% of tracks
  const suggestedGenres = genreStats
    .filter(stat => stat.percentage >= 30)
    .slice(0, 3)
    .map(stat => stat.genre)

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'low'
  if (totalTracks >= 15 && suggestedGenres.length >= 2) {
    confidence = 'high'
  } else if (totalTracks >= 8 && suggestedGenres.length >= 1) {
    confidence = 'medium'
  }

  // Should update if suggested genres differ significantly from current
  const shouldUpdate =
    confidence === 'high' &&
    suggestedGenres.length > 0 &&
    !suggestedGenres.every(g => currentGenres.includes(g))

  return {
    room_id: roomId,
    current_genres: currentGenres,
    suggested_genres: suggestedGenres,
    genre_stats: genreStats,
    total_tracks: totalTracks,
    confidence,
    should_update
  }
}

export function autoUpdateRoomGenres(roomId: string): boolean {
  const analysis = analyzeRoomGenres(roomId)

  if (!analysis.should_update || analysis.suggested_genres.length === 0) {
    return false
  }

  const db = getDb()

  // Update room genres with suggested genres
  db.prepare('UPDATE rooms SET genres = ? WHERE id = ?')
    .run(JSON.stringify(analysis.suggested_genres), roomId)

  db.close()
  return true
}