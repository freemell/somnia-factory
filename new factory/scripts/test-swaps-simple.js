const hre = require("hardhat");

async function main() {
    console.log("Testing swaps on Somnia Testnet (Simple Version)...");
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("Testing with account:", deployer.address);

    // Contract addresses (updated with new deployment)
    const FACTORY_ADDRESS = "0x73367ace5E99095A51B0b4991516A7CFC4c7d229";
    const TOKEN_A_ADDRESS = "0xEa988d147a3c4FA1c385BCF6599E37BCFc79D934";
    const TOKEN_B_ADDRESS = "0x119922Bf864AE6e721aaB27C03Bc8Fef38A52Bb4";
    const POOL_ADDRESS = "0xFF1C91dDf9dC4B9d9C2722aBF24739432382935F";

    // Get contract instances
    const factory = await hre.ethers.getContractAt("Factory", FACTORY_ADDRESS);
    const tokenA = await hre.ethers.getContractAt("TestToken", TOKEN_A_ADDRESS);
    const tokenB = await hre.ethers.getContractAt("TestToken", TOKEN_B_ADDRESS);
    const pool = await hre.ethers.getContractAt("CustomPool", POOL_ADDRESS);

    console.log("\n=== Initial State ===");
    console.log("Factory Address:", FACTORY_ADDRESS);
    console.log("Pool Address:", POOL_ADDRESS);
    console.log("Token A (TTA):", TOKEN_A_ADDRESS);
    console.log("Token B (TTB):", TOKEN_B_ADDRESS);

    // Check initial balances
    const initialSTTBalance = await hre.ethers.provider.getBalance(deployer.address);
    const initialTokenABalance = await tokenA.balanceOf(deployer.address);
    const initialTokenBBalance = await tokenB.balanceOf(deployer.address);

    console.log("\n=== Initial Balances ===");
    console.log("STT Balance:", ethers.formatEther(initialSTTBalance));
    console.log("Token A Balance:", ethers.formatEther(initialTokenABalance));
    console.log("Token B Balance:", ethers.formatEther(initialTokenBBalance));

    // Get pool info
    console.log("\n=== Pool Info ===");
    const token0 = await pool.token0();
    const token1 = await pool.token1();
    console.log("Token 0:", token0);
    console.log("Token 1:", token1);

    // Add liquidity to the pool
    console.log("\n=== Adding Liquidity ===");
    
    // First, approve tokens for the pool
    const liquidityAmount = ethers.parseEther("1000"); // 1000 tokens
    await tokenA.approve(POOL_ADDRESS, liquidityAmount);
    await tokenB.approve(POOL_ADDRESS, liquidityAmount);
    console.log("Token approvals completed");

    // Add liquidity
    await pool.addLiquidity(liquidityAmount);
    console.log("Added liquidity: 1000 TTA + 1000 TTB");

    // Send STT directly to the pool
    const sttAmount = ethers.parseEther("1"); // 1 STT
    await deployer.sendTransaction({
        to: POOL_ADDRESS,
        value: sttAmount
    });
    console.log("Sent 1 STT to pool");

    // Check pool state after adding liquidity
    console.log("\n=== Pool State After Adding Liquidity ===");
    const [reserve0, reserve1, liquidity] = await pool.getReserves();
    console.log("Reserve 0:", reserve0.toString());
    console.log("Reserve 1:", reserve1.toString());
    console.log("Liquidity:", liquidity.toString());
    
    const poolSTTBalance = await hre.ethers.provider.getBalance(POOL_ADDRESS);
    console.log("Pool STT Balance:", ethers.formatEther(poolSTTBalance));

    // Test STT to Token swap
    console.log("\n=== Testing STT to Token Swap ===");
    const swapAmount = ethers.parseEther("0.1"); // 0.1 STT
    const minAmountOut = ethers.parseEther("50"); // Minimum 50 TTA out
    
    const swapTx = await pool.swapExactSTTForTokens(
        minAmountOut,
        TOKEN_A_ADDRESS,
        deployer.address,
        { value: swapAmount }
    );
    console.log("Swap transaction hash:", swapTx.hash);
    
    const swapReceipt = await swapTx.wait();
    console.log("Swap completed successfully!");

    // Check balances after swap
    const afterSwapSTTBalance = await hre.ethers.provider.getBalance(deployer.address);
    const afterSwapTokenABalance = await tokenA.balanceOf(deployer.address);
    const afterSwapTokenBBalance = await tokenB.balanceOf(deployer.address);

    console.log("\n=== Balances After STT->Token Swap ===");
    console.log("STT Balance:", ethers.formatEther(afterSwapSTTBalance));
    console.log("Token A Balance:", ethers.formatEther(afterSwapTokenABalance));
    console.log("Token B Balance:", ethers.formatEther(afterSwapTokenBBalance));

    // Calculate changes
    const sttChange = afterSwapSTTBalance - initialSTTBalance;
    const tokenAChange = afterSwapTokenABalance - initialTokenABalance;

    console.log("\n=== Balance Changes ===");
    console.log("STT Change:", ethers.formatEther(sttChange));
    console.log("Token A Change:", ethers.formatEther(tokenAChange));

    console.log("\n=== STT to Token Swap Test Completed Successfully! ===");
    console.log("✅ Successfully swapped STT for tokens!");
    console.log("✅ Pool has liquidity and swap functionality is working!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 