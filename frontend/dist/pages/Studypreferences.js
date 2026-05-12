import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, gql } from '@apollo/client';
import hiveLogo from '../assets/images/logo.png';
/* ── GraphQL ─────────────────────────────────────────────── */
const UPDATE_PREFERENCES = gql `
  mutation UpdatePreferences($input: UpdatePreferencesInput!) {
    updatePreferences(input: $input) {
      id
      studyPace
      studyMode
      groupSize
      studyStyles
      preferredTimes
      sessionLength
    }
  }
`;
/* ═══════════════════════════════════════════════════════════ */
export default function StudyPreferences() {
    const navigate = useNavigate();
    const [updatePreferences, { loading }] = useMutation(UPDATE_PREFERENCES);
    const [pace, setPace] = useState(null);
    const [mode, setMode] = useState(null);
    const [size, setSize] = useState(null);
    const [styles, setStyles] = useState(new Set());
    const [times, setTimes] = useState(new Set());
    const [length, setLength] = useState(null);
    const [error, setError] = useState('');
    const toggleStyle = (s) => setStyles(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
    const toggleTime = (t) => setTimes(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });
    const canSave = pace && mode && size && styles.size > 0 && times.size > 0;
    const handleSave = async () => {
        if (!pace || !mode || !size) {
            setError('Please fill in all required fields.');
            return;
        }
        if (styles.size === 0) {
            setError('Please choose at least one study style.');
            return;
        }
        if (times.size === 0) {
            setError('Please choose at least one preferred time.');
            return;
        }
        try {
            await updatePreferences({
                variables: {
                    input: {
                        studyPace: pace,
                        studyMode: mode,
                        groupSize: size,
                        studyStyles: Array.from(styles),
                        preferredTimes: Array.from(times),
                        sessionLength: length ?? null,
                    },
                },
            });
            navigate('/dashboard');
        }
        catch (e) {
            setError(e.message);
        }
    };
    return (_jsxs("div", { style: s.page, children: [_jsxs("header", { style: s.header, children: [_jsx("img", { src: hiveLogo, alt: "HiveMind", style: s.logoImg }), _jsxs("span", { style: s.logoText, children: [_jsx("span", { style: s.logoHive, children: "Hive" }), _jsx("span", { style: s.logoMind, children: "Mind" })] })] }), _jsxs("main", { style: s.main, children: [_jsx("h1", { style: s.title, children: "Set Your Study Preferences" }), _jsx("div", { style: s.progressBar, children: _jsx("div", { style: { ...s.progressFill, width: '100%' } }) }), _jsx("p", { style: s.subtitle, children: "Tell us how you like to study so we can find the best matches for you." }), error && (_jsxs("div", { style: s.errorBanner, children: ["\u26A0\uFE0F ", error, _jsx("button", { style: s.errorClose, onClick: () => setError(''), children: "\u00D7" })] })), _jsx(Section, { icon: "\uD83D\uDC22", title: "Study Pace", subtitle: "How fast do you prefer to study?", required: true, children: _jsxs("div", { style: s.grid3, children: [_jsx(OptionCard, { emoji: "\uD83D\uDC22", label: "Slow & Steady", desc: "Take time to understand concepts deeply", selected: pace === 'SLOW', onSelect: () => setPace('SLOW') }), _jsx(OptionCard, { emoji: "\uD83D\uDEB6", label: "Moderate", desc: "Balanced approach to learning", selected: pace === 'MODERATE', onSelect: () => setPace('MODERATE') }), _jsx(OptionCard, { emoji: "\uD83D\uDE80", label: "Fast Paced", desc: "Covers materials quickly and efficiently", selected: pace === 'FAST', onSelect: () => setPace('FAST') })] }) }), _jsx(Section, { icon: "\uD83D\uDCCD", title: "Study Mode", subtitle: "Where do you prefer to study?", required: true, children: _jsxs("div", { style: s.grid3, children: [_jsx(OptionCard, { emoji: "\uD83D\uDCBB", label: "Online", desc: "Study remotely via video calls", selected: mode === 'ONLINE', onSelect: () => setMode('ONLINE') }), _jsx(OptionCard, { emoji: "\uD83C\uDFEB", label: "In-person", desc: "Meet in a library or campus", selected: mode === 'IN_PERSON', onSelect: () => setMode('IN_PERSON') }), _jsx(OptionCard, { emoji: "\uD83D\uDD04", label: "Both", desc: "Flexible with either option", selected: mode === 'BOTH', onSelect: () => setMode('BOTH') })] }) }), _jsx(Section, { icon: "\uD83D\uDC65", title: "Preferred Group Size", subtitle: "How many people do you like to study with?", required: true, children: _jsxs("div", { style: s.grid3, children: [_jsx(OptionCard, { emoji: "\uD83D\uDC64", label: "One-on-One", desc: "Just you and one study partner", selected: size === 'ONE_ON_ONE', onSelect: () => setSize('ONE_ON_ONE') }), _jsx(OptionCard, { emoji: "\uD83D\uDC65", label: "Small Group", desc: "3-4 people for focused study", selected: size === 'SMALL', onSelect: () => setSize('SMALL') }), _jsx(OptionCard, { emoji: "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66", label: "Large Group", desc: "5+ people for collaborative learning", selected: size === 'LARGE', onSelect: () => setSize('LARGE') })] }) }), _jsx(Section, { icon: "\uD83C\uDFAF", title: "Study Style", subtitle: "How do you like to study? (Select all that apply)", required: true, children: _jsxs("div", { style: s.grid2, children: [_jsx(StyleCard, { emoji: "\u270F\uFE0F", label: "Writing Notes", desc: "Learn by writing notes", selected: styles.has('WRITING'), onSelect: () => toggleStyle('WRITING') }), _jsx(StyleCard, { emoji: "\uD83D\uDCAC", label: "Discussion", desc: "Learn through active conversation", selected: styles.has('DISCUSSION'), onSelect: () => toggleStyle('DISCUSSION') }), _jsx(StyleCard, { emoji: "\uD83C\uDFA7", label: "Listening", desc: "Learn by listening and observing", selected: styles.has('LISTENING'), onSelect: () => toggleStyle('LISTENING') }), _jsx(StyleCard, { emoji: "\uD83E\uDD2B", label: "Quiet Focus", desc: "Focus in silence with minimal talk", selected: styles.has('QUIET'), onSelect: () => toggleStyle('QUIET') })] }) }), _jsx(Section, { icon: "\uD83D\uDD50", title: "Preferred Study Times", subtitle: "When do you usually study? (Select all that apply)", required: true, children: _jsxs("div", { style: s.grid4, children: [_jsx(TimeCard, { emoji: "\uD83C\uDF05", label: "Morning", sub: "6am \u2013 12pm", selected: times.has('MORNING'), onSelect: () => toggleTime('MORNING') }), _jsx(TimeCard, { emoji: "\u2600\uFE0F", label: "Afternoon", sub: "12pm \u2013 5pm", selected: times.has('AFTERNOON'), onSelect: () => toggleTime('AFTERNOON') }), _jsx(TimeCard, { emoji: "\uD83C\uDF06", label: "Evening", sub: "5pm \u2013 10pm", selected: times.has('EVENING'), onSelect: () => toggleTime('EVENING') }), _jsx(TimeCard, { emoji: "\uD83C\uDF19", label: "Night", sub: "10pm \u2013 2am", selected: times.has('NIGHT'), onSelect: () => toggleTime('NIGHT') })] }) }), _jsx(Section, { icon: "\u23F1\uFE0F", title: "Session Length", subtitle: "How long are your typical study sessions? (optional)", children: _jsx("div", { style: s.grid4, children: ['30 minutes', '1 hour', '2 hours', '3+ hours'].map(l => (_jsx("button", { style: { ...s.lengthBtn, ...(length === l ? s.lengthBtnSelected : {}) }, onClick: () => setLength(prev => prev === l ? null : l), children: l }, l))) }) }), _jsxs("div", { style: s.actions, children: [_jsx("button", { style: s.backBtn, onClick: () => navigate('/onboarding/profile'), children: "\u2190 Back" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 16 }, children: [!canSave && _jsx("span", { style: s.requiredNote, children: "* Fill required sections to continue" }), _jsx("button", { style: { ...s.saveBtn, opacity: loading ? 0.7 : 1 }, onClick: handleSave, disabled: loading, children: loading ? 'Saving…' : 'Save Preferences & Continue →' })] })] })] })] }));
}
/* ── Section wrapper ─────────────────────────────────────── */
function Section({ icon, title, subtitle, required, children }) {
    return (_jsxs("div", { style: s.section, children: [_jsxs("div", { style: s.sectionHeader, children: [_jsx("span", { style: s.sectionIcon, children: icon }), _jsxs("div", { children: [_jsxs("div", { style: s.sectionTitle, children: [title, required && _jsx("span", { style: s.requiredStar, children: " *" })] }), _jsx("div", { style: s.sectionSub, children: subtitle })] })] }), children] }));
}
/* ── Single-select option card ───────────────────────────── */
function OptionCard({ emoji, label, desc, selected, onSelect }) {
    return (_jsxs("button", { style: { ...s.optCard, ...(selected ? s.optCardSel : {}) }, onClick: onSelect, children: [_jsx("span", { style: s.optEmoji, children: emoji }), _jsx("div", { style: { ...s.optLabel, ...(selected ? { color: '#be185d' } : {}) }, children: label }), _jsx("div", { style: s.optDesc, children: desc })] }));
}
/* ── Multi-select style card ─────────────────────────────── */
function StyleCard({ emoji, label, desc, selected, onSelect }) {
    return (_jsxs("button", { style: { ...s.styleCard, ...(selected ? s.styleCardSel : {}) }, onClick: onSelect, children: [_jsx("span", { style: s.styleEmoji, children: emoji }), _jsxs("div", { style: s.styleInfo, children: [_jsx("div", { style: { ...s.styleLabel, ...(selected ? { color: '#be185d' } : {}) }, children: label }), _jsx("div", { style: s.styleDesc, children: desc })] }), selected && _jsx("span", { style: s.checkmark, children: "\u2713" })] }));
}
/* ── Time card ───────────────────────────────────────────── */
function TimeCard({ emoji, label, sub, selected, onSelect }) {
    return (_jsxs("button", { style: { ...s.timeCard, ...(selected ? s.timeCardSel : {}) }, onClick: onSelect, children: [_jsx("span", { style: s.timeEmoji, children: emoji }), _jsx("div", { style: { ...s.timeLabel, ...(selected ? { color: '#be185d' } : {}) }, children: label }), _jsx("div", { style: s.timeSub, children: sub }), selected && _jsx("span", { style: s.checkmark, children: "\u2713" })] }));
}
/* ── Styles ──────────────────────────────────────────────── */
const s = {
    page: { minHeight: '100vh', background: '#fafafa', fontFamily: "'Nunito','Segoe UI',sans-serif", color: '#1a1a2e' },
    header: { display: 'flex', alignItems: 'center', gap: 10, padding: '18px 40px', borderBottom: '1px solid #f0eef8', background: '#fff' },
    logoImg: { width: 36, height: 36, objectFit: 'contain' },
    logoText: { fontSize: 20, letterSpacing: '-0.3px' },
    logoHive: { fontWeight: 800, color: '#1a1a2e' },
    logoMind: { fontWeight: 400, color: '#1a1a2e' },
    main: { maxWidth: 820, margin: '0 auto', padding: '40px 24px 60px' },
    title: { fontSize: 30, fontWeight: 800, margin: '0 0 8px' },
    progressBar: { height: 4, background: '#e9e4fc', borderRadius: 4, marginBottom: 12, overflow: 'hidden' },
    progressFill: { height: '100%', background: '#0891B2', borderRadius: 4 },
    subtitle: { color: '#666', marginBottom: 28, fontSize: 14 },
    errorBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13 },
    errorClose: { background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: 18, fontWeight: 700 },
    section: { background: '#fff', border: '1px solid #ede9fe', borderRadius: 14, padding: '20px 22px', marginBottom: 20, boxShadow: '0 2px 8px rgba(124,58,237,.06)' },
    sectionHeader: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 },
    sectionIcon: { width: 36, height: 36, background: 'linear-gradient(135deg,#fdf2f8,#f3e8ff)', border: '1px solid #fce7f3', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
    sectionTitle: { fontWeight: 700, fontSize: 15 },
    sectionSub: { fontSize: 12, color: '#888', marginTop: 2 },
    requiredStar: { color: '#be185d' },
    grid3: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 },
    grid2: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 },
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 },
    optCard: { border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '18px 14px', background: '#fafafa', cursor: 'pointer', textAlign: 'center', transition: 'all .2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
    optCardSel: { border: '1.5px solid #be185d', background: '#fdf2f8', boxShadow: '0 0 0 3px rgba(190,24,93,.1)' },
    optEmoji: { fontSize: 32, marginBottom: 4 },
    optLabel: { fontWeight: 700, fontSize: 14, color: '#1a1a2e' },
    optDesc: { fontSize: 12, color: '#888', lineHeight: 1.4 },
    styleCard: { display: 'flex', alignItems: 'center', gap: 12, border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', background: '#fafafa', cursor: 'pointer', textAlign: 'left', transition: 'all .2s', position: 'relative' },
    styleCardSel: { border: '1.5px solid #be185d', background: '#fdf2f8', boxShadow: '0 0 0 3px rgba(190,24,93,.1)' },
    styleEmoji: { fontSize: 22, flexShrink: 0 },
    styleInfo: { flex: 1 },
    styleLabel: { fontWeight: 700, fontSize: 13, color: '#1a1a2e' },
    styleDesc: { fontSize: 12, color: '#888', marginTop: 2 },
    timeCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '16px 10px', background: '#fafafa', cursor: 'pointer', transition: 'all .2s', position: 'relative' },
    timeCardSel: { border: '1.5px solid #be185d', background: '#fdf2f8', boxShadow: '0 0 0 3px rgba(190,24,93,.1)' },
    timeEmoji: { fontSize: 26 },
    timeLabel: { fontWeight: 700, fontSize: 13, color: '#1a1a2e' },
    timeSub: { fontSize: 11, color: '#94a3b8' },
    checkmark: { position: 'absolute', top: 8, right: 10, fontSize: 12, color: '#be185d', fontWeight: 800 },
    lengthBtn: { padding: '12px 8px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#fafafa', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#555', transition: 'all .2s' },
    lengthBtnSelected: { border: '1.5px solid #be185d', background: '#fdf2f8', color: '#be185d', boxShadow: '0 0 0 3px rgba(190,24,93,.1)' },
    actions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 24, borderTop: '1px solid #f0eef8' },
    backBtn: { padding: '10px 22px', background: 'transparent', border: '1.5px solid #d1d5db', color: '#555', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
    saveBtn: { padding: '10px 28px', background: '#BE185D', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(190,24,93,.35)', transition: 'opacity .2s' },
    requiredNote: { fontSize: 12, color: '#94a3b8' },
};
