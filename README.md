# Somnia Trading Bot

A Telegram-based trading bot for the Somnia blockchain that supports multiple users and provides a button-based interface for trading, limit orders, and cross-chain transfers.

## Features

- 🎯 Button-only interface (no typing required)
- 💼 Automatic wallet creation and import
- 🔑 Secure wallet encryption with Supabase storage
- 💱 Token trading on Somnia DEX (QuickSwap Router)
- ⏱️ Limit orders with background monitoring
- 🌉 Cross-chain bridging (Sepolia, Mumbai, BSC Testnet → Somnia)
- 📊 Trade result images with Jimp
- 📈 Trade history tracking
- 🌾 Airdrop farming simulation
- 🚀 Railway deployment ready

## Prerequisites

- Node.js >= 18.0.0
- Telegram Bot Token
- Supabase Account
- Somnia Testnet RPC URL

## Environment Variables

Create a `.env` file with the following variables:

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Somnia Testnet Configuration
RPC_URL=https://rpc.testnet.somnia.network
CHAIN_ID=50312

# DEX Configuration
DEX_ROUTER=0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7
DEX_ABI_PATH=./abis/router.json

# Supabase Database Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key

# Bridge Configuration (Testnet)
BRIDGE_CONTRACT=0x1234567890123456789012345678901234567890
BRIDGE_ABI_PATH=./abis/bridge.json

# Security Configuration
ENCRYPTION_KEY=your_32_character_encryption_key_here
JWT_SECRET=your_jwt_secret_here

# Logging Configuration
LOG_LEVEL=info
NODE_ENV=production
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/somnia-trading-bot.git
cd somnia-trading-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create required directories:
```bash
mkdir -p public/trades
mkdir -p assets/tokens
mkdir -p assets/trades
```

4. Set up Supabase database tables:

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Wallets table
CREATE TABLE wallets (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id),
  address VARCHAR(42) NOT NULL,
  private_key TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Trades table
CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id),
  token_in VARCHAR(42) NOT NULL,
  token_out VARCHAR(42) NOT NULL,
  amount_in TEXT NOT NULL,
  amount_out TEXT NOT NULL,
  tx_hash VARCHAR(66),
  type VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Limit orders table
CREATE TABLE limit_orders (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id),
  token_in VARCHAR(42) NOT NULL,
  token_out VARCHAR(42) NOT NULL,
  amount TEXT NOT NULL,
  target_price DECIMAL NOT NULL,
  order_type VARCHAR(10) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  tx_hash VARCHAR(66),
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  executed_at TIMESTAMP,
  cancelled_at TIMESTAMP
);

-- Bridge transactions table
CREATE TABLE bridge_transactions (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id),
  source_chain VARCHAR(20) NOT NULL,
  target_chain VARCHAR(20) NOT NULL,
  token_address VARCHAR(42) NOT NULL,
  amount TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  tx_hash VARCHAR(66),
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- User settings table
CREATE TABLE user_settings (
  id SERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(user_id) UNIQUE,
  slippage_tolerance DECIMAL DEFAULT 1.0,
  gas_price TEXT DEFAULT 'auto',
  language VARCHAR(10) DEFAULT 'en',
  theme VARCHAR(10) DEFAULT 'dark',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Development

Run the bot locally:
```bash
npm run dev
```

## Testnet Information

- **RPC URL**: https://rpc.testnet.somnia.network
- **Chain ID**: 50312
- **Explorer**: https://explorer.testnet.somnia.network

### Testnet Tokens

- **USDT.g**: `0x1234567890123456789012345678901234567890` (Replace with actual address)
- **NIA**: `0x2345678901234567890123456789012345678901` (Replace with actual address)
- **PING**: `0x3456789012345678901234567890123456789012` (Replace with actual address)
- **PONG**: `0x4567890123456789012345678901234567890123` (Replace with actual address)

## Deployment

The bot is configured for deployment on Railway:

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically

### Procfile Configuration

```
worker: node bot.js
```

## Project Structure

```
somnia-trading-bot/
├── .env
├── .env.example
├── bot.js
├── Procfile
├── package.json
├── abis/
│   └── router.json
├── commands/
│   ├── start.js
│   ├── balance.js
│   ├── trade.js
│   ├── limitOrder.js
│   └── bridge.js
├── handlers/
│   ├── inlineButtons.js
│   └── inputHandler.js
├── utils/
│   ├── wallet.js
│   ├── dex.js
│   ├── limitOrders.js
│   ├── bridgeHandler.js
│   ├── imageGen.js
│   ├── tokenInfo.js
│   ├── database.js
│   └── caDetector.js
├── db/
│   └── supabase.js
├── assets/
│   ├── tokens/
│   └── trades/
└── public/
    └── trades/
```

## Features in Detail

### Trading
- Token-to-token swaps via QuickSwap Router
- Slippage protection (1% default)
- Gas limit optimization (300,000)
- Real-time price calculation

### Limit Orders
- Buy/Sell limit orders with target prices
- Background monitoring every 5 minutes
- Automatic execution when conditions are met
- Order management (create, view, cancel)

### Bridging
- One-way bridging from testnets to Somnia
- Support for Sepolia ETH, Mumbai USDT, BSC Test BNB
- Transaction status tracking
- Retry mechanism for failed bridges

### Security
- AES-256-GCM encryption for private keys
- Auto-deletion of sensitive messages
- Input sanitization
- No logging of sensitive data

### UI/UX
- 3-column grid button layout
- Markdown formatting
- Persistent navigation
- Real-time updates

## API Endpoints

The bot uses the following external services:
- **Somnia RPC**: For blockchain interactions
- **Supabase**: For data storage
- **Telegram Bot API**: For messaging

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please contact:
- Telegram: @support
- Email: support@somnia.network
- Discord: https://discord.gg/somnia

---

**Note**: This bot is designed for the Somnia testnet. All transactions and balances are displayed using raw token values and symbols only. No USD or fiat values are shown. 