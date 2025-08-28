'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface RoomState {
  hostId: string
  users: string[]
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

interface ChatMessage {
  message: string
  userId: string
  userName: string
  timestamp: number
}

export const useSocket = (roomId: string, userId: string, isHost: boolean) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const newSocket = io(process.env.NODE_ENV === 'production' 
      ? 'https://lusten.musicsian.com' 
      : 'http://localhost:3000', {
      path: '/api/socket'
    })

    newSocket.on('connect', () => {
      console.log('Connected to Socket.io server')
      setIsConnected(true)
      
      // Join the room
      newSocket.emit('join-room', { roomId, userId, isHost })
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from Socket.io server')
      setIsConnected(false)
    })

    newSocket.on('room-state', (state: RoomState) => {
      setRoomState(state)
    })

    newSocket.on('track-changed', (track) => {
      setRoomState(prev => prev ? { ...prev, currentTrack: track } : null)
    })

    newSocket.on('playback-updated', ({ isPlaying, position, timestamp }) => {
      setRoomState(prev => prev ? { 
        ...prev, 
        isPlaying, 
        position, 
        lastUpdate: timestamp 
      } : null)
    })

    newSocket.on('user-joined', ({ userId: joinedUserId, userCount }) => {
      setRoomState(prev => prev ? { 
        ...prev, 
        users: [...prev.users, joinedUserId] 
      } : null)
    })

    newSocket.on('user-left', ({ userId: leftUserId, userCount }) => {
      setRoomState(prev => prev ? { 
        ...prev, 
        users: prev.users.filter(id => id !== leftUserId) 
      } : null)
    })

    newSocket.on('chat-message', (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message])
    })

    newSocket.on('room-closed', (reason: string) => {
      console.log('Room closed:', reason)
      // Handle room closure (redirect to home, show message, etc.)
    })

    newSocket.on('error', (error: string) => {
      console.error('Socket error:', error)
    })

    setSocket(newSocket)

    return () => {
      newSocket.emit('leave-room', { roomId, userId })
      newSocket.disconnect()
    }
  }, [roomId, userId, isHost])

  const emitTrackChange = (track: any) => {
    if (socket && isHost) {
      socket.emit('track-change', { roomId, track, userId })
    }
  }

  const emitPlaybackState = (isPlaying: boolean, position: number) => {
    if (socket && isHost) {
      socket.emit('playback-state', { roomId, isPlaying, position, userId })
    }
  }

  const sendChatMessage = (message: string, userName: string) => {
    if (socket) {
      // Add to local messages immediately
      const chatMessage: ChatMessage = {
        message,
        userId,
        userName,
        timestamp: Date.now()
      }
      setChatMessages(prev => [...prev, chatMessage])
      
      // Send to others
      socket.emit('chat-message', { roomId, message, userId, userName })
    }
  }

  return {
    socket,
    roomState,
    chatMessages,
    isConnected,
    emitTrackChange,
    emitPlaybackState,
    sendChatMessage
  }
}