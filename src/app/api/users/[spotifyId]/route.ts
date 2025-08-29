import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '../../../../lib/database';

interface RouteParams {
  params: Promise<{ spotifyId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { spotifyId } = await params;
    
    const user = await getUserById(spotifyId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}