import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import landingImage from '../assets/images/landing.png';
import styles from './Landing.module.css';

export default function Landing() {
  return (
    <div className={styles.page}>
      <Navbar />

      <section className={styles.hero}>
        <div className={styles.heroContent}>
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
              <Link to="/register" className={styles.pinkBtn}>GET STARTED</Link>
              <a href="#how-it-works" className={styles.blueOutline}>Learn More</a>
            </div>

            <div className={styles.heroStats}>
              <div className={styles.heroStatItem}>
                <div className={styles.heroStatIcon}>
                  <SubjectIcon />
                </div>
                <span>Subject Matching</span>
              </div>
              <div className={styles.heroStatItem}>
                <div className={styles.heroStatIcon}>
                  <SessionIcon />
                </div>
                <span>Session Matching</span>
              </div>
              <div className={styles.heroStatItem}>
                <div className={styles.heroStatIcon}>
                  <BellIcon />
                </div>
                <span>Notifications</span>
              </div>
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
        </div>
      </section>

      <section className={styles.how} id="how-it-works">
        <p className={styles.sectionLabel}>How It Works</p>
        <h2 className={styles.sectionTitle}>Get started in three simple steps</h2>
        <p className={styles.sectionSub}>
          Find your perfect study partner and achieve your academic goals together.
        </p>

        <div className={styles.stepGrid}>
          <div className={styles.step}>
            <div className={styles.stepNum}>1</div>
            <h4>Create Your Profile</h4>
            <p>Sign up and tell us about your courses, study preferences, and availability. The more we know, the better we can match you.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>2</div>
            <h4>Get Matched</h4>
            <p>Find the perfect study partners for you based on compatibility, shared courses, and schedules.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNum}>3</div>
            <h4>Start Studying</h4>
            <p>Connect with your matches, schedule study sessions, and achieve your academic goals together.</p>
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.ctaContent}>
          <h2>Ready to find your study partner?</h2>
          <p>Join thousands of students already using HiveMind.</p>
          <Link to="/register" className={styles.ctaBtn}>
            Create Free Account
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p>© 2026 HiveMind · Built for students, by students.</p>
        </div>
      </footer>
    </div>
  );
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#BE185D">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function SubjectIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#BE185D" strokeWidth="1.5">
      <path d="M4 6h16v2H4V6zm0 4h10v2H4v-2zm0 4h16v2H4v-2zm0 4h10v2H4v-2z" />
    </svg>
  );
}

function SessionIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0891B2" strokeWidth="1.5">
      <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#BE185D" strokeWidth="1.5">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  );
}