import { http, createConfig } from 'wagmi'
import { bscTestnet } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

export const config = createConfig({
  chains: [bscTestnet],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [bscTestnet.id]: http('https://data-seed-prebsc-1-s2.bnbchain.org:8545'),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
