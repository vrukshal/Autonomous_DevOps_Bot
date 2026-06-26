import { Link } from 'react-router-dom';
import { LogoLink } from './Logo';
import styles from './MarketingFooter.module.css';

const FOOTER_SECTIONS = [
  {
    title: 'Product',
    links: [
      { to: '/#capabilities', label: 'Capabilities' },
      { to: '/#how-it-works', label: 'How it works' },
      { to: '/#architecture', label: 'Architecture' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { to: '/docs', label: 'Documentation' },
      { to: '/docs#setup', label: 'Setup guide' },
      { to: '/docs#webhooks', label: 'Webhooks' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/login', label: 'Sign in' },
      { to: '/dashboard', label: 'Dashboard' },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <LogoLink />
          <p className={styles.tagline}>
            CI incident monitoring with guardrailed AI triage for engineering teams.
          </p>
        </div>

        <div className={styles.columns}>
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title} className={styles.column}>
              <h3 className={styles.columnTitle}>{section.title}</h3>
              <ul className={styles.columnList}>
                {section.links.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className={styles.columnLink}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.bottomInner}>
          <span className={styles.copyright}>
            &copy; {new Date().getFullYear()} DevOps Bot
          </span>
          <span className={styles.muted}>Built for production engineering teams</span>
        </div>
      </div>
    </footer>
  );
}
