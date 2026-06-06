import { Outlet } from 'react-router-dom';
import { AppNav } from './AppNav';
import styles from './AppNav.module.css';

/**
 * Layout wrapper for authenticated pages (shared nav + outlet)
 */
export function AuthedShell() {
  return (
    <div className={styles.shell}>
      <AppNav />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
