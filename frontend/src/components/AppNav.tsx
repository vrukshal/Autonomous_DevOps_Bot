import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { Logo } from './Logo';
import styles from './AppNav.module.css';

function navClass(isActive: boolean) {
  return `${styles.link} ${isActive ? styles.active : ''}`.trim();
}

/**
 * Primary navigation for signed-in app shell
 */
export function AppNav() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <nav className={styles.nav}>
      <NavLink to="/dashboard" className={styles.logo}>
        <Logo size="small" showText />
      </NavLink>
      <div className={styles.links}>
        <NavLink to="/dashboard" className={({ isActive }) => navClass(isActive)}>
          Dashboard
        </NavLink>
        <NavLink to="/repos" className={({ isActive }) => navClass(isActive)}>
          Repos
        </NavLink>
        <NavLink to="/tracked-repos" className={({ isActive }) => navClass(isActive)}>
          Tracked
        </NavLink>
        <NavLink to="/incidents" className={({ isActive }) => navClass(isActive)}>
          Incidents
        </NavLink>
        <NavLink to="/integrations" className={({ isActive }) => navClass(isActive)}>
          Integrations
        </NavLink>
      </div>
      <button type="button" className={styles.signOut} onClick={handleSignOut}>
        Sign out
      </button>
    </nav>
  );
}
