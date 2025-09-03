import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { getUserStatus, setUserVisibility, updateUserStatus } from '../../../../lib/sqlite-db';
import { authOptions } from '../../../../lib/auth';
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
    
    const status = getUserStatus(session.user.id);
    return NextResponse.json({
      visibility: status?.visibility || 'online',
      is_online: status?.is_online || false,
      last_active: status?.last_active || null
    });
  } catch (error) {
    console.error('Error fetching user visibility:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { visibility } = await request.json();
    
    if (!['online', 'idle', 'dnd', 'invisible'].includes(visibility)) {
      return NextResponse.json(
        { error: 'Invalid visibility status' },
        { status: 400 }
      );
    }
    
    const success = setUserVisibility(session.user.id, visibility);
    
    if (success) {
      // Also mark as online when setting visibility (unless going invisible)
      if (visibility !== 'invisible') {
        updateUserStatus(session.user.id, { is_online: true });
      }
      
      return NextResponse.json({ 
        success: true, 
        visibility,
        message: `Status set to ${visibility}` 
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to update visibility' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating user visibility:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}