import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { unblockUser, isUserBlocked } from '@/lib/sqlite-db';
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

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      );
    }

    // Check if user is actually blocked
    if (!isUserBlocked(session.user.id, userId)) {
      return NextResponse.json(
        { error: 'User is not blocked' },
        { status: 400 }
      );
    }

    const success = unblockUser(session.user.id, userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to unblock user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error unblocking user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
