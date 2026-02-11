export const CONTRACTS = {
  mockUSDC: "0x3CA95e2e7e69060025bB59675c6FDca135CE3aE8" as `0x${string}`,
  mockUNI: "0x5e4b97936cF76dA15Bb486D5edb8044277B69152" as `0x${string}`,
  vaultFactory: "0xb66c17f5CDc0445F76Cf98481afbBFe57A084aAC" as `0x${string}`,
  priceOracle: "0x15261d8f2E1EF77F16d25C2b3A9dbE54eA96582B" as `0x${string}`,
  chainId: 97,
} as const;

export const VAULT_FACTORY_ABI = [
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "initialOwner",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_vaultProxy",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_beacon",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [],
		"name": "CloneArgumentsTooLong",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "Create2EmptyBytecode",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "FailedDeployment",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "balance",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "needed",
				"type": "uint256"
			}
		],
		"name": "InsufficientBalance",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InvalidParameters",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "OwnableInvalidOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "OwnableUnauthorizedAccount",
		"type": "error"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "address",
				"name": "vaultAddress",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "VaultDeployed",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "beacon",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "salt",
				"type": "bytes32"
			},
			{
				"components": [
					{
						"internalType": "address",
						"name": "asset",
						"type": "address"
					},
					{
						"internalType": "address",
						"name": "priceOracle",
						"type": "address"
					},
					{
						"internalType": "string",
						"name": "name",
						"type": "string"
					},
					{
						"internalType": "string",
						"name": "symbol",
						"type": "string"
					},
					{
						"internalType": "uint256",
						"name": "performanceFeeBps",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "exitFeeBps",
						"type": "uint256"
					},
					{
						"internalType": "address",
						"name": "feeRecipient",
						"type": "address"
					},
					{
						"internalType": "uint256",
						"name": "decimalOffset",
						"type": "uint256"
					}
				],
				"internalType": "struct VaultFactory.VaultParams",
				"name": "params",
				"type": "tuple"
			}
		],
		"name": "createVaultProxy2",
		"outputs": [
			{
				"internalType": "address",
				"name": "vault",
				"type": "address"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "index",
				"type": "uint256"
			}
		],
		"name": "getVaultAtIndex",
		"outputs": [
			{
				"internalType": "address",
				"name": "vault",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getVaultCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "count",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getVaults",
		"outputs": [
			{
				"internalType": "address[]",
				"name": "vaults",
				"type": "address[]"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "vault",
				"type": "address"
			}
		],
		"name": "isFactoryVault",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "salt",
				"type": "bytes32"
			}
		],
		"name": "predictVaultAddress",
		"outputs": [
			{
				"internalType": "address",
				"name": "predictedAddress",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "vaultProxy",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
] as const;

export const VAULT_ABI = [
  { inputs: [], name: "asset", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalAssets", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalSupply", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  {
    inputs: [
      { type: "uint256", name: "assets" },
      { type: "address", name: "receiver" },
    ],
    name: "deposit",
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { type: "uint256", name: "shares" },
      { type: "address", name: "receiver" },
      { type: "address", name: "owner" },
    ],
    name: "redeem",
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  { inputs: [], name: "name", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ type: "string" }], stateMutability: "view", type: "function" },
  {
    inputs: [],
    name: "getWhitelistedTokens",
    outputs: [{ type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { type: "address", name: "token" },
      { type: "bool", name: "status" },
    ],
    name: "setTokenWhitelist",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ type: "address", name: "newStrategy" }],
    name: "setStrategy",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  { inputs: [], name: "strategy", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  {
    inputs: [{ type: "address", name: "account" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const STRATEGY_ABI = [
  {
    inputs: [
      { type: "address", name: "target" },
      { type: "bytes", name: "data" },
    ],
    name: "execute",
    outputs: [{ type: "bytes" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getWhitelistedTargets",
    outputs: [{ type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { type: "address", name: "target" },
      { type: "bool", name: "status" },
    ],
    name: "setTargetWhitelist",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { type: "address", name: "target" },
      { type: "bytes4", name: "selector" },
      { type: "bool", name: "status" },
    ],
    name: "setFunctionWhitelist",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const ERC20_ABI = [
  {
    inputs: [
      { type: "address", name: "spender" },
      { type: "uint256", name: "amount" },
    ],
    name: "approve",
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ type: "address", name: "account" }],
    name: "balanceOf",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  { 
    inputs: [], 
    name: "decimals", 
    outputs: [{ type: "uint8" }], 
    stateMutability: "view", 
    type: "function" 
  },
  {
    inputs: [
      { type: "address", name: "owner" },
      { type: "address", name: "spender" },
    ],
    name: "allowance",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;