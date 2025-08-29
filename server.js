const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handler = app.getRequestHandler()

// Room state management
const rooms = new Map()

// Logging function to capture server events
const logToEndpoint = async (event, data, level = 'info') => {
  try {
    await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/server-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data, level })
    })
  } catch (e) {
    // Ignore fetch errors to prevent infinite loops
  }
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handler(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://lusten.musicsian.com'] 
        : ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    socket.on('get-public-rooms', () => {
      const publicRooms = []
      for (const [roomId, room] of rooms) {
        if (room.isPublic) {
          publicRooms.push({
            id: room.id,
            name: room.name,
            currentTrack: room.currentTrack?.name,
            currentArtist: room.currentTrack?.artists?.[0]?.name,
            listeners: room.users.size
          })
        }
      }
      socket.emit('public-rooms-list', publicRooms)
    })

    socket.on('create-room', ({ roomId, roomName, userId, isPublic }) => {
      console.log(`User ${userId} creating room ${roomId} (${isPublic ? 'public' : 'private'}): ${roomName}`)
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          id: roomId,
          name: roomName,
          hostId: userId,
          users: new Set([userId]),
          isPlaying: false,
          position: 0,
          lastUpdate: Date.now(),
          isPublic: isPublic,
          createdAt: Date.now()
        })
        
        socket.emit('room-created', { roomId, roomName })
        
        // Notify all clients about new public room
        if (isPublic) {
          socket.broadcast.emit('public-room-created', {
            id: roomId,
            name: roomName,
            listeners: 1
          })
        }
      } else {
        socket.emit('error', 'Room already exists')
      }
    })

    socket.on('join-room', ({ roomId, userId, isHost }) => {
      console.log(`User ${userId} joining room ${roomId} as ${isHost ? 'host' : 'listener'}`)
      logToEndpoint('user-join', { roomId, userId, isHost, socketId: socket.id })
      
      socket.join(roomId)
      console.log(`Socket ${socket.id} joined room ${roomId}`)

      if (!rooms.has(roomId)) {
        if (isHost) {
          rooms.set(roomId, {
            id: roomId,
            name: `Room ${roomId}`,
            hostId: userId,
            users: new Set([userId]),
            isPlaying: false,
            position: 0,
            lastUpdate: Date.now(),
            isPublic: false,
            createdAt: Date.now()
          })
        } else {
          socket.emit('error', 'Room does not exist')
          return
        }
      } else {
        const room = rooms.get(roomId)
        room.users.add(userId)
      }

      const room = rooms.get(roomId)
      const currentTime = Date.now()
      
      // Calculate current position accounting for playback time
      let currentPosition = room.position
      if (room.isPlaying && room.lastUpdate) {
        const timeDiff = (currentTime - room.lastUpdate) / 1000
        currentPosition = room.position + timeDiff
      }
      
      const roomState = {
        hostId: room.hostId,
        users: Array.from(room.users),
        currentTrack: room.currentTrack,
        isPlaying: room.isPlaying,
        position: currentPosition,
        lastUpdate: room.lastUpdate,
        serverTime: currentTime
      }
      
      console.log(`Sending room state to ${userId}:`, {
        hasTrack: !!roomState.currentTrack,
        trackName: roomState.currentTrack?.name,
        isPlaying: roomState.isPlaying,
        userCount: roomState.users.length
      })
      
      socket.emit('room-state', roomState)

      socket.to(roomId).emit('user-joined', { userId, userCount: room.users.size })
    })

    socket.on('leave-room', ({ roomId, userId }) => {
      console.log(`User ${userId} leaving room ${roomId}`)
      
      socket.leave(roomId)
      
      const room = rooms.get(roomId)
      if (room) {
        room.users.delete(userId)
        
        if (userId === room.hostId) {
          rooms.delete(roomId)
          io.to(roomId).emit('room-closed', 'Host left the room')
        } else {
          socket.to(roomId).emit('user-left', { userId, userCount: room.users.size })
        }
      }
    })

    socket.on('track-change', ({ roomId, track, userId }) => {
      console.log(`Track change from ${userId} in room ${roomId}:`, track.name)
      const room = rooms.get(roomId)
      
      logToEndpoint('track-change-attempt', {
        roomId,
        userId,
        trackName: track.name,
        roomExists: !!room,
        isHost: room ? userId === room.hostId : false,
        hostId: room?.hostId,
        userCount: room?.users.size
      })
      
      if (room && userId === room.hostId) {
        room.currentTrack = track
        room.lastUpdate = Date.now()
        console.log(`Broadcasting track change to ${room.users.size - 1} listeners:`, track.name)
        logToEndpoint('track-change-broadcast', {
          roomId,
          trackName: track.name,
          listenerCount: room.users.size - 1
        })
        socket.to(roomId).emit('track-changed', track)
      } else {
        const reason = !room ? 'room not found' : userId !== room.hostId ? 'not host' : 'unknown'
        console.log('Track change rejected:', reason)
        logToEndpoint('track-change-rejected', { roomId, userId, reason })
      }
    })

    socket.on('playback-state', ({ roomId, isPlaying, position, userId }) => {
      const room = rooms.get(roomId)
      if (room && userId === room.hostId) {
        const timestamp = Date.now()
        room.isPlaying = isPlaying
        room.position = position
        room.lastUpdate = timestamp
        
        socket.to(roomId).emit('playback-updated', { 
          isPlaying, 
          position, 
          timestamp,
          serverTime: timestamp
        })
      }
    })

    socket.on('seek-position', ({ roomId, position, userId }) => {
      const room = rooms.get(roomId)
      if (room && userId === room.hostId) {
        const timestamp = Date.now()
        room.position = position
        room.lastUpdate = timestamp
        
        socket.to(roomId).emit('seek-to-position', {
          position,
          timestamp,
          serverTime: timestamp
        })
      }
    })

    socket.on('chat-message', ({ roomId, message, userId, userName }) => {
      console.log(`Chat message from ${userName} (${userId}) in room ${roomId}: ${message}`)
      const room = rooms.get(roomId)
      if (room) {
        console.log(`Broadcasting chat to ${room.users.size - 1} other users in room ${roomId}`)
        socket.to(roomId).emit('chat-message', {
          message,
          userId,
          userName,
          timestamp: Date.now()
        })
      } else {
        console.log('Chat message rejected: room not found')
      }
    })

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)
    })
  })

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})