'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { parseUnits, keccak256, toBytes } from 'viem'
import { CONTRACTS, VAULT_FACTORY_ABI, VAULT_ABI, STRATEGY_ABI } from '@/config/contracts'
import { formatAddress, copyToClipboard } from '@/utils/helpers'
import type { Vault } from '@/types'
import styles from './AdminPage.module.css'

interface AdminPageProps {
  vaults: Vault[]
  onVaultsUpdate: () => void
  onToast: (message: string, type: 'success' | 'error' | 'warning') => void
}

interface VaultDetails extends Vault {
  whitelistedTokens: `0x${string}`[]
  strategyTargets: `0x${string}`[]
}

export function AdminPage({ vaults, onVaultsUpdate, onToast }: AdminPageProps) {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [selectedVault, setSelectedVault] = useState<Vault | null>(null)
  const [vaultDetails, setVaultDetails] = useState<VaultDetails | null>(null)
  const [loading, setLoading] = useState(false)

  // Create Vault Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [vaultName, setVaultName] = useState('')
  const [vaultSymbol, setVaultSymbol] = useState('')
  const [vaultAsset, setVaultAsset] = useState('')
  const [performanceFee, setPerformanceFee] = useState('2000') // 20%
  const [exitFee, setExitFee] = useState('100') // 1%
  const [feeRecipient, setFeeRecipient] = useState('')

  // Whitelist Token Modal State
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [tokenAddress, setTokenAddress] = useState('')

  // Strategy Modal State
  const [showStrategyModal, setShowStrategyModal] = useState(false)
  const [strategyAddress, setStrategyAddress] = useState('')

  // Whitelist Target Modal State
  const [showTargetModal, setShowTargetModal] = useState(false)
  const [targetAddress, setTargetAddress] = useState('')

  // Whitelist Function Modal State
  const [showFunctionModal, setShowFunctionModal] = useState(false)
  const [functionTarget, setFunctionTarget] = useState('')
  const [functionSelector, setFunctionSelector] = useState('')

  // Remove Token Modal State
  const [showRemoveTokenModal, setShowRemoveTokenModal] = useState(false)
  const [tokenToRemove, setTokenToRemove] = useState('')

  // Load vault details when selected
  useEffect(() => {
    async function loadVaultDetails() {
      if (!selectedVault || !publicClient) return

      try {
        const [tokens, strategy] = await Promise.all([
          publicClient.readContract({
            address: selectedVault.address,
            abi: VAULT_ABI,
            functionName: 'getWhitelistedTokens',
          }),
          publicClient.readContract({
            address: selectedVault.address,
            abi: VAULT_ABI,
            functionName: 'strategy',
          }),
        ])

        let targets: `0x${string}`[] = []
        if (strategy && strategy !== '0x0000000000000000000000000000000000000000') {
          try {
            targets = [...await publicClient.readContract({
              address: strategy as `0x${string}`,
              abi: STRATEGY_ABI,
              functionName: 'getWhitelistedTargets',
            })]
          } catch (error) {
            console.error('Error loading strategy targets:', error)
          }
        }

        setVaultDetails({
          ...selectedVault,
          whitelistedTokens: tokens as `0x${string}`[],
          strategyTargets: targets,
        })
      } catch (error) {
        console.error('Error loading vault details:', error)
        onToast('Failed to load vault details', 'error')
      }
    }

    loadVaultDetails()
  }, [selectedVault, publicClient, onToast])

  // Create Vault Handler
  const handleCreateVault = async () => {
    if (!address || !walletClient || !publicClient) {
      onToast('Please connect your wallet', 'error')
      return
    }

    if (!vaultName || !vaultSymbol || !feeRecipient || !vaultAsset) {
      onToast('Please fill all required fields', 'error')
      return
    }

    setLoading(true)
    try {
      const count = await publicClient.readContract({
        address: CONTRACTS.vaultFactory,
        abi: VAULT_FACTORY_ABI,
        functionName: 'getVaultCount',
      })
      // Generate random salt
      const salt = keccak256(toBytes(`Vault ${count}`))
      console.log("SALT : ",salt)

      const params = {
        asset: vaultAsset as `0x${string}`,
        priceOracle: CONTRACTS.priceOracle,
        name: vaultName,
        symbol: vaultSymbol,
        performanceFeeBps: BigInt(performanceFee),
        exitFeeBps: BigInt(exitFee),
        feeRecipient: feeRecipient as `0x${string}`,
        decimalOffset: BigInt(0),
      }

      const hash = await walletClient.writeContract({
        address: CONTRACTS.vaultFactory,
        abi: VAULT_FACTORY_ABI,
        functionName: 'createVaultProxy2',
        args: [salt, params],
        account: address,
      })

      onToast('Vault creation transaction submitted...', 'success')
      await publicClient.waitForTransactionReceipt({ hash })

      onToast('Vault created successfully!', 'success')
      setShowCreateModal(false)
      setVaultName('')
      setVaultSymbol('')
      setFeeRecipient('')
      setVaultAsset('')
      onVaultsUpdate()
    } catch (error: any) {
      console.error('Create vault error:', error)
      onToast('Vault creation failed: ' + (error.message || 'Unknown error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  // Whitelist Token Handler
  const handleWhitelistToken = async () => {
    if (!address || !walletClient || !publicClient || !selectedVault) {
      onToast('Please connect wallet and select a vault', 'error')
      return
    }

    if (!tokenAddress || tokenAddress.length !== 42) {
      onToast('Please enter a valid token address', 'error')
      return
    }

    setLoading(true)
    try {
      const hash = await walletClient.writeContract({
        address: selectedVault.address,
        abi: VAULT_ABI,
        functionName: 'setTokenWhitelist',
        args: [tokenAddress as `0x${string}`, true],
        account: address,
      })

      onToast('Transaction submitted...', 'success')
      await publicClient.waitForTransactionReceipt({ hash })

      onToast('Token whitelisted successfully!', 'success')
      setShowTokenModal(false)
      setTokenAddress('')
      
      // Reload vault details
      if (selectedVault) {
        const updatedVault = vaults.find(v => v.address === selectedVault.address)
        if (updatedVault) setSelectedVault(updatedVault)
      }
    } catch (error: any) {
      console.error('Whitelist token error:', error)
      onToast('Failed to whitelist token: ' + (error.message || 'Unknown error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  // Remove Token Handler
  const handleRemoveToken = async () => {
    if (!address || !walletClient || !publicClient || !selectedVault) {
      onToast('Please connect wallet and select a vault', 'error')
      return
    }

    if (!tokenToRemove) {
      onToast('Please select a token to remove', 'error')
      return
    }

    setLoading(true)
    try {
      const hash = await walletClient.writeContract({
        address: selectedVault.address,
        abi: VAULT_ABI,
        functionName: 'setTokenWhitelist',
        args: [tokenToRemove as `0x${string}`, false],
        account: address,
      })

      onToast('Transaction submitted...', 'success')
      await publicClient.waitForTransactionReceipt({ hash })

      onToast('Token removed successfully!', 'success')
      setShowRemoveTokenModal(false)
      setTokenToRemove('')
      
      // Reload vault details
      if (selectedVault) {
        const updatedVault = vaults.find(v => v.address === selectedVault.address)
        if (updatedVault) setSelectedVault(updatedVault)
      }
    } catch (error: any) {
      console.error('Remove token error:', error)
      onToast('Failed to remove token: ' + (error.message || 'Unknown error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  // Set Strategy Handler
  const handleSetStrategy = async () => {
    if (!address || !walletClient || !publicClient || !selectedVault) {
      onToast('Please connect wallet and select a vault', 'error')
      return
    }

    if (!strategyAddress || strategyAddress.length !== 42) {
      onToast('Please enter a valid strategy address', 'error')
      return
    }

    setLoading(true)
    try {
      const hash = await walletClient.writeContract({
        address: selectedVault.address,
        abi: VAULT_ABI,
        functionName: 'setStrategy',
        args: [strategyAddress as `0x${string}`],
        account: address,
      })

      onToast('Transaction submitted...', 'success')
      await publicClient.waitForTransactionReceipt({ hash })

      onToast('Strategy set successfully!', 'success')
      setShowStrategyModal(false)
      setStrategyAddress('')
      onVaultsUpdate()
    } catch (error: any) {
      console.error('Set strategy error:', error)
      onToast('Failed to set strategy: ' + (error.message || 'Unknown error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  // Whitelist Target Handler
  const handleWhitelistTarget = async () => {
    if (!address || !walletClient || !publicClient || !selectedVault) {
      onToast('Please connect wallet and select a vault', 'error')
      return
    }

    if (!selectedVault.strategy || selectedVault.strategy === '0x0000000000000000000000000000000000000000') {
      onToast('Please set a strategy first', 'error')
      return
    }

    if (!targetAddress || targetAddress.length !== 42) {
      onToast('Please enter a valid target address', 'error')
      return
    }

    setLoading(true)
    try {
      const hash = await walletClient.writeContract({
        address: selectedVault.strategy,
        abi: STRATEGY_ABI,
        functionName: 'setTargetWhitelist',
        args: [targetAddress as `0x${string}`, true],
        account: address,
      })

      onToast('Transaction submitted...', 'success')
      await publicClient.waitForTransactionReceipt({ hash })

      onToast('Target whitelisted successfully!', 'success')
      setShowTargetModal(false)
      setTargetAddress('')
      
      // Reload vault details
      if (selectedVault) {
        const updatedVault = vaults.find(v => v.address === selectedVault.address)
        if (updatedVault) setSelectedVault(updatedVault)
      }
    } catch (error: any) {
      console.error('Whitelist target error:', error)
      onToast('Failed to whitelist target: ' + (error.message || 'Unknown error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  // Whitelist Function Handler
  const handleWhitelistFunction = async () => {
    if (!address || !walletClient || !publicClient || !selectedVault) {
      onToast('Please connect wallet and select a vault', 'error')
      return
    }

    if (!selectedVault.strategy || selectedVault.strategy === '0x0000000000000000000000000000000000000000') {
      onToast('Please set a strategy first', 'error')
      return
    }

    if (!functionTarget || functionTarget.length !== 42) {
      onToast('Please enter a valid target address', 'error')
      return
    }

    if (!functionSelector || functionSelector.length !== 10) {
      onToast('Please enter a valid function selector (0x12345678)', 'error')
      return
    }

    setLoading(true)
    try {
      const hash = await walletClient.writeContract({
        address: selectedVault.strategy,
        abi: STRATEGY_ABI,
        functionName: 'setFunctionWhitelist',
        args: [functionTarget as `0x${string}`, functionSelector as `0x${string}`, true],
        account: address,
      })

      onToast('Transaction submitted...', 'success')
      await publicClient.waitForTransactionReceipt({ hash })

      onToast('Function whitelisted successfully!', 'success')
      setShowFunctionModal(false)
      setFunctionTarget('')
      setFunctionSelector('')
    } catch (error: any) {
      console.error('Whitelist function error:', error)
      onToast('Failed to whitelist function: ' + (error.message || 'Unknown error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyAddress = (addr: string) => {
    copyToClipboard(addr)
    onToast('Address copied!', 'success')
  }

  return (
    <>
      <div className={styles.hero}>
        <h1>Admin Dashboard</h1>
        <p className={styles.heroSubtitle}>Manage vaults, strategies, and configurations</p>
      </div>

      {/* Create Vault Section */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Create New Vault</h2>
        </div>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => setShowCreateModal(true)}
          disabled={!address}
        >
          + Create Vault
        </button>
      </div>

      {/* Vault List */}
      <div className={styles.grid}>
        {vaults.map((vault) => (
          <div key={vault.address} className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>{vault.name}</h3>
              <span className={styles.badge}>{vault.symbol}</span>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Address</span>
                <span className={styles.address}>
                  <span className={styles.addressText}>{formatAddress(vault.address)}</span>
                  <button className={styles.copyBtn} onClick={() => handleCopyAddress(vault.address)}>
                    📋
                  </button>
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Total Assets</span>
                <span className={styles.infoValue}>
                  {(parseFloat(vault.totalAssets) / 1e6).toFixed(2)} USDC
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Strategy</span>
                <span className={styles.infoValue}>
                  {vault.strategy === '0x0000000000000000000000000000000000000000'
                    ? 'Not Set'
                    : formatAddress(vault.strategy)}
                </span>
              </div>
            </div>

            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              style={{ width: '100%' }}
              onClick={() => setSelectedVault(vault)}
              disabled={!address}
            >
              Manage Vault
            </button>
          </div>
        ))}
      </div>

      {/* Vault Details Modal */}
      {selectedVault && (
        <div className={styles.modalOverlay} onClick={() => setSelectedVault(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Manage {selectedVault.name}</h2>
              <button className={styles.modalClose} onClick={() => setSelectedVault(null)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* Vault Info */}
              <div className={styles.section}>
                <h3>Vault Information</h3>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Address</span>
                  <span className={styles.address}>
                    <span className={styles.addressText}>{formatAddress(selectedVault.address)}</span>
                    <button className={styles.copyBtn} onClick={() => handleCopyAddress(selectedVault.address)}>
                      📋
                    </button>
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Total Assets</span>
                  <span className={styles.infoValue}>
                    {(parseFloat(selectedVault.totalAssets) / 1e6).toFixed(2)} USDC
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Total Supply</span>
                  <span className={styles.infoValue}>
                    {(parseFloat(selectedVault.totalSupply) / 1e18).toFixed(4)} {selectedVault.symbol}
                  </span>
                </div>
              </div>

              {/* Strategy Management */}
              <div className={styles.section}>
                <h3>Strategy</h3>
                {selectedVault.strategy === '0x0000000000000000000000000000000000000000' ? (
                  <div>
                    <p className={styles.textMuted}>No strategy attached</p>
                    <button
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      style={{ marginTop: '1rem' }}
                      onClick={() => setShowStrategyModal(true)}
                    >
                      Attach Strategy
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Address</span>
                      <span className={styles.address}>
                        <span className={styles.addressText}>{formatAddress(selectedVault.strategy)}</span>
                        <button className={styles.copyBtn} onClick={() => handleCopyAddress(selectedVault.strategy)}>
                          📋
                        </button>
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      <button
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        onClick={() => setShowStrategyModal(true)}
                      >
                        Change Strategy
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnWarning}`}
                        onClick={() => {
                          setStrategyAddress('0x0000000000000000000000000000000000000000')
                          setShowStrategyModal(true)
                        }}
                      >
                        Remove Strategy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Whitelisted Tokens */}
              <div className={styles.section}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3>Whitelisted Tokens</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className={`${styles.btn} ${styles.btnSmall}`}
                      onClick={() => setShowTokenModal(true)}
                    >
                      + Add Token
                    </button>
                    {vaultDetails && vaultDetails.whitelistedTokens.length > 0 && (
                      <button
                        className={`${styles.btn} ${styles.btnSmall} ${styles.btnWarning}`}
                        onClick={() => setShowRemoveTokenModal(true)}
                      >
                        - Remove Token
                      </button>
                    )}
                  </div>
                </div>
                {vaultDetails && vaultDetails.whitelistedTokens.length > 0 ? (
                  <div className={styles.tokenList}>
                    {vaultDetails.whitelistedTokens.map((token, index) => (
                      <div key={index} className={styles.tokenItem}>
                        <span className={styles.address}>
                          <span className={styles.addressText}>{formatAddress(token)}</span>
                          <button className={styles.copyBtn} onClick={() => handleCopyAddress(token)}>
                            📋
                          </button>
                        </span>
                        <span className={styles.badge}>Whitelisted</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={styles.textMuted}>No tokens whitelisted</p>
                )}
              </div>

              {/* Strategy Targets */}
              {selectedVault.strategy !== '0x0000000000000000000000000000000000000000' && (
                <div className={styles.section}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3>Whitelisted Targets</h3>
                    <button
                      className={`${styles.btn} ${styles.btnSmall}`}
                      onClick={() => setShowTargetModal(true)}
                    >
                      + Add Target
                    </button>
                  </div>
                  {vaultDetails && vaultDetails.strategyTargets.length > 0 ? (
                    <div className={styles.tokenList}>
                      {vaultDetails.strategyTargets.map((target, index) => (
                        <div key={index} className={styles.tokenItem}>
                          <span className={styles.address}>
                            <span className={styles.addressText}>{formatAddress(target)}</span>
                            <button className={styles.copyBtn} onClick={() => handleCopyAddress(target)}>
                              📋
                            </button>
                          </span>
                          <span className={styles.badge}>Active</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.textMuted}>No targets whitelisted</p>
                  )}
                </div>
              )}

              {/* Function Whitelisting */}
              {selectedVault.strategy !== '0x0000000000000000000000000000000000000000' && (
                <div className={styles.section}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3>Whitelist Function</h3>
                    <button
                      className={`${styles.btn} ${styles.btnSmall} ${styles.btnPrimary}`}
                      onClick={() => setShowFunctionModal(true)}
                    >
                      + Whitelist Function
                    </button>
                  </div>
                  <p className={styles.textMuted}>
                    Whitelist specific function calls that the strategy can execute on targets
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Vault Modal */}
      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Create New Vault</h2>
              <button className={styles.modalClose} onClick={() => setShowCreateModal(false)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Vault Name</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="My Strategy Vault"
                  value={vaultName}
                  onChange={(e) => setVaultName(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Base Asset</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="0x..."
                  value={vaultAsset}
                  onChange={(e) => setVaultAsset(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Symbol</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="svUSDC"
                  value={vaultSymbol}
                  onChange={(e) => setVaultSymbol(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Performance Fee (bps)</label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="2000"
                  value={performanceFee}
                  onChange={(e) => setPerformanceFee(e.target.value)}
                />
                <small className={styles.textMuted}>2000 = 20% (max 20%)</small>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Exit Fee (bps)</label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="100"
                  value={exitFee}
                  onChange={(e) => setExitFee(e.target.value)}
                />
                <small className={styles.textMuted}>100 = 1% (max 5%)</small>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Fee Recipient Address</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="0x..."
                  value={feeRecipient}
                  onChange={(e) => setFeeRecipient(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btn} onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleCreateVault} disabled={loading}>
                {loading ? 'Creating...' : 'Create Vault'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Whitelist Token Modal */}
      {showTokenModal && (
        <div className={styles.modalOverlay} onClick={() => setShowTokenModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Whitelist Token</h2>
              <button className={styles.modalClose} onClick={() => setShowTokenModal(false)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Token Address</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="0x..."
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                />
                <small className={styles.textMuted}>
                  Quick fill:{' '}
                  <button
                    className={`${styles.btn} ${styles.btnSmall}`}
                    style={{ marginLeft: '0.5rem' }}
                    onClick={() => setTokenAddress(CONTRACTS.mockUNI)}
                  >
                    Use Mock UNI
                  </button>
                </small>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btn} onClick={() => setShowTokenModal(false)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleWhitelistToken} disabled={loading}>
                {loading ? 'Processing...' : 'Whitelist'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Token Modal */}
      {showRemoveTokenModal && vaultDetails && (
        <div className={styles.modalOverlay} onClick={() => setShowRemoveTokenModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Remove Token</h2>
              <button className={styles.modalClose} onClick={() => setShowRemoveTokenModal(false)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Select Token to Remove</label>
                <select
                  className={styles.formSelect}
                  value={tokenToRemove}
                  onChange={(e) => setTokenToRemove(e.target.value)}
                >
                  <option value="">-- Select a token --</option>
                  {vaultDetails.whitelistedTokens.map((token) => (
                    <option key={token} value={token}>
                      {formatAddress(token)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btn} onClick={() => setShowRemoveTokenModal(false)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnWarning}`} onClick={handleRemoveToken} disabled={loading}>
                {loading ? 'Processing...' : 'Remove Token'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Strategy Modal */}
      {showStrategyModal && (
        <div className={styles.modalOverlay} onClick={() => setShowStrategyModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {strategyAddress === '0x0000000000000000000000000000000000000000' ? 'Remove Strategy' : 'Set Strategy'}
              </h2>
              <button className={styles.modalClose} onClick={() => setShowStrategyModal(false)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {strategyAddress !== '0x0000000000000000000000000000000000000000' && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Strategy Contract Address</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="0x..."
                    value={strategyAddress}
                    onChange={(e) => setStrategyAddress(e.target.value)}
                  />
                </div>
              )}
              {strategyAddress === '0x0000000000000000000000000000000000000000' && (
                <p className={styles.textMuted}>
                  Are you sure you want to remove the strategy? This will prevent the vault from executing any strategy operations.
                </p>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btn} onClick={() => { setShowStrategyModal(false); setStrategyAddress(''); }}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleSetStrategy} disabled={loading}>
                {loading ? 'Processing...' : strategyAddress === '0x0000000000000000000000000000000000000000' ? 'Remove' : 'Set Strategy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Whitelist Target Modal */}
      {showTargetModal && (
        <div className={styles.modalOverlay} onClick={() => setShowTargetModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Whitelist Target Contract</h2>
              <button className={styles.modalClose} onClick={() => setShowTargetModal(false)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Target Contract Address</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="0x..."
                  value={targetAddress}
                  onChange={(e) => setTargetAddress(e.target.value)}
                />
                <small className={styles.textMuted}>
                  The strategy will be able to interact with this contract
                </small>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btn} onClick={() => setShowTargetModal(false)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleWhitelistTarget} disabled={loading}>
                {loading ? 'Processing...' : 'Whitelist Target'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Whitelist Function Modal */}
      {showFunctionModal && (
        <div className={styles.modalOverlay} onClick={() => setShowFunctionModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Whitelist Function Call</h2>
              <button className={styles.modalClose} onClick={() => setShowFunctionModal(false)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Target Contract</label>
                {vaultDetails && vaultDetails.strategyTargets.length > 0 ? (
                  <select
                    className={styles.formSelect}
                    value={functionTarget}
                    onChange={(e) => setFunctionTarget(e.target.value)}
                  >
                    <option value="">-- Select target --</option>
                    {vaultDetails.strategyTargets.map((target) => (
                      <option key={target} value={target}>
                        {formatAddress(target)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="0x..."
                    value={functionTarget}
                    onChange={(e) => setFunctionTarget(e.target.value)}
                  />
                )}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Function Selector</label>
                <input
                  type="text"
                  className={styles.formInput}
                  placeholder="0x12345678"
                  value={functionSelector}
                  onChange={(e) => setFunctionSelector(e.target.value)}
                />
                <small className={styles.textMuted}>
                  4-byte function signature (e.g., 0xa9059cbb for transfer)
                </small>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btn} onClick={() => setShowFunctionModal(false)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleWhitelistFunction} disabled={loading}>
                {loading ? 'Processing...' : 'Whitelist Function'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}