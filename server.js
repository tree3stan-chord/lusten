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

    socket.on('join-room', ({ roomId, userId, isHost }) => {
      console.log(`User ${userId} joining room ${roomId} as ${isHost ? 'host' : 'listener'}`)
      
      socket.join(roomId)

      if (!rooms.has(roomId)) {
        if (isHost) {
          rooms.set(roomId, {
            hostId: userId,
            users: new Set([userId]),
            isPlaying: false,
            position: 0,
            lastUpdate: Date.now()
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
      
      socket.emit('room-state', {
        hostId: room.hostId,
        users: Array.from(room.users),
        currentTrack: room.currentTrack,
        isPlaying: room.isPlaying,
        position: currentPosition,
        lastUpdate: room.lastUpdate,
        serverTime: currentTime
      })

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
      const room = rooms.get(roomId)
      if (room && userId === room.hostId) {
        room.currentTrack = track
        room.lastUpdate = Date.now()
        socket.to(roomId).emit('track-changed', track)
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
      socket.to(roomId).emit('chat-message', {
        message,
        userId,
        userName,
        timestamp: Date.now()
      })
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