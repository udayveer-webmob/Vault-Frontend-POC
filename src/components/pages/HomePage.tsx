import type { Vault } from '@/types';
import styles from './HomePage.module.css';

interface HomePageProps {
  vaults: Vault[];
}

export function HomePage({ vaults }: HomePageProps) {
  const totalTVL = vaults.reduce((sum, vault) => {
    return sum + parseFloat(vault.totalAssets) / 1e18;
  }, 0);

  const activeStrategies = vaults.filter(
    (v) => v.strategy !== '0x0000000000000000000000000000000000000000'
  ).length;

  return (
    <>
      <div className={styles.hero}>
        <h1>Managed Vault System</h1>
        <p className={styles.heroSubtitle}>
          Decentralized vaults with operator-controlled strategies for optimal yield generation
        </p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Vaults</div>
          <div className={styles.statValue}>{vaults.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total TVL</div>
          <div className={styles.statValue}>${totalTVL.toFixed(2)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active Strategies</div>
          <div className={styles.statValue}>{activeStrategies}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Network</div>
          <div className={styles.statValue} style={{ fontSize: '1.2rem' }}>
            BSC Testnet
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>All Vaults</h2>
        </div>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Vault Name</th>
                <th>Symbol</th>
                <th>Total Assets</th>
                <th>Total Supply</th>
                <th>Strategy</th>
              </tr>
            </thead>
            <tbody>
              {vaults.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyStateIcon}>📦</div>
                      <div className={styles.emptyStateText}>No vaults deployed yet</div>
                    </div>
                  </td>
                </tr>
              ) : (
                vaults.map((vault) => (
                  <tr key={vault.address}>
                    <td>{vault.name}</td>
                    <td>{vault.symbol}</td>
                    <td>{(parseFloat(vault.totalAssets) / 1e18).toFixed(2)} USDC</td>
                    <td>{(parseFloat(vault.totalSupply) / 1e18).toFixed(4)}</td>
                    <td>
                      {vault.strategy === '0x0000000000000000000000000000000000000000' ? (
                        <span className={`${styles.badge} ${styles.warning}`}>No Strategy</span>
                      ) : (
                        <span className={styles.badge}>Active</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
