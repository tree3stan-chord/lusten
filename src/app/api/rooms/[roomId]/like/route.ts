import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import type { Session } from 'next-auth';
import {
  likeRoom,
  unlikeRoom,
  getRoomLikeSummary,
  getUserLikedRooms
} from '@/lib/sqlite-db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { roomId } = await params;

    const like = likeRoom(roomId, session.user.id);

    // Get updated summary
    const summary = getRoomLikeSummary(roomId, session.user.id);

    return NextResponse.json({
      success: true,
      like,
      summary
    });
  } catch (error: any) {
    // Handle unique constraint violation (already liked)
    if (error.message?.includes('UNIQUE constraint failed')) {
      const summary = getRoomLikeSummary((await params).roomId, session!.user!.id);
      return NextResponse.json({
        success: true,
        message: 'Already liked',
        summary
      });
    }

    console.error('Error liking room:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { roomId } = await params;

    const success = unlikeRoom(roomId, session.user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Room not liked' },
        { status: 404 }
      );
    }

    // Get updated summary
    const summary = getRoomLikeSummary(roomId, session.user.id);

    return NextResponse.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error unliking room:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { roomId } = await params;

    const summary = getRoomLikeSummary(roomId, session.user.id);

    return NextResponse.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error fetching room like summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
