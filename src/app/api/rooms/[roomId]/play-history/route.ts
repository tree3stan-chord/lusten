import { NextRequest, NextResponse } from 'next/server';
import { addToPlayHistory, getRecentPlayHistory } from '@/lib/sqlite-db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { trackId, trackName, artistIds, artistNames, detectedGenres, playedBy } = await request.json();

    // Store in play history
    const entry = addToPlayHistory(
      roomId,
      trackId,
      trackName,
      artistIds,
      artistNames,
      detectedGenres || [],
      playedBy
    );

    return NextResponse.json({
      success: true,
      entry
    });
  } catch (error) {
    console.error('Error storing play history:', error);
    return NextResponse.json(
      { error: 'Failed to store play history' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');

    const history = getRecentPlayHistory(roomId, limit);

    return NextResponse.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Error fetching play history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch play history' },
      { status: 500 }
    );
  }
}
