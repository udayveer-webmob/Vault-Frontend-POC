'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePublicClient } from 'wagmi'
import { Navigation } from '@/components/Navigation/Navigation'
import { HomePage } from '@/components/pages/HomePage'
import { AdminPage } from '@/components/pages/AdminPage'
import { UserPage } from '@/components/pages/UserPage'
import { OperatorPage } from '@/components/pages/OperatorPage'
import { ToastContainer } from '@/components/Toast/Toast'
import { CONTRACTS, VAULT_FACTORY_ABI, VAULT_ABI } from '@/config/contracts'
import type { Vault, Toast, PageType } from '@/types'
import styles from './page.module.css'

export default function Home() {
  const [currentPage, setCurrentPage] = useState<PageType>('home')
  const [vaults, setVaults] = useState<Vault[]>([])
  const [loading, setLoading] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [account, setAccount] = useState(null);
  const [walletClient, setWalletClient] = useState(null);
  // const [publicClient, setPublicClient] = useState(null);

  const publicClient = usePublicClient()

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const loadVaults = useCallback(async () => {
    if (!publicClient) return

    setLoading(true)
    try {
      const data = await publicClient.readContract({
        address: CONTRACTS.vaultFactory,
        abi: VAULT_FACTORY_ABI,
        functionName: 'getVaults',
      })

      const vaultDetails = await Promise.all(
        data.map(async (vaultAddress) => {
          try {
            const [name, symbol, totalAssets, totalSupply, asset, strategy] = await Promise.all([
              publicClient.readContract({
                address: vaultAddress,
                abi: VAULT_ABI,
                functionName: 'name',
              }),
              publicClient.readContract({
                address: vaultAddress,
                abi: VAULT_ABI,
                functionName: 'symbol',
              }),
              publicClient.readContract({
                address: vaultAddress,
                abi: VAULT_ABI,
                functionName: 'totalAssets',
              }),
              publicClient.readContract({
                address: vaultAddress,
                abi: VAULT_ABI,
                functionName: 'totalSupply',
              }),
              publicClient.readContract({
                address: vaultAddress,
                abi: VAULT_ABI,
                functionName: 'asset',
              }),
              publicClient.readContract({
                address: vaultAddress,
                abi: VAULT_ABI,
                functionName: 'strategy',
              }).catch(() => '0x0000000000000000000000000000000000000000' as `0x${string}`),
            ])

            return {
              address: vaultAddress,
              name: name as string,
              symbol: symbol as string,
              totalAssets: totalAssets.toString(),
              totalSupply: totalSupply.toString(),
              asset: asset as `0x${string}`,
              strategy: strategy as `0x${string}`,
            }
          } catch (error) {
            console.error('Error loading vault:', vaultAddress, error)
            return null
          }
        })
      )

      setVaults(vaultDetails.filter((v): v is Vault => v !== null))
    } catch (error) {
      console.error('Error loading vaults:', error)
      addToast('Failed to load vaults', 'error')
    } finally {
      setLoading(false)
    }
  }, [publicClient, addToast])

  useEffect(() => {
    if (publicClient) {
      loadVaults()
    }
  }, [publicClient, loadVaults])

  return (
    <>
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className={styles.container}>
        {currentPage === 'home' && <HomePage vaults={vaults} />}
        {currentPage === 'user' && (
          <UserPage vaults={vaults} onVaultsUpdate={loadVaults} onToast={addToast} />
        )}
        {currentPage === 'admin' && (
          <AdminPage vaults={vaults} onVaultsUpdate={loadVaults} onToast={addToast} />
        )}
        {currentPage === 'operator' && (
          <OperatorPage vaults={vaults} onVaultsUpdate={loadVaults} onToast={addToast} />
        )}
      </main>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  )
}
