import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { markNotificationRead, markAllNotificationsRead } from '@/lib/sqlite-db';

/**
 * POST /api/notifications/mark-read
 * Mark notification(s) as read
 * Body: { notificationId?: string, markAll?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.email;
    const { notificationId, markAll } = await request.json();

    if (markAll) {
      // Mark all notifications as read
      const count = markAllNotificationsRead(userId);

      return NextResponse.json({
        success: true,
        message: `Marked ${count} notifications as read`,
        count
      });
    } else if (notificationId) {
      // Mark single notification as read
      const success = markNotificationRead(notificationId, userId);

      if (!success) {
        return NextResponse.json(
          { error: 'Notification not found or already read' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Notification marked as read'
      });
    } else {
      return NextResponse.json(
        { error: 'Must provide notificationId or markAll' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}
