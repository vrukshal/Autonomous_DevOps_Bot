import { ReactNode } from 'react';
import { MarketingNav } from './MarketingNav';
import { MarketingFooter } from './MarketingFooter';
import styles from './MarketingLayout.module.css';

interface MarketingLayoutProps {
  children: ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className={styles.shell}>
      <MarketingNav />
      <main className={styles.main}>{children}</main>
      <MarketingFooter />
    </div>
  );
}
