import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import {
  getCommentReplies,
  getCommentWithReplies
} from '../../../../../lib/sqlite-db';
import { authOptions } from '../../../../../lib/auth';
import type { Session } from 'next-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { commentId } = await params;
    const { searchParams } = new URL(request.url);
    const withNested = searchParams.get('nested') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    if (withNested) {
      const commentWithReplies = getCommentWithReplies(commentId);

      if (!commentWithReplies) {
        return NextResponse.json(
          { error: 'Comment not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        comment: commentWithReplies
      });
    } else {
      const replies = getCommentReplies(commentId, limit);

      return NextResponse.json({
        success: true,
        replies
      });
    }
  } catch (error) {
    console.error('Error fetching replies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
