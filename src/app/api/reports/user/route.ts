import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { createReport, getUserById } from '@/lib/sqlite-db';
import { authOptions } from '@/lib/auth';
import type { Session } from 'next-auth';
import type { UserReport } from '@/lib/sqlite-db';

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
    const { userId, reportType, reason, evidenceUrl } = body;

    // Validation
    if (!userId || !reportType || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, reportType, reason' },
        { status: 400 }
      );
    }

    // Validate reportType
    const validReportTypes: UserReport['report_type'][] = [
      'harassment',
      'spam',
      'inappropriate_content',
      'offensive_username',
      'fake_profile',
      'other'
    ];

    if (!validReportTypes.includes(reportType)) {
      return NextResponse.json(
        { error: 'Invalid report type' },
        { status: 400 }
      );
    }

    // Prevent reporting yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot report yourself' },
        { status: 400 }
      );
    }

    // Check if reported user exists
    const reportedUser = getUserById(userId);
    if (!reportedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const report = createReport({
      reporterId: session.user.id,
      entityType: 'user',
      entityId: userId,
      reportType,
      reason,
      evidenceUrl
    });

    return NextResponse.json({
      success: true,
      report,
      message: 'Report submitted successfully. Our team will review it shortly.'
    });
  } catch (error) {
    console.error('Error creating user report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
