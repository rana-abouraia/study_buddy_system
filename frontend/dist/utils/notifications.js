const normalizeText = (value) => (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
export const getNotificationTimeMs = (value) => {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
        return numeric < 1000000000000 ? numeric * 1000 : numeric;
    }
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
};
export function formatNotificationTimeAgo(value) {
    if (value === null || value === undefined || value === '')
        return '';
    const dateMs = typeof value === 'number'
        ? value < 1000000000000 ? value * 1000 : value
        : getNotificationTimeMs(value);
    if (!dateMs)
        return 'Just now';
    const diffMs = Math.max(0, Date.now() - dateMs);
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffSeconds < 60)
        return 'Just now';
    if (diffMinutes < 60)
        return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    if (diffHours < 24)
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays === 1)
        return 'Yesterday';
    if (diffDays < 7)
        return `${diffDays} days ago`;
    return new Date(dateMs).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}
const getNotificationBatch = (value) => {
    const timeMs = getNotificationTimeMs(value);
    if (!timeMs)
        return 'unknown-time';
    const date = new Date(timeMs);
    date.setSeconds(0, 0);
    return date.toISOString();
};
const getNotificationKey = (notification) => [
    normalizeText(notification.type),
    normalizeText(notification.title),
    normalizeText(notification.message),
    getNotificationBatch(notification.createdAt),
].join('|');
export function dedupeNotifications(notifications = []) {
    const groups = new Map();
    notifications.forEach((notification) => {
        const key = getNotificationKey(notification);
        const existing = groups.get(key);
        if (!existing) {
            groups.set(key, {
                ...notification,
                duplicateIds: [notification.id],
                duplicateUnreadIds: notification.isRead ? [] : [notification.id],
            });
            return;
        }
        existing.duplicateIds.push(notification.id);
        if (!notification.isRead) {
            existing.duplicateUnreadIds.push(notification.id);
        }
        const existingTime = getNotificationTimeMs(existing.createdAt);
        const nextTime = getNotificationTimeMs(notification.createdAt);
        if (!existingTime || nextTime > existingTime) {
            Object.assign(existing, notification, {
                duplicateIds: existing.duplicateIds,
                duplicateUnreadIds: existing.duplicateUnreadIds,
            });
        }
        existing.isRead = existing.duplicateUnreadIds.length === 0;
    });
    return Array.from(groups.values()).sort((a, b) => getNotificationTimeMs(b.createdAt) - getNotificationTimeMs(a.createdAt));
}
export function countUnreadNotifications(notifications = []) {
    return dedupeNotifications(notifications).filter((notification) => !notification.isRead).length;
}
export function replaceUserIdsWithNames(message, usersById) {
    let displayMessage = message;
    usersById.forEach((name, id) => {
        if (!id || !name || !displayMessage.includes(id))
            return;
        displayMessage = displayMessage.split(id).join(name);
    });
    return displayMessage;
}
export function isSelfMatchNotification(notification, currentUser) {
    const type = normalizeText(notification.type);
    const title = normalizeText(notification.title);
    const message = normalizeText(notification.message);
    const currentUserName = normalizeText(`${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`);
    if (!type.includes('match') && !title.includes('match'))
        return false;
    if (currentUser?.id && message.includes(normalizeText(currentUser.id)))
        return true;
    return Boolean(currentUserName && message.includes(currentUserName));
}
export function isConnectedMatchNotification(notification, connectedUserIds = [], usersById = new Map()) {
    const type = normalizeText(notification.type);
    const title = normalizeText(notification.title);
    const message = normalizeText(notification.message);
    if (!type.includes('match') && !title.includes('match'))
        return false;
    return connectedUserIds.some((userId) => {
        const user = usersById.get(userId);
        const name = normalizeText(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`);
        return (message.includes(normalizeText(userId)) ||
            Boolean(name && message.includes(name)));
    });
}
