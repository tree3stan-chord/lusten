import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getUserAvatarInfo } from '../../../lib/sqlite-db';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 400 });
    }

    // Get user avatar info
    const avatarInfo = getUserAvatarInfo(userId);

    return NextResponse.json({
      avatar_url: avatarInfo?.custom_avatar_url || null,
      updated_at: avatarInfo?.avatar_updated_at || null
    });

  } catch (error) {
    console.error('Avatar fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error during avatar fetch' },
      { status: 500 }
    );
  }
}