import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GET_DASHBOARD_DATA, GET_COURSES_AND_TOPICS } from '../graphql/queries';
import { SEND_BUDDY_REQUEST, MARK_NOTIFICATION_AS_READ } from '../graphql/mutations';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dedupeNotifications, formatNotificationTimeAgo, isConnectedMatchNotification, isSelfMatchNotification } from '../utils/notifications';
import styles from '../styles/pages/Dashboard.module.css';
const DASHBOARD_MATCH_LIMIT = 12;
export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const apolloClient = useApolloClient();
    const searchTerm = (searchParams.get('search') ?? '').trim().toLowerCase();
    const [commonCoursesByCandidate, setCommonCoursesByCandidate] = useState({});
    const [readNotificationIds, setReadNotificationIds] = useState(new Set());
    const [connectError, setConnectError] = useState('');
    const { data, loading, error } = useQuery(GET_DASHBOARD_DATA, {
        variables: {
            notificationLimit: 100,
            matchLimit: DASHBOARD_MATCH_LIMIT,
        },
        fetchPolicy: 'cache-first',
        nextFetchPolicy: 'cache-and-network',
    });
    const [sendBuddyRequest, { loading: sendingBuddyRequest }] = useMutation(SEND_BUDDY_REQUEST, {
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
    });
    const [markNotificationAsRead] = useMutation(MARK_NOTIFICATION_AS_READ, {
        update(cache, { data }) {
            if (!data?.markNotificationAsRead)
                return;
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
    const formatPercentage = (value) => {
        if (value === null || value === undefined)
            return '-';
        const formatted = value > 1 ? Math.round(value) : Math.round(value * 100);
        return `${formatted}%`;
    };
    const formatBuddyName = (id) => {
        if (!id)
            return 'Study Buddy';
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
        const matches = data.getRecommendedMatches.filter((match) => match.candidateUserId !== user.id &&
            !connectedIds.has(match.candidateUserId));
        const currentCourses = new Set(data.meProfile.courses.map((course) => course.name.trim().toLowerCase()));
        let cancelled = false;
        async function loadCandidateCourses() {
            const map = {};
            await Promise.all(matches.map(async (buddy) => {
                try {
                    const result = await apolloClient.query({
                        query: GET_COURSES_AND_TOPICS,
                        variables: { userId: buddy.candidateUserId },
                        fetchPolicy: 'network-only',
                    });
                    const candidateCourses = result.data.getCoursesAndTopics?.courses ?? [];
                    map[buddy.candidateUserId] = candidateCourses
                        .map((course) => course.name)
                        .filter((name) => currentCourses.has(name.trim().toLowerCase()));
                }
                catch {
                    map[buddy.candidateUserId] = [];
                }
            }));
            if (!cancelled)
                setCommonCoursesByCandidate(map);
        }
        loadCandidateCourses();
        return () => {
            cancelled = true;
        };
    }, [apolloClient, data, user]);
    if (!user) {
        return (_jsx("div", { className: styles.loadingScreen, children: _jsx("div", { className: styles.loadingDot }) }));
    }
    if (loading) {
        return (_jsx("div", { className: styles.loadingScreen, children: _jsx("div", { className: styles.loadingDot }) }));
    }
    if (error) {
        return (_jsx("div", { className: styles.loadingScreen, children: _jsx("p", { children: "Unable to load dashboard data. Please refresh or try again later." }) }));
    }
    const connectedIds = new Set(data?.getMyBuddies ?? []);
    // IDs we've already sent a request to — sourced from DB, not local state
    const outgoingIds = new Set(data?.getOutgoingBuddyRequests?.map((req) => req.receiverId) ?? []);
    const usersById = new Map(data?.getAllUsers?.map((u) => [u.id, u]) ?? []);
    const matchesSearch = (...values) => !searchTerm || values.some((value) => value?.toLowerCase().includes(searchTerm));
    const getBuddyDisplayName = (id) => {
        const buddy = usersById.get(id);
        if (!buddy)
            return formatBuddyName(id);
        return `${buddy.firstName} ${buddy.lastName}`;
    };
    const getBuddyInitials = (id) => {
        const buddy = usersById.get(id);
        if (buddy) {
            return `${buddy.firstName?.[0] ?? ''}${buddy.lastName?.[0] ?? ''}`.toUpperCase();
        }
        if (!id)
            return 'SB';
        const pieces = id.split(/[-_.]/).filter(Boolean);
        const initials = pieces.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('');
        return initials || id.slice(0, 2).toUpperCase();
    };
    const getBuddyRole = (id) => {
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
        return (sessionDate >= now &&
            sessionDate <= endOfWeek &&
            status !== 'COMPLETED' &&
            status !== 'CANCELLED' &&
            matchesSearch(session.topic, session.location, session.sessionType));
    })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);
    const dashboardNotifications = (data?.myNotifications ?? []).filter((notification) => (!isSelfMatchNotification(notification, user) &&
        !isConnectedMatchNotification(notification, data?.getMyBuddies ?? [], usersById)));
    const notifications = dedupeNotifications(dashboardNotifications).slice(0, 5);
    // Exclude already-connected AND already-requested candidates — both sourced from DB
    const buddies = (data?.getRecommendedMatches ?? [])
        .filter((match) => match.candidateUserId !== user.id &&
        !connectedIds.has(match.candidateUserId) &&
        !outgoingIds.has(match.candidateUserId) &&
        matchesSearch(getBuddyDisplayName(match.candidateUserId), getBuddyRole(match.candidateUserId), ...(commonCoursesByCandidate[match.candidateUserId] ?? []), ...match.reasons))
        .slice(0, 3);
    const handleConnect = async (candidateUserId) => {
        setConnectError('');
        try {
            await sendBuddyRequest({ variables: { receiverId: candidateUserId } });
            // No local state update needed — awaitRefetchQueries updates outgoingIds from DB
        }
        catch (err) {
            setConnectError(err instanceof Error ? err.message : 'Could not send this buddy request.');
        }
    };
    const handleViewProfile = (matchId) => {
        navigate('/find-buddies', { state: { selectedMatchId: matchId } });
    };
    return (_jsx("div", { className: styles.page, children: _jsxs("div", { className: styles.content, children: [_jsxs("section", { className: styles.dashboardHeader, children: [_jsxs("div", { children: [_jsxs("h1", { className: styles.title, children: ["Welcome back, ", user.firstName, "!"] }), _jsx("p", { className: styles.subtitle, children: "Here's what's happening with your study sessions today." })] }), _jsxs("div", { className: styles.actionCards, children: [_jsx("button", { type: "button", className: `${styles.actionCard} ${styles.actionMagentaFeatured}`, onClick: () => navigate('/find-buddies'), children: _jsxs("div", { className: styles.featuredActionContent, children: [_jsx("div", { className: styles.featuredActionIcon, children: _jsxs("svg", { className: styles.featuredActionUserPlus, viewBox: "0 0 24 24", children: [_jsx("path", { d: "M15 19a6 6 0 0 0-12 0" }), _jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("path", { d: "M19 8v6" }), _jsx("path", { d: "M22 11h-6" })] }) }), _jsxs("div", { className: styles.featuredActionText, children: [_jsx("p", { className: styles.actionLabel, children: "Find Study Buddies" }), _jsx("p", { children: "Discover compatible students based on your courses." })] })] }) }), _jsx("button", { type: "button", className: `${styles.actionCard} ${styles.actionTealFeatured}`, onClick: () => navigate('/study-sessions'), children: _jsxs("div", { className: styles.featuredActionContent, children: [_jsx("div", { className: styles.featuredActionIcon, children: _jsxs("svg", { className: styles.featuredActionCalendar, viewBox: "0 0 24 24", children: [_jsx("rect", { x: "3", y: "5", width: "18", height: "16", rx: "2" }), _jsx("path", { d: "M16 3v4" }), _jsx("path", { d: "M8 3v4" }), _jsx("path", { d: "M3 10h18" })] }) }), _jsxs("div", { className: styles.featuredActionText, children: [_jsx("p", { className: styles.actionLabel, children: "Create Study Session" }), _jsx("p", { children: "Schedule collaborative study sessions with your group." })] })] }) }), _jsx("button", { type: "button", className: `${styles.actionCard} ${styles.actionGreenFeatured}`, onClick: () => navigate('/availability'), children: _jsxs("div", { className: styles.featuredActionContent, children: [_jsx("div", { className: styles.featuredActionIcon, children: _jsxs("svg", { className: styles.featuredActionClock, viewBox: "0 0 24 24", children: [_jsx("circle", { cx: "12", cy: "12", r: "9" }), _jsx("path", { d: "M12 7v5l3 3" })] }) }), _jsxs("div", { className: styles.featuredActionText, children: [_jsx("p", { className: styles.actionLabel, children: "Manage Availability" }), _jsx("p", { children: "Update your available study hours and preferences." })] })] }) })] })] }), _jsxs("section", { className: styles.gridArea, children: [_jsxs("div", { className: styles.upcomingCard, children: [_jsxs("div", { className: styles.cardHeader, children: [_jsxs("div", { children: [_jsx("h2", { children: "Upcoming Study Sessions" }), _jsx("p", { children: "Your scheduled sessions this week" })] }), _jsx("button", { className: "btn-ghost", type: "button", onClick: () => navigate('/study-sessions'), children: "View All" })] }), _jsx("div", { className: styles.sessionList, children: sessions.length > 0 ? sessions.map((session) => {
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
                                        return (_jsxs("div", { className: styles.sessionItem, children: [isOnline ? (_jsx("div", { className: styles.onlineIconBadge, style: { background: '#BE185D' }, children: _jsxs("svg", { viewBox: "0 0 24 24", className: styles.sessionIcon, style: { stroke: 'white' }, children: [_jsx("rect", { x: "2", y: "7", width: "15", height: "10", rx: "2" }), _jsx("path", { d: "M17 9l5-2v10l-5-2V9z" })] }) })) : (_jsx("div", { className: styles.inpersonIconBadge, style: { background: '#BE185D' }, children: _jsxs("svg", { viewBox: "0 0 24 24", className: styles.sessionIcon, style: { stroke: 'white' }, children: [_jsx("path", { d: "M12 21s-7-6.75-7-11a7 7 0 0 1 14 0c0 4.25-7 11-7 11z" }), _jsx("circle", { cx: "12", cy: "10", r: "2.5" })] }) })), _jsxs("div", { className: styles.sessionInfo, children: [_jsx("p", { className: styles.sessionTitle, children: session.topic }), _jsxs("p", { className: styles.sessionMeta, children: [isToday ? 'Today' : sessionDate.toLocaleDateString([], { month: 'short', day: 'numeric' }), " \u2022 ", timeStr] }), _jsx("p", { className: styles.sessionParticipants, children: participantText })] }), _jsx("div", { className: styles.sessionTypeText, children: _jsx("span", { className: isOnline ? styles.onlineText : styles.inpersonText, children: isOnline ? 'Online' : 'In-Person' }) })] }, session.id));
                                    }) : (_jsx("div", { className: styles.emptyState, children: "No upcoming sessions this week." })) })] }), _jsxs("div", { className: styles.notificationsCard, children: [_jsx("div", { className: styles.cardHeader, children: _jsx("h2", { children: "Recent Notifications" }) }), _jsxs("div", { className: styles.notificationList, children: [notifications.length > 0 ? (notifications.map((note) => {
                                            const notificationText = note.title || note.message;
                                            const isRead = note.isRead || note.duplicateUnreadIds.every((id) => readNotificationIds.has(id));
                                            const getNotificationRoute = () => {
                                                const type = note.type?.toLowerCase?.() || '';
                                                const message = notificationText.toLowerCase();
                                                if (type.includes('message') || message.includes('message'))
                                                    return '/messages';
                                                if (type.includes('session') || message.includes('session'))
                                                    return '/study-sessions';
                                                if (type.includes('buddy') || type.includes('match') || message.includes('buddy') || message.includes('match'))
                                                    return '/find-buddies';
                                                return '/notifications';
                                            };
                                            return (_jsx("button", { type: "button", onClick: async () => {
                                                    if (!isRead) {
                                                        setReadNotificationIds((prev) => {
                                                            const next = new Set(prev);
                                                            note.duplicateUnreadIds.forEach((id) => next.add(id));
                                                            return next;
                                                        });
                                                        await Promise.all(note.duplicateUnreadIds.map((id) => markNotificationAsRead({ variables: { id } }).catch(() => null)));
                                                    }
                                                    navigate(getNotificationRoute());
                                                }, className: `${styles.notificationItem} ${!isRead ? styles.notificationUnread : styles.notificationRead}`, children: _jsxs("div", { className: styles.notificationContent, children: [_jsxs("div", { className: styles.notificationTop, children: [!isRead && _jsx("span", { className: styles.notificationDot }), _jsx("p", { children: notificationText })] }), _jsx("span", { className: styles.notificationTime, children: formatNotificationTimeAgo(note.createdAt) })] }) }, note.id));
                                        })) : (_jsx("div", { className: styles.emptyState, children: "No new notifications yet." })), _jsx("button", { type: "button", className: styles.viewAllNotifications, onClick: () => navigate('/notifications'), children: "View All Notifications" })] })] }), _jsxs("div", { className: styles.recommendedCard, children: [_jsxs("div", { className: styles.cardHeader, children: [_jsxs("div", { children: [_jsx("h2", { children: "Recommended Study Buddies" }), _jsx("p", { children: "Matches based on your profile" })] }), _jsx("button", { className: "btn-ghost", type: "button", onClick: () => navigate('/find-buddies'), children: "View All" })] }), _jsxs("div", { className: styles.buddyList, children: [connectError ? (_jsx("div", { className: styles.inlineError, children: connectError })) : null, buddies.length > 0 ? (buddies.map((buddy) => (_jsx("div", { className: styles.buddyItem, children: _jsxs("div", { className: styles.buddyContent, children: [_jsx("div", { className: styles.buddyAvatarCircle, children: getBuddyInitials(buddy.candidateUserId) }), _jsxs("div", { className: styles.buddyInfo, children: [_jsxs("div", { className: styles.buddyNameRow, children: [_jsx("p", { className: styles.buddyName, children: getBuddyDisplayName(buddy.candidateUserId) }), _jsxs("span", { className: styles.matchPill, children: [formatPercentage(buddy.compatibility), " Match"] })] }), _jsx("p", { className: styles.buddyRole, children: getBuddyRole(buddy.candidateUserId) }), _jsx("div", { className: styles.tagGroup, children: [
                                                                    ...(commonCoursesByCandidate[buddy.candidateUserId] ?? []),
                                                                    ...buddy.reasons.filter((reason) => !reason.startsWith('Shared courses')),
                                                                ]
                                                                    .slice(0, 4)
                                                                    .map((reason) => (_jsx("span", { className: styles.tag, children: reason }, `${buddy.id}-${reason}`))) })] }), _jsxs("div", { className: styles.buddyActions, children: [_jsx("button", { className: "btn-primary", type: "button", disabled: sendingBuddyRequest, onClick: () => handleConnect(buddy.candidateUserId), children: "+ Connect" }), _jsx("button", { className: "btn-outline", type: "button", onClick: () => handleViewProfile(buddy.id), children: "View Profile" })] })] }) }, buddy.id)))) : (_jsx("div", { className: styles.emptyState, children: "No recommended buddies available yet." }))] })] })] })] }) }));
}
