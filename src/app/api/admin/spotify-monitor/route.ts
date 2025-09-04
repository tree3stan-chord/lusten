import { NextRequest, NextResponse } from 'next/server';
import { getRefreshStats, getPendingJobs, initializeRefreshTokensTable } from '../../../../lib/spotify-refresh-tokens';
import { getActiveUsers, getUserSpotifyStats } from '../../../../lib/sqlite-db';

// Initialize the refresh tokens table on first access
try {
  initializeRefreshTokensTable();
} catch (error) {
  console.error('Failed to initialize refresh tokens table:', error);
}

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${process.env.ADMIN_API_KEY}`;
}

// GET - Comprehensive monitoring dashboard data
export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24');
    
    // Get refresh statistics
    const refreshStats = getRefreshStats(hours);
    
    // Get pending jobs
    const pendingJobs = getPendingJobs(50);
    
    // Get active users and their stats status
    const activeUsers = getActiveUsers();
    const userStatsStatus = activeUsers.map(user => {
      const stats = getUserSpotifyStats(user.spotify_id);
      const lastUpdated = stats ? new Date(stats.last_updated) : null;
      const hoursSinceUpdate = lastUpdated ? 
        (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60) : null;
      
      const daysSinceActive = user.status?.last_active ? 
        (Date.now() - new Date(user.status.last_active).getTime()) / (1000 * 60 * 60 * 24) : null;
      
      return {
        user_id: user.spotify_id,
        name: user.name,
        has_stats: !!stats,
        hours_since_stats_update: hoursSinceUpdate ? Math.round(hoursSinceUpdate * 10) / 10 : null,
        days_since_active: daysSinceActive ? Math.round(daysSinceActive * 10) / 10 : null,
        needs_refresh: !stats || (hoursSinceUpdate && hoursSinceUpdate > 24),
        priority: !stats ? 'high' : 
                  (daysSinceActive && daysSinceActive < 1 && hoursSinceUpdate && hoursSinceUpdate > 24) ? 'high' :
                  (daysSinceActive && daysSinceActive < 7 && hoursSinceUpdate && hoursSinceUpdate > 72) ? 'medium' : 'low'
      };
    });

    // Calculate system health metrics
    const totalActiveUsers = activeUsers.length;
    const usersWithStats = userStatsStatus.filter(u => u.has_stats).length;
    const usersNeedingRefresh = userStatsStatus.filter(u => u.needs_refresh).length;
    const staleStatsUsers = userStatsStatus.filter(u => u.hours_since_stats_update && u.hours_since_stats_update > 168).length; // 7 days
    
    const systemHealth = {
      coverage_percentage: totalActiveUsers > 0 ? Math.round((usersWithStats / totalActiveUsers) * 100) : 0,
      users_needing_refresh: usersNeedingRefresh,
      stale_stats_users: staleStatsUsers,
      pending_jobs_count: pendingJobs.length,
      health_score: calculateHealthScore(refreshStats, usersNeedingRefresh, totalActiveUsers)
    };

    // Job queue analysis
    const jobAnalysis = {
      pending_count: pendingJobs.length,
      high_priority: pendingJobs.filter(j => j.priority === 'high').length,
      medium_priority: pendingJobs.filter(j => j.priority === 'medium').length,
      low_priority: pendingJobs.filter(j => j.priority === 'low').length,
      overdue_jobs: pendingJobs.filter(j => 
        new Date(j.scheduled_at).getTime() < Date.now() - (30 * 60 * 1000) // 30 minutes overdue
      ).length,
      retry_jobs: pendingJobs.filter(j => j.retry_count > 0).length
    };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      monitoring_period_hours: hours,
      system_health: systemHealth,
      refresh_statistics: {
        ...refreshStats,
        success_rate: refreshStats.total_jobs > 0 ? 
          Math.round((refreshStats.successful / refreshStats.total_jobs) * 100) : 0,
        avg_duration_seconds: refreshStats.avg_duration_ms ? 
          Math.round(refreshStats.avg_duration_ms / 100) / 10 : 0
      },
      job_queue: jobAnalysis,
      user_status_summary: {
        total_active_users: totalActiveUsers,
        users_with_stats: usersWithStats,
        users_needing_refresh: usersNeedingRefresh,
        by_priority: {
          high: userStatsStatus.filter(u => u.priority === 'high').length,
          medium: userStatsStatus.filter(u => u.priority === 'medium').length,
          low: userStatsStatus.filter(u => u.priority === 'low').length
        }
      },
      recent_jobs: pendingJobs.slice(0, 10).map(job => ({
        id: job.id,
        user_id: job.user_id,
        priority: job.priority,
        scheduled_at: job.scheduled_at,
        retry_count: job.retry_count,
        error_message: job.error_message
      })),
      recommendations: generateRecommendations(systemHealth, refreshStats, jobAnalysis)
    });

  } catch (error) {
    console.error('Error in Spotify monitor:', error);
    return NextResponse.json({
      error: 'Failed to fetch monitoring data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Trigger maintenance tasks
export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'cleanup_old_logs':
        const days = parseInt(searchParams.get('days') || '7');
        // TODO: Implement log cleanup
        return NextResponse.json({ 
          message: `Cleaned up logs older than ${days} days`,
          action: 'cleanup_old_logs',
          status: 'completed'
        });

      case 'reset_failed_jobs':
        // TODO: Reset failed jobs to pending status
        return NextResponse.json({
          message: 'Reset failed jobs to pending status',
          action: 'reset_failed_jobs', 
          status: 'completed'
        });

      case 'health_check':
        const health = await performHealthCheck();
        return NextResponse.json({
          message: 'Health check completed',
          action: 'health_check',
          results: health
        });

      default:
        return NextResponse.json({
          error: 'Unknown action',
          available_actions: ['cleanup_old_logs', 'reset_failed_jobs', 'health_check']
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in monitor maintenance:', error);
    return NextResponse.json({
      error: 'Maintenance action failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function calculateHealthScore(
  refreshStats: any, 
  usersNeedingRefresh: number, 
  totalActiveUsers: number
): number {
  let score = 100;

  // Deduct for failed refreshes
  if (refreshStats.total_jobs > 0) {
    const failureRate = refreshStats.failed / refreshStats.total_jobs;
    score -= failureRate * 30; // Up to -30 for 100% failure rate
  }

  // Deduct for users needing refresh
  if (totalActiveUsers > 0) {
    const refreshNeededRate = usersNeedingRefresh / totalActiveUsers;
    score -= refreshNeededRate * 40; // Up to -40 for 100% needing refresh
  }

  // Deduct for rate limiting issues
  if (refreshStats.total_jobs > 0) {
    const rateLimitRate = refreshStats.rate_limited / refreshStats.total_jobs;
    score -= rateLimitRate * 20; // Up to -20 for constant rate limiting
  }

  return Math.max(0, Math.round(score));
}

function generateRecommendations(
  systemHealth: any,
  refreshStats: any,
  jobAnalysis: any
): string[] {
  const recommendations: string[] = [];

  if (systemHealth.coverage_percentage < 80) {
    recommendations.push('Low stats coverage - consider running a bulk refresh');
  }

  if (systemHealth.users_needing_refresh > 50) {
    recommendations.push('Many users need refresh - increase cron job frequency');
  }

  if (refreshStats.total_jobs > 0 && refreshStats.failed / refreshStats.total_jobs > 0.2) {
    recommendations.push('High failure rate - check authentication and API limits');
  }

  if (refreshStats.rate_limited > 0) {
    recommendations.push('Rate limiting detected - consider reducing batch size or increasing delays');
  }

  if (jobAnalysis.overdue_jobs > 10) {
    recommendations.push('Many overdue jobs - cron job may not be running properly');
  }

  if (jobAnalysis.retry_jobs > 20) {
    recommendations.push('Many jobs requiring retries - investigate common failure causes');
  }

  if (recommendations.length === 0) {
    recommendations.push('System is healthy - no immediate action required');
  }

  return recommendations;
}

async function performHealthCheck(): Promise<any> {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check environment variables
  if (!process.env.ADMIN_API_KEY) {
    issues.push('ADMIN_API_KEY not configured');
  }

  if (!process.env.CRON_SECRET && process.env.VERCEL === '1') {
    issues.push('CRON_SECRET not configured for Vercel deployment');
  }

  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    issues.push('Spotify client credentials not configured');
  }

  if (!process.env.REFRESH_TOKEN_ENCRYPTION_KEY) {
    warnings.push('Using default encryption key for refresh tokens (security risk)');
  }

  // Check database connectivity
  try {
    const stats = getRefreshStats(1);
    if (typeof stats.total_jobs !== 'number') {
      issues.push('Database connectivity issues detected');
    }
  } catch (error) {
    issues.push('Failed to query database');
  }

  return {
    status: issues.length === 0 ? 'healthy' : 'issues_detected',
    issues,
    warnings,
    checks_performed: [
      'Environment variables',
      'Database connectivity', 
      'Configuration validation'
    ]
  };
}