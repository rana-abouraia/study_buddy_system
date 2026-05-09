import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, gql } from '@apollo/client';

/* ── GraphQL ─────────────────────────────────────────────── */
const UPDATE_PREFERENCES = gql`
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

/* ── Option types ────────────────────────────────────────── */
type Pace   = 'SLOW' | 'MODERATE' | 'FAST';
type Mode   = 'ONLINE' | 'IN_PERSON' | 'BOTH';
type Size   = 'ONE_ON_ONE' | 'SMALL' | 'LARGE';
type Style  = 'WRITING' | 'DISCUSSION' | 'LISTENING' | 'QUIET';
type Time   = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
type Length = '30 minutes' | '1 hour' | '2 hours' | '3+ hours';

/* ═══════════════════════════════════════════════════════════ */
export default function StudyPreferences() {
  const navigate = useNavigate();
  const [updatePreferences, { loading }] = useMutation(UPDATE_PREFERENCES);

  const [pace,    setPace]    = useState<Pace   | null>(null);
  const [mode,    setMode]    = useState<Mode   | null>(null);
  const [size,    setSize]    = useState<Size   | null>(null);
  const [styles,  setStyles]  = useState<Set<Style>>(new Set());
  const [times,   setTimes]   = useState<Set<Time>>(new Set());
  const [length,  setLength]  = useState<Length | null>(null);
  const [error,   setError]   = useState('');

  const toggleStyle = (s: Style) =>
    setStyles(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });

  const toggleTime = (t: Time) =>
    setTimes(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });

  const canSave = pace && mode && size && styles.size > 0 && times.size > 0;

  const handleSave = async () => {
    if (!pace || !mode || !size) { setError('Please fill in all required fields.'); return; }
    if (styles.size === 0)       { setError('Please choose at least one study style.');   return; }
    if (times.size === 0)        { setError('Please choose at least one preferred time.'); return; }

    try {
      await updatePreferences({
        variables: {
          input: {
            studyPace:      pace,
            studyMode:      mode,
            groupSize:      size,
            studyStyles:    Array.from(styles),
            preferredTimes: Array.from(times),
            sessionLength:  length ?? null,
          },
        },
      });
      navigate('/dashboard');
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <img src="/logo.png" alt="" style={s.logoImg} onError={e => (e.currentTarget.style.display = 'none')} />
        <span style={s.logoText}><span style={s.logoHive}>Hive</span>Mind</span>
      </header>

      <main style={s.main}>
        <h1 style={s.title}>Set Your Study Preferences</h1>
        <div style={s.progressBar}><div style={{ ...s.progressFill, width: '100%' }} /></div>
        <p style={s.subtitle}>Tell us how you like to study so we can find the best matches for you.</p>

        {error && (
          <div style={s.errorBanner}>
            ⚠️ {error}
            <button style={s.errorClose} onClick={() => setError('')}>×</button>
          </div>
        )}

        {/* ── Study Pace ─────────────────────────────────── */}
        <Section icon="🐢" title="Study Pace" subtitle="How fast do you prefer to study?" required>
          <div style={s.grid3}>
            <OptionCard emoji="🐢" label="Slow & Steady"  desc="Take time to understand concepts deeply"    selected={pace === 'SLOW'}     onSelect={() => setPace('SLOW')}     />
            <OptionCard emoji="🚶" label="Moderate"        desc="Balanced approach to learning"              selected={pace === 'MODERATE'} onSelect={() => setPace('MODERATE')} />
            <OptionCard emoji="🚀" label="Fast Paced"      desc="Covers materials quickly and efficiently"   selected={pace === 'FAST'}     onSelect={() => setPace('FAST')}     />
          </div>
        </Section>

        {/* ── Study Mode ─────────────────────────────────── */}
        <Section icon="📍" title="Study Mode" subtitle="Where do you prefer to study?" required>
          <div style={s.grid3}>
            <OptionCard emoji="💻" label="Online"     desc="Study remotely via video calls"      selected={mode === 'ONLINE'}    onSelect={() => setMode('ONLINE')}    />
            <OptionCard emoji="🏫" label="In-person"  desc="Meet in a library or campus"         selected={mode === 'IN_PERSON'} onSelect={() => setMode('IN_PERSON')} />
            <OptionCard emoji="🔄" label="Both"       desc="Flexible with either option"         selected={mode === 'BOTH'}      onSelect={() => setMode('BOTH')}      />
          </div>
        </Section>

        {/* ── Group Size ─────────────────────────────────── */}
        <Section icon="👥" title="Preferred Group Size" subtitle="How many people do you like to study with?" required>
          <div style={s.grid3}>
            <OptionCard emoji="👤"       label="One-on-One"   desc="Just you and one study partner"          selected={size === 'ONE_ON_ONE'} onSelect={() => setSize('ONE_ON_ONE')} />
            <OptionCard emoji="👥"       label="Small Group"  desc="3-4 people for focused study"            selected={size === 'SMALL'}      onSelect={() => setSize('SMALL')}      />
            <OptionCard emoji="👨‍👩‍👧‍👦" label="Large Group"  desc="5+ people for collaborative learning"    selected={size === 'LARGE'}      onSelect={() => setSize('LARGE')}      />
          </div>
        </Section>

        {/* ── Study Style ────────────────────────────────── */}
        <Section icon="🎯" title="Study Style" subtitle="How do you like to study? (Select all that apply)" required>
          <div style={s.grid2}>
            <StyleCard emoji="✏️" label="Writing Notes"  desc="Learn by writing notes"               selected={styles.has('WRITING')}    onSelect={() => toggleStyle('WRITING')}    />
            <StyleCard emoji="💬" label="Discussion"     desc="Learn through active conversation"     selected={styles.has('DISCUSSION')} onSelect={() => toggleStyle('DISCUSSION')} />
            <StyleCard emoji="🎧" label="Listening"      desc="Learn by listening and observing"      selected={styles.has('LISTENING')}  onSelect={() => toggleStyle('LISTENING')}  />
            <StyleCard emoji="🤫" label="Quiet Focus"    desc="Focus in silence with minimal talk"    selected={styles.has('QUIET')}      onSelect={() => toggleStyle('QUIET')}      />
          </div>
        </Section>

        {/* ── Preferred Times ────────────────────────────── */}
        <Section icon="🕐" title="Preferred Study Times" subtitle="When do you usually study? (Select all that apply)" required>
          <div style={s.grid4}>
            <TimeCard emoji="🌅" label="Morning"    sub="6am – 12pm"  selected={times.has('MORNING')}   onSelect={() => toggleTime('MORNING')}   />
            <TimeCard emoji="☀️" label="Afternoon"  sub="12pm – 5pm"  selected={times.has('AFTERNOON')} onSelect={() => toggleTime('AFTERNOON')} />
            <TimeCard emoji="🌆" label="Evening"    sub="5pm – 10pm"  selected={times.has('EVENING')}   onSelect={() => toggleTime('EVENING')}   />
            <TimeCard emoji="🌙" label="Night"      sub="10pm – 2am"  selected={times.has('NIGHT')}     onSelect={() => toggleTime('NIGHT')}     />
          </div>
        </Section>

        {/* ── Session Length ─────────────────────────────── */}
        <Section icon="⏱️" title="Session Length" subtitle="How long are your typical study sessions? (optional)">
          <div style={s.grid4}>
            {(['30 minutes', '1 hour', '2 hours', '3+ hours'] as Length[]).map(l => (
              <button
                key={l}
                style={{ ...s.lengthBtn, ...(length === l ? s.lengthBtnSelected : {}) }}
                onClick={() => setLength(prev => prev === l ? null : l)}
              >
                {l}
              </button>
            ))}
          </div>
        </Section>

        {/* ── Actions ────────────────────────────────────── */}
        <div style={s.actions}>
          <button style={s.backBtn} onClick={() => navigate('/onboarding/profile')}>← Back</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {!canSave && <span style={s.requiredNote}>* Fill required sections to continue</span>}
            <button
              style={{ ...s.saveBtn, opacity: loading ? 0.7 : 1 }}
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? 'Saving…' : 'Save Preferences & Continue →'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Section wrapper ─────────────────────────────────────── */
function Section({ icon, title, subtitle, required, children }: {
  icon: string; title: string; subtitle: string;
  required?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={s.section}>
      <div style={s.sectionHeader}>
        <span style={s.sectionIcon as any}>{icon}</span>
        <div>
          <div style={s.sectionTitle}>
            {title}
            {required && <span style={s.requiredStar}> *</span>}
          </div>
          <div style={s.sectionSub}>{subtitle}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ── Single-select option card ───────────────────────────── */
function OptionCard({ emoji, label, desc, selected, onSelect }: {
  emoji: string; label: string; desc: string;
  selected: boolean; onSelect: () => void;
}) {
  return (
    <button style={{ ...s.optCard, ...(selected ? s.optCardSel : {}) }} onClick={onSelect}>
      <span style={s.optEmoji}>{emoji}</span>
      <div style={{ ...s.optLabel, ...(selected ? { color: '#be185d' } : {}) }}>{label}</div>
      <div style={s.optDesc}>{desc}</div>
    </button>
  );
}

/* ── Multi-select style card ─────────────────────────────── */
function StyleCard({ emoji, label, desc, selected, onSelect }: {
  emoji: string; label: string; desc: string;
  selected: boolean; onSelect: () => void;
}) {
  return (
    <button style={{ ...s.styleCard, ...(selected ? s.styleCardSel : {}) }} onClick={onSelect}>
      <span style={s.styleEmoji}>{emoji}</span>
      <div style={s.styleInfo}>
        <div style={{ ...s.styleLabel, ...(selected ? { color: '#be185d' } : {}) }}>{label}</div>
        <div style={s.styleDesc}>{desc}</div>
      </div>
      {selected && <span style={s.checkmark}>✓</span>}
    </button>
  );
}

/* ── Time card ───────────────────────────────────────────── */
function TimeCard({ emoji, label, sub, selected, onSelect }: {
  emoji: string; label: string; sub: string;
  selected: boolean; onSelect: () => void;
}) {
  return (
    <button style={{ ...s.timeCard, ...(selected ? s.timeCardSel : {}) }} onClick={onSelect}>
      <span style={s.timeEmoji}>{emoji}</span>
      <div style={{ ...s.timeLabel, ...(selected ? { color: '#be185d' } : {}) }}>{label}</div>
      <div style={s.timeSub}>{sub}</div>
      {selected && <span style={s.checkmark}>✓</span>}
    </button>
  );
}

/* ── Styles ──────────────────────────────────────────────── */
const s: Record<string, React.CSSProperties> = {
  page:           { minHeight: '100vh', background: '#fafafa', fontFamily: "'Nunito','Segoe UI',sans-serif", color: '#1a1a2e' },
  header:         { display: 'flex', alignItems: 'center', gap: 10, padding: '18px 40px', borderBottom: '1px solid #f0eef8', background: '#fff' },
  logoImg:        { width: 36, height: 36, objectFit: 'contain' },
  logoText:       { fontSize: 20, fontWeight: 700, letterSpacing: '-0.3px' },
  logoHive:       { color: '#e84393' },
  main:           { maxWidth: 820, margin: '0 auto', padding: '40px 24px 60px' },
  title:          { fontSize: 30, fontWeight: 800, margin: '0 0 8px' },
  progressBar:    { height: 4, background: '#e9e4fc', borderRadius: 4, marginBottom: 12, overflow: 'hidden' },
  progressFill:   { height: '100%', background: 'linear-gradient(90deg,#e84393,#7c3aed)', borderRadius: 4 },
  subtitle:       { color: '#666', marginBottom: 28, fontSize: 14 },
  errorBanner:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13 },
  errorClose:     { background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: 18, fontWeight: 700 },

  section:        { background: '#fff', border: '1px solid #ede9fe', borderRadius: 14, padding: '20px 22px', marginBottom: 20, boxShadow: '0 2px 8px rgba(124,58,237,.06)' },
  sectionHeader:  { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 },
  sectionIcon:    { width: 36, height: 36, background: 'linear-gradient(135deg,#fdf2f8,#f3e8ff)', border: '1px solid #fce7f3', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  sectionTitle:   { fontWeight: 700, fontSize: 15 },
  sectionSub:     { fontSize: 12, color: '#888', marginTop: 2 },
  requiredStar:   { color: '#e84393' },

  grid3:          { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 },
  grid2:          { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 },
  grid4:          { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 },

  // Single-select option
  optCard:        { border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '18px 14px', background: '#fafafa', cursor: 'pointer', textAlign: 'center', transition: 'all .2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  optCardSel:     { border: '1.5px solid #e84393', background: '#fdf2f8', boxShadow: '0 0 0 3px rgba(232,67,147,.1)' },
  optEmoji:       { fontSize: 32, marginBottom: 4 },
  optLabel:       { fontWeight: 700, fontSize: 14, color: '#1a1a2e' },
  optDesc:        { fontSize: 12, color: '#888', lineHeight: 1.4 },

  // Multi-select style
  styleCard:      { display: 'flex', alignItems: 'center', gap: 12, border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', background: '#fafafa', cursor: 'pointer', textAlign: 'left', transition: 'all .2s', position: 'relative' },
  styleCardSel:   { border: '1.5px solid #e84393', background: '#fdf2f8', boxShadow: '0 0 0 3px rgba(232,67,147,.1)' },
  styleEmoji:     { fontSize: 22, flexShrink: 0 },
  styleInfo:      { flex: 1 },
  styleLabel:     { fontWeight: 700, fontSize: 13, color: '#1a1a2e' },
  styleDesc:      { fontSize: 12, color: '#888', marginTop: 2 },

  // Time card
  timeCard:       { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '16px 10px', background: '#fafafa', cursor: 'pointer', transition: 'all .2s', position: 'relative' },
  timeCardSel:    { border: '1.5px solid #e84393', background: '#fdf2f8', boxShadow: '0 0 0 3px rgba(232,67,147,.1)' },
  timeEmoji:      { fontSize: 26 },
  timeLabel:      { fontWeight: 700, fontSize: 13, color: '#1a1a2e' },
  timeSub:        { fontSize: 11, color: '#94a3b8' },
  checkmark:      { position: 'absolute', top: 8, right: 10, fontSize: 12, color: '#e84393', fontWeight: 800 },

  // Session length
  lengthBtn:      { padding: '12px 8px', border: '1.5px solid #e5e7eb', borderRadius: 10, background: '#fafafa', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#555', transition: 'all .2s' },
  lengthBtnSelected: { border: '1.5px solid #e84393', background: '#fdf2f8', color: '#be185d', boxShadow: '0 0 0 3px rgba(232,67,147,.1)' },

  actions:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 24, borderTop: '1px solid #f0eef8' },
  backBtn:        { padding: '10px 22px', background: 'transparent', border: '1.5px solid #d1d5db', color: '#555', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  saveBtn:        { padding: '10px 28px', background: 'linear-gradient(135deg,#e84393,#c026d3)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(232,67,147,.35)', transition: 'opacity .2s' },
  requiredNote:   { fontSize: 12, color: '#94a3b8' },
};