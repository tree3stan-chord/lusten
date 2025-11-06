/**
 * Security Manager for WebSocket and Room Protection
 * Prevents resource exhaustion, spam, and abuse
 */

class SecurityManager {
  constructor() {
    // Rate limiting maps
    this.roomCreationByUser = new Map(); // userId -> [timestamps]
    this.socketEventsBySocket = new Map(); // socketId -> { eventType -> [timestamps] }
    this.connectionsByIP = new Map(); // ip -> [socketIds]
    this.chatMessagesByUser = new Map(); // userId -> [timestamps]
    this.activeRoomsByUser = new Map(); // userId -> Set(roomIds)

    // Blocked IPs and users
    this.blockedIPs = new Set();
    this.blockedUsers = new Set();

    // Configuration
    this.limits = {
      // Room creation limits
      maxRoomsPerUser: 5, // Max active rooms per user
      roomCreationWindow: 60 * 1000, // 1 minute
      maxRoomCreationsPerWindow: 3, // Max 3 rooms per minute

      // Connection limits
      maxConnectionsPerIP: 10,

      // Event rate limits (events per minute)
      chatMessageLimit: 30, // 30 messages per minute
      trackChangeLimit: 120, // 120 track changes per minute (2 per second for skipping)
      playbackStateLimit: 60, // 60 playback state changes per minute
      genericEventLimit: 100, // Generic limit for other events

      // Room limits
      maxUsersPerRoom: 50,

      // Cleanup settings
      inactiveRoomTimeout: 30 * 60 * 1000, // 30 minutes of inactivity

      // Payload limits
      maxPayloadSize: 50 * 1024, // 50KB max payload
      maxMessageLength: 500, // 500 chars max chat message
      maxRoomNameLength: 100
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Check if IP is allowed to connect
   */
  canConnect(ip, socketId) {
    if (this.blockedIPs.has(ip)) {
      return { allowed: false, reason: 'IP blocked' };
    }

    if (!this.connectionsByIP.has(ip)) {
      this.connectionsByIP.set(ip, []);
    }

    const connections = this.connectionsByIP.get(ip);

    if (connections.length >= this.limits.maxConnectionsPerIP) {
      return { allowed: false, reason: 'Too many connections from this IP' };
    }

    connections.push(socketId);
    return { allowed: true };
  }

  /**
   * Remove connection tracking
   */
  removeConnection(ip, socketId) {
    if (this.connectionsByIP.has(ip)) {
      const connections = this.connectionsByIP.get(ip);
      const index = connections.indexOf(socketId);
      if (index > -1) {
        connections.splice(index, 1);
      }
      if (connections.length === 0) {
        this.connectionsByIP.delete(ip);
      }
    }
  }

  /**
   * Check if user can create a room
   */
  canCreateRoom(userId) {
    if (this.blockedUsers.has(userId)) {
      return { allowed: false, reason: 'User blocked' };
    }

    // Check active room count
    const activeRooms = this.activeRoomsByUser.get(userId) || new Set();
    if (activeRooms.size >= this.limits.maxRoomsPerUser) {
      return { allowed: false, reason: `Maximum ${this.limits.maxRoomsPerUser} active rooms per user` };
    }

    // Check rate limit
    const now = Date.now();
    if (!this.roomCreationByUser.has(userId)) {
      this.roomCreationByUser.set(userId, []);
    }

    const timestamps = this.roomCreationByUser.get(userId);
    const recentTimestamps = timestamps.filter(t => now - t < this.limits.roomCreationWindow);

    if (recentTimestamps.length >= this.limits.maxRoomCreationsPerWindow) {
      return {
        allowed: false,
        reason: `Rate limit: max ${this.limits.maxRoomCreationsPerWindow} rooms per minute`
      };
    }

    recentTimestamps.push(now);
    this.roomCreationByUser.set(userId, recentTimestamps);
    return { allowed: true };
  }

  /**
   * Track active room for user
   */
  addActiveRoom(userId, roomId) {
    if (!this.activeRoomsByUser.has(userId)) {
      this.activeRoomsByUser.set(userId, new Set());
    }
    this.activeRoomsByUser.get(userId).add(roomId);
  }

  /**
   * Remove active room for user
   */
  removeActiveRoom(userId, roomId) {
    if (this.activeRoomsByUser.has(userId)) {
      this.activeRoomsByUser.get(userId).delete(roomId);
      if (this.activeRoomsByUser.get(userId).size === 0) {
        this.activeRoomsByUser.delete(userId);
      }
    }
  }

  /**
   * Check if room can accept more users
   */
  canJoinRoom(roomUserCount) {
    if (roomUserCount >= this.limits.maxUsersPerRoom) {
      return { allowed: false, reason: `Room full (max ${this.limits.maxUsersPerRoom} users)` };
    }
    return { allowed: true };
  }

  /**
   * Rate limit socket events
   */
  canEmitEvent(socketId, eventType, userId = null) {
    if (userId && this.blockedUsers.has(userId)) {
      return { allowed: false, reason: 'User blocked' };
    }

    const now = Date.now();

    if (!this.socketEventsBySocket.has(socketId)) {
      this.socketEventsBySocket.set(socketId, {});
    }

    const socketEvents = this.socketEventsBySocket.get(socketId);

    if (!socketEvents[eventType]) {
      socketEvents[eventType] = [];
    }

    const timestamps = socketEvents[eventType];
    const recentTimestamps = timestamps.filter(t => now - t < 60000); // Last minute

    // Determine limit based on event type
    let limit;
    switch (eventType) {
      case 'chat-message':
        limit = this.limits.chatMessageLimit;
        break;
      case 'track-change':
        limit = this.limits.trackChangeLimit;
        break;
      case 'playback-state':
      case 'seek-position':
        limit = this.limits.playbackStateLimit;
        break;
      default:
        limit = this.limits.genericEventLimit;
    }

    if (recentTimestamps.length >= limit) {
      return { allowed: false, reason: `Rate limit exceeded for ${eventType}` };
    }

    recentTimestamps.push(now);
    socketEvents[eventType] = recentTimestamps;
    return { allowed: true };
  }

  /**
   * Clean up socket event tracking
   */
  cleanupSocket(socketId) {
    this.socketEventsBySocket.delete(socketId);
  }

  /**
   * Validate and sanitize input
   */
  validateInput(data, schema) {
    const errors = [];

    // Check payload size
    const payloadSize = JSON.stringify(data).length;
    if (payloadSize > this.limits.maxPayloadSize) {
      return { valid: false, errors: ['Payload too large'], sanitized: null };
    }

    if (schema.roomName !== undefined) {
      if (typeof data.roomName !== 'string') {
        errors.push('roomName must be a string');
      } else if (data.roomName.length > this.limits.maxRoomNameLength) {
        errors.push(`roomName too long (max ${this.limits.maxRoomNameLength} chars)`);
      }
    }

    if (schema.message !== undefined) {
      if (typeof data.message !== 'string') {
        errors.push('message must be a string');
      } else if (data.message.length > this.limits.maxMessageLength) {
        errors.push(`message too long (max ${this.limits.maxMessageLength} chars)`);
      }
    }

    if (schema.userId !== undefined && typeof data.userId !== 'string') {
      errors.push('userId must be a string');
    }

    if (schema.roomId !== undefined && typeof data.roomId !== 'string') {
      errors.push('roomId must be a string');
    }

    if (errors.length > 0) {
      return { valid: false, errors, sanitized: null };
    }

    // Sanitize strings (basic XSS prevention)
    const sanitized = { ...data };
    if (sanitized.roomName) {
      sanitized.roomName = this.sanitizeString(sanitized.roomName);
    }
    if (sanitized.message) {
      sanitized.message = this.sanitizeString(sanitized.message);
    }

    return { valid: true, errors: [], sanitized };
  }

  /**
   * Basic string sanitization
   */
  sanitizeString(str) {
    return str
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }

  /**
   * Check if room is inactive and should be cleaned up
   */
  shouldCleanupRoom(room) {
    // Don't cleanup persistent rooms (profile rooms)
    if (room.isPersistent) {
      return false;
    }

    // Cleanup if no users
    if (room.users.size === 0) {
      return true;
    }

    // Cleanup if inactive for too long
    const now = Date.now();
    const lastActivity = room.lastUpdate || room.createdAt;
    if (now - lastActivity > this.limits.inactiveRoomTimeout) {
      return true;
    }

    return false;
  }

  /**
   * Start periodic cleanup
   */
  startCleanupInterval() {
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Perform cleanup of old data
   */
  performCleanup() {
    const now = Date.now();

    // Cleanup old rate limit data
    for (const [userId, timestamps] of this.roomCreationByUser.entries()) {
      const recent = timestamps.filter(t => now - t < this.limits.roomCreationWindow);
      if (recent.length === 0) {
        this.roomCreationByUser.delete(userId);
      } else {
        this.roomCreationByUser.set(userId, recent);
      }
    }

    // Cleanup old socket event tracking
    for (const [socketId, events] of this.socketEventsBySocket.entries()) {
      for (const [eventType, timestamps] of Object.entries(events)) {
        const recent = timestamps.filter(t => now - t < 60000);
        if (recent.length === 0) {
          delete events[eventType];
        } else {
          events[eventType] = recent;
        }
      }
      if (Object.keys(events).length === 0) {
        this.socketEventsBySocket.delete(socketId);
      }
    }

    console.log('🧹 Security cleanup completed');
  }

  /**
   * Block IP address
   */
  blockIP(ip) {
    this.blockedIPs.add(ip);
    console.log(`🚫 Blocked IP: ${ip}`);
  }

  /**
   * Block user
   */
  blockUser(userId) {
    this.blockedUsers.add(userId);
    console.log(`🚫 Blocked user: ${userId}`);
  }

  /**
   * Get security stats
   */
  getStats() {
    return {
      blockedIPs: this.blockedIPs.size,
      blockedUsers: this.blockedUsers.size,
      activeConnections: Array.from(this.connectionsByIP.values()).reduce((sum, arr) => sum + arr.length, 0),
      trackedUsers: this.activeRoomsByUser.size,
      totalActiveRooms: Array.from(this.activeRoomsByUser.values()).reduce((sum, set) => sum + set.size, 0)
    };
  }

  /**
   * Cleanup on shutdown
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

module.exports = SecurityManager;
