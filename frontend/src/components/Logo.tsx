import styles from './Logo.module.css';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

/**
 * Logo component for Autonomous DevOps Bot
 */
export function Logo({ size = 'medium', showText = true }: LogoProps) {
  return (
    <div className={styles.logoContainer}>
      <img 
        src="/logo.png" 
        alt="Autonomous DevOps Bot Logo" 
        className={`${styles.logo} ${styles[size]}`}
        onError={(e) => {
          // Fallback if logo image doesn't exist
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          if (target.nextSibling) {
            (target.nextSibling as HTMLElement).style.display = 'block';
          }
        }}
      />
      <div className={styles.logoFallback} style={{ display: 'none' }}>
        <div className={styles.robotIcon}>🤖</div>
      </div>
      {showText && (
        <div className={styles.logoText}>
          <span className={styles.logoTextAutonomous}>Autonomous</span>
          <span className={styles.logoTextDevOps}>DevOps Bot</span>
        </div>
      )}
    </div>
  );
}
