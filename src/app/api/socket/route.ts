import { NextRequest } from 'next/server'
import { Server as NetServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'

type NextApiResponseServerIO = {
  socket: {
    server: NetServer & {
      io?: SocketIOServer
    }
  }
}

interface RoomState {
  hostId: string
  users: Set<string>
  currentTrack?: {
    id: string
    name: string
    artists: Array<{ name: string }>
    album: {
      name: string
      images: Array<{ url: string }>
    }
    duration_ms: number
  }
  isPlaying: boolean
  position: number
  lastUpdate: number
}

const rooms = new Map<string, RoomState>()

export async function GET(req: NextRequest) {
  const res = new Response()
  const server = (res as any).socket?.server as NetServer

  if (!server) {
    return new Response('Server not available', { status: 500 })
  }

  if (!(server as any).io) {
    console.log('Setting up Socket.io server...')
    
    const io = new SocketIOServer(server, {
      path: '/api/socket',
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? ['https://lusten.musicsian.com'] 
          : ['http://localhost:3000'],
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
          const room = rooms.get(roomId)!
          room.users.add(userId)
        }

        const room = rooms.get(roomId)!
        
        socket.emit('room-state', {
          hostId: room.hostId,
          users: Array.from(room.users),
          currentTrack: room.currentTrack,
          isPlaying: room.isPlaying,
          position: room.position,
          lastUpdate: room.lastUpdate
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
          room.isPlaying = isPlaying
          room.position = position
          room.lastUpdate = Date.now()
          socket.to(roomId).emit('playback-updated', { isPlaying, position, timestamp: room.lastUpdate })
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

    ;(server as any).io = io
  }

  return new Response('Socket.io server initialized', { status: 200 })
}