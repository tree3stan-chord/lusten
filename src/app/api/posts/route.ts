import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { createPost, createActivity } from '../../../lib/sqlite-db';
import { authOptions } from '../../../lib/auth';
import type { Session } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { content, mediaUrls, visibility } = body;

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

    if (visibility && !['public', 'friends', 'private'].includes(visibility)) {
      return NextResponse.json(
        { error: 'Invalid visibility setting' },
        { status: 400 }
      );
    }

    // Create post
    const post = createPost({
      userId: session.user.id,
      content: content.trim(),
      mediaUrls: mediaUrls || [],
      visibility: visibility || 'public'
    });

    // Create activity feed entry (if public or friends)
    if (visibility !== 'private') {
      try {
        createActivity({
          userId: session.user.id,
          activityType: 'created_room', // We can add 'created_post' later
          visibility: visibility || 'public'
        });
      } catch (activityError) {
        console.error('Failed to create activity:', activityError);
        // Don't fail the request
      }
    }

    return NextResponse.json({
      success: true,
      post,
      message: 'Post created successfully'
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
