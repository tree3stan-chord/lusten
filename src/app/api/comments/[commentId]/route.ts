import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import {
  updateComment,
  deleteComment,
  getComment
} from '../../../../lib/sqlite-db';
import { authOptions } from '../../../../lib/auth';
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

    const comment = getComment(commentId);

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      comment
    });
  } catch (error) {
    console.error('Error fetching comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const body = await request.json();
    const { content, mentions } = body;

    // Validation
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: 'Comment is too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    const comment = updateComment(commentId, session.user.id, content, mentions);

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      comment
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const success = deleteComment(commentId, session.user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Comment not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
