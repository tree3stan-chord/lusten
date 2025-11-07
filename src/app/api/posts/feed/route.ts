import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getPostsFeed, getFriendsPosts } from '@/lib/sqlite-db';
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
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const feedType = searchParams.get('type') || 'all'; // 'all' or 'friends'

    let posts;

    if (feedType === 'friends') {
      posts = getFriendsPosts(session.user.id, limit);
    } else {
      posts = getPostsFeed(session.user.id, limit, offset);
    }

    return NextResponse.json({
      success: true,
      posts,
      count: posts.length,
      hasMore: posts.length === limit
    });
  } catch (error) {
    console.error('Error fetching posts feed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
