import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getFriends } from '@/lib/sqlite-db';
import { authOptions } from '@/lib/auth';
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
    
    const friends = getFriends(session.user.id);
    return NextResponse.json(friends);
  } catch (error) {
    console.error('Error fetching friends:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}