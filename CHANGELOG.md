# Changelog

All notable changes to the Somnia Trading Bot will be documented in this file.

## [1.0.0] - 2024-06-22

### Added
- **DEX Integration**: Integrated QuickSwap Router with Uniswap V2 ABI
  - Token-to-token swaps with slippage handling
  - Fixed gas limit (300,000) for reliable transactions
  - Real-time price calculation via `getAmountsOut`
  - Support for USDT.g, NIA, PING, PONG tokens

- **Limit Orders System**: Complete limit order functionality
  - Buy/Sell limit orders with target prices
  - Background monitoring every 5 minutes
  - Automatic execution when price conditions are met
  - Order management (create, view, cancel)
  - Database storage with Supabase

- **Trade History**: Comprehensive trade tracking
  - Save all trades to Supabase database
  - View last 10 trades with transaction hashes
  - Trade type classification (buy/sell)
  - Timestamp tracking

- **Enhanced UI/UX**: Modern 3-column grid layout
  - BONKbot/Trojan-style button organization
  - Markdown formatting for better readability
  - Persistent navigation buttons
  - Improved error handling and user feedback

- **Airdrop Farming**: Simulation system for future airdrops
  - Micro-trade tracking for activity scoring
  - Farm points system
  - Leaderboard preparation

- **Security Improvements**: Enhanced security measures
  - AES-256-GCM encryption for private keys
  - Auto-deletion of sensitive messages after 10 seconds
  - Input sanitization for all user inputs
  - No logging of sensitive information

### Changed
- **Button Layout**: Completely redesigned to 3-column grid
  - Main menu: 3x3 grid with logical grouping
  - Token-specific buttons: Action + Amount + Info
  - Persistent controls: Menu + Refresh + Help

- **Database Schema**: Extended Supabase tables
  - Added `limit_orders` table with full order tracking
  - Added `bridge_transactions` table for cross-chain transfers
  - Added `user_settings` table for preferences
  - Enhanced `trades` table with better structure

- **DEX Implementation**: Updated to use proper router ABI
  - Moved from generic ABI to Uniswap V2 specific functions
  - Added slippage calculation utilities
  - Improved error handling and gas estimation

- **Bridge System**: Enhanced testnet bridging
  - Support for Sepolia ETH, Mumbai USDT, BSC Test BNB
  - Transaction status tracking
  - Retry mechanism for failed bridges

### Fixed
- **Import Issues**: Fixed CommonJS/ES6 module conflicts
  - Updated all imports to use `require()` syntax
  - Fixed ABI loading from JSON files
  - Resolved ethers.js compatibility issues

- **Error Handling**: Improved error management
  - Better error messages for users
  - Graceful handling of network failures
  - Proper cleanup on errors

- **Database Operations**: Fixed Supabase integration
  - Proper error handling for database operations
  - Transaction rollback on failures
  - Better data validation

### Removed
- **Price Fetcher**: Removed external price API dependency
  - Now uses on-chain price calculation only
  - Reduced external dependencies
  - Improved reliability and speed

- **Legacy Code**: Cleaned up unused functions
  - Removed deprecated button handlers
  - Simplified command structure
  - Streamlined utility functions

### Technical Improvements
- **Code Organization**: Better file structure
  - Separated concerns into logical modules
  - Improved code reusability
  - Better documentation and comments

- **Performance**: Optimized for speed and reliability
  - Reduced API calls to external services
  - Improved database query efficiency
  - Better memory management

- **Deployment**: Railway-ready configuration
  - Updated Procfile for worker deployment
  - Environment variable documentation
  - Proper logging configuration

## [0.9.0] - 2024-06-21

### Added
- Initial Telegram bot setup
- Basic wallet creation and import
- Simple button interface
- Supabase database integration
- Basic bridge functionality

### Changed
- Basic UI with single-column buttons
- Simple trade interface
- Basic error handling

## Migration Guide

### From v0.9.0 to v1.0.0

1. **Database Migration**: Run the new SQL schema to create additional tables
2. **Environment Variables**: Update `.env` file with new variables
3. **Token Addresses**: Replace placeholder addresses with actual testnet addresses
4. **Button Handlers**: Update any custom button handlers to use new patterns

### Breaking Changes
- Button callback patterns have changed
- Database schema requires migration
- Some utility functions have been renamed

## Future Roadmap

### Planned Features
- **Advanced Trading**: Stop-loss orders, DCA functionality
- **Portfolio Management**: Portfolio tracking and analytics
- **Social Features**: Copy trading, leaderboards
- **Mobile App**: Native mobile application
- **API Access**: REST API for external integrations

### Technical Improvements
- **Performance**: Caching layer for frequently accessed data
- **Scalability**: Microservices architecture
- **Monitoring**: Advanced logging and monitoring
- **Testing**: Comprehensive test suite

---

For detailed setup instructions, see the [README.md](README.md) file. 