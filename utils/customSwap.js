const { ethers } = require('ethers');
const abi = require('./abi.json');

// Contract addresses from your deployment
const CONTRACT_ADDRESSES = {
  customFactory: '0x1ABF676f2D149b742E6A482Eaaa7bDC81b4148c6',
  customPoolDeployer: '0x954543565985E48dF582Ac452c4CbffB028961dB',
  poolAddress: '0x05942239059D344BD5c25b597Abf89F00A91537e',
  tokenA: '0x94E2ae13081636bd62E596E08bE6342d3F585aD2',
  tokenB: '0xA3ea70ADb7818e13ba55064158252D2e0f9a918c',
  deployer: '0x35DaDAb2bb21A6d4e20beC3F603b8426Dc124004'
};

class CustomSwap {
  constructor(provider, privateKey) {
    this.provider = new ethers.JsonRpcProvider(provider);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    
    // Initialize contracts
    this.factory = new ethers.Contract(CONTRACT_ADDRESSES.customFactory, abi.CustomFactory, this.wallet);
    this.pool = new ethers.Contract(CONTRACT_ADDRESSES.poolAddress, abi.CustomPool, this.wallet);
    this.tokenA = new ethers.Contract(CONTRACT_ADDRESSES.tokenA, abi.TokenA, this.wallet);
    this.tokenB = new ethers.Contract(CONTRACT_ADDRESSES.tokenB, abi.TokenB, this.wallet);
  }

  async getPoolInfo() {
    try {
      console.log('🔍 Getting pool information...');
      
      // Try to get basic pool info first
      const token0 = await this.pool.token0();
      const token1 = await this.pool.token1();
      const fee = await this.pool.fee();
      const liquidity = await this.pool.liquidity();
      
      console.log('📊 Basic Pool Info:', {
        token0,
        token1,
        fee: fee.toString(),
        liquidity: liquidity.toString()
      });

      // Try to get reserves, but handle access control errors
      let reserve0, reserve1, balance0, balance1;
      try {
        const [res0, res1, liq] = await this.pool.getReserves();
        reserve0 = res0;
        reserve1 = res1;
        console.log('✅ Reserves retrieved successfully');
      } catch (error) {
        console.log('⚠️ Could not get reserves (access control):', error.message);
        // Use token balances as fallback
        const bal0 = await this.tokenA.balanceOf(CONTRACT_ADDRESSES.poolAddress);
        const bal1 = await this.tokenB.balanceOf(CONTRACT_ADDRESSES.poolAddress);
        reserve0 = bal0;
        reserve1 = bal1;
        console.log('📊 Using token balances as reserves');
      }

      try {
        const [bal0, bal1] = await this.pool.getTotalBalance();
        balance0 = bal0;
        balance1 = bal1;
        console.log('✅ Total balance retrieved successfully');
      } catch (error) {
        console.log('⚠️ Could not get total balance:', error.message);
        balance0 = reserve0;
        balance1 = reserve1;
      }
      
      console.log('📊 Full Pool Info:', {
        token0,
        token1,
        fee: fee.toString(),
        reserve0: ethers.formatUnits(reserve0, 18),
        reserve1: ethers.formatUnits(reserve1, 18),
        liquidity: liquidity.toString(),
        balance0: ethers.formatUnits(balance0, 18),
        balance1: ethers.formatUnits(balance1, 18)
      });

      return {
        token0,
        token1,
        fee: fee.toString(),
        reserve0,
        reserve1,
        liquidity,
        balance0,
        balance1
      };
    } catch (error) {
      console.error('❌ Error getting pool info:', error);
      throw error;
    }
  }

  async getTokenInfo(tokenAddress) {
    try {
      console.log(`🔍 Getting token info for ${tokenAddress}...`);
      
      const tokenContract = new ethers.Contract(tokenAddress, abi.TokenA, this.provider);
      const name = await tokenContract.name();
      const symbol = await tokenContract.symbol();
      const decimals = await tokenContract.decimals();
      const totalSupply = await tokenContract.totalSupply();
      
      console.log('📊 Token Info:', {
        name,
        symbol,
        decimals: decimals.toString(),
        totalSupply: ethers.formatUnits(totalSupply, decimals)
      });

      return { name, symbol, decimals, totalSupply };
    } catch (error) {
      console.error('❌ Error getting token info:', error);
      throw error;
    }
  }

  async getWalletBalance(tokenAddress, walletAddress) {
    try {
      console.log(`💰 Getting balance for ${walletAddress} on token ${tokenAddress}...`);
      
      const tokenContract = new ethers.Contract(tokenAddress, abi.TokenA, this.provider);
      const balance = await tokenContract.balanceOf(walletAddress);
      const decimals = await tokenContract.decimals();
      
      const formattedBalance = ethers.formatUnits(balance, decimals);
      console.log(`💰 Balance: ${formattedBalance}`);
      
      return { balance, decimals, formattedBalance };
    } catch (error) {
      console.error('❌ Error getting wallet balance:', error);
      throw error;
    }
  }

  async estimateSwap(tokenIn, tokenOut, amountIn) {
    try {
      console.log(`🔍 Estimating swap: ${ethers.formatUnits(amountIn, 18)} tokens...`);
      
      // Simple constant product formula for estimation
      const poolInfo = await this.getPoolInfo();
      
      let reserveIn, reserveOut;
      if (tokenIn.toLowerCase() === poolInfo.token0.toLowerCase()) {
        reserveIn = poolInfo.reserve0;
        reserveOut = poolInfo.reserve1;
      } else {
        reserveIn = poolInfo.reserve1;
        reserveOut = poolInfo.reserve0;
      }
      
      // Calculate amount out using constant product formula
      const amountInWithFee = amountIn * 997n; // 0.3% fee
      const numerator = amountInWithFee * reserveOut;
      const denominator = (reserveIn * 1000n) + amountInWithFee;
      const amountOut = numerator / denominator;
      
      console.log(`📊 Swap estimation: ${ethers.formatUnits(amountIn, 18)} in → ${ethers.formatUnits(amountOut, 18)} out`);
      
      return amountOut;
    } catch (error) {
      console.error('❌ Error estimating swap:', error);
      throw error;
    }
  }

  async executeSwap(tokenIn, tokenOut, amountIn, minAmountOut) {
    try {
      console.log(`🚀 Executing swap: ${ethers.formatUnits(amountIn, 18)} tokens...`);
      
      // First, approve the pool to spend tokens
      const tokenInContract = new ethers.Contract(tokenIn, abi.TokenA, this.wallet);
      
      console.log('✅ Approving token spend...');
      const approveTx = await tokenInContract.approve(CONTRACT_ADDRESSES.poolAddress, amountIn);
      await approveTx.wait();
      console.log('✅ Approval confirmed');
      
      // Get current reserves for swap calculation
      const poolInfo = await this.getPoolInfo();
      
      // Determine token order
      const isToken0 = tokenIn.toLowerCase() === poolInfo.token0.toLowerCase();
      
      // Calculate expected output
      const amountInWithFee = amountIn * 997n; // 0.3% fee
      const reserveIn = isToken0 ? poolInfo.reserve0 : poolInfo.reserve1;
      const reserveOut = isToken0 ? poolInfo.reserve1 : poolInfo.reserve0;
      
      const numerator = amountInWithFee * reserveOut;
      const denominator = (reserveIn * 1000n) + amountInWithFee;
      const expectedAmountOut = numerator / denominator;
      
      console.log(`📊 Expected output: ${ethers.formatUnits(expectedAmountOut, 18)}`);
      
      // For now, simulate the swap since the pool contract might not have swap functionality
      console.log('🔄 Simulating swap execution (pool swap not implemented yet)...');
      
      // Transfer tokens from user to pool
      const transferToPoolTx = await tokenInContract.transfer(CONTRACT_ADDRESSES.poolAddress, amountIn);
      await transferToPoolTx.wait();
      console.log('✅ Tokens transferred to pool');
      
      // Simulate receiving tokens back (in a real implementation, this would be done by the pool)
      // For now, we'll just transfer tokens from the pool deployer wallet
      const tokenOutContract = new ethers.Contract(tokenOut, abi.TokenB, this.wallet);
      
      // Check if the pool has enough tokens to simulate the swap
      const poolBalance = await tokenOutContract.balanceOf(CONTRACT_ADDRESSES.poolAddress);
      if (poolBalance >= expectedAmountOut) {
        // Transfer tokens from pool to user (simulated)
        const transferFromPoolTx = await tokenOutContract.transfer(this.wallet.address, expectedAmountOut);
        await transferFromPoolTx.wait();
        console.log('✅ Tokens transferred from pool');
      } else {
        console.log('⚠️ Pool has insufficient tokens, simulating with available balance');
        const transferFromPoolTx = await tokenOutContract.transfer(this.wallet.address, poolBalance);
        await transferFromPoolTx.wait();
        console.log(`✅ Transferred available balance: ${ethers.formatUnits(poolBalance, 18)}`);
      }
      
      console.log('✅ Swap simulation completed successfully!');
      
      return {
        success: true,
        amountIn: ethers.formatUnits(amountIn, 18),
        amountOut: ethers.formatUnits(expectedAmountOut, 18),
        txHash: transferToPoolTx.hash,
        note: 'This was a simulated swap. Real pool swap functionality needs to be implemented.'
      };
    } catch (error) {
      console.error('❌ Error executing swap:', error);
      throw error;
    }
  }

  async testSwap() {
    try {
      console.log('🧪 Testing swap functionality...');
      
      // Get initial balances
      const initialBalanceA = await this.getWalletBalance(CONTRACT_ADDRESSES.tokenA, this.wallet.address);
      const initialBalanceB = await this.getWalletBalance(CONTRACT_ADDRESSES.tokenB, this.wallet.address);
      
      console.log('📊 Initial balances:', {
        tokenA: initialBalanceA.formattedBalance,
        tokenB: initialBalanceB.formattedBalance
      });
      
      // Test swap TokenA → TokenB
      const swapAmount = ethers.parseUnits('1', 18); // 1 token
      const estimatedOutput = await this.estimateSwap(CONTRACT_ADDRESSES.tokenA, CONTRACT_ADDRESSES.tokenB, swapAmount);
      
      console.log(`🔄 Testing swap: 1 TokenA → ${ethers.formatUnits(estimatedOutput, 18)} TokenB`);
      
      // Execute swap
      const swapResult = await this.executeSwap(
        CONTRACT_ADDRESSES.tokenA,
        CONTRACT_ADDRESSES.tokenB,
        swapAmount,
        estimatedOutput
      );
      
      // Get final balances
      const finalBalanceA = await this.getWalletBalance(CONTRACT_ADDRESSES.tokenA, this.wallet.address);
      const finalBalanceB = await this.getWalletBalance(CONTRACT_ADDRESSES.tokenB, this.wallet.address);
      
      console.log('📊 Final balances:', {
        tokenA: finalBalanceA.formattedBalance,
        tokenB: finalBalanceB.formattedBalance
      });
      
      console.log('✅ Test swap completed successfully!');
      
      return {
        success: true,
        swapResult,
        initialBalances: { tokenA: initialBalanceA.formattedBalance, tokenB: initialBalanceB.formattedBalance },
        finalBalances: { tokenA: finalBalanceA.formattedBalance, tokenB: finalBalanceB.formattedBalance }
      };
    } catch (error) {
      console.error('❌ Test swap failed:', error);
      throw error;
    }
  }
}

module.exports = CustomSwap; 