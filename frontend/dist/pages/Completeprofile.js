import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, gql } from '@apollo/client';
import hiveLogo from '../assets/images/logo.png';
/* ── GraphQL Mutations (matching your actual schema) ── */
const REPLACE_COURSES = gql `
  mutation ReplaceCourses($courses: [CourseInput!]!) {
    replaceCourses(courses: $courses) {
      id
      userId
      courses {
        id
        name
        code
        term
      }
    }
  }
`;
const REPLACE_TOPICS = gql `
  mutation ReplaceTopics($topics: [TopicInput!]!) {
    replaceTopics(topics: $topics) {
      id
      userId
      topics {
        id
        name
      }
    }
  }
`;
const UPDATE_PREFERENCES = gql `
  mutation UpdatePreferences($input: UpdatePreferencesInput!) {
    updatePreferences(input: $input) {
      id
      userId
      studyPace
      studyMode
      groupSize
      studyStyles
      preferredTimes
      sessionLength
    }
  }
`;
/* ── Course / Topic pools ─────────────────────────────────── */
const COURSE_POOL = [
    { name: 'Calculus I', code: 'MATH101' },
    { name: 'Calculus II', code: 'MATH102' },
    { name: 'Multivariable Calculus', code: 'MATH201' },
    { name: 'Linear Algebra', code: 'MATH202' },
    { name: 'Differential Equations', code: 'MATH203' },
    { name: 'Discrete Mathematics', code: 'MATH210' },
    { name: 'Statistics', code: 'STAT101' },
    { name: 'Probability & Statistics', code: 'STAT201' },
    { name: 'Introduction to Programming', code: 'CS101' },
    { name: 'Data Structures', code: 'CS201' },
    { name: 'Algorithms', code: 'CS301' },
    { name: 'Operating Systems', code: 'CS401' },
    { name: 'Computer Networks', code: 'CS402' },
    { name: 'Database Systems', code: 'CS403' },
    { name: 'Machine Learning', code: 'CS501' },
    { name: 'Artificial Intelligence', code: 'CS502' },
    { name: 'Software Engineering', code: 'CS404' },
];
const TOPIC_POOL = [
    'Linear Algebra', 'Calculus', 'Algorithms', 'Data Structures',
    'Machine Learning', 'Deep Learning', 'Python', 'JavaScript',
    'Java', 'C++', 'React', 'Database Design', 'Web Development',
];
/* ═══════════════════════════════════════════════════════════ */
export default function CompleteProfile() {
    const navigate = useNavigate();
    // Mutations
    const [replaceCourses] = useMutation(REPLACE_COURSES);
    const [replaceTopics] = useMutation(REPLACE_TOPICS);
    const [updatePreferences] = useMutation(UPDATE_PREFERENCES);
    // Local state
    const [courses, setCourses] = useState([]);
    const [topics, setTopics] = useState([]);
    const [university, setUniversity] = useState('');
    const [academicYear, setAcademicYear] = useState('');
    const [major, setMajor] = useState('');
    const [phone, setPhone] = useState('');
    const [contactMethod, setContactMethod] = useState('');
    const [availability, setAvailability] = useState('');
    const [goals, setGoals] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const addCourseToUser = (course) => {
        setCourses(prev => prev.some(existing => existing.code === course.code)
            ? prev
            : [...prev, { ...course, code: course.code.toUpperCase() }]);
    };
    const removeCourseFromUser = (code) => {
        setCourses(prev => prev.filter(c => c.code !== code));
    };
    const addTopicToUser = (name) => {
        setTopics(prev => prev.some(topic => topic.toLowerCase() === name.toLowerCase())
            ? prev
            : [...prev, name]);
    };
    const removeTopicFromUser = (name) => {
        setTopics(prev => prev.filter(t => t !== name));
    };
    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            // This creates the profile row if it does not exist yet.
            await updatePreferences({
                variables: {
                    input: {
                        studyPace: 'MODERATE',
                        studyMode: 'BOTH',
                        groupSize: 'SMALL',
                        studyStyles: ['DISCUSSION'],
                        preferredTimes: ['AFTERNOON', 'EVENING'],
                        sessionLength: '1 hour'
                    }
                }
            });
            await replaceCourses({
                variables: {
                    courses: courses.map(course => ({
                        name: course.name.trim(),
                        code: course.code.trim().toUpperCase(),
                        term: course.term?.trim() || null,
                    })),
                },
            });
            await replaceTopics({
                variables: {
                    topics: topics.map(name => ({ name: name.trim() })),
                },
            });
            // Navigate to next step
            navigate('/onboarding/preferences');
        }
        catch (e) {
            console.error('Save error:', e);
            setError(e.message || 'Failed to save profile');
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { style: s.page, children: [_jsxs("header", { style: s.header, children: [_jsx("img", { src: hiveLogo, alt: "HiveMind", style: s.logoImg }), _jsxs("span", { style: s.logoText, children: [_jsx("span", { style: s.logoHive, children: "Hive" }), _jsx("span", { style: s.logoMind, children: "Mind" })] })] }), _jsxs("main", { style: s.main, children: [_jsx("h1", { style: s.title, children: "Complete Your Profile" }), _jsx("div", { style: s.progressBar, children: _jsx("div", { style: { ...s.progressFill, width: '50%' } }) }), _jsx("p", { style: s.subtitle, children: "Help us match you with the perfect study partners by completing your academic profile." }), error && (_jsxs("div", { style: s.errorBanner, children: ["\u26A0\uFE0F ", error, _jsx("button", { style: s.errorClose, onClick: () => setError(''), children: "\u00D7" })] })), _jsxs("div", { style: s.grid, children: [_jsxs("div", { style: s.col, children: [_jsxs(Card, { icon: "\uD83D\uDCDA", title: "Academic Information", subtitle: "Tell us about your studies", children: [_jsxs("div", { style: s.row2, children: [_jsx(Field, { label: "University", value: university, onChange: setUniversity, placeholder: "e.g. MIT" }), _jsx(Field, { label: "Academic Year", value: academicYear, onChange: setAcademicYear, placeholder: "e.g. Junior" })] }), _jsx(Field, { label: "Major / Field of Study", value: major, onChange: setMajor, placeholder: "e.g. Computer Science" })] }), _jsx(Card, { icon: "\uD83C\uDF93", title: "Current Courses", subtitle: "Search and add your courses", children: _jsx(CourseSearch, { courses: courses, onAdd: addCourseToUser, onRemove: removeCourseFromUser }) })] }), _jsx("div", { style: s.col, children: _jsxs(Card, { icon: "\uD83D\uDCDE", title: "Contact Information", subtitle: "How can study partners reach you?", children: [_jsx(Field, { label: "Phone Number (Optional)", value: phone, onChange: setPhone, placeholder: "+20 100 000 0000" }), _jsx(Field, { label: "Preferred Contact Method", value: contactMethod, onChange: setContactMethod, placeholder: "e.g. WhatsApp, Email" }), _jsx(Field, { label: "General Availability", value: availability, onChange: setAvailability, placeholder: "e.g. Weekdays after 5pm" })] }) })] }), _jsxs(Card, { icon: "\uD83E\uDDE0", title: "Study Topics & Help Needed", subtitle: "Pick topics you need help with", children: [_jsx(TopicSearch, { topics: topics, onAdd: addTopicToUser, onRemove: removeTopicFromUser }), _jsx(Field, { label: "Study Goals (Optional)", value: goals, onChange: setGoals, placeholder: "e.g. Prepare for finals, improve problem-solving", multiline: true })] }), _jsxs("div", { style: s.actions, children: [_jsx("button", { style: s.skipBtn, onClick: () => navigate('/onboarding/preferences'), children: "Skip Now" }), _jsx("button", { style: s.saveBtn, onClick: handleSave, disabled: saving, children: saving ? 'Saving…' : 'Save Profile' })] })] })] }));
}
/* ═══════════════════════════════════════════════════════════
   CourseSearch Component
═══════════════════════════════════════════════════════════ */
function CourseSearch({ courses, onAdd, onRemove }) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [showCustom, setShowCustom] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customCode, setCustomCode] = useState('');
    const [customTerm, setCustomTerm] = useState('');
    const ref = useRef(null);
    useEffect(() => {
        const h = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
                setShowCustom(false);
            }
        };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    const savedCodes = new Set(courses.map(c => c.code));
    const suggestions = COURSE_POOL
        .filter(c => !savedCodes.has(c.code) && (c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.code.toLowerCase().includes(query.toLowerCase())))
        .slice(0, 6);
    const pick = (course) => {
        onAdd(course);
        setQuery('');
        setOpen(false);
    };
    const addCustom = () => {
        const name = customName.trim();
        const code = customCode.trim().toUpperCase().replace(/\s+/g, '');
        if (!name || !code)
            return;
        onAdd({ name, code, term: customTerm.trim() || undefined });
        setCustomName('');
        setCustomCode('');
        setCustomTerm('');
        setShowCustom(false);
        setOpen(false);
        setQuery('');
    };
    return (_jsxs("div", { children: [_jsxs("div", { style: { position: 'relative' }, ref: ref, children: [_jsx("input", { style: s.input, placeholder: "Search by name or code\u2026", value: query, onChange: e => { setQuery(e.target.value); setOpen(true); setShowCustom(false); }, onFocus: () => setOpen(true) }), open && (_jsxs("div", { style: s.dropdown, children: [suggestions.map(c => (_jsxs("button", { style: s.dropItem, onMouseDown: () => pick(c), children: [_jsx("span", { style: s.dropCode, children: c.code }), _jsx("span", { style: s.dropName, children: c.name })] }, c.code))), suggestions.length === 0 && query && !showCustom && (_jsxs("div", { style: s.dropEmpty, children: ["No matches for \"", query, "\""] })), !showCustom && (_jsx("button", { style: s.dropCustomBtn, onMouseDown: () => setShowCustom(true), children: "\u2795 Add custom course" })), showCustom && (_jsxs("div", { style: s.customForm, children: [_jsx("p", { style: s.customTitle, children: "Custom Course" }), _jsxs("div", { style: s.row2, children: [_jsxs("div", { children: [_jsx("label", { style: s.label, children: "Course Name *" }), _jsx("input", { style: s.input, value: customName, onChange: e => setCustomName(e.target.value), placeholder: "e.g. Advanced ML" })] }), _jsxs("div", { children: [_jsx("label", { style: s.label, children: "Course Code *" }), _jsx("input", { style: s.input, value: customCode, onChange: e => setCustomCode(e.target.value), placeholder: "e.g. CS601" })] })] }), _jsx("label", { style: s.label, children: "Term (optional)" }), _jsx("input", { style: { ...s.input, marginBottom: 10 }, value: customTerm, onChange: e => setCustomTerm(e.target.value), placeholder: "e.g. Spring 2026" }), _jsxs("div", { style: { display: 'flex', gap: 8 }, children: [_jsx("button", { style: s.addBtn, onMouseDown: addCustom, disabled: !customName.trim() || !customCode.trim(), children: "Add Course" }), _jsx("button", { style: s.cancelBtn, onMouseDown: () => setShowCustom(false), children: "Cancel" })] })] }))] }))] }), courses.length > 0 ? (_jsx("div", { style: { ...s.tagList, marginTop: 12 }, children: courses.map(c => (_jsxs("span", { style: s.tag, children: [_jsx("span", { style: s.tagCode, children: c.code }), c.name, _jsx("button", { style: s.tagX, onClick: () => onRemove(c.code), children: "\u00D7" })] }, c.code))) })) : (_jsx("p", { style: s.hint, children: "\uD83D\uDD0D Courses are the primary signal used to find students in the same class." }))] }));
}
/* ═══════════════════════════════════════════════════════════
   TopicSearch Component
═══════════════════════════════════════════════════════════ */
function TopicSearch({ topics, onAdd, onRemove }) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target))
            setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    const savedNames = new Set(topics.map(t => t.toLowerCase()));
    const suggestions = TOPIC_POOL
        .filter(t => !savedNames.has(t.toLowerCase()) && t.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 6);
    const pick = (name) => { onAdd(name); setQuery(''); setOpen(false); };
    const addFree = () => { const n = query.trim(); if (n) {
        onAdd(n);
        setQuery('');
        setOpen(false);
    } };
    return (_jsxs("div", { style: { marginBottom: 16 }, children: [_jsx("label", { style: s.label, children: "Topics" }), _jsxs("div", { style: { position: 'relative' }, ref: ref, children: [_jsx("input", { style: s.input, placeholder: "Search topics or type your own\u2026", value: query, onChange: e => { setQuery(e.target.value); setOpen(true); }, onFocus: () => setOpen(true), onKeyDown: e => { if (e.key === 'Enter') {
                            e.preventDefault();
                            addFree();
                        } } }), open && query.length > 0 && (_jsxs("div", { style: s.dropdown, children: [suggestions.map(t => (_jsx("button", { style: s.dropItem, onMouseDown: () => pick(t), children: _jsx("span", { style: s.dropName, children: t }) }, t))), !TOPIC_POOL.some(t => t.toLowerCase() === query.trim().toLowerCase()) && query.trim() && (_jsxs("button", { style: s.dropCustomBtn, onMouseDown: addFree, children: ["\u2795 Add \"", query.trim(), "\""] }))] }))] }), topics.length > 0 ? (_jsx("div", { style: { ...s.tagList, marginTop: 10 }, children: topics.map(t => (_jsxs("span", { style: s.topicTag, children: [t, _jsx("button", { style: { ...s.tagX, color: '#16a34a' }, onClick: () => onRemove(t), children: "\u00D7" })] }, t))) })) : (_jsx("p", { style: s.hint, children: "\uD83E\uDDE9 Topics help match you with partners studying the same subjects." }))] }));
}
/* ── Shared Components ───────────────────────────────────── */
function Card({ icon, title, subtitle, children }) {
    return (_jsxs("div", { style: s.card, children: [_jsxs("div", { style: s.cardHeader, children: [_jsx("span", { style: s.cardIcon, children: icon }), _jsxs("div", { children: [_jsx("div", { style: s.cardTitle, children: title }), _jsx("div", { style: s.cardSub, children: subtitle })] })] }), _jsx("div", { style: s.cardBody, children: children })] }));
}
function Field({ label, value, onChange, placeholder, multiline }) {
    return (_jsxs("div", { style: { marginBottom: 14 }, children: [_jsx("label", { style: s.label, children: label }), multiline
                ? _jsx("textarea", { style: { ...s.input, minHeight: 70, resize: 'vertical' }, value: value, onChange: e => onChange(e.target.value), placeholder: placeholder })
                : _jsx("input", { style: s.input, value: value, onChange: e => onChange(e.target.value), placeholder: placeholder })] }));
}
/* ── Styles ──────────────────────────────────────────────── */
const s = {
    page: { minHeight: '100vh', background: '#fafafa', fontFamily: "'Nunito','Segoe UI',sans-serif", color: '#1a1a2e' },
    header: { display: 'flex', alignItems: 'center', gap: 10, padding: '18px 40px', borderBottom: '1px solid #f0eef8', background: '#fff' },
    logoImg: { width: 36, height: 36, objectFit: 'contain' },
    logoText: { fontSize: 20, letterSpacing: '-0.3px' },
    logoHive: { fontWeight: 800, color: '#1a1a2e' },
    logoMind: { fontWeight: 400, color: '#1a1a2e' },
    main: { maxWidth: 900, margin: '0 auto', padding: '40px 24px' },
    title: { fontSize: 30, fontWeight: 800, margin: '0 0 8px' },
    progressBar: { height: 4, background: '#e9e4fc', borderRadius: 4, marginBottom: 12, overflow: 'hidden' },
    progressFill: { height: '100%', background: '#0891B2', borderRadius: 4, transition: 'width .4s' },
    subtitle: { color: '#666', marginBottom: 28, fontSize: 14 },
    errorBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13 },
    errorClose: { background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: 18, fontWeight: 700 },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 },
    col: { display: 'flex', flexDirection: 'column', gap: 20 },
    card: { background: '#fff', border: '1px solid #ede9fe', borderRadius: 14, boxShadow: '0 2px 8px rgba(124,58,237,.06)' },
    cardHeader: { display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: '1px solid #f5f3ff' },
    cardIcon: { width: 38, height: 38, background: 'linear-gradient(135deg,#fdf2f8,#f3e8ff)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: '1px solid #fce7f3', flexShrink: 0 },
    cardTitle: { fontWeight: 700, fontSize: 15, color: '#1a1a2e' },
    cardSub: { fontSize: 12, color: '#888', marginTop: 2 },
    cardBody: { padding: '18px 20px' },
    label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 },
    input: { width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: '#fafafa', outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s' },
    row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 },
    dropdown: { position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #ede9fe', borderRadius: 10, boxShadow: '0 8px 24px rgba(124,58,237,.12)', zIndex: 50, overflow: 'hidden' },
    dropItem: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid #f9f8ff', cursor: 'pointer', textAlign: 'left' },
    dropCode: { fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#7c3aed', background: '#f3e8ff', padding: '2px 6px', borderRadius: 4, flexShrink: 0 },
    dropName: { fontSize: 13, color: '#1a1a2e' },
    dropEmpty: { padding: '10px 14px', color: '#888', fontSize: 13 },
    dropCustomBtn: { display: 'block', width: '100%', padding: '10px 14px', background: '#fdf2f8', border: 'none', borderTop: '1px solid #fce7f3', color: '#be185d', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' },
    customForm: { padding: '14px 14px 10px', borderTop: '1px solid #f5f3ff', background: '#fdfcff' },
    customTitle: { fontWeight: 700, fontSize: 13, color: '#7c3aed', margin: '0 0 10px' },
    addBtn: { padding: '8px 16px', background: 'transparent', border: '1.5px solid #be185d', color: '#be185d', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    cancelBtn: { padding: '8px 14px', background: 'transparent', border: '1.5px solid #d1d5db', color: '#666', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
    tagList: { display: 'flex', flexWrap: 'wrap', gap: 8 },
    tag: { display: 'flex', alignItems: 'center', gap: 6, background: '#fdf2f8', border: '1px solid #fce7f3', color: '#be185d', borderRadius: 20, fontSize: 12, fontWeight: 600, padding: '4px 10px' },
    topicTag: { display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 20, fontSize: 12, fontWeight: 600, padding: '4px 10px' },
    tagCode: { fontFamily: 'monospace', fontSize: 10, background: '#fce7f3', padding: '1px 5px', borderRadius: 4, marginRight: 2 },
    tagX: { background: 'none', border: 'none', color: '#be185d', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 },
    hint: { fontSize: 12, color: '#94a3b8', marginTop: 10, lineHeight: 1.5 },
    actions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 24, borderTop: '1px solid #f0eef8' },
    skipBtn: { padding: '10px 22px', background: 'transparent', border: '1.5px solid #d1d5db', color: '#555', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    saveBtn: { padding: '10px 28px', background: '#BE185D', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(190,24,93,.35)' },
};
