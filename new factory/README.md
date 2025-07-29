# Somnia Testnet Factory Bot

A modular factory contract for deploying `CustomPool` instances on the Somnia Testnet (Shannon Testnet), designed for DeFi bot interactions with proper liquidity tracking and security features.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- STT tokens for gas fees (get from [Somnia Testnet Faucet](https://testnet.somnia.network/))

### Installation
```bash
npm install
```

### Compile Contracts
```bash
npm run compile
```

### Deploy Factory
```bash
npm run deploy:factory
```

### Deploy Test Tokens
```bash
npm run deploy:test-tokens
```

### Run Bot
```bash
npm run start:bot
```

## 📋 Network Information

- **Network**: Somnia Testnet (Shannon Testnet)
- **Chain ID**: 50312
- **RPC URL**: https://dream-rpc.somnia.network/
- **Block Explorer**: https://shannon-explorer.somnia.network/
- **Symbol**: STT
- **Faucet**: https://testnet.somnia.network/

## 🏗️ Architecture

### Contracts

#### Factory.sol
- **Purpose**: Deploys and manages `CustomPool` instances
- **Key Functions**:
  - `createPool(tokenA, tokenB, fee, tickSpacing)` - Creates new pools
  - `getPool(tokenA, tokenB, fee)` - Retrieves pool address
  - `allPoolsLength()` - Returns total number of pools
  - `getPoolByIndex(index)` - Returns pool by index

#### CustomPool.sol
- **Purpose**: Individual pool contract with liquidity management
- **Key Functions**:
  - `getTotalBalance()` - Returns token balances (owner only)
  - `getReserves()` - Returns reserves and liquidity (owner only)
  - `addLiquidity(amount)` - Adds liquidity to pool
  - `removeLiquidity(amount)` - Removes liquidity from pool
  - `transferOwnership(newOwner)` - Transfers pool ownership

#### TestToken.sol
- **Purpose**: Simple ERC20 token for testing
- **Features**: Mintable tokens with 1M initial supply

### Bot Integration

The `bot.js` file provides a complete interface for interacting with the factory:

```javascript
const SomniaBot = require('./bot.js');

// Initialize bot with factory address
const bot = new SomniaBot('YOUR_FACTORY_ADDRESS');

// Get factory information
await bot.getFactoryInfo();

// Create a pool
const poolAddress = await bot.createPool(tokenA, tokenB, 3000, 60);

// Add liquidity
await bot.addLiquidity(poolAddress, 1000);

// Get pool information
await bot.getPoolInfo(poolAddress);

// Get balances and reserves
await bot.getTotalBalance(poolAddress);
await bot.getReserves(poolAddress);
```

## 🔧 Configuration

### Environment Setup
The project uses the provided private key for deployment:
```
PRIVATE_KEY=99f33cb471e638d3d5a7cad46f712f2365710618e9afe3cf3e1c0e94f2c1eb1d
```

### Hardhat Configuration
```javascript
// hardhat.config.js
networks: {
  somnia: {
    url: "https://dream-rpc.somnia.network/",
    chainId: 50312,
    accounts: ["99f33cb471e638d3d5a7cad46f712f2365710618e9afe3cf3e1c0e94f2c1eb1d"],
    gasPrice: 1000000000, // 1 gwei
    timeout: 60000
  }
}
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Test Coverage
- **Factory Tests**: Pool creation, management, ownership
- **CustomPool Tests**: Liquidity management, balance tracking, security
- **Integration Tests**: Factory-Pool interaction

### Key Test Scenarios
- Pool creation with different fees
- Liquidity addition and removal
- Balance and reserve tracking
- Ownership transfers
- Access control validation

## 🚀 Deployment Process

### 1. Environment Setup
```bash
# Install dependencies
npm install

# Compile contracts
npm run compile
```

### 2. Get STT Tokens
Visit [Somnia Testnet Faucet](https://testnet.somnia.network/) and request STT tokens for gas fees.

### 3. Deploy Factory
```bash
npm run deploy:factory
```
This will output the factory address. Save this for bot configuration.

### 4. Deploy Test Tokens (Optional)
```bash
npm run deploy:test-tokens
```
This creates test tokens for pool creation and testing.

### 5. Configure Bot
Update `bot.js` with your factory address:
```javascript
const FACTORY_ADDRESS = "YOUR_DEPLOYED_FACTORY_ADDRESS";
```

### 6. Test Bot
```bash
npm run start:bot
```

## 🔍 Verification

### Contract Verification
1. Visit [Somnia Explorer](https://shannon-explorer.somnia.network/)
2. Search for your deployed factory address
3. Verify the contract source code

### Transaction Monitoring
Monitor transactions on the explorer to ensure:
- Factory deployment success
- Pool creation transactions
- Liquidity operations
- Balance updates

## 🛡️ Security Features

### Access Control
- `onlyOwner` modifiers on sensitive functions
- Factory ownership management
- Pool ownership transfers

### Reentrancy Protection
- `nonReentrant` modifiers on state-changing functions
- OpenZeppelin ReentrancyGuard implementation

### Input Validation
- Zero address checks
- Identical address prevention
- Pool existence validation

## 📊 Monitoring

### Key Metrics
- Total pools created
- Liquidity levels per pool
- Token balances and reserves
- Gas usage optimization

### Bot Functions
```javascript
// Get factory statistics
await bot.getFactoryInfo();

// List all pools
await bot.listAllPools();

// Monitor specific pool
await bot.getPoolInfo(poolAddress);
await bot.getTotalBalance(poolAddress);
await bot.getReserves(poolAddress);
```

## 🔧 Troubleshooting

### Common Issues

#### Insufficient Gas
- Ensure you have enough STT tokens
- Check gas price settings in hardhat config

#### Contract Not Found
- Verify factory address in bot configuration
- Check network connection

#### Permission Denied
- Ensure you're using the correct private key
- Check ownership of factory and pools

#### RPC Connection Issues
- Verify RPC URL is accessible
- Check network status

### Debug Commands
```bash
# Check network connection
npx hardhat console --network somnia

# Verify contract deployment
npx hardhat verify --network somnia FACTORY_ADDRESS

# Run specific tests
npx hardhat test test/Factory.test.js
```

## 📈 Performance Optimization

### Gas Optimization
- Contract compilation with optimizer enabled
- Efficient storage patterns
- Minimal external calls

### Bot Optimization
- Batch operations where possible
- Efficient event listening
- Connection pooling

## 🔄 Maintenance

### Regular Tasks
- Monitor pool performance
- Update liquidity levels
- Check for new token pairs
- Verify contract security

### Updates
- Keep dependencies updated
- Monitor for security patches
- Test new features on testnet

## 📚 Resources

- [Somnia Documentation](https://docs.somnia.network/)
- [Somnia Discord](https://discord.gg/somnia)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

This is experimental software for testing purposes on Somnia Testnet. Use at your own risk and never use the provided private key on mainnet or with real funds.

---

**Deployment Status**: Ready for Somnia Testnet
**Last Updated**: July 28, 2025
**Version**: 1.0.0 