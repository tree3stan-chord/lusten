import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getPendingFriendRequests } from '../../../../lib/sqlite-db';
import { authOptions } from '../../../../lib/auth';
import type { Session } from 'next-auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const pendingRequests = getPendingFriendRequests(session.user.id);
    return NextResponse.json(pendingRequests);
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}