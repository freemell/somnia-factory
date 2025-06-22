const { ethers } = require('ethers');
const { supabase } = require('../db/supabase');
const { generateTradeImage } = require('./imageGen');
const { getWalletForUser } = require('./wallet');

// Initialize providers
const sepoliaProvider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
const somniaProvider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// Bridge receiver wallet (for testnet)
const bridgeWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, somniaProvider);

// Initialize providers for different testnets
const sepoliaProviderTestnet = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const mumbaiProviderTestnet = new ethers.JsonRpcProvider(process.env.MUMBAI_RPC_URL);
const bscProviderTestnet = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC);

// Token conversion rates (can be adjusted)
const CONVERSION_RATES = {
    sepolia: 1, // 1 ETH = 1 tSOM
    mumbai: 0.5, // 1 USDT = 0.5 tSOM
    bsc: 0.8 // 1 BNB = 0.8 tSOM
};

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
    const bridgeAddress = process.env.SEPOLIA_RECEIVER;
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

/**
 * Check if a transaction exists and mint testnet tokens
 */
async function checkAndMintTestnetBridge(userId, source) {
    try {
        // Get user's Somnia wallet
        const userWallet = await getWalletForUser(userId);
        if (!userWallet) {
            throw new Error('User wallet not found');
        }

        // Get appropriate provider based on source
        const provider = getProviderForSource(source);
        const receiverAddress = getReceiverAddressForSource(source);

        // Get recent transactions for the receiver address
        const blockNumber = await provider.getBlockNumber();
        const transactions = await provider.getLogs({
            fromBlock: blockNumber - 100, // Check last 100 blocks
            toBlock: blockNumber,
            address: receiverAddress
        });

        // Find the most recent transaction
        if (transactions.length === 0) {
            return { success: false, message: 'No recent transactions found' };
        }

        const latestTx = transactions[transactions.length - 1];
        const tx = await provider.getTransaction(latestTx.transactionHash);
        
        // Calculate amount to mint based on conversion rate
        const amount = ethers.utils.formatEther(tx.value);
        const somniaAmount = amount * CONVERSION_RATES[source];

        // Mint tokens on Somnia testnet
        const somniaWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, somniaProvider);
        const mintTx = await mintTestnetTokens(somniaWallet, userWallet.address, somniaAmount);
        
        return {
            success: true,
            amount: somniaAmount,
            symbol: 'tSOM',
            txHash: mintTx.hash
        };
    } catch (error) {
        console.error('Bridge error:', error);
        throw error;
    }
}

/**
 * Get provider for specific testnet
 */
function getProviderForSource(source) {
    switch (source) {
        case 'sepolia':
            return sepoliaProviderTestnet;
        case 'mumbai':
            return mumbaiProviderTestnet;
        case 'bsc':
            return bscProviderTestnet;
        default:
            throw new Error('Invalid source network');
    }
}

/**
 * Get receiver address for specific testnet
 */
function getReceiverAddressForSource(source) {
    switch (source) {
        case 'sepolia':
            return process.env.SEPOLIA_RECEIVER;
        case 'mumbai':
            return process.env.MUMBAI_RECEIVER;
        case 'bsc':
            return process.env.BSC_RECEIVER;
        default:
            throw new Error('Invalid source network');
    }
}

/**
 * Mint testnet tokens on Somnia
 */
async function mintTestnetTokens(wallet, recipient, amount) {
    // This is a placeholder - in a real implementation, you would:
    // 1. Deploy a test token contract
    // 2. Call its mint function
    // For now, we'll simulate a successful transaction
    const tx = {
        to: recipient,
        value: ethers.utils.parseEther(amount.toString())
    };
    
    return await wallet.sendTransaction(tx);
}

module.exports = {
  handleBridgeTransfer,
  checkAndMintTestnetBridge
}; 