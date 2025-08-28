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
  serverTime?: number
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
  const [syncEvents, setSyncEvents] = useState<{
    seekTo?: { position: number; timestamp: number }
  }>({})

  useEffect(() => {
    if (!roomId || !userId) return

    const newSocket = io('/', {
      forceNew: true
    })

    setSocket(newSocket)

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id)
      setIsConnected(true)
      
      // Join room after connection
      newSocket.emit('join-room', { roomId, userId, isHost })
    })

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected')
      setIsConnected(false)
    })

    newSocket.on('room-state', (state: RoomState) => {
      console.log('Room state received:', state)
      setRoomState(state)
    })

    newSocket.on('track-changed', (track: RoomState['currentTrack']) => {
      console.log('Track changed received:', track)
      setRoomState(prev => prev ? { ...prev, currentTrack: track } : null)
    })

    newSocket.on('playback-updated', ({ isPlaying, position, timestamp, serverTime }) => {
      console.log('Playback updated:', { isPlaying, position })
      setRoomState(prev => prev ? { 
        ...prev, 
        isPlaying, 
        position, 
        lastUpdate: timestamp,
        serverTime 
      } : null)
    })

    newSocket.on('seek-to-position', ({ position, timestamp, serverTime }) => {
      console.log('Seek to position:', position)
      setSyncEvents({ seekTo: { position, timestamp } })
      setRoomState(prev => prev ? { 
        ...prev, 
        position, 
        lastUpdate: timestamp,
        serverTime 
      } : null)
    })

    newSocket.on('chat-message', (message: ChatMessage) => {
      console.log('Chat message received:', message)
      setChatMessages(prev => [...prev, message])
    })

    newSocket.on('user-joined', ({ userId: joinedUserId, userCount }) => {
      console.log(`User ${joinedUserId} joined. Total users: ${userCount}`)
      setRoomState(prev => prev ? { 
        ...prev, 
        users: [...prev.users.filter(u => u !== joinedUserId), joinedUserId]
      } : null)
    })

    newSocket.on('user-left', ({ userId: leftUserId, userCount }) => {
      console.log(`User ${leftUserId} left. Total users: ${userCount}`)
      setRoomState(prev => prev ? { 
        ...prev, 
        users: prev.users.filter(u => u !== leftUserId)
      } : null)
    })

    newSocket.on('room-closed', (reason: string) => {
      console.log('Room closed:', reason)
      setRoomState(null)
    })

    newSocket.on('error', (error: string) => {
      console.error('Socket error:', error)
    })

    // Cleanup function
    return () => {
      console.log('Cleaning up socket connection')
      newSocket.emit('leave-room', { roomId, userId })
      newSocket.disconnect()
    }
  }, [roomId, userId, isHost])

  const emitTrackChange = (track: RoomState['currentTrack']) => {
    if (socket && isHost) {
      console.log('Track changed:', track?.name)
      socket.emit('track-change', { roomId, track, userId })
    }
  }

  const emitPlaybackState = (isPlaying: boolean, position: number) => {
    if (socket && isHost) {
      console.log('Playback state changed:', { isPlaying, position })
      socket.emit('playback-state', { roomId, isPlaying, position, userId })
    }
  }

  const emitSeekPosition = (position: number) => {
    if (socket && isHost) {
      console.log('Seek position:', position)
      socket.emit('seek-position', { roomId, position, userId })
    }
  }

  const clearSyncEvents = () => {
    setSyncEvents({})
  }

  const sendChatMessage = (message: string, userName: string) => {
    if (socket) {
      socket.emit('chat-message', { roomId, message, userId, userName })
      
      // Add to local messages immediately for sender
      const chatMessage: ChatMessage = {
        message,
        userId,
        userName,
        timestamp: Date.now()
      }
      setChatMessages(prev => [...prev, chatMessage])
      console.log('Chat message sent:', message)
    }
  }

  return {
    socket,
    roomState,
    chatMessages,
    isConnected,
    syncEvents,
    emitTrackChange,
    emitPlaybackState,
    emitSeekPosition,
    sendChatMessage,
    clearSyncEvents
  }
}