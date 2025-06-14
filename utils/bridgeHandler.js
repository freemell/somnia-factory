const { ethers } = require('ethers');
const { supabase } = require('../db/supabase');
const { generateTradeImage } = require('./imageGen');

// Initialize providers
const sepoliaProvider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
const somniaProvider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// Bridge receiver wallet (for testnet)
const bridgeWallet = new ethers.Wallet(process.env.BRIDGE_PRIVATE_KEY, somniaProvider);

/**
 * Handles the bridge transfer process
 */
async function handleBridgeTransfer(userId, token, amount) {
  try {
    // Get user's Sepolia address
    const { data: user } = await supabase
      .from('users')
      .select('sepolia_address, somnia_address')
      .eq('telegram_id', userId)
      .single();
    
    if (!user?.sepolia_address || !user?.somnia_address) {
      return {
        success: false,
        error: 'User wallet not found'
      };
    }
    
    // Check for transfer on Sepolia
    const transferFound = await checkSepoliaTransfer(
      user.sepolia_address,
      token,
      amount
    );
    
    if (!transferFound) {
      return {
        success: false,
        error: 'Transfer not found. Please make sure you\'ve sent the tokens.'
      };
    }
    
    // Mint or transfer tokens on Somnia
    const result = await mintSomniaTokens(
      user.somnia_address,
      token,
      amount
    );
    
    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }
    
    // Generate bridge completion image
    const imagePath = await generateBridgeImage(token, amount, result.txHash);
    
    return {
      success: true,
      txHash: result.txHash,
      imagePath
    };
  } catch (error) {
    console.error('Bridge transfer error:', error);
    return {
      success: false,
      error: 'Bridge process failed. Please try again.'
    };
  }
}

/**
 * Checks for transfer on Sepolia
 */
async function checkSepoliaTransfer(fromAddress, token, amount) {
  try {
    const bridgeAddress = process.env.BRIDGE_RECEIVER_ADDRESS;
    const amountWei = ethers.parseUnits(amount, 18);
    
    // Get recent blocks
    const currentBlock = await sepoliaProvider.getBlockNumber();
    const fromBlock = currentBlock - 100; // Check last 100 blocks
    
    // Get transfer events
    const filter = {
      fromBlock,
      toBlock: currentBlock,
      address: token === 'eth' ? null : process.env[`${token.toUpperCase()}_CONTRACT`],
      topics: [
        token === 'eth' ? null : ethers.id('Transfer(address,address,uint256)'),
        fromAddress,
        bridgeAddress
      ]
    };
    
    const logs = await sepoliaProvider.getLogs(filter);
    
    // Check if any transfer matches the amount
    return logs.some(log => {
      if (token === 'eth') {
        return log.value >= amountWei;
      } else {
        const transferEvent = ethers.AbiCoder.defaultAbiCoder().decode(
          ['uint256'],
          log.data
        );
        return transferEvent[0] >= amountWei;
      }
    });
  } catch (error) {
    console.error('Check Sepolia transfer error:', error);
    return false;
  }
}

/**
 * Mints or transfers tokens on Somnia
 */
async function mintSomniaTokens(toAddress, token, amount) {
  try {
    const amountWei = ethers.parseUnits(amount, 18);
    
    // Get token contract
    const tokenContract = new ethers.Contract(
      process.env[`SOMNIA_${token.toUpperCase()}_CONTRACT`],
      [
        'function mint(address to, uint256 amount)',
        'function transfer(address to, uint256 amount)'
      ],
      bridgeWallet
    );
    
    // Mint or transfer tokens
    const tx = await tokenContract.mint(toAddress, amountWei);
    await tx.wait();
    
    return {
      success: true,
      txHash: tx.hash
    };
  } catch (error) {
    console.error('Mint Somnia tokens error:', error);
    return {
      success: false,
      error: 'Failed to mint tokens on Somnia'
    };
  }
}

/**
 * Generates a bridge completion image
 */
async function generateBridgeImage(token, amount, txHash) {
  try {
    return await generateTradeImage({
      tokenIn: token.toUpperCase(),
      tokenOut: 'SOM',
      amount,
      price: 1, // 1:1 ratio for testnet
      txHash
    });
  } catch (error) {
    console.error('Generate bridge image error:', error);
    return null;
  }
}

module.exports = {
  handleBridgeTransfer
}; 