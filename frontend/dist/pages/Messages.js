import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SEND_MESSAGE } from '../graphql/mutations';
import { GET_CONVERSATION_MESSAGES, GET_MESSAGES_PAGE_DATA } from '../graphql/queries';
import styles from '../styles/pages/Messages.module.css';
const formatName = (user) => user ? `${user.firstName} ${user.lastName}` : 'Study Buddy';
const initialsFor = (user) => {
    if (!user)
        return 'SB';
    return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'SB';
};
const formatRelativeTime = (value) => {
    if (!value)
        return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
        return '';
    const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
    if (minutes < 60)
        return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24)
        return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
};
export default function Messages() {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const requestedUserId = searchParams.get('userId') || '';
    const [activeBuddyId, setActiveBuddyId] = useState('');
    const [draft, setDraft] = useState('');
    const [sendError, setSendError] = useState('');
    const { data, loading, error } = useQuery(GET_MESSAGES_PAGE_DATA, {
        fetchPolicy: 'cache-and-network',
    });
    const usersById = useMemo(() => new Map(data?.getAllUsers?.map((person) => [person.id, person]) ?? []), [data?.getAllUsers]);
    const conversations = data?.getMyConversations ?? [];
    const conversationByBuddyId = useMemo(() => {
        const next = new Map();
        conversations.forEach((conversation) => {
            const otherUserId = conversation.participant1 === user?.id ? conversation.participant2 : conversation.participant1;
            next.set(otherUserId, conversation);
        });
        return next;
    }, [conversations, user?.id]);
    const conversationRows = useMemo(() => {
        const rowIds = new Set(data?.getMyBuddies ?? []);
        conversations.forEach((conversation) => {
            const otherUserId = conversation.participant1 === user?.id ? conversation.participant2 : conversation.participant1;
            rowIds.add(otherUserId);
        });
        return Array.from(rowIds)
            .map((buddyId) => ({
            buddyId,
            user: usersById.get(buddyId),
            conversation: conversationByBuddyId.get(buddyId),
        }))
            .filter((row) => Boolean(row.user))
            .sort((a, b) => {
            const aTime = a.conversation?.updatedAt ? new Date(a.conversation.updatedAt).getTime() : 0;
            const bTime = b.conversation?.updatedAt ? new Date(b.conversation.updatedAt).getTime() : 0;
            return bTime - aTime;
        });
    }, [conversationByBuddyId, conversations, data?.getMyBuddies, user?.id, usersById]);
    useEffect(() => {
        if (!activeBuddyId && requestedUserId && conversationRows.some((row) => row.buddyId === requestedUserId)) {
            setActiveBuddyId(requestedUserId);
            return;
        }
        if (!activeBuddyId && conversationRows.length > 0) {
            setActiveBuddyId(conversationRows[0].buddyId);
        }
    }, [activeBuddyId, conversationRows, requestedUserId]);
    const activeConversation = conversationByBuddyId.get(activeBuddyId);
    const activeUser = usersById.get(activeBuddyId);
    const { data: messagesData } = useQuery(GET_CONVERSATION_MESSAGES, {
        variables: { conversationId: activeConversation?.id },
        skip: !activeConversation?.id,
        fetchPolicy: 'cache-and-network',
    });
    const [sendMessage, { loading: sending }] = useMutation(SEND_MESSAGE, {
        refetchQueries: activeConversation?.id
            ? [
                { query: GET_MESSAGES_PAGE_DATA },
                { query: GET_CONVERSATION_MESSAGES, variables: { conversationId: activeConversation.id } },
            ]
            : [{ query: GET_MESSAGES_PAGE_DATA }],
        awaitRefetchQueries: true,
    });
    const messages = messagesData?.getMessages ?? [];
    const handleSend = async (event) => {
        event.preventDefault();
        setSendError('');
        if (!activeBuddyId || !draft.trim())
            return;
        try {
            await sendMessage({
                variables: {
                    receiverId: activeBuddyId,
                    content: draft.trim(),
                },
            });
            setDraft('');
        }
        catch (err) {
            setSendError(err instanceof Error ? err.message : 'Could not send this message.');
        }
    };
    const renderConversation = (row) => {
        const lastMessage = row.conversation?.messages?.[0];
        const showUnreadHint = Boolean(lastMessage && lastMessage.senderId !== user?.id);
        return (_jsxs("button", { type: "button", className: `${styles.conversationRow} ${row.buddyId === activeBuddyId ? styles.activeConversation : ''}`, onClick: () => setActiveBuddyId(row.buddyId), children: [_jsx("span", { className: `${styles.avatar} ${styles[`avatar${Math.abs(row.buddyId.length % 4)}`]}`, children: initialsFor(row.user) }), _jsxs("span", { className: styles.conversationText, children: [_jsx("strong", { children: formatName(row.user) }), _jsx("small", { children: lastMessage?.content || 'Start your study conversation' })] }), _jsxs("span", { className: styles.conversationMeta, children: [_jsx("small", { children: formatRelativeTime(lastMessage?.createdAt || row.conversation?.updatedAt) }), showUnreadHint ? _jsx("b", { children: "1" }) : null] })] }, row.buddyId));
    };
    if (loading)
        return _jsx("div", { className: styles.statePanel, children: "Loading messages..." });
    if (error)
        return _jsx("div", { className: styles.statePanel, children: "Unable to load messages. Please try again." });
    return (_jsxs("section", { className: styles.page, children: [_jsxs("aside", { className: styles.inbox, children: [_jsxs("header", { className: styles.inboxHeader, children: [_jsx("h1", { children: "Messages" }), _jsx("button", { type: "button", "aria-label": "Message menu", children: "Menu" })] }), _jsx("div", { className: styles.conversationList, children: conversationRows.length > 0 ? conversationRows.map(renderConversation) : (_jsx("div", { className: styles.emptyInbox, children: "Your chats with connected study buddies will appear here." })) })] }), _jsx("main", { className: styles.chat, children: activeBuddyId ? (_jsxs(_Fragment, { children: [_jsxs("header", { className: styles.chatHeader, children: [_jsx("span", { className: `${styles.avatar} ${styles.largeAvatar}`, children: initialsFor(activeUser) }), _jsxs("div", { children: [_jsx("h2", { children: formatName(activeUser) }), _jsx("p", { children: activeUser?.academicYear || 'Study Partner' })] }), _jsxs("div", { className: styles.chatActions, children: [_jsx("button", { type: "button", "aria-label": "Call", children: "Call" }), _jsx("button", { type: "button", "aria-label": "Video", children: "Video" }), _jsx("button", { type: "button", "aria-label": "More", children: "Menu" })] })] }), _jsx("div", { className: styles.messagePane, children: messages.length > 0 ? messages.map((message) => {
                                const mine = message.senderId === user?.id;
                                return (_jsxs("div", { className: `${styles.messageBubble} ${mine ? styles.myMessage : styles.theirMessage}`, children: [_jsx("p", { children: message.content }), _jsx("span", { children: formatRelativeTime(message.createdAt) })] }, message.id));
                            }) : (_jsx("div", { className: styles.emptyChat, children: "No messages yet." })) }), _jsxs("form", { className: styles.composer, onSubmit: handleSend, children: [_jsx("button", { type: "button", "aria-label": "Attach", children: "Attach" }), _jsx("input", { value: draft, onChange: (event) => setDraft(event.target.value), placeholder: "Type a message..." }), _jsx("button", { type: "button", "aria-label": "Emoji", children: "Smile" }), _jsx("button", { type: "submit", disabled: sending || !draft.trim(), "aria-label": "Send", children: "Send" })] }), sendError ? _jsx("div", { className: styles.errorBanner, children: sendError }) : null] })) : (_jsx("div", { className: styles.noConversation, children: "Select a conversation to start messaging." })) })] }));
}
