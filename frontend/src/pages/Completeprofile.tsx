import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, gql } from '@apollo/client';
import hiveLogo from '../assets/images/logo.png';
import type { LocalCourse } from '../types';

/* ── GraphQL Mutations (matching your actual schema) ── */
const REPLACE_COURSES = gql`
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

const REPLACE_TOPICS = gql`
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

const UPDATE_PREFERENCES = gql`
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
const COURSE_POOL: { name: string; code: string }[] = [
  { name: 'Calculus I',                  code: 'MATH101' },
  { name: 'Calculus II',                 code: 'MATH102' },
  { name: 'Multivariable Calculus',      code: 'MATH201' },
  { name: 'Linear Algebra',              code: 'MATH202' },
  { name: 'Differential Equations',      code: 'MATH203' },
  { name: 'Discrete Mathematics',        code: 'MATH210' },
  { name: 'Statistics',                  code: 'STAT101' },
  { name: 'Probability & Statistics',    code: 'STAT201' },
  { name: 'Introduction to Programming', code: 'CS101'   },
  { name: 'Data Structures',             code: 'CS201'   },
  { name: 'Algorithms',                  code: 'CS301'   },
  { name: 'Operating Systems',           code: 'CS401'   },
  { name: 'Computer Networks',           code: 'CS402'   },
  { name: 'Database Systems',            code: 'CS403'   },
  { name: 'Machine Learning',            code: 'CS501'   },
  { name: 'Artificial Intelligence',     code: 'CS502'   },
  { name: 'Software Engineering',        code: 'CS404'   },
];

const TOPIC_POOL: string[] = [
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
  const [courses,       setCourses]       = useState<LocalCourse[]>([]);
  const [topics,        setTopics]        = useState<string[]>([]);
  const [university,    setUniversity]    = useState('');
  const [academicYear,  setAcademicYear]  = useState('');
  const [major,         setMajor]         = useState('');
  const [phone,         setPhone]         = useState('');
  const [contactMethod, setContactMethod] = useState('');
  const [availability,  setAvailability]  = useState('');
  const [goals,         setGoals]         = useState('');
  const [error,         setError]         = useState('');
  const [saving,        setSaving]        = useState(false);

  const addCourseToUser = (course: LocalCourse) => {
    setCourses(prev =>
      prev.some(existing => existing.code === course.code)
        ? prev
        : [...prev, { ...course, code: course.code.toUpperCase() }]
    );
  };

  const removeCourseFromUser = (code: string) => {
    setCourses(prev => prev.filter(c => c.code !== code));
  };

  const addTopicToUser = (name: string) => {
    setTopics(prev =>
      prev.some(topic => topic.toLowerCase() === name.toLowerCase())
        ? prev
        : [...prev, name]
    );
  };

  const removeTopicFromUser = (name: string) => {
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
    } catch (e: any) {
      console.error('Save error:', e);
      setError(e.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <img src={hiveLogo} alt="HiveMind" style={s.logoImg} />
        <span style={s.logoText}>
          <span style={s.logoHive}>Hive</span>
          <span style={s.logoMind}>Mind</span>
        </span>
      </header>

      <main style={s.main}>
        <h1 style={s.title}>Complete Your Profile</h1>
        <div style={s.progressBar}><div style={{ ...s.progressFill, width: '50%' }} /></div>
        <p style={s.subtitle}>Help us match you with the perfect study partners by completing your academic profile.</p>

        {error && (
          <div style={s.errorBanner}>
            ⚠️ {error}
            <button style={s.errorClose} onClick={() => setError('')}>×</button>
          </div>
        )}

        <div style={s.grid}>
          <div style={s.col}>
            <Card icon="📚" title="Academic Information" subtitle="Tell us about your studies">
              <div style={s.row2}>
                <Field label="University"    value={university}   onChange={setUniversity}   placeholder="e.g. MIT" />
                <Field label="Academic Year" value={academicYear} onChange={setAcademicYear} placeholder="e.g. Junior" />
              </div>
              <Field label="Major / Field of Study" value={major} onChange={setMajor} placeholder="e.g. Computer Science" />
            </Card>

            <Card icon="🎓" title="Current Courses" subtitle="Search and add your courses">
              <CourseSearch 
                courses={courses} 
                onAdd={addCourseToUser} 
                onRemove={removeCourseFromUser} 
              />
            </Card>
          </div>

          <div style={s.col}>
            <Card icon="📞" title="Contact Information" subtitle="How can study partners reach you?">
              <Field label="Phone Number (Optional)"  value={phone}         onChange={setPhone}         placeholder="+20 100 000 0000" />
              <Field label="Preferred Contact Method" value={contactMethod} onChange={setContactMethod} placeholder="e.g. WhatsApp, Email" />
              <Field label="General Availability"     value={availability}  onChange={setAvailability}  placeholder="e.g. Weekdays after 5pm" />
            </Card>
          </div>
        </div>

        <Card icon="🧠" title="Study Topics & Help Needed" subtitle="Pick topics you need help with">
          <TopicSearch 
            topics={topics} 
            onAdd={addTopicToUser} 
            onRemove={removeTopicFromUser} 
          />
          <Field
            label="Study Goals (Optional)"
            value={goals}
            onChange={setGoals}
            placeholder="e.g. Prepare for finals, improve problem-solving"
            multiline
          />
        </Card>

        <div style={s.actions}>
          <button style={s.skipBtn} onClick={() => navigate('/onboarding/preferences')}>Skip Now</button>
          <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CourseSearch Component
═══════════════════════════════════════════════════════════ */
function CourseSearch({ courses, onAdd, onRemove }: {
  courses: LocalCourse[];
  onAdd: (c: LocalCourse) => void;
  onRemove: (code: string) => void;
}) {
  const [query,      setQuery]      = useState('');
  const [open,       setOpen]       = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customTerm, setCustomTerm] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setShowCustom(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const savedCodes  = new Set(courses.map(c => c.code));
  const suggestions = COURSE_POOL
    .filter(c => !savedCodes.has(c.code) && (
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.code.toLowerCase().includes(query.toLowerCase())
    ))
    .slice(0, 6);

  const pick = (course: LocalCourse) => {
    onAdd(course); setQuery(''); setOpen(false);
  };

  const addCustom = () => {
    const name = customName.trim();
    const code = customCode.trim().toUpperCase().replace(/\s+/g, '');
    if (!name || !code) return;
    onAdd({ name, code, term: customTerm.trim() || undefined });
    setCustomName(''); setCustomCode(''); setCustomTerm('');
    setShowCustom(false); setOpen(false); setQuery('');
  };

  return (
    <div>
      <div style={{ position: 'relative' }} ref={ref}>
        <input
          style={s.input}
          placeholder="Search by name or code…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setShowCustom(false); }}
          onFocus={() => setOpen(true)}
        />

        {open && (
          <div style={s.dropdown}>
            {suggestions.map(c => (
              <button key={c.code} style={s.dropItem} onMouseDown={() => pick(c)}>
                <span style={s.dropCode}>{c.code}</span>
                <span style={s.dropName}>{c.name}</span>
              </button>
            ))}

            {suggestions.length === 0 && query && !showCustom && (
              <div style={s.dropEmpty}>No matches for "{query}"</div>
            )}

            {!showCustom && (
              <button style={s.dropCustomBtn} onMouseDown={() => setShowCustom(true)}>
                ➕ Add custom course
              </button>
            )}

            {showCustom && (
              <div style={s.customForm}>
                <p style={s.customTitle}>Custom Course</p>
                <div style={s.row2}>
                  <div>
                    <label style={s.label}>Course Name *</label>
                    <input style={s.input} value={customName} onChange={e => setCustomName(e.target.value)} placeholder="e.g. Advanced ML" />
                  </div>
                  <div>
                    <label style={s.label}>Course Code *</label>
                    <input style={s.input} value={customCode} onChange={e => setCustomCode(e.target.value)} placeholder="e.g. CS601" />
                  </div>
                </div>
                <label style={s.label}>Term (optional)</label>
                <input style={{ ...s.input, marginBottom: 10 }} value={customTerm} onChange={e => setCustomTerm(e.target.value)} placeholder="e.g. Spring 2026" />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={s.addBtn} onMouseDown={addCustom} disabled={!customName.trim() || !customCode.trim()}>Add Course</button>
                  <button style={s.cancelBtn} onMouseDown={() => setShowCustom(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {courses.length > 0 ? (
        <div style={{ ...s.tagList, marginTop: 12 }}>
          {courses.map(c => (
            <span key={c.code} style={s.tag}>
              <span style={s.tagCode}>{c.code}</span>
              {c.name}
              <button style={s.tagX} onClick={() => onRemove(c.code)}>×</button>
            </span>
          ))}
        </div>
      ) : (
        <p style={s.hint}>🔍 Courses are the primary signal used to find students in the same class.</p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TopicSearch Component
═══════════════════════════════════════════════════════════ */
function TopicSearch({ topics, onAdd, onRemove }: {
  topics: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open,  setOpen]  = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const savedNames  = new Set(topics.map(t => t.toLowerCase()));
  const suggestions = TOPIC_POOL
    .filter(t => !savedNames.has(t.toLowerCase()) && t.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);

  const pick    = (name: string) => { onAdd(name); setQuery(''); setOpen(false); };
  const addFree = () => { const n = query.trim(); if (n) { onAdd(n); setQuery(''); setOpen(false); } };

  return (
    <div style={{ marginBottom: 16 }}>
      <label style={s.label}>Topics</label>
      <div style={{ position: 'relative' }} ref={ref}>
        <input
          style={s.input}
          placeholder="Search topics or type your own…"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFree(); } }}
        />

        {open && query.length > 0 && (
          <div style={s.dropdown}>
            {suggestions.map(t => (
              <button key={t} style={s.dropItem} onMouseDown={() => pick(t)}>
                <span style={s.dropName}>{t}</span>
              </button>
            ))}
            {!TOPIC_POOL.some(t => t.toLowerCase() === query.trim().toLowerCase()) && query.trim() && (
              <button style={s.dropCustomBtn} onMouseDown={addFree}>
                ➕ Add "{query.trim()}"
              </button>
            )}
          </div>
        )}
      </div>

      {topics.length > 0 ? (
        <div style={{ ...s.tagList, marginTop: 10 }}>
          {topics.map(t => (
            <span key={t} style={s.topicTag}>
              {t}
              <button style={{ ...s.tagX, color: '#16a34a' }} onClick={() => onRemove(t)}>×</button>
            </span>
          ))}
        </div>
      ) : (
        <p style={s.hint}>🧩 Topics help match you with partners studying the same subjects.</p>
      )}
    </div>
  );
}

/* ── Shared Components ───────────────────────────────────── */
function Card({ icon, title, subtitle, children }: {
  icon: string; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div style={s.card}>
      <div style={s.cardHeader}>
        <span style={s.cardIcon as any}>{icon}</span>
        <div><div style={s.cardTitle}>{title}</div><div style={s.cardSub}>{subtitle}</div></div>
      </div>
      <div style={s.cardBody}>{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={s.label}>{label}</label>
      {multiline
        ? <textarea style={{ ...s.input, minHeight: 70, resize: 'vertical' }} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
        : <input    style={s.input} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      }
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  page:         { minHeight: '100vh', background: '#fafafa', fontFamily: "'Nunito','Segoe UI',sans-serif", color: '#1a1a2e' },
  header:       { display: 'flex', alignItems: 'center', gap: 10, padding: '18px 40px', borderBottom: '1px solid #f0eef8', background: '#fff' },
  logoImg:      { width: 36, height: 36, objectFit: 'contain' },
  logoText:     { fontSize: 20, letterSpacing: '-0.3px' },
  logoHive:     { fontWeight: 800, color: '#1a1a2e' },
  logoMind:     { fontWeight: 400, color: '#1a1a2e' },
  main:         { maxWidth: 900, margin: '0 auto', padding: '40px 24px' },
  title:        { fontSize: 30, fontWeight: 800, margin: '0 0 8px' },
  progressBar:  { height: 4, background: '#e9e4fc', borderRadius: 4, marginBottom: 12, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#0891B2', borderRadius: 4, transition: 'width .4s' },
  subtitle:     { color: '#666', marginBottom: 28, fontSize: 14 },
  errorBanner:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13 },
  errorClose:   { background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: 18, fontWeight: 700 },
  grid:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 },
  col:          { display: 'flex', flexDirection: 'column', gap: 20 },
  card:         { background: '#fff', border: '1px solid #ede9fe', borderRadius: 14, boxShadow: '0 2px 8px rgba(124,58,237,.06)' },
  cardHeader:   { display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', borderBottom: '1px solid #f5f3ff' },
  cardIcon:     { width: 38, height: 38, background: 'linear-gradient(135deg,#fdf2f8,#f3e8ff)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: '1px solid #fce7f3', flexShrink: 0 },
  cardTitle:    { fontWeight: 700, fontSize: 15, color: '#1a1a2e' },
  cardSub:      { fontSize: 12, color: '#888', marginTop: 2 },
  cardBody:     { padding: '18px 20px' },
  label:        { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 6 },
  input:        { width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: '#fafafa', outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s' },
  row2:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 },
  dropdown:     { position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #ede9fe', borderRadius: 10, boxShadow: '0 8px 24px rgba(124,58,237,.12)', zIndex: 50, overflow: 'hidden' },
  dropItem:     { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid #f9f8ff', cursor: 'pointer', textAlign: 'left' },
  dropCode:     { fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#7c3aed', background: '#f3e8ff', padding: '2px 6px', borderRadius: 4, flexShrink: 0 },
  dropName:     { fontSize: 13, color: '#1a1a2e' },
  dropEmpty:    { padding: '10px 14px', color: '#888', fontSize: 13 },
  dropCustomBtn:{ display: 'block', width: '100%', padding: '10px 14px', background: '#fdf2f8', border: 'none', borderTop: '1px solid #fce7f3', color: '#be185d', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' },
  customForm:   { padding: '14px 14px 10px', borderTop: '1px solid #f5f3ff', background: '#fdfcff' },
  customTitle:  { fontWeight: 700, fontSize: 13, color: '#7c3aed', margin: '0 0 10px' },
  addBtn:       { padding: '8px 16px', background: 'transparent', border: '1.5px solid #be185d', color: '#be185d', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  cancelBtn:    { padding: '8px 14px', background: 'transparent', border: '1.5px solid #d1d5db', color: '#666', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  tagList:      { display: 'flex', flexWrap: 'wrap', gap: 8 },
  tag:          { display: 'flex', alignItems: 'center', gap: 6, background: '#fdf2f8', border: '1px solid #fce7f3', color: '#be185d', borderRadius: 20, fontSize: 12, fontWeight: 600, padding: '4px 10px' },
  topicTag:     { display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: 20, fontSize: 12, fontWeight: 600, padding: '4px 10px' },
  tagCode:      { fontFamily: 'monospace', fontSize: 10, background: '#fce7f3', padding: '1px 5px', borderRadius: 4, marginRight: 2 },
  tagX:         { background: 'none', border: 'none', color: '#be185d', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 },
  hint:         { fontSize: 12, color: '#94a3b8', marginTop: 10, lineHeight: 1.5 },
  actions:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 24, borderTop: '1px solid #f0eef8' },
  skipBtn:      { padding: '10px 22px', background: 'transparent', border: '1.5px solid #d1d5db', color: '#555', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  saveBtn:      { padding: '10px 28px', background: '#BE185D', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(190,24,93,.35)' },
};
