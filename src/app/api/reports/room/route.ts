import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { createReport, getRoom } from '@/lib/sqlite-db';
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
    const { roomId, reportType, reason, evidenceUrl } = body;

    // Validation
    if (!roomId || !reportType || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: roomId, reportType, reason' },
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

    // Check if room exists
    const room = getRoom(roomId);
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    const report = createReport({
      reporterId: session.user.id,
      entityType: 'room',
      entityId: roomId,
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
    console.error('Error creating room report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
