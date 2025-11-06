# Lusten Security Documentation

## Overview

This document outlines the security measures implemented in Lusten to prevent resource exhaustion, spam, abuse, and other attacks on the websocket-based music listening platform.

## Security Protections

### 1. Connection Rate Limiting

**Protection:** Prevents single IP addresses from creating unlimited websocket connections.

**Implementation:**
- Maximum 10 concurrent connections per IP address
- Connection tracking in `SecurityManager`
- Automatic cleanup on disconnect

**Location:** `server.js` lines 57-71

```javascript
const connectionCheck = securityManager.canConnect(clientIP, socket.id);
if (!connectionCheck.allowed) {
  socket.disconnect(true);
  return;
}
```

### 2. Room Creation Rate Limiting

**Protection:** Prevents users from creating unlimited rooms (fork bomb scenario).

**Implementation:**
- Maximum 5 active rooms per user
- Maximum 3 room creations per minute
- Both socket-level and API-level enforcement

**Limits:**
- `maxRoomsPerUser: 5`
- `maxRoomCreationsPerWindow: 3` (per 60 seconds)

**Location:**
- Socket: `server.js` lines 143-170
- API: `src/app/api/rooms/create/route.ts` lines 9-26

### 3. Socket Event Rate Limiting

**Protection:** Prevents spam and abuse of socket events.

**Limits per minute:**
- Chat messages: 30 messages/minute
- Track changes: 120 changes/minute (allows skipping)
- Playback state: 60 changes/minute
- Generic events: 100/minute

**Location:** All socket event handlers use `securityManager.canEmitEvent()`

**Examples:**
- Chat: `server.js` line 495
- Track change: `server.js` line 349
- Playback: `server.js` line 459

### 4. Input Validation & Sanitization

**Protection:** Prevents XSS attacks, injection, and malformed data.

**Validation:**
- Room names: max 100 characters
- Chat messages: max 500 characters
- Payload size: max 50KB
- Type checking for all inputs

**Sanitization:**
- HTML entity encoding
- Script tag removal
- Trim whitespace

**Location:** `src/lib/security-manager.js` lines 219-278

### 5. Maximum Users Per Room

**Protection:** Prevents memory exhaustion from overpopulated rooms.

**Limit:** 50 users per room

**Location:** `server.js` lines 277-283

```javascript
const capacityCheck = securityManager.canJoinRoom(room.users.size);
if (!capacityCheck.allowed) {
  socket.emit('error', capacityCheck.reason);
  return;
}
```

### 6. Automatic Room Cleanup

**Protection:** Prevents memory leaks from abandoned rooms.

**Cleanup triggers:**
- Room with 0 users
- Room inactive for 30+ minutes (non-persistent rooms)
- Profile rooms are persistent and NOT cleaned up

**Frequency:** Every 10 minutes

**Location:** `server.js` lines 582-610

### 7. API Rate Limiting

**Protection:** Prevents API abuse and DOS attacks.

**Limits:**
- Room creation: 5 requests/minute
- General API: 100 requests/minute
- IP-based (unauthenticated): 50 requests/minute

**Implementation:** `src/lib/api-rate-limiter.ts`

**Response:** HTTP 429 with `Retry-After` header

### 8. Payload Size Limits

**Protection:** Prevents memory exhaustion from large payloads.

**Limits:**
- Maximum payload: 50KB
- Maximum message length: 500 characters
- Maximum room name: 100 characters

**Location:** `src/lib/security-manager.js` lines 219-225

### 9. Authentication Validation

**Protection:** Ensures only authenticated users can perform actions.

**Implementation:**
- Host verification for track changes, playback control
- User ID validation on all socket events
- Blocked user list

**Location:** All socket event handlers check `userId === room.hostId`

### 10. Security Monitoring & Logging

**Protection:** Enables detection and response to attacks.

**Logged events:**
- Connection blocks
- Rate limit violations
- Invalid input attempts
- Room cleanup stats
- Security statistics

**Stats tracked:**
- Blocked IPs/users
- Active connections
- Active rooms per user
- Total rooms

**Location:**
- Logs: Throughout `server.js` with `console.warn()` prefix `🚫`
- Stats: `server.js` lines 607-609

## Security Manager Configuration

All limits are configurable in `src/lib/security-manager.js`:

```javascript
this.limits = {
  maxRoomsPerUser: 5,
  roomCreationWindow: 60 * 1000,
  maxRoomCreationsPerWindow: 3,
  maxConnectionsPerIP: 10,
  chatMessageLimit: 30,
  trackChangeLimit: 120,
  playbackStateLimit: 60,
  genericEventLimit: 100,
  maxUsersPerRoom: 50,
  inactiveRoomTimeout: 30 * 60 * 1000,
  maxPayloadSize: 50 * 1024,
  maxMessageLength: 500,
  maxRoomNameLength: 100
}
```

## Blocking Malicious Actors

### Manual Blocking

```javascript
// Block an IP address
securityManager.blockIP('192.168.1.1');

// Block a user
securityManager.blockUser('userId123');
```

### Automatic Cleanup

The security manager automatically cleans up old rate limit data every 5 minutes to prevent memory leaks.

## Monitoring

### Check Security Stats

```javascript
const stats = securityManager.getStats();
console.log(stats);
// {
//   blockedIPs: 0,
//   blockedUsers: 0,
//   activeConnections: 12,
//   trackedUsers: 5,
//   totalActiveRooms: 8
// }
```

### Check API Rate Limiter Stats

```javascript
import rateLimiter from './src/lib/api-rate-limiter';
const stats = rateLimiter.getStats();
```

## Error Messages

Users receive clear error messages when limits are hit:

- **Connection limit:** "Too many connections from this IP"
- **Room creation:** "Maximum 5 active rooms per user"
- **Rate limit:** "Rate limit: max 3 rooms per minute"
- **Room full:** "Room full (max 50 users)"
- **Chat spam:** "You are sending messages too quickly. Please slow down."
- **API limit:** "Rate limit exceeded. Please try again in X seconds."

## Best Practices

1. **Monitor logs** for `🚫` warnings indicating potential attacks
2. **Review stats** periodically (logged every 10 minutes)
3. **Adjust limits** based on legitimate usage patterns
4. **Block persistent offenders** manually if needed
5. **Keep socket.io updated** for security patches

## Production Recommendations

1. **Add Redis** for distributed rate limiting across multiple servers
2. **Implement IP allowlist** for trusted partners
3. **Add CAPTCHA** for suspicious activity
4. **Enable logging** to external service (e.g., Datadog, Sentry)
5. **Set up alerts** for anomalous patterns
6. **Regular security audits** of limits and logs
7. **DDoS protection** at infrastructure level (Cloudflare, etc.)

## Testing Security

### Test Room Creation Limit

```javascript
// Create 6 rooms rapidly - 6th should fail
for (let i = 0; i < 6; i++) {
  socket.emit('create-room', { roomId: `test${i}`, roomName: 'Test', userId: 'testUser', roomType: 'public' });
}
```

### Test Chat Rate Limit

```javascript
// Send 35 messages rapidly - should hit limit
for (let i = 0; i < 35; i++) {
  socket.emit('chat-message', { roomId: 'test', message: `msg${i}`, userId: 'testUser', userName: 'Test' });
}
```

### Test Connection Limit

```javascript
// Open 11 connections from same IP - 11th should be blocked
for (let i = 0; i < 11; i++) {
  const socket = io();
}
```

## Emergency Response

### Under Attack?

1. **Identify the pattern** in logs (IP, userId, event type)
2. **Block the source:**
   ```javascript
   securityManager.blockIP('<attacker-ip>');
   securityManager.blockUser('<attacker-userId>');
   ```
3. **Lower limits temporarily** in `security-manager.js`
4. **Restart server** to apply new limits
5. **Enable additional logging** for forensics
6. **Contact infrastructure provider** for network-level blocking

## Changelog

### 2025-11-06 - Initial Security Implementation
- Added SecurityManager with comprehensive rate limiting
- Implemented connection, event, and room creation limits
- Added input validation and sanitization
- Implemented automatic room cleanup
- Added API rate limiting
- Created monitoring and logging system
- Added blocked IPs/users functionality

## Contributing

When adding new socket events or API endpoints:

1. ✅ **Always validate input** using `securityManager.validateInput()`
2. ✅ **Always rate limit** using `securityManager.canEmitEvent()`
3. ✅ **Always sanitize** user-provided strings
4. ✅ **Always verify authentication** before allowing actions
5. ✅ **Always log security events** with `console.warn()` and `🚫` prefix

## License

Security features are part of Lusten and follow the same license.
