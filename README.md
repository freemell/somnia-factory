# Somnia Trading Bot

A Telegram-based trading bot for the Somnia blockchain that supports multiple users and provides a button-based interface for trading, limit orders, and cross-chain transfers.

## Features

- 🎯 Button-only interface (no typing required)
- 💼 Automatic wallet creation
- 🔑 Secure wallet import
- 💱 Token trading on Somnia DEX
- ⏱️ Limit orders
- 🌉 Cross-chain bridging
- 📊 Trade result images
- 🚀 Railway deployment ready

## Prerequisites

- Node.js >= 18.0.0
- Telegram Bot Token
- Supabase Account
- CoinGecko API Key
- Somnia RPC URL
- DEX Router Contract Address

## Environment Variables

Create a `.env` file with the following variables:

```env
BOT_TOKEN=your_telegram_bot_token
PRIVATE_KEY=your_bot_wallet_private_key
RPC_URL=https://rpc.somnia.network
DEX_ROUTER=your_dex_router_address
DEX_ABI_PATH=./utils/abi.json
PRICE_API_KEY=your_coingecko_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
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
```

4. Add template image:
- Place your trade result template at `public/template.png`

## Development

Run the bot locally:
```bash
npm run dev
```

## Deployment

The bot is configured for deployment on Railway. Simply connect your GitHub repository to Railway and it will automatically deploy.

## Project Structure

```
somnia-trading-bot/
├── .env
├── bot.js
├── Procfile
├── package.json
├── commands/
│   ├── start.js
│   ├── balance.js
│   ├── trade.js
│   ├── limitOrder.js
│   ├── bridge.js
├── utils/
│   ├── wallet.js
│   ├── dex.js
│   ├── limitOrders.js
│   ├── priceFetcher.js
│   ├── imageGen.js
│   └── validator.js
├── db/
│   └── supabase.js
├── public/
│   └── template.png
```

## Security

- Private keys are encrypted using AES-256-GCM
- Messages containing private keys are immediately deleted
- All sensitive data is stored in Supabase with proper encryption

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 