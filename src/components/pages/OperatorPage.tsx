'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { encodeFunctionData } from 'viem'
import { CONTRACTS, VAULT_ABI, STRATEGY_ABI, ERC20_ABI } from '@/config/contracts'
import { formatAddress, copyToClipboard } from '@/utils/helpers'
import type { Vault } from '@/types'
import styles from './OperatorPage.module.css'

interface OperatorPageProps {
  vaults: Vault[]
  onVaultsUpdate: () => void
  onToast: (message: string, type: 'success' | 'error' | 'warning') => void
}

interface VaultDetails extends Vault {
  whitelistedTokens: TokenInfo[]
  strategyTargets: `0x${string}`[]
  operatorAddress: `0x${string}` | null
}

interface TokenInfo {
  address: `0x${string}`
  symbol: string
  decimals: number
  balance: string
}

interface FunctionCall {
  name: string
  selector: string
  description: string
}

// Common DeFi function signatures
const COMMON_FUNCTIONS: FunctionCall[] = [
  {
    name: 'ERC20: Transfer',
    selector: '0xa9059cbb',
    description: 'transfer(address to, uint256 amount)',
  },
  {
    name: 'ERC20: Approve',
    selector: '0x095ea7b3',
    description: 'approve(address spender, uint256 amount)',
  },
  {
    name: 'Uniswap V3: Exact Input Single',
    selector: '0x414bf389',
    description: 'exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))',
  },
  {
    name: 'Uniswap V2: Swap Exact Tokens',
    selector: '0x38ed1739',
    description: 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)',
  },
  {
    name: 'Aave V3: Supply',
    selector: '0x617ba037',
    description: 'supply(address,uint256,address,uint16)',
  },
  {
    name: 'Aave V3: Withdraw',
    selector: '0x69328dec',
    description: 'withdraw(address,uint256,address)',
  },
]

export function OperatorPage({ vaults, onVaultsUpdate, onToast }: OperatorPageProps) {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [selectedVault, setSelectedVault] = useState<Vault | null>(null)
  const [vaultDetails, setVaultDetails] = useState<VaultDetails | null>(null)
  const [loading, setLoading] = useState(false)

  // Execute Function Modal State
  const [showExecuteModal, setShowExecuteModal] = useState(false)
  const [targetContract, setTargetContract] = useState('')
  const [functionSelector, setFunctionSelector] = useState('')
  const [calldata, setCalldata] = useState('')
  const [selectedFunction, setSelectedFunction] = useState<FunctionCall | null>(null)

  // Custom calldata builder state
  const [showCalldataBuilder, setShowCalldataBuilder] = useState(false)
  const [functionSignature, setFunctionSignature] = useState('')
  const [functionParams, setFunctionParams] = useState<string[]>([])

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

        // Load token details
        const tokenDetails = await Promise.all(
          (tokens as `0x${string}`[]).map(async (tokenAddress) => {
            try {
              const [symbol, decimals, balance] = await Promise.all([
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
                publicClient.readContract({
                  address: tokenAddress,
                  abi: ERC20_ABI,
                  functionName: 'decimals',
                }),
                publicClient.readContract({
                  address: tokenAddress,
                  abi: ERC20_ABI,
                  functionName: 'balanceOf',
                  args: [selectedVault.address],
                }),
              ])

              return {
                address: tokenAddress,
                symbol: symbol as string,
                decimals: decimals as number,
                balance: balance.toString(),
              }
            } catch (error) {
              console.error('Error loading token:', tokenAddress, error)
              return {
                address: tokenAddress,
                symbol: 'UNKNOWN',
                decimals: 18,
                balance: '0',
              }
            }
          })
        )

        let targets: `0x${string}`[] = []
        let operatorAddress: `0x${string}` | null = null

        if (strategy && strategy !== '0x0000000000000000000000000000000000000000') {
          try {
            {
              const [readOnlyTargets, opAddr] = await Promise.all([
                publicClient.readContract({
                  address: strategy as `0x${string}`,
                  abi: STRATEGY_ABI,
                  functionName: 'getWhitelistedTargets',
                }),
                publicClient
                  .readContract({
                    address: strategy as `0x${string}`,
                    abi: [
                      {
                        inputs: [],
                        name: 'operator',
                        outputs: [{ type: 'address' }],
                        stateMutability: 'view',
                        type: 'function',
                      },
                    ],
                    functionName: 'operator',
                  })
                  .catch(() => null),
              ])
              targets = Array.from(readOnlyTargets as readonly `0x${string}`[])
              operatorAddress = opAddr as `0x${string}` | null
            }
          } catch (error) {
            console.error('Error loading strategy details:', error)
          }
        }

        setVaultDetails({
          ...selectedVault,
          whitelistedTokens: tokenDetails,
          strategyTargets: targets as `0x${string}`[],
          operatorAddress: operatorAddress as `0x${string}` | null,
        })
      } catch (error) {
        console.error('Error loading vault details:', error)
        onToast('Failed to load vault details', 'error')
      }
    }

    loadVaultDetails()
  }, [selectedVault, publicClient, onToast])

  // Execute Strategy Function
  const handleExecute = async () => {
    if (!address || !walletClient || !publicClient || !selectedVault) {
      onToast('Please connect wallet and select a vault', 'error')
      return
    }

    if (!selectedVault.strategy || selectedVault.strategy === '0x0000000000000000000000000000000000000000') {
      onToast('No strategy attached to this vault', 'error')
      return
    }

    if (!targetContract || !calldata) {
      onToast('Please enter target contract and calldata', 'error')
      return
    }

    // Validate addresses
    if (targetContract.length !== 42) {
      onToast('Invalid target contract address', 'error')
      return
    }

    if (!calldata.startsWith('0x')) {
      onToast('Calldata must start with 0x', 'error')
      return
    }

    setLoading(true)
    try {
      const tx = await walletClient.writeContract({
        address: selectedVault.strategy,
        abi: STRATEGY_ABI,
        functionName: 'execute',
        args: [targetContract as `0x${string}`, calldata as `0x${string}`],
        account: address,
      })

      onToast('Execution transaction submitted...', 'success')
      await publicClient.waitForTransactionReceipt({ hash: tx })

      onToast('Execution successful!', 'success')
      setShowExecuteModal(false)
      setTargetContract('')
      setCalldata('')
      setSelectedFunction(null)
      onVaultsUpdate()

      // Reload vault details
      if (selectedVault) {
        const updatedVault = vaults.find((v) => v.address === selectedVault.address)
        if (updatedVault) setSelectedVault(updatedVault)
      }
    } catch (error: any) {
      console.error('Execution error:', error)
      onToast('Execution failed: ' + (error.message || 'Unknown error'), 'error')
    } finally {
      setLoading(false)
    }
  }

  // Generate calldata for common functions
  const handleFunctionSelect = (func: FunctionCall) => {
    setSelectedFunction(func)
    setFunctionSelector(func.selector)
    setShowCalldataBuilder(true)
  }

  const handleCopyAddress = (addr: string) => {
    copyToClipboard(addr)
    onToast('Address copied!', 'success')
  }

  const formatTokenBalance = (balance: string, decimals: number) => {
    const num = parseFloat(balance) / Math.pow(10, decimals)
    return num.toFixed(4)
  }

  return (
    <>
      <div className={styles.hero}>
        <h1>Operator Dashboard</h1>
        <p className={styles.heroSubtitle}>Execute strategies and manage vault operations</p>
      </div>

      {/* Vault Selection */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Select Vault</h2>
        </div>
        <div className={styles.formGroup}>
          <select
            className={styles.formSelect}
            value={selectedVault?.address || ''}
            onChange={(e) => {
              const vault = vaults.find((v) => v.address === e.target.value)
              setSelectedVault(vault || null)
            }}
          >
            <option value="">-- Select a vault --</option>
            {vaults.map((vault) => (
              <option key={vault.address} value={vault.address}>
                {vault.name} ({vault.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Vault Details */}
      {selectedVault && vaultDetails && (
        <>
          {/* Vault Information */}
          <div className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Vault Information</h3>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Name</span>
                <span className={styles.infoValue}>{selectedVault.name}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Symbol</span>
                <span className={styles.infoValue}>{selectedVault.symbol}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Total Assets</span>
                <span className={styles.infoValue}>
                  {(parseFloat(selectedVault.totalAssets) / 1e6).toFixed(2)} USDC
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Address</span>
                <span className={styles.address}>
                  <span className={styles.addressText}>{formatAddress(selectedVault.address)}</span>
                  <button className={styles.copyBtn} onClick={() => handleCopyAddress(selectedVault.address)}>
                    📋
                  </button>
                </span>
              </div>
            </div>

            {/* Strategy Information */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Strategy</h3>
                {selectedVault.strategy === '0x0000000000000000000000000000000000000000' ? (
                  <span className={`${styles.badge} ${styles.warning}`}>Not Set</span>
                ) : (
                  <span className={styles.badge}>Active</span>
                )}
              </div>
              {selectedVault.strategy && selectedVault.strategy !== '0x0000000000000000000000000000000000000000' ? (
                <>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Address</span>
                    <span className={styles.address}>
                      <span className={styles.addressText}>{formatAddress(selectedVault.strategy)}</span>
                      <button className={styles.copyBtn} onClick={() => handleCopyAddress(selectedVault.strategy)}>
                        📋
                      </button>
                    </span>
                  </div>
                  {vaultDetails.operatorAddress && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Operator</span>
                      <span className={styles.address}>
                        <span className={styles.addressText}>{formatAddress(vaultDetails.operatorAddress)}</span>
                        <button className={styles.copyBtn} onClick={() => handleCopyAddress(vaultDetails.operatorAddress!)}>
                          📋
                        </button>
                      </span>
                    </div>
                  )}
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    style={{ marginTop: '1rem', width: '100%' }}
                    onClick={() => setShowExecuteModal(true)}
                    disabled={!address}
                  >
                    Execute Strategy Call
                  </button>
                </>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateText}>No strategy configured</div>
                </div>
              )}
            </div>
          </div>

          {/* Whitelisted Tokens */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Whitelisted Tokens</h3>
            </div>
            {vaultDetails.whitelistedTokens.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyStateText}>No tokens whitelisted</div>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Address</th>
                      <th>Vault Balance</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vaultDetails.whitelistedTokens.map((token, index) => (
                      <tr key={index}>
                        <td>
                          <strong>{token.symbol}</strong>
                        </td>
                        <td>
                          <div className={styles.address}>
                            <span className={styles.addressText}>{formatAddress(token.address)}</span>
                            <button className={styles.copyBtn} onClick={() => handleCopyAddress(token.address)}>
                              📋
                            </button>
                          </div>
                        </td>
                        <td>
                          {formatTokenBalance(token.balance, token.decimals)} {token.symbol}
                        </td>
                        <td>
                          <span className={styles.badge}>Whitelisted</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Whitelisted Targets */}
          {vaultDetails.strategyTargets.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Whitelisted Targets</h3>
              </div>
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Target Contract</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vaultDetails.strategyTargets.map((target, index) => (
                      <tr key={index}>
                        <td>
                          <div className={styles.address}>
                            <span className={styles.addressText}>{formatAddress(target)}</span>
                            <button className={styles.copyBtn} onClick={() => handleCopyAddress(target)}>
                              📋
                            </button>
                          </div>
                        </td>
                        <td>
                          <span className={styles.badge}>Active</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Execute Function Modal */}
      {showExecuteModal && selectedVault && vaultDetails && (
        <div className={styles.modalOverlay} onClick={() => setShowExecuteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Execute Strategy Call</h2>
              <button className={styles.modalClose} onClick={() => setShowExecuteModal(false)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* Common Functions */}
              <div className={styles.section}>
                <h3>Common Functions</h3>
                <div className={styles.functionGrid}>
                  {COMMON_FUNCTIONS.map((func) => (
                    <button
                      key={func.selector}
                      className={`${styles.functionCard} ${selectedFunction?.selector === func.selector ? styles.active : ''}`}
                      onClick={() => handleFunctionSelect(func)}
                    >
                      <div className={styles.functionName}>{func.name}</div>
                      <div className={styles.functionSelector}>{func.selector}</div>
                      <div className={styles.functionDesc}>{func.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Manual Entry */}
              <div className={styles.section}>
                <h3>Manual Entry</h3>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Target Contract</label>
                  {vaultDetails.strategyTargets.length > 0 ? (
                    <select
                      className={styles.formSelect}
                      value={targetContract}
                      onChange={(e) => setTargetContract(e.target.value)}
                    >
                      <option value="">-- Select target --</option>
                      {vaultDetails.strategyTargets.map((target) => (
                        <option key={target} value={target}>
                          {formatAddress(target)}
                        </option>
                      ))}
                      <option value="custom">Custom Address...</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="0x..."
                      value={targetContract}
                      onChange={(e) => setTargetContract(e.target.value)}
                    />
                  )}
                </div>

                {targetContract === 'custom' && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Custom Target Address</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder="0x..."
                      onChange={(e) => setTargetContract(e.target.value)}
                    />
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Calldata (Hex)</label>
                  <textarea
                    className={styles.formTextarea}
                    placeholder="0x..."
                    value={calldata}
                    onChange={(e) => setCalldata(e.target.value)}
                    rows={4}
                  />
                  <small className={styles.textMuted}>
                    Enter the complete encoded function call data including function selector and parameters
                  </small>
                </div>

                {selectedFunction && (
                  <div className={styles.infoBox}>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Selected Function:</span>
                      <span className={styles.infoValue}>{selectedFunction.name}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Selector:</span>
                      <span className={styles.infoValue}>{selectedFunction.selector}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Helper Information */}
              <div className={styles.helpBox}>
                <h4>💡 How to generate calldata:</h4>
                <ol>
                  <li>Use a tool like <strong>https://abi.hashex.org/</strong></li>
                  <li>Or encode with viem: <code>encodeFunctionData()</code></li>
                  <li>Include function selector + encoded parameters</li>
                  <li>Example: <code>0xa9059cbb000000000000000000000000...</code></li>
                </ol>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btn} onClick={() => setShowExecuteModal(false)}>
                Cancel
              </button>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleExecute} disabled={loading}>
                {loading ? 'Executing...' : 'Execute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}