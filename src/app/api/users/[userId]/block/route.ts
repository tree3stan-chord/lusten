import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { blockUser, isUserBlocked, getUserById } from '@/lib/sqlite-db';
import { authOptions } from '@/lib/auth';
import type { Session } from 'next-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { userId } = await params;
    const { reason } = await request.json().catch(() => ({ reason: undefined }));

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Prevent blocking yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot block yourself' },
        { status: 400 }
      );
    }

    // Check if user exists
    const userToBlock = getUserById(userId);
    if (!userToBlock) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if already blocked
    if (isUserBlocked(session.user.id, userId)) {
      return NextResponse.json(
        { error: 'User is already blocked' },
        { status: 400 }
      );
    }

    const block = blockUser(session.user.id, userId, reason);

    if (!block) {
      return NextResponse.json(
        { error: 'Failed to block user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, block });
  } catch (error) {
    console.error('Error blocking user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
