import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { acceptFriendRequest, getUserById } from '@/lib/sqlite-db';
import { sendFriendAcceptedNotification } from '@/lib/notification-service';
import { authOptions } from '@/lib/auth';
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
    
    const { friendshipId } = await request.json();
    
    if (!friendshipId) {
      return NextResponse.json(
        { error: 'Missing friendshipId' },
        { status: 400 }
      );
    }
    
    const friendship = acceptFriendRequest(friendshipId);

    if (!friendship) {
      return NextResponse.json(
        { error: 'Friend request not found' },
        { status: 404 }
      );
    }

    // Send notification to the original requester
    try {
      const accepterUser = getUserById(session.user.id);
      // Determine who the original requester was (the one who didn't accept)
      const requesterId = friendship.user1_id === session.user.id ? friendship.user2_id : friendship.user1_id;

      if (accepterUser) {
        await sendFriendAcceptedNotification(
          requesterId,
          session.user.id,
          accepterUser.name
        );
      }
    } catch (notifError) {
      console.error('Failed to send friend accepted notification:', notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ success: true, friendship });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}