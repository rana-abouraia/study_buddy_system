import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Eye } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GET_CONNECTIONS_DATA, GET_COURSES_AND_TOPICS } from '../graphql/queries';
import { ACCEPT_BUDDY_REQUEST, REJECT_BUDDY_REQUEST } from '../graphql/mutations';
import type { BuddyRequest, ConnectionsData, ConnectionsTabKey, CourseItem } from '../types';
import styles from '../styles/pages/Connections.module.css';

const tabs: Array<{ key: ConnectionsTabKey; label: string; accent: string }> = [
  { key: 'incoming', label: 'Incoming Requests', accent: 'pink' },
  { key: 'outgoing', label: 'Outgoing Requests', accent: 'slate' },
  { key: 'buddies', label: 'Study Buddies', accent: 'green' },
];

export default function Connections() {
  const navigate = useNavigate();
  const apolloClient = useApolloClient();

  const [activeTab, setActiveTab] = useState<ConnectionsTabKey>('incoming');
  const [courseMap, setCourseMap] = useState<Record<string, string[]>>({});
  const [actionError, setActionError] = useState('');

  const { data, loading, error, refetch } = useQuery<ConnectionsData>(
    GET_CONNECTIONS_DATA,
    {
      fetchPolicy: 'cache-and-network',
    }
  );

  const [acceptRequest, { loading: accepting }] = useMutation(
    ACCEPT_BUDDY_REQUEST,
    {
      refetchQueries: [{ query: GET_CONNECTIONS_DATA }],
      awaitRefetchQueries: true,
    }
  );

  const [rejectRequest, { loading: rejecting }] = useMutation(
    REJECT_BUDDY_REQUEST,
    {
      refetchQueries: [{ query: GET_CONNECTIONS_DATA }],
      awaitRefetchQueries: true,
    }
  );

  const usersById = useMemo(
    () =>
      new Map(data?.getAllUsers?.map((user) => [user.id, user]) ?? []),
    [data?.getAllUsers]
  );

  const matchesByCandidate = useMemo(
    () =>
      new Map(
        data?.getRecommendedMatches?.map((match) => [
          match.candidateUserId,
          match,
        ]) ?? []
      ),
    [data?.getRecommendedMatches]
  );

  const idsToLoad = useMemo(() => {
    const ids = new Set<string>();

    data?.getIncomingBuddyRequests?.forEach((request) =>
      ids.add(request.senderId)
    );

    data?.getOutgoingBuddyRequests?.forEach((request) =>
      ids.add(request.receiverId)
    );

    data?.getMyBuddies?.forEach((id) => ids.add(id));

    return Array.from(ids);
  }, [data]);

  useEffect(() => {
    if (!data?.meProfile || idsToLoad.length === 0) return;

    const currentCourses = new Set(
      data.meProfile.courses.map((course) =>
        course.name.trim().toLowerCase()
      )
    );

    let cancelled = false;

    async function loadSharedCourses() {
      const nextMap: Record<string, string[]> = {};

      await Promise.all(
        idsToLoad.map(async (userId) => {
          try {
            const result = await apolloClient.query<{
              getCoursesAndTopics: { courses: CourseItem[] } | null;
            }>({
              query: GET_COURSES_AND_TOPICS,
              variables: { userId },
              fetchPolicy: 'network-only',
            });

            nextMap[userId] = (
              result.data.getCoursesAndTopics?.courses ?? []
            )
              .map((course) => course.name)
              .filter((name) =>
                currentCourses.has(name.trim().toLowerCase())
              );
          } catch {
            nextMap[userId] = [];
          }
        })
      );

      if (!cancelled) {
        setCourseMap(nextMap);
      }
    }

    loadSharedCourses();

    return () => {
      cancelled = true;
    };
  }, [apolloClient, data?.meProfile, idsToLoad]);

  const formatPercent = (value?: number) => {
    if (value === undefined || value === null) return 'Match';

    return `${value > 1 ? Math.round(value) : Math.round(value * 100)}% Match`;
  };

  const formatTimeAgo = (value?: string) => {
    if (!value) return 'Recently';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'Recently';

    const diffMinutes = Math.max(
      1,
      Math.round((Date.now() - date.getTime()) / 60000)
    );

    if (diffMinutes < 60) {
      return `Requested ${diffMinutes} min ago`;
    }

    const hours = Math.round(diffMinutes / 60);

    if (hours < 24) {
      return `Requested ${hours} hour${hours === 1 ? '' : 's'} ago`;
    }

    const days = Math.round(hours / 24);

    return `Requested ${days} day${days === 1 ? '' : 's'} ago`;
  };

  const getUser = (userId: string) => usersById.get(userId);

  const getDisplayName = (userId: string) => {
    const person = getUser(userId);

    return person
      ? `${person.firstName} ${person.lastName}`
      : 'Study Buddy';
  };

  const getInitials = (userId: string) => {
    const person = getUser(userId);

    if (person) {
      return `${person.firstName?.[0] ?? ''}${person.lastName?.[0] ?? ''
        }`.toUpperCase();
    }

    return userId.slice(0, 2).toUpperCase() || 'SB';
  };

  const handleAccept = async (requestId: string) => {
    setActionError('');

    try {
      await acceptRequest({
        variables: { requestId },
      });

      await refetch();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Could not accept this request.'
      );
    }
  };

  const handleReject = async (requestId: string) => {
    setActionError('');

    try {
      await rejectRequest({
        variables: { requestId },
      });

      await refetch();
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'Could not reject this request.'
      );
    }
  };

  const incoming = data?.getIncomingBuddyRequests ?? [];
  const outgoing = data?.getOutgoingBuddyRequests ?? [];
  const buddies = data?.getMyBuddies ?? [];

  const counts: Record<ConnectionsTabKey, number> = {
    incoming: incoming.length,
    outgoing: outgoing.length,
    buddies: buddies.length,
  };

  const renderPersonCard = (
    userId: string,
    options: { request?: BuddyRequest; mode: ConnectionsTabKey }
  ) => {
    const person = getUser(userId);
    const match = matchesByCandidate.get(userId);
    const sharedCourses = courseMap[userId] ?? [];

    return (
      <article
        className={styles.card}
        key={options.request?.id ?? userId}
      >
        <div className={styles.cardTop}>
          <div
            className={`${styles.avatar} ${styles[`avatar${Math.abs(userId.length % 4)}`]
              }`}
          >
            {getInitials(userId)}
          </div>

          <div className={styles.userInfo}>
            <h2>{getDisplayName(userId)}</h2>

            <p>
              {person?.academicYear || 'Computer Science Junior'}
            </p>

            <p>
              {person?.university || 'German International University'}
            </p>

            <span className={styles.matchPill}>
              {formatPercent(match?.compatibility)}
            </span>
          </div>
        </div>

        <div className={styles.sharedBlock}>
          <p>Shared Courses ({sharedCourses.length})</p>

          <div className={styles.tags}>
            {sharedCourses.length > 0 ? (
              sharedCourses.slice(0, 4).map((course) => (
                <span key={`${userId}-${course}`}>{course}</span>
              ))
            ) : (
              <span>No shared courses yet</span>
            )}
          </div>
        </div>

        <div className={styles.cardFooter}>
          <span>
            {options.request
              ? formatTimeAgo(options.request.createdAt)
              : 'Connected study buddy'}
          </span>

          {options.mode === 'incoming' && options.request ? (
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.acceptButton}
                onClick={() => handleAccept(options.request!.id)}
                disabled={accepting || rejecting}
              >
                Accept
              </button>

              <button
                type="button"
                className={styles.rejectButton}
                onClick={() => handleReject(options.request!.id)}
                disabled={accepting || rejecting}
              >
                Reject
              </button>

              <button
                type="button"
                className={styles.eyeButton}
                aria-label="View profile"
                title="View profile"
                onClick={() => navigate('/find-buddies', {
                  state: { selectedUserId: userId }
                })}
              >
                <Eye size={20} aria-hidden="true" />
              </button>
            </div>
          ) : null}

          {options.mode === 'outgoing' ? (
            <div className={styles.actions}>
              <span className={styles.pendingBadge}>Pending</span>

              <button
                type="button"
                className={styles.eyeButton}
                aria-label="View profile"
                title="View profile"
                onClick={() => navigate('/find-buddies', {
                  state: { selectedUserId: userId }
                })}
              >
                <Eye size={20} aria-hidden="true" />
              </button>
            </div>
          ) : null}

          {options.mode === 'buddies' ? (
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.acceptButton}
                onClick={() =>
                  navigate(
                    `/messages?userId=${encodeURIComponent(userId)}`
                  )
                }
              >
                Message
              </button>

              <button
                type="button"
                className={styles.outlineButton}
                onClick={() => navigate('/study-sessions')}
              >
                Plan Session
              </button>

              <button
                type="button"
                className={styles.eyeButton}
                aria-label="View profile"
                title="View profile"
                onClick={() => navigate('/find-buddies', {
                  state: { selectedUserId: userId }
                })}
              >
                <Eye size={20} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      </article>
    );
  };

  const activeItems = {
    incoming: incoming.map((request) =>
      renderPersonCard(request.senderId, {
        request,
        mode: 'incoming',
      })
    ),

    outgoing: outgoing.map((request) =>
      renderPersonCard(request.receiverId, {
        request,
        mode: 'outgoing',
      })
    ),

    buddies: buddies.map((userId) =>
      renderPersonCard(userId, {
        mode: 'buddies',
      })
    ),
  }[activeTab];

  if (loading) {
    return (
      <div className={styles.statePanel}>
        Loading your connections...
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.statePanel}>
        Unable to load connections from the backend. Please try
        again.
      </div>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>My Connections</h1>
          <p>
            Accept requests, track outgoing invites, and jump into
            study plans with your buddies.
          </p>
        </div>

        <button
          type="button"
          className={styles.discoverButton}
          onClick={() => navigate('/find-buddies')}
        >
          Find more buddies
        </button>
      </header>

      <nav
        className={styles.tabs}
        aria-label="Connection filters"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tab} ${activeTab === tab.key ? styles.activeTab : ''
              }`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className={styles[`${tab.accent}Dot`]} />

            {tab.label}

            <strong>{counts[tab.key]}</strong>
          </button>
        ))}
      </nav>

      {actionError ? (
        <div className={styles.errorBanner}>
          {actionError}
        </div>
      ) : null}

      <div className={styles.grid}>
        {activeItems.length > 0 ? (
          activeItems
        ) : (
          <div className={styles.emptyState}>
            <h2>
              No{' '}
              {tabs
                .find((tab) => tab.key === activeTab)
                ?.label.toLowerCase()}{' '}
              yet
            </h2>

            <p>
              {activeTab === 'incoming'
                ? 'New requests will appear here as soon as classmates reach out.'
                : 'Use Find Buddies to grow this part of your study network.'}
            </p>

            <button
              type="button"
              onClick={() => navigate('/find-buddies')}
            >
              Explore matches
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
