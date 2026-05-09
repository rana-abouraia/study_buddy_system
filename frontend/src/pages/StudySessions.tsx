import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { CREATE_STUDY_SESSION } from '../graphql/mutations';
import { GET_STUDY_SESSIONS_DATA } from '../graphql/queries';
import { useAuth } from '../context/AuthContext';
import styles from './StudySessions.module.css';

interface UserSummary {
  id: string;
  email?: string;
  firstName: string;
  lastName: string;
  university?: string;
  academicYear?: string;
}

interface SessionParticipant {
  id: string;
  userId: string;
  status: string;
}

interface StudySessionItem {
  id: string;
  creatorId: string;
  topic: string;
  description?: string | null;
  date: string;
  duration: number;
  sessionType: string;
  location?: string | null;
  meetingLink?: string | null;
  status: string;
  participants: SessionParticipant[];
}

interface StudySessionsData {
  getMySessions: StudySessionItem[];
  getMyBuddies: string[];
  getAllUsers: UserSummary[];
}

const defaultDate = () => {
  const nextHour = new Date(Date.now() + 60 * 60 * 1000);
  nextHour.setMinutes(0, 0, 0);
  return nextHour.toISOString().slice(0, 16);
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date pending';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatTime = (value: string, duration: number) => {
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Date(start.getTime() + duration * 60000);
  return `${start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} - ${end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
};

export default function StudySessions() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'outgoing'>('upcoming');
  const [showCreate, setShowCreate] = useState(false);
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate());
  const [duration, setDuration] = useState('120');
  const [sessionType, setSessionType] = useState<'ONLINE' | 'IN_PERSON'>('ONLINE');
  const [meetingLink, setMeetingLink] = useState('');
  const [location, setLocation] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [formError, setFormError] = useState('');

  const { data, loading, error } = useQuery<StudySessionsData>(GET_STUDY_SESSIONS_DATA, {
    fetchPolicy: 'cache-and-network',
  });

  const [createSession, { loading: creating }] = useMutation(CREATE_STUDY_SESSION, {
    refetchQueries: [{ query: GET_STUDY_SESSIONS_DATA }],
    awaitRefetchQueries: true,
  });

  const usersById = useMemo(
    () => new Map(data?.getAllUsers?.map((user) => [user.id, user]) ?? []),
    [data?.getAllUsers]
  );

  const matchedParticipants = useMemo(
    () => (data?.getMyBuddies ?? [])
      .map((id) => usersById.get(id))
      .filter((user): user is UserSummary => Boolean(user)),
    [data?.getMyBuddies, usersById]
  );

  const upcomingSessions = (data?.getMySessions ?? []).filter((session) => session.status !== 'CANCELLED');
  const outgoingSessions = upcomingSessions.filter(
    (session) => session.creatorId === user?.id && session.participants.some((participant) => participant.status === 'INVITED')
  );
  const outgoingRequestCount = outgoingSessions.reduce(
    (total, session) => total + session.participants.filter((participant) => participant.status === 'INVITED').length,
    0
  );

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  const resetForm = () => {
    setTopic('');
    setDescription('');
    setDate(defaultDate());
    setDuration('120');
    setSessionType('ONLINE');
    setMeetingLink('');
    setLocation('');
    setSelectedParticipants([]);
    setFormError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');

    const allowedIds = new Set(data?.getMyBuddies ?? []);
    const invalidInvitees = selectedParticipants.filter((id) => !allowedIds.has(id));
    if (invalidInvitees.length > 0) {
      setFormError('Only matched study buddies can be invited.');
      return;
    }

    if (!topic.trim()) {
      setFormError('Add a session topic.');
      return;
    }

    if (sessionType === 'ONLINE' && !meetingLink.trim()) {
      setFormError('Add a meeting link for online sessions.');
      return;
    }

    if (sessionType === 'IN_PERSON' && !location.trim()) {
      setFormError('Add a location for in-person sessions.');
      return;
    }

    try {
      await createSession({
        variables: {
          topic: topic.trim(),
          description: description.trim() || null,
          date: new Date(date).toISOString(),
          duration: Number(duration),
          sessionType,
          meetingLink: sessionType === 'ONLINE' ? meetingLink.trim() : null,
          location: sessionType === 'IN_PERSON' ? location.trim() : null,
          participantIds: selectedParticipants,
        },
      });
      resetForm();
      setShowCreate(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create this session.');
    }
  };

  if (loading) return <div className={styles.statePanel}>Loading study sessions...</div>;
  if (error) return <div className={styles.statePanel}>Unable to load study sessions. Please try again.</div>;
const renderSessionCard = (session: StudySessionItem, mode: 'upcoming' | 'outgoing') => {
  const sessionDate = new Date(session.date);
  const isToday = sessionDate.toDateString() === new Date().toDateString();
  const isStartingSoon = (sessionDate.getTime() - Date.now()) < 2 * 60 * 60 * 1000 && sessionDate.getTime() > Date.now();
  const endTime = new Date(sessionDate.getTime() + session.duration * 60000);
  const pendingInvitees = session.participants
    .filter((participant) => participant.status === 'INVITED')
    .map((participant) => usersById.get(participant.userId))
    .filter((invitee): invitee is UserSummary => Boolean(invitee));

  // Get other participants (excluding current user)
  const otherParticipants = session.participants.filter(p => p.userId !== user?.id);
  const displayParticipants = otherParticipants.slice(0, 3);
  const remainingCount = otherParticipants.length - 3;

  const isOnline = session.sessionType.toUpperCase() === 'ONLINE';
  
  // Format time
  const startTimeStr = sessionDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const endTimeStr = endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const durationHours = session.duration / 60;
  const durationText = durationHours === 1 ? '1 hour' : `${durationHours} hours`;
  
  // Format date
  const dateStr = isToday 
    ? 'Today' 
    : sessionDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <article className={styles.sessionCard} key={session.id}>
      {/* Session Icon */}
      <div className={styles.sessionIconWrapper}>
        {isOnline ? (
          <div className={styles.onlineIconBadge} style={{ background: '#BE185D' }}>
            <svg viewBox="0 0 24 24" className={styles.sessionIcon} style={{ stroke: 'white', fill: 'none' }}>
              <rect x="2" y="7" width="15" height="10" rx="2" />
              <path d="M17 9l5-2v10l-5-2V9z" />
            </svg>
          </div>
        ) : (
          <div className={styles.inpersonIconBadge} style={{ background: '#0891B2' }}>
            <svg viewBox="0 0 24 24" className={styles.sessionIcon} style={{ stroke: 'white', fill: 'none' }}>
              <path d="M12 21s-7-6.75-7-11a7 7 0 0 1 14 0c0 4.25-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
          </div>
        )}
      </div>

      <div className={styles.sessionDetails}>
        <div className={styles.sessionTitleRow}>
          <h2>{session.topic}</h2>
          <span className={`${styles.sessionTypeBadge} ${isOnline ? styles.online : styles.inperson}`}>
            {isOnline ? 'Online' : 'In-Person'}
          </span>
        </div>
        
        <p className={styles.courseCode}>CS Course</p>
        
        {isStartingSoon && (
          <div className={styles.sessionStatus}>
            <span className={styles.statusDot} />
            Starting Soon
          </div>
        )}
        
        {/* Date - Bold like reference */}
        <div className={styles.dateLine}>{dateStr}</div>
        
        {/* Time with duration */}
        <div className={styles.timeLine}>
          {startTimeStr} - {endTimeStr} ({durationText})
        </div>
        
        {/* Location with green dot */}
        <div className={styles.sessionLocation}>
          <span className={styles.locationDot} />
          {isOnline ? (session.meetingLink || 'Zoom Meeting') : (session.location || 'Library Room 204')}
        </div>
        
        {/* Organizer */}
        <div className={styles.organizer}>
          Organized by {usersById.get(session.creatorId)?.firstName || 'Mohamed'} {usersById.get(session.creatorId)?.lastName || 'Serag'}
        </div>
        
        {/* Participants Section */}
        <div className={styles.participantsSection}>
          <p className={styles.participantsLabel}>PARTICIPANTS ({session.participants.length})</p>
          <div className={styles.participantsAvatars}>
            {displayParticipants.map((p) => {
              const participantUser = usersById.get(p.userId);
              const initial = participantUser?.firstName?.[0] || participantUser?.lastName?.[0] || '?';
              return (
                <div key={p.id} className={styles.participantAvatar}>
                  {initial}
                </div>
              );
            })}
            {remainingCount > 0 && (
              <span className={styles.participantCount}>+{remainingCount}</span>
            )}
            {otherParticipants.length === 0 && (
              <span className={styles.noParticipants}>No other participants</span>
            )}
          </div>
        </div>
        
        {mode === 'outgoing' && pendingInvitees.length > 0 && (
          <div className={styles.pendingBlock}>
            <strong>Waiting for:</strong>
            <div>
              {pendingInvitees.map((invitee) => (
                <span key={invitee.id}>{invitee.firstName} {invitee.lastName}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
};

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Study Sessions</h1>
          <p>Plan focused sessions with the study buddies you are already matched with.</p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={() => setShowCreate((value) => !value)}>
          {showCreate ? 'Close' : 'Create Session'}
        </button>
      </header>

      {showCreate ? (
        <form className={styles.createPanel} onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <label>
              Topic
              <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Data Structures Study Group" />
            </label>
            <label>
              Date and Time
              <input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>
            <label>
              Session Duration
              <select value={duration} onChange={(event) => setDuration(event.target.value)}>
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
                onChange={(event) => sessionType === 'ONLINE' ? setMeetingLink(event.target.value) : setLocation(event.target.value)}
                placeholder={sessionType === 'ONLINE' ? 'https://zoom.us/...' : 'Library Room 204'}
              />
            </label>
          </div>

          <label className={styles.descriptionField}>
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional notes for your buddies" />
          </label>

          <div className={styles.typePicker} aria-label="Session type">
            <button type="button" className={sessionType === 'ONLINE' ? styles.typeActive : ''} onClick={() => setSessionType('ONLINE')}>
              Online
            </button>
            <button type="button" className={sessionType === 'IN_PERSON' ? styles.typeActive : ''} onClick={() => setSessionType('IN_PERSON')}>
              In-Person
            </button>
          </div>

          <div className={styles.inviteBlock}>
            <div className={styles.inviteHeader}>
              <h2>Invite Participants</h2>
              <span>{selectedParticipants.length} selected</span>
            </div>
            {matchedParticipants.length > 0 ? (
              <div className={styles.inviteList}>
                {matchedParticipants.map((user) => (
                  <label className={styles.inviteRow} key={user.id}>
                    <span className={styles.avatar}>{`${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase()}</span>
                    <span>
                      <strong>{user.firstName} {user.lastName}</strong>
                      <small>{user.email || user.university || 'Matched study buddy'}</small>
                    </span>
                    <input
                      type="checkbox"
                      checked={selectedParticipants.includes(user.id)}
                      onChange={() => toggleParticipant(user.id)}
                    />
                  </label>
                ))}
              </div>
            ) : (
              <div className={styles.emptyInvite}>You do not have matched buddies to invite yet.</div>
            )}
          </div>

          {formError ? <div className={styles.errorBanner}>{formError}</div> : null}
          <button type="submit" className={styles.submitButton} disabled={creating}>
            {creating ? 'Creating...' : 'Create Study Session'}
          </button>
        </form>
      ) : null}

      {!showCreate ? (
        <>
          <nav className={styles.tabs} aria-label="Study session filters">
            <button
              type="button"
              className={activeTab === 'upcoming' ? styles.activeTab : ''}
              onClick={() => setActiveTab('upcoming')}
            >
              <span className={styles.calendarIcon} />
              Upcoming Sessions
              <strong>{upcomingSessions.length}</strong>
            </button>
            <button
              type="button"
              className={activeTab === 'outgoing' ? styles.activeTab : ''}
              onClick={() => setActiveTab('outgoing')}
            >
              <span className={styles.outgoingIcon} />
              Outgoing Requests
              <strong>{outgoingRequestCount}</strong>
            </button>
          </nav>

          <div className={styles.sessionList}>
            {activeTab === 'upcoming' && upcomingSessions.length > 0 ? upcomingSessions.map((session) => renderSessionCard(session, 'upcoming')) : null}
            {activeTab === 'outgoing' && outgoingSessions.length > 0 ? outgoingSessions.map((session) => renderSessionCard(session, 'outgoing')) : null}
            {activeTab === 'upcoming' && upcomingSessions.length === 0 ? (
              <div className={styles.statePanel}>No study sessions yet. Create one when you are ready to gather your matched buddies.</div>
            ) : null}
            {activeTab === 'outgoing' && outgoingSessions.length === 0 ? (
              <div className={styles.statePanel}>No outgoing session requests yet. Invites you send to matched buddies will appear here.</div>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
