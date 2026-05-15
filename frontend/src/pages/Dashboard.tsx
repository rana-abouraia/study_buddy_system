import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GET_DASHBOARD_DATA, GET_COURSES_AND_TOPICS } from '../graphql/queries';
import { SEND_BUDDY_REQUEST, MARK_NOTIFICATION_AS_READ } from '../graphql/mutations';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CourseItem, DashboardData } from '../types';
import { dedupeNotifications, formatNotificationTimeAgo, isConnectedMatchNotification, isSelfMatchNotification } from '../utils/notifications';
import styles from '../styles/pages/Dashboard.module.css';

const DASHBOARD_MATCH_LIMIT = 12;

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const apolloClient = useApolloClient();
  const searchTerm = (searchParams.get('search') ?? '').trim().toLowerCase();

  const [commonCoursesByCandidate, setCommonCoursesByCandidate] =
    useState<Record<string, string[]>>({});

  const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());
  const [connectError, setConnectError] = useState('');

  const { data, loading, error } = useQuery<DashboardData>(
    GET_DASHBOARD_DATA,
    {
      variables: {
        notificationLimit: 100,
        matchLimit: DASHBOARD_MATCH_LIMIT,
      },
      fetchPolicy: 'cache-first',
      nextFetchPolicy: 'cache-and-network',
    }
  );

  const [sendBuddyRequest, { loading: sendingBuddyRequest }] = useMutation(
    SEND_BUDDY_REQUEST,
    {
      // Refetch so outgoingBuddyRequests updates and the list re-derives from DB
      refetchQueries: [
        {
          query: GET_DASHBOARD_DATA,
          variables: {
            notificationLimit: 100,
            matchLimit: DASHBOARD_MATCH_LIMIT,
          },
        },
      ],
      awaitRefetchQueries: true,
    }
  );

  const [markNotificationAsRead] = useMutation(MARK_NOTIFICATION_AS_READ, {
    update(cache, { data }) {
      if (!data?.markNotificationAsRead) return;

      cache.modify({
        id: cache.identify({
          __typename: 'Notification',
          id: data.markNotificationAsRead.id,
        }),
        fields: {
          isRead: () => true,
          readAt: () => data.markNotificationAsRead.readAt,
        },
      });

      cache.modify({
        fields: {
          unreadNotificationsCount(existing = 0) {
            return Math.max(0, existing - 1);
          },
        },
      });
    },
  });

  const formatPercentage = (value: number) => {
    if (value === null || value === undefined) return '-';
    const formatted = value > 1 ? Math.round(value) : Math.round(value * 100);
    return `${formatted}%`;
  };

  const formatBuddyName = (id: string) => {
    if (!id) return 'Study Buddy';
    const pieces = id.split(/[-_.]/).filter(Boolean);
    const name = pieces.length >= 2 ? `${pieces[0]} ${pieces[1]}` : pieces[0] || id;
    return name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  useEffect(() => {
    if (!data || !user || !data.getRecommendedMatches?.length || !data.meProfile) {
      return;
    }

    const connectedIds = new Set(data.getMyBuddies ?? []);

    const matches = data.getRecommendedMatches.filter(
      (match) =>
        match.candidateUserId !== user.id &&
        !connectedIds.has(match.candidateUserId)
    );

    const currentCourses = new Set(
      data.meProfile.courses.map((course) => course.name.trim().toLowerCase())
    );

    let cancelled = false;

    async function loadCandidateCourses() {
      const map: Record<string, string[]> = {};

      await Promise.all(
        matches.map(async (buddy) => {
          try {
            const result = await apolloClient.query<{
              getCoursesAndTopics: { courses: CourseItem[] };
            }>({
              query: GET_COURSES_AND_TOPICS,
              variables: { userId: buddy.candidateUserId },
              fetchPolicy: 'network-only',
            });

            const candidateCourses = result.data.getCoursesAndTopics?.courses ?? [];
            map[buddy.candidateUserId] = candidateCourses
              .map((course) => course.name)
              .filter((name) => currentCourses.has(name.trim().toLowerCase()));
          } catch {
            map[buddy.candidateUserId] = [];
          }
        })
      );

      if (!cancelled) setCommonCoursesByCandidate(map);
    }

    loadCandidateCourses();

    return () => {
      cancelled = true;
    };
  }, [apolloClient, data, user]);

  if (!user) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingDot} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingDot} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.loadingScreen}>
        <p>Unable to load dashboard data. Please refresh or try again later.</p>
      </div>
    );
  }

  const connectedIds = new Set(data?.getMyBuddies ?? []);

  // IDs we've already sent a request to — sourced from DB, not local state
  const outgoingIds = new Set(
    data?.getOutgoingBuddyRequests?.map((req) => req.receiverId) ?? []
  );

  const usersById = new Map(data?.getAllUsers?.map((u) => [u.id, u]) ?? []);

  const matchesSearch = (...values: Array<string | undefined | null>) =>
    !searchTerm || values.some((value) => value?.toLowerCase().includes(searchTerm));

  const getBuddyDisplayName = (id: string) => {
    const buddy = usersById.get(id);
    if (!buddy) return formatBuddyName(id);
    return `${buddy.firstName} ${buddy.lastName}`;
  };

  const getBuddyInitials = (id: string) => {
    const buddy = usersById.get(id);
    if (buddy) {
      return `${buddy.firstName?.[0] ?? ''}${buddy.lastName?.[0] ?? ''}`.toUpperCase();
    }
    if (!id) return 'SB';
    const pieces = id.split(/[-_.]/).filter(Boolean);
    const initials = pieces.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
    return initials || id.slice(0, 2).toUpperCase();
  };

  const getBuddyRole = (id: string) => {
    const buddy = usersById.get(id);
    return buddy?.academicYear ? buddy.academicYear : 'Study Buddy';
  };

  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);

  const sessions = (data?.getMySessions ?? [])
    .filter((session) => {
      const sessionDate = new Date(session.date);
      const status = session.status?.toUpperCase?.() ?? '';
      return (
        sessionDate >= now &&
        sessionDate <= endOfWeek &&
        status !== 'COMPLETED' &&
        status !== 'CANCELLED' &&
        matchesSearch(session.topic, session.location, session.sessionType)
      );
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  const dashboardNotifications = (data?.myNotifications ?? []).filter(
    (notification) => (
      !isSelfMatchNotification(notification, user) &&
      !isConnectedMatchNotification(notification, data?.getMyBuddies ?? [], usersById)
    )
  );
  const notifications = dedupeNotifications(dashboardNotifications).slice(0, 5);

  // Exclude already-connected AND already-requested candidates — both sourced from DB
  const buddies = (data?.getRecommendedMatches ?? [])
    .filter((match) =>
      match.candidateUserId !== user.id &&
      !connectedIds.has(match.candidateUserId) &&
      !outgoingIds.has(match.candidateUserId) &&
      matchesSearch(
        getBuddyDisplayName(match.candidateUserId),
        getBuddyRole(match.candidateUserId),
        ...(commonCoursesByCandidate[match.candidateUserId] ?? []),
        ...match.reasons
      )
    )
    .slice(0, 3);

  const handleConnect = async (candidateUserId: string) => {
    setConnectError('');
    try {
      await sendBuddyRequest({ variables: { receiverId: candidateUserId } });
      // No local state update needed — awaitRefetchQueries updates outgoingIds from DB
    } catch (err) {
      setConnectError(
        err instanceof Error ? err.message : 'Could not send this buddy request.'
      );
    }
  };

  const handleViewProfile = (matchId: string) => {
    navigate('/find-buddies', { state: { selectedMatchId: matchId } });
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <section className={styles.dashboardHeader}>
          <div>
            <h1 className={styles.title}>Welcome back, {user.firstName}!</h1>
            <p className={styles.subtitle}>
              Here's what's happening with your study sessions today.
            </p>
          </div>

          <div className={styles.actionCards}>
            {/* FIND BUDDIES */}
            <button
              type="button"
              className={`${styles.actionCard} ${styles.actionMagentaFeatured}`}
              onClick={() => navigate('/find-buddies')}
            >
              <div className={styles.featuredActionContent}>
                <div className={styles.featuredActionIcon}>
                  <svg className={styles.featuredActionUserPlus} viewBox="0 0 24 24">
                    <path d="M15 19a6 6 0 0 0-12 0" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M19 8v6" />
                    <path d="M22 11h-6" />
                  </svg>
                </div>
                <div className={styles.featuredActionText}>
                  <p className={styles.actionLabel}>Find Study Buddies</p>
                  <p>Discover compatible students based on your courses.</p>
                </div>
              </div>
            </button>

            {/* CREATE SESSION */}
            <button
              type="button"
              className={`${styles.actionCard} ${styles.actionTealFeatured}`}
              onClick={() => navigate('/study-sessions')}
            >
              <div className={styles.featuredActionContent}>
                <div className={styles.featuredActionIcon}>
                  <svg className={styles.featuredActionCalendar} viewBox="0 0 24 24">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4" />
                    <path d="M8 3v4" />
                    <path d="M3 10h18" />
                  </svg>
                </div>
                <div className={styles.featuredActionText}>
                  <p className={styles.actionLabel}>Create Study Session</p>
                  <p>Schedule collaborative study sessions with your group.</p>
                </div>
              </div>
            </button>

            {/* AVAILABILITY */}
            <button
              type="button"
              className={`${styles.actionCard} ${styles.actionGreenFeatured}`}
              onClick={() => navigate('/availability')}
            >
              <div className={styles.featuredActionContent}>
                <div className={styles.featuredActionIcon}>
                  <svg className={styles.featuredActionClock} viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 3" />
                  </svg>
                </div>
                <div className={styles.featuredActionText}>
                  <p className={styles.actionLabel}>Manage Availability</p>
                  <p>Update your available study hours and preferences.</p>
                </div>
              </div>
            </button>
          </div>
        </section>

        <section className={styles.gridArea}>
          {/* UPCOMING SESSIONS */}
          <div className={styles.upcomingCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Upcoming Study Sessions</h2>
                <p>Your scheduled sessions this week</p>
              </div>
              <button className="btn-ghost" type="button" onClick={() => navigate('/study-sessions')}>
                View All
              </button>
            </div>

            <div className={styles.sessionList}>
              {sessions.length > 0 ? sessions.map((session) => {
                const sessionDate = new Date(session.date);
                const isToday = sessionDate.toDateString() === new Date().toDateString();
                const endTime = new Date(sessionDate.getTime() + session.duration * 60000);
                const timeStr = `${sessionDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
                const otherParticipants = session.participants.filter((p) => p.userId !== user?.id);
                const participantNames = otherParticipants.slice(0, 2).map((p) => {
                  const participantUser = usersById.get(p.userId);
                  return participantUser ? `${participantUser.firstName} ${participantUser.lastName}` : 'Someone';
                }).join(', ');
                const remainingCount = otherParticipants.length - 2;
                const participantText = otherParticipants.length > 0
                  ? remainingCount > 0
                    ? `With ${participantNames}, ${remainingCount} other${remainingCount === 1 ? '' : 's'}`
                    : `With ${participantNames}`
                  : 'No other participants';
                const isOnline = session.sessionType.toUpperCase() === 'ONLINE';

                return (
                  <div key={session.id} className={styles.sessionItem}>
                    {isOnline ? (
                      <div className={styles.onlineIconBadge} style={{ background: '#BE185D' }}>
                        <svg viewBox="0 0 24 24" className={styles.sessionIcon} style={{ stroke: 'white' }}>
                          <rect x="2" y="7" width="15" height="10" rx="2" />
                          <path d="M17 9l5-2v10l-5-2V9z" />
                        </svg>
                      </div>
                    ) : (
                      <div className={styles.inpersonIconBadge} style={{ background: '#BE185D' }}>
                        <svg viewBox="0 0 24 24" className={styles.sessionIcon} style={{ stroke: 'white' }}>
                          <path d="M12 21s-7-6.75-7-11a7 7 0 0 1 14 0c0 4.25-7 11-7 11z" />
                          <circle cx="12" cy="10" r="2.5" />
                        </svg>
                      </div>
                    )}
                    <div className={styles.sessionInfo}>
                      <p className={styles.sessionTitle}>{session.topic}</p>
                      <p className={styles.sessionMeta}>
                        {isToday ? 'Today' : sessionDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} • {timeStr}
                      </p>
                      <p className={styles.sessionParticipants}>{participantText}</p>
                    </div>
                    <div className={styles.sessionTypeText}>
                      <span className={isOnline ? styles.onlineText : styles.inpersonText}>
                        {isOnline ? 'Online' : 'In-Person'}
                      </span>
                    </div>
                  </div>
                );
              }) : (
                <div className={styles.emptyState}>No upcoming sessions this week.</div>
              )}
            </div>
          </div>

          {/* NOTIFICATIONS */}
          <div className={styles.notificationsCard}>
            <div className={styles.cardHeader}>
              <h2>Recent Notifications</h2>
            </div>

            <div className={styles.notificationList}>
              {notifications.length > 0 ? (
                notifications.map((note) => {
                  const notificationText = note.title || note.message;
                  const isRead = note.isRead || note.duplicateUnreadIds.every((id) => readNotificationIds.has(id));

                  const getNotificationRoute = () => {
                    const type = note.type?.toLowerCase?.() || '';
                    const message = notificationText.toLowerCase();
                    if (type.includes('message') || message.includes('message')) return '/messages';
                    if (type.includes('session') || message.includes('session')) return '/study-sessions';
                    if (type.includes('buddy') || type.includes('match') || message.includes('buddy') || message.includes('match')) return '/find-buddies';
                    return '/notifications';
                  };

                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={async () => {
                        if (!isRead) {
                          setReadNotificationIds((prev) => {
                            const next = new Set(prev);
                            note.duplicateUnreadIds.forEach((id) => next.add(id));
                            return next;
                          });
                          await Promise.all(
                            note.duplicateUnreadIds.map((id) =>
                              markNotificationAsRead({ variables: { id } }).catch(() => null)
                            )
                          );
                        }
                        navigate(getNotificationRoute());
                      }}
                      className={`${styles.notificationItem} ${!isRead ? styles.notificationUnread : styles.notificationRead}`}
                    >
                      <div className={styles.notificationContent}>
                        <div className={styles.notificationTop}>
                          {!isRead && <span className={styles.notificationDot} />}
                          <p>{notificationText}</p>
                        </div>
                        <span className={styles.notificationTime}>
                          {formatNotificationTimeAgo(note.createdAt)}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className={styles.emptyState}>No new notifications yet.</div>
              )}

              <button
                type="button"
                className={styles.viewAllNotifications}
                onClick={() => navigate('/notifications')}
              >
                View All Notifications
              </button>
            </div>
          </div>

          {/* RECOMMENDED BUDDIES */}
          <div className={styles.recommendedCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2>Recommended Study Buddies</h2>
                <p>Matches based on your profile</p>
              </div>
              <button className="btn-ghost" type="button" onClick={() => navigate('/find-buddies')}>
                View All
              </button>
            </div>

            <div className={styles.buddyList}>
              {connectError ? (
                <div className={styles.inlineError}>{connectError}</div>
              ) : null}

              {buddies.length > 0 ? (
                buddies.map((buddy) => (
                  <div key={buddy.id} className={styles.buddyItem}>
                    <div className={styles.buddyContent}>
                      <div className={styles.buddyAvatarCircle}>
                        {getBuddyInitials(buddy.candidateUserId)}
                      </div>
                      <div className={styles.buddyInfo}>
                        <div className={styles.buddyNameRow}>
                          <p className={styles.buddyName}>
                            {getBuddyDisplayName(buddy.candidateUserId)}
                          </p>
                          <span className={styles.matchPill}>
                            {formatPercentage(buddy.compatibility)} Match
                          </span>
                        </div>
                        <p className={styles.buddyRole}>
                          {getBuddyRole(buddy.candidateUserId)}
                        </p>
                        <div className={styles.tagGroup}>
                          {[
                            ...(commonCoursesByCandidate[buddy.candidateUserId] ?? []),
                            ...buddy.reasons.filter((reason) => !reason.startsWith('Shared courses')),
                          ]
                            .slice(0, 4)
                            .map((reason) => (
                              <span key={`${buddy.id}-${reason}`} className={styles.tag}>
                                {reason}
                              </span>
                            ))}
                        </div>
                      </div>
                      <div className={styles.buddyActions}>
                        <button
                          className="btn-primary"
                          type="button"
                          disabled={sendingBuddyRequest}
                          onClick={() => handleConnect(buddy.candidateUserId)}
                        >
                          + Connect
                        </button>
                        <button
                          className="btn-outline"
                          type="button"
                          onClick={() => handleViewProfile(buddy.id)}
                        >
                          View Profile
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>No recommended buddies available yet.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
