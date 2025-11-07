import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getUserActivityFeed, getFriendsActivityFeed } from '@/lib/sqlite-db';
import { authOptions } from '@/lib/auth';
import type { Session } from 'next-auth';

export async function GET(
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const feedType = searchParams.get('type') || 'user'; // 'user' or 'friends'

    let activities;

    if (feedType === 'friends') {
      // Get feed of friend activities
      activities = getFriendsActivityFeed(userId, limit);
    } else {
      // Get user's own activity feed
      activities = getUserActivityFeed(userId, limit, offset);
    }

    return NextResponse.json({
      success: true,
      activities,
      count: activities.length
    });
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
