import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SEND_MESSAGE } from '../graphql/mutations';
import { GET_CONVERSATION_MESSAGES, GET_MESSAGES_PAGE_DATA } from '../graphql/queries';
import type { ConversationItem, ConversationMessagesData, MessagesPageData, UserSummary } from '../types';
import styles from '../styles/pages/Messages.module.css';

const formatName = (user?: UserSummary) => user ? `${user.firstName} ${user.lastName}` : 'Study Buddy';

const initialsFor = (user?: UserSummary) => {
  if (!user) return 'SB';
  return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || 'SB';
};

const formatRelativeTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export default function Messages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedUserId = searchParams.get('userId') || '';
  const [activeBuddyId, setActiveBuddyId] = useState('');
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState('');

  const { data, loading, error } = useQuery<MessagesPageData>(GET_MESSAGES_PAGE_DATA, {
    fetchPolicy: 'cache-and-network',
  });

  const usersById = useMemo(
    () => new Map(data?.getAllUsers?.map((person) => [person.id, person]) ?? []),
    [data?.getAllUsers]
  );

  const conversations = data?.getMyConversations ?? [];
  const conversationByBuddyId = useMemo(() => {
    const next = new Map<string, ConversationItem>();
    conversations.forEach((conversation) => {
      const otherUserId = conversation.participant1 === user?.id ? conversation.participant2 : conversation.participant1;
      next.set(otherUserId, conversation);
    });
    return next;
  }, [conversations, user?.id]);

  const conversationRows = useMemo(() => {
    const rowIds = new Set<string>(data?.getMyBuddies ?? []);
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

  const { data: messagesData } = useQuery<ConversationMessagesData>(GET_CONVERSATION_MESSAGES, {
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

  const handleSend = async (event: FormEvent) => {
    event.preventDefault();
    setSendError('');

    if (!activeBuddyId || !draft.trim()) return;

    try {
      await sendMessage({
        variables: {
          receiverId: activeBuddyId,
          content: draft.trim(),
        },
      });
      setDraft('');
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Could not send this message.');
    }
  };

  const renderConversation = (row: { buddyId: string; user?: UserSummary; conversation?: ConversationItem }) => {
    const lastMessage = row.conversation?.messages?.[0];
    const showUnreadHint = Boolean(lastMessage && lastMessage.senderId !== user?.id);

    return (
      <button
        type="button"
        key={row.buddyId}
        className={`${styles.conversationRow} ${row.buddyId === activeBuddyId ? styles.activeConversation : ''}`}
        onClick={() => setActiveBuddyId(row.buddyId)}
      >
        <span className={`${styles.avatar} ${styles[`avatar${Math.abs(row.buddyId.length % 4)}`]}`}>{initialsFor(row.user)}</span>
        <span className={styles.conversationText}>
          <strong>{formatName(row.user)}</strong>
          <small>{lastMessage?.content || 'Start your study conversation'}</small>
        </span>
        <span className={styles.conversationMeta}>
          <small>{formatRelativeTime(lastMessage?.createdAt || row.conversation?.updatedAt)}</small>
          {showUnreadHint ? <b>1</b> : null}
        </span>
      </button>
    );
  };

  if (loading) return <div className={styles.statePanel}>Loading messages...</div>;
  if (error) return <div className={styles.statePanel}>Unable to load messages. Please try again.</div>;

  return (
    <section className={styles.page}>
      <aside className={styles.inbox}>
        <header className={styles.inboxHeader}>
          <h1>Messages</h1>
          <button type="button" aria-label="Message menu">Menu</button>
        </header>

        <div className={styles.conversationList}>
          {conversationRows.length > 0 ? conversationRows.map(renderConversation) : (
            <div className={styles.emptyInbox}>Your chats with connected study buddies will appear here.</div>
          )}
        </div>
      </aside>

      <main className={styles.chat}>
        {activeBuddyId ? (
          <>
            <header className={styles.chatHeader}>
              <span className={`${styles.avatar} ${styles.largeAvatar}`}>{initialsFor(activeUser)}</span>
              <div>
                <h2>{formatName(activeUser)}</h2>
                <p>{activeUser?.academicYear || 'Study Partner'}</p>
              </div>
              <div className={styles.chatActions}>
                <button type="button" aria-label="Call">Call</button>
                <button type="button" aria-label="Video">Video</button>
                <button type="button" aria-label="More">Menu</button>
              </div>
            </header>

            <div className={styles.messagePane}>
              {messages.length > 0 ? messages.map((message) => {
                const mine = message.senderId === user?.id;
                return (
                  <div className={`${styles.messageBubble} ${mine ? styles.myMessage : styles.theirMessage}`} key={message.id}>
                    <p>{message.content}</p>
                    <span>{formatRelativeTime(message.createdAt)}</span>
                  </div>
                );
              }) : (
                <div className={styles.emptyChat}>No messages yet.</div>
              )}
            </div>

            <form className={styles.composer} onSubmit={handleSend}>
              <button type="button" aria-label="Attach">Attach</button>
              <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message..." />
              <button type="button" aria-label="Emoji">Smile</button>
              <button type="submit" disabled={sending || !draft.trim()} aria-label="Send">Send</button>
            </form>
            {sendError ? <div className={styles.errorBanner}>{sendError}</div> : null}
          </>
        ) : (
          <div className={styles.noConversation}>Select a conversation to start messaging.</div>
        )}
      </main>
    </section>
  );
}
