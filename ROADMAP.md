# Lusten Social Media Development Roadmap

**Goal:** Transform lusten from a collaborative listening platform into a complete music social network

**Current Status:** 52% Complete
**Target:** 95%+ Complete Social Platform

---

## 🎯 PHASE 1: CORE SOCIAL FOUNDATION (Weeks 1-3)
**Priority:** 🔥 CRITICAL - Makes platform feel alive and social

### Sprint 1.1: Notifications System (Week 1)
**Status:** Not Started | **Impact:** CRITICAL

#### Database & Backend (3 days)
- [ ] Create `notifications` table with schema
  - id, user_id, type, title, message, data (JSON), read, created_at
  - Indexes on user_id, read status, created_at
- [ ] Create notification API endpoints
  - [ ] `GET /api/notifications` - Get user's notifications
  - [ ] `GET /api/notifications/unread-count` - Get unread count
  - [ ] `POST /api/notifications/mark-read` - Mark as read
  - [ ] `POST /api/notifications/mark-all-read` - Mark all as read
  - [ ] `DELETE /api/notifications/[id]` - Delete notification
- [ ] Create notification service/helper functions
  - [ ] `createNotification(userId, type, data)` - Helper to create notifications
  - [ ] `sendToUser(userId, notification)` - Send via socket + store in DB

#### Socket.io Integration (1 day)
- [ ] Add `notification` socket event
- [ ] Broadcast notifications to connected users in real-time
- [ ] Handle notification delivery to offline users (queue for next login)

#### UI Components (2 days)
- [ ] Notification bell icon in navbar with unread badge
- [ ] Notification dropdown panel
  - [ ] List of recent notifications (last 20)
  - [ ] Mark as read on view
  - [ ] Click to navigate to relevant page
  - [ ] "Mark all as read" button
- [ ] Notification page (`/notifications`)
  - [ ] Infinite scroll for all notifications
  - [ ] Filter by type (friends, rooms, likes, etc.)
  - [ ] Bulk actions (delete, mark read)

#### Notification Types - Phase 1 (1 day)
- [ ] Friend request received
- [ ] Friend request accepted
- [ ] Friend came online (if they haven't been online in 24h+)
- [ ] Friend joined a room you're in
- [ ] Mentioned in chat (@username)

**Estimated Time:** 7 days
**Dependencies:** None

---

### Sprint 1.2: User Blocking & Safety (Week 2)
**Status:** Not Started | **Impact:** HIGH - Critical for user safety

#### Database & Backend (2 days)
- [ ] Create `user_blocks` table
  - id, blocker_id, blocked_id, reason (optional), created_at
  - Unique constraint on (blocker_id, blocked_id)
- [ ] Create blocking API endpoints
  - [ ] `POST /api/users/[userId]/block` - Block user
  - [ ] `DELETE /api/users/[userId]/unblock` - Unblock user
  - [ ] `GET /api/users/blocked` - Get blocked users list
  - [ ] `GET /api/users/[userId]/is-blocked` - Check if user is blocked
- [ ] Create `user_reports` table
  - id, reporter_id, reported_id, report_type, reason, evidence_url, status, created_at
- [ ] Create reporting API endpoints
  - [ ] `POST /api/reports/user` - Report a user
  - [ ] `POST /api/reports/room` - Report a room

#### Socket.io Integration (1 day)
- [ ] Filter blocked users from:
  - [ ] Active users list
  - [ ] Room participant lists
  - [ ] Friend suggestions
  - [ ] Search results
- [ ] Prevent blocked users from:
  - [ ] Sending friend requests
  - [ ] Joining your profile room
  - [ ] Seeing your online status

#### UI Components (2 days)
- [ ] Block button on user profiles
- [ ] Blocked users management page
  - [ ] List of blocked users
  - [ ] Unblock action
  - [ ] Reason display
- [ ] Report user modal
  - [ ] Report type dropdown
  - [ ] Reason text area
  - [ ] Evidence URL input
- [ ] Report room modal
  - [ ] Similar to user reporting

#### Chat Muting (1 day)
- [ ] Create `user_mutes` table (client-side only, no DB needed initially)
- [ ] Mute button in chat user list
- [ ] Muted users' messages hidden locally
- [ ] Unmute button
- [ ] Store mutes in localStorage

**Estimated Time:** 6 days
**Dependencies:** None

---

### Sprint 1.3: Profile Enhancements (Week 3)
**Status:** Not Started | **Impact:** HIGH - Makes profiles complete

#### Backend (2 days)
- [ ] Add `bio` field to `users` table (TEXT, max 500 chars)
- [ ] Add `social_links` field to `users` table (JSON)
  - Twitter, Instagram, TikTok, YouTube, Website
- [ ] Update user profile API to include new fields
- [ ] Create profile update endpoints
  - [ ] `PUT /api/users/profile` - Update bio and social links
  - [ ] Input validation (max lengths, URL validation)

#### UI - Bio & Social Links (2 days)
- [ ] Add bio text area to profile edit modal
  - [ ] Character counter (500 max)
  - [ ] Markdown preview (optional)
- [ ] Add social links inputs to profile edit modal
  - [ ] Icon + URL input for each platform
  - [ ] URL validation
- [ ] Display bio on profile page
  - [ ] Styled text area with markdown rendering
  - [ ] "Edit" button for own profile
- [ ] Display social links on profile page
  - [ ] Icon buttons linking to external profiles
  - [ ] Hide empty links

#### UI - Top Picks Display (1 day)
- [ ] Create TopPicksWidget component
  - [ ] Display top 5 tracks/artists/albums from `user_top_picks` table
  - [ ] Album art thumbnails
  - [ ] Track/artist names
  - [ ] Play button (link to Spotify)
- [ ] Add TopPicksWidget to profile page
- [ ] Create edit modal for top picks
  - [ ] Search Spotify for tracks/artists
  - [ ] Drag-and-drop reordering
  - [ ] Save to `user_top_picks` table

#### UI - Top Genres Display (1 day)
- [ ] Create TopGenresWidget component
  - [ ] Display top 5 genres from `user_spotify_stats`
  - [ ] Genre badges with colors
  - [ ] Click to discover rooms in that genre
- [ ] Add TopGenresWidget to profile page
- [ ] Add "refresh from Spotify" button
  - [ ] Calls Spotify API to update stats
  - [ ] Loading state

#### UI - Member Badge Styling (0.5 days)
- [ ] Style "Member since" badge
  - [ ] Calendar icon
  - [ ] Formatted date (e.g., "Member since Jan 2024")
  - [ ] Tenure badge (new/veteran/legend based on account age)

**Estimated Time:** 6.5 days
**Dependencies:** None

---

## 🎯 PHASE 2: ENGAGEMENT MECHANICS (Weeks 4-6)
**Priority:** 🔥 HIGH - Adds social interaction layer

### Sprint 2.1: Track Reactions & Room Likes (Week 4)
**Status:** Not Started | **Impact:** HIGH

#### Database & Backend - Track Reactions (2 days)
- [ ] Create `track_reactions` table
  - id, user_id, room_id, track_id, track_name, artist_name, reaction_type, created_at
  - reaction_type: 'love', 'fire', 'vibe', 'skip'
- [ ] Create track reaction API endpoints
  - [ ] `POST /api/rooms/[roomId]/tracks/react` - React to current track
  - [ ] `GET /api/rooms/[roomId]/tracks/reactions` - Get reactions for current track
  - [ ] `GET /api/users/[userId]/reactions` - Get user's reaction history
  - [ ] `DELETE /api/rooms/[roomId]/tracks/react` - Remove reaction

#### Socket.io - Real-time Reactions (1 day)
- [ ] Broadcast reactions to all users in room
  - [ ] `track-reaction` event with user, reaction type, track
  - [ ] Real-time reaction counts update
- [ ] Reaction animations
  - [ ] Floating emoji animations on react
  - [ ] Reaction counter increments

#### UI - Track Reactions (2 days)
- [ ] Reaction buttons on now-playing card
  - [ ] 4 emoji buttons: ❤️ (love), 🔥 (fire), ✨ (vibe), ⏭️ (skip)
  - [ ] Counter showing total reactions
  - [ ] Highlight user's current reaction
- [ ] Reaction history panel
  - [ ] Show who reacted with what
  - [ ] Avatars of reactors
- [ ] User's reaction history page
  - [ ] List of tracks they've loved
  - [ ] Filter by reaction type
  - [ ] Link to play on Spotify

#### Database & Backend - Room Likes (1 day)
- [ ] Create `room_likes` table
  - id, user_id, room_id, created_at
  - Unique constraint on (user_id, room_id)
- [ ] Create room like API endpoints
  - [ ] `POST /api/rooms/[roomId]/like` - Like room
  - [ ] `DELETE /api/rooms/[roomId]/unlike` - Unlike room
  - [ ] `GET /api/rooms/[roomId]/likes` - Get like count and likers
  - [ ] `GET /api/users/[userId]/liked-rooms` - Get user's liked rooms

#### UI - Room Likes (1 day)
- [ ] Heart button on room page header
  - [ ] Filled when liked, outline when not
  - [ ] Like count next to button
  - [ ] Animate on click
- [ ] Liked rooms section on user profile
  - [ ] Grid of liked room cards
  - [ ] Room name, listener count, current track
  - [ ] Click to join
- [ ] Liked rooms page (`/liked-rooms`)
  - [ ] Full list with filters
  - [ ] Sort by: recent, most active, alphabetical

**Estimated Time:** 7 days
**Dependencies:** Notifications (for like notifications)

---

### Sprint 2.2: Track & Room Sharing (Week 5)
**Status:** Not Started | **Impact:** MEDIUM

#### Database & Backend (2 days)
- [ ] Create `shared_tracks` table
  - id, sharer_id, recipient_id, track_id, track_name, artist_name, album_image, message, created_at
- [ ] Create sharing API endpoints
  - [ ] `POST /api/share/track` - Share track with friend(s)
  - [ ] `GET /api/share/received` - Get tracks shared with me
  - [ ] `GET /api/share/sent` - Get tracks I've shared
  - [ ] `DELETE /api/share/[id]` - Delete shared track
- [ ] Create `shared_rooms` table
  - id, sharer_id, recipient_id, room_id, message, created_at
- [ ] Create room sharing API endpoints
  - [ ] `POST /api/share/room` - Share room with friend(s)
  - [ ] Similar to track sharing

#### Socket.io Integration (1 day)
- [ ] Send real-time notification when track/room is shared
- [ ] Update recipient's notification bell

#### UI - Share Track (2 days)
- [ ] Share button on now-playing card in room
- [ ] Share track modal
  - [ ] Select friends (multi-select dropdown)
  - [ ] Add optional message
  - [ ] Preview of track (album art, name, artist)
  - [ ] Send button
- [ ] Received tracks page (`/inbox/tracks`)
  - [ ] List of shared tracks
  - [ ] Play button (opens Spotify)
  - [ ] Message from sender
  - [ ] Thank you / reply button (sends notification)

#### UI - Share Room (1 day)
- [ ] Share button on room page (already exists, enhance it)
- [ ] Share room modal
  - [ ] Select friends
  - [ ] Add message
  - [ ] Generate shareable link
  - [ ] Copy link button
- [ ] Received rooms in inbox
  - [ ] Join button
  - [ ] Current track preview

**Estimated Time:** 6 days
**Dependencies:** Notifications

---

### Sprint 2.3: Comments System (Week 6)
**Status:** Not Started | **Impact:** MEDIUM

#### Database & Backend (3 days)
- [ ] Create `comments` table
  - id, user_id, entity_type ('room', 'track', 'post'), entity_id, content, parent_comment_id (for threading), created_at, updated_at
  - Indexes on entity_type, entity_id, parent_comment_id
- [ ] Create comments API endpoints
  - [ ] `POST /api/comments` - Create comment
  - [ ] `GET /api/comments?entity_type=X&entity_id=Y` - Get comments
  - [ ] `PUT /api/comments/[id]` - Edit comment
  - [ ] `DELETE /api/comments/[id]` - Delete comment
  - [ ] `POST /api/comments/[id]/reply` - Reply to comment (threaded)
- [ ] Input validation and sanitization
- [ ] Rate limiting (max 10 comments per minute)

#### Socket.io Integration (1 day)
- [ ] Broadcast new comments to users viewing the entity
- [ ] Real-time comment count updates

#### UI - Comments Component (3 days)
- [ ] Create CommentsSection component
  - [ ] Comment input box
  - [ ] Character counter (max 1000 chars)
  - [ ] Submit button
  - [ ] Loading state
- [ ] Comment display
  - [ ] User avatar and name
  - [ ] Comment content
  - [ ] Timestamp (relative: "2 hours ago")
  - [ ] Edit/delete buttons (own comments only)
  - [ ] Reply button
- [ ] Threaded replies
  - [ ] Indent nested comments
  - [ ] "Show replies" expand/collapse
  - [ ] Max 2 levels of nesting
- [ ] Comment sorting
  - [ ] Recent first (default)
  - [ ] Oldest first
  - [ ] Most liked (future)

#### Integration (1 day)
- [ ] Add CommentsSection to room pages
  - [ ] Below now-playing card
  - [ ] Collapsible section
- [ ] Add comment counts to room cards
  - [ ] Show total comments
  - [ ] Icon indicator

**Estimated Time:** 8 days
**Dependencies:** Notifications (for comment reply notifications)

---

## 🎯 PHASE 3: CONTENT & FEED (Weeks 7-9)
**Priority:** 🔥 HIGH - Creates browseable content

### Sprint 3.1: User Posts System (Week 7)
**Status:** Not Started | **Impact:** HIGH

#### Database & Backend (3 days)
- [ ] Create `posts` table
  - id, user_id, content, track_id (optional), track_name, artist_name, album_image, visibility ('public', 'friends', 'private'), created_at, updated_at, deleted_at
- [ ] Create posts API endpoints
  - [ ] `POST /api/posts` - Create post
  - [ ] `GET /api/posts` - Get posts feed (paginated)
  - [ ] `GET /api/posts/[id]` - Get single post
  - [ ] `GET /api/users/[userId]/posts` - Get user's posts
  - [ ] `PUT /api/posts/[id]` - Edit post
  - [ ] `DELETE /api/posts/[id]` - Delete post (soft delete)
- [ ] Posts validation
  - [ ] Max 1000 characters
  - [ ] Rate limit: 10 posts per hour
  - [ ] Sanitize HTML/XSS

#### Database - Post Engagement (1 day)
- [ ] Create `post_likes` table
  - id, user_id, post_id, created_at
  - Unique constraint on (user_id, post_id)
- [ ] Create post likes API endpoints
  - [ ] `POST /api/posts/[id]/like` - Like post
  - [ ] `DELETE /api/posts/[id]/unlike` - Unlike post
  - [ ] `GET /api/posts/[id]/likes` - Get likers

#### UI - Create Post (2 days)
- [ ] Create PostComposer component
  - [ ] Text area with character counter
  - [ ] Attach track button (search Spotify)
  - [ ] Track preview card (if attached)
  - [ ] Visibility selector (public/friends/private)
  - [ ] Post button
- [ ] Attach track modal
  - [ ] Search Spotify tracks
  - [ ] Select track
  - [ ] Preview with album art

#### UI - Post Display (2 days)
- [ ] Create PostCard component
  - [ ] User avatar and name
  - [ ] Timestamp
  - [ ] Post content
  - [ ] Attached track card (if present)
    - [ ] Album art
    - [ ] Track name and artist
    - [ ] Play button (opens Spotify)
  - [ ] Like button with count
  - [ ] Comment count button
  - [ ] Share button
  - [ ] Edit/delete menu (own posts only)
- [ ] Post detail page (`/posts/[id]`)
  - [ ] Full post display
  - [ ] Comments section below

**Estimated Time:** 8 days
**Dependencies:** Comments system, Notifications

---

### Sprint 3.2: Activity Feed / Timeline (Week 8)
**Status:** Not Started | **Impact:** HIGH

#### Database & Backend (2 days)
- [ ] Create feed aggregation logic
  - [ ] Get posts from friends
  - [ ] Get friends' room activity
  - [ ] Get friends' track reactions
  - [ ] Get friends' new friendships
  - [ ] Mix and sort by timestamp
- [ ] Create feed API endpoint
  - [ ] `GET /api/feed` - Get personalized feed
  - [ ] Pagination (cursor-based)
  - [ ] Filters: posts only, activity only, all
- [ ] Optimize queries
  - [ ] Proper indexes
  - [ ] Cache popular posts
  - [ ] Limit to last 30 days

#### UI - Feed Page (3 days)
- [ ] Redesign home page as feed (`/`)
  - [ ] Post composer at top (create new post)
  - [ ] Activity feed below
  - [ ] Infinite scroll
- [ ] Create ActivityCard component for different activity types
  - [ ] Friend joined a room
  - [ ] Friend liked a track
  - [ ] Friend made a new friend
  - [ ] Friend posted
- [ ] Feed filters
  - [ ] All activity (default)
  - [ ] Posts only
  - [ ] Room activity only
  - [ ] Friends' activity only
- [ ] Empty state
  - [ ] "Your friends haven't been active recently"
  - [ ] Suggestions to explore rooms or make friends

#### Feed Algorithm (1 day)
- [ ] Implement basic ranking
  - [ ] Recency
  - [ ] Friends you interact with more often
  - [ ] Popular posts (many likes/comments)
- [ ] Mix organic activity with suggested content
  - [ ] "Rooms you might like"
  - [ ] "People you may know"

**Estimated Time:** 6 days
**Dependencies:** Posts system, Comments

---

### Sprint 3.3: Persistent Chat History (Week 9)
**Status:** Not Started | **Impact:** MEDIUM

#### Database & Backend (2 days)
- [ ] Create `chat_messages` table
  - id, room_id, user_id, message, created_at, deleted_at
  - Index on room_id, created_at
- [ ] Modify socket chat handler to store messages in DB
- [ ] Create chat API endpoints
  - [ ] `GET /api/rooms/[roomId]/messages` - Get messages (paginated)
  - [ ] `DELETE /api/messages/[id]` - Delete own message
- [ ] Message retention policy
  - [ ] Keep messages for 30 days
  - [ ] Cron job to delete old messages

#### UI - Chat Enhancements (2 days)
- [ ] Load last 50 messages on room join
- [ ] Infinite scroll up to load older messages
  - [ ] "Load more" button at top
  - [ ] Loading skeleton
- [ ] Message timestamps
  - [ ] Relative times ("2 hours ago")
  - [ ] Grouped by day dividers
- [ ] Delete message button (own messages only)
  - [ ] Confirm dialog
  - [ ] Soft delete (shows "[deleted]")

#### Search & History (1 day)
- [ ] Chat search feature
  - [ ] Search input in chat panel
  - [ ] Search results highlight matching messages
  - [ ] Click to jump to message
- [ ] Room chat history page
  - [ ] `/rooms/[id]/history`
  - [ ] Full searchable archive
  - [ ] Export chat (CSV) button

**Estimated Time:** 5 days
**Dependencies:** None

---

## 🎯 PHASE 4: DISCOVERY & RECOMMENDATIONS (Weeks 10-12)
**Priority:** 🟡 MEDIUM - Improves content discovery

### Sprint 4.1: Trending & Popular (Week 10)
**Status:** Not Started | **Impact:** MEDIUM

#### Database & Backend - Trending Algorithm (3 days)
- [ ] Create trending calculation logic
  - [ ] Room scoring based on:
    - [ ] Listener count (current)
    - [ ] Listener growth rate (last hour)
    - [ ] Recent activity (messages, reactions)
    - [ ] Room age (newer rooms boosted)
  - [ ] Track scoring based on:
    - [ ] Reaction count (last 24h)
    - [ ] Rooms playing it
    - [ ] Shares count
- [ ] Create trending API endpoints
  - [ ] `GET /api/trending/rooms` - Top 20 trending rooms
  - [ ] `GET /api/trending/tracks` - Top 20 trending tracks
  - [ ] `GET /api/trending/genres` - Top 10 trending genres
- [ ] Cron job to recalculate trending
  - [ ] Run every 10 minutes
  - [ ] Cache results

#### Database - Popular Content (1 day)
- [ ] Create `popular_rooms` table (cache)
  - room_id, score, rank, period ('day', 'week', 'month'), calculated_at
- [ ] Create popular API endpoints
  - [ ] `GET /api/popular/rooms?period=week` - Popular rooms
  - [ ] `GET /api/popular/genres?period=week` - Popular genres

#### UI - Trending Page (2 days)
- [ ] Create trending page (`/trending`)
  - [ ] Tab navigation: Rooms | Tracks | Genres
  - [ ] Trending rooms list
    - [ ] Room card with current track
    - [ ] Trend indicator (🔥 trending up, 📈 rising)
    - [ ] Join button
  - [ ] Trending tracks list
    - [ ] Track card with album art
    - [ ] Reaction count, play count
    - [ ] Play on Spotify button
  - [ ] Trending genres
    - [ ] Genre cards with room count
    - [ ] Click to discover rooms
- [ ] Add trending widget to home page
  - [ ] "🔥 Trending Now" section
  - [ ] Top 5 trending rooms
  - [ ] "See all" link to trending page

**Estimated Time:** 6 days
**Dependencies:** Reactions, Room likes

---

### Sprint 4.2: Recommendation Engine (Week 11)
**Status:** Not Started | **Impact:** MEDIUM

#### Database & Backend - Recommendations (4 days)
- [ ] User taste profile generation
  - [ ] Analyze user's:
    - [ ] Rooms joined
    - [ ] Tracks reacted to
    - [ ] Genres listened to
    - [ ] Friends' music taste
  - [ ] Generate taste vector (genre preferences)
- [ ] Room recommendation algorithm
  - [ ] Collaborative filtering (users like you also liked...)
  - [ ] Content-based filtering (genre matching)
  - [ ] Social signals (friends are in this room)
  - [ ] Diversity (don't recommend only one genre)
- [ ] Create recommendations API endpoints
  - [ ] `GET /api/recommendations/rooms` - Recommended rooms for user
  - [ ] `GET /api/recommendations/users` - Similar users (friend suggestions)
  - [ ] `GET /api/recommendations/similar-rooms?roomId=X` - Similar rooms
- [ ] Cron job to pre-generate recommendations
  - [ ] Run daily for all active users
  - [ ] Cache results

#### UI - Recommendations (2 days)
- [ ] "For You" section on home page
  - [ ] "Recommended rooms" carousel
  - [ ] Reason tags ("Friends are listening", "Based on your taste", "Popular in your genres")
- [ ] "Similar rooms" widget on room page
  - [ ] Shows 3-5 similar rooms
  - [ ] Below comments section
  - [ ] Join buttons
- [ ] Enhanced friend suggestions
  - [ ] Friend suggestions page (`/discover/friends`)
  - [ ] Cards with:
    - [ ] Mutual friends count
    - [ ] Shared genres
    - [ ] Recent activity
    - [ ] Add friend button

**Estimated Time:** 6 days
**Dependencies:** User activity data (reactions, room joins)

---

### Sprint 4.3: Enhanced Search & Filters (Week 12)
**Status:** Not Started | **Impact:** LOW

#### Backend - Advanced Search (2 days)
- [ ] Implement full-text search for:
  - [ ] Rooms (by name, description, genres)
  - [ ] Users (by name, bio, top genres)
  - [ ] Tracks (by name, artist, album)
  - [ ] Posts (by content, attached track)
- [ ] Add search filters
  - [ ] By activity (active now, active today, active this week)
  - [ ] By size (1-5, 6-20, 21-50 listeners)
  - [ ] By type (public, profile)
  - [ ] By genre (multi-select)
- [ ] Create unified search endpoint
  - [ ] `GET /api/search?q=query&type=rooms&filters=...`
  - [ ] Returns results with scores

#### UI - Search Page (3 days)
- [ ] Create dedicated search page (`/search`)
  - [ ] Search input with autocomplete
  - [ ] Tab navigation: All | Rooms | Users | Tracks | Posts
  - [ ] Advanced filters panel
    - [ ] Collapsible side panel
    - [ ] Filter chips (genre, activity, size)
    - [ ] Clear all button
  - [ ] Results list with relevance scoring
  - [ ] Empty state with suggestions
- [ ] Search history (localStorage)
  - [ ] Recent searches dropdown
  - [ ] Clear history button
- [ ] Search suggestions
  - [ ] "Top searches"
  - [ ] "Trending searches"

**Estimated Time:** 5 days
**Dependencies:** None

---

## 🎯 PHASE 5: GAMIFICATION & RETENTION (Weeks 13-15)
**Priority:** 🟢 LOW - Fun but not essential

### Sprint 5.1: Achievements & Badges (Week 13)
**Status:** Not Started | **Impact:** LOW

#### Database & Backend (3 days)
- [ ] Create `achievements` table (master list)
  - id, name, description, icon, category, points
- [ ] Create `user_achievements` table
  - id, user_id, achievement_id, earned_at, progress (for multi-step achievements)
- [ ] Define achievement types
  - [ ] "First Friend" - Make your first friend
  - [ ] "Social Butterfly" - Make 10 friends
  - [ ] "Music Connector" - Make 50 friends
  - [ ] "Host Newbie" - Host your first room
  - [ ] "Party Starter" - Host 10 rooms
  - [ ] "Venue Owner" - Host 100 rooms
  - [ ] "Genre Explorer" - Listen in 10 different genres
  - [ ] "Music Guru" - React to 100 tracks
  - [ ] "Chat Champion" - Send 500 messages
  - [ ] "Early Adopter" - Joined in first month
- [ ] Create achievements API endpoints
  - [ ] `GET /api/achievements` - Get all achievements
  - [ ] `GET /api/users/[userId]/achievements` - Get user's achievements
  - [ ] `POST /api/achievements/check` - Check and award achievements (called after actions)

#### Achievement Checking Logic (2 days)
- [ ] Integrate achievement checks into:
  - [ ] Friend system (after accepting friend)
  - [ ] Room creation (after creating room)
  - [ ] Chat system (after sending message)
  - [ ] Track reactions (after reacting)
  - [ ] Room joins (genre diversity check)
- [ ] Achievement notification
  - [ ] Send notification when earned
  - [ ] Socket.io event with celebration animation

#### UI - Achievements (2 days)
- [ ] Achievements page (`/achievements`)
  - [ ] Grid of all achievements
  - [ ] Earned achievements highlighted
  - [ ] Locked achievements grayed out
  - [ ] Progress bars for multi-step
  - [ ] Category filters
- [ ] Achievement showcase on profile
  - [ ] "Pinned achievements" section (user selects 3-5 favorites)
  - [ ] Badge icons displayed
- [ ] Achievement unlock modal
  - [ ] Confetti animation
  - [ ] Achievement details
  - [ ] Share button (post about it)

**Estimated Time:** 7 days
**Dependencies:** Notifications

---

### Sprint 5.2: User Levels & Reputation (Week 14)
**Status:** Not Started | **Impact:** LOW

#### Database & Backend (3 days)
- [ ] Add `level` and `experience_points` to `users` table
- [ ] Define XP earning actions
  - [ ] Friend added: +10 XP
  - [ ] Room hosted: +20 XP
  - [ ] Track reaction: +5 XP
  - [ ] Comment made: +5 XP
  - [ ] Post made: +10 XP
  - [ ] Achievement earned: +50 XP
  - [ ] Daily login streak: +5 XP per day
- [ ] Create level calculation logic
  - [ ] Level 1: 0-100 XP
  - [ ] Level 2: 100-250 XP
  - [ ] Level 3: 250-500 XP
  - [ ] Level progression: exponential curve
  - [ ] Max level: 100
- [ ] Add XP award function
  - [ ] Award XP after actions
  - [ ] Check for level up
  - [ ] Send level-up notification

#### UI - Level Display (2 days)
- [ ] Level badge on user profiles
  - [ ] Level number with icon
  - [ ] XP progress bar to next level
  - [ ] "Level X - Music Enthusiast" title
- [ ] Level badge in chat
  - [ ] Small badge next to username
- [ ] Level-up modal
  - [ ] Celebration animation
  - [ ] New perks unlocked (if any)
- [ ] Leaderboard page (`/leaderboard`)
  - [ ] Top 100 users by level
  - [ ] Current week's top XP earners
  - [ ] Friends leaderboard

#### Level Perks (1 day)
- [ ] Define perks by level
  - [ ] Level 5: Custom profile theme
  - [ ] Level 10: Pin 5 achievements (instead of 3)
  - [ ] Level 20: Create rooms with 100 users (instead of 50)
  - [ ] Level 50: Verified badge on profile
- [ ] Display locked perks
  - [ ] "Unlock at level X" tooltip

**Estimated Time:** 6 days
**Dependencies:** Achievements

---

### Sprint 5.3: Daily Challenges & Streaks (Week 15)
**Status:** Not Started | **Impact:** LOW

#### Database & Backend (3 days)
- [ ] Create `daily_challenges` table
  - id, date, challenge_type, target_value, reward_xp, reward_achievement_id
- [ ] Create `user_challenge_progress` table
  - id, user_id, challenge_id, progress, completed, completed_at
- [ ] Define daily challenge types
  - [ ] "Join 3 different rooms"
  - [ ] "React to 10 tracks"
  - [ ] "Send 20 chat messages"
  - [ ] "Make 1 new friend"
  - [ ] "Post about a song"
- [ ] Create challenges API endpoints
  - [ ] `GET /api/challenges/daily` - Get today's challenges
  - [ ] `GET /api/challenges/progress` - Get user's progress
  - [ ] Progress tracking (auto-updated as user acts)
- [ ] Cron job to generate daily challenges
  - [ ] Run at midnight UTC
  - [ ] Select 3 random challenges

#### Login Streak System (2 days)
- [ ] Add `login_streak` and `last_login_date` to `users` table
- [ ] Track login streaks
  - [ ] Increment streak on first action of day
  - [ ] Reset streak if >24h since last login
- [ ] Streak rewards
  - [ ] 3 days: +50 XP
  - [ ] 7 days: +150 XP, achievement
  - [ ] 30 days: +500 XP, special badge
  - [ ] 100 days: +2000 XP, legendary badge

#### UI - Challenges (2 days)
- [ ] Daily challenges widget on home page
  - [ ] Card showing 3 challenges
  - [ ] Progress bars for each
  - [ ] Claim reward button when complete
  - [ ] Resets at midnight
- [ ] Login streak banner
  - [ ] Fire icon + "X day streak!"
  - [ ] Next milestone countdown
  - [ ] Claim daily bonus button

**Estimated Time:** 7 days
**Dependencies:** User levels

---

## 🎯 PHASE 6: POLISH & ADVANCED FEATURES (Weeks 16+)
**Priority:** 🟢 OPTIONAL - Nice to have

### Advanced Profile Customization
- [ ] Custom profile themes/colors
- [ ] Profile background image
- [ ] Custom layouts
- [ ] Profile music (auto-play a track)

### Collaborative Playlists
- [ ] Create shareable playlists
- [ ] Friends can add to playlists
- [ ] Playlist queue in rooms
- [ ] Voting system for next track

### Room Invites & Scheduling
- [ ] Invite specific friends to room
- [ ] Schedule listening parties
- [ ] Calendar integration
- [ ] RSVP system

### Advanced Notifications
- [ ] Email notifications (digest)
- [ ] Push notifications (web push API)
- [ ] Notification preferences
- [ ] Quiet hours setting

### Analytics Dashboard
- [ ] User stats page
  - [ ] Listening time
  - [ ] Top genres (over time)
  - [ ] Top rooms
  - [ ] Friend activity
- [ ] Room analytics (for hosts)
  - [ ] Listener trends
  - [ ] Peak hours
  - [ ] Most played tracks

### Content Moderation
- [ ] Admin dashboard
- [ ] Review reported content
- [ ] User moderation tools
- [ ] Content filtering

### Mobile App
- [ ] React Native app
- [ ] Same features as web
- [ ] Push notifications
- [ ] App Store / Play Store

---

## 📊 OVERALL PROGRESS TRACKER

### Phase Completion
- [ ] Phase 1: Core Social Foundation (Weeks 1-3)
- [ ] Phase 2: Engagement Mechanics (Weeks 4-6)
- [ ] Phase 3: Content & Feed (Weeks 7-9)
- [ ] Phase 4: Discovery & Recommendations (Weeks 10-12)
- [ ] Phase 5: Gamification & Retention (Weeks 13-15)
- [ ] Phase 6: Polish & Advanced Features (Weeks 16+)

### Feature Completeness by Category
- [ ] Notifications: 0% → 100% (Phase 1)
- [ ] User Safety: 0% → 100% (Phase 1)
- [ ] Profiles: 40% → 95% (Phase 1)
- [ ] Engagement: 25% → 85% (Phase 2)
- [ ] Content: 0% → 90% (Phase 3)
- [ ] Discovery: 70% → 95% (Phase 4)
- [ ] Gamification: 0% → 85% (Phase 5)
- [ ] **OVERALL: 52% → 92%+**

---

## 🎯 IMMEDIATE NEXT STEPS

### This Week: Start Phase 1.1 - Notifications
1. Create notifications database table
2. Build notification API endpoints
3. Integrate Socket.io events
4. Build notification UI components
5. Implement initial notification types

**Let's start building!** 🚀
