# Room Components Integration Guide

This guide shows how to integrate the new room reaction and like components into room pages.

## Components

### 1. TrackReactionButton
Real-time reactions to tracks playing in rooms.

**Usage:**
```tsx
import TrackReactionButton from './components/TrackReactionButton'

// In your room page:
<TrackReactionButton
  roomId={roomId}
  trackId={currentTrack.id}
  trackName={currentTrack.name}
  artistName={currentTrack.artists.join(', ')}
  onReactionsUpdate={(summary) => {
    // Handle reaction updates
    console.log('Total reactions:', summary.total)
  }}
/>
```

**Features:**
- 4 reaction types: Love ❤️, Fire 🔥, Vibe ✨, Skip ⏭️
- Hover to show picker (if no reaction)
- Click to quick-react with "Love"
- Click again to change reaction
- Shows reaction counts and breakdown

### 2. RoomLikeButton
Favorite/like rooms for quick access.

**Usage:**
```tsx
import RoomLikeButton from './components/RoomLikeButton'

// In your room header:
<RoomLikeButton
  roomId={roomId}
  size="md"
  showCount={true}
/>
```

**Props:**
- `roomId`: Room identifier
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `showCount`: Show like count (default: true)
- `initialSummary`: Optional pre-fetched summary

**Features:**
- Heart icon (filled when liked)
- Like count display
- Animated feedback on click
- Responsive labels

### 3. TrackReactionsModal
Show who reacted to a track.

**Usage:**
```tsx
import TrackReactionsModal from './components/TrackReactionsModal'

const [showModal, setShowModal] = useState(false)

// Trigger modal:
<button onClick={() => setShowModal(true)}>
  View Reactions
</button>

// Render modal:
{showModal && (
  <TrackReactionsModal
    roomId={roomId}
    trackId={currentTrack.id}
    trackName={currentTrack.name}
    artistName={currentTrack.artists.join(', ')}
    onClose={() => setShowModal(false)}
  />
)}
```

**Features:**
- Filter by reaction type
- User list with avatars
- Real-time updates
- Mobile responsive

## Example Integration

Here's a complete example for a room's now-playing section:

```tsx
'use client'

import { useState } from 'react'
import TrackReactionButton from './components/TrackReactionButton'
import RoomLikeButton from './components/RoomLikeButton'
import TrackReactionsModal from './components/TrackReactionsModal'

export default function RoomPage({ roomId }: { roomId: string }) {
  const [showReactionsModal, setShowReactionsModal] = useState(false)
  const [currentTrack, setCurrentTrack] = useState({
    id: 'spotify-track-id',
    name: 'Track Name',
    artists: ['Artist Name']
  })

  return (
    <div className="room-container">
      {/* Room Header */}
      <div className="flex items-center justify-between mb-4">
        <h1>Room Name</h1>
        <RoomLikeButton roomId={roomId} />
      </div>

      {/* Now Playing Card */}
      <div className="now-playing-card">
        <img src={currentTrack.albumArt} alt="Album" />
        <h2>{currentTrack.name}</h2>
        <p>{currentTrack.artists.join(', ')}</p>

        {/* Reactions */}
        <div className="flex items-center gap-4 mt-4">
          <TrackReactionButton
            roomId={roomId}
            trackId={currentTrack.id}
            trackName={currentTrack.name}
            artistName={currentTrack.artists.join(', ')}
          />

          <button
            onClick={() => setShowReactionsModal(true)}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            View all reactions
          </button>
        </div>
      </div>

      {/* Reactions Modal */}
      {showReactionsModal && (
        <TrackReactionsModal
          roomId={roomId}
          trackId={currentTrack.id}
          trackName={currentTrack.name}
          artistName={currentTrack.artists.join(', ')}
          onClose={() => setShowReactionsModal(false)}
        />
      )}
    </div>
  )
}
```

## API Endpoints Used

These components automatically connect to:
- `POST/DELETE/GET /api/rooms/[roomId]/tracks/[trackId]/reactions`
- `POST/DELETE/GET /api/rooms/[roomId]/like`

No additional setup required!

## Next Steps

1. Add these components to your room pages
2. Test with real Spotify tracks
3. Consider adding Socket.IO events for real-time reaction broadcasts
4. Add reaction animations (floating emojis)

## Socket.IO Integration (Optional)

For real-time reactions across all users:

```tsx
// Server-side (Socket.IO handler):
socket.on('track-reaction', ({ roomId, userId, trackId, reactionType }) => {
  // Broadcast to all users in room
  io.to(roomId).emit('track-reaction-update', {
    userId,
    trackId,
    reactionType
  })
})

// Client-side:
useEffect(() => {
  socket.on('track-reaction-update', (data) => {
    // Trigger animation or refresh reactions
    console.log('New reaction:', data)
  })
}, [])
```
