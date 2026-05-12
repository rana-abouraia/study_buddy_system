const normalizeText = (value) => (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const getNotificationDay = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return 'unknown-date';
    return date.toISOString().slice(0, 10);
};
const getNotificationKey = (notification) => [
    normalizeText(notification.type),
    normalizeText(notification.title),
    normalizeText(notification.message),
    getNotificationDay(notification.createdAt),
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
        const existingTime = new Date(existing.createdAt).getTime();
        const nextTime = new Date(notification.createdAt).getTime();
        if (Number.isNaN(existingTime) || nextTime > existingTime) {
            Object.assign(existing, notification, {
                duplicateIds: existing.duplicateIds,
                duplicateUnreadIds: existing.duplicateUnreadIds,
            });
        }
        existing.isRead = existing.duplicateUnreadIds.length === 0;
    });
    return Array.from(groups.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
export function countUnreadNotifications(notifications = []) {
    return dedupeNotifications(notifications).filter((notification) => !notification.isRead).length;
}
