import { NextRequest, NextResponse } from 'next/server';
import { getActiveUsers } from '../../../../lib/sqlite-db';

// This endpoint is designed to be called by cron jobs or background processes
// to refresh Spotify stats for active users
export async function POST(request: NextRequest) {
  try {
    // Simple API key authentication for cron jobs
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.ADMIN_API_KEY;
    
    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const maxUsers = parseInt(searchParams.get('max_users') || '50');
    const timeRange = searchParams.get('time_range') || 'medium_term';
    const dryRun = searchParams.get('dry_run') === 'true';

    // Get active users from the last 7 days
    const activeUsers = getActiveUsers()
      .filter(user => {
        if (!user.status?.last_active) return false;
        const lastActive = new Date(user.status.last_active);
        const daysAgo = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 7; // Active within last 7 days
      })
      .slice(0, maxUsers);

    if (dryRun) {
      return NextResponse.json({
        message: 'Dry run - no stats were updated',
        would_update: activeUsers.length,
        users: activeUsers.map(u => ({
          id: u.spotify_id,
          name: u.name,
          last_active: u.status?.last_active
        }))
      });
    }

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[]
    };

    // Process users in batches to avoid rate limiting
    const BATCH_SIZE = 5;
    for (let i = 0; i < activeUsers.length; i += BATCH_SIZE) {
      const batch = activeUsers.slice(i, i + BATCH_SIZE);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (user) => {
        try {
          // Call the user's spotify-stats endpoint
          const response = await fetch(
            `${process.env.NEXTAUTH_URL}/api/users/${user.spotify_id}/spotify-stats?time_range=${timeRange}&force=false`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                // Note: This won't work without proper session context
                // In a real implementation, you'd need a service account or different approach
              }
            }
          );

          if (response.ok) {
            results.success++;
            return { userId: user.spotify_id, status: 'success' };
          } else if (response.status === 401) {
            results.skipped++;
            return { userId: user.spotify_id, status: 'skipped', reason: 'no_auth' };
          } else {
            results.failed++;
            const error = `User ${user.spotify_id}: ${response.status}`;
            results.errors.push(error);
            return { userId: user.spotify_id, status: 'failed', error };
          }
        } catch (error) {
          results.failed++;
          const errorMsg = `User ${user.spotify_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);
          return { userId: user.spotify_id, status: 'failed', error: errorMsg };
        }
      });

      await Promise.all(batchPromises);
      
      // Add delay between batches to respect rate limits
      if (i + BATCH_SIZE < activeUsers.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    return NextResponse.json({
      message: 'Bulk refresh completed',
      total_users: activeUsers.length,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in bulk refresh:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check which users would be refreshed
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.ADMIN_API_KEY;
    
    if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const maxUsers = parseInt(searchParams.get('max_users') || '50');

    const activeUsers = getActiveUsers()
      .filter(user => {
        if (!user.status?.last_active) return false;
        const lastActive = new Date(user.status.last_active);
        const daysAgo = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
        return daysAgo <= 7;
      })
      .slice(0, maxUsers);

    return NextResponse.json({
      message: 'Users eligible for refresh',
      count: activeUsers.length,
      users: activeUsers.map(u => ({
        id: u.spotify_id,
        name: u.name,
        last_active: u.status?.last_active,
        days_since_active: Math.floor((Date.now() - new Date(u.status?.last_active || 0).getTime()) / (1000 * 60 * 60 * 24))
      }))
    });

  } catch (error) {
    console.error('Error fetching eligible users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}