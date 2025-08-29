import fs from 'fs/promises';
import path from 'path';

// Simple JSON database for development
// TODO: Replace with SQLite/PostgreSQL in production

interface User {
  spotify_id: string;
  name: string;
  avatar_url: string | null;
  profile_room_id: string | null;
  created_at: string;
}

interface Room {
  id: string;
  name: string;
  type: 'private' | 'public' | 'profile';
  owner_id: string | null;
  created_at: string;
  last_active: string;
}

interface Friendship {
  id: string;
  user1_id: string;
  user2_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
}

interface Database {
  users: User[];
  rooms: Room[];
  friendships: Friendship[];
}

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.dirname(DB_PATH);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Load database
async function loadDB(): Promise<Database> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    // Initialize empty database
    const emptyDB: Database = { users: [], rooms: [], friendships: [] };
    await saveDB(emptyDB);
    return emptyDB;
  }
}

// Save database
async function saveDB(db: Database): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

// User operations
export async function createUser(userData: Omit<User, 'created_at'>): Promise<User> {
  const db = await loadDB();
  
  // Check if user already exists
  const existingUser = db.users.find(u => u.spotify_id === userData.spotify_id);
  if (existingUser) {
    return existingUser;
  }
  
  const user: User = {
    ...userData,
    created_at: new Date().toISOString()
  };
  
  db.users.push(user);
  await saveDB(db);
  return user;
}

export async function getUserById(spotify_id: string): Promise<User | null> {
  const db = await loadDB();
  return db.users.find(u => u.spotify_id === spotify_id) || null;
}

export async function updateUser(spotify_id: string, updates: Partial<User>): Promise<User | null> {
  const db = await loadDB();
  const userIndex = db.users.findIndex(u => u.spotify_id === spotify_id);
  
  if (userIndex === -1) return null;
  
  db.users[userIndex] = { ...db.users[userIndex], ...updates };
  await saveDB(db);
  return db.users[userIndex];
}

// Room operations
export async function createRoom(roomData: Omit<Room, 'created_at' | 'last_active'>): Promise<Room> {
  const db = await loadDB();
  
  const room: Room = {
    ...roomData,
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString()
  };
  
  db.rooms.push(room);
  await saveDB(db);
  return room;
}

export async function getRoomById(id: string): Promise<Room | null> {
  const db = await loadDB();
  return db.rooms.find(r => r.id === id) || null;
}

export async function updateRoom(id: string, updates: Partial<Room>): Promise<Room | null> {
  const db = await loadDB();
  const roomIndex = db.rooms.findIndex(r => r.id === id);
  
  if (roomIndex === -1) return null;
  
  db.rooms[roomIndex] = { 
    ...db.rooms[roomIndex], 
    ...updates,
    last_active: new Date().toISOString()
  };
  await saveDB(db);
  return db.rooms[roomIndex];
}

export async function deleteRoom(id: string): Promise<boolean> {
  const db = await loadDB();
  const roomIndex = db.rooms.findIndex(r => r.id === id);
  
  if (roomIndex === -1) return false;
  
  db.rooms.splice(roomIndex, 1);
  await saveDB(db);
  return true;
}

export async function getPublicRooms(): Promise<Room[]> {
  const db = await loadDB();
  return db.rooms.filter(r => r.type === 'public' || r.type === 'profile');
}

export async function getUserProfileRoom(spotify_id: string): Promise<Room | null> {
  const db = await loadDB();
  return db.rooms.find(r => r.type === 'profile' && r.owner_id === spotify_id) || null;
}

// Profile room management
export async function createOrUpdateProfileRoom(userId: string, roomName: string): Promise<Room> {
  const db = await loadDB();
  
  // Delete existing profile room
  const existingRoomIndex = db.rooms.findIndex(r => r.type === 'profile' && r.owner_id === userId);
  let roomId: string;
  
  if (existingRoomIndex !== -1) {
    // Reuse existing room ID
    roomId = db.rooms[existingRoomIndex].id;
    db.rooms.splice(existingRoomIndex, 1);
  } else {
    // Generate new room ID
    roomId = Math.random().toString(36).substring(2, 15);
  }
  
  // Create new profile room
  const room: Room = {
    id: roomId,
    name: roomName,
    type: 'profile',
    owner_id: userId,
    created_at: new Date().toISOString(),
    last_active: new Date().toISOString()
  };
  
  db.rooms.push(room);
  
  // Update user's profile_room_id
  const userIndex = db.users.findIndex(u => u.spotify_id === userId);
  if (userIndex !== -1) {
    db.users[userIndex].profile_room_id = roomId;
  }
  
  await saveDB(db);
  return room;
}

// Friendship operations
export async function sendFriendRequest(fromUserId: string, toUserId: string): Promise<Friendship | null> {
  if (fromUserId === toUserId) return null;
  
  const db = await loadDB();
  
  // Check if friendship already exists
  const existingFriendship = db.friendships.find(f => 
    (f.user1_id === fromUserId && f.user2_id === toUserId) ||
    (f.user1_id === toUserId && f.user2_id === fromUserId)
  );
  
  if (existingFriendship) return null;
  
  // Check if both users exist
  const fromUser = db.users.find(u => u.spotify_id === fromUserId);
  const toUser = db.users.find(u => u.spotify_id === toUserId);
  
  if (!fromUser || !toUser) return null;
  
  const friendship: Friendship = {
    id: Math.random().toString(36).substring(2, 15),
    user1_id: fromUserId,
    user2_id: toUserId,
    status: 'pending',
    created_at: new Date().toISOString()
  };
  
  db.friendships.push(friendship);
  await saveDB(db);
  return friendship;
}

export async function acceptFriendRequest(friendshipId: string): Promise<Friendship | null> {
  const db = await loadDB();
  const friendshipIndex = db.friendships.findIndex(f => f.id === friendshipId);
  
  if (friendshipIndex === -1) return null;
  
  db.friendships[friendshipIndex].status = 'accepted';
  await saveDB(db);
  return db.friendships[friendshipIndex];
}

export async function getFriendships(userId: string): Promise<Friendship[]> {
  const db = await loadDB();
  return db.friendships.filter(f => 
    f.user1_id === userId || f.user2_id === userId
  );
}

export async function getFriends(userId: string): Promise<User[]> {
  const db = await loadDB();
  const friendships = db.friendships.filter(f => 
    (f.user1_id === userId || f.user2_id === userId) && f.status === 'accepted'
  );
  
  const friendIds = friendships.map(f => 
    f.user1_id === userId ? f.user2_id : f.user1_id
  );
  
  return db.users.filter(u => friendIds.includes(u.spotify_id));
}

export async function getPendingFriendRequests(userId: string): Promise<{ friendship: Friendship; user: User }[]> {
  const db = await loadDB();
  const pendingRequests = db.friendships.filter(f => 
    f.user2_id === userId && f.status === 'pending'
  );
  
  const result = [];
  for (const friendship of pendingRequests) {
    const user = db.users.find(u => u.spotify_id === friendship.user1_id);
    if (user) {
      result.push({ friendship, user });
    }
  }
  
  return result;
}