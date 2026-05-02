import { useApolloClient, useQuery } from '@apollo/client';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GET_DASHBOARD_DATA, GET_COURSES_AND_TOPICS } from '../graphql/queries';
import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';

interface DashboardSessionParticipant {
  id: string;
  userId: string;
  status: string;
}

interface DashboardSession {
  id: string;
  topic: string;
  date: string;
  duration: number;
  sessionType: string;
  location?: string;
  meetingLink?: string;
  status: string;
  participants: DashboardSessionParticipant[];
}

interface CourseItem {
  id: string;
  name: string;
}

interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  academicYear?: string;
}

interface MatchResult {
  id: string;
  candidateUserId: string;
  compatibility: number;
  reasons: string[];
}

interface DashboardData {
  getMySessions: DashboardSession[];
  myNotifications: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }>;
  getRecommendedMatches: MatchResult[];
  meProfile?: {
    courses: CourseItem[];
  };
  getAllUsers: UserSummary[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const apolloClient = useApolloClient();
  const [commonCoursesByCandidate, setCommonCoursesByCandidate] = useState<Record<string, string[]>>({});

  const { data, loading, error } = useQuery<DashboardData>(GET_DASHBOARD_DATA, {
    variables: { notificationLimit: 5, matchLimit: 5 },
    fetchPolicy: 'cache-and-network',
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

  const formatDate = (value?: string) => {
    if (!value) return 'Unknown date';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  useEffect(() => {
    if (!data || !user || !data.getRecommendedMatches?.length || !data.meProfile) return;

    const matches = data.getRecommendedMatches;
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

      if (!cancelled) {
        setCommonCoursesByCandidate(map);
      }
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

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

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

  const sessions = data?.getMySessions ?? [];
  const notifications = data?.myNotifications ?? [];
  const buddies = data?.getRecommendedMatches ?? [];
  const usersById = new Map(data?.getAllUsers?.map((u) => [u.id, u]) ?? []);

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

  return (
    <div className={styles.page}>
      <div className={styles.content}>

          <section className={styles.dashboardHeader}>
            <div>
              <p className={styles.sectionLabel}>Dashboard</p>
              <h1 className={styles.title}>Welcome back, {user.firstName}!</h1>
              <p className={styles.subtitle}>
                Here’s what’s happening with your study sessions today.
              </p>
            </div>

            <div className={styles.actionCards}>
              <button
                type="button"
                className={`${styles.actionCard} ${styles.actionMagenta}`}
                onClick={() => navigate('/find-buddies')}
              >
                <p className={styles.actionLabel}>Find Study Buddies</p>
                <p>Discover matches in your network.</p>
              </button>
              <button
                type="button"
                className={`${styles.actionCard} ${styles.actionTeal}`}
                onClick={() => navigate('/study-sessions')}
              >
                <p className={styles.actionLabel}>Create Study Session</p>
                <p>Schedule a new session with your group.</p>
              </button>
              <button
                type="button"
                className={`${styles.actionCard} ${styles.actionGreen}`}
                onClick={() => navigate('/availability')}
              >
                <p className={styles.actionLabel}>Manage Availability</p>
                <p>Keep your schedule up to date.</p>
              </button>
            </div>
          </section>

          <section className={styles.gridArea}>
            <div className={styles.upcomingCard}>
              <div className={styles.cardHeader}>
                <div>
                  <h2>Upcoming Study Sessions</h2>
                  <p>Scheduled sessions this week.</p>
                </div>
                <button className="btn-ghost" type="button" onClick={() => navigate('/study-sessions')}>View All</button>
              </div>

              <div className={styles.sessionList}>
                {sessions.length > 0 ? (
                  sessions.map((session) => (
                    <div key={session.id} className={styles.sessionItem}>
                      <div>
                        <p className={styles.sessionTitle}>{session.topic}</p>
                        <p className={styles.sessionMeta}>{formatDate(session.date)}</p>
                        <p className={styles.sessionParticipants}>
                          {session.participants.length} participant{session.participants.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      <span className={styles.sessionBadge}>
                        {session.sessionType.toUpperCase() === 'ONLINE' ? 'Online' : session.location ?? 'In-person'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>No upcoming sessions found.</div>
                )}
              </div>
            </div>

            <div className={styles.notificationsCard}>
              <div className={styles.cardHeader}>
                <div>
                  <h2>Recent Notifications</h2>
                  <p>Stay updated on your activity.</p>
                </div>
              </div>

              <div className={styles.notificationList}>
                {notifications.length > 0 ? (
                  notifications.map((note) => (
                    <div key={note.id} className={styles.notificationItem}>
                      <p>{note.title || note.message}</p>
                      <span>{formatDate(note.createdAt)}</span>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>No new notifications yet.</div>
                )}
              </div>
            </div>

            <div className={styles.recommendedCard}>
              <div className={styles.cardHeader}>
                <div>
                  <h2>Recommended Study Buddies</h2>
                  <p>Matches based on your profile.</p>
                </div>
                <button className="btn-ghost" type="button" onClick={() => navigate('/find-buddies')}>View All</button>
              </div>

              <div className={styles.buddyList}>
                {buddies.length > 0 ? (
                  buddies.map((buddy) => (
                    <div key={buddy.id} className={styles.buddyItem}>
                      <div className={styles.buddyProfile}>
                        <div className={styles.buddyAvatar}>{getBuddyInitials(buddy.candidateUserId)}</div>
                        <div>
                          <div className={styles.buddyHeader}>
                            <p className={styles.buddyName}>{getBuddyDisplayName(buddy.candidateUserId)}</p>
                            <span className={styles.matchPill}>{formatPercentage(buddy.compatibility)} Match</span>
                          </div>
                          <p className={styles.buddyRole}>{getBuddyRole(buddy.candidateUserId)}</p>
                          <div className={styles.tagGroup}>
                            {[
                              ...(commonCoursesByCandidate[buddy.candidateUserId] ?? []),
                              ...buddy.reasons.filter((reason) => !reason.startsWith('Shared courses'))
                            ].slice(0, 4).map((reason) => (
                              <span key={`${buddy.id}-${reason}`} className={styles.tag}>{reason}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className={styles.buddyActions}>
                        <button className="btn-primary" type="button">Connect</button>
                        <button className="btn-outline" type="button">View Profile</button>
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
