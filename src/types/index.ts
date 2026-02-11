export interface Vault {
  address: `0x${string}`;
  name: string;
  symbol: string;
  totalAssets: string;
  totalSupply: string;
  asset: `0x${string}`;
  strategy: `0x${string}`;
}

export interface VaultParams {
  asset: `0x${string}`;
  priceOracle: `0x${string}`;
  name: string;
  symbol: string;
  performanceFeeBps: bigint;
  exitFeeBps: bigint;
  feeRecipient: `0x${string}`;
  decimalOffset: bigint;
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning';
}

export type PageType = 'home' | 'user' | 'admin' | 'operator';
