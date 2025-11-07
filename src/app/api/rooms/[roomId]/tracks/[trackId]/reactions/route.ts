import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../../../lib/auth';
import type { Session } from 'next-auth';
import {
  addRoomTrackReaction,
  removeRoomTrackReaction,
  getRoomTrackReactionSummary,
  getRoomTrackReactionUsers,
  type RoomReactionType
} from '../../../../../../../lib/sqlite-db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; trackId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { roomId, trackId } = await params;
    const body = await request.json();
    const { reactionType, trackName, artistName } = body;

    // Validation
    const validReactions: RoomReactionType[] = ['love', 'fire', 'vibe', 'skip'];
    if (!reactionType || !validReactions.includes(reactionType)) {
      return NextResponse.json(
        { error: 'Invalid reaction type' },
        { status: 400 }
      );
    }

    if (!trackName || !artistName) {
      return NextResponse.json(
        { error: 'Track name and artist name are required' },
        { status: 400 }
      );
    }

    const reaction = addRoomTrackReaction(
      roomId,
      session.user.id,
      trackId,
      trackName,
      artistName,
      reactionType
    );

    // Get updated summary
    const summary = getRoomTrackReactionSummary(roomId, trackId, session.user.id);

    return NextResponse.json({
      success: true,
      reaction,
      summary
    });
  } catch (error) {
    console.error('Error adding track reaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; trackId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { roomId, trackId } = await params;

    const success = removeRoomTrackReaction(roomId, session.user.id, trackId);

    if (!success) {
      return NextResponse.json(
        { error: 'No reaction to remove' },
        { status: 404 }
      );
    }

    // Get updated summary
    const summary = getRoomTrackReactionSummary(roomId, trackId, session.user.id);

    return NextResponse.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error removing track reaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; trackId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { roomId, trackId } = await params;
    const { searchParams } = new URL(request.url);
    const reactionType = searchParams.get('type') as RoomReactionType | null;
    const limit = parseInt(searchParams.get('limit') || '50');

    const summary = getRoomTrackReactionSummary(roomId, trackId, session.user.id);
    const users = getRoomTrackReactionUsers(roomId, trackId, reactionType || undefined, limit);

    return NextResponse.json({
      success: true,
      summary,
      users
    });
  } catch (error) {
    console.error('Error fetching track reactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
