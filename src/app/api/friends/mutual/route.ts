import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getMutualFriends } from '../../../../lib/sqlite-db';
import { authOptions } from '../../../../lib/auth';
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

    const searchParams = request.nextUrl.searchParams;
    const otherUserId = searchParams.get('userId');

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    const mutualFriends = getMutualFriends(session.user.id, otherUserId);

    return NextResponse.json({
      success: true,
      mutualFriends,
      count: mutualFriends.length
    });
  } catch (error) {
    console.error('Error fetching mutual friends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mutual friends' },
      { status: 500 }
    );
  }
}
