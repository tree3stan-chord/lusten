import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { searchUsers } from '@/lib/sqlite-db';
import { authOptions } from '@/lib/auth';
import type { Session } from 'next-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }
    
    const results = searchUsers(query, session.user.id);
    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}