const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Configuration
const SOMNIA_RPC_URL = "https://dream-rpc.somnia.network/";
const PRIVATE_KEY = "99f33cb471e638d3d5a7cad46f712f2365710618e9afe3cf3e1c0e94f2c1eb1d";
const CHAIN_ID = 50312;

// Load ABIs
const factoryABI = JSON.parse(fs.readFileSync(path.join(__dirname, "artifacts/contracts/Factory.sol/Factory.json"))).abi;
const customPoolABI = JSON.parse(fs.readFileSync(path.join(__dirname, "artifacts/contracts/CustomPool.sol/CustomPool.json"))).abi;
const testTokenABI = JSON.parse(fs.readFileSync(path.join(__dirname, "artifacts/contracts/TestToken.sol/TestToken.json"))).abi;

class SomniaBot {
    constructor(factoryAddress) {
        this.provider = new ethers.JsonRpcProvider(SOMNIA_RPC_URL);
        this.wallet = new ethers.Wallet(PRIVATE_KEY, this.provider);
        this.factory = new ethers.Contract(factoryAddress, factoryABI, this.wallet);
        this.factoryAddress = factoryAddress;
        
        console.log("Bot initialized with wallet:", this.wallet.address);
        console.log("Factory address:", factoryAddress);
    }

    async getFactoryInfo() {
        try {
            const owner = await this.factory.owner();
            const poolCount = await this.factory.allPoolsLength();
            
            console.log("\n=== Factory Information ===");
            console.log("Owner:", owner);
            console.log("Total Pools:", poolCount.toString());
            console.log("Wallet Address:", this.wallet.address);
            console.log("Wallet Balance:", ethers.formatEther(await this.provider.getBalance(this.wallet.address)), "STT");
            
            return { owner, poolCount: poolCount.toString() };
        } catch (error) {
            console.error("Error getting factory info:", error.message);
            throw error;
        }
    }

    async createPool(tokenA, tokenB, fee = 3000, tickSpacing = 60) {
        try {
            console.log(`\nCreating pool for tokens ${tokenA} and ${tokenB}...`);
            
            const tx = await this.factory.createPool(tokenA, tokenB, fee, tickSpacing);
            console.log("Transaction hash:", tx.hash);
            
            const receipt = await tx.wait();
            console.log("Pool created successfully!");
            
            // Get the pool address
            const poolAddress = await this.factory.getPool(tokenA, tokenB, fee);
            console.log("Pool address:", poolAddress);
            
            return poolAddress;
        } catch (error) {
            console.error("Error creating pool:", error.message);
            throw error;
        }
    }

    async getPoolInfo(poolAddress) {
        try {
            const pool = new ethers.Contract(poolAddress, customPoolABI, this.wallet);
            
            const [token0, token1, fee, tickSpacing, liquidity, owner] = await Promise.all([
                pool.token0(),
                pool.token1(),
                pool.fee(),
                pool.tickSpacing(),
                pool.liquidity(),
                pool.owner()
            ]);
            
            console.log("\n=== Pool Information ===");
            console.log("Token 0:", token0);
            console.log("Token 1:", token1);
            console.log("Fee:", fee.toString());
            console.log("Tick Spacing:", tickSpacing.toString());
            console.log("Liquidity:", liquidity.toString());
            console.log("Owner:", owner);
            
            return { token0, token1, fee, tickSpacing, liquidity, owner };
        } catch (error) {
            console.error("Error getting pool info:", error.message);
            throw error;
        }
    }

    async addLiquidity(poolAddress, amount) {
        try {
            const pool = new ethers.Contract(poolAddress, customPoolABI, this.wallet);
            
            console.log(`\nAdding liquidity: ${amount} to pool ${poolAddress}...`);
            
            const tx = await pool.addLiquidity(amount);
            console.log("Transaction hash:", tx.hash);
            
            await tx.wait();
            console.log("Liquidity added successfully!");
            
            const newLiquidity = await pool.liquidity();
            console.log("New liquidity:", newLiquidity.toString());
            
            return newLiquidity;
        } catch (error) {
            console.error("Error adding liquidity:", error.message);
            throw error;
        }
    }

    async getTotalBalance(poolAddress) {
        try {
            const [balance0, balance1] = await this.factory.getPoolTotalBalance(poolAddress);
            
            console.log("\n=== Pool Total Balance ===");
            console.log("Token 0 Balance:", balance0.toString());
            console.log("Token 1 Balance:", balance1.toString());
            
            return { balance0, balance1 };
        } catch (error) {
            console.error("Error getting total balance:", error.message);
            throw error;
        }
    }

    async getReserves(poolAddress) {
        try {
            const [reserve0, reserve1, liquidity] = await this.factory.getPoolReserves(poolAddress);
            
            console.log("\n=== Pool Reserves ===");
            console.log("Reserve 0:", reserve0.toString());
            console.log("Reserve 1:", reserve1.toString());
            console.log("Liquidity:", liquidity.toString());
            
            return { reserve0, reserve1, liquidity };
        } catch (error) {
            console.error("Error getting reserves:", error.message);
            throw error;
        }
    }

    async listAllPools() {
        try {
            const poolCount = await this.factory.allPoolsLength();
            console.log(`\n=== All Pools (${poolCount.toString()}) ===`);
            
            for (let i = 0; i < poolCount; i++) {
                const poolAddress = await this.factory.getPoolByIndex(i);
                console.log(`Pool ${i}: ${poolAddress}`);
            }
            
            return poolCount;
        } catch (error) {
            console.error("Error listing pools:", error.message);
            throw error;
        }
    }

    async transferPoolOwnership(poolAddress, newOwner) {
        try {
            const pool = new ethers.Contract(poolAddress, customPoolABI, this.wallet);
            
            console.log(`\nTransferring pool ownership to ${newOwner}...`);
            
            const tx = await pool.transferOwnership(newOwner);
            console.log("Transaction hash:", tx.hash);
            
            await tx.wait();
            console.log("Ownership transferred successfully!");
            
            const newPoolOwner = await pool.owner();
            console.log("New pool owner:", newPoolOwner);
            
            return newPoolOwner;
        } catch (error) {
            console.error("Error transferring ownership:", error.message);
            throw error;
        }
    }

    async swapSTTForTokens(poolAddress, amountOutMin, tokenOut) {
        try {
            console.log(`\nSwapping STT for tokens...`);
            console.log(`Pool: ${poolAddress}`);
            console.log(`Token Out: ${tokenOut}`);
            console.log(`Min Amount Out: ${amountOutMin}`);
            
            const tx = await this.factory.swapSTTForTokens(poolAddress, amountOutMin, tokenOut, {
                value: ethers.parseEther("0.1") // Swap 0.1 STT
            });
            console.log("Transaction hash:", tx.hash);
            
            const receipt = await tx.wait();
            console.log("Swap completed successfully!");
            
            // Get the amount out from the event
            const event = receipt.logs.find(log => {
                try {
                    const parsed = this.factory.interface.parseLog(log);
                    return parsed.name === "Swap";
                } catch {
                    return false;
                }
            });
            
            if (event) {
                const parsed = this.factory.interface.parseLog(event);
                console.log("Amount In:", ethers.formatEther(parsed.args.amountIn), "STT");
                console.log("Amount Out:", parsed.args.amountOut.toString());
            }
            
            return receipt;
        } catch (error) {
            console.error("Error swapping STT for tokens:", error.message);
            throw error;
        }
    }

    async swapTokensForSTT(poolAddress, amountIn, amountOutMin, tokenIn) {
        try {
            console.log(`\nSwapping tokens for STT...`);
            console.log(`Pool: ${poolAddress}`);
            console.log(`Token In: ${tokenIn}`);
            console.log(`Amount In: ${amountIn}`);
            console.log(`Min Amount Out: ${ethers.formatEther(amountOutMin)} STT`);
            
            // First approve the pool to spend tokens
            const tokenContract = new ethers.Contract(tokenIn, testTokenABI, this.wallet);
            await tokenContract.approve(poolAddress, amountIn);
            console.log("Token approval completed");
            
            const tx = await this.factory.swapTokensForSTT(poolAddress, amountIn, amountOutMin, tokenIn);
            console.log("Transaction hash:", tx.hash);
            
            const receipt = await tx.wait();
            console.log("Swap completed successfully!");
            
            return receipt;
        } catch (error) {
            console.error("Error swapping tokens for STT:", error.message);
            throw error;
        }
    }

    async getSwapQuote(poolAddress, amountIn, tokenIn, tokenOut) {
        try {
            const pool = new ethers.Contract(poolAddress, customPoolABI, this.wallet);
            
            const [reserve0, reserve1, liquidity] = await pool.getReserves();
            const token0 = await pool.token0();
            
            let reserveIn, reserveOut;
            if (tokenIn === token0) {
                reserveIn = reserve0;
                reserveOut = reserve1;
            } else {
                reserveIn = reserve1;
                reserveOut = reserve0;
            }
            
            // Calculate fee (0.3% = 3000 basis points)
            const fee = 3000;
            const amountInWithFee = amountIn * (10000 - fee) / 10000;
            
            // Calculate amount out using constant product formula
            const amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
            
            console.log(`\n=== Swap Quote ===`);
            console.log(`Amount In: ${amountIn.toString()}`);
            console.log(`Amount Out: ${amountOut.toString()}`);
            console.log(`Fee: ${fee / 100}%`);
            console.log(`Price Impact: ${((amountIn * 10000) / reserveIn / 100).toFixed(2)}%`);
            
            return { amountIn, amountOut, fee };
        } catch (error) {
            console.error("Error getting swap quote:", error.message);
            throw error;
        }
    }
}

// Example usage
async function main() {
    // Replace with your deployed factory address
    const FACTORY_ADDRESS = "0x4E25079599d1bBb489d84A9323343a90fFC1D936";
    
    if (FACTORY_ADDRESS === "YOUR_FACTORY_ADDRESS_HERE") {
        console.log("Please update the FACTORY_ADDRESS in bot.js with your deployed factory address");
        console.log("Run: npm run deploy:factory to get the factory address");
        return;
    }
    
    const bot = new SomniaBot(FACTORY_ADDRESS);
    
    try {
        // Get factory information
        await bot.getFactoryInfo();
        
        // List all pools
        await bot.listAllPools();
        
        // Example: Create a pool (uncomment and update with actual token addresses)
        /*
        const tokenA = "TOKEN_A_ADDRESS";
        const tokenB = "TOKEN_B_ADDRESS";
        const poolAddress = await bot.createPool(tokenA, tokenB, 3000, 60);
        
        // Get pool information
        await bot.getPoolInfo(poolAddress);
        
        // Add liquidity
        await bot.addLiquidity(poolAddress, 1000);
        
        // Get balances and reserves
        await bot.getTotalBalance(poolAddress);
        await bot.getReserves(poolAddress);
        */
        
    } catch (error) {
        console.error("Bot error:", error);
    }
}

// Export for use in other scripts
module.exports = SomniaBot;

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
} 