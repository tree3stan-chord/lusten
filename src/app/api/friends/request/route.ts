import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { sendFriendRequest, getUser } from '../../../../lib/sqlite-db';
import { sendFriendRequestNotification } from '../../../../lib/notification-service';
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
    
    const { toUserId } = await request.json();
    
    if (!toUserId) {
      return NextResponse.json(
        { error: 'Missing toUserId' },
        { status: 400 }
      );
    }
    
    const friendship = sendFriendRequest(session.user.id, toUserId);

    if (!friendship) {
      return NextResponse.json(
        { error: 'Friend request already exists or invalid users' },
        { status: 400 }
      );
    }

    // Send notification to recipient
    try {
      const requesterUser = getUser(session.user.id);
      if (requesterUser) {
        await sendFriendRequestNotification(
          toUserId,
          session.user.id,
          requesterUser.name
        );
      }
    } catch (notifError) {
      console.error('Failed to send friend request notification:', notifError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ success: true, friendship });
  } catch (error) {
    console.error('Error sending friend request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}