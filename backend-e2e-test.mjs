#!/usr/bin/env node
/**
 * Study Buddy — End-to-End Dry Run Test
 * =====================================
 *
 * Runs the full spec flow against the API gateway at http://localhost:4000,
 * asserts each step, then wipes ALL test data from the 7 service databases.
 *
 * Requires:
 *   - Node.js 20+ (for native fetch)
 *   - pg package for cleanup:  npm install pg
 *   - backend running:         cd backend && docker compose up --build
 *   - backend/.env populated with DATABASE_URLs
 *
 * Run:
 *   node backend-e2e-test.mjs
 *
 * Exit codes:  0 = all passed, 1 = any failure (data is wiped either way)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_URL = process.env.API_URL || 'http://localhost:4000/';
const ENV_PATH = path.resolve(__dirname, 'backend', '.env');

// ── Load backend/.env ─────────────────────────────────────────────────────
const env = {};
if (fs.existsSync(ENV_PATH)) {
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
} else {
  console.warn(`⚠  backend/.env not found at ${ENV_PATH}. Cleanup will be skipped.`);
}

// ── Dynamically import pg (needed only for cleanup) ────────────────────────
let pg = null;
try {
  pg = (await import('pg')).default;
} catch {
  console.warn('⚠  pg module missing. Run `npm install pg` so cleanup works.');
}

// ── Tiny assertion framework ──────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.error(`  ✗ ${message}`);
  }
}

function section(title) {
  console.log(`\n━━━ ${title} ━━━`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── GraphQL helper ────────────────────────────────────────────────────────
async function gql(query, variables = {}, token = null) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
  }
  if (body.errors) {
    const msg = body.errors.map((e) => e.message).join('; ');
    throw new Error(`GraphQL error: ${msg}`);
  }
  return body.data;
}

// ── Test users (unique per run to avoid collisions) ───────────────────────
const stamp = Date.now();
const aliceEmail = `e2e-alice-${stamp}@test.local`;
const bobEmail = `e2e-bob-${stamp}@test.local`;
const password = 'testpassword123';

let aliceToken = null;
let aliceId = null;
let bobToken = null;
let bobId = null;

// ── Main test flow ────────────────────────────────────────────────────────
async function runTests() {
  // 1. Register two users
  section('User & Auth Service');
  const registerMutation = `
    mutation($email: String!, $password: String!, $firstName: String!) {
      register(
        email: $email, password: $password,
        firstName: $firstName, lastName: "Doe",
        university: "Cairo University", academicYear: "Junior"
      ) {
        token
        user { id email firstName university }
      }
    }`;

  const aliceReg = await gql(registerMutation, {
    email: aliceEmail, password, firstName: 'Alice',
  });
  aliceToken = aliceReg.register.token;
  aliceId = aliceReg.register.user.id;
  assert(aliceToken && aliceId, `Alice registered — id=${aliceId}`);
  assert(aliceReg.register.user.email === aliceEmail, 'Alice email returned correctly');

  const bobReg = await gql(registerMutation, {
    email: bobEmail, password, firstName: 'Bob',
  });
  bobToken = bobReg.register.token;
  bobId = bobReg.register.user.id;
  assert(bobToken && bobId, `Bob registered — id=${bobId}`);

  // 2. Login
  const login = await gql(
    `mutation($e: String!, $p: String!) { login(email: $e, password: $p) { token } }`,
    { e: aliceEmail, p: password },
  );
  assert(typeof login.login.token === 'string' && login.login.token.length > 20, 'Login returns a token');

  // Bad password should fail
  try {
    await gql(
      `mutation($e: String!, $p: String!) { login(email: $e, password: $p) { token } }`,
      { e: aliceEmail, p: 'wrong' },
    );
    assert(false, 'Login with wrong password should have thrown');
  } catch (e) {
    assert(e.message.includes('Invalid password') || e.message.toLowerCase().includes('invalid'),
      'Wrong password rejected');
  }

  // 3. me query
  const me = await gql(`query { me { id email } }`, {}, aliceToken);
  assert(me.me.id === aliceId, 'me returns authenticated user');

  // Unauthenticated should fail
  try {
    await gql(`query { me { id } }`);
    assert(false, 'me without auth should have thrown');
  } catch (e) {
    assert(e.message.toLowerCase().includes('not authenticated'), 'Unauthenticated me rejected');
  }

  // 4. Profile & preferences
  section('Profile & Preferences Service');
  for (const token of [aliceToken, bobToken]) {
    await gql(
      `mutation { updatePreferences(input: {
        studyPace: "MODERATE", studyMode: "ONLINE", groupSize: "2",
        studyStyles: ["DISCUSSION", "QUIET"], preferredTimes: ["EVENING"]
      }) { studyPace studyMode groupSize } }`,
      {}, token,
    );
    await gql(
      `mutation { addCourse(input: { name: "Data Structures", code: "CS201", term: "Spring" }) { id } }`,
      {}, token,
    );
    await gql(
      `mutation { addTopic(input: { name: "Graph Algorithms" }) { id } }`,
      {}, token,
    );
  }
  const profile = await gql(`query { meProfile { studyPace courses { code } topics { name } } }`, {}, aliceToken);
  assert(profile.meProfile.studyPace === 'MODERATE', 'Preferences saved');
  assert(profile.meProfile.courses.some((c) => c.code === 'CS201'), 'Course added');
  assert(profile.meProfile.topics.some((t) => t.name === 'Graph Algorithms'), 'Topic added');

  // 5. Availability — multiple slots (tests the C5 snapshot fix)
  section('Availability Service — multiple slots (C5 fix)');
  await gql(
    `mutation { addAvailabilitySlot(dayOfWeek: 1, startTime: "14:00", endTime: "16:00") { id } }`,
    {}, aliceToken,
  );
  await gql(
    `mutation { addAvailabilitySlot(dayOfWeek: 3, startTime: "14:00", endTime: "16:00") { id } }`,
    {}, aliceToken,
  );
  await gql(
    `mutation { addAvailabilitySlot(dayOfWeek: 1, startTime: "15:00", endTime: "17:00") { id } }`,
    {}, bobToken,
  );
  await gql(
    `mutation { addAvailabilitySlot(dayOfWeek: 3, startTime: "14:30", endTime: "15:30") { id } }`,
    {}, bobToken,
  );

  const aliceAvail = await gql(`query { getMyAvailability { id dayOfWeek startTime endTime } }`, {}, aliceToken);
  assert(aliceAvail.getMyAvailability.length === 2,
    `Alice has both slots (pre-patch bug would show 1). Got ${aliceAvail.getMyAvailability.length}`);

  // Overlap should be rejected
  try {
    await gql(
      `mutation { addAvailabilitySlot(dayOfWeek: 1, startTime: "15:00", endTime: "15:30") { id } }`,
      {}, aliceToken,
    );
    assert(false, 'Overlapping slot should have thrown');
  } catch (e) {
    assert(e.message.toLowerCase().includes('overlap'), 'Overlapping availability rejected');
  }

  // 6. Wait for Kafka snapshots to reach matching-service, then query matches
  section('Matching Service');
  console.log('  … waiting 5s for Kafka propagation to matching-service …');
  await sleep(5000);

  const matches = await gql(`query { getRecommendedMatches { candidateUserId compatibility reasons } }`, {}, aliceToken);
  const bobMatch = matches.getRecommendedMatches.find((m) => m.candidateUserId === bobId);
  assert(bobMatch, `Alice sees Bob in her match list (got ${matches.getRecommendedMatches.length} total)`);
  if (bobMatch) {
    assert(bobMatch.compatibility > 0, `Compatibility score > 0 (got ${bobMatch.compatibility})`);
    assert(bobMatch.reasons.length > 0, `Has match reasons: ${bobMatch.reasons.join(', ')}`);
  }

  // Matching profile exposes availability
  const mp = await gql(`query { getMatchProfile { userId courses topics availabilitySlots { dayOfWeek } } }`, {}, aliceToken);
  assert(mp.getMatchProfile.availabilitySlots.length === 2,
    `Match profile has 2 slots (proves snapshot sync, got ${mp.getMatchProfile.availabilitySlots.length})`);

  // Matching auth check
  try {
    await gql(`query { getRecommendedMatches { candidateUserId } }`);
    assert(false, 'Matching without auth should have thrown');
  } catch (e) {
    assert(e.message.toLowerCase().includes('not authenticated'), 'Matching service requires auth');
  }

  // 7. Buddy request flow
  section('Buddy Requests (v3 feature)');
  const sent = await gql(
    `mutation($rid: String!) { sendBuddyRequest(receiverId: $rid) { id status senderId receiverId } }`,
    { rid: bobId }, aliceToken,
  );
  const requestId = sent.sendBuddyRequest.id;
  assert(sent.sendBuddyRequest.status === 'PENDING', 'Buddy request created PENDING');

  // Duplicate should fail
  try {
    await gql(
      `mutation($rid: String!) { sendBuddyRequest(receiverId: $rid) { id } }`,
      { rid: bobId }, aliceToken,
    );
    assert(false, 'Duplicate buddy request should have thrown');
  } catch {
    assert(true, 'Duplicate buddy request rejected');
  }

  // Bob sees incoming
  const incoming = await gql(`query { getIncomingBuddyRequests { id senderId } }`, {}, bobToken);
  assert(incoming.getIncomingBuddyRequests.some((r) => r.id === requestId), 'Bob sees incoming request');

  // Alice sees outgoing
  const outgoing = await gql(`query { getOutgoingBuddyRequests { id receiverId } }`, {}, aliceToken);
  assert(outgoing.getOutgoingBuddyRequests.some((r) => r.id === requestId), 'Alice sees outgoing request');

  // Only the receiver can accept
  try {
    await gql(
      `mutation($id: String!) { acceptBuddyRequest(requestId: $id) { status } }`,
      { id: requestId }, aliceToken,
    );
    assert(false, 'Sender should not be able to accept own request');
  } catch {
    assert(true, 'Only receiver can accept buddy request');
  }

  // Bob accepts
  const accepted = await gql(
    `mutation($id: String!) { acceptBuddyRequest(requestId: $id) { status } }`,
    { id: requestId }, bobToken,
  );
  assert(accepted.acceptBuddyRequest.status === 'ACCEPTED', 'Request accepted');

  // Alice's buddies now includes Bob
  const buddies = await gql(`query { getMyBuddies }`, {}, aliceToken);
  assert(buddies.getMyBuddies.includes(bobId), 'Bob in Alice\'s buddies list');

  console.log('  … waiting 3s for buddy-request-accepted to propagate to messaging-service …');
  await sleep(3000);

  // 8. Session with invitation
  section('Study Session Service');
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const created = await gql(
    `mutation($date: String!, $invitees: [ID!]) {
      createSession(
        topic: "CS201 study jam", date: $date, duration: 90,
        sessionType: "ONLINE", meetingLink: "https://meet.test/e2e",
        participantIds: $invitees
      ) {
        id topic status
        participants { userId status }
      }
    }`,
    { date: futureDate, invitees: [bobId] },
    aliceToken,
  );
  const sessionId = created.createSession.id;
  assert(sessionId, 'Session created');
  assert(created.createSession.status === 'UPCOMING', 'Fresh session is UPCOMING');
  const bobPart = created.createSession.participants.find((p) => p.userId === bobId);
  assert(bobPart && bobPart.status === 'INVITED', 'Bob invited with status INVITED');

  // Bob sees the invitation
  const inv = await gql(`query { getMyInvitations { sessionId status } }`, {}, bobToken);
  assert(inv.getMyInvitations.some((i) => i.sessionId === sessionId), 'Bob sees invitation');

  // Bob accepts
  const resp = await gql(
    `mutation($id: ID!) { respondToSessionInvitation(sessionId: $id, accept: true) { status } }`,
    { id: sessionId }, bobToken,
  );
  assert(resp.respondToSessionInvitation.status === 'ACCEPTED', 'Invitation accepted');

  // getMySessions now includes it
  const mySessions = await gql(`query { getMySessions { id topic status } }`, {}, bobToken);
  assert(mySessions.getMySessions.some((s) => s.id === sessionId), 'Session appears in Bob\'s list');

  // Only creator can cancel
  try {
    await gql(`mutation($id: ID!) { cancelSession(sessionId: $id) }`, { id: sessionId }, bobToken);
    assert(false, 'Non-creator should not be able to cancel');
  } catch {
    assert(true, 'Non-creator cancel rejected');
  }

  // 9. Messaging — connection gate
  section('Messaging Service — connection gate');
  const sent1 = await gql(
    `mutation($to: ID!, $c: String!) { sendMessage(receiverId: $to, content: $c) { id content senderId } }`,
    { to: bobId, c: 'Hey Bob, ready for CS201?' },
    aliceToken,
  );
  assert(sent1.sendMessage.content.includes('CS201'), 'Connected users can message');

  // Self-message should fail
  try {
    await gql(
      `mutation($to: ID!, $c: String!) { sendMessage(receiverId: $to, content: $c) { id } }`,
      { to: aliceId, c: 'hi self' }, aliceToken,
    );
    assert(false, 'Self-message should have thrown');
  } catch {
    assert(true, 'Self-message rejected');
  }

  const convos = await gql(
    `query { getMyConversations { id updatedAt messages { content senderId } } }`,
    {}, bobToken,
  );
  assert(convos.getMyConversations.length >= 1, `Bob has a conversation (${convos.getMyConversations.length})`);

  // 10. Notifications
  section('Notification Service');
  console.log('  … waiting 3s for notifications to land …');
  await sleep(3000);

  const aliceNotifs = await gql(`query { myNotifications { title sourceTopic isRead } }`, {}, aliceToken);
  assert(aliceNotifs.myNotifications.length > 0, `Alice has ${aliceNotifs.myNotifications.length} notifications`);

  const topics = new Set(aliceNotifs.myNotifications.map((n) => n.sourceTopic));
  assert(topics.has('buddy-request-accepted') || topics.has('match-found') || topics.has('study-session-created'),
    `At least one relevant source topic fired. Got: ${[...topics].join(', ')}`);

  const marked = await gql(`mutation { markAllNotificationsAsRead { count } }`, {}, aliceToken);
  assert(marked.markAllNotificationsAsRead.count >= 0, `Mark-all succeeded (${marked.markAllNotificationsAsRead.count} rows)`);

  // Unauthenticated notifications should fail
  try {
    await gql(`query { myNotifications { id } }`);
    assert(false, 'Notifications without auth should have thrown');
  } catch (e) {
    assert(e.message.toLowerCase().includes('not authenticated'), 'Notification service requires auth');
  }

  // 11. Cancel session + event
  section('Session cancellation event');
  const cancel = await gql(`mutation($id: ID!) { cancelSession(sessionId: $id) }`, { id: sessionId }, aliceToken);
  assert(cancel.cancelSession === true, 'Session cancelled');

  // Session status reflects cancellation on read (auto-status still returns CANCELLED)
  const cancelled = await gql(`query($id: ID!) { getSession(id: $id) { status } }`, { id: sessionId }, aliceToken);
  assert(cancelled.getSession.status === 'CANCELLED', 'Cancelled session reads as CANCELLED');
}

// ── Cleanup: wipe all test data from the 7 DBs ─────────────────────────────
async function cleanup() {
  section('Cleanup — wiping test data from all 7 databases');
  if (!pg) {
    console.warn('  ⚠  pg not installed, skipping DB cleanup. Install with `npm install pg` and re-run to clean.');
    return;
  }

  const userIds = [aliceId, bobId].filter(Boolean);
  const emails = [aliceEmail, bobEmail].filter(Boolean);
  if (!userIds.length) {
    console.log('  (nothing to clean — no users were created)');
    return;
  }

  async function runSql(url, label, sql, params) {
    if (!url) {
      console.warn(`  ⚠  ${label}: DATABASE_URL missing in .env, skipping`);
      return;
    }
    const client = new pg.Client({ connectionString: url });
    try {
      await client.connect();
      const res = await client.query(sql, params);
      console.log(`  ✓ ${label}: ${res.rowCount ?? 0} row(s) deleted`);
    } catch (e) {
      console.error(`  ✗ ${label}: ${e.message}`);
    } finally {
      try { await client.end(); } catch {}
    }
  }

  // Delete in child→parent order where FK cascades don't cover it.
  // Messaging (Messages cascade from Conversation; Connection standalone)
  await runSql(env.MESSAGING_DATABASE_URL, 'messaging: Conversation',
    `DELETE FROM "Conversation" WHERE "participant1" = ANY($1::text[]) OR "participant2" = ANY($1::text[])`, [userIds]);
  await runSql(env.MESSAGING_DATABASE_URL, 'messaging: Connection',
    `DELETE FROM "Connection" WHERE "userA" = ANY($1::text[]) OR "userB" = ANY($1::text[])`, [userIds]);

  // Notifications
  await runSql(env.NOTIFICATION_DATABASE_URL, 'notification: Notification',
    `DELETE FROM "Notification" WHERE "userId" = ANY($1::text[])`, [userIds]);

  // Sessions (SessionParticipant cascades from StudySession)
  await runSql(env.SESSION_DATABASE_URL, 'session: SessionParticipant',
    `DELETE FROM "SessionParticipant" WHERE "userId" = ANY($1::text[])`, [userIds]);
  await runSql(env.SESSION_DATABASE_URL, 'session: StudySession',
    `DELETE FROM "StudySession" WHERE "creatorId" = ANY($1::text[])`, [userIds]);

  // Matching (BuddyRequest, MatchResult, AvailabilitySlot, MatchProfile)
  await runSql(env.MATCHING_DATABASE_URL, 'matching: BuddyRequest',
    `DELETE FROM "BuddyRequest" WHERE "senderId" = ANY($1::text[]) OR "receiverId" = ANY($1::text[])`, [userIds]);
  await runSql(env.MATCHING_DATABASE_URL, 'matching: MatchResult',
    `DELETE FROM "MatchResult" WHERE "userId" = ANY($1::text[]) OR "candidateUserId" = ANY($1::text[])`, [userIds]);
  await runSql(env.MATCHING_DATABASE_URL, 'matching: AvailabilitySlot',
    `DELETE FROM "AvailabilitySlot" WHERE "userId" = ANY($1::text[])`, [userIds]);
  await runSql(env.MATCHING_DATABASE_URL, 'matching: MatchProfile',
    `DELETE FROM "MatchProfile" WHERE "userId" = ANY($1::text[])`, [userIds]);

  // Availability
  await runSql(env.AVAILABILITY_DATABASE_URL, 'availability: AvailabilitySlot',
    `DELETE FROM "AvailabilitySlot" WHERE "userId" = ANY($1::text[])`, [userIds]);

  // Profile (Course + Topic cascade from UserProfile)
  await runSql(env.PROFILE_DATABASE_URL, 'profile: UserProfile',
    `DELETE FROM "UserProfile" WHERE "userId" = ANY($1::text[])`, [userIds]);

  // User (by email for safety)
  await runSql(env.USER_DATABASE_URL, 'user: User',
    `DELETE FROM "User" WHERE "email" = ANY($1::text[])`, [emails]);
}

// ── Main ──────────────────────────────────────────────────────────────────
(async () => {
  const start = Date.now();
  let runError = null;
  try {
    await runTests();
  } catch (e) {
    runError = e;
    failed++;
    console.error(`\n💥 Test aborted with unhandled error: ${e.message}`);
    if (e.stack) console.error(e.stack);
  } finally {
    await cleanup();
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(` ${passed} passed, ${failed} failed in ${elapsed}s`);
  if (failed > 0) {
    console.log(` failures:`);
    for (const f of failures) console.log(`   • ${f}`);
    if (runError) console.log(`   • unhandled: ${runError.message}`);
  }
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  process.exit(failed > 0 || runError ? 1 : 0);
})();
