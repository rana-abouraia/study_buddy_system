import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GET_COURSES_AND_TOPICS, GET_FIND_BUDDIES_DATA, GET_MATCH_PROFILE } from '../graphql/queries';
import { SEND_BUDDY_REQUEST } from '../graphql/mutations';
import styles from '../styles/pages/FindBuddies.module.css';
// Mapping from string (profile-service) to number (for display)
const GROUP_SIZE_STRING_TO_NUMBER = {
    'ONE_ON_ONE': 2,
    'SMALL': 4,
    'LARGE': 8,
};
const FIND_BUDDIES_MATCH_LIMIT = 100;
export default function FindBuddies() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const apolloClient = useApolloClient();
    const [courseMap, setCourseMap] = useState({});
    const [actionError, setActionError] = useState('');
    const [sentIds, setSentIds] = useState(new Set());
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedMatchId, setSelectedMatchId] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [matchProfiles, setMatchProfiles] = useState({});
    const [myMatchProfile, setMyMatchProfile] = useState(null);
    const [profileMap, setProfileMap] = useState({});
    const [myProfileSummary, setMyProfileSummary] = useState(null);
    // Listen for navigation from Dashboard
    useEffect(() => {
        const state = location.state;
        if (state?.selectedMatchId) {
            setSelectedMatchId(state.selectedMatchId);
            setSelectedUserId(null);
            window.history.replaceState({}, document.title);
        }
        if (state?.selectedUserId) {
            setSelectedUserId(state.selectedUserId);
            setSelectedMatchId(null);
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);
    const { data, loading, error, refetch } = useQuery(GET_FIND_BUDDIES_DATA, {
        variables: { matchLimit: FIND_BUDDIES_MATCH_LIMIT },
        fetchPolicy: 'cache-and-network',
    });
    const [sendRequest, { loading: sending }] = useMutation(SEND_BUDDY_REQUEST, {
        refetchQueries: [{ query: GET_FIND_BUDDIES_DATA, variables: { matchLimit: FIND_BUDDIES_MATCH_LIMIT } }],
        awaitRefetchQueries: true,
    });
    const usersById = useMemo(() => new Map(data?.getAllUsers?.map((person) => [person.id, person]) ?? []), [data?.getAllUsers]);
    const outgoingIds = useMemo(() => new Set(data?.getOutgoingBuddyRequests?.map((request) => request.receiverId) ?? []), [data?.getOutgoingBuddyRequests]);
    const incomingIds = useMemo(() => new Set(data?.getIncomingBuddyRequests?.map((request) => request.senderId) ?? []), [data?.getIncomingBuddyRequests]);
    const buddyIds = useMemo(() => new Set(data?.getMyBuddies ?? []), [data?.getMyBuddies]);
    const matches = useMemo(() => {
        return (data?.getRecommendedMatches ?? []).filter((match) => match.candidateUserId !== user?.id && !buddyIds.has(match.candidateUserId));
    }, [buddyIds, data?.getRecommendedMatches, user?.id]);
    const filteredMatches = useMemo(() => {
        return matches.filter((match) => {
            const sharedCourses = courseMap[match.candidateUserId] ?? [];
            const matchPercent = match.compatibility > 1 ? match.compatibility : match.compatibility * 100;
            const hasAvailability = match.reasons.some((reason) => reason.toLowerCase().includes('availability'));
            if (activeFilter === 'high')
                return matchPercent >= 80;
            if (activeFilter === 'shared')
                return sharedCourses.length > 0;
            if (activeFilter === 'available')
                return hasAvailability;
            return true;
        });
    }, [activeFilter, courseMap, matches]);
    const selectedMatch = useMemo(() => matches.find((match) => match.id === selectedMatchId) ?? null, [matches, selectedMatchId]);
    const selectedCandidateId = selectedUserId ?? selectedMatch?.candidateUserId ?? null;
    const selectedCandidateMatch = useMemo(() => selectedMatch ?? matches.find((match) => match.candidateUserId === selectedCandidateId) ?? null, [matches, selectedCandidateId, selectedMatch]);
    useEffect(() => {
        if (!data?.meProfile || matches.length === 0)
            return;
        const currentCourses = new Set(data.meProfile.courses.map((course) => course.name.trim().toLowerCase()));
        let cancelled = false;
        async function loadCourses() {
            const nextMap = {};
            const nextProfiles = {};
            await Promise.all(matches.map(async (match) => {
                try {
                    const result = await apolloClient.query({
                        query: GET_COURSES_AND_TOPICS,
                        variables: { userId: match.candidateUserId },
                        fetchPolicy: 'network-only',
                    });
                    nextProfiles[match.candidateUserId] = result.data.getCoursesAndTopics ?? null;
                    nextMap[match.candidateUserId] = (result.data.getCoursesAndTopics?.courses ?? [])
                        .map((course) => course.name)
                        .filter((name) => currentCourses.has(name.trim().toLowerCase()));
                }
                catch {
                    nextProfiles[match.candidateUserId] = null;
                    nextMap[match.candidateUserId] = [];
                }
            }));
            if (!cancelled) {
                setCourseMap(nextMap);
                setProfileMap((current) => ({ ...current, ...nextProfiles }));
            }
        }
        loadCourses();
        return () => {
            cancelled = true;
        };
    }, [apolloClient, data?.meProfile, matches]);
    useEffect(() => {
        if (!selectedUserId || profileMap[selectedUserId] !== undefined)
            return;
        const targetUserId = selectedUserId;
        let cancelled = false;
        async function loadSelectedProfile() {
            try {
                const result = await apolloClient.query({
                    query: GET_COURSES_AND_TOPICS,
                    variables: { userId: targetUserId },
                    fetchPolicy: 'network-only',
                });
                if (!cancelled) {
                    setProfileMap((current) => ({
                        ...current,
                        [targetUserId]: result.data.getCoursesAndTopics ?? null,
                    }));
                }
            }
            catch {
                if (!cancelled) {
                    setProfileMap((current) => ({ ...current, [targetUserId]: null }));
                }
            }
        }
        loadSelectedProfile();
        return () => {
            cancelled = true;
        };
    }, [apolloClient, profileMap, selectedUserId]);
    useEffect(() => {
        if (!user?.id)
            return;
        const currentUserId = user.id;
        let cancelled = false;
        async function loadMyProfileSummary() {
            try {
                const result = await apolloClient.query({
                    query: GET_COURSES_AND_TOPICS,
                    variables: { userId: currentUserId },
                    fetchPolicy: 'network-only',
                });
                if (!cancelled)
                    setMyProfileSummary(result.data.getCoursesAndTopics ?? null);
            }
            catch {
                if (!cancelled)
                    setMyProfileSummary(null);
            }
        }
        loadMyProfileSummary();
        return () => {
            cancelled = true;
        };
    }, [apolloClient, user?.id]);
    useEffect(() => {
        if (!user?.id || matches.length === 0)
            return;
        const currentUserId = user.id;
        let cancelled = false;
        async function loadMatchProfiles() {
            try {
                const mine = await apolloClient.query({
                    query: GET_MATCH_PROFILE,
                    variables: { userId: currentUserId },
                    fetchPolicy: 'network-only',
                });
                if (!cancelled)
                    setMyMatchProfile(mine.data.getMatchProfile ?? null);
            }
            catch {
                if (!cancelled)
                    setMyMatchProfile(null);
            }
            const nextProfiles = {};
            await Promise.all(matches.map(async (match) => {
                try {
                    const result = await apolloClient.query({
                        query: GET_MATCH_PROFILE,
                        variables: { userId: match.candidateUserId },
                        fetchPolicy: 'network-only',
                    });
                    nextProfiles[match.candidateUserId] = result.data.getMatchProfile ?? null;
                }
                catch {
                    nextProfiles[match.candidateUserId] = null;
                }
            }));
            if (!cancelled)
                setMatchProfiles(nextProfiles);
        }
        loadMatchProfiles();
        return () => {
            cancelled = true;
        };
    }, [apolloClient, matches, user?.id]);
    useEffect(() => {
        if (!selectedUserId || matchProfiles[selectedUserId] !== undefined)
            return;
        const targetUserId = selectedUserId;
        let cancelled = false;
        async function loadSelectedMatchProfile() {
            try {
                const result = await apolloClient.query({
                    query: GET_MATCH_PROFILE,
                    variables: { userId: targetUserId },
                    fetchPolicy: 'network-only',
                });
                if (!cancelled) {
                    setMatchProfiles((current) => ({
                        ...current,
                        [targetUserId]: result.data.getMatchProfile ?? null,
                    }));
                }
            }
            catch {
                if (!cancelled) {
                    setMatchProfiles((current) => ({ ...current, [targetUserId]: null }));
                }
            }
        }
        loadSelectedMatchProfile();
        return () => {
            cancelled = true;
        };
    }, [apolloClient, matchProfiles, selectedUserId]);
    const formatPercent = (value) => `${value > 1 ? Math.round(value) : Math.round(value * 100)}% Match`;
    const getName = (userId) => {
        const person = usersById.get(userId);
        return person ? `${person.firstName} ${person.lastName}` : 'Study Buddy';
    };
    const getInitials = (userId) => {
        const person = usersById.get(userId);
        if (person)
            return `${person.firstName?.[0] ?? ''}${person.lastName?.[0] ?? ''}`.toUpperCase();
        return userId.slice(0, 2).toUpperCase() || 'SB';
    };
    const handleConnect = async (receiverId) => {
        setActionError('');
        try {
            await sendRequest({ variables: { receiverId } });
            setSentIds((prev) => new Set(prev).add(receiverId));
            await refetch();
        }
        catch (err) {
            setActionError(err instanceof Error ? err.message : 'Could not send this request.');
        }
    };
    const getStatus = (candidateId) => {
        if (buddyIds.has(candidateId))
            return 'Connected';
        if (outgoingIds.has(candidateId) || sentIds.has(candidateId))
            return 'Request sent';
        if (incomingIds.has(candidateId))
            return 'Respond in Connections';
        return '';
    };
    const getPercentValue = (value) => value > 1 ? Math.round(value) : Math.round(value * 100);
    const formatPreference = (value) => {
        if (value === null || value === undefined || value === '')
            return 'Not set';
        if (typeof value === 'number') {
            return `${value} ${value === 1 ? 'person' : 'people'}`;
        }
        // Convert string (from profile-service) to a number + label
        const numericValue = GROUP_SIZE_STRING_TO_NUMBER[value];
        if (numericValue) {
            return `${numericValue} ${numericValue === 1 ? 'person' : 'people'}`;
        }
        return value
            .replace(/[-_]/g, ' ')
            .split(' ')
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
    };
    const labelForProfileValue = (value) => formatPreference(value);
    const generateBio = (profile) => {
        if (!profile)
            return 'This student has not completed their study profile yet.';
        const pieces = [
            `${labelForProfileValue(profile.studyPace)} learner${profile.studyMode ? ` who prefers ${labelForProfileValue(profile.studyMode).toLowerCase()} sessions` : ''}${profile.sessionLength ? ` around ${profile.sessionLength}` : ''}.`,
            profile.courses?.length
                ? `Currently studying ${profile.courses.slice(0, 3).map((course) => course.name).join(', ')}`
                : 'Courses have not been added yet',
            profile.topics?.length
                ? `with focus areas like ${profile.topics.slice(0, 4).map((topic) => topic.name).join(', ')}.`
                : '',
        ];
        return pieces.filter(Boolean).join(' ');
    };
    const formatStudyStyles = (profile) => profile?.studyStyles?.length ? profile.studyStyles.map((style) => formatPreference(style)).join(', ') : 'Not set';
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const normalizeDay = (day) => {
        const numeric = Number(day);
        if (!Number.isNaN(numeric))
            return dayNames[numeric] ?? day;
        return day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
    };
    const minutesFromTime = (time) => {
        const [hours = '0', minutes = '0'] = time.split(':');
        return Number(hours) * 60 + Number(minutes);
    };
    const formatTime = (time) => {
        const [hoursRaw = '0', minutesRaw = '0'] = time.split(':');
        const hours = Number(hoursRaw);
        const minutes = Number(minutesRaw);
        const suffix = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours % 12 === 0 ? 12 : hours % 12;
        return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
    };
    const formatSlot = (slot) => `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;
    const summarizeAvailability = (candidateId, fallback) => {
        const slots = matchProfiles[candidateId]?.availabilitySlots ?? [];
        if (slots.length > 0) {
            const first = slots[0];
            return `${normalizeDay(first.dayOfWeek)} ${formatSlot(first)}`;
        }
        if (fallback?.toLowerCase().includes('availability'))
            return 'Shared overlap available';
        if (fallback && !fallback.toLowerCase().includes('mins'))
            return fallback;
        return 'No availability set yet';
    };
    const getAvailabilityRows = (candidateId, fallback) => {
        const candidateSlots = matchProfiles[candidateId]?.availabilitySlots ?? [];
        const mySlots = myMatchProfile?.availabilitySlots ?? [];
        const rows = [];
        for (const candidateSlot of candidateSlots) {
            const sameDayMine = mySlots.filter((slot) => normalizeDay(slot.dayOfWeek) === normalizeDay(candidateSlot.dayOfWeek));
            if (sameDayMine.length === 0) {
                rows.push({ day: normalizeDay(candidateSlot.dayOfWeek), time: formatSlot(candidateSlot) });
                continue;
            }
            for (const mySlot of sameDayMine) {
                const start = Math.max(minutesFromTime(candidateSlot.startTime), minutesFromTime(mySlot.startTime));
                const end = Math.min(minutesFromTime(candidateSlot.endTime), minutesFromTime(mySlot.endTime));
                if (start < end) {
                    rows.push({
                        day: normalizeDay(candidateSlot.dayOfWeek),
                        time: `${formatTime(`${Math.floor(start / 60)}:${start % 60}`)} - ${formatTime(`${Math.floor(end / 60)}:${end % 60}`)}`,
                    });
                }
            }
        }
        if (rows.length > 0)
            return rows.slice(0, 6);
        return [{ day: 'Availability', time: summarizeAvailability(candidateId, fallback) }];
    };
    const renderConnectButton = (candidateId, className = styles.connectButton) => {
        const status = getStatus(candidateId);
        return (_jsx("button", { type: "button", className: className, disabled: sending || status !== '', onClick: () => handleConnect(candidateId), children: className === styles.detailRequestButton ? 'Send Study Request' : `+ ${status || 'Connect'}` }));
    };
    if (loading)
        return _jsx("div", { className: styles.statePanel, children: "Finding your best study matches..." });
    if (error)
        return _jsx("div", { className: styles.statePanel, children: "Unable to load buddies from the backend. Please try again." });
    const filters = [
        { key: 'all', label: 'All Matches' },
        { key: 'high', label: 'High Compatibility (80%+)' },
        { key: 'shared', label: 'Shared Courses' },
        { key: 'available', label: 'Available Now' },
    ];
    if (selectedCandidateId) {
        const person = usersById.get(selectedCandidateId);
        const candidateProfileData = profileMap[selectedCandidateId];
        const candidateCourses = candidateProfileData?.courses ?? [];
        const candidateTopics = candidateProfileData?.topics ?? [];
        const sharedCourses = courseMap[selectedCandidateId] ?? [];
        const isBuddy = buddyIds.has(selectedCandidateId);
        const compatibility = selectedCandidateMatch ? getPercentValue(selectedCandidateMatch.compatibility) : 0;
        const reasons = selectedCandidateMatch?.reasons.filter((reason) => !reason.startsWith('Shared courses')) ?? [];
        const preferenceReasons = reasons.filter((reason) => !reason.toLowerCase().includes('availability'));
        const availabilityReason = reasons.find((reason) => reason.toLowerCase().includes('availability'));
        const availabilityRows = getAvailabilityRows(selectedCandidateId, availabilityReason);
        const candidateProfile = matchProfiles[selectedCandidateId];
        const preferenceRows = [
            {
                label: 'Study Pace',
                yours: formatPreference(myProfileSummary?.studyPace ?? myMatchProfile?.studyPace),
                theirs: formatPreference(candidateProfileData?.studyPace ?? candidateProfile?.studyPace),
            },
            {
                label: 'Study Mode',
                yours: formatPreference(myProfileSummary?.studyMode ?? myMatchProfile?.studyMode),
                theirs: formatPreference(candidateProfileData?.studyMode ?? candidateProfile?.studyMode),
            },
            {
                label: 'Study Style',
                yours: formatStudyStyles(myProfileSummary) !== 'Not set' ? formatStudyStyles(myProfileSummary) : formatPreference(myMatchProfile?.studyStyle),
                theirs: formatStudyStyles(candidateProfileData) !== 'Not set' ? formatStudyStyles(candidateProfileData) : formatPreference(candidateProfile?.studyStyle),
            },
            {
                label: 'Group Size',
                yours: formatPreference(myProfileSummary?.groupSize ?? myMatchProfile?.groupSize),
                theirs: formatPreference(candidateProfileData?.groupSize ?? candidateProfile?.groupSize),
            },
        ];
        const breakdown = [
            { label: 'Shared Courses', value: Math.min(100, Math.max(60, sharedCourses.length * 30)) },
            { label: 'Study Style', value: preferenceReasons.length ? 95 : 75 },
            { label: 'Preferences', value: Math.max(72, compatibility - 8) },
            { label: 'Availability', value: availabilityReason ? 85 : 68 },
        ];
        return (_jsxs("section", { className: styles.detailPage, children: [_jsx("button", { type: "button", className: styles.backButton, onClick: () => {
                        setSelectedMatchId(null);
                        setSelectedUserId(null);
                    }, children: "Back to matches" }), actionError ? _jsx("div", { className: styles.errorBanner, children: actionError }) : null, _jsxs("div", { className: styles.detailHero, children: [_jsxs("div", { className: styles.detailProfile, children: [_jsx("div", { className: styles.detailAvatar, children: getInitials(selectedCandidateId) }), _jsx("h1", { children: getName(selectedCandidateId) }), _jsx("p", { children: person?.academicYear || 'Computer Science Junior' }), _jsx("p", { children: person?.university || 'German International University' }), _jsx("p", { children: person ? `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}@studybuddy.edu` : 'student@studybuddy.edu' })] }), _jsxs("div", { className: styles.aboutPanel, children: [_jsx("p", { className: styles.detailLabel, children: "About" }), _jsx("p", { className: styles.aboutText, children: generateBio(candidateProfileData) }), selectedCandidateMatch ? _jsxs("div", { className: styles.scoreCard, children: [_jsxs("div", { children: [_jsx("strong", { children: "Compatibility Score" }), _jsx("span", { children: "Excellent match based on courses, availability, and study preferences" })] }), _jsxs("b", { children: [compatibility, "%"] })] }) : null, _jsxs("div", { className: styles.detailActions, children: [renderConnectButton(selectedCandidateId, styles.detailRequestButton), _jsx("button", { type: "button", className: styles.chatButton, disabled: !isBuddy, title: isBuddy ? 'Start chat' : 'You can chat after you become study buddies', onClick: () => {
                                                if (isBuddy)
                                                    navigate(`/messages?userId=${encodeURIComponent(selectedCandidateId)}`);
                                            }, children: "Start Chat" })] })] })] }), _jsxs("div", { className: styles.detailLayout, children: [_jsxs("div", { className: styles.detailMain, children: [_jsxs("section", { className: styles.detailSection, children: [_jsx("h2", { children: "Shared Courses" }), _jsxs("div", { className: styles.courseList, children: [(sharedCourses.length
                                                    ? sharedCourses.map((name) => ({ name, code: 'Shared course', term: null }))
                                                    : candidateCourses).slice(0, 4).map((course, index) => (_jsxs("div", { className: styles.courseRow, children: [_jsxs("div", { children: [_jsx("strong", { children: course.name }), _jsx("span", { children: course.code || course.term || (sharedCourses.length ? 'Shared course' : 'Profile course') })] }), _jsx("em", { children: sharedCourses.some((name) => name === course.name) ? 'Match' : 'Profile' })] }, `${course.name}-${index}`))), sharedCourses.length === 0 && candidateCourses.length === 0 ? (_jsxs("div", { className: styles.courseRow, children: [_jsxs("div", { children: [_jsx("strong", { children: "No courses added yet" }), _jsx("span", { children: "This student has not added courses to their profile." })] }), _jsx("em", { children: "Profile" })] })) : null] })] }), _jsxs("section", { className: styles.detailSection, children: [_jsx("h2", { children: "Study Preferences Comparison" }), _jsx("div", { className: styles.preferenceGrid, children: preferenceRows.map((row) => (_jsxs("div", { className: styles.preferenceItem, children: [_jsx("p", { children: row.label }), _jsxs("div", { className: styles.compareLine, children: [_jsx("span", { children: row.yours }), _jsx("small", { children: row.theirs })] })] }, row.label))) })] }), _jsxs("section", { className: styles.detailSection, children: [_jsx("h2", { children: "Overlapping Availability" }), _jsx("div", { className: styles.availabilityList, children: availabilityRows.map((row) => (_jsxs("div", { className: styles.availabilityRow, children: [_jsx("strong", { children: row.day }), _jsx("span", { children: row.time })] }, `${row.day}-${row.time}`))) })] })] }), _jsxs("aside", { className: styles.breakdownPanel, children: [_jsx("h2", { children: "Compatibility Breakdown" }), _jsxs("div", { className: styles.donutScore, children: [compatibility, "%"] }), _jsx("strong", { children: "Overall Match" }), _jsx("div", { className: styles.breakdownBars, children: breakdown.map((item) => (_jsxs("div", { children: [_jsx("span", { children: item.label }), _jsx("div", { children: _jsx("i", { style: { width: `${item.value}%` } }) }), _jsxs("b", { children: [item.value, "%"] })] }, item.label))) }), _jsx("h3", { children: "Key Highlights" }), _jsx("ul", { children: [
                                        ...sharedCourses,
                                        ...candidateTopics.map((topic) => topic.name),
                                        ...(reasons.length ? reasons : ['Profile data loaded from study preferences']),
                                    ].slice(0, 4).map((item) => (_jsx("li", { children: item }, item))) })] })] })] }));
    }
    return (_jsxs("section", { className: styles.page, children: [_jsxs("header", { className: styles.header, children: [_jsx("h1", { children: "Find Study Buddies" }), _jsx("p", { children: "Discover students who match your courses and study preferences" })] }), _jsxs("div", { className: styles.filterBar, children: [_jsx("span", { className: styles.filterLabel, children: "Filter by:" }), filters.map((filter) => (_jsx("button", { type: "button", className: `${styles.filterChip} ${activeFilter === filter.key ? styles.filterChipActive : ''}`, onClick: () => setActiveFilter(filter.key), children: filter.label }, filter.key)))] }), _jsxs("p", { className: styles.matchCount, children: ["Showing ", filteredMatches.length, " study buddy matches"] }), actionError ? _jsx("div", { className: styles.errorBanner, children: actionError }) : null, _jsx("div", { className: styles.grid, children: filteredMatches.length > 0 ? filteredMatches.map((match) => {
                    const person = usersById.get(match.candidateUserId);
                    const sharedCourses = courseMap[match.candidateUserId] ?? [];
                    const reasons = match.reasons.filter((reason) => !reason.startsWith('Shared courses'));
                    const studyStyles = reasons
                        .filter((reason) => !reason.toLowerCase().includes('availability'))
                        .slice(0, 2);
                    const availabilityReason = reasons.find((reason) => reason.toLowerCase().includes('availability'));
                    return (_jsxs("article", { className: styles.card, children: [_jsxs("div", { className: styles.cardTop, children: [_jsx("div", { className: styles.avatar, children: getInitials(match.candidateUserId) }), _jsx("span", { className: styles.matchBadge, children: formatPercent(match.compatibility) })] }), _jsxs("div", { className: styles.identity, children: [_jsx("h2", { children: getName(match.candidateUserId) }), _jsx("p", { children: person?.academicYear || 'Computer Science Junior' }), _jsx("p", { children: person?.university || 'German International University' })] }), _jsxs("div", { className: styles.infoBlock, children: [_jsxs("p", { className: styles.infoTitle, children: ["Shared Courses (", sharedCourses.length, ")"] }), _jsx("div", { className: styles.tags, children: sharedCourses.length > 0
                                            ? sharedCourses.slice(0, 2).map((tag) => _jsx("span", { children: tag }, `${match.id}-${tag}`))
                                            : _jsx("span", { children: "Course match pending" }) })] }), _jsxs("div", { className: styles.infoBlock, children: [_jsx("p", { className: styles.infoTitle, children: "Study Style" }), _jsx("div", { className: styles.tagsMuted, children: studyStyles.length > 0
                                            ? studyStyles.map((tag) => _jsx("span", { children: tag }, `${match.id}-${tag}`))
                                            : _jsx("span", { children: "Discussion" }) })] }), _jsxs("div", { className: styles.infoBlock, children: [_jsx("p", { className: styles.infoTitle, children: "Availability" }), _jsx("p", { className: styles.availability, children: summarizeAvailability(match.candidateUserId, availabilityReason) })] }), _jsxs("div", { className: styles.actions, children: [renderConnectButton(match.candidateUserId), incomingIds.has(match.candidateUserId) ? (_jsx("button", { type: "button", className: styles.secondaryButton, onClick: () => navigate('/my-connections'), children: "Review" })) : (_jsx("button", { type: "button", className: styles.viewButton, "aria-label": `View ${getName(match.candidateUserId)} match detail`, onClick: () => setSelectedMatchId(match.id), children: "eye" }))] })] }, match.id));
                }) : (_jsxs("div", { className: styles.emptyState, children: [_jsx("h2", { children: "No recommendations yet" }), _jsx("p", { children: "Complete your profile courses and availability so HiveMind can generate better matches." })] })) })] }));
}
