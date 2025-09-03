import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { updateUserAvatar, getUserAvatarInfo } from '../../../../lib/sqlite-db';
import { validateImageFile, AVATAR_CONFIG } from '../../../../lib/image-utils';

export async function POST(request: NextRequest) {
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

    // Parse form data
    const formData = await request.formData();
    const avatarData = formData.get('avatar') as string;

    if (!avatarData) {
      return NextResponse.json({ error: 'No avatar data provided' }, { status: 400 });
    }

    // Validate data URL format
    if (!avatarData.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image data format' }, { status: 400 });
    }

    // Extract and validate the image data
    const [header, base64Data] = avatarData.split(',');
    if (!header || !base64Data) {
      return NextResponse.json({ error: 'Invalid data URL format' }, { status: 400 });
    }

    // Check if it's WebP format as expected
    if (!header.includes('webp')) {
      return NextResponse.json({ error: 'Only WebP format is allowed' }, { status: 400 });
    }

    // Estimate file size from base64 data
    const estimatedSize = (base64Data.length * 3) / 4;
    if (estimatedSize > AVATAR_CONFIG.maxFileSize) {
      return NextResponse.json({ 
        error: `File size too large. Maximum ${AVATAR_CONFIG.maxFileSize / 1024 / 1024}MB allowed` 
      }, { status: 400 });
    }

    // Update user avatar in database
    const success = updateUserAvatar(userId, avatarData);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 });
    }

    // Get updated avatar info
    const avatarInfo = getUserAvatarInfo(userId);

    return NextResponse.json({ 
      success: true, 
      avatar_url: avatarInfo?.custom_avatar_url,
      updated_at: avatarInfo?.avatar_updated_at
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error during avatar upload' },
      { status: 500 }
    );
  }
}