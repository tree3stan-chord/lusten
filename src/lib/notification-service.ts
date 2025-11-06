/**
 * Notification Service
 * Handles creating and sending notifications via database + Socket.io
 */

import { createNotification, type Notification } from './sqlite-db';

interface NotificationParams {
  userId: string;
  type: Notification['type'];
  title: string;
  message: string;
  data?: Record<string, any>;
  link?: string;
}

/**
 * Create notification and store in database
 * The client will receive it via:
 * 1. Real-time Socket.io event (if connected)
 * 2. Polling the notifications endpoint
 * 3. On next page load
 *
 * For real-time delivery within Socket.io handlers, use emitNotificationToUser()
 */
export async function sendNotification(params: NotificationParams): Promise<Notification> {
  // Create notification in database
  const notification = createNotification(params);

  // Note: Real-time delivery happens via Socket.io in server.js
  // API routes can't directly access the Socket.io instance
  // Clients will receive notifications through:
  // - Socket.io events (for actions within socket handlers)
  // - Periodic polling (every 30 seconds)
  // - On navigation/page load

  return notification;
}

/**
 * Helper to format notification for Socket.io emission
 * Use this in server.js socket handlers
 */
export function formatNotificationForSocket(notification: Notification, data?: Record<string, any>) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: data || null,
    link: notification.link,
    is_read: notification.is_read,
    created_at: notification.created_at
  };
}

/**
 * Helper functions for common notification types
 */

export async function sendFriendRequestNotification(recipientId: string, requesterId: string, requesterName: string) {
  return sendNotification({
    userId: recipientId,
    type: 'friend_request',
    title: 'New Friend Request',
    message: `${requesterName} sent you a friend request`,
    data: { friend_id: requesterId },
    link: `/profile/${requesterId}`
  });
}

export async function sendFriendAcceptedNotification(recipientId: string, accepterId: string, accepterName: string) {
  return sendNotification({
    userId: recipientId,
    type: 'friend_accepted',
    title: 'Friend Request Accepted',
    message: `${accepterName} accepted your friend request`,
    data: { friend_id: accepterId },
    link: `/profile/${accepterId}`
  });
}

export async function sendFriendOnlineNotification(recipientId: string, friendId: string, friendName: string) {
  return sendNotification({
    userId: recipientId,
    type: 'friend_online',
    title: 'Friend is Online',
    message: `${friendName} is now online`,
    data: { friend_id: friendId },
    link: `/profile/${friendId}`
  });
}

export async function sendRoomInviteNotification(recipientId: string, roomId: string, roomName: string, inviterId: string, inviterName: string) {
  return sendNotification({
    userId: recipientId,
    type: 'room_invite',
    title: 'Room Invitation',
    message: `${inviterName} invited you to join ${roomName}`,
    data: { room_id: roomId, inviter_id: inviterId },
    link: `/room/${roomId}`
  });
}

export async function sendMentionNotification(recipientId: string, mentionerId: string, mentionerName: string, roomId: string, roomName: string, messagePreview: string) {
  return sendNotification({
    userId: recipientId,
    type: 'mention',
    title: 'You were mentioned',
    message: `${mentionerName} mentioned you in ${roomName}: "${messagePreview}"`,
    data: { room_id: roomId, mentioner_id: mentionerId },
    link: `/room/${roomId}`
  });
}

export async function sendSystemNotification(userId: string, title: string, message: string, link?: string) {
  return sendNotification({
    userId,
    type: 'system',
    title,
    message,
    link
  });
}
