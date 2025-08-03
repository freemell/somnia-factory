const { ethers } = require('ethers');

// Insomnia DEX Factory Configuration
const DEX_CONFIG = {
  factoryAddress: '0xEc0a2Fa70BFAC604287eF479E9D1E14fF41f3075',
  rpcUrl: 'https://dream-rpc.somnia.network/',
  chainId: 50312,
  feeTiers: {
    500: 0.0005,   // 0.05%
    3000: 0.003,   // 0.3%
    10000: 0.01    // 1%
  },
  // STT token address on Somnia mainnet
  sttAddress: '0x4A3BC48C156384f9564Fd65A53a2f3D534D8f2b7'
};

// Minimal ABI for Factory operations
const FACTORY_ABI = [
  'function allPools(uint256) external view returns (address)',
  'function poolByPair(address, address) external view returns (address)',
  'function poolCount() external view returns (uint256)',
  'function owner() external view returns (address)',
  'function poolDeployer() external view returns (address)',
  'function defaultFee() external view returns (uint16)',
  'function defaultTickSpacing() external view returns (int24)'
];

// Minimal ABI for Pool operations
const POOL_ABI = [
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function fee() external view returns (uint16)',
  'function tickSpacing() external view returns (int24)',
  'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function liquidity() external view returns (uint128)',
  'function getReserves() external view returns (uint256 reserve0, uint256 reserve1, uint32 blockTimestampLast)'
];

// Minimal ABI for ERC20 tokens
const ERC20_ABI = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address) external view returns (uint256)'
];

class DexService {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(DEX_CONFIG.rpcUrl);
    this.factory = new ethers.Contract(DEX_CONFIG.factoryAddress, FACTORY_ABI, this.provider);
  }

  // Get factory information
  async getFactoryInfo() {
    try {
      const [owner, poolDeployer, defaultFee, defaultTickSpacing, poolCount] = await Promise.all([
        this.factory.owner(),
        this.factory.poolDeployer(),
        this.factory.defaultFee(),
        this.factory.defaultTickSpacing(),
        this.factory.poolCount()
      ]);

      return {
        address: DEX_CONFIG.factoryAddress,
        owner: owner,
        poolDeployer: poolDeployer,
        defaultFee: Number(defaultFee),
        defaultTickSpacing: Number(defaultTickSpacing),
        poolCount: Number(poolCount),
        feeTiers: DEX_CONFIG.feeTiers
      };
    } catch (error) {
      console.error('Error getting factory info:', error);
      throw error;
    }
  }

  // Get all trading pairs
  async getAllPairs() {
    try {
      const poolCount = await this.factory.poolCount();
      const pairs = [];

      for (let i = 0; i < Number(poolCount); i++) {
        try {
          const poolAddress = await this.factory.allPools(i);
          const pool = new ethers.Contract(poolAddress, POOL_ABI, this.provider);
          
          const [token0, token1, fee] = await Promise.all([
            pool.token0(),
            pool.token1(),
            pool.fee()
          ]);

          // Get token info
          const token0Contract = new ethers.Contract(token0, ERC20_ABI, this.provider);
          const token1Contract = new ethers.Contract(token1, ERC20_ABI, this.provider);

          const [token0Symbol, token1Symbol] = await Promise.all([
            token0Contract.symbol(),
            token1Contract.symbol()
          ]);

          pairs.push({
            poolAddress: poolAddress,
            token0: {
              address: token0,
              symbol: token0Symbol
            },
            token1: {
              address: token1,
              symbol: token1Symbol
            },
            fee: Number(fee),
            feePercentage: DEX_CONFIG.feeTiers[Number(fee)] || 'Unknown'
          });
        } catch (error) {
          console.error(`Error getting pool ${i}:`, error);
          continue;
        }
      }

      return pairs;
    } catch (error) {
      console.error('Error getting all pairs:', error);
      throw error;
    }
  }

  // Get pool for token pair
  async getPool(tokenA, tokenB) {
    try {
      // Normalize addresses
      const normalizedTokenA = tokenA.toLowerCase();
      const normalizedTokenB = tokenB.toLowerCase();
      
      // Try both directions since token order matters
      let poolAddress = await this.factory.poolByPair(normalizedTokenA, normalizedTokenB);
      
      if (poolAddress === ethers.ZeroAddress) {
        // Try reverse order
        poolAddress = await this.factory.poolByPair(normalizedTokenB, normalizedTokenA);
      }
      
      if (poolAddress === ethers.ZeroAddress) {
        console.log(`No pool found for ${tokenA} and ${tokenB}`);
        return null;
      }

      const pool = new ethers.Contract(poolAddress, POOL_ABI, this.provider);
      const [token0, token1, fee, slot0, liquidity] = await Promise.all([
        pool.token0(),
        pool.token1(),
        pool.fee(),
        pool.slot0(),
        pool.liquidity()
      ]);

      return {
        address: poolAddress,
        token0: token0,
        token1: token1,
        fee: Number(fee),
        sqrtPriceX96: slot0[0],
        tick: Number(slot0[1]),
        liquidity: liquidity
      };
    } catch (error) {
      console.error('Error getting pool:', error);
      return null;
    }
  }

  // Get current price for token pair
  async getPrice(tokenA, tokenB) {
    try {
      const pool = await this.getPool(tokenA, tokenB);
      if (!pool) {
        throw new Error('Pool not found for token pair');
      }

      const sqrtPriceX96 = pool.sqrtPriceX96;
      const price = (Number(sqrtPriceX96) / 2**96) ** 2;

      // Determine which token is token0 vs token1
      const token0Contract = new ethers.Contract(pool.token0, ERC20_ABI, this.provider);
      const token1Contract = new ethers.Contract(pool.token1, ERC20_ABI, this.provider);

      const [token0Decimals, token1Decimals] = await Promise.all([
        token0Contract.decimals(),
        token1Contract.decimals()
      ]);

      // Adjust price based on decimals
      const decimalAdjustment = 10 ** (Number(token1Decimals) - Number(token0Decimals));
      const adjustedPrice = price * decimalAdjustment;

      return {
        price: adjustedPrice,
        inversePrice: 1 / adjustedPrice,
        fee: pool.fee,
        feePercentage: DEX_CONFIG.feeTiers[pool.fee] || 'Unknown',
        liquidity: pool.liquidity.toString()
      };
    } catch (error) {
      console.error('Error getting price:', error);
      throw error;
    }
  }

  // Get swap quote
  async getQuote(tokenA, tokenB, amountIn) {
    try {
      const pool = await this.getPool(tokenA, tokenB);
      if (!pool) {
        // Provide a fallback quote when pool doesn't exist
        console.log(`No pool found for ${tokenA} and ${tokenB}, providing fallback quote`);
        
        // Get token info for both tokens
        const [tokenAInfo, tokenBInfo] = await Promise.all([
          this.getTokenInfo(tokenA),
          this.getTokenInfo(tokenB)
        ]);
        
        // Provide a simulated quote (1:1 ratio for demo purposes)
        const simulatedPrice = 1.0; // 1 tokenA = 1 tokenB
        const fee = 0.003; // 0.3% fee
        const amountOut = amountIn * simulatedPrice * (1 - fee);
        
        return {
          tokenIn: tokenA,
          tokenOut: tokenB,
          amountIn: amountIn,
          amountOut: amountOut,
          price: simulatedPrice,
          fee: fee,
          feeAmount: amountIn * fee,
          poolAddress: null,
          isSimulated: true
        };
      }

      // This is a simplified quote calculation
      // In a real implementation, you'd use the actual DEX math
      const price = await this.getPrice(tokenA, tokenB);
      const fee = price.feePercentage;
      
      // Calculate amount out (simplified)
      const amountOut = amountIn * price.price * (1 - fee);

      return {
        tokenIn: tokenA,
        tokenOut: tokenB,
        amountIn: amountIn,
        amountOut: amountOut,
        price: price.price,
        fee: fee,
        feeAmount: amountIn * fee,
        poolAddress: pool.address,
        isSimulated: false
      };
    } catch (error) {
      console.error('Error getting quote:', error);
      throw error;
    }
  }

  // Validate token address
  isValidAddress(address) {
    try {
      return ethers.isAddress(address);
    } catch {
      return false;
    }
  }

  // Get token info
  async getTokenInfo(tokenAddress) {
    try {
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const [name, symbol, decimals] = await Promise.all([
        token.name(),
        token.symbol(),
        token.decimals()
      ]);

      return {
        address: tokenAddress,
        name: name,
        symbol: symbol,
        decimals: Number(decimals)
      };
    } catch (error) {
      console.error('Error getting token info:', error);
      throw error;
    }
  }
}

module.exports = DexService; 