import { NextRequest, NextResponse } from 'next/server';
import { getRoomById } from '../../../../lib/database';

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { roomId } = await params;
    
    const room = await getRoomById(roomId);
    
    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }
    
    // For now, we'll mock the active status and listener count
    // In a real implementation, this would check the actual socket state
    const roomWithStatus = {
      ...room,
      listeners: 0, // TODO: Get from socket server
      isActive: false // TODO: Get from socket server
    };
    
    return NextResponse.json(roomWithStatus);
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}