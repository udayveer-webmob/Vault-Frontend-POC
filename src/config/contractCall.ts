import {CONTRACTS, VAULT_FACTORY_ABI, VAULT_ABI} from "./contracts"

export const wagmiVaultFactoryConfig = {
    address: CONTRACTS.vaultFactory,
    abi : VAULT_FACTORY_ABI,
} as const