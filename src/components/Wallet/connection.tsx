import { useAccount, useDisconnect, useEnsAvatar, useEnsName } from 'wagmi'

export function Connection() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  const { data: ensName } = useEnsName({
    address,
  })

  const { data: ensAvatar } = useEnsAvatar({
    name: ensName!,
  })

  if (!isConnected) return null

  return (
    <div>
      {ensAvatar && <img alt="ENS Avatar" src={ensAvatar} />}
      <div>
        {ensName ? `${ensName} (${address})` : address}
      </div>
      <button onClick={() => disconnect()}>
        Disconnect
      </button>
    </div>
  )
}
