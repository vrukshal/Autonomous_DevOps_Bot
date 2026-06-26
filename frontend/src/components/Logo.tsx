import { Link } from 'react-router-dom';
import styles from './Logo.module.css';

interface LogoProps {
  size?: 'sm' | 'md';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  return (
    <span className={`${styles.logo} ${styles[size]} ${className}`}>
      <span className={styles.mark} aria-hidden />
      {showText && <span className={styles.text}>DevOps Bot</span>}
    </span>
  );
}

export function LogoLink({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className={styles.link}>
      <Logo />
    </Link>
  );
}
