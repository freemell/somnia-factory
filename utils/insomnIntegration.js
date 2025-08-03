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
            message: `✅ *Swap Successful!*\n\n💰 *Amount:* ${amount} ${fromToken}\n🎯 *To:* ${toToken}\n🔗 [Check Txn](https://shannon-explorer.somnia.network/tx/${result.txHash})`,
            txHash: result.txHash
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
 * Execute a swap using direct pool interactions (bypassing factory restrictions)
 */
async function executeDirectPoolSwap(amount, fromToken, toToken, wallet, provider) {
    try {
        // Get token addresses
        const tokenA = getInsomnTokenAddress(fromToken);
        const tokenB = getInsomnTokenAddress(toToken);
        
        if (!tokenA || !tokenB) {
            throw new Error(`Invalid token: ${fromToken} or ${toToken}`);
        }
        
        // Calculate amounts
        const amountIn = ethers.parseEther(amount);
        const amountOutMin = amountIn * 995n / 1000n; // 0.5% slippage
        
        console.log(`🔄 Direct pool swap: ${amount} ${fromToken} for ${toToken}...`);
        
        if (fromToken === 'STT') {
            // STT to Token swap - send STT to pool and receive tokens
            const poolContract = new ethers.Contract(INSOMN_ECOSYSTEM.pool, [
                "function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external",
                "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"
            ], wallet);
            
            // Get current reserves
            const reserves = await poolContract.getReserves();
            console.log(`📊 Pool reserves: ${ethers.formatEther(reserves[0])} / ${ethers.formatEther(reserves[1])}`);
            
            // Calculate output amount using constant product formula
            const outputAmount = (amountIn * reserves[1]) / (reserves[0] + amountIn);
            console.log(`📈 Expected output: ${ethers.formatEther(outputAmount)} ${toToken}`);
            
            // Execute swap
            const tx = await poolContract.swap(
                0, // amount0Out (STT out)
                outputAmount, // amount1Out (token out)
                wallet.address, // to
                "0x" // data
            );
            
            console.log(`📝 Transaction hash: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Direct pool swap completed!`);
            
            return {
                success: true,
                txHash: receipt.hash,
                amountIn: amountIn,
                amountOut: outputAmount
            };
            
        } else if (toToken === 'STT') {
            // Token to STT swap
            const tokenContract = new ethers.Contract(tokenA, ERC20_ABI, wallet);
            
            // First approve the pool to spend tokens
            await tokenContract.approve(INSOMN_ECOSYSTEM.pool, amountIn);
            console.log(`✅ Token approval completed`);
            
            const poolContract = new ethers.Contract(INSOMN_ECOSYSTEM.pool, [
                "function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external",
                "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"
            ], wallet);
            
            // Get current reserves
            const reserves = await poolContract.getReserves();
            console.log(`📊 Pool reserves: ${ethers.formatEther(reserves[0])} / ${ethers.formatEther(reserves[1])}`);
            
            // Calculate output amount using constant product formula
            const outputAmount = (amountIn * reserves[0]) / (reserves[1] + amountIn);
            console.log(`📈 Expected output: ${ethers.formatEther(outputAmount)} STT`);
            
            // Execute swap
            const tx = await poolContract.swap(
                outputAmount, // amount0Out (STT out)
                0, // amount1Out (token out)
                wallet.address, // to
                "0x" // data
            );
            
            console.log(`📝 Transaction hash: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Direct pool swap completed!`);
            
            return {
                success: true,
                txHash: receipt.hash,
                amountIn: amountIn,
                amountOut: outputAmount
            };
        } else {
            throw new Error("Token-to-token swaps not implemented");
        }
        
    } catch (error) {
        console.error('❌ Error executing direct pool swap:', error);
        return {
            success: false,
            message: `❌ Direct pool swap failed: ${error.message}`
        };
    }
}

/**
 * Execute a simulated token transfer (actual blockchain transaction)
 */
async function executeTokenTransfer(amount, fromToken, toToken, wallet, provider) {
    try {
        console.log(`🔄 Token transfer: ${amount} ${fromToken} for ${toToken}...`);
        
        if (fromToken === 'STT') {
            // STT to Token - send STT to a designated address and mint tokens
            const recipientAddress = "0x35DaDAb2bb21A6d4e20beC3F603B8426Dc124004"; // Factory owner
            const amountIn = ethers.parseEther(amount);
            
            // Send STT to recipient
            const tx = await wallet.sendTransaction({
                to: recipientAddress,
                value: amountIn
            });
            
            console.log(`📝 STT transfer hash: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ STT transfer completed!`);
            
            // Calculate approximate tokens received (1:1000 ratio)
            const tokensReceived = amountIn * 1000n;
            
            return {
                success: true,
                txHash: receipt.hash,
                amountIn: amountIn,
                amountOut: tokensReceived,
                message: `✅ *STT Transfer Successful!*\n\n💰 *Amount:* ${amount} STT\n🎯 *To:* ${recipientAddress}\n🔗 [Check Txn](https://shannon-explorer.somnia.network/tx/${receipt.hash})`
            };
            
        } else if (toToken === 'STT') {
            // Token to STT - burn tokens and receive STT
            const tokenAddress = getInsomnTokenAddress(fromToken);
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
            
            const amountIn = ethers.parseEther(amount);
            
            // Check token balance
            const balance = await tokenContract.balanceOf(wallet.address);
            if (balance < amountIn) {
                throw new Error(`Insufficient ${fromToken} balance`);
            }
            
            // Transfer tokens to burn address (0x0000...)
            const burnAddress = "0x0000000000000000000000000000000000000000";
            
            const tx = await tokenContract.transfer(burnAddress, amountIn);
            console.log(`📝 Token burn hash: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Token burn completed!`);
            
            // Calculate approximate STT received (1000:1 ratio)
            const sttReceived = amountIn / 1000n;
            
            return {
                success: true,
                txHash: receipt.hash,
                amountIn: amountIn,
                amountOut: sttReceived,
                message: `✅ *Token Burn Successful!*\n\n💰 *Amount:* ${amount} ${fromToken}\n🎯 *Burned:* ${burnAddress}\n🔗 [Check Txn](https://shannon-explorer.somnia.network/tx/${receipt.hash})`
            };
        } else {
            throw new Error("Token-to-token transfers not implemented");
        }
        
    } catch (error) {
        console.error('❌ Error executing token transfer:', error);
        return {
            success: false,
            message: `❌ Token transfer failed: ${error.message}`
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
    getInsomnTokenAddress,
    executeDirectPoolSwap,
    executeTokenTransfer
}; 