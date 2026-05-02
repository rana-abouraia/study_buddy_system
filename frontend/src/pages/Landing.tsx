import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import landingImage from '../assets/images/landing.png';
import styles from './Landing.module.css';

export default function Landing() {
  return (
    <div className={`${styles.page} page-enter`}>
      <Navbar />

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <div className={styles.badge}>
            <StarIcon />
            Smart Study Matching Platform
          </div>

          <h1 className={styles.heroTitle}>
            Find Your Perfect{' '}
            <span className={styles.gradient}>Study Partner</span>
          </h1>

          <p className={styles.heroSub}>
            Connect with fellow students who share your courses, availability,
            and study preferences. Make studying more effective and enjoyable
            with the right study buddy.
          </p>

          <div className={styles.heroBtns}>
            <Link to="/register" className="btn-primary">Get Started</Link>
            <a href="#how-it-works" className="btn-outline">Learn More</a>
          </div>

          <div className={styles.heroStats}>
            {HERO_STATS.map((item) => (
              <div key={item.title} className={styles.heroStatCard}>
                <div className={styles.heroStatIcon}>{item.icon}</div>
                <div>
                  <p className={styles.heroStatTitle}>{item.title}</p>
                  <p className={styles.heroStatDesc}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.heroImage}>
            <img
              src={landingImage}
              alt="Study group illustration"
              className={styles.heroIllustration}
            />
          </div>
        </div>
      </section>

      <section className={styles.how} id="how-it-works">
        <p className={styles.sectionLabel}>How It Works</p>
        <h2 className={styles.sectionTitle}>Get started in three simple steps</h2>
        <p className={styles.sectionSub}>
          Find your perfect study partner today.
        </p>

        <div className={styles.stepGrid}>
          {STEPS.map((s, i) => (
            <div key={i} className={styles.step}>
              <div className={styles.stepNum}>{i + 1}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.cta}>
        <h2>Ready to find your study partner?</h2>
        <p>Join thousands of students already using HiveMind.</p>
        <Link to="/register" className="btn-primary" style={{ fontSize: 16, padding: '14px 36px' }}>
          Create Free Account
        </Link>
      </section>

      <footer className={styles.footer}>
        © 2026 HiveMind · Built for students, by students.
      </footer>
    </div>
  );
}

const HERO_STATS = [
  {
    title: 'Subject Matching',
    desc: 'Smart course-based pairing for stronger study sessions.',
    icon: <SubjectIcon />,
  },
  {
    title: 'Session Matching',
    desc: 'Schedule study sessions with the right partners and times.',
    icon: <SessionIcon />,
  },
  {
    title: 'Notifications',
    desc: 'Instant alerts for new matches and upcoming sessions.',
    icon: <BellIcon />,
  },
];

const STEPS = [
  { title: 'Create Profile', desc: 'Add your courses, year, and university info.' },
  { title: 'Set Preferences', desc: 'Tell us how and when you like to study.' },
  { title: 'Get Matched', desc: 'Connect with your ideal study partner instantly.' },
];

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#7c3aed">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
function SubjectIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M4 6h16v2H4V6zm0 4h10v2H4v-2zm0 4h16v2H4v-2zm0 4h10v2H4v-2z" />
    </svg>
  );
}
function SessionIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  );
}
