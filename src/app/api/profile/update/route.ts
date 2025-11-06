import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import {
  updateUserBio,
  updateUserStatus,
  updateUserPrivacySettings,
  createActivity,
  type PrivacySettings
} from '../../../../lib/sqlite-db';
import { authOptions } from '../../../../lib/auth';
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
    const { bio, customStatus, privacySettings } = body;

    const updates: string[] = [];

    // Update bio
    if (bio !== undefined) {
      const success = updateUserBio(session.user.id, bio);
      if (success) {
        updates.push('bio');
        // Create activity for bio update
        if (bio.trim()) {
          createActivity({
            userId: session.user.id,
            activityType: 'updated_bio',
            visibility: 'public'
          });
        }
      }
    }

    // Update custom status
    if (customStatus !== undefined) {
      const success = updateUserStatus(session.user.id, customStatus);
      if (success) {
        updates.push('customStatus');
      }
    }

    // Update privacy settings
    if (privacySettings) {
      // Validate privacy settings
      const valid =
        privacySettings.profile_visibility &&
        ['public', 'friends', 'private'].includes(privacySettings.profile_visibility) &&
        privacySettings.activity_visibility &&
        ['public', 'friends', 'private'].includes(privacySettings.activity_visibility) &&
        typeof privacySettings.show_listening === 'boolean';

      if (!valid) {
        return NextResponse.json(
          { error: 'Invalid privacy settings' },
          { status: 400 }
        );
      }

      const success = updateUserPrivacySettings(session.user.id, privacySettings as PrivacySettings);
      if (success) {
        updates.push('privacySettings');
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: updates,
      message: `Successfully updated ${updates.join(', ')}`
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
