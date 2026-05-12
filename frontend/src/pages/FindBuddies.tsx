import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GET_COURSES_AND_TOPICS, GET_FIND_BUDDIES_DATA, GET_MATCH_PROFILE } from '../graphql/queries';
import { SEND_BUDDY_REQUEST } from '../graphql/mutations';
import type {
  FindBuddiesData,
  MatchAvailabilitySlot,
  MatchFilter,
  MatchProfileSummary,
  UserProfileSummary,
} from '../types';
import styles from '../styles/pages/FindBuddies.module.css';

// Mapping from string (profile-service) to number (for display)
const GROUP_SIZE_STRING_TO_NUMBER: Record<string, number> = {
  'ONE_ON_ONE': 2,
  'SMALL': 4,
  'LARGE': 8,
};
const FIND_BUDDIES_MATCH_LIMIT = 100;

export default function FindBuddies() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const apolloClient = useApolloClient();
  const [courseMap, setCourseMap] = useState<Record<string, string[]>>({});
  const [actionError, setActionError] = useState('');
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<MatchFilter>('all');
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [matchProfiles, setMatchProfiles] = useState<Record<string, MatchProfileSummary | null>>({});
  const [myMatchProfile, setMyMatchProfile] = useState<MatchProfileSummary | null>(null);
  const [profileMap, setProfileMap] = useState<Record<string, UserProfileSummary | null>>({});
  const [myProfileSummary, setMyProfileSummary] = useState<UserProfileSummary | null>(null);

  // Listen for navigation from Dashboard
  useEffect(() => {
    const state = location.state as { selectedMatchId?: string; selectedUserId?: string };
    if (state?.selectedMatchId) {
      setSelectedMatchId(state.selectedMatchId);
      setSelectedUserId(null);
      window.history.replaceState({}, document.title);
    }
    if (state?.selectedUserId) {
      setSelectedUserId(state.selectedUserId);
      setSelectedMatchId(null);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const { data, loading, error, refetch } = useQuery<FindBuddiesData>(GET_FIND_BUDDIES_DATA, {
    variables: { matchLimit: FIND_BUDDIES_MATCH_LIMIT },
    fetchPolicy: 'cache-and-network',
  });

  const [sendRequest, { loading: sending }] = useMutation(SEND_BUDDY_REQUEST, {
    refetchQueries: [{ query: GET_FIND_BUDDIES_DATA, variables: { matchLimit: FIND_BUDDIES_MATCH_LIMIT } }],
    awaitRefetchQueries: true,
  });

  const usersById = useMemo(
    () => new Map(data?.getAllUsers?.map((person) => [person.id, person]) ?? []),
    [data?.getAllUsers]
  );

  const outgoingIds = useMemo(
    () => new Set(data?.getOutgoingBuddyRequests?.map((request) => request.receiverId) ?? []),
    [data?.getOutgoingBuddyRequests]
  );

  const incomingIds = useMemo(
    () => new Set(data?.getIncomingBuddyRequests?.map((request) => request.senderId) ?? []),
    [data?.getIncomingBuddyRequests]
  );

  const buddyIds = useMemo(() => new Set(data?.getMyBuddies ?? []), [data?.getMyBuddies]);

  const matches = useMemo(() => {
    return (data?.getRecommendedMatches ?? []).filter(
      (match) => match.candidateUserId !== user?.id && !buddyIds.has(match.candidateUserId)
    );
  }, [buddyIds, data?.getRecommendedMatches, user?.id]);

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      const sharedCourses = courseMap[match.candidateUserId] ?? [];
      const matchPercent = match.compatibility > 1 ? match.compatibility : match.compatibility * 100;
      const hasAvailability = match.reasons.some((reason) =>
        reason.toLowerCase().includes('availability')
      );

      if (activeFilter === 'high') return matchPercent >= 80;
      if (activeFilter === 'shared') return sharedCourses.length > 0;
      if (activeFilter === 'available') return hasAvailability;
      return true;
    });
  }, [activeFilter, courseMap, matches]);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId) ?? null,
    [matches, selectedMatchId]
  );
  const selectedCandidateId = selectedUserId ?? selectedMatch?.candidateUserId ?? null;
  const selectedCandidateMatch = useMemo(
    () => selectedMatch ?? matches.find((match) => match.candidateUserId === selectedCandidateId) ?? null,
    [matches, selectedCandidateId, selectedMatch]
  );

  useEffect(() => {
    if (!data?.meProfile || matches.length === 0) return;

    const currentCourses = new Set(
      data.meProfile.courses.map((course) => course.name.trim().toLowerCase())
    );
    let cancelled = false;

    async function loadCourses() {
      const nextMap: Record<string, string[]> = {};
      const nextProfiles: Record<string, UserProfileSummary | null> = {};

      await Promise.all(
        matches.map(async (match) => {
          try {
            const result = await apolloClient.query<{
              getCoursesAndTopics: UserProfileSummary | null;
            }>({
              query: GET_COURSES_AND_TOPICS,
              variables: { userId: match.candidateUserId },
              fetchPolicy: 'network-only',
            });

            nextProfiles[match.candidateUserId] = result.data.getCoursesAndTopics ?? null;
            nextMap[match.candidateUserId] = (result.data.getCoursesAndTopics?.courses ?? [])
              .map((course) => course.name)
              .filter((name) => currentCourses.has(name.trim().toLowerCase()));
          } catch {
            nextProfiles[match.candidateUserId] = null;
            nextMap[match.candidateUserId] = [];
          }
        })
      );

      if (!cancelled) {
        setCourseMap(nextMap);
        setProfileMap((current) => ({ ...current, ...nextProfiles }));
      }
    }

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, [apolloClient, data?.meProfile, matches]);

  useEffect(() => {
    if (!selectedUserId || profileMap[selectedUserId] !== undefined) return;

    const targetUserId = selectedUserId;
    let cancelled = false;

    async function loadSelectedProfile() {
      try {
        const result = await apolloClient.query<{ getCoursesAndTopics: UserProfileSummary | null }>({
          query: GET_COURSES_AND_TOPICS,
          variables: { userId: targetUserId },
          fetchPolicy: 'network-only',
        });

        if (!cancelled) {
          setProfileMap((current) => ({
            ...current,
            [targetUserId]: result.data.getCoursesAndTopics ?? null,
          }));
        }
      } catch {
        if (!cancelled) {
          setProfileMap((current) => ({ ...current, [targetUserId]: null }));
        }
      }
    }

    loadSelectedProfile();

    return () => {
      cancelled = true;
    };
  }, [apolloClient, profileMap, selectedUserId]);

  useEffect(() => {
    if (!user?.id) return;

    const currentUserId = user.id;
    let cancelled = false;

    async function loadMyProfileSummary() {
      try {
        const result = await apolloClient.query<{ getCoursesAndTopics: UserProfileSummary | null }>({
          query: GET_COURSES_AND_TOPICS,
          variables: { userId: currentUserId },
          fetchPolicy: 'network-only',
        });

        if (!cancelled) setMyProfileSummary(result.data.getCoursesAndTopics ?? null);
      } catch {
        if (!cancelled) setMyProfileSummary(null);
      }
    }

    loadMyProfileSummary();

    return () => {
      cancelled = true;
    };
  }, [apolloClient, user?.id]);

  useEffect(() => {
    if (!user?.id || matches.length === 0) return;

    const currentUserId = user.id;
    let cancelled = false;

    async function loadMatchProfiles() {
      try {
        const mine = await apolloClient.query<{ getMatchProfile: MatchProfileSummary | null }>({
          query: GET_MATCH_PROFILE,
          variables: { userId: currentUserId },
          fetchPolicy: 'network-only',
        });

        if (!cancelled) setMyMatchProfile(mine.data.getMatchProfile ?? null);
      } catch {
        if (!cancelled) setMyMatchProfile(null);
      }

      const nextProfiles: Record<string, MatchProfileSummary | null> = {};

      await Promise.all(
        matches.map(async (match) => {
          try {
            const result = await apolloClient.query<{ getMatchProfile: MatchProfileSummary | null }>({
              query: GET_MATCH_PROFILE,
              variables: { userId: match.candidateUserId },
              fetchPolicy: 'network-only',
            });

            nextProfiles[match.candidateUserId] = result.data.getMatchProfile ?? null;
          } catch {
            nextProfiles[match.candidateUserId] = null;
          }
        })
      );

      if (!cancelled) setMatchProfiles(nextProfiles);
    }

    loadMatchProfiles();

    return () => {
      cancelled = true;
    };
  }, [apolloClient, matches, user?.id]);

  useEffect(() => {
    if (!selectedUserId || matchProfiles[selectedUserId] !== undefined) return;

    const targetUserId = selectedUserId;
    let cancelled = false;

    async function loadSelectedMatchProfile() {
      try {
        const result = await apolloClient.query<{ getMatchProfile: MatchProfileSummary | null }>({
          query: GET_MATCH_PROFILE,
          variables: { userId: targetUserId },
          fetchPolicy: 'network-only',
        });

        if (!cancelled) {
          setMatchProfiles((current) => ({
            ...current,
            [targetUserId]: result.data.getMatchProfile ?? null,
          }));
        }
      } catch {
        if (!cancelled) {
          setMatchProfiles((current) => ({ ...current, [targetUserId]: null }));
        }
      }
    }

    loadSelectedMatchProfile();

    return () => {
      cancelled = true;
    };
  }, [apolloClient, matchProfiles, selectedUserId]);

  const formatPercent = (value: number) => `${value > 1 ? Math.round(value) : Math.round(value * 100)}% Match`;

  const getName = (userId: string) => {
    const person = usersById.get(userId);
    return person ? `${person.firstName} ${person.lastName}` : 'Study Buddy';
  };

  const getInitials = (userId: string) => {
    const person = usersById.get(userId);
    if (person) return `${person.firstName?.[0] ?? ''}${person.lastName?.[0] ?? ''}`.toUpperCase();
    return userId.slice(0, 2).toUpperCase() || 'SB';
  };

  const handleConnect = async (receiverId: string) => {
    setActionError('');
    try {
      await sendRequest({ variables: { receiverId } });
      setSentIds((prev) => new Set(prev).add(receiverId));
      await refetch();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not send this request.');
    }
  };

  const getStatus = (candidateId: string) => {
    if (buddyIds.has(candidateId)) return 'Connected';
    if (outgoingIds.has(candidateId) || sentIds.has(candidateId)) return 'Request sent';
    if (incomingIds.has(candidateId)) return 'Respond in Connections';
    return '';
  };

  const getPercentValue = (value: number) => value > 1 ? Math.round(value) : Math.round(value * 100);

  const formatPreference = (value?: string | number | null) => {
    if (value === null || value === undefined || value === '') return 'Not set';
    if (typeof value === 'number') {
      return `${value} ${value === 1 ? 'person' : 'people'}`;
    }
    // Convert string (from profile-service) to a number + label
    const numericValue = GROUP_SIZE_STRING_TO_NUMBER[value as string];
    if (numericValue) {
      return `${numericValue} ${numericValue === 1 ? 'person' : 'people'}`;
    }
    return value
      .replace(/[-_]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  const labelForProfileValue = (value?: string | null) => formatPreference(value);

  const generateBio = (profile?: UserProfileSummary | null) => {
    if (!profile) return 'This student has not completed their study profile yet.';

    const pieces = [
      `${labelForProfileValue(profile.studyPace)} learner${
        profile.studyMode ? ` who prefers ${labelForProfileValue(profile.studyMode).toLowerCase()} sessions` : ''
      }${profile.sessionLength ? ` around ${profile.sessionLength}` : ''}.`,
      profile.courses?.length
        ? `Currently studying ${profile.courses.slice(0, 3).map((course) => course.name).join(', ')}`
        : 'Courses have not been added yet',
      profile.topics?.length
        ? `with focus areas like ${profile.topics.slice(0, 4).map((topic) => topic.name).join(', ')}.`
        : '',
    ];

    return pieces.filter(Boolean).join(' ');
  };

  const formatStudyStyles = (profile?: UserProfileSummary | null) =>
    profile?.studyStyles?.length ? profile.studyStyles.map((style) => formatPreference(style)).join(', ') : 'Not set';

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const normalizeDay = (day: string) => {
    const numeric = Number(day);
    if (!Number.isNaN(numeric)) return dayNames[numeric] ?? day;
    return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
  };

  const minutesFromTime = (time: string) => {
    const [hours = '0', minutes = '0'] = time.split(':');
    return Number(hours) * 60 + Number(minutes);
  };

  const formatTime = (time: string) => {
    const [hoursRaw = '0', minutesRaw = '0'] = time.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 === 0 ? 12 : hours % 12;
    return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
  };

  const formatMinutes = (minutes: number) =>
    formatTime(`${Math.floor(minutes / 60)}:${minutes % 60}`);

  const formatSlot = (slot: MatchAvailabilitySlot) =>
    `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;

  const summarizeAvailability = (candidateId: string, fallback?: string) => {
    const slots = matchProfiles[candidateId]?.availabilitySlots ?? [];
    if (slots.length > 0) {
      const first = slots[0];
      return `${normalizeDay(first.dayOfWeek)} ${formatSlot(first)}`;
    }

    if (fallback?.toLowerCase().includes('availability')) return 'Shared overlap available';
    if (fallback && !fallback.toLowerCase().includes('mins')) return fallback;
    return 'No availability set yet';
  };

  const mergeAvailabilityRows = (rows: Array<{ day: string; start: number; end: number }>) => {
    const sorted = [...rows].sort((a, b) => a.day.localeCompare(b.day) || a.start - b.start);
    const merged: Array<{ day: string; start: number; end: number }> = [];

    for (const row of sorted) {
      const previous = merged[merged.length - 1];
      if (previous && previous.day === row.day && previous.end >= row.start) {
        previous.end = Math.max(previous.end, row.end);
      } else {
        merged.push({ ...row });
      }
    }

    return merged;
  };

  const getAvailabilityRows = (candidateId: string, fallback?: string) => {
    const candidateSlots = matchProfiles[candidateId]?.availabilitySlots ?? [];
    const mySlots = myMatchProfile?.availabilitySlots ?? [];
    const rows: Array<{ day: string; start: number; end: number }> = [];

    for (const candidateSlot of candidateSlots) {
      const sameDayMine = mySlots.filter(
        (slot) => normalizeDay(slot.dayOfWeek) === normalizeDay(candidateSlot.dayOfWeek)
      );

      if (sameDayMine.length === 0) {
        rows.push({
          day: normalizeDay(candidateSlot.dayOfWeek),
          start: minutesFromTime(candidateSlot.startTime),
          end: minutesFromTime(candidateSlot.endTime),
        });
        continue;
      }

      for (const mySlot of sameDayMine) {
        const start = Math.max(minutesFromTime(candidateSlot.startTime), minutesFromTime(mySlot.startTime));
        const end = Math.min(minutesFromTime(candidateSlot.endTime), minutesFromTime(mySlot.endTime));

        if (start < end) {
          rows.push({
            day: normalizeDay(candidateSlot.dayOfWeek),
            start,
            end,
          });
        }
      }
    }

    if (rows.length > 0) {
      return mergeAvailabilityRows(rows)
        .slice(0, 6)
        .map((row) => ({
          day: row.day,
          time: `${formatMinutes(row.start)} - ${formatMinutes(row.end)}`,
        }));
    }
    return [{ day: 'Availability', time: summarizeAvailability(candidateId, fallback) }];
  };

  const renderConnectButton = (candidateId: string, className = styles.connectButton) => {
    const status = getStatus(candidateId);
    return (
      <button
        type="button"
        className={className}
        disabled={sending || status !== ''}
        onClick={() => handleConnect(candidateId)}
      >
        {className === styles.detailRequestButton ? 'Send Study Request' : `+ ${status || 'Connect'}`}
      </button>
    );
  };

  if (loading) return <div className={styles.statePanel}>Finding your best study matches...</div>;
  if (error) return <div className={styles.statePanel}>Unable to load buddies from the backend. Please try again.</div>;

  const filters: Array<{ key: MatchFilter; label: string }> = [
    { key: 'all', label: 'All Matches' },
    { key: 'high', label: 'High Compatibility (80%+)' },
    { key: 'shared', label: 'Shared Courses' },
    { key: 'available', label: 'Available Now' },
  ];

  if (selectedCandidateId) {
    const person = usersById.get(selectedCandidateId);
    const candidateProfileData = profileMap[selectedCandidateId];
    const candidateCourses = candidateProfileData?.courses ?? [];
    const candidateTopics = candidateProfileData?.topics ?? [];
    const sharedCourses = courseMap[selectedCandidateId] ?? [];
    const isBuddy = buddyIds.has(selectedCandidateId);
    const compatibility = selectedCandidateMatch ? getPercentValue(selectedCandidateMatch.compatibility) : 0;
    const reasons = selectedCandidateMatch?.reasons.filter((reason) => !reason.startsWith('Shared courses')) ?? [];
    const preferenceReasons = reasons.filter((reason) => !reason.toLowerCase().includes('availability'));
    const availabilityReason = reasons.find((reason) => reason.toLowerCase().includes('availability'));
    const availabilityRows = getAvailabilityRows(selectedCandidateId, availabilityReason);
    const candidateProfile = matchProfiles[selectedCandidateId];
    const preferenceRows = [
      {
        label: 'Study Pace',
        yours: formatPreference(myProfileSummary?.studyPace ?? myMatchProfile?.studyPace),
        theirs: formatPreference(candidateProfileData?.studyPace ?? candidateProfile?.studyPace),
      },
      {
        label: 'Study Mode',
        yours: formatPreference(myProfileSummary?.studyMode ?? myMatchProfile?.studyMode),
        theirs: formatPreference(candidateProfileData?.studyMode ?? candidateProfile?.studyMode),
      },
      {
        label: 'Study Style',
        yours: formatStudyStyles(myProfileSummary) !== 'Not set' ? formatStudyStyles(myProfileSummary) : formatPreference(myMatchProfile?.studyStyle),
        theirs: formatStudyStyles(candidateProfileData) !== 'Not set' ? formatStudyStyles(candidateProfileData) : formatPreference(candidateProfile?.studyStyle),
      },
      {
        label: 'Group Size',
        yours: formatPreference(myProfileSummary?.groupSize ?? myMatchProfile?.groupSize),
        theirs: formatPreference(candidateProfileData?.groupSize ?? candidateProfile?.groupSize),
      },
    ];
    const breakdown = [
      { label: 'Shared Courses', value: Math.min(100, Math.max(60, sharedCourses.length * 30)) },
      { label: 'Study Style', value: preferenceReasons.length ? 95 : 75 },
      { label: 'Preferences', value: Math.max(72, compatibility - 8) },
      { label: 'Availability', value: availabilityReason ? 85 : 68 },
    ];

    return (
      <section className={styles.detailPage}>
        <button type="button" className={styles.backButton} onClick={() => {
          setSelectedMatchId(null);
          setSelectedUserId(null);
        }}>
          Back to matches
        </button>

        {actionError ? <div className={styles.errorBanner}>{actionError}</div> : null}

        <div className={styles.detailHero}>
          <div className={styles.detailProfile}>
            <div className={styles.detailAvatar}>{getInitials(selectedCandidateId)}</div>
            <h1>{getName(selectedCandidateId)}</h1>
            <p>{person?.academicYear || 'Academic year not set'}</p>
            <p>{person?.university || 'University not set'}</p>
            <p>{person?.email || 'Email not set'}</p>
          </div>

          <div className={styles.aboutPanel}>
            <p className={styles.detailLabel}>About</p>
            <p className={styles.aboutText}>
              {generateBio(candidateProfileData)}
            </p>
            {selectedCandidateMatch ? <div className={styles.scoreCard}>
              <div>
                <strong>Compatibility Score</strong>
                <span>Excellent match based on courses, availability, and study preferences</span>
              </div>
              <b>{compatibility}%</b>
            </div> : null}
            <div className={styles.detailActions}>
              {renderConnectButton(selectedCandidateId, styles.detailRequestButton)}
              <button
                type="button"
                className={styles.chatButton}
                disabled={!isBuddy}
                title={isBuddy ? 'Start chat' : 'You can chat after you become study buddies'}
                onClick={() => {
                  if (isBuddy) navigate(`/messages?userId=${encodeURIComponent(selectedCandidateId)}`);
                }}
              >
                Start Chat
              </button>
            </div>
          </div>
        </div>

        <div className={styles.detailLayout}>
          <div className={styles.detailMain}>
            <section className={styles.detailSection}>
              <h2>Shared Courses</h2>
              <div className={styles.courseList}>
                {(sharedCourses.length
                  ? sharedCourses.map((name) => ({ name, code: 'Shared course', term: null }))
                  : candidateCourses
                ).slice(0, 4).map((course, index) => (
                  <div className={styles.courseRow} key={`${course.name}-${index}`}>
                    <div>
                      <strong>{course.name}</strong>
                      <span>{course.code || course.term || (sharedCourses.length ? 'Shared course' : 'Profile course')}</span>
                    </div>
                    <em>{sharedCourses.some((name) => name === course.name) ? 'Match' : 'Profile'}</em>
                  </div>
                ))}
                {sharedCourses.length === 0 && candidateCourses.length === 0 ? (
                  <div className={styles.courseRow}>
                    <div>
                      <strong>No courses added yet</strong>
                      <span>This student has not added courses to their profile.</span>
                    </div>
                    <em>Profile</em>
                  </div>
                ) : null}
              </div>
            </section>

            <section className={styles.detailSection}>
              <h2>Study Preferences Comparison</h2>
              <div className={styles.preferenceGrid}>
                {preferenceRows.map((row) => (
                  <div className={styles.preferenceItem} key={row.label}>
                    <p>{row.label}</p>
                    <div className={styles.compareLine}>
                      <span>{row.yours}</span>
                      <small>{row.theirs}</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.detailSection}>
              <h2>Overlapping Availability</h2>
              <div className={styles.availabilityList}>
                {availabilityRows.map((row) => (
                  <div className={styles.availabilityRow} key={`${row.day}-${row.time}`}>
                    <strong>{row.day}</strong>
                    <span>{row.time}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className={styles.breakdownPanel}>
            <h2>Compatibility Breakdown</h2>
            <div className={styles.donutScore}>{compatibility}%</div>
            <strong>Overall Match</strong>
            <div className={styles.breakdownBars}>
              {breakdown.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <div><i style={{ width: `${item.value}%` }} /></div>
                  <b>{item.value}%</b>
                </div>
              ))}
            </div>
            <h3>Key Highlights</h3>
            <ul>
              {[
                ...sharedCourses,
                ...candidateTopics.map((topic) => topic.name),
                ...(reasons.length ? reasons : ['Profile data loaded from study preferences']),
              ].slice(0, 4).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1>Find Study Buddies</h1>
        <p>Discover students who match your courses and study preferences</p>
      </header>

      <div className={styles.filterBar}>
        <span className={styles.filterLabel}>Filter by:</span>
        {filters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            className={`${styles.filterChip} ${activeFilter === filter.key ? styles.filterChipActive : ''}`}
            onClick={() => setActiveFilter(filter.key)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <p className={styles.matchCount}>Showing {filteredMatches.length} study buddy matches</p>

      {actionError ? <div className={styles.errorBanner}>{actionError}</div> : null}

      <div className={styles.grid}>
        {filteredMatches.length > 0 ? filteredMatches.map((match) => {
          const person = usersById.get(match.candidateUserId);
          const sharedCourses = courseMap[match.candidateUserId] ?? [];
          const reasons = match.reasons.filter((reason) => !reason.startsWith('Shared courses'));
          const studyStyles = reasons
            .filter((reason) => !reason.toLowerCase().includes('availability'))
            .slice(0, 2);
          const availabilityReason = reasons.find((reason) => reason.toLowerCase().includes('availability'));
          return (
            <article className={styles.card} key={match.id}>
              <div className={styles.cardTop}>
                <div className={styles.avatar}>{getInitials(match.candidateUserId)}</div>
                <span className={styles.matchBadge}>{formatPercent(match.compatibility)}</span>
              </div>

              <div className={styles.identity}>
                <h2>{getName(match.candidateUserId)}</h2>
                <p>{person?.academicYear || 'Computer Science Junior'}</p>
                <p>{person?.university || 'German International University'}</p>
              </div>

              <div className={styles.infoBlock}>
                <p className={styles.infoTitle}>Shared Courses ({sharedCourses.length})</p>
                <div className={styles.tags}>
                  {sharedCourses.length > 0
                    ? sharedCourses.slice(0, 2).map((tag) => <span key={`${match.id}-${tag}`}>{tag}</span>)
                    : <span>Course match pending</span>}
                </div>
              </div>

              <div className={styles.infoBlock}>
                <p className={styles.infoTitle}>Study Style</p>
                <div className={styles.tagsMuted}>
                  {studyStyles.length > 0
                    ? studyStyles.map((tag) => <span key={`${match.id}-${tag}`}>{tag}</span>)
                    : <span>Discussion</span>}
                </div>
              </div>

              <div className={styles.infoBlock}>
                <p className={styles.infoTitle}>Availability</p>
                <p className={styles.availability}>
                  {summarizeAvailability(match.candidateUserId, availabilityReason)}
                </p>
              </div>

              <div className={styles.actions}>
                {renderConnectButton(match.candidateUserId)}
                {incomingIds.has(match.candidateUserId) ? (
                  <button type="button" className={styles.secondaryButton} onClick={() => navigate('/my-connections')}>
                    Review
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.viewButton}
                    aria-label={`View ${getName(match.candidateUserId)} match detail`}
                    onClick={() => setSelectedMatchId(match.id)}
                  >
                    eye
                  </button>
                )}
              </div>
            </article>
          );
        }) : (
          <div className={styles.emptyState}>
            <h2>No recommendations yet</h2>
            <p>Complete your profile courses and availability so HiveMind can generate better matches.</p>
          </div>
        )}
      </div>
    </section>
  );
}
