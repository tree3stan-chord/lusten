import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getFriendSuggestions } from '@/lib/sqlite-db';
import { authOptions } from '@/lib/auth';
import type { Session } from 'next-auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions) as Session | null;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const suggestions = getFriendSuggestions(session.user.id, 10);

    return NextResponse.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('Error fetching friend suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch friend suggestions' },
      { status: 500 }
    );
  }
}
