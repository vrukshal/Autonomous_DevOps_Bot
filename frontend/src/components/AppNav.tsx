import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { LogoLink } from './Logo';
import styles from './AppNav.module.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/repos', label: 'Repos' },
  { to: '/tracked-repos', label: 'Tracked' },
  { to: '/incidents', label: 'Incidents' },
  { to: '/integrations', label: 'Integrations' },
];

function linkClass(isActive: boolean) {
  return isActive ? `${styles.link} ${styles.active}` : styles.link;
}

export function AppNav() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <header className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <LogoLink to="/dashboard" />

        <nav className={styles.links} aria-label="App navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => linkClass(isActive)}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button type="button" className={styles.signOut} onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}
