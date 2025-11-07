import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import {
  addReaction,
  removeReaction,
  getReactionSummary,
  getReactionUsers,
  type ReactionType
} from '../../../../../lib/sqlite-db';
import { authOptions } from '../../../../../lib/auth';
import type { Session } from 'next-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { postId } = await params;
    const body = await request.json();
    const { reactionType } = body;

    // Validation
    const validReactions: ReactionType[] = ['like', 'love', 'fire', 'laugh', 'wow', 'sad'];
    if (!reactionType || !validReactions.includes(reactionType)) {
      return NextResponse.json(
        { error: 'Invalid reaction type' },
        { status: 400 }
      );
    }

    const reaction = addReaction(postId, session.user.id, reactionType);

    // Get updated summary
    const summary = getReactionSummary(postId, session.user.id);

    return NextResponse.json({
      success: true,
      reaction,
      summary
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { postId } = await params;

    const success = removeReaction(postId, session.user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'No reaction to remove' },
        { status: 404 }
      );
    }

    // Get updated summary
    const summary = getReactionSummary(postId, session.user.id);

    return NextResponse.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { postId } = await params;
    const { searchParams } = new URL(request.url);
    const reactionType = searchParams.get('type') as ReactionType | null;
    const limit = parseInt(searchParams.get('limit') || '50');

    const summary = getReactionSummary(postId, session.user.id);
    const users = getReactionUsers(postId, reactionType || undefined, limit);

    return NextResponse.json({
      success: true,
      summary,
      users
    });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
