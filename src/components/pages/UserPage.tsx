'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { CONTRACTS, VAULT_ABI, ERC20_ABI } from '@/config/contracts'
import { formatAddress, copyToClipboard } from '@/utils/helpers'
import type { Vault } from '@/types'
import styles from './UserPage.module.css'

interface UserPageProps {
  vaults: Vault[]
  onVaultsUpdate: () => void
  onToast: (message: string, type: 'success' | 'error' | 'warning') => void
}

interface VaultDetails extends Vault {
  whitelistedTokens: `0x${string}`[]
  userBalance: string
  userBalanceFormatted: string
}

interface TokenBalance {
  address: `0x${string}`
  symbol: string
  balance: string
  decimals: number
}

export function UserPage({ vaults, onVaultsUpdate, onToast }: UserPageProps) {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [selectedVault, setSelectedVault] = useState<Vault | null>(null)
  const [vaultDetails, setVaultDetails] = useState<VaultDetails | null>(null)
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
  const [loading, setLoading] = useState(false)

  // Deposit Modal State
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [depositToken, setDepositToken] = useState<`0x${string}`>(CONTRACTS.mockUSDC)
  const [depositTokenSymbol, setDepositTokenSymbol] = useState('USDC')

  // Withdraw Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawToken, setWithdrawToken] = useState<`0x${string}`>(CONTRACTS.mockUSDC)
  const [withdrawTokenSymbol, setWithdrawTokenSymbol] = useState('USDC')

  // Load vault details when selected
  useEffect(() => {
    async function loadVaultDetails() {
      if (!selectedVault || !publicClient || !address) return

      try {
        const [tokens, userBalance] = await Promise.all([
          publicClient.readContract({
            address: selectedVault.address,
            abi: VAULT_ABI,
            functionName: 'getWhitelistedTokens',
          }),
          publicClient.readContract({
            address: selectedVault.address,
            abi: VAULT_ABI,
            functionName: 'balanceOf',
            args: [address],
          }),
        ])

        const userBalanceStr = userBalance.toString()
        const userBalanceFormatted = (parseFloat(userBalanceStr) / 1e18).toFixed(4)

        setVaultDetails({
          ...selectedVault,
          whitelistedTokens: tokens as `0x${string}`[],
          userBalance: userBalanceStr,
          userBalanceFormatted,
        })

        // Load token balances
        await loadTokenBalances(tokens as `0x${string}`[])
      } catch (error) {
        console.error('Error loading vault details:', error)
        onToast('Failed to load vault details', 'error')
      }
    }

    loadVaultDetails()
  }, [selectedVault, publicClient, address, onToast])

  // Load user's token balances
  const loadTokenBalances = async (tokens: `0x${string}`[]) => {
    if (!publicClient || !address) return

    try {
      const balances = await Promise.all(
        tokens.map(async (tokenAddress) => {
          try {
            const [balance, decimals, symbol] = await Promise.all([
              publicClient.readContract({
                address: tokenAddress,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [address],
              }),
              publicClient.readContract({
                address: tokenAddress,
                abi: ERC20_ABI,
                functionName: 'decimals',
              }),
              publicClient.readContract({
                address: tokenAddress,
                abi: [
                  {
                    inputs: [],
                    name: 'symbol',
                    outputs: [{ type: 'string' }],
                    stateMutability: 'view',
                    type: 'function',
                  },
                ],
                functionName: 'symbol',
              }),
            ])

            return {
              address: tokenAddress,
              symbol: symbol as string,
              balance: balance.toString(),
              decimals: decimals as number,
            }
          } catch (error) {
            console.error('Error loading token:', tokenAddress, error)
            return {
              address: tokenAddress,
              symbol: 'UNKNOWN',
              balance: '0',
              decimals: 18,
            }
          }
        })
      )

      setTokenBalances(balances)
    } catch (error) {
      console.error('Error loading token balances:', error)
    }
  }

  // Handle Deposit
  const handleDeposit = async () => {
    if (!address || !walletClient || !publicClient || !selectedVault) {
      onToast('Please connect wallet and select a vault', 'error')
      return
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      onToast('Please enter a valid amount', 'error')
      return
    }

    setLoading(true)
    try {
      // Get token decimals
      const decimals = await publicClient.readContract({
        address: depositToken,
        abi: ERC20_ABI,
        functionName: 'decimals',
      })

      const amount = parseUnits(depositAmount, decimals as number)

      // Check if user has enough balance
      const userBalance = await publicClient.readContract({
        address: depositToken,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      })

      if (userBalance < amount) {
        onToast('Insufficient token balance', 'error')
        setLoading(false)
        return
      }

      // Check allowance
      const allowance = await publicClient.readContract({
        address: depositToken,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, selectedVault.address as `0x${string}`],
      })

      // Approve if needed
      if (allowance < amount) {
        const approveTx = await walletClient.writeContract({
          address: depositToken,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [selectedVault.address, amount],
          account: address,
        })

        onToast('Approval transaction submitted...', 'success')
        await publicClient.waitForTransactionReceipt({ hash: approveTx })
        onToast('Token approved!', 'success')
      }

      // Deposit
      let depositTx
      if (depositToken === selectedVault.asset) {
        // Deposit base asset using deposit()
        depositTx = await walletClient.writeContract({
          address: selectedVault.address,
          abi: VAULT_ABI,
          functionName: 'deposit',
          args: [amount, address],
          account: address,
        })
      } else {
        // Deposit whitelisted token using depositToken()
        depositTx = await walletClient.writeContract({
          address: selectedVault.address,
          abi: [
            {
              inputs: [
                { type: 'address', name: 'token' },
                { type: 'uint256', name: 'assets' },
                { type: 'address', name: 'receiver' },
              ],
              name: 'depositToken',
              outputs: [{ type: 'uint256' }],
              stateMutability: 'nonpayable',
              type: 'function',
            },
          ],
          functionName: 'depositToken',
          args: [depositToken, amount, address],
          account: address,
        })
      }

      onToast('Deposit transaction submitted...', 'success')
      await publicClient.waitForTransactionReceipt({ hash: depositTx })

      onToast('Deposit successful!', 'success')
      setShowDepositModal(false)
      setDepositAmount('')
      onVaultsUpdate()

      // Reload vault details
      if (selectedVault) {
        const updatedVault = vaults.find((v) => v.address === selectedVault.address)
        if (updatedVault) setSelectedVault(updatedVault)
      }
    } catch (error: any) {
      console.error('Deposit error:', error)
      onToast('Deposit failed: ' + (error.message || 'Unknown error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  // Handle Withdraw
  const handleWithdraw = async () => {
    if (!address || !walletClient || !publicClient || !selectedVault || !vaultDetails) {
      onToast('Please connect wallet and select a vault', 'error')
      return
    }

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      onToast('Please enter a valid amount', 'error')
      return
    }

    setLoading(true)
    try {
      // Convert shares to withdraw
      const sharesToWithdraw = parseUnits(withdrawAmount, 18)

      // Check if user has enough shares
      const userShares = BigInt(vaultDetails.userBalance)
      if (userShares < sharesToWithdraw) {
        onToast('Insufficient vault shares', 'error')
        setLoading(false)
        return
      }

      // Withdraw
      let withdrawTx
      if (withdrawToken === selectedVault.asset) {
        // Redeem for base asset using redeem()
        withdrawTx = await walletClient.writeContract({
          address: selectedVault.address,
          abi: VAULT_ABI,
          functionName: 'redeem',
          args: [sharesToWithdraw, address, address],
          account: address,
        })
      } else {
        // Redeem for whitelisted token using redeemToken()
        withdrawTx = await walletClient.writeContract({
          address: selectedVault.address,
          abi: [
            {
              inputs: [
                { type: 'address', name: 'token' },
                { type: 'uint256', name: 'shares' },
                { type: 'address', name: 'receiver' },
                { type: 'address', name: 'owner' },
              ],
              name: 'redeemToken',
              outputs: [{ type: 'uint256' }],
              stateMutability: 'nonpayable',
              type: 'function',
            },
          ],
          functionName: 'redeemToken',
          args: [withdrawToken, sharesToWithdraw, address, address],
          account: address,
        })
      }

      onToast('Withdrawal transaction submitted...', 'success')
      await publicClient.waitForTransactionReceipt({ hash: withdrawTx })

      onToast('Withdrawal successful!', 'success')
      setShowWithdrawModal(false)
      setWithdrawAmount('')
      onVaultsUpdate()

      // Reload vault details
      if (selectedVault) {
        const updatedVault = vaults.find((v) => v.address === selectedVault.address)
        if (updatedVault) setSelectedVault(updatedVault)
      }
    } catch (error: any) {
      console.error('Withdrawal error:', error)
      onToast('Withdrawal failed: ' + (error.message || 'Unknown error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyAddress = (addr: string) => {
    copyToClipboard(addr)
    onToast('Address copied!', 'success')
  }

  const getTokenBalance = (tokenAddress: `0x${string}`) => {
    const token = tokenBalances.find((t) => t.address.toLowerCase() === tokenAddress.toLowerCase())
    if (!token) return '0.00'
    return (parseFloat(token.balance) / Math.pow(10, token.decimals)).toFixed(4)
  }

  const getTokenSymbol = (tokenAddress: `0x${string}`) => {
    const token = tokenBalances.find((t) => t.address.toLowerCase() === tokenAddress.toLowerCase())
    return token?.symbol || 'TOKEN'
  }

  return (
    <>
      <div className={styles.hero}>
        <h1>User Dashboard</h1>
        <p className={styles.heroSubtitle}>Deposit and manage your vault positions</p>
      </div>

      {/* Vault List */}
      <div className={styles.grid}>
        {vaults.length === 0 ? (
          <div className={styles.card}>
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>📦</div>
              <div className={styles.emptyStateText}>No vaults available</div>
            </div>
          </div>
        ) : (
          vaults.map((vault) => (
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
                    {(parseFloat(vault.totalAssets) / 1e18).toFixed(2)} USDC
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
                View Details
              </button>
            </div>
          ))
        )}
      </div>

      {/* Vault Details Modal */}
      {selectedVault && vaultDetails && (
        <div className={styles.modalOverlay} onClick={() => setSelectedVault(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{selectedVault.name} Details</h2>
              <button className={styles.modalClose} onClick={() => setSelectedVault(null)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* Vault Information */}
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
                  <span className={styles.infoLabel}>Symbol</span>
                  <span className={styles.infoValue}>{selectedVault.symbol}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Total Assets</span>
                  <span className={styles.infoValue}>
                    {(parseFloat(selectedVault.totalAssets) / 1e18).toFixed(2)} USDC
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Total Supply</span>
                  <span className={styles.infoValue}>
                    {(parseFloat(selectedVault.totalSupply) / 1e18).toFixed(4)} {selectedVault.symbol}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Share Price</span>
                  <span className={styles.infoValue}>
                    {parseFloat(selectedVault.totalSupply) > 0
                      ? (parseFloat(selectedVault.totalAssets) / parseFloat(selectedVault.totalSupply)).toFixed(6)
                      : '1.000000'}{' '}
                    USDC
                  </span>
                </div>
              </div>

              {/* Your Position */}
              <div className={styles.section}>
                <h3>Your Position</h3>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Your Shares</span>
                  <span className={styles.infoValue}>
                    {vaultDetails.userBalanceFormatted} {selectedVault.symbol}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Estimated Value</span>
                  <span className={styles.infoValue}>
                    {parseFloat(selectedVault.totalSupply) > 0
                      ? (
                          (parseFloat(vaultDetails.userBalance) / 1e18) *
                          (parseFloat(selectedVault.totalAssets) / parseFloat(selectedVault.totalSupply))
                        ).toFixed(2)
                      : '0.00'}{' '}
                    USDC
                  </span>
                </div>
              </div>

              {/* Deposit & Withdraw Actions */}
              <div className={styles.section}>
                <h3>Actions</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    style={{ flex: 1 }}
                    onClick={() => {
                      setDepositToken(selectedVault.asset)
                      setDepositTokenSymbol('USDC')
                      setShowDepositModal(true)
                    }}
                    disabled={!address}
                  >
                    Deposit
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnSecondary}`}
                    style={{ flex: 1 }}
                    onClick={() => {
                      setWithdrawToken(selectedVault.asset)
                      setWithdrawTokenSymbol('USDC')
                      setShowWithdrawModal(true)
                    }}
                    disabled={!address || parseFloat(vaultDetails.userBalance) === 0}
                  >
                    Withdraw
                  </button>
                </div>
              </div>

              {/* Whitelisted Tokens */}
              {vaultDetails.whitelistedTokens.length > 0 && (
                <div className={styles.section}>
                  <h3>Whitelisted Tokens</h3>
                  <div className={styles.tokenList}>
                    {vaultDetails.whitelistedTokens.map((token, index) => (
                      <div key={index} className={styles.tokenItem}>
                        <div>
                          <div className={styles.tokenSymbol}>{getTokenSymbol(token)}</div>
                          <div className={styles.tokenAddress}>
                            <span className={styles.addressText}>{formatAddress(token)}</span>
                            <button className={styles.copyBtn} onClick={() => handleCopyAddress(token)}>
                              📋
                            </button>
                          </div>
                        </div>
                        <div className={styles.tokenBalance}>
                          <div className={styles.balanceLabel}>Your Balance:</div>
                          <div className={styles.balanceValue}>
                            {getTokenBalance(token)} {getTokenSymbol(token)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositModal && selectedVault && vaultDetails && (
        <div className={styles.modalOverlay} onClick={() => setShowDepositModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Deposit to {selectedVault.name}</h2>
              <button className={styles.modalClose} onClick={() => setShowDepositModal(false)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Select Token</label>
                <select
                  className={styles.formSelect}
                  value={depositToken}
                  onChange={(e) => {
                    const token = e.target.value as `0x${string}`
                    setDepositToken(token)
                    setDepositTokenSymbol(getTokenSymbol(token))
                  }}
                >
                  <option value={selectedVault.asset}>USDC (Base Asset)</option>
                  {vaultDetails.whitelistedTokens.map((token) => (
                    <option key={token} value={token}>
                      {getTokenSymbol(token)}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Amount ({depositTokenSymbol})</label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  step="0.01"
                  min="0"
                />
                <small className={styles.textMuted}>
                  Available: {getTokenBalance(depositToken)} {depositTokenSymbol}
                </small>
              </div>
              <div className={styles.infoBox}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>You will receive:</span>
                  <span className={styles.infoValue}>≈ {depositAmount || '0'} shares</span>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btn} onClick={() => setShowDepositModal(false)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleDeposit} disabled={loading}>
                {loading ? 'Processing...' : 'Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && selectedVault && vaultDetails && (
        <div className={styles.modalOverlay} onClick={() => setShowWithdrawModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Withdraw from {selectedVault.name}</h2>
              <button className={styles.modalClose} onClick={() => setShowWithdrawModal(false)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Select Token to Receive</label>
                <select
                  className={styles.formSelect}
                  value={withdrawToken}
                  onChange={(e) => {
                    const token = e.target.value as `0x${string}`
                    setWithdrawToken(token)
                    setWithdrawTokenSymbol(getTokenSymbol(token))
                  }}
                >
                  <option value={selectedVault.asset}>USDC (Base Asset)</option>
                  {vaultDetails.whitelistedTokens.map((token) => (
                    <option key={token} value={token}>
                      {getTokenSymbol(token)}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Shares to Redeem</label>
                <input
                  type="number"
                  className={styles.formInput}
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  step="0.0001"
                  min="0"
                  max={parseFloat(vaultDetails.userBalanceFormatted)}
                />
                <small className={styles.textMuted}>
                  Available: {vaultDetails.userBalanceFormatted} {selectedVault.symbol}
                </small>
              </div>
              <div className={styles.infoBox}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>You will receive:</span>
                  <span className={styles.infoValue}>
                    ≈{' '}
                    {withdrawAmount && parseFloat(selectedVault.totalSupply) > 0
                      ? (
                          parseFloat(withdrawAmount) *
                          (parseFloat(selectedVault.totalAssets) / parseFloat(selectedVault.totalSupply)) *
                          1e18
                        ).toFixed(4)
                      : '0.00'}{' '}
                    {withdrawTokenSymbol}
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btn} onClick={() => setShowWithdrawModal(false)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleWithdraw} disabled={loading}>
                {loading ? 'Processing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}