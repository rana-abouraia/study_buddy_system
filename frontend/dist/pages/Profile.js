import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery } from '@apollo/client';
import { BookOpen, CalendarDays, Check, Clock3, Edit3, GraduationCap, MapPin, Monitor, Plus, Save, Search, Tag, Trash2, Users, X, } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GET_CONNECTIONS_DATA, GET_COURSES_AND_TOPICS, GET_MY_AVAILABILITY, GET_STUDY_SESSIONS_DATA, RECALCULATE_MATCHES, REPLACE_COURSES, REPLACE_TOPICS, UPDATE_MATCH_PROFILE, UPDATE_MATCHING_SERVICE_PROFILE, } from '../graphql/queries';
import styles from './Profile.module.css';
// ---------- Constants (matching your reference) ----------
const PACE_OPTIONS = [
    { value: 'SLOW', label: 'Slow & Steady' },
    { value: 'MODERATE', label: 'Moderate' },
    { value: 'FAST', label: 'Fast Paced' },
];
const MODE_OPTIONS = [
    { value: 'ONLINE', label: 'Online' },
    { value: 'IN_PERSON', label: 'In-person' },
    { value: 'BOTH', label: 'Both' },
];
const SIZE_OPTIONS = [
    { value: 'ONE_ON_ONE', label: 'One-on-One' },
    { value: 'SMALL', label: 'Small Group' },
    { value: 'LARGE', label: 'Large Group' },
];
const STYLE_OPTIONS = [
    { value: 'WRITING', label: 'Writing Notes' },
    { value: 'DISCUSSION', label: 'Discussion' },
    { value: 'LISTENING', label: 'Listening' },
    { value: 'QUIET', label: 'Quiet Focus' },
];
const TIME_OPTIONS = [
    { value: 'MORNING', label: 'Morning' },
    { value: 'AFTERNOON', label: 'Afternoon' },
    { value: 'EVENING', label: 'Evening' },
    { value: 'NIGHT', label: 'Night' },
];
const LENGTH_OPTIONS = ['30 minutes', '1 hour', '2 hours', '3+ hours'];
const MIN_PROFILE_SAVE_MS = 2000;
// Map group size string (from profile) to number (for matching service)
const GROUP_SIZE_TO_NUMBER = {
    ONE_ON_ONE: 2,
    SMALL: 4,
    LARGE: 8,
};
// ---------- Helper functions ----------
const titleCase = (value) => {
    if (!value)
        return 'Not set';
    return value
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
};
const labelFor = (value, options) => options.find((option) => option.value === value)?.label ?? titleCase(value);
const uniqueCourses = (courses) => {
    const seen = new Set();
    return courses.filter((course) => {
        const key = course.code.trim().toUpperCase();
        if (!key || seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
};
const uniqueTopics = (topics) => {
    const seen = new Set();
    return topics.filter((topic) => {
        const key = topic.name.trim().toLowerCase();
        if (!key || seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
};
const uniqueValues = (values = []) => {
    const seen = new Set();
    return values.filter((value) => {
        const key = value.trim().toUpperCase();
        if (!key || seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
};
// Get display label for group size from the string value (used in view mode)
const getGroupSizeLabel = (value) => {
    if (!value)
        return 'Not set';
    const option = SIZE_OPTIONS.find(opt => opt.value === value);
    return option?.label ?? value;
};
// ---------- Main Component ----------
export default function Profile() {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [courseQuery, setCourseQuery] = useState('');
    const [customCourseCode, setCustomCourseCode] = useState('');
    const [topicQuery, setTopicQuery] = useState('');
    const [editCourses, setEditCourses] = useState([]);
    const [editTopics, setEditTopics] = useState([]);
    const [saveInProgress, setSaveInProgress] = useState(false);
    const [editPrefs, setEditPrefs] = useState({
        studyPace: '',
        studyMode: '',
        groupSize: '',
        studyStyles: [],
        preferredTimes: [],
        sessionLength: '',
    });
    // Queries
    const { data: profileResponse, loading: profileLoading, refetch: refetchProfile } = useQuery(GET_COURSES_AND_TOPICS, {
        variables: { userId: user?.id },
        skip: !user?.id,
    });
    const { data: availabilityData, loading: availabilityLoading } = useQuery(GET_MY_AVAILABILITY, {
        skip: !user?.id,
    });
    const { data: sessionsData, loading: sessionsLoading } = useQuery(GET_STUDY_SESSIONS_DATA, {
        skip: !user?.id,
    });
    const { data: connectionsData, loading: connectionsLoading } = useQuery(GET_CONNECTIONS_DATA, {
        skip: !user?.id,
    });
    // Mutations
    const [updateProfilePreferences, { loading: savingPrefs }] = useMutation(UPDATE_MATCH_PROFILE);
    const [replaceCourses, { loading: savingCourses }] = useMutation(REPLACE_COURSES);
    const [replaceTopics, { loading: savingTopics }] = useMutation(REPLACE_TOPICS);
    const [recalculateMatches, { loading: recalculatingMatches }] = useMutation(RECALCULATE_MATCHES);
    const profile = profileResponse?.getCoursesAndTopics ?? {};
    const courses = profile.courses ?? [];
    const topics = profile.topics ?? [];
    const availabilitySlots = availabilityData?.getMyAvailability ?? [];
    const savingProfile = saveInProgress || savingPrefs || savingCourses || savingTopics || recalculatingMatches;
    const allSessions = sessionsData?.getMySessions ?? [];
    const pastSessions = allSessions
        .filter((session) => new Date(session.date) < new Date())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);
    const buddyIds = connectionsData?.getMyBuddies ?? [];
    const allUsers = connectionsData?.getAllUsers ?? [];
    const usersById = new Map(allUsers.map((candidate) => [candidate.id, candidate]));
    const displayedBuddyIds = buddyIds.slice(0, 6);
    const sessionsTogetherByBuddy = new Map(displayedBuddyIds.map((buddyId) => [
        buddyId,
        allSessions.filter((session) => (session.creatorId === buddyId ||
            session.participants?.some((participant) => participant.userId === buddyId))).length,
    ]));
    // Suggestions for courses (using the existing courses from DB, but you could use a pool)
    const selectedCourseCodes = new Set(editCourses.map((course) => course.code.toUpperCase()));
    const selectedTopicNames = new Set(editTopics.map((topic) => topic.name.toLowerCase()));
    const courseMatches = (profile.courses ?? [])
        .filter((course) => !selectedCourseCodes.has(course.code.toUpperCase()))
        .filter((course) => {
        const query = courseQuery.trim().toLowerCase();
        return !query || course.name.toLowerCase().includes(query);
    })
        .slice(0, 6);
    const topicMatches = (profile.topics ?? [])
        .filter((topic) => !selectedTopicNames.has(topic.name.toLowerCase()))
        .filter((topic) => {
        const query = topicQuery.trim().toLowerCase();
        return !query || topic.name.toLowerCase().includes(query);
    })
        .slice(0, 6);
    const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';
    const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Student';
    const studyStyles = uniqueValues(profile.studyStyles);
    const profilePreferredTimes = uniqueValues(profile.preferredTimes);
    const displayedStudyStyles = studyStyles.length
        ? studyStyles.map((style) => labelFor(style, STYLE_OPTIONS)).join(', ')
        : 'Not set';
    const preferredTimes = profilePreferredTimes.length
        ? profilePreferredTimes.map((time) => labelFor(time, TIME_OPTIONS)).join(', ')
        : 'Not set';
    const generatedBio = [
        `${labelFor(profile.studyPace, PACE_OPTIONS)} learner${profile.studyMode ? ` who prefers ${labelFor(profile.studyMode, MODE_OPTIONS).toLowerCase()} sessions` : ''}${profile.sessionLength ? ` around ${profile.sessionLength}` : ''}.`,
        courses.length ? `Currently studying ${courses.slice(0, 3).map((c) => c.name).join(', ')}` : 'Add courses to improve matching',
        topics.length ? `with focus areas like ${topics.slice(0, 4).map((t) => t.name).join(', ')}` : '',
    ].filter(Boolean).join(' ');
    // ---------- Formatting helpers ----------
    const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const formatDuration = (minutes) => {
        if (!minutes)
            return 'No duration';
        const hours = minutes / 60;
        return Number.isInteger(hours) ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : `${minutes} min`;
    };
    const formatDayOfWeek = (day) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayNumber = Number(day);
        return days[dayNumber] ?? day;
    };
    const formatTime = (time) => {
        const [rawHours, minutes = '00'] = time.split(':');
        const hours = Number(rawHours);
        if (Number.isNaN(hours))
            return time;
        const suffix = hours >= 12 ? 'PM' : 'AM';
        const displayHour = hours % 12 || 12;
        return `${displayHour}:${minutes} ${suffix}`;
    };
    const timeToMinutes = (time) => {
        const [rawHours, rawMinutes = '0'] = time.split(':');
        const hours = Number(rawHours);
        const minutes = Number(rawMinutes);
        if (Number.isNaN(hours) || Number.isNaN(minutes))
            return 0;
        return hours * 60 + minutes;
    };
    const mergedAvailability = availabilitySlots
        .map((slot) => ({
        ...slot,
        dayOfWeek: String(slot.dayOfWeek),
        dayIndex: Number(slot.dayOfWeek),
        startMinutes: timeToMinutes(slot.startTime),
        endMinutes: timeToMinutes(slot.endTime),
    }))
        .sort((a, b) => a.dayIndex - b.dayIndex || a.startMinutes - b.startMinutes)
        .reduce((groups, slot) => {
        const last = groups[groups.length - 1];
        if (last && last.dayOfWeek === slot.dayOfWeek && last.endMinutes === slot.startMinutes) {
            last.endTime = slot.endTime;
            last.endMinutes = slot.endMinutes;
            return groups;
        }
        groups.push({
            id: slot.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            endMinutes: slot.endMinutes,
        });
        return groups;
    }, []);
    // ---------- Edit handlers ----------
    const startEditing = () => {
        setEditPrefs({
            studyPace: profile.studyPace ?? '',
            studyMode: profile.studyMode ?? '',
            groupSize: profile.groupSize ?? '',
            studyStyles: uniqueValues(profile.studyStyles),
            preferredTimes: uniqueValues(profile.preferredTimes),
            sessionLength: profile.sessionLength ?? '',
        });
        setEditCourses(courses);
        setEditTopics(topics);
        setCourseQuery('');
        setCustomCourseCode('');
        setTopicQuery('');
        setIsEditing(true);
    };
    const cancelEditing = () => {
        setIsEditing(false);
        setCourseQuery('');
        setCustomCourseCode('');
        setTopicQuery('');
    };
    const toggleUniqueOption = (field, value) => {
        setEditPrefs((current) => {
            const values = uniqueValues(current[field]);
            return {
                ...current,
                [field]: values.includes(value)
                    ? values.filter((item) => item !== value)
                    : [...values, value],
            };
        });
    };
    const addCourseToEdit = (course) => {
        setEditCourses((current) => uniqueCourses([...current, { ...course, code: course.code.toUpperCase() }]));
        setCourseQuery('');
        setCustomCourseCode('');
    };
    const addCustomCourse = () => {
        const name = courseQuery.trim();
        const code = customCourseCode.trim().toUpperCase().replace(/\s+/g, '');
        if (!name || !code)
            return;
        addCourseToEdit({ name, code });
    };
    const addTopicToEdit = (name) => {
        const topicName = name.trim();
        if (!topicName)
            return;
        setEditTopics((current) => uniqueTopics([...current, { name: topicName }]));
        setTopicQuery('');
    };
    const [updateMatchingProfile] = useMutation(UPDATE_MATCHING_SERVICE_PROFILE);
    const handleSaveProfile = async () => {
        if (saveInProgress)
            return;
        const saveStartedAt = Date.now();
        const waitForMinimumSaveTime = async () => {
            const remainingMs = MIN_PROFILE_SAVE_MS - (Date.now() - saveStartedAt);
            if (remainingMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, remainingMs));
            }
        };
        setSaveInProgress(true);
        try {
            // 1. Update profile‑service (keeps array for studyStyles)
            await updateProfilePreferences({
                variables: {
                    input: {
                        studyPace: editPrefs.studyPace || null,
                        studyMode: editPrefs.studyMode || null,
                        groupSize: editPrefs.groupSize || null, // string
                        studyStyles: uniqueValues(editPrefs.studyStyles), // array
                        preferredTimes: uniqueValues(editPrefs.preferredTimes),
                        sessionLength: editPrefs.sessionLength || null,
                    },
                },
            });
            await replaceCourses({
                variables: {
                    courses: editCourses.map((course) => ({
                        name: course.name.trim(),
                        code: course.code.trim().toUpperCase(),
                        term: course.term?.trim() || null,
                    })),
                },
            });
            await replaceTopics({
                variables: {
                    topics: editTopics.map((topic) => ({ name: topic.name.trim() })),
                },
            });
            // 2. Update matching-service last so profile-service Kafka sync cannot
            // immediately overwrite comma-separated study styles with the first value.
            const studyStyleString = uniqueValues(editPrefs.studyStyles).join(',');
            const groupSizeNumber = editPrefs.groupSize ? GROUP_SIZE_TO_NUMBER[editPrefs.groupSize] : null;
            await updateMatchingProfile({
                variables: {
                    input: {
                        studyPace: editPrefs.studyPace || null,
                        studyMode: editPrefs.studyMode || null,
                        groupSize: groupSizeNumber, // number
                        studyStyle: studyStyleString, // string, e.g. "WRITING,DISCUSSION"
                        preferredTimes: uniqueValues(editPrefs.preferredTimes),
                        sessionLength: editPrefs.sessionLength || null,
                    },
                },
            });
            await recalculateMatches();
            await refetchProfile();
            await waitForMinimumSaveTime();
            setIsEditing(false);
        }
        catch (error) {
            await waitForMinimumSaveTime();
            throw error;
        }
        finally {
            setSaveInProgress(false);
        }
    };
    if (profileLoading || availabilityLoading || sessionsLoading || connectionsLoading) {
        return _jsx("div", { className: styles.loadingState, children: "Loading profile..." });
    }
    return (_jsxs("main", { className: styles.page, children: [_jsxs("header", { className: styles.header, children: [_jsx("h1", { children: "My Profile" }), _jsx("p", { children: "Manage your profile and view your study activity" })] }), _jsxs("section", { className: styles.profileCard, children: [_jsx("div", { className: styles.avatar, children: initials }), _jsxs("div", { className: styles.profileInfo, children: [_jsx("h2", { children: fullName }), _jsx("p", { className: styles.email, children: user?.email }), _jsx("p", { className: styles.bio, children: generatedBio }), _jsxs("div", { className: styles.profileMeta, children: [_jsxs("span", { children: [_jsx(MapPin, { size: 14 }), user?.university || 'University not set'] }), _jsxs("span", { children: [_jsx(GraduationCap, { size: 14 }), user?.academicYear || 'Academic year not set'] }), _jsxs("span", { children: [_jsx(BookOpen, { size: 14 }), courses.length ? `${courses.length} courses` : 'No courses yet'] })] })] }), isEditing ? (_jsxs("div", { className: styles.profileActions, children: [_jsxs("button", { className: styles.cancelProfileButton, onClick: cancelEditing, children: [_jsx(X, { size: 14 }), " Cancel"] }), _jsxs("button", { className: styles.editProfileButton, onClick: handleSaveProfile, disabled: savingProfile, children: [_jsx(Save, { size: 14 }), " ", savingProfile ? 'Saving...' : 'Save Profile'] })] })) : (_jsxs("button", { className: styles.editProfileButton, onClick: startEditing, children: [_jsx(Edit3, { size: 14 }), " Edit Profile"] }))] }), _jsxs("div", { className: styles.twoColumnGrid, children: [_jsxs("section", { className: styles.squareCard, children: [_jsxs("h3", { children: [_jsx(BookOpen, { size: 22 }), " Shared Courses"] }), _jsx("div", { className: styles.coursesList, children: (isEditing ? editCourses : courses).length ? (isEditing ? editCourses : courses).map((course) => (_jsxs("article", { className: styles.courseItem, children: [_jsxs("div", { children: [_jsx("strong", { children: course.name }), _jsxs("span", { children: [course.code, course.term ? ` - ${course.term}` : ''] })] }), isEditing && (_jsx("button", { className: styles.iconButton, onClick: () => setEditCourses((prev) => prev.filter((c) => c.code !== course.code)), children: _jsx(Trash2, { size: 14 }) }))] }, course.id ?? course.code))) : _jsx("p", { className: styles.emptyText, children: "No courses added yet." }) }), isEditing && (_jsxs("div", { className: styles.picker, children: [_jsxs("label", { children: [_jsx(Search, { size: 13 }), " Find a course by name or code"] }), _jsxs("div", { className: styles.searchRow, children: [_jsx("input", { value: courseQuery, onChange: (e) => setCourseQuery(e.target.value), placeholder: "Search course name" }), _jsx("input", { value: customCourseCode, onChange: (e) => setCustomCourseCode(e.target.value), placeholder: "Code" }), _jsx("button", { type: "button", onClick: addCustomCourse, children: _jsx(Plus, { size: 16 }) })] }), _jsx("div", { className: styles.suggestionList, children: courseMatches.length ? courseMatches.map((course) => (_jsxs("button", { type: "button", onClick: () => addCourseToEdit(course), children: [_jsx("span", { children: course.code }), " ", course.name] }, course.code))) : _jsx("p", { children: courseQuery ? 'No matching courses.' : 'Start typing to search.' }) })] }))] }), _jsxs("section", { className: styles.squareCard, children: [_jsxs("h3", { children: [_jsx(Tag, { size: 22 }), " Study Topics"] }), _jsx("div", { className: styles.topicsList, children: (isEditing ? editTopics : topics).length ? (isEditing ? editTopics : topics).map((topic) => (_jsxs("span", { className: styles.topicTag, children: [topic.name, isEditing && (_jsx("button", { onClick: () => setEditTopics((prev) => prev.filter((t) => t.name !== topic.name)), children: _jsx(Trash2, { size: 11 }) }))] }, topic.id ?? topic.name))) : _jsx("p", { className: styles.emptyText, children: "No study topics added yet." }) }), isEditing && (_jsxs("div", { className: styles.picker, children: [_jsxs("label", { children: [_jsx(Search, { size: 13 }), " Pick a topic or type your own"] }), _jsxs("div", { className: styles.searchRowSingle, children: [_jsx("input", { value: topicQuery, onChange: (e) => setTopicQuery(e.target.value), onKeyDown: (e) => e.key === 'Enter' && addTopicToEdit(topicQuery), placeholder: "Search topics" }), _jsx("button", { type: "button", onClick: () => addTopicToEdit(topicQuery), children: _jsx(Plus, { size: 16 }) })] }), _jsx("div", { className: styles.suggestionList, children: topicMatches.length ? topicMatches.map((topic) => (_jsx("button", { type: "button", onClick: () => addTopicToEdit(topic.name), children: topic.name }, topic.name))) : _jsx("p", { children: topicQuery ? 'No matching topics.' : 'Start typing to search.' }) })] }))] })] }), _jsxs("section", { className: styles.preferencesCard, children: [_jsxs("h3", { children: [_jsx(Clock3, { size: 22 }), " Study Preferences"] }), isEditing ? (_jsxs("div", { className: styles.editPrefForm, children: [_jsxs("label", { children: ["Study Pace", _jsxs("select", { value: editPrefs.studyPace, onChange: (e) => setEditPrefs({ ...editPrefs, studyPace: e.target.value }), children: [_jsx("option", { value: "", children: "Select pace" }), PACE_OPTIONS.map((opt) => _jsx("option", { value: opt.value, children: opt.label }, opt.value))] })] }), _jsxs("label", { children: ["Study Mode", _jsxs("select", { value: editPrefs.studyMode, onChange: (e) => setEditPrefs({ ...editPrefs, studyMode: e.target.value }), children: [_jsx("option", { value: "", children: "Select mode" }), MODE_OPTIONS.map((opt) => _jsx("option", { value: opt.value, children: opt.label }, opt.value))] })] }), _jsxs("label", { children: ["Group Size", _jsxs("select", { value: editPrefs.groupSize, onChange: (e) => setEditPrefs({ ...editPrefs, groupSize: e.target.value }), children: [_jsx("option", { value: "", children: "Select group size" }), SIZE_OPTIONS.map((opt) => _jsx("option", { value: opt.value, children: opt.label }, opt.value))] })] }), _jsxs("div", { className: styles.optionGroup, children: [_jsx("span", { children: "Study Styles" }), _jsx("div", { className: styles.chipGroup, children: STYLE_OPTIONS.map((opt) => (_jsxs("button", { className: editPrefs.studyStyles.includes(opt.value) ? styles.optionChipActive : styles.optionChip, type: "button", onClick: () => toggleUniqueOption('studyStyles', opt.value), children: [editPrefs.studyStyles.includes(opt.value) && _jsx(Check, { size: 12 }), opt.label] }, opt.value))) })] }), _jsxs("div", { className: styles.optionGroup, children: [_jsx("span", { children: "Preferred Times" }), _jsx("div", { className: styles.chipGroup, children: TIME_OPTIONS.map((opt) => (_jsxs("button", { className: editPrefs.preferredTimes.includes(opt.value) ? styles.optionChipActive : styles.optionChip, type: "button", onClick: () => toggleUniqueOption('preferredTimes', opt.value), children: [editPrefs.preferredTimes.includes(opt.value) && _jsx(Check, { size: 12 }), opt.label] }, opt.value))) })] }), _jsxs("label", { children: ["Session Length", _jsxs("select", { value: editPrefs.sessionLength, onChange: (e) => setEditPrefs({ ...editPrefs, sessionLength: e.target.value }), children: [_jsx("option", { value: "", children: "Optional" }), LENGTH_OPTIONS.map((opt) => _jsx("option", { value: opt, children: opt }, opt))] })] })] })) : (_jsxs("div", { className: styles.preferenceGrid, children: [_jsxs("article", { children: [_jsx("span", { children: "Study Pace" }), _jsx("strong", { children: labelFor(profile.studyPace, PACE_OPTIONS) })] }), _jsxs("article", { children: [_jsx("span", { children: "Study Mode" }), _jsx("strong", { children: labelFor(profile.studyMode, MODE_OPTIONS) })] }), _jsxs("article", { children: [_jsx("span", { children: "Group Size" }), _jsx("strong", { children: getGroupSizeLabel(profile.groupSize) })] }), _jsxs("article", { children: [_jsx("span", { children: "Study Styles" }), _jsx("strong", { children: displayedStudyStyles })] }), _jsxs("article", { children: [_jsx("span", { children: "Preferred Times" }), _jsx("strong", { children: preferredTimes })] }), _jsxs("article", { children: [_jsx("span", { children: "Session Length" }), _jsx("strong", { children: profile.sessionLength || 'Not set' })] })] }))] }), _jsxs("section", { className: styles.listCard, children: [_jsxs("div", { className: styles.cardTitleRow, children: [_jsxs("h3", { children: [_jsx(CalendarDays, { size: 22 }), " Past Study Sessions"] }), _jsxs("span", { children: [pastSessions.length, " total sessions"] })] }), _jsx("div", { className: styles.sessionsList, children: pastSessions.length ? pastSessions.map((session) => (_jsxs("article", { className: styles.sessionItem, children: [_jsx("div", { className: styles.sessionIcon, children: session.sessionType === 'ONLINE' ? _jsx(Monitor, { size: 18 }) : _jsx(MapPin, { size: 18 }) }), _jsxs("div", { className: styles.sessionInfo, children: [_jsx("strong", { children: session.topic }), _jsxs("span", { children: [formatDate(session.date), " - ", formatDuration(session.duration), " - ", session.location || titleCase(session.sessionType)] })] }), _jsxs("div", { className: styles.participantCount, children: [_jsx(Users, { size: 16 }), " ", session.participants?.length ?? 0] })] }, session.id))) : _jsx("p", { className: styles.emptyText, children: "No past study sessions yet." }) })] }), _jsxs("section", { className: styles.listCard, children: [_jsxs("h3", { children: [_jsx(Clock3, { size: 22 }), " Availability"] }), _jsx("div", { className: styles.availabilityList, children: mergedAvailability.length ? mergedAvailability.map((slot) => (_jsxs("article", { className: styles.availabilityItem, children: [_jsx("strong", { children: formatDayOfWeek(slot.dayOfWeek) }), _jsxs("span", { children: [formatTime(slot.startTime), " - ", formatTime(slot.endTime)] })] }, slot.id))) : _jsx("p", { className: styles.emptyText, children: "No availability set." }) })] }), _jsxs("section", { className: styles.listCard, children: [_jsxs("h3", { children: [_jsx(Users, { size: 22 }), " Connected Study Buddies"] }), _jsx("div", { className: styles.buddiesList, children: displayedBuddyIds.length ? displayedBuddyIds.map((buddyId) => {
                            const buddy = usersById.get(buddyId);
                            const buddyName = buddy ? `${buddy.firstName} ${buddy.lastName}` : 'Study Buddy';
                            const buddyInitials = buddy
                                ? `${buddy.firstName?.[0] ?? ''}${buddy.lastName?.[0] ?? ''}`.toUpperCase()
                                : buddyId.slice(0, 2).toUpperCase();
                            return (_jsxs("article", { className: styles.buddyItem, children: [_jsx("div", { className: styles.buddyAvatar, children: buddyInitials || 'SB' }), _jsxs("div", { className: styles.buddyInfo, children: [_jsx("strong", { children: buddyName }), _jsxs("span", { children: [sessionsTogetherByBuddy.get(buddyId) ?? 0, " sessions together"] }), _jsx("span", { children: buddy?.academicYear || buddy?.university || 'Connected study buddy' })] })] }, buddyId));
                        }) : _jsx("p", { className: styles.emptyText, children: "No connected study buddies yet." }) })] })] }));
}
