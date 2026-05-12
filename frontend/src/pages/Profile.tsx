import { useMutation, useQuery } from '@apollo/client';
import {
  BookOpen,
  CalendarDays,
  Check,
  Clock3,
  Edit3,
  GraduationCap,
  MapPin,
  Monitor,
  Plus,
  Save,
  Search,
  Tag,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GET_CONNECTIONS_DATA,
  GET_COURSES_AND_TOPICS,
  GET_MY_AVAILABILITY,
  GET_STUDY_SESSIONS_DATA,

} from '../graphql/queries';
import {
  RECALCULATE_MATCHES, 
  UPDATE_MATCHING_SERVICE_PROFILE,
  REPLACE_COURSES,
  REPLACE_TOPICS,
  UPDATE_MATCH_PROFILE,
} from '../graphql/mutations';
import type {
  AvailabilitySlot,
  ProfileCourse as Course,
  ProfileData,
  ProfileStudySession as StudySession,
  ProfileTopic as Topic,
  UserSummary,
} from '../types';
import styles from '../styles/pages/Profile.module.css';

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
const GROUP_SIZE_TO_NUMBER: Record<string, number> = {
  ONE_ON_ONE: 2,
  SMALL: 4,
  LARGE: 8,
};

// ---------- Helper functions ----------
const titleCase = (value?: string | null) => {
  if (!value) return 'Not set';
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const labelFor = (value: string | undefined | null, options: Array<{ value: string; label: string }>) =>
  options.find((option) => option.value === value)?.label ?? titleCase(value);

const uniqueCourses = (courses: Course[]) => {
  const seen = new Set<string>();
  return courses.filter((course) => {
    const key = course.code.trim().toUpperCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const uniqueTopics = (topics: Topic[]) => {
  const seen = new Set<string>();
  return topics.filter((topic) => {
    const key = topic.name.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const uniqueValues = (values: string[] = []) => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.trim().toUpperCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Get display label for group size from the string value (used in view mode)
const getGroupSizeLabel = (value: string | null | undefined) => {
  if (!value) return 'Not set';
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
  const [editCourses, setEditCourses] = useState<Course[]>([]);
  const [editTopics, setEditTopics] = useState<Topic[]>([]);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [editPrefs, setEditPrefs] = useState({
    studyPace: '',
    studyMode: '',
    groupSize: '',
    studyStyles: [] as string[],
    preferredTimes: [] as string[],
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

  const profile: ProfileData = profileResponse?.getCoursesAndTopics ?? {};
  const courses = profile.courses ?? [];
  const topics = profile.topics ?? [];
  const availabilitySlots: AvailabilitySlot[] = availabilityData?.getMyAvailability ?? [];
  const savingProfile = saveInProgress || savingPrefs || savingCourses || savingTopics || recalculatingMatches;

  const allSessions: StudySession[] = sessionsData?.getMySessions ?? [];
  const pastSessions = allSessions
    .filter((session) => new Date(session.date) < new Date())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  const buddyIds: string[] = connectionsData?.getMyBuddies ?? [];
  const allUsers: UserSummary[] = connectionsData?.getAllUsers ?? [];
  const usersById = new Map(allUsers.map((candidate) => [candidate.id, candidate]));
  const displayedBuddyIds = buddyIds.slice(0, 6);
  const sessionsTogetherByBuddy = new Map(
    displayedBuddyIds.map((buddyId) => [
      buddyId,
      allSessions.filter((session) => (
        session.creatorId === buddyId ||
        session.participants?.some((participant) => participant.userId === buddyId)
      )).length,
    ])
  );

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
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatDuration = (minutes: number) => {
    if (!minutes) return 'No duration';
    const hours = minutes / 60;
    return Number.isInteger(hours) ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : `${minutes} min`;
  };

  const formatDayOfWeek = (day: string) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNumber = Number(day);
    return days[dayNumber] ?? day;
  };

  const formatTime = (time: string) => {
    const [rawHours, minutes = '00'] = time.split(':');
    const hours = Number(rawHours);
    if (Number.isNaN(hours)) return time;
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes} ${suffix}`;
  };

  const timeToMinutes = (time: string) => {
    const [rawHours, rawMinutes = '0'] = time.split(':');
    const hours = Number(rawHours);
    const minutes = Number(rawMinutes);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
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
    .reduce<Array<{ id: string; dayOfWeek: string; startTime: string; endTime: string; endMinutes: number }>>((groups, slot) => {
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

  const toggleUniqueOption = (field: 'studyStyles' | 'preferredTimes', value: string) => {
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

  const addCourseToEdit = (course: Course) => {
    setEditCourses((current) => uniqueCourses([...current, { ...course, code: course.code.toUpperCase() }]));
    setCourseQuery('');
    setCustomCourseCode('');
  };

  const addCustomCourse = () => {
    const name = courseQuery.trim();
    const code = customCourseCode.trim().toUpperCase().replace(/\s+/g, '');
    if (!name || !code) return;
    addCourseToEdit({ name, code });
  };

  const addTopicToEdit = (name: string) => {
    const topicName = name.trim();
    if (!topicName) return;
    setEditTopics((current) => uniqueTopics([...current, { name: topicName }]));
    setTopicQuery('');
  };

  const [updateMatchingProfile] = useMutation(UPDATE_MATCHING_SERVICE_PROFILE);

  const handleSaveProfile = async () => {
    if (saveInProgress) return;

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
            groupSize: editPrefs.groupSize || null,      // string
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
            groupSize: groupSizeNumber,              // number
            studyStyle: studyStyleString,            // string, e.g. "WRITING,DISCUSSION"
            preferredTimes: uniqueValues(editPrefs.preferredTimes),
            sessionLength: editPrefs.sessionLength || null,
          },
        },
      });

      await recalculateMatches();

      await refetchProfile();
      await waitForMinimumSaveTime();
      setIsEditing(false);
    } catch (error) {
      await waitForMinimumSaveTime();
      throw error;
    } finally {
      setSaveInProgress(false);
    }
  };

  if (profileLoading || availabilityLoading || sessionsLoading || connectionsLoading) {
    return <div className={styles.loadingState}>Loading profile...</div>;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1>My Profile</h1>
        <p>Manage your profile and view your study activity</p>
      </header>

      <section className={styles.profileCard}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.profileInfo}>
          <h2>{fullName}</h2>
          <p className={styles.email}>{user?.email}</p>
          <p className={styles.bio}>{generatedBio}</p>
          <div className={styles.profileMeta}>
            <span><MapPin size={14} />{user?.university || 'University not set'}</span>
            <span><GraduationCap size={14} />{user?.academicYear || 'Academic year not set'}</span>
            <span><BookOpen size={14} />{courses.length ? `${courses.length} courses` : 'No courses yet'}</span>
          </div>
        </div>
        {isEditing ? (
          <div className={styles.profileActions}>
            <button className={styles.cancelProfileButton} onClick={cancelEditing}>
              <X size={14} /> Cancel
            </button>
            <button className={styles.editProfileButton} onClick={handleSaveProfile} disabled={savingProfile}>
              <Save size={14} /> {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        ) : (
          <button className={styles.editProfileButton} onClick={startEditing}>
            <Edit3 size={14} /> Edit Profile
          </button>
        )}
      </section>

      <div className={styles.twoColumnGrid}>
        {/* Shared Courses */}
        <section className={styles.squareCard}>
          <h3><BookOpen size={22} /> Shared Courses</h3>
          <div className={styles.coursesList}>
            {(isEditing ? editCourses : courses).length ? (isEditing ? editCourses : courses).map((course) => (
              <article className={styles.courseItem} key={course.id ?? course.code}>
                <div>
                  <strong>{course.name}</strong>
                  <span>{course.code}{course.term ? ` - ${course.term}` : ''}</span>
                </div>
                {isEditing && (
                  <button className={styles.iconButton} onClick={() => setEditCourses((prev) => prev.filter((c) => c.code !== course.code))}>
                    <Trash2 size={14} />
                  </button>
                )}
              </article>
            )) : <p className={styles.emptyText}>No courses added yet.</p>}
          </div>
          {isEditing && (
            <div className={styles.picker}>
              <label><Search size={13} /> Find a course by name or code</label>
              <div className={styles.searchRow}>
                <input value={courseQuery} onChange={(e) => setCourseQuery(e.target.value)} placeholder="Search course name" />
                <input value={customCourseCode} onChange={(e) => setCustomCourseCode(e.target.value)} placeholder="Code" />
                <button type="button" onClick={addCustomCourse}><Plus size={16} /></button>
              </div>
              <div className={styles.suggestionList}>
                {courseMatches.length ? courseMatches.map((course) => (
                  <button key={course.code} type="button" onClick={() => addCourseToEdit(course)}>
                    <span>{course.code}</span> {course.name}
                  </button>
                )) : <p>{courseQuery ? 'No matching courses.' : 'Start typing to search.'}</p>}
              </div>
            </div>
          )}
        </section>

        {/* Study Topics */}
        <section className={styles.squareCard}>
          <h3><Tag size={22} /> Study Topics</h3>
          <div className={styles.topicsList}>
            {(isEditing ? editTopics : topics).length ? (isEditing ? editTopics : topics).map((topic) => (
              <span className={styles.topicTag} key={topic.id ?? topic.name}>
                {topic.name}
                {isEditing && (
                  <button onClick={() => setEditTopics((prev) => prev.filter((t) => t.name !== topic.name))}>
                    <Trash2 size={11} />
                  </button>
                )}
              </span>
            )) : <p className={styles.emptyText}>No study topics added yet.</p>}
          </div>
          {isEditing && (
            <div className={styles.picker}>
              <label><Search size={13} /> Pick a topic or type your own</label>
              <div className={styles.searchRowSingle}>
                <input
                  value={topicQuery}
                  onChange={(e) => setTopicQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTopicToEdit(topicQuery)}
                  placeholder="Search topics"
                />
                <button type="button" onClick={() => addTopicToEdit(topicQuery)}><Plus size={16} /></button>
              </div>
              <div className={styles.suggestionList}>
                {topicMatches.length ? topicMatches.map((topic) => (
                  <button key={topic.name} type="button" onClick={() => addTopicToEdit(topic.name)}>
                    {topic.name}
                  </button>
                )) : <p>{topicQuery ? 'No matching topics.' : 'Start typing to search.'}</p>}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Study Preferences – now displays all six fields */}
      <section className={styles.preferencesCard}>
        <h3><Clock3 size={22} /> Study Preferences</h3>
        {isEditing ? (
          <div className={styles.editPrefForm}>
            <label>Study Pace
              <select value={editPrefs.studyPace} onChange={(e) => setEditPrefs({ ...editPrefs, studyPace: e.target.value })}>
                <option value="">Select pace</option>
                {PACE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
            <label>Study Mode
              <select value={editPrefs.studyMode} onChange={(e) => setEditPrefs({ ...editPrefs, studyMode: e.target.value })}>
                <option value="">Select mode</option>
                {MODE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
            <label>Group Size
              <select value={editPrefs.groupSize} onChange={(e) => setEditPrefs({ ...editPrefs, groupSize: e.target.value })}>
                <option value="">Select group size</option>
                {SIZE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </label>
            <div className={styles.optionGroup}>
              <span>Study Styles</span>
              <div className={styles.chipGroup}>
                {STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={editPrefs.studyStyles.includes(opt.value) ? styles.optionChipActive : styles.optionChip}
                    type="button"
                    onClick={() => toggleUniqueOption('studyStyles', opt.value)}
                  >
                    {editPrefs.studyStyles.includes(opt.value) && <Check size={12} />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.optionGroup}>
              <span>Preferred Times</span>
              <div className={styles.chipGroup}>
                {TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={editPrefs.preferredTimes.includes(opt.value) ? styles.optionChipActive : styles.optionChip}
                    type="button"
                    onClick={() => toggleUniqueOption('preferredTimes', opt.value)}
                  >
                    {editPrefs.preferredTimes.includes(opt.value) && <Check size={12} />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <label>Session Length
              <select value={editPrefs.sessionLength} onChange={(e) => setEditPrefs({ ...editPrefs, sessionLength: e.target.value })}>
                <option value="">Optional</option>
                {LENGTH_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </label>
          </div>
        ) : (
          <div className={styles.preferenceGrid}>
            <article><span>Study Pace</span><strong>{labelFor(profile.studyPace, PACE_OPTIONS)}</strong></article>
            <article><span>Study Mode</span><strong>{labelFor(profile.studyMode, MODE_OPTIONS)}</strong></article>
            <article><span>Group Size</span><strong>{getGroupSizeLabel(profile.groupSize)}</strong></article>
            <article><span>Study Styles</span><strong>{displayedStudyStyles}</strong></article>
            <article><span>Preferred Times</span><strong>{preferredTimes}</strong></article>
            <article><span>Session Length</span><strong>{profile.sessionLength || 'Not set'}</strong></article>
          </div>
        )}
      </section>

      {/* Past Study Sessions */}
      <section className={styles.listCard}>
        <div className={styles.cardTitleRow}>
          <h3><CalendarDays size={22} /> Past Study Sessions</h3>
          <span>{pastSessions.length} total sessions</span>
        </div>
        <div className={styles.sessionsList}>
          {pastSessions.length ? pastSessions.map((session) => (
            <article className={styles.sessionItem} key={session.id}>
              <div className={styles.sessionIcon}>
                {session.sessionType === 'ONLINE' ? <Monitor size={18} /> : <MapPin size={18} />}
              </div>
              <div className={styles.sessionInfo}>
                <strong>{session.topic}</strong>
                <span>{formatDate(session.date)} - {formatDuration(session.duration)} - {session.location || titleCase(session.sessionType)}</span>
              </div>
              <div className={styles.participantCount}>
                <Users size={16} /> {session.participants?.length ?? 0}
              </div>
            </article>
          )) : <p className={styles.emptyText}>No past study sessions yet.</p>}
        </div>
      </section>

      {/* Availability */}
      <section className={styles.listCard}>
        <h3><Clock3 size={22} /> Availability</h3>
        <div className={styles.availabilityList}>
          {mergedAvailability.length ? mergedAvailability.map((slot) => (
            <article className={styles.availabilityItem} key={slot.id}>
              <strong>{formatDayOfWeek(slot.dayOfWeek)}</strong>
              <span>{formatTime(slot.startTime)} - {formatTime(slot.endTime)}</span>
            </article>
          )) : <p className={styles.emptyText}>No availability set.</p>}
        </div>
      </section>

      {/* Connected Study Buddies */}
      <section className={styles.listCard}>
        <h3><Users size={22} /> Connected Study Buddies</h3>
        <div className={styles.buddiesList}>
          {displayedBuddyIds.length ? displayedBuddyIds.map((buddyId) => {
            const buddy = usersById.get(buddyId);
            const buddyName = buddy ? `${buddy.firstName} ${buddy.lastName}` : 'Study Buddy';
            const buddyInitials = buddy
              ? `${buddy.firstName?.[0] ?? ''}${buddy.lastName?.[0] ?? ''}`.toUpperCase()
              : buddyId.slice(0, 2).toUpperCase();
            return (
              <article className={styles.buddyItem} key={buddyId}>
                <div className={styles.buddyAvatar}>{buddyInitials || 'SB'}</div>
                <div className={styles.buddyInfo}>
                  <strong>{buddyName}</strong>
                  <span>{sessionsTogetherByBuddy.get(buddyId) ?? 0} sessions together</span>
                  <span>{buddy?.academicYear || buddy?.university || 'Connected study buddy'}</span>
                </div>
              </article>
            );
          }) : <p className={styles.emptyText}>No connected study buddies yet.</p>}
        </div>
      </section>
    </main>
  );
}
