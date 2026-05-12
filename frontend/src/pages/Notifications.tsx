import { useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GET_MY_NOTIFICATIONS } from '../graphql/queries';
import { MARK_NOTIFICATION_AS_READ, MARK_ALL_NOTIFICATIONS_AS_READ } from '../graphql/mutations';
import type { AppNotification, NotificationsData } from '../types';
import { countUnreadNotifications, dedupeNotifications, isConnectedMatchNotification, isSelfMatchNotification, replaceUserIdsWithNames } from '../utils/notifications';
import styles from '../styles/pages/Notifications.module.css';

const PAGE_SIZE = 20;
const MAX_NOTIFICATIONS = 100;

function formatTimeAgo(dateStr: string) {
  const numeric = Number(dateStr);
  const dateMs = Number.isNaN(numeric)
    ? new Date(dateStr).getTime()
    : numeric < 1_000_000_000_000
      ? numeric * 1000
      : numeric;

  if (Number.isNaN(dateMs)) return 'Just now';

  const diffMins = Math.max(0, Math.round((Date.now() - dateMs) / 60000));
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  const hours = Math.round(diffMins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function getIconStyle(type: string): { cls: string; svg: JSX.Element } {
  const t = type.toLowerCase();

  if (t.includes('match')) {
    return {
      cls: styles.iconWrapGreen,
      svg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    };
  }

  if (t.includes('accepted')) {
    return {
      cls: styles.iconWrapGreen,
      svg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      ),
    };
  }

  if (t.includes('request') || t.includes('buddy')) {
    return {
      cls: styles.iconWrapBlue,
      svg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      ),
    };
  }

  if (t.includes('reminder') || t.includes('upcoming')) {
    return {
      cls: styles.iconWrapOrange,
      svg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    };
  }

  if (t.includes('cancelled')) {
    return {
      cls: styles.iconWrapRed,
      svg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          <line x1="10" y1="14" x2="14" y2="18" /><line x1="14" y1="14" x2="10" y2="18" />
        </svg>
      ),
    };
  }

  if (t.includes('session') || t.includes('invitation') || t.includes('created') || t.includes('joined')) {
    return {
      cls: styles.iconWrapBlue,
      svg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    };
  }

  if (t.includes('message') || t.includes('notification-created')) {
    return {
      cls: styles.iconWrapPurple,
      svg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    };
  }

  return {
    cls: styles.iconWrapGray,
    svg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  };
}

function getNavigationTarget(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('match') || t.includes('request') || t.includes('received')) return '/find-buddies';
  if (t.includes('accepted')) return '/my-connections';
  if (t.includes('session') || t.includes('reminder') || t.includes('invitation') || t.includes('upcoming')) return '/study-sessions';
  if (t.includes('message') || t.includes('notification-created')) return '/messages';
  return '';
}

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

  const { data, loading, error } = useQuery<NotificationsData>(GET_MY_NOTIFICATIONS, {
    variables: { limit: MAX_NOTIFICATIONS },
    fetchPolicy: 'cache-and-network',
  });

  const [markRead] = useMutation(MARK_NOTIFICATION_AS_READ, {
    refetchQueries: [{ query: GET_MY_NOTIFICATIONS, variables: { limit: MAX_NOTIFICATIONS } }],
  });

  const [markAllRead, { loading: markingAll }] = useMutation(MARK_ALL_NOTIFICATIONS_AS_READ, {
    refetchQueries: [{ query: GET_MY_NOTIFICATIONS, variables: { limit: MAX_NOTIFICATIONS } }],
    awaitRefetchQueries: true,
  });

  const usersById = new Map(
    (data?.getAllUsers ?? []).map((user) => [
      user.id,
      user,
    ])
  );
  const displayNamesById = new Map(
    (data?.getAllUsers ?? []).map((user) => [
      user.id,
      `${user.firstName} ${user.lastName}`.trim(),
    ])
  );
  const allNotifications = (data?.myNotifications ?? []).filter(
    (notification) => (
      !isSelfMatchNotification(notification, user) &&
      !isConnectedMatchNotification(notification, data?.getMyBuddies ?? [], usersById)
    )
  );
  const notifications = dedupeNotifications(allNotifications);
  const visibleNotifications = notifications.slice(0, visibleLimit);
  const unreadCount = countUnreadNotifications(allNotifications);

  const hasMore = visibleNotifications.length < notifications.length;

  const handleClick = async (notification: AppNotification & { duplicateUnreadIds: string[] }) => {
    if (!notification.isRead) {
      await Promise.all(
        notification.duplicateUnreadIds.map((id) =>
          markRead({ variables: { id } })
        )
      );
    }
    const target = getNavigationTarget(notification.type);
    if (target) navigate(target);
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  const handleLoadMore = () => {
    setVisibleLimit((prev) => Math.min(prev + PAGE_SIZE, notifications.length));
  };

  if (loading && notifications.length === 0) {
    return <div className={styles.statePanel}>Loading notifications...</div>;
  }

  if (error) {
    return <div className={styles.statePanel}>Unable to load notifications. Please try again.</div>;
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Notifications</h1>
          <p>Stay updated with your study buddy activities</p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            className={styles.markAllBtn}
            onClick={handleMarkAllRead}
            disabled={markingAll}
          >
            {markingAll ? 'Marking...' : 'Mark all as read'}
          </button>
        )}
      </header>

      <div className={styles.listHeader}>
        <h2>All Notifications</h2>
        <div className={styles.countGroup}>
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>
              {unreadCount} unread
            </span>
          )}
        </div>
      </div>

      {visibleNotifications.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <h3>No notifications yet</h3>
          <p>Buddy matches, requests, and session reminders will appear here.</p>
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {visibleNotifications.map((notification) => {
              const { cls, svg } = getIconStyle(notification.type);
              const notificationMessage = replaceUserIdsWithNames(notification.message, displayNamesById);
              return (
                <article
                  key={notification.id}
                  className={`${styles.card} ${!notification.isRead ? styles.cardUnread : ''}`}
                  onClick={() => handleClick(notification)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleClick(notification)}
                >
                  <div className={`${styles.iconWrap} ${cls}`}>{svg}</div>

                  <div className={styles.cardBody}>
                    <div className={styles.cardTop}>
                      <strong className={styles.cardTitle}>{notification.title}</strong>
                      {!notification.isRead && <span className={styles.unreadDot} />}
                    </div>
                    <p className={styles.cardMessage}>{notificationMessage}</p>
                    <span className={styles.timeAgo}>{formatTimeAgo(notification.createdAt)}</span>
                  </div>
                </article>
              );
            })}
          </div>

          {hasMore && (
            <button
              type="button"
              className={styles.loadMoreBtn}
              onClick={handleLoadMore}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load more notifications'}
            </button>
          )}
        </>
      )}
    </section>
  );
}
