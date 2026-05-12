import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GET_CONNECTIONS_DATA, GET_COURSES_AND_TOPICS } from '../graphql/queries';
import { ACCEPT_BUDDY_REQUEST, REJECT_BUDDY_REQUEST } from '../graphql/mutations';
import styles from './Connections.module.css';
const tabs = [
    { key: 'incoming', label: 'Incoming Requests', accent: 'pink' },
    { key: 'outgoing', label: 'Outgoing Requests', accent: 'slate' },
    { key: 'buddies', label: 'Study Buddies', accent: 'green' },
];
export default function Connections() {
    const navigate = useNavigate();
    const apolloClient = useApolloClient();
    const [activeTab, setActiveTab] = useState('incoming');
    const [courseMap, setCourseMap] = useState({});
    const [actionError, setActionError] = useState('');
    const { data, loading, error, refetch } = useQuery(GET_CONNECTIONS_DATA, {
        fetchPolicy: 'cache-and-network',
    });
    const [acceptRequest, { loading: accepting }] = useMutation(ACCEPT_BUDDY_REQUEST, {
        refetchQueries: [{ query: GET_CONNECTIONS_DATA }],
        awaitRefetchQueries: true,
    });
    const [rejectRequest, { loading: rejecting }] = useMutation(REJECT_BUDDY_REQUEST, {
        refetchQueries: [{ query: GET_CONNECTIONS_DATA }],
        awaitRefetchQueries: true,
    });
    const usersById = useMemo(() => new Map(data?.getAllUsers?.map((user) => [user.id, user]) ?? []), [data?.getAllUsers]);
    const matchesByCandidate = useMemo(() => new Map(data?.getRecommendedMatches?.map((match) => [
        match.candidateUserId,
        match,
    ]) ?? []), [data?.getRecommendedMatches]);
    const idsToLoad = useMemo(() => {
        const ids = new Set();
        data?.getIncomingBuddyRequests?.forEach((request) => ids.add(request.senderId));
        data?.getOutgoingBuddyRequests?.forEach((request) => ids.add(request.receiverId));
        data?.getMyBuddies?.forEach((id) => ids.add(id));
        return Array.from(ids);
    }, [data]);
    useEffect(() => {
        if (!data?.meProfile || idsToLoad.length === 0)
            return;
        const currentCourses = new Set(data.meProfile.courses.map((course) => course.name.trim().toLowerCase()));
        let cancelled = false;
        async function loadSharedCourses() {
            const nextMap = {};
            await Promise.all(idsToLoad.map(async (userId) => {
                try {
                    const result = await apolloClient.query({
                        query: GET_COURSES_AND_TOPICS,
                        variables: { userId },
                        fetchPolicy: 'network-only',
                    });
                    nextMap[userId] = (result.data.getCoursesAndTopics?.courses ?? [])
                        .map((course) => course.name)
                        .filter((name) => currentCourses.has(name.trim().toLowerCase()));
                }
                catch {
                    nextMap[userId] = [];
                }
            }));
            if (!cancelled) {
                setCourseMap(nextMap);
            }
        }
        loadSharedCourses();
        return () => {
            cancelled = true;
        };
    }, [apolloClient, data?.meProfile, idsToLoad]);
    const formatPercent = (value) => {
        if (value === undefined || value === null)
            return 'Match';
        return `${value > 1 ? Math.round(value) : Math.round(value * 100)}% Match`;
    };
    const formatTimeAgo = (value) => {
        if (!value)
            return 'Recently';
        const date = new Date(value);
        if (Number.isNaN(date.getTime()))
            return 'Recently';
        const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
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
    const getUser = (userId) => usersById.get(userId);
    const getDisplayName = (userId) => {
        const person = getUser(userId);
        return person
            ? `${person.firstName} ${person.lastName}`
            : 'Study Buddy';
    };
    const getInitials = (userId) => {
        const person = getUser(userId);
        if (person) {
            return `${person.firstName?.[0] ?? ''}${person.lastName?.[0] ?? ''}`.toUpperCase();
        }
        return userId.slice(0, 2).toUpperCase() || 'SB';
    };
    const handleAccept = async (requestId) => {
        setActionError('');
        try {
            await acceptRequest({
                variables: { requestId },
            });
            await refetch();
        }
        catch (err) {
            setActionError(err instanceof Error
                ? err.message
                : 'Could not accept this request.');
        }
    };
    const handleReject = async (requestId) => {
        setActionError('');
        try {
            await rejectRequest({
                variables: { requestId },
            });
            await refetch();
        }
        catch (err) {
            setActionError(err instanceof Error
                ? err.message
                : 'Could not reject this request.');
        }
    };
    const incoming = data?.getIncomingBuddyRequests ?? [];
    const outgoing = data?.getOutgoingBuddyRequests ?? [];
    const buddies = data?.getMyBuddies ?? [];
    const counts = {
        incoming: incoming.length,
        outgoing: outgoing.length,
        buddies: buddies.length,
    };
    const renderPersonCard = (userId, options) => {
        const person = getUser(userId);
        const match = matchesByCandidate.get(userId);
        const sharedCourses = courseMap[userId] ?? [];
        return (_jsxs("article", { className: styles.card, children: [_jsxs("div", { className: styles.cardTop, children: [_jsx("div", { className: `${styles.avatar} ${styles[`avatar${Math.abs(userId.length % 4)}`]}`, children: getInitials(userId) }), _jsxs("div", { className: styles.userInfo, children: [_jsx("h2", { children: getDisplayName(userId) }), _jsx("p", { children: person?.academicYear || 'Computer Science Junior' }), _jsx("p", { children: person?.university || 'German International University' }), _jsx("span", { className: styles.matchPill, children: formatPercent(match?.compatibility) })] })] }), _jsxs("div", { className: styles.sharedBlock, children: [_jsxs("p", { children: ["Shared Courses (", sharedCourses.length, ")"] }), _jsx("div", { className: styles.tags, children: sharedCourses.length > 0 ? (sharedCourses.slice(0, 4).map((course) => (_jsx("span", { children: course }, `${userId}-${course}`)))) : (_jsx("span", { children: "No shared courses yet" })) })] }), _jsxs("div", { className: styles.cardFooter, children: [_jsx("span", { children: options.request
                                ? formatTimeAgo(options.request.createdAt)
                                : 'Connected study buddy' }), options.mode === 'incoming' && options.request ? (_jsxs("div", { className: styles.actions, children: [_jsx("button", { type: "button", className: styles.acceptButton, onClick: () => handleAccept(options.request.id), disabled: accepting || rejecting, children: "\u2713 Accept" }), _jsx("button", { type: "button", className: styles.rejectButton, onClick: () => handleReject(options.request.id), disabled: accepting || rejecting, children: "\u2715 Reject" }), _jsx("button", { type: "button", className: styles.eyeButton, onClick: () => navigate('/find-buddies', {
                                        state: { selectedUserId: userId }
                                    }), children: "\uD83D\uDC41" })] })) : null, options.mode === 'outgoing' ? (_jsxs("div", { className: styles.actions, children: [_jsx("span", { className: styles.pendingBadge, children: "Pending" }), _jsx("button", { type: "button", className: styles.eyeButton, onClick: () => navigate('/find-buddies', {
                                        state: { selectedUserId: userId }
                                    }), children: "\uD83D\uDC41" })] })) : null, options.mode === 'buddies' ? (_jsxs("div", { className: styles.actions, children: [_jsx("button", { type: "button", className: styles.acceptButton, onClick: () => navigate(`/messages?userId=${encodeURIComponent(userId)}`), children: "Message" }), _jsx("button", { type: "button", className: styles.outlineButton, onClick: () => navigate('/study-sessions'), children: "Plan Session" }), _jsx("button", { type: "button", className: styles.eyeButton, onClick: () => navigate('/find-buddies', {
                                        state: { selectedUserId: userId }
                                    }), children: "\uD83D\uDC41" })] })) : null] })] }, options.request?.id ?? userId));
    };
    const activeItems = {
        incoming: incoming.map((request) => renderPersonCard(request.senderId, {
            request,
            mode: 'incoming',
        })),
        outgoing: outgoing.map((request) => renderPersonCard(request.receiverId, {
            request,
            mode: 'outgoing',
        })),
        buddies: buddies.map((userId) => renderPersonCard(userId, {
            mode: 'buddies',
        })),
    }[activeTab];
    if (loading) {
        return (_jsx("div", { className: styles.statePanel, children: "Loading your connections..." }));
    }
    if (error) {
        return (_jsx("div", { className: styles.statePanel, children: "Unable to load connections from the backend. Please try again." }));
    }
    return (_jsxs("section", { className: styles.page, children: [_jsxs("header", { className: styles.header, children: [_jsxs("div", { children: [_jsx("h1", { children: "My Connections" }), _jsx("p", { children: "Accept requests, track outgoing invites, and jump into study plans with your buddies." })] }), _jsx("button", { type: "button", className: styles.discoverButton, onClick: () => navigate('/find-buddies'), children: "Find more buddies" })] }), _jsx("nav", { className: styles.tabs, "aria-label": "Connection filters", children: tabs.map((tab) => (_jsxs("button", { type: "button", className: `${styles.tab} ${activeTab === tab.key ? styles.activeTab : ''}`, onClick: () => setActiveTab(tab.key), children: [_jsx("span", { className: styles[`${tab.accent}Dot`] }), tab.label, _jsx("strong", { children: counts[tab.key] })] }, tab.key))) }), actionError ? (_jsx("div", { className: styles.errorBanner, children: actionError })) : null, _jsx("div", { className: styles.grid, children: activeItems.length > 0 ? (activeItems) : (_jsxs("div", { className: styles.emptyState, children: [_jsxs("h2", { children: ["No", ' ', tabs
                                    .find((tab) => tab.key === activeTab)
                                    ?.label.toLowerCase(), ' ', "yet"] }), _jsx("p", { children: activeTab === 'incoming'
                                ? 'New requests will appear here as soon as classmates reach out.'
                                : 'Use Find Buddies to grow this part of your study network.' }), _jsx("button", { type: "button", onClick: () => navigate('/find-buddies'), children: "Explore matches" })] })) })] }));
}
