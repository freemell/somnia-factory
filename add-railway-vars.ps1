# Add all environment variables to Railway
Write-Host "Adding environment variables to Railway..." -ForegroundColor Green

# Telegram
npx @railway/cli variables --set "TELEGRAM_BOT_TOKEN=7685373656:AAEapxYT5ASEU7y2XtY4iBU8vqR4MGxO_WA"

# Supabase
npx @railway/cli variables --set "SUPABASE_URL=https://mmdwpfptehmfoirfmvnb.supabase.co"
npx @railway/cli variables --set "SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tZHdwZnB0ZWhtZm9pcmZtdm5iIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDI0MTE4OSwiZXhwIjoyMDY1ODE3MTg5fQ.RJX2MNKhXjh3oe9KYvYmxnf2TSHQkOaKYqyjiv3CP-U"

# RPC URLs
npx @railway/cli variables --set "RPC_URL=https://dream-rpc.somnia.network/"

# DEX Configuration
npx @railway/cli variables --set "DEX_ROUTER=0x9726bc6F5ceff07dA975Ec666a6F967390814e4d"
npx @railway/cli variables --set "DEX_FACTORY_ADDRESS=0x8669cD81994740D517661577A72B84d0a308D8b0"
npx @railway/cli variables --set "WETH_ADDRESS=0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7"

# Private Keys
npx @railway/cli variables --set "PRIVATE_KEY=6db2f8420a8388c0fe02f021c5ce1c1b5aa7e18fb8a2c57eb6f2092d4822d92d"
npx @railway/cli variables --set "PRIVATE_KeEY=3ae7706a5b3b2c8f6764b1e9a71fc7bbeafb4540c86cebc901e4f0701cc90642"
npx @railway/cli variables --set "DEPLOYER_PRIVATE_KEY=de6f545bd7fc80cb39ba45bad39b0bef4ef89247c856430e7da1f9be5630d8d8"

# Bridge Configuration
npx @railway/cli variables --set "ETH_RPC_URL=https://sepolia.infura.io/v3/a62ec105093f44dab1c2cb0947f2803e"
npx @railway/cli variables --set "SEPOLIA_RECEIVER=0x695208Bd76049B27a6EdA7082A43848C67B73CA1"
npx @railway/cli variables --set "SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/a62ec105093f44dab1c2cb0947f2803e"
npx @railway/cli variables --set "BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/"
npx @railway/cli variables --set "MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com/"

Write-Host "All environment variables added successfully!" -ForegroundColor Green 