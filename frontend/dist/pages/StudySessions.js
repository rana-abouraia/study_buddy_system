import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { CalendarDays, CalendarPlus, Clock3, Eye, LogOut, MapPin, Pencil, Trash2, Users, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { gql } from '@apollo/client';
import styles from './StudySessions.module.css';
/* ── GraphQL ─────────────────────────────────────────────── */
const GET_STUDY_SESSIONS_DATA = gql `
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
const GET_TOPIC_SUGGESTIONS = gql `
  query GetTopicSuggestions {
    getProfileSuggestions {
      topics {
        id
        name
      }
    }
  }
`;
const CREATE_STUDY_SESSION = gql `
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
const UPDATE_STUDY_SESSION = gql `
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
const RESPOND_INVITATION = gql `
  mutation RespondToInvitation($sessionId: ID!, $accept: Boolean!) {
    respondToSessionInvitation(sessionId: $sessionId, accept: $accept) {
      id sessionId userId status
    }
  }
`;
const LEAVE_SESSION = gql `
  mutation LeaveSession($sessionId: ID!) {
    leaveSession(sessionId: $sessionId)
  }
`;
const CANCEL_SESSION = gql `
  mutation CancelSession($sessionId: ID!) {
    cancelSession(sessionId: $sessionId)
  }
`;
const JOIN_SESSION = gql `
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
    const [activeTab, setActiveTab] = useState('upcoming');
    const [showCreate, setShowCreate] = useState(false);
    /* create form state */
    const [topic, setTopic] = useState('');
    const [topicPickerOpen, setTopicPickerOpen] = useState(false);
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(defaultDate());
    const [duration, setDuration] = useState('120');
    const [sessionType, setSessionType] = useState('ONLINE');
    const [meetingLink, setMeetingLink] = useState('');
    const [location, setLocation] = useState('');
    const [selectedParticipants, setSelectedParticipants] = useState([]);
    const [formError, setFormError] = useState('');
    const [selectedSession, setSelectedSession] = useState(null);
    /* edit modal state */
    const [editSession, setEditSession] = useState(null);
    const [editMeetingLink, setEditMeetingLink] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [editParticipants, setEditParticipants] = useState([]);
    const [editError, setEditError] = useState('');
    const refetchQ = { refetchQueries: [{ query: GET_STUDY_SESSIONS_DATA }], awaitRefetchQueries: true };
    const { data, loading, error } = useQuery(GET_STUDY_SESSIONS_DATA, {
        fetchPolicy: 'cache-first',
        nextFetchPolicy: 'cache-and-network',
    });
    const { data: topicSuggestionsData } = useQuery(GET_TOPIC_SUGGESTIONS, {
        fetchPolicy: 'cache-first',
        nextFetchPolicy: 'cache-and-network',
    });
    const [createSession, { loading: creating }] = useMutation(CREATE_STUDY_SESSION, refetchQ);
    const [updateSession, { loading: updating }] = useMutation(UPDATE_STUDY_SESSION, refetchQ);
    const [respondInvitation, { loading: responding }] = useMutation(RESPOND_INVITATION, refetchQ);
    const [leaveSession, { loading: leaving }] = useMutation(LEAVE_SESSION, refetchQ);
    const [cancelSession, { loading: cancelling }] = useMutation(CANCEL_SESSION, refetchQ);
    const [joinSession, { loading: joining }] = useMutation(JOIN_SESSION, refetchQ);
    const usersById = useMemo(() => new Map(data?.getAllUsers?.map(u => [u.id, u]) ?? []), [data?.getAllUsers]);
    const matchedParticipants = useMemo(() => (data?.getMyBuddies ?? []).map(id => usersById.get(id)).filter((u) => Boolean(u)), [data?.getMyBuddies, usersById]);
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
    const completedSessions = allMySessions.filter(s => (s.status === 'COMPLETED' || new Date(s.date).getTime() + s.duration * 60000 < Date.now()) && (s.creatorId === user?.id ||
        s.participants.some(p => p.userId === user?.id)));
    const upcomingSessions = allMySessions.filter(s => s.status !== 'CANCELLED' &&
        s.status !== 'COMPLETED' &&
        new Date(s.date).getTime() + s.duration * 60000 >= Date.now() && (s.creatorId === user?.id ||
        s.participants.some(p => p.userId === user?.id && p.status === 'ACCEPTED')));
    const invitationSessions = allMySessions.filter(s => s.status !== 'COMPLETED' &&
        new Date(s.date).getTime() + s.duration * 60000 >= Date.now() &&
        s.participants.some(p => p.userId === user?.id && p.status === 'INVITED'));
    const mySessionIds = new Set(allMySessions.map(s => s.id));
    const availableSessions = allSessions.filter(s => !mySessionIds.has(s.id) &&
        s.status !== 'CANCELLED' &&
        s.status !== 'COMPLETED' &&
        new Date(s.date).getTime() + s.duration * 60000 >= Date.now() &&
        buddyIds.has(s.creatorId));
    const outgoingSessions = allMySessions.filter(s => s.status !== 'COMPLETED' &&
        new Date(s.date).getTime() + s.duration * 60000 >= Date.now() &&
        s.creatorId === user?.id &&
        s.participants.some(p => p.status === 'INVITED'));
    const sortSessions = (sessions) => [...sessions].sort((a, b) => {
        const aTime = new Date(a.date).getTime();
        const bTime = new Date(b.date).getTime();
        const now = Date.now();
        const aPast = aTime < now;
        const bPast = bTime < now;
        if (aPast && !bPast)
            return 1;
        if (!aPast && bPast)
            return -1;
        return aPast ? bTime - aTime : aTime - bTime;
    });
    const toggleParticipant = (id) => setSelectedParticipants(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
    const toggleEditParticipant = (id) => setEditParticipants(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
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
        setTopicPickerOpen(false);
    };
    const openEditModal = (session) => {
        setEditSession(session);
        setEditMeetingLink(session.meetingLink ?? '');
        setEditLocation(session.location ?? '');
        setEditParticipants(session.participants.map(p => p.userId));
        setEditError('');
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        if (!topic.trim())
            return setFormError('Add a session topic.');
        if (sessionType === 'ONLINE' && !meetingLink.trim())
            return setFormError('Add a meeting link for online sessions.');
        if (sessionType === 'IN_PERSON' && !location.trim())
            return setFormError('Add a location for in-person sessions.');
        const allowedIds = new Set(data?.getMyBuddies ?? []);
        if (selectedParticipants.some(id => !allowedIds.has(id)))
            return setFormError('Only matched study buddies can be invited.');
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
            resetForm();
            setShowCreate(false);
        }
        catch (err) {
            setFormError(err instanceof Error ? err.message : 'Could not create session.');
        }
    };
    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setEditError('');
        if (!editSession)
            return;
        const isOnline = editSession.sessionType.toUpperCase() === 'ONLINE';
        if (isOnline && !editMeetingLink.trim())
            return setEditError('Add a meeting link.');
        if (!isOnline && !editLocation.trim())
            return setEditError('Add a location.');
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
        }
        catch (err) {
            setEditError(err instanceof Error ? err.message : 'Could not update session.');
        }
    };
    const handleCancelSession = async (session) => {
        if (!window.confirm(`Cancel "${session.topic}"? All participants will be notified.`))
            return;
        try {
            await cancelSession({ variables: { sessionId: session.id } });
        }
        catch (err) {
            console.error(err);
        }
    };
    const handleLeaveSession = async (session) => {
        if (!window.confirm(`Leave "${session.topic}"?`))
            return;
        try {
            await leaveSession({ variables: { sessionId: session.id } });
        }
        catch (err) {
            console.error(err);
        }
    };
    if (loading)
        return _jsx("div", { className: styles.statePanel, children: "Loading study sessions\u2026" });
    if (error)
        return _jsx("div", { className: styles.statePanel, children: "Unable to load sessions. Please try again." });
    /* ── session card ────────────────────────────────────────── */
    const renderCard = (session, mode) => {
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
        return (_jsxs("article", { className: styles.sessionCard, children: [_jsx("div", { className: styles.sessionIconWrapper, children: _jsx("div", { className: isOnline ? styles.onlineIconBadge : styles.inpersonIconBadge, children: isOnline ? (_jsxs("svg", { viewBox: "0 0 24 24", className: styles.sessionIcon, children: [_jsx("rect", { x: "2", y: "7", width: "15", height: "10", rx: "2" }), _jsx("path", { d: "M17 9l5-2v10l-5-2V9z" })] })) : (_jsxs("svg", { viewBox: "0 0 24 24", className: styles.sessionIcon, children: [_jsx("path", { d: "M12 21s-7-6.75-7-11a7 7 0 0 1 14 0c0 4.25-7 11-7 11z" }), _jsx("circle", { cx: "12", cy: "10", r: "2.5" })] })) }) }), _jsxs("div", { className: styles.sessionMain, children: [_jsxs("div", { className: styles.sessionTop, children: [_jsxs("div", { className: styles.sessionTitleBlock, children: [_jsxs("div", { children: [_jsx("h2", { children: session.topic }), session.description && (_jsx("p", { className: styles.courseCode, children: session.description.length > 85
                                                        ? `${session.description.slice(0, 85)}...`
                                                        : session.description }))] }), isPast && _jsx("div", { className: styles.completedStatus, children: "\u2713 Completed" })] }), _jsx("span", { className: `${styles.sessionTypeBadge} ${isOnline ? styles.online : styles.inperson}`, children: isOnline ? 'Online' : 'In-Person' })] }), !isPast && startingSoon && (_jsxs("div", { className: styles.sessionStatus, children: [_jsx("span", { className: styles.statusDot }), "Starting Soon"] })), _jsxs("div", { className: styles.metaGrid, children: [_jsxs("div", { className: styles.metaItem, children: [_jsx(CalendarDays, { className: styles.metaIcon, size: 18 }), _jsx("span", { children: dateLabel })] }), _jsxs("div", { className: styles.metaItem, children: [_jsx(Clock3, { className: styles.metaIcon, size: 18 }), _jsxs("span", { children: [timeLabel, " (", durLabel, ")"] })] }), _jsxs("div", { className: styles.metaItem, children: [isOnline ? _jsx(Video, { className: styles.metaIcon, size: 18 }) : _jsx(MapPin, { className: styles.metaIcon, size: 18 }), _jsx("span", { children: isOnline ? (session.meetingLink || 'Zoom Meeting') : (session.location || 'TBD') })] }), _jsxs("div", { className: styles.metaItem, children: [_jsx(Users, { className: styles.metaIcon, size: 18 }), _jsxs("span", { children: ["Organized by ", creator ? `${creator.firstName} ${creator.lastName}` : 'Unknown'] })] })] }), _jsx("div", { className: styles.participantsSection, children: _jsxs("div", { className: styles.participantsAvatars, children: [displayParts.map(p => {
                                        const u = usersById.get(p.userId);
                                        return (_jsx("div", { className: styles.participantAvatar, children: u?.firstName?.[0] ?? '?' }, p.id));
                                    }), remainingParticipants > 0 && _jsxs("span", { className: styles.moreParticipants, children: ["+", remainingParticipants, " more"] })] }) })] }), _jsxs("div", { className: styles.cardActions, children: [mode === 'upcoming' && (_jsxs(_Fragment, { children: [!isPast && isOnline && session.meetingLink ? (_jsxs("a", { href: session.meetingLink, target: "_blank", rel: "noreferrer", className: styles.joinBtn, children: [_jsx(Video, { size: 16 }), "Join Meeting"] })) : (_jsxs("button", { className: styles.detailsBtn, onClick: () => setSelectedSession(session), children: [_jsx(Eye, { size: 16 }), "View Details"] })), _jsxs("button", { className: styles.calendarBtn, children: [_jsx(CalendarPlus, { size: 16 }), "Add to Calendar"] }), !isPast && (_jsxs("div", { className: styles.actionIconsRow, children: [_jsx("button", { className: styles.detailsIconBtn, onClick: () => setSelectedSession(session), "aria-label": "View session details", title: "View session details", children: _jsx(Eye, { size: 18 }) }), isCreator && (_jsxs(_Fragment, { children: [_jsx("button", { className: styles.editBtn, onClick: () => openEditModal(session), "aria-label": "Edit session", title: "Edit session", children: _jsx(Pencil, { size: 18 }) }), _jsx("button", { className: styles.deleteBtn, onClick: () => handleCancelSession(session), disabled: cancelling, "aria-label": "Cancel session", title: "Cancel session", children: _jsx(Trash2, { size: 18 }) })] })), !isCreator && isParticipant && (_jsx("button", { className: styles.leaveBtn, onClick: () => handleLeaveSession(session), disabled: leaving, "aria-label": "Leave session", title: "Leave session", children: _jsx(LogOut, { size: 18 }) }))] }))] })), mode === 'completed' && (_jsxs(_Fragment, { children: [_jsxs("button", { className: styles.detailsBtn, onClick: () => setSelectedSession(session), children: [_jsx(Eye, { size: 16 }), "View Details"] }), _jsxs("button", { className: styles.calendarBtn, children: [_jsx(CalendarPlus, { size: 16 }), "Add to Calendar"] })] })), mode === 'available' && (_jsxs(_Fragment, { children: [_jsx("button", { className: styles.joinBtn, onClick: () => joinSession({ variables: { sessionId: session.id } }), disabled: joining, children: "Join Session" }), _jsx("button", { className: styles.calendarBtn, children: "Add to Calendar" })] })), mode === 'invitation' && (_jsxs(_Fragment, { children: [_jsx("button", { className: styles.acceptBtn, onClick: () => respondInvitation({ variables: { sessionId: session.id, accept: true } }), disabled: responding, children: "Accept" }), _jsx("button", { className: styles.declineBtn, onClick: () => respondInvitation({ variables: { sessionId: session.id, accept: false } }), disabled: responding, children: "Decline" }), _jsx("button", { className: styles.declineBtn, onClick: () => handleLeaveSession(session), disabled: leaving, children: "Leave Session" })] }))] })] }, session.id));
    };
    /* ── render ──────────────────────────────────────────────── */
    return (_jsxs("section", { className: styles.page, children: [_jsxs("header", { className: styles.header, children: [_jsxs("div", { children: [_jsx("h1", { children: "Study Sessions" }), _jsx("p", { children: "Plan focused sessions with your matched study buddies." })] }), _jsx("button", { className: styles.primaryButton, onClick: () => setShowCreate(v => !v), children: showCreate ? 'Close' : '+ Create Session' })] }), showCreate && (_jsxs("form", { className: styles.createPanel, onSubmit: handleSubmit, children: [_jsxs("div", { className: styles.formGrid, children: [_jsxs("label", { className: styles.topicField, children: ["Topic", _jsx("input", { value: topic, onFocus: () => setTopicPickerOpen(true), onBlur: () => window.setTimeout(() => setTopicPickerOpen(false), 120), onChange: (e) => {
                                            setTopic(e.target.value);
                                            setTopicPickerOpen(true);
                                        }, placeholder: "Type a topic or select from list" }), topicPickerOpen && (_jsx("div", { className: styles.topicList, children: filteredTopicSuggestions.length > 0 ? filteredTopicSuggestions.map((t) => (_jsx("button", { type: "button", className: `${styles.topicItem} ${topic === t ? styles.activeTopicItem : ''}`, onMouseDown: (event) => event.preventDefault(), onClick: () => {
                                                setTopic(t);
                                                setTopicPickerOpen(false);
                                            }, children: t }, t))) : (_jsx("p", { className: styles.topicEmpty, children: "No saved topics yet. You can type your own." })) }))] }), _jsxs("label", { children: ["Date and Time", _jsx("input", { type: "datetime-local", value: date, onChange: e => setDate(e.target.value) })] }), _jsxs("label", { children: ["Duration", _jsxs("select", { value: duration, onChange: e => setDuration(e.target.value), children: [_jsx("option", { value: "60", children: "1 hour" }), _jsx("option", { value: "90", children: "1.5 hours" }), _jsx("option", { value: "120", children: "2 hours" }), _jsx("option", { value: "180", children: "3 hours" })] })] }), _jsxs("label", { children: [sessionType === 'ONLINE' ? 'Meeting Link' : 'Location', _jsx("input", { value: sessionType === 'ONLINE' ? meetingLink : location, onChange: e => sessionType === 'ONLINE' ? setMeetingLink(e.target.value) : setLocation(e.target.value), placeholder: sessionType === 'ONLINE' ? 'https://zoom.us/…' : 'Library Room 204' })] })] }), _jsxs("label", { className: styles.descriptionField, children: ["Description (optional)", _jsx("textarea", { value: description, onChange: e => setDescription(e.target.value), placeholder: "Notes for your buddies" })] }), _jsxs("div", { className: styles.typePicker, children: [_jsx("button", { type: "button", className: sessionType === 'ONLINE' ? styles.typeActive : '', onClick: () => setSessionType('ONLINE'), children: "\uD83D\uDCBB Online" }), _jsx("button", { type: "button", className: sessionType === 'IN_PERSON' ? styles.typeActive : '', onClick: () => setSessionType('IN_PERSON'), children: "\uD83C\uDFEB In-Person" })] }), _jsxs("div", { className: styles.inviteBlock, children: [_jsxs("div", { className: styles.inviteHeader, children: [_jsx("h2", { children: "Invite Study Buddies" }), _jsxs("span", { children: [selectedParticipants.length, " selected"] })] }), matchedParticipants.length > 0 ? (_jsx("div", { className: styles.inviteList, children: matchedParticipants.map(u => (_jsxs("label", { className: styles.inviteRow, children: [_jsx("span", { className: styles.avatar, children: `${u.firstName[0]}${u.lastName[0]}`.toUpperCase() }), _jsxs("span", { children: [_jsxs("strong", { children: [u.firstName, " ", u.lastName] }), _jsx("small", { children: u.university || u.email || 'Matched study buddy' })] }), _jsx("input", { type: "checkbox", checked: selectedParticipants.includes(u.id), onChange: () => toggleParticipant(u.id) })] }, u.id))) })) : (_jsx("div", { className: styles.emptyInvite, children: "No matched buddies yet \u2014 get matching first!" }))] }), formError && _jsx("div", { className: styles.errorBanner, children: formError }), _jsx("button", { type: "submit", className: styles.submitButton, disabled: creating, children: creating ? 'Creating…' : 'Create Study Session' })] })), !showCreate && (_jsxs(_Fragment, { children: [_jsxs("nav", { className: styles.tabs, children: [_jsxs("button", { className: activeTab === 'upcoming' ? styles.activeTab : '', onClick: () => setActiveTab('upcoming'), children: [_jsxs("svg", { viewBox: "0 0 24 24", className: styles.tabIcon, children: [_jsx("rect", { x: "3", y: "5", width: "18", height: "18", rx: "2" }), _jsx("line", { x1: "16", y1: "3", x2: "16", y2: "7" }), _jsx("line", { x1: "8", y1: "3", x2: "8", y2: "7" }), _jsx("line", { x1: "3", y1: "11", x2: "21", y2: "11" })] }), "Upcoming Sessions", _jsx("strong", { children: upcomingSessions.length })] }), _jsxs("button", { className: activeTab === 'completed' ? styles.activeTab : '', onClick: () => setActiveTab('completed'), children: [_jsxs("svg", { viewBox: "0 0 24 24", className: styles.tabIcon, children: [_jsx("path", { d: "M20 6L9 17l-5-5" }), _jsx("circle", { cx: "12", cy: "12", r: "9" })] }), "Completed Sessions", _jsx("strong", { children: completedSessions.length })] }), _jsxs("button", { className: activeTab === 'invitations' ? styles.activeTab : '', onClick: () => setActiveTab('invitations'), children: [_jsxs("svg", { viewBox: "0 0 24 24", className: styles.tabIcon, children: [_jsx("path", { d: "M4 4h16v16H4z" }), _jsx("path", { d: "M4 7l8 6 8-6" })] }), "Invitations", _jsx("strong", { children: invitationSessions.length })] }), _jsxs("button", { className: activeTab === 'available' ? styles.activeTab : '', onClick: () => setActiveTab('available'), children: [_jsxs("svg", { viewBox: "0 0 24 24", className: styles.tabIcon, children: [_jsx("circle", { cx: "11", cy: "11", r: "7" }), _jsx("line", { x1: "20", y1: "20", x2: "16.65", y2: "16.65" })] }), "Available Sessions", _jsx("strong", { children: availableSessions.length })] }), _jsxs("button", { className: activeTab === 'outgoing' ? styles.activeTab : '', onClick: () => setActiveTab('outgoing'), children: [_jsxs("svg", { viewBox: "0 0 24 24", className: styles.tabIcon, children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), _jsx("polyline", { points: "17 8 12 3 7 8" }), _jsx("line", { x1: "12", y1: "3", x2: "12", y2: "15" })] }), "Outgoing Requests", _jsx("strong", { children: outgoingSessions.length })] })] }), _jsxs("div", { className: styles.sessionList, children: [activeTab === 'upcoming' && (upcomingSessions.length > 0
                                ? sortSessions(upcomingSessions).map(s => renderCard(s, 'upcoming'))
                                : _jsx("div", { className: styles.statePanel, children: "No upcoming sessions yet. Create one or join one from Available." })), activeTab === 'completed' && (completedSessions.length > 0
                                ? sortSessions(completedSessions).map(s => renderCard(s, 'completed'))
                                : _jsx("div", { className: styles.statePanel, children: "No completed sessions yet." })), activeTab === 'invitations' && (invitationSessions.length > 0
                                ? sortSessions(invitationSessions).map(s => renderCard(s, 'invitation'))
                                : _jsx("div", { className: styles.statePanel, children: "No pending invitations." })), activeTab === 'available' && (availableSessions.length > 0
                                ? sortSessions(availableSessions).map(s => renderCard(s, 'available'))
                                : _jsx("div", { className: styles.statePanel, children: "No available sessions from your matched buddies right now." })), activeTab === 'outgoing' && (outgoingSessions.length > 0
                                ? sortSessions(outgoingSessions).map(s => renderCard(s, 'outgoing'))
                                : _jsx("div", { className: styles.statePanel, children: "No outgoing session requests." }))] })] })), selectedSession && (_jsx("div", { className: styles.detailsOverlay, onClick: () => setSelectedSession(null), children: _jsxs("div", { className: styles.detailsModal, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: styles.detailsHeader, children: [_jsx("h2", { children: selectedSession.topic }), _jsx("button", { className: styles.closeBtn, onClick: () => setSelectedSession(null), children: "\u00D7" })] }), _jsxs("div", { className: styles.detailsContent, children: [_jsxs("div", { children: [_jsx("strong", { children: "Status:" }), ' ', new Date(selectedSession.date).getTime() + selectedSession.duration * 60000 < Date.now() ? 'Completed' : 'Upcoming'] }), _jsxs("div", { children: [_jsx("strong", { children: "Type:" }), " ", selectedSession.sessionType] }), _jsxs("div", { children: [_jsx("strong", { children: "Description:" }), _jsx("p", { children: selectedSession.description || 'No description' })] }), _jsxs("div", { children: [_jsx("strong", { children: "Location:" }), ' ', selectedSession.sessionType === 'ONLINE' ? selectedSession.meetingLink || 'Zoom Meeting' : selectedSession.location || 'TBD'] }), _jsxs("div", { children: [_jsx("strong", { children: "Organized By:" }), ' ', usersById.get(selectedSession.creatorId)?.firstName, ' ', usersById.get(selectedSession.creatorId)?.lastName] })] })] }) })), editSession && (_jsx("div", { className: styles.detailsOverlay, onClick: () => setEditSession(null), children: _jsxs("div", { className: styles.detailsModal, onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: styles.detailsHeader, children: [_jsxs("h2", { children: ["Edit \u2014 ", editSession.topic] }), _jsx("button", { className: styles.closeBtn, onClick: () => setEditSession(null), children: "\u00D7" })] }), _jsx("form", { onSubmit: handleEditSubmit, children: _jsxs("div", { className: styles.editFormBody, children: [_jsxs("label", { className: styles.editLabel, children: [editSession.sessionType.toUpperCase() === 'ONLINE' ? 'Meeting Link' : 'Location', _jsx("input", { className: styles.editInput, value: editSession.sessionType.toUpperCase() === 'ONLINE' ? editMeetingLink : editLocation, onChange: e => editSession.sessionType.toUpperCase() === 'ONLINE'
                                                    ? setEditMeetingLink(e.target.value)
                                                    : setEditLocation(e.target.value), placeholder: editSession.sessionType.toUpperCase() === 'ONLINE' ? 'https://zoom.us/…' : 'Library Room 204' })] }), _jsxs("div", { className: styles.editInviteSection, children: [_jsx("p", { className: styles.editInviteTitle, children: "Participants" }), matchedParticipants.length > 0 ? (_jsx("div", { className: styles.inviteList, children: matchedParticipants.map(u => {
                                                    const alreadyIn = editSession.participants.some(p => p.userId === u.id && p.status !== 'DECLINED');
                                                    return (_jsxs("label", { className: styles.inviteRow, children: [_jsx("span", { className: styles.avatar, children: `${u.firstName[0]}${u.lastName[0]}`.toUpperCase() }), _jsxs("span", { children: [_jsxs("strong", { children: [u.firstName, " ", u.lastName] }), _jsx("small", { children: alreadyIn ? '✓ Already invited' : u.university || u.email || 'Matched study buddy' })] }), _jsx("input", { type: "checkbox", checked: editParticipants.includes(u.id), onChange: () => toggleEditParticipant(u.id), disabled: alreadyIn })] }, u.id));
                                                }) })) : (_jsx("div", { className: styles.emptyInvite, children: "No matched buddies available to add." }))] }), editError && _jsx("div", { className: styles.errorBanner, children: editError }), _jsx("button", { type: "submit", className: styles.submitButton, disabled: updating, children: updating ? 'Saving…' : 'Save Changes' })] }) })] }) }))] }));
}
