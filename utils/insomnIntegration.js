const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load the correct factory ABI from the new factory folder
const factoryABI = JSON.parse(fs.readFileSync(path.join(__dirname, '../new factory/abi.json')));

// INSOMN ecosystem contract addresses (from the new factory)
const INSOMN_ECOSYSTEM = {
    factory: "0x8669cD81994740D517661577A72B84d0a308D8b0",
    insomn: "0xCdaC954Cff3be5eBED645745c85dc13cC2c97836",
    weth: "0xd2480162Aa7F02Ead7BF4C127465446150D58452",
    pool: "0xaA19FBBd3f5FD24cd5Db040364e91b9fa86aa18f"
};

// ERC20 ABI for balance checking
const ERC20_ABI = [
    "function balanceOf(address account) external view returns (uint256)",
    "function name() external view returns (string)",
    "function symbol() external view returns (string)",
    "function decimals() external view returns (uint8)",
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function transfer(address to, uint256 amount) external returns (bool)"
];

/**
 * Check if a token is part of the INSOMN ecosystem
 */
function isInsomnEcosystemToken(tokenAddress) {
    const ecosystemTokens = [
        INSOMN_ECOSYSTEM.insomn.toLowerCase(),
        INSOMN_ECOSYSTEM.weth.toLowerCase()
    ];
    return ecosystemTokens.includes(tokenAddress.toLowerCase());
}

/**
 * Get token information for INSOMN ecosystem tokens
 */
async function getInsomnTokenInfo(tokenAddress, provider) {
    try {
        const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        
        const [name, symbol, decimals] = await Promise.all([
            tokenContract.name(),
            tokenContract.symbol(),
            tokenContract.decimals()
        ]);
        
        return {
            name,
            symbol,
            decimals,
            address: tokenAddress,
            isInsomnEcosystem: true,
            ecosystem: 'INSOMN'
        };
    } catch (error) {
        console.error('❌ Error getting INSOMN token info:', error);
        return null;
    }
}

/**
 * Get token address from symbol
 */
function getInsomnTokenAddress(tokenSymbol) {
    const tokens = {
        'STT': ethers.ZeroAddress,
        'INSOMN': INSOMN_ECOSYSTEM.insomn,
        'WETH': INSOMN_ECOSYSTEM.weth
    };
    return tokens[tokenSymbol.toUpperCase()];
}

/**
 * Execute a swap in the INSOMN ecosystem using factory functions
 */
async function executeInsomnSwap(amount, fromToken, toToken, wallet, provider) {
    try {
        // Initialize factory contract
        const factory = new ethers.Contract(INSOMN_ECOSYSTEM.factory, factoryABI, wallet);
        
        // Get token addresses
        const tokenA = getInsomnTokenAddress(fromToken);
        const tokenB = getInsomnTokenAddress(toToken);
        
        if (!tokenA || !tokenB) {
            throw new Error(`Invalid token: ${fromToken} or ${toToken}`);
        }
        
        // Calculate amounts
        const amountIn = ethers.parseEther(amount);
        const amountOutMin = amountIn * 995n / 1000n; // 0.5% slippage
        
        let result;
        
        if (fromToken === 'STT') {
            // STT to Token swap using factory function
            console.log(`🔄 Swapping ${amount} STT for ${toToken}...`);
            
            const tx = await factory.swapSTTForTokens(
                INSOMN_ECOSYSTEM.pool, // Use existing pool
                amountOutMin,
                tokenB,
                { value: amountIn }
            );
            
            console.log(`📝 Transaction hash: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Swap completed!`);
            
            result = { success: true, txHash: receipt.hash, amountIn: amountIn };
            
        } else if (toToken === 'STT') {
            // Token to STT swap using factory function
            console.log(`🔄 Swapping ${amount} ${fromToken} for STT...`);
            
            // First approve the factory to spend tokens
            const tokenContract = new ethers.Contract(tokenA, ERC20_ABI, wallet);
            await tokenContract.approve(INSOMN_ECOSYSTEM.factory, amountIn);
            console.log(`✅ Token approval completed`);
            
            const tx = await factory.swapTokensForSTT(
                INSOMN_ECOSYSTEM.pool, // Use existing pool
                amountIn,
                amountOutMin,
                tokenA
            );
            
            console.log(`📝 Transaction hash: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Swap completed!`);
            
            result = { success: true, txHash: receipt.hash, amountIn: amountIn };
            
        } else {
            throw new Error("Token-to-token swaps not implemented");
        }
        
        return {
            success: true,
            message: `✅ Swap successful!\nAmount: ${amount} ${fromToken}\nTo: ${toToken}\nTx: https://shannon-explorer.somnia.network/tx/${result.txHash}`
        };
        
    } catch (error) {
        console.error('❌ Error executing INSOMN swap:', error);
        return {
            success: false,
            message: `❌ Swap failed: ${error.message}`
        };
    }
}

/**
 * Get wallet balance for INSOMN ecosystem tokens
 */
async function getInsomnBalance(wallet, provider) {
    try {
        // Get STT balance (native token)
        const sttBalance = await provider.getBalance(wallet.address);
        
        // Get INSOMN balance
        const insomnContract = new ethers.Contract(INSOMN_ECOSYSTEM.insomn, ERC20_ABI, provider);
        const insomnBalance = await insomnContract.balanceOf(wallet.address);
        
        // Get WETH balance
        const wethContract = new ethers.Contract(INSOMN_ECOSYSTEM.weth, ERC20_ABI, provider);
        const wethBalance = await wethContract.balanceOf(wallet.address);
        
        return {
            success: true,
            balance: {
                stt: ethers.formatEther(sttBalance),
                insomn: ethers.formatEther(insomnBalance),
                weth: ethers.formatEther(wethBalance)
            }
        };
    } catch (error) {
        console.error('❌ Error getting INSOMN balance:', error);
        return {
            success: false,
            message: `❌ Error: ${error.message}`
        };
    }
}

/**
 * Get pool information for INSOMN ecosystem
 */
async function getInsomnPoolInfo(token1, token2, provider) {
    try {
        const factory = new ethers.Contract(INSOMN_ECOSYSTEM.factory, factoryABI, provider);
        
        // Use the existing pool for all queries
        const poolAddress = INSOMN_ECOSYSTEM.pool;
        
        try {
            const [reserve0, reserve1, liquidity] = await factory.getPoolReserves(poolAddress);
            
            return {
                success: true,
                poolAddress,
                reserve0: ethers.formatEther(reserve0),
                reserve1: ethers.formatEther(reserve1),
                liquidity: liquidity.toString()
            };
        } catch (error) {
            return {
                success: false,
                message: `❌ Error: Pool has no liquidity or doesn't exist`
            };
        }
    } catch (error) {
        console.error('❌ Error getting INSOMN pool info:', error);
        return {
            success: false,
            message: `❌ Error: ${error.message}`
        };
    }
}

/**
 * Create buy/sell buttons for INSOMN ecosystem tokens
 */
function createInsomnButtons(tokenSymbol) {
    const buyButtons = [
        { text: `Buy 0.1 ${tokenSymbol}`, callback_data: `insomn_buy_0.1_${tokenSymbol}` },
        { text: `Buy 1 ${tokenSymbol}`, callback_data: `insomn_buy_1_${tokenSymbol}` },
        { text: `Buy 5 ${tokenSymbol}`, callback_data: `insomn_buy_5_${tokenSymbol}` }
    ];
    
    const sellButtons = [
        { text: 'Sell 25%', callback_data: `insomn_sell_25_${tokenSymbol}` },
        { text: 'Sell 50%', callback_data: `insomn_sell_50_${tokenSymbol}` },
        { text: 'Sell 100%', callback_data: `insomn_sell_100_${tokenSymbol}` }
    ];
    
    return [...buyButtons, ...sellButtons];
}

module.exports = {
    INSOMN_ECOSYSTEM,
    isInsomnEcosystemToken,
    getInsomnTokenInfo,
    executeInsomnSwap,
    getInsomnBalance,
    getInsomnPoolInfo,
    createInsomnButtons,
    getInsomnTokenAddress
}; 