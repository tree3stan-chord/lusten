import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { sendFriendRequest } from '../../../../lib/database';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
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
    
    const friendship = await sendFriendRequest(session.user.id, toUserId);
    
    if (!friendship) {
      return NextResponse.json(
        { error: 'Friend request already exists or invalid users' },
        { status: 400 }
      );
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