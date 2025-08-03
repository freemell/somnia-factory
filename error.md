PS C:\Users\1\Documents\milla projects\somnia-trading-bot> node bot.js
[DEBUG] SUPABASE_URL: [set]
[DEBUG] SUPABASE_KEY: [set]      
[DEBUG] TELEGRAM_BOT_TOKEN: [set]
[DEBUG] RPC_URL: [set]
Supabase client initialized. URL: Loaded
[DEX] Overriding DEX_ROUTER from .env with correct Algebra router: 0xE94de02e52Eaf9F0f6Bf7f16E4927FcBc2c09bC7  
[DEX] Overriding DEX_FACTORY_ADDRESS from .env with correct Algebra factory: 0x0BFaCE9a5c9F884a4f09fadB83b69e81EA41424B
Initializing database...
🤖 Starting Telegram bot...
🌐 Express server running on port 3000
Statement executed (may already exist): CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON ...
Statement executed (may already exist): CREATE INDEX IF NOT EXISTS idx_trades_user_id ON t...
Statement executed (may already exist): CREATE INDEX IF NOT EXISTS idx_limit_orders_user_i...
Statement executed (may already exist): CREATE INDEX IF NOT EXISTS idx_limit_orders_status...
Statement executed (may already exist): CREATE INDEX IF NOT EXISTS idx_bridge_transactions...
Statement executed (may already exist): CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON a...
Statement executed (may already exist): CREATE INDEX IF NOT EXISTS idx_user_settings_user_...
Statement executed (may already exist): CREATE INDEX IF NOT EXISTS idx_user_positions_user...
Statement executed (may already exist): CREATE INDEX IF NOT EXISTS idx_user_positions_toke...
Database initialized successfully
🔍 Token detection: 0xab477d0094b975173f12f5cc7ffff4ee8ba22283
🔍 Testnet tokens: [
  '0x4a3bc48c156384f9564fd65a53a2f3d534d8f2b7',
  '0x33e7fab0a8a5da1a923180989bd617c9c2d1c493',
  '0x0c726e446865ffb19cc13f21abf0f515106c9662',
  '0xab477d0094b975173f12f5cc7ffff4ee8ba22283' 
]
🔍 Is testnet token: true
🔍 Is INSOMN token: false
🎯 Processing testnet token: 0xab477d0094b975173f12F5Cc7fffF4EE8BA22283
📋 Testnet token info: {
  name: 'Test Token',
  symbol: 'TEST',
  decimals: 18,
  address: '0xab477d0094b975173f12F5Cc7fffF4EE8BA22283',
  isTestnet: true
}
🔍 [DEBUG] testnetSwap.getWalletBalance - Starting...
🔍 [DEBUG] testnetSwap.getWalletBalance - Token address: 0xab477d0094b975173f12F5Cc7fffF4EE8BA22283
🔍 [DEBUG] testnetSwap.getWalletBalance - Provider available: true
🔍 [DEBUG] testnetSwap.getWalletBalance - Wallet available: true
❌ [DEBUG] testnetSwap.getWalletBalance - Error getting balance for 0xab477d0094b975173f12F5Cc7fffF4EE8BA22283: 
Cannot read properties of undefined (reading 'formatJson')
❌ [DEBUG] testnetSwap.getWalletBalance - Error stack: TypeError: Cannot read properties of undefined (reading '
formatJson')
    at Interface.from (C:\Users\1\Documents\milla projects\somnia-trading-bot\node_modules\ethers\lib.commonjs\abi\interface.js:1098:27)
    at new BaseContract (C:\Users\1\Documents\milla projects\somnia-trading-bot\node_modules\ethers\lib.commonjs\contract\contract.js:550:44)
    at new Contract (C:\Users\1\Documents\milla projects\somnia-trading-bot\node_modules\ethers\lib.commonjs\contract\contract.js:957:1)
    at TestnetSwap.getWalletBalance (C:\Users\1\Documents\milla projects\somnia-trading-bot\utils\testnetSwap.js:66:21)
    at handleTokenAddressInput (C:\Users\1\Documents\milla projects\somnia-trading-bot\bot.js:336:48)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async C:\Users\1\Documents\milla projects\somnia-trading-bot\bot.js:176:5
    at async execute (C:\Users\1\Documents\milla projects\somnia-trading-bot\node_modules\telegraf\lib\composer.js:518:17)
    at async C:\Users\1\Documents\milla projects\somnia-trading-bot\node_modules\telegraf\lib\composer.js:519:21
    at async execute (C:\Users\1\Documents\milla projects\somnia-trading-bot\node_modules\telegraf\lib\composer.js:518:17)
💰 Token balance: 0
🚀 Executing testnet buy...
🔄 Executing testnet swap: 1 WSTT → 1.500000 TEST
🔍 [DEBUG] handlePositions - User ID: 6667190190
🔍 [DEBUG] handlePositions - Positions: [
  {
    tokenAddress: 'TKB',
    tokenSymbol: 'TKB...',
    amount: 12,
    totalBought: 12,
    totalSold: 0,
    lastTrade: '2025-08-01T16:43:33.35+00:00'
  },
  {
    tokenAddress: 'INSOMN',
    tokenSymbol: 'INSOMN...',
    amount: 2000.9969999999998,
    totalBought: 2000.9969999999998,
    totalSold: 0,
    lastTrade: '2025-08-01T13:56:46.873+00:00'
  }
]
🔍 [DEBUG] handlePositions - Position: {
  tokenAddress: 'TKB',
  tokenSymbol: 'TKB...',
  amount: 12,
  totalBought: 12,
  totalSold: 0,
  lastTrade: '2025-08-01T16:43:33.35+00:00'
}
🔍 [DEBUG] handlePositions - Position tokenAddress: TKB
🔍 [DEBUG] handlePositions - Position tokenSymbol: TKB...
🔍 [DEBUG] handlePositions - Position: {
  tokenAddress: 'INSOMN',
  tokenSymbol: 'INSOMN...',
  amount: 2000.9969999999998,
  totalBought: 2000.9969999999998,
  totalSold: 0,
  lastTrade: '2025-08-01T13:56:46.873+00:00'
}
🔍 [DEBUG] handlePositions - Position tokenAddress: INSOMN
🔍 [DEBUG] handlePositions - Position tokenSymbol: INSOMN...
🔍 [DEBUG] handlePositions - Creating button for pos: {
  tokenAddress: 'TKB',
  tokenSymbol: 'TKB...',
  amount: 12,
  totalBought: 12,
  totalSold: 0,
  lastTrade: '2025-08-01T16:43:33.35+00:00'
}
🔍 [DEBUG] handlePositions - pos.tokenAddress: TKB
🔍 [DEBUG] handlePositions - pos.tokenAddress isAddress: false
🔍 [DEBUG] handlePositions - Creating button for pos: {
  tokenAddress: 'INSOMN',
  tokenSymbol: 'INSOMN...',
  amount: 2000.9969999999998,
  totalBought: 2000.9969999999998,
  totalSold: 0,
  lastTrade: '2025-08-01T13:56:46.873+00:00'
}
🔍 [DEBUG] handlePositions - pos.tokenAddress: INSOMN
🔍 [DEBUG] handlePositions - pos.tokenAddress isAddress: false
Invalid address format: position_TKB
[DB] Attempting to get wallet for user_id: 6667190190
[DB] Supabase data for user_id 6667190190: Wallet found with address 0x8dD48c9064263D5BDE11022F0Cfc9797c1E69d62Invalid address format: position_TKB
🔍 [DEBUG] trade.js - Action: sell
🔍 [DEBUG] trade.js - Token address: position_TKB
🔍 [DEBUG] trade.js - Amount: 1.0
🔍 [DEBUG] trade.js - WSTT address: 0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7
🔍 [DEBUG] trade.js - Path: [ 'position_TKB', '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7' ]
🔍 [DEBUG] trade.js - Path[0]: position_TKB
🔍 [DEBUG] trade.js - Path[1]: 0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7
🔍 [DEBUG] trade.js - Path[0] isAddress: false
🔍 [DEBUG] trade.js - Path[1] isAddress: true
🔍 [DEBUG] getAmountsOut - Starting amount calculation...
🔍 [DEBUG] getAmountsOut - Path: [ 'position_TKB', '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7' ]
🔍 [DEBUG] getAmountsOut - AmountIn: 1000000000000000000
🔍 [DEBUG] getAmountsOut - Fee tier: 3000
🔍 [DEBUG] getAmountsOut - Path length: 2
🔍 [DEBUG] getAmountsOut - Path[0]: position_TKB
🔍 [DEBUG] getAmountsOut - Path[0] isAddress: false
🔍 [DEBUG] getAmountsOut - Path[1]: 0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7
🔍 [DEBUG] getAmountsOut - Path[1] isAddress: true
🔍 [DEBUG] getAmountsOut - Checking contract deployment...
[DEX] Checking contract deployment...
[DEX] Router bytecode length: 25124
[DEX] Factory bytecode length: 21400
[DEX] Both router and factory contracts are deployed
🔍 [DEBUG] getAmountsOut - Deployment check result: true
🔍 [DEBUG] getAmountsOut - Validating pair...
🔍 [DEBUG] validatePair - Starting validation...
🔍 [DEBUG] validatePair - Token A: position_TKB
🔍 [DEBUG] validatePair - Token B: 0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7
🔍 [DEBUG] validatePair - Fee tier: 3000
🔍 [DEBUG] validatePair - ethers available: true
❌ [DEBUG] validatePair - Invalid token addresses: {
  tokenA: 'position_TKB',
  tokenB: '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7',
  tokenAValid: false,
  tokenBValid: true
}
🔍 [DEBUG] getAmountsOut - Pair validation result: false
Invalid address format: position_TKB
🛑 Received SIGINT, stopping bot...
PS C:\Users\1\Documents\milla projects\somnia-trading-bot> 