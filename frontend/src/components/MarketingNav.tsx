import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/config';
import { LogoLink } from './Logo';
import styles from './MarketingNav.module.css';

const NAV_LINKS = [
  { to: '/#capabilities', label: 'Product' },
  { to: '/#how-it-works', label: 'How it works' },
  { to: '/docs', label: 'Docs' },
];

export function MarketingNav() {
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleCta = () => navigate(user ? '/dashboard' : '/login');

  return (
    <header className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <LogoLink />

        <nav className={styles.links} aria-label="Main">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to} className={styles.link}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          {user ? (
            <button type="button" className={styles.cta} onClick={() => navigate('/dashboard')}>
              Dashboard
            </button>
          ) : (
            <>
              <button type="button" className={styles.signIn} onClick={() => navigate('/login')}>
                Sign in
              </button>
              <button type="button" className={styles.cta} onClick={handleCta}>
                Get started
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
