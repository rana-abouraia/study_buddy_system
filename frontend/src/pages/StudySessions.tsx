import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { CalendarDays, CalendarPlus, Clock3, Eye, LogOut, MapPin, Pencil, Trash2, Users, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { gql } from '@apollo/client';
import type { StudySessionItem, StudySessionsData, TopicSuggestionsData, UserSummary } from '../types';
import styles from '../styles/pages/StudySessions.module.css';

/* ── GraphQL ─────────────────────────────────────────────── */
const GET_STUDY_SESSIONS_DATA = gql`
  query GetStudySessionsData {
    getMySessions {
      id creatorId topic description date duration sessionType
      location meetingLink status
      participants { id sessionId userId status joinedAt }
    }
    getAllSessions {
      id creatorId topic description date duration sessionType
      location meetingLink status
      participants { id sessionId userId status joinedAt }
    }
    getMyBuddies
    getAllUsers { id email firstName lastName university academicYear }
  }
`;

const GET_TOPIC_SUGGESTIONS = gql`
  query GetTopicSuggestions {
    getProfileSuggestions {
      topics {
        id
        name
      }
    }
  }
`;

const CREATE_STUDY_SESSION = gql`
  mutation CreateStudySession(
    $topic: String! $description: String $date: String!
    $duration: Int! $sessionType: String!
    $meetingLink: String $location: String $participantIds: [ID!]
  ) {
    createSession(
      topic: $topic description: $description date: $date
      duration: $duration sessionType: $sessionType
      meetingLink: $meetingLink location: $location participantIds: $participantIds
    ) { id topic status }
  }
`;

const UPDATE_STUDY_SESSION = gql`
  mutation UpdateStudySession(
    $sessionId: ID!
    $meetingLink: String
    $location: String
    $participantIds: [ID!]
  ) {
    updateSession(
      sessionId: $sessionId
      meetingLink: $meetingLink
      location: $location
      participantIds: $participantIds
    ) { id topic status meetingLink location
        participants { id sessionId userId status joinedAt } }
  }
`;

const RESPOND_INVITATION = gql`
  mutation RespondToInvitation($sessionId: ID!, $accept: Boolean!) {
    respondToSessionInvitation(sessionId: $sessionId, accept: $accept) {
      id sessionId userId status
    }
  }
`;

const LEAVE_SESSION = gql`
  mutation LeaveSession($sessionId: ID!) {
    leaveSession(sessionId: $sessionId)
  }
`;

const CANCEL_SESSION = gql`
  mutation CancelSession($sessionId: ID!) {
    cancelSession(sessionId: $sessionId)
  }
`;

const JOIN_SESSION = gql`
  mutation JoinSession($sessionId: ID!) {
    joinSession(sessionId: $sessionId) { id sessionId userId status }
  }
`;

/* ── Helpers ─────────────────────────────────────────────── */
const defaultDate = () => {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
};

/* ═══════════════════════════════════════════════════════════ */
export default function StudySessions() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'invitations' | 'available' | 'outgoing'>('upcoming');
  const [showCreate, setShowCreate] = useState(false);

  /* create form state */
  const [topic, setTopic] = useState('');
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate());
  const [duration, setDuration] = useState('120');
  const [sessionType, setSessionType] = useState<'ONLINE' | 'IN_PERSON'>('ONLINE');
  const [meetingLink, setMeetingLink] = useState('');
  const [location, setLocation] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [formError, setFormError] = useState('');
  const [selectedSession, setSelectedSession] = useState<StudySessionItem | null>(null);

  /* edit modal state */
  const [editSession, setEditSession] = useState<StudySessionItem | null>(null);
  const [editMeetingLink, setEditMeetingLink] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editParticipants, setEditParticipants] = useState<string[]>([]);
  const [editError, setEditError] = useState('');

  const refetchQ = { refetchQueries: [{ query: GET_STUDY_SESSIONS_DATA }], awaitRefetchQueries: true };

  const { data, loading, error } = useQuery<StudySessionsData>(GET_STUDY_SESSIONS_DATA, {
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-and-network',
  });
  const { data: topicSuggestionsData } = useQuery<TopicSuggestionsData>(GET_TOPIC_SUGGESTIONS, {
    fetchPolicy: 'cache-first',
    nextFetchPolicy: 'cache-and-network',
  });
  const [createSession, { loading: creating }] = useMutation(CREATE_STUDY_SESSION, refetchQ);
  const [updateSession, { loading: updating }] = useMutation(UPDATE_STUDY_SESSION, refetchQ);
  const [respondInvitation, { loading: responding }] = useMutation(RESPOND_INVITATION, refetchQ);
  const [leaveSession, { loading: leaving }] = useMutation(LEAVE_SESSION, refetchQ);
  const [cancelSession, { loading: cancelling }] = useMutation(CANCEL_SESSION, refetchQ);
  const [joinSession, { loading: joining }] = useMutation(JOIN_SESSION, refetchQ);

  const usersById = useMemo(
    () => new Map(data?.getAllUsers?.map(u => [u.id, u]) ?? []),
    [data?.getAllUsers]
  );
  const matchedParticipants = useMemo(
    () => (data?.getMyBuddies ?? []).map(id => usersById.get(id)).filter((u): u is UserSummary => Boolean(u)),
    [data?.getMyBuddies, usersById]
  );

  /* session buckets */
  const allMySessions = data?.getMySessions ?? [];
  const allSessions = data?.getAllSessions ?? [];
  const buddyIds = new Set(data?.getMyBuddies ?? []);
  const existingTopics = useMemo(() => {
    const sessionTopics = (data?.getAllSessions ?? []).map(s => s.topic).filter(Boolean);
    const profileTopics = topicSuggestionsData?.getProfileSuggestions?.topics.map(t => t.name).filter(Boolean) ?? [];
    return Array.from(new Set([...profileTopics, ...sessionTopics]));
  }, [data?.getAllSessions, topicSuggestionsData?.getProfileSuggestions?.topics]);
  const filteredTopicSuggestions = useMemo(() => {
    const query = topic.trim().toLowerCase();
    return existingTopics
      .filter((candidate) => !query || candidate.toLowerCase().includes(query))
      .slice(0, 8);
  }, [existingTopics, topic]);

  const completedSessions = allMySessions.filter(s =>
    (s.status === 'COMPLETED' || new Date(s.date).getTime() + s.duration * 60000 < Date.now()) && (
      s.creatorId === user?.id ||
      s.participants.some(p => p.userId === user?.id)
    )
  );
  const upcomingSessions = allMySessions.filter(s =>
    s.status !== 'CANCELLED' &&
    s.status !== 'COMPLETED' &&
    new Date(s.date).getTime() + s.duration * 60000 >= Date.now() && (
      s.creatorId === user?.id ||
      s.participants.some(p => p.userId === user?.id && p.status === 'ACCEPTED')
    )
  );
  const invitationSessions = allMySessions.filter(s =>
    s.status !== 'COMPLETED' &&
    new Date(s.date).getTime() + s.duration * 60000 >= Date.now() &&
    s.participants.some(p => p.userId === user?.id && p.status === 'INVITED')
  );
  const mySessionIds = new Set(allMySessions.map(s => s.id));
  const availableSessions = allSessions.filter(s =>
    !mySessionIds.has(s.id) &&
    s.status !== 'CANCELLED' &&
    s.status !== 'COMPLETED' &&
    new Date(s.date).getTime() + s.duration * 60000 >= Date.now() &&
    buddyIds.has(s.creatorId)
  );
  const outgoingSessions = allMySessions.filter(s =>
    s.status !== 'COMPLETED' &&
    new Date(s.date).getTime() + s.duration * 60000 >= Date.now() &&
    s.creatorId === user?.id &&
    s.participants.some(p => p.status === 'INVITED')
  );

  const sortSessions = (sessions: StudySessionItem[]) =>
    [...sessions].sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      const now = Date.now();
      const aPast = aTime < now;
      const bPast = bTime < now;
      if (aPast && !bPast) return 1;
      if (!aPast && bPast) return -1;
      return aPast ? bTime - aTime : aTime - bTime;
    });

  const toggleParticipant = (id: string) =>
    setSelectedParticipants(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);

  const toggleEditParticipant = (id: string) =>
    setEditParticipants(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);

  const resetForm = () => {
    setTopic(''); setDescription(''); setDate(defaultDate());
    setDuration('120'); setSessionType('ONLINE');
    setMeetingLink(''); setLocation('');
    setSelectedParticipants([]); setFormError('');
    setTopicPickerOpen(false);
  };

  const openEditModal = (session: StudySessionItem) => {
    setEditSession(session);
    setEditMeetingLink(session.meetingLink ?? '');
    setEditLocation(session.location ?? '');
    setEditParticipants(session.participants.map(p => p.userId));
    setEditError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError('');
    if (!topic.trim()) return setFormError('Add a session topic.');
    if (sessionType === 'ONLINE' && !meetingLink.trim()) return setFormError('Add a meeting link for online sessions.');
    if (sessionType === 'IN_PERSON' && !location.trim()) return setFormError('Add a location for in-person sessions.');
    const allowedIds = new Set(data?.getMyBuddies ?? []);
    if (selectedParticipants.some(id => !allowedIds.has(id))) return setFormError('Only matched study buddies can be invited.');
    try {
      await createSession({
        variables: {
          topic: topic.trim(), description: description.trim() || null,
          date: new Date(date).toISOString(), duration: Number(duration), sessionType,
          meetingLink: sessionType === 'ONLINE' ? meetingLink.trim() : null,
          location: sessionType === 'IN_PERSON' ? location.trim() : null,
          participantIds: selectedParticipants,
        }
      });
      resetForm(); setShowCreate(false);
    } catch (err) { setFormError(err instanceof Error ? err.message : 'Could not create session.'); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setEditError('');
    if (!editSession) return;
    const isOnline = editSession.sessionType.toUpperCase() === 'ONLINE';
    if (isOnline && !editMeetingLink.trim()) return setEditError('Add a meeting link.');
    if (!isOnline && !editLocation.trim()) return setEditError('Add a location.');
    try {
      await updateSession({
        variables: {
          sessionId: editSession.id,
          meetingLink: isOnline ? editMeetingLink.trim() : null,
          location: !isOnline ? editLocation.trim() : null,
          participantIds: editParticipants,
        }
      });
      setEditSession(null);
    } catch (err) { setEditError(err instanceof Error ? err.message : 'Could not update session.'); }
  };

  const handleCancelSession = async (session: StudySessionItem) => {
    if (!window.confirm(`Cancel "${session.topic}"? All participants will be notified.`)) return;
    try {
      await cancelSession({ variables: { sessionId: session.id } });
    } catch (err) { console.error(err); }
  };

  const handleLeaveSession = async (session: StudySessionItem) => {
    if (!window.confirm(`Leave "${session.topic}"?`)) return;
    try {
      await leaveSession({ variables: { sessionId: session.id } });
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className={styles.statePanel}>Loading study sessions…</div>;
  if (error) return <div className={styles.statePanel}>Unable to load sessions. Please try again.</div>;

  /* ── session card ────────────────────────────────────────── */
  const renderCard = (session: StudySessionItem, mode: 'upcoming' | 'completed' | 'invitation' | 'available' | 'outgoing') => {
    const sessionDate = new Date(session.date);
    const endTime = new Date(sessionDate.getTime() + session.duration * 60000);
    const now = Date.now();
    const isPast = endTime.getTime() < now;
    const isToday = sessionDate.toDateString() === new Date().toDateString();
    const isTomorrow = sessionDate.toDateString() === new Date(now + 86400000).toDateString();
    const startingSoon = sessionDate.getTime() - now < 2 * 3600000 && sessionDate.getTime() > now;
    const isOnline = session.sessionType.toUpperCase() === 'ONLINE';
    const isCreator = session.creatorId === user?.id;
    const isParticipant = session.participants.some(p => p.userId === user?.id && (p.status === 'ACCEPTED' || p.status === 'INVITED'));

    const dateLabel = isPast
      ? sessionDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
      : isToday ? 'Today' : isTomorrow ? 'Tomorrow'
        : sessionDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    const timeLabel = `${sessionDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    const durLabel = session.duration === 60 ? '1 hour' : `${session.duration / 60} hours`;

    const otherParts = session.participants.filter(p => p.userId !== user?.id);
    const displayParts = otherParts.slice(0, 3);
    const remainingParticipants = Math.max(0, otherParts.length - displayParts.length);
    const creator = usersById.get(session.creatorId);

    return (
      <article className={styles.sessionCard} key={session.id}>
        {/* LEFT ICON */}
        <div className={styles.sessionIconWrapper}>
          <div className={isOnline ? styles.onlineIconBadge : styles.inpersonIconBadge}>
            {isOnline ? (
              <svg viewBox="0 0 24 24" className={styles.sessionIcon}>
                <rect x="2" y="7" width="15" height="10" rx="2" />
                <path d="M17 9l5-2v10l-5-2V9z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className={styles.sessionIcon}>
                <path d="M12 21s-7-6.75-7-11a7 7 0 0 1 14 0c0 4.25-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            )}
          </div>
        </div>

        {/* CENTER CONTENT */}
        <div className={styles.sessionMain}>
          <div className={styles.sessionTop}>
            <div className={styles.sessionTitleBlock}>
              <div>
                <h2>{session.topic}</h2>
                {session.description && (
                  <p className={styles.courseCode}>
                    {session.description.length > 85
                      ? `${session.description.slice(0, 85)}...`
                      : session.description}
                  </p>
                )}
              </div>
              {isPast && <div className={styles.completedStatus}>✓ Completed</div>}
            </div>
            <span className={`${styles.sessionTypeBadge} ${isOnline ? styles.online : styles.inperson}`}>
              {isOnline ? 'Online' : 'In-Person'}
            </span>
          </div>

          {!isPast && startingSoon && (
            <div className={styles.sessionStatus}>
              <span className={styles.statusDot} />
              Starting Soon
            </div>
          )}

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <CalendarDays className={styles.metaIcon} size={18} />
              <span>{dateLabel}</span>
            </div>
            <div className={styles.metaItem}>
              <Clock3 className={styles.metaIcon} size={18} />
              <span>{timeLabel} ({durLabel})</span>
            </div>
            <div className={styles.metaItem}>
              {isOnline ? <Video className={styles.metaIcon} size={18} /> : <MapPin className={styles.metaIcon} size={18} />}
              <span>{isOnline ? (session.meetingLink || 'Zoom Meeting') : (session.location || 'TBD')}</span>
            </div>
            <div className={styles.metaItem}>
              <Users className={styles.metaIcon} size={18} />
              <span>Organized by {creator ? `${creator.firstName} ${creator.lastName}` : 'Unknown'}</span>
            </div>
          </div>

          <div className={styles.participantsSection}>
            <div className={styles.participantsAvatars}>
              {displayParts.map(p => {
                const u = usersById.get(p.userId);
                return (
                  <div key={p.id} className={styles.participantAvatar}>
                    {u?.firstName?.[0] ?? '?'}
                  </div>
                );
              })}
              {remainingParticipants > 0 && <span className={styles.moreParticipants}>+{remainingParticipants} more</span>}
            </div>
          </div>
        </div>

        {/* RIGHT ACTIONS */}
        <div className={styles.cardActions}>
          {mode === 'upcoming' && (
            <>
              {!isPast && isOnline && session.meetingLink ? (
                <a href={session.meetingLink} target="_blank" rel="noreferrer" className={styles.joinBtn}>
                  <Video size={16} />
                  Join Meeting
                </a>
              ) : (
                <button className={styles.detailsBtn} onClick={() => setSelectedSession(session)}>
                  <Eye size={16} />
                  View Details
                </button>
                
              )}

              <button className={styles.calendarBtn}>
                <CalendarPlus size={16} />
                Add to Calendar
              </button>

             {/* Organizer / Leave icon actions */}
{!isPast && (
  <div className={styles.actionIconsRow}>
    <button
      className={styles.detailsIconBtn}
      onClick={() => setSelectedSession(session)}
      aria-label="View session details"
      title="View session details"
    >
      <Eye size={18} />
    </button>

    {isCreator && (
      <>
        <button
          className={styles.editBtn}
          onClick={() => openEditModal(session)}
          aria-label="Edit session"
          title="Edit session"
        >
          <Pencil size={18} />
        </button>

        <button
          className={styles.deleteBtn}
          onClick={() => handleCancelSession(session)}
          disabled={cancelling}
          aria-label="Cancel session"
          title="Cancel session"
        >
          <Trash2 size={18} />
        </button>
      </>
    )}

    {!isCreator && isParticipant && (
      <button
        className={styles.leaveBtn}
        onClick={() => handleLeaveSession(session)}
        disabled={leaving}
        aria-label="Leave session"
        title="Leave session"
      >
        <LogOut size={18} />
      </button>
    )}
  </div>
)}
            </>
          )}

          {mode === 'completed' && (
            <>
              <button className={styles.detailsBtn} onClick={() => setSelectedSession(session)}>
                <Eye size={16} />
                View Details
              </button>
              <button className={styles.calendarBtn}>
                <CalendarPlus size={16} />
                Add to Calendar
              </button>
            </>
          )}

          {mode === 'available' && (
            <>
              <button
                className={styles.joinBtn}
                onClick={() => joinSession({ variables: { sessionId: session.id } })}
                disabled={joining}
              >
                Join Session
              </button>
              <button className={styles.calendarBtn}>Add to Calendar</button>
            </>
          )}

          {mode === 'invitation' && (
            <>
              <button
                className={styles.acceptBtn}
                onClick={() => respondInvitation({ variables: { sessionId: session.id, accept: true } })}
                disabled={responding}
              >
                Accept
              </button>
              <button
                className={styles.declineBtn}
                onClick={() => respondInvitation({ variables: { sessionId: session.id, accept: false } })}
                disabled={responding}
              >
                Decline
              </button>
             
            </>
          )}
        </div>
      </article>
    );
  };

  /* ── render ──────────────────────────────────────────────── */
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Study Sessions</h1>
          <p>Plan focused sessions with your matched study buddies.</p>
        </div>
        <button className={styles.primaryButton} onClick={() => setShowCreate(v => !v)}>
          {showCreate ? 'Close' : '+ Create Session'}
        </button>
      </header>

      {/* Create form */}
      {showCreate && (
        <form className={styles.createPanel} onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <label className={styles.topicField}>
              Topic
              <input
                value={topic}
                onFocus={() => setTopicPickerOpen(true)}
                onBlur={() => window.setTimeout(() => setTopicPickerOpen(false), 120)}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setTopicPickerOpen(true);
                }}
                placeholder="Type a topic or select from list"
              />
              {topicPickerOpen && (
                <div className={styles.topicList}>
                  {filteredTopicSuggestions.length > 0 ? filteredTopicSuggestions.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`${styles.topicItem} ${topic === t ? styles.activeTopicItem : ''}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setTopic(t);
                        setTopicPickerOpen(false);
                      }}
                    >
                      {t}
                    </button>
                  )) : (
                    <p className={styles.topicEmpty}>No saved topics yet. You can type your own.</p>
                  )}
                </div>
              )}
            </label>
            <label>Date and Time<input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} /></label>
            <label>Duration
              <select value={duration} onChange={e => setDuration(e.target.value)}>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
                <option value="180">3 hours</option>
              </select>
            </label>
            <label>
              {sessionType === 'ONLINE' ? 'Meeting Link' : 'Location'}
              <input
                value={sessionType === 'ONLINE' ? meetingLink : location}
                onChange={e => sessionType === 'ONLINE' ? setMeetingLink(e.target.value) : setLocation(e.target.value)}
                placeholder={sessionType === 'ONLINE' ? 'https://zoom.us/…' : 'Library Room 204'}
              />
            </label>
          </div>

          <label className={styles.descriptionField}>
            Description (optional)
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Notes for your buddies" />
          </label>

          <div className={styles.typePicker}>
            <button type="button" className={sessionType === 'ONLINE' ? styles.typeActive : ''} onClick={() => setSessionType('ONLINE')}>💻 Online</button>
            <button type="button" className={sessionType === 'IN_PERSON' ? styles.typeActive : ''} onClick={() => setSessionType('IN_PERSON')}>🏫 In-Person</button>
          </div>

          <div className={styles.inviteBlock}>
            <div className={styles.inviteHeader}>
              <h2>Invite Study Buddies</h2>
              <span>{selectedParticipants.length} selected</span>
            </div>
            {matchedParticipants.length > 0 ? (
              <div className={styles.inviteList}>
                {matchedParticipants.map(u => (
                  <label className={styles.inviteRow} key={u.id}>
                    <span className={styles.avatar}>{`${u.firstName[0]}${u.lastName[0]}`.toUpperCase()}</span>
                    <span>
                      <strong>{u.firstName} {u.lastName}</strong>
                      <small>{u.university || u.email || 'Matched study buddy'}</small>
                    </span>
                    <input type="checkbox" checked={selectedParticipants.includes(u.id)} onChange={() => toggleParticipant(u.id)} />
                  </label>
                ))}
              </div>
            ) : (
              <div className={styles.emptyInvite}>No matched buddies yet — get matching first!</div>
            )}
          </div>

          {formError && <div className={styles.errorBanner}>{formError}</div>}
          <button type="submit" className={styles.submitButton} disabled={creating}>
            {creating ? 'Creating…' : 'Create Study Session'}
          </button>
        </form>
      )}

      {/* Tabs */}
      {!showCreate && (
        <>
          <nav className={styles.tabs}>
            <button className={activeTab === 'upcoming' ? styles.activeTab : ''} onClick={() => setActiveTab('upcoming')}>
              <svg viewBox="0 0 24 24" className={styles.tabIcon}><rect x="3" y="5" width="18" height="18" rx="2" /><line x1="16" y1="3" x2="16" y2="7" /><line x1="8" y1="3" x2="8" y2="7" /><line x1="3" y1="11" x2="21" y2="11" /></svg>
              Upcoming Sessions
              <strong>{upcomingSessions.length}</strong>
            </button>
            <button className={activeTab === 'completed' ? styles.activeTab : ''} onClick={() => setActiveTab('completed')}>
              <svg viewBox="0 0 24 24" className={styles.tabIcon}><path d="M20 6L9 17l-5-5" /><circle cx="12" cy="12" r="9" /></svg>
              Completed Sessions
              <strong>{completedSessions.length}</strong>
            </button>
            <button className={activeTab === 'invitations' ? styles.activeTab : ''} onClick={() => setActiveTab('invitations')}>
              <svg viewBox="0 0 24 24" className={styles.tabIcon}><path d="M4 4h16v16H4z" /><path d="M4 7l8 6 8-6" /></svg>
              Invitations
              <strong>{invitationSessions.length}</strong>
            </button>
            <button className={activeTab === 'available' ? styles.activeTab : ''} onClick={() => setActiveTab('available')}>
              <svg viewBox="0 0 24 24" className={styles.tabIcon}><circle cx="11" cy="11" r="7" /><line x1="20" y1="20" x2="16.65" y2="16.65" /></svg>
              Available Sessions
              <strong>{availableSessions.length}</strong>
            </button>
            <button className={activeTab === 'outgoing' ? styles.activeTab : ''} onClick={() => setActiveTab('outgoing')}>
              <svg viewBox="0 0 24 24" className={styles.tabIcon}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              Outgoing Requests
              <strong>{outgoingSessions.length}</strong>
            </button>
          </nav>

          <div className={styles.sessionList}>
            {activeTab === 'upcoming' && (
              upcomingSessions.length > 0
                ? sortSessions(upcomingSessions).map(s => renderCard(s, 'upcoming'))
                : <div className={styles.statePanel}>No upcoming sessions yet. Create one or join one from Available.</div>
            )}
            {activeTab === 'completed' && (
              completedSessions.length > 0
                ? sortSessions(completedSessions).map(s => renderCard(s, 'completed'))
                : <div className={styles.statePanel}>No completed sessions yet.</div>
            )}
            {activeTab === 'invitations' && (
              invitationSessions.length > 0
                ? sortSessions(invitationSessions).map(s => renderCard(s, 'invitation'))
                : <div className={styles.statePanel}>No pending invitations.</div>
            )}
            {activeTab === 'available' && (
              availableSessions.length > 0
                ? sortSessions(availableSessions).map(s => renderCard(s, 'available'))
                : <div className={styles.statePanel}>No available sessions from your matched buddies right now.</div>
            )}
            {activeTab === 'outgoing' && (
              outgoingSessions.length > 0
                ? sortSessions(outgoingSessions).map(s => renderCard(s, 'outgoing'))
                : <div className={styles.statePanel}>No outgoing session requests.</div>
            )}
          </div>
        </>
      )}

      {/* View Details Modal */}
      {selectedSession && (
        <div className={styles.detailsOverlay} onClick={() => setSelectedSession(null)}>
          <div className={styles.detailsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailsHeader}>
              <h2>{selectedSession.topic}</h2>
              <button className={styles.closeBtn} onClick={() => setSelectedSession(null)}>×</button>
            </div>
            <div className={styles.detailsContent}>
              <div><strong>Status:</strong>{' '}
                {new Date(selectedSession.date).getTime() + selectedSession.duration * 60000 < Date.now() ? 'Completed' : 'Upcoming'}
              </div>
              <div><strong>Type:</strong> {selectedSession.sessionType}</div>
              <div><strong>Description:</strong><p>{selectedSession.description || 'No description'}</p></div>
              <div><strong>Location:</strong>{' '}
                {selectedSession.sessionType === 'ONLINE' ? selectedSession.meetingLink || 'Zoom Meeting' : selectedSession.location || 'TBD'}
              </div>
              <div><strong>Organized By:</strong>{' '}
                {usersById.get(selectedSession.creatorId)?.firstName}{' '}
                {usersById.get(selectedSession.creatorId)?.lastName}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {editSession && (
        <div className={styles.detailsOverlay} onClick={() => setEditSession(null)}>
          <div className={styles.detailsModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailsHeader}>
              <h2>Edit — {editSession.topic}</h2>
              <button className={styles.closeBtn} onClick={() => setEditSession(null)}>×</button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className={styles.editFormBody}>
                {/* Location / Link */}
                <label className={styles.editLabel}>
                  {editSession.sessionType.toUpperCase() === 'ONLINE' ? 'Meeting Link' : 'Location'}
                  <input
                    className={styles.editInput}
                    value={editSession.sessionType.toUpperCase() === 'ONLINE' ? editMeetingLink : editLocation}
                    onChange={e =>
                      editSession.sessionType.toUpperCase() === 'ONLINE'
                        ? setEditMeetingLink(e.target.value)
                        : setEditLocation(e.target.value)
                    }
                    placeholder={editSession.sessionType.toUpperCase() === 'ONLINE' ? 'https://zoom.us/…' : 'Library Room 204'}
                  />
                </label>

                {/* Add participants */}
                <div className={styles.editInviteSection}>
                  <p className={styles.editInviteTitle}>Participants</p>
                  {matchedParticipants.length > 0 ? (
                    <div className={styles.inviteList}>
                      {matchedParticipants.map(u => {
                        const alreadyIn = editSession.participants.some(p => p.userId === u.id && p.status !== 'DECLINED');
                        return (
                          <label className={styles.inviteRow} key={u.id}>
                            <span className={styles.avatar}>{`${u.firstName[0]}${u.lastName[0]}`.toUpperCase()}</span>
                            <span>
                              <strong>{u.firstName} {u.lastName}</strong>
                              <small>{alreadyIn ? '✓ Already invited' : u.university || u.email || 'Matched study buddy'}</small>
                            </span>
                            <input
                              type="checkbox"
                              checked={editParticipants.includes(u.id)}
                              onChange={() => toggleEditParticipant(u.id)}
                              disabled={alreadyIn}
                            />
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.emptyInvite}>No matched buddies available to add.</div>
                  )}
                </div>

                {editError && <div className={styles.errorBanner}>{editError}</div>}

                <button type="submit" className={styles.submitButton} disabled={updating}>
                  {updating ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
