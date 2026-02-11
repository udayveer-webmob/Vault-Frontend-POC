import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { formatAddress } from '@/utils/helpers';
import type { PageType } from '@/types';
import styles from './Navigation.module.css';

interface NavigationProps {
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

export function Navigation({ currentPage, onPageChange }: NavigationProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      const injectedConnector = connectors.find((c) => c.id === 'injected');
      if (injectedConnector) {
        connect({ connector: injectedConnector });
      }
    }
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>⚡</div>
          <span>VAULT.SYS</span>
        </div>
        <div className={styles.navTabs}>
          <button
            className={`${styles.navTab} ${currentPage === 'home' ? styles.active : ''}`}
            onClick={() => onPageChange('home')}
          >
            Home
          </button>
          <button
            className={`${styles.navTab} ${currentPage === 'user' ? styles.active : ''}`}
            onClick={() => onPageChange('user')}
          >
            User
          </button>
          <button
            className={`${styles.navTab} ${currentPage === 'admin' ? styles.active : ''}`}
            onClick={() => onPageChange('admin')}
          >
            Admin
          </button>
          <button
            className={`${styles.navTab} ${currentPage === 'operator' ? styles.active : ''}`}
            onClick={() => onPageChange('operator')}
          >
            Operator
          </button>
        </div>
        <button
          className={`${styles.walletButton} ${isConnected ? styles.connected : ''}`}
          onClick={handleConnect}
        >
          {isConnected && address ? formatAddress(address) : 'Connect Wallet'}
        </button>
      </div>
    </nav>
  );
}
