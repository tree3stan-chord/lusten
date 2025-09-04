import { NextRequest, NextResponse } from 'next/server';
import { getActiveUsers, getUserSpotifyStats, updateUserSpotifyStats } from '../../../../lib/sqlite-db';
import { SpotifyStatsGenerator } from '../../../../lib/spotify-stats-generator';
import { spotifyApi } from '../../../../lib/spotify-api-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';

// Vercel cron job authentication
function isValidCronRequest(request: NextRequest): boolean {
  // For Vercel cron jobs
  if (process.env.VERCEL === '1') {
    const authHeader = request.headers.get('authorization');
    return authHeader === `Bearer ${process.env.CRON_SECRET}`;
  }
  
  // For local development or other platforms
  const adminKey = request.headers.get('authorization');
  return adminKey === `Bearer ${process.env.ADMIN_API_KEY}`;
}

interface RefreshJob {
  id: string;
  userId: string;
  userName: string;
  priority: 'high' | 'medium' | 'low';
  lastUpdated: Date | null;
  hoursSinceUpdate: number;
  reason: string;
}

interface RefreshResult {
  userId: string;
  success: boolean;
  cached: boolean;
  error?: string;
  stats?: any;
  duration: number;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verify cron authentication
    if (!isValidCronRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const maxUsers = parseInt(searchParams.get('max_users') || '20');
    const timeRange = searchParams.get('time_range') || 'medium_term';
    const dryRun = searchParams.get('dry_run') === 'true';
    const forceRefresh = searchParams.get('force') === 'true';

    console.log(`🔄 Starting scheduled Spotify stats refresh - ${new Date().toISOString()}`);
    console.log(`   Max users: ${maxUsers}, Time range: ${timeRange}, Dry run: ${dryRun}`);

    // Get prioritized list of users to refresh
    const refreshJobs = await getPrioritizedRefreshJobs(maxUsers);
    
    if (dryRun) {
      return NextResponse.json({
        message: 'Dry run - no updates performed',
        jobs_identified: refreshJobs.length,
        jobs: refreshJobs.map(job => ({
          userId: job.userId,
          userName: job.userName,
          priority: job.priority,
          reason: job.reason,
          hours_since_update: job.hoursSinceUpdate
        })),
        total_runtime: Date.now() - startTime
      });
    }

    const results: RefreshResult[] = [];
    const BATCH_SIZE = 3; // Small batches to respect rate limits
    
    // Process users in batches
    for (let i = 0; i < refreshJobs.length; i += BATCH_SIZE) {
      const batch = refreshJobs.slice(i, i + BATCH_SIZE);
      console.log(`  📦 Processing batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(refreshJobs.length/BATCH_SIZE)}: ${batch.length} users`);
      
      const batchResults = await Promise.allSettled(
        batch.map(job => refreshUserStats(job, timeRange, forceRefresh))
      );
      
      // Process batch results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            userId: batch[index].userId,
            success: false,
            cached: false,
            error: `Batch processing failed: ${result.reason}`,
            duration: 0
          });
        }
      });
      
      // Add delay between batches to respect Spotify rate limits
      if (i + BATCH_SIZE < refreshJobs.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Generate summary
    const summary = {
      total_jobs: refreshJobs.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      cached: results.filter(r => r.cached).length,
      total_runtime: Date.now() - startTime,
      average_job_time: results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length) : 0
    };

    console.log(`✅ Refresh completed: ${summary.successful}/${summary.total_jobs} successful (${summary.cached} cached)`);

    return NextResponse.json({
      message: 'Scheduled refresh completed',
      summary,
      results: results.map(r => ({
        userId: r.userId,
        success: r.success,
        cached: r.cached,
        error: r.error,
        duration: r.duration
      })),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Cron job failed:', errorMessage);
    
    return NextResponse.json({
      error: 'Cron job failed',
      details: errorMessage,
      runtime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Get prioritized list of users who need stats refreshed
 */
async function getPrioritizedRefreshJobs(maxUsers: number): Promise<RefreshJob[]> {
  const activeUsers = getActiveUsers();
  const jobs: RefreshJob[] = [];

  for (const user of activeUsers) {
    if (!user.status?.last_active) continue;

    const lastActiveDate = new Date(user.status.last_active);
    const daysSinceActive = (Date.now() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Skip users who haven't been active in 30 days
    if (daysSinceActive > 30) continue;

    const existingStats = getUserSpotifyStats(user.spotify_id);
    const lastUpdated = existingStats ? new Date(existingStats.last_updated) : null;
    const hoursSinceUpdate = lastUpdated ? 
      (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60) : 999;

    // Determine priority and whether to refresh
    let priority: RefreshJob['priority'];
    let reason: string;
    let shouldRefresh = false;

    if (!existingStats) {
      priority = 'high';
      reason = 'No stats exist';
      shouldRefresh = true;
    } else if (hoursSinceUpdate > 168) { // 7 days
      priority = 'high';
      reason = `Stats are ${Math.floor(hoursSinceUpdate / 24)} days old`;
      shouldRefresh = true;
    } else if (daysSinceActive < 1 && hoursSinceUpdate > 24) { // Very active user
      priority = 'high';
      reason = 'Very active user with day-old stats';
      shouldRefresh = true;
    } else if (daysSinceActive < 7 && hoursSinceUpdate > 72) { // Recently active user
      priority = 'medium';
      reason = 'Recently active user with 3+ day old stats';
      shouldRefresh = true;
    } else if (hoursSinceUpdate > 144) { // 6 days
      priority = 'low';
      reason = `Routine refresh (${Math.floor(hoursSinceUpdate / 24)} days old)`;
      shouldRefresh = true;
    }

    if (shouldRefresh) {
      jobs.push({
        id: `${user.spotify_id}-${Date.now()}`,
        userId: user.spotify_id,
        userName: user.name,
        priority,
        lastUpdated,
        hoursSinceUpdate,
        reason
      });
    }
  }

  // Sort by priority (high -> medium -> low) and then by hours since update
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  jobs.sort((a, b) => {
    if (a.priority !== b.priority) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return b.hoursSinceUpdate - a.hoursSinceUpdate;
  });

  return jobs.slice(0, maxUsers);
}

/**
 * Refresh stats for a single user
 */
async function refreshUserStats(
  job: RefreshJob, 
  timeRange: string, 
  forceRefresh: boolean
): Promise<RefreshResult> {
  const startTime = Date.now();
  
  try {
    console.log(`    🔄 Refreshing ${job.userName} (${job.priority} priority): ${job.reason}`);

    // Check cache first unless forcing refresh
    if (!forceRefresh && job.priority === 'low') {
      const existingStats = getUserSpotifyStats(job.userId);
      if (existingStats) {
        const hoursSinceUpdate = (Date.now() - new Date(existingStats.last_updated).getTime()) / (1000 * 60 * 60);
        if (hoursSinceUpdate < 48) { // Use cached data if less than 48 hours old for low priority
          return {
            userId: job.userId,
            success: true,
            cached: true,
            stats: existingStats,
            duration: Date.now() - startTime
          };
        }
      }
    }

    // We need to create a service account approach or use stored refresh tokens
    // For now, this is a placeholder that would need proper authentication
    // In a real implementation, you'd store refresh tokens or use a service account
    
    console.log(`      ⚠️  Skipping ${job.userName} - requires user session authentication`);
    return {
      userId: job.userId,
      success: false,
      cached: false,
      error: 'Background refresh requires service account or stored tokens',
      duration: Date.now() - startTime
    };

    // TODO: Implement proper background authentication
    // This would involve:
    // 1. Storing user refresh tokens securely
    // 2. Using refresh tokens to get access tokens
    // 3. Making API calls with those tokens
    // 4. Updating stats in database

  } catch (error) {
    console.log(`      ❌ Failed to refresh ${job.userName}:`, error);
    return {
      userId: job.userId,
      success: false,
      cached: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    };
  }
}

// GET endpoint for checking cron job status and next eligible users
export async function GET(request: NextRequest) {
  try {
    if (!isValidCronRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const maxUsers = parseInt(searchParams.get('max_users') || '20');
    
    const jobs = await getPrioritizedRefreshJobs(maxUsers);
    
    return NextResponse.json({
      message: 'Cron job status check',
      next_refresh_jobs: jobs.length,
      jobs: jobs.map(job => ({
        userId: job.userId,
        userName: job.userName,
        priority: job.priority,
        reason: job.reason,
        hours_since_update: Math.round(job.hoursSinceUpdate * 10) / 10,
        last_updated: job.lastUpdated?.toISOString() || null
      })),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check cron status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}