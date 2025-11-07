import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getPost, updatePost, deletePost } from '@/lib/sqlite-db';
import { authOptions } from '@/lib/auth';
import type { Session } from 'next-auth';

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

    const post = getPost(postId);

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const { content, mediaUrls } = body;

    // Validation
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Post content is required' },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Post content too long (max 5000 characters)' },
        { status: 400 }
      );
    }

    const updatedPost = updatePost(postId, session.user.id, content.trim(), mediaUrls);

    if (!updatedPost) {
      return NextResponse.json(
        { error: 'Post not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      post: updatedPost,
      message: 'Post updated successfully'
    });
  } catch (error) {
    console.error('Error updating post:', error);
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

    const success = deletePost(postId, session.user.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Post not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
