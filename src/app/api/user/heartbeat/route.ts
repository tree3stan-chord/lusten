import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { updateUserStatus, cleanupInactiveUsers } from '../../../../lib/sqlite-db';
import { authOptions } from '../../../../lib/auth';
import type { Session } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { 
      current_room_id, 
      spotify_data 
    } = await request.json();
    
    // Update user's online status and activity
    const statusUpdate: Record<string, string | boolean | null> = {
      is_online: true
    };
    
    // Update room status if provided
    if (current_room_id !== undefined) {
      statusUpdate.current_room_id = current_room_id;
    }
    
    // Update Spotify data if provided
    if (spotify_data) {
      statusUpdate.spotify_track_id = spotify_data.track_id || null;
      statusUpdate.spotify_track_name = spotify_data.track_name || null;
      statusUpdate.spotify_artist_name = spotify_data.artist_name || null;
      statusUpdate.spotify_album_name = spotify_data.album_name || null;
      statusUpdate.spotify_is_playing = spotify_data.is_playing || false;
    }
    
    const updatedStatus = updateUserStatus(session.user.id, statusUpdate);
    
    // Clean up inactive users (run occasionally)
    if (Math.random() < 0.1) { // 10% chance to run cleanup
      cleanupInactiveUsers();
    }
    
    return NextResponse.json({
      success: true,
      status: updatedStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating user heartbeat:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}