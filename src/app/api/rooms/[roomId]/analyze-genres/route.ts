import { NextRequest, NextResponse } from 'next/server';
import { analyzeRoomGenres, autoUpdateRoomGenres } from '../../../../../lib/sqlite-db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    // Analyze room's play history to suggest genres
    const analysis = analyzeRoomGenres(roomId);

    // Auto-update if confidence is high enough
    let updated = false;
    if (analysis.should_update) {
      updated = autoUpdateRoomGenres(roomId);
    }

    return NextResponse.json({
      success: true,
      analysis: {
        tracks_analyzed: analysis.total_tracks,
        suggested_genres: analysis.suggested_genres,
        confidence: analysis.confidence,
        should_update: analysis.should_update,
        updated
      }
    });
  } catch (error) {
    console.error('Error analyzing room genres:', error);
    return NextResponse.json(
      { error: 'Failed to analyze genres' },
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

    // Just return analysis without updating
    const analysis = analyzeRoomGenres(roomId);

    return NextResponse.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error fetching genre analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}
