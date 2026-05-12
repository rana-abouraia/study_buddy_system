import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMutation, useQuery } from '@apollo/client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GET_MY_NOTIFICATIONS } from '../graphql/queries';
import { MARK_NOTIFICATION_AS_READ, MARK_ALL_NOTIFICATIONS_AS_READ } from '../graphql/mutations';
import { dedupeNotifications } from '../utils/notifications';
import styles from './Notifications.module.css';
const PAGE_SIZE = 20;
function formatTimeAgo(dateStr) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime()))
        return 'Recently';
    const diffMins = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
    if (diffMins < 60)
        return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    const hours = Math.round(diffMins / 60);
    if (hours < 24)
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    const days = Math.round(hours / 24);
    if (days === 1)
        return 'Yesterday';
    return `${days} days ago`;
}
function getIconStyle(type) {
    const t = type.toLowerCase();
    if (t.includes('match')) {
        return {
            cls: styles.iconWrapGreen,
            svg: (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }), _jsx("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })] })),
        };
    }
    if (t.includes('accepted')) {
        return {
            cls: styles.iconWrapGreen,
            svg: (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "12", cy: "7", r: "4" }), _jsx("polyline", { points: "16 11 18 13 22 9" })] })),
        };
    }
    if (t.includes('request') || t.includes('buddy')) {
        return {
            cls: styles.iconWrapBlue,
            svg: (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "12", cy: "7", r: "4" }), _jsx("line", { x1: "19", y1: "8", x2: "19", y2: "14" }), _jsx("line", { x1: "22", y1: "11", x2: "16", y2: "11" })] })),
        };
    }
    if (t.includes('reminder') || t.includes('upcoming')) {
        return {
            cls: styles.iconWrapOrange,
            svg: (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("polyline", { points: "12 6 12 12 16 14" })] })),
        };
    }
    if (t.includes('cancelled')) {
        return {
            cls: styles.iconWrapRed,
            svg: (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2" }), _jsx("line", { x1: "16", y1: "2", x2: "16", y2: "6" }), _jsx("line", { x1: "8", y1: "2", x2: "8", y2: "6" }), _jsx("line", { x1: "3", y1: "10", x2: "21", y2: "10" }), _jsx("line", { x1: "10", y1: "14", x2: "14", y2: "18" }), _jsx("line", { x1: "14", y1: "14", x2: "10", y2: "18" })] })),
        };
    }
    if (t.includes('session') || t.includes('invitation') || t.includes('created') || t.includes('joined')) {
        return {
            cls: styles.iconWrapBlue,
            svg: (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2" }), _jsx("line", { x1: "16", y1: "2", x2: "16", y2: "6" }), _jsx("line", { x1: "8", y1: "2", x2: "8", y2: "6" }), _jsx("line", { x1: "3", y1: "10", x2: "21", y2: "10" })] })),
        };
    }
    if (t.includes('message') || t.includes('notification-created')) {
        return {
            cls: styles.iconWrapPurple,
            svg: (_jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }) })),
        };
    }
    return {
        cls: styles.iconWrapGray,
        svg: (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" }), _jsx("path", { d: "M13.73 21a2 2 0 0 1-3.46 0" })] })),
    };
}
function getNavigationTarget(type) {
    const t = type.toLowerCase();
    if (t.includes('match') || t.includes('request') || t.includes('received'))
        return '/find-buddies';
    if (t.includes('accepted'))
        return '/my-connections';
    if (t.includes('session') || t.includes('reminder') || t.includes('invitation') || t.includes('upcoming'))
        return '/study-sessions';
    if (t.includes('message') || t.includes('notification-created'))
        return '/messages';
    return '';
}
export default function Notifications() {
    const navigate = useNavigate();
    const [limit, setLimit] = useState(PAGE_SIZE);
    const { data, loading, error } = useQuery(GET_MY_NOTIFICATIONS, {
        variables: { limit },
        fetchPolicy: 'cache-and-network',
    });
    const [markRead] = useMutation(MARK_NOTIFICATION_AS_READ, {
        refetchQueries: [{ query: GET_MY_NOTIFICATIONS, variables: { limit } }],
    });
    const [markAllRead, { loading: markingAll }] = useMutation(MARK_ALL_NOTIFICATIONS_AS_READ, {
        refetchQueries: [{ query: GET_MY_NOTIFICATIONS, variables: { limit } }],
        awaitRefetchQueries: true,
    });
    const allNotifications = data?.myNotifications ?? [];
    const notifications = dedupeNotifications(allNotifications);
    const unreadCount = notifications.filter((notification) => !notification.isRead).length;
    // Backend caps at 100 — hide the button once we've hit that or got fewer than a full page
    const hasMore = allNotifications.length === limit && limit < 100;
    const handleClick = async (notification) => {
        if (!notification.isRead) {
            await Promise.all(notification.duplicateUnreadIds.map((id) => markRead({ variables: { id } })));
        }
        const target = getNavigationTarget(notification.type);
        if (target)
            navigate(target);
    };
    const handleMarkAllRead = async () => {
        await markAllRead();
    };
    const handleLoadMore = () => {
        setLimit((prev) => Math.min(prev + PAGE_SIZE, 100));
    };
    if (loading && notifications.length === 0) {
        return _jsx("div", { className: styles.statePanel, children: "Loading notifications..." });
    }
    if (error) {
        return _jsx("div", { className: styles.statePanel, children: "Unable to load notifications. Please try again." });
    }
    return (_jsxs("section", { className: styles.page, children: [_jsxs("header", { className: styles.header, children: [_jsxs("div", { children: [_jsx("h1", { children: "Notifications" }), _jsx("p", { children: "Stay updated with your study buddy activities" })] }), unreadCount > 0 && (_jsx("button", { type: "button", className: styles.markAllBtn, onClick: handleMarkAllRead, disabled: markingAll, children: markingAll ? 'Marking...' : 'Mark all as read' }))] }), _jsxs("div", { className: styles.listHeader, children: [_jsx("h2", { children: "All Notifications" }), unreadCount > 0 && (_jsxs("span", { className: styles.unreadBadge, children: [unreadCount, " unread notification", unreadCount !== 1 ? 's' : ''] }))] }), notifications.length === 0 ? (_jsxs("div", { className: styles.emptyState, children: [_jsx("div", { className: styles.emptyIcon, children: _jsxs("svg", { width: "40", height: "40", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("path", { d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" }), _jsx("path", { d: "M13.73 21a2 2 0 0 1-3.46 0" })] }) }), _jsx("h3", { children: "No notifications yet" }), _jsx("p", { children: "Buddy matches, requests, and session reminders will appear here." })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: styles.list, children: notifications.map((notification) => {
                            const { cls, svg } = getIconStyle(notification.type);
                            return (_jsxs("article", { className: `${styles.card} ${!notification.isRead ? styles.cardUnread : ''}`, onClick: () => handleClick(notification), role: "button", tabIndex: 0, onKeyDown: (e) => e.key === 'Enter' && handleClick(notification), children: [_jsx("div", { className: `${styles.iconWrap} ${cls}`, children: svg }), _jsxs("div", { className: styles.cardBody, children: [_jsxs("div", { className: styles.cardTop, children: [_jsx("strong", { className: styles.cardTitle, children: notification.title }), !notification.isRead && _jsx("span", { className: styles.unreadDot })] }), _jsx("p", { className: styles.cardMessage, children: notification.message }), _jsx("span", { className: styles.timeAgo, children: formatTimeAgo(notification.createdAt) })] })] }, notification.id));
                        }) }), hasMore && (_jsx("button", { type: "button", className: styles.loadMoreBtn, onClick: handleLoadMore, disabled: loading, children: loading ? 'Loading...' : 'Load more notifications' }))] }))] }));
}
