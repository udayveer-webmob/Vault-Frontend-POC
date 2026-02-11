# Managed Vault System - Next.js Frontend

A modern, production-ready DeFi frontend built with Next.js 14, TypeScript, and Viem for interacting with the Managed Vault System smart contracts on BNB Testnet.

## 🚀 Features

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Viem** for Web3 interactions
- **Wagmi** for React hooks
- **Cyberpunk Financial Theme** with custom styling
- **Responsive Design** for mobile and desktop
- **Toast Notifications** for user feedback
- **Multi-page Navigation** (Home, User, Admin, Operator)

## 📋 Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- MetaMask or compatible Web3 wallet
- BNB Testnet funds for transactions

## 🛠️ Installation

1. **Clone or extract the project:**
```bash
cd managed-vault-nextjs
```

2. **Install dependencies:**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Run the development server:**
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. **Open your browser:**
Navigate to [http://localhost:3000](http://localhost:3000)

## 🏗️ Project Structure

```
managed-vault-nextjs/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── layout.tsx         # Root layout with fonts
│   │   ├── page.tsx           # Main page component
│   │   ├── providers.tsx      # Wagmi and React Query providers
│   │   └── globals.css        # Global styles import
│   ├── components/
│   │   ├── Navigation/        # Navigation bar component
│   │   ├── Toast/             # Toast notification system
│   │   └── pages/             # Page components
│   │       └── HomePage.tsx   # Home page component
│   ├── config/
│   │   ├── contracts.ts       # Contract addresses and ABIs
│   │   └── wagmi.ts           # Wagmi configuration
│   ├── styles/
│   │   └── globals.css        # Global CSS variables and styles
│   ├── types/
│   │   └── index.ts           # TypeScript type definitions
│   └── utils/
│       └── helpers.ts         # Utility functions
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

## 🔧 Configuration

### Contract Addresses (BNB Testnet)

The following contracts are pre-configured in `src/config/contracts.ts`:

- **Mock USDC**: `0x3CA95e2e7e69060025bB59675c6FDca135CE3aE8`
- **Mock UNI**: `0x5e4b97936cF76dA15Bb486D5edb8044277B69152`
- **Vault Factory**: `0xb66c17f5CDc0445F76Cf98481afbBFe57A084aAC`
- **Chain ID**: 97 (BNB Testnet)

### Wagmi Configuration

Wagmi is configured in `src/config/wagmi.ts` with:
- BNB Testnet chain
- Injected connector (MetaMask)
- HTTP transport

## 🎨 Design System

### Color Palette

The application uses a cyberpunk financial theme:

- **Primary**: `#00ff88` (Bright green)
- **Secondary**: `#ff0088` (Neon pink)
- **Accent**: `#00d4ff` (Cyan)
- **Background**: `#0a0e1a` (Dark blue-black)
- **Cards**: `#131825` (Dark gray-blue)

### Typography

- **Headings**: Syne (800 weight)
- **Body**: JetBrains Mono (400-700 weight)

## 📱 Pages

### 1. Home Page ✅
- Overview statistics (Total Vaults, TVL, Active Strategies)
- Table of all deployed vaults
- Real-time data from blockchain

### 2. User Page 🚧
**Coming Soon:**
- Deposit USDC into vaults
- Withdraw assets by redeeming shares
- View personal balances
- Transaction history

### 3. Admin Page 🚧
**Coming Soon:**
- Create new vaults
- Whitelist tokens
- Attach/detach strategies
- Configure vault parameters
- Manage permissions

### 4. Operator Page 🚧
**Coming Soon:**
- View vault tokens
- Execute whitelisted functions
- Manage strategy operations
- Monitor vault performance

## 🔌 Web3 Integration

### Connecting Wallet

1. Click "Connect Wallet" button
2. MetaMask will prompt to connect
3. Approve the connection
4. Switch to BNB Testnet if prompted

### Reading Data

The app uses Viem's `usePublicClient` and `readContract` to fetch:
- Vault list from factory
- Vault details (name, symbol, TVL, etc.)
- User balances
- Whitelisted tokens

### Writing Transactions

Future implementations will use Wagmi's hooks:
- `useWriteContract` for transactions
- `useWaitForTransactionReceipt` for confirmations
- `useSimulateContract` for validation

## 🧪 Development

### Adding New Components

1. Create component in `src/components/[ComponentName]/`
2. Add TypeScript file: `ComponentName.tsx`
3. Add CSS module: `ComponentName.module.css`
4. Export from index if needed

### Adding New Pages

1. Create page component in `src/components/pages/`
2. Import in `src/app/page.tsx`
3. Add to navigation and routing logic

### Environment Variables

Create `.env.local` for custom configuration:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_ALCHEMY_KEY=your_alchemy_key
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Build for Production

```bash
npm run build
npm run start
```

## 🐛 Troubleshooting

### MetaMask Not Detected

- Ensure MetaMask extension is installed
- Refresh the page
- Check browser console for errors

### Wrong Network

- The app will prompt to switch to BNB Testnet
- Approve the network switch in MetaMask
- Get testnet BNB from [BSC Faucet](https://testnet.bnbchain.org/faucet-smart)

### Transactions Failing

- Check you have sufficient BNB for gas
- Verify contract addresses are correct
- Check transaction on [BSCScan Testnet](https://testnet.bscscan.com/)

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Viem Documentation](https://viem.sh/)
- [Wagmi Documentation](https://wagmi.sh/)
- [BNB Chain Testnet](https://testnet.bnbchain.org/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## 📄 License

MIT License - feel free to use this project for your own purposes.

## 🔮 Roadmap

- [ ] Add transaction history
- [ ] Add vault analytics
- [ ] Add price charts
- [ ] Add notifications system
- [ ] Add dark/light theme toggle
- [ ] Add multi-language support

---

Built with ⚡ by the Vault.sys team
