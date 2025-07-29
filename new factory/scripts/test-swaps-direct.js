const hre = require("hardhat");

async function main() {
    console.log("Testing swaps directly on Somnia Testnet...");
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("Testing with account:", deployer.address);

    // Contract addresses (updated with new deployment)
    const FACTORY_ADDRESS = "0x73367ace5E99095A51B0b4991516A7CFC4c7d229";
    const TOKEN_A_ADDRESS = "0xEa988d147a3c4FA1c385BCF6599E37BCFc79D934";
    const TOKEN_B_ADDRESS = "0x119922Bf864AE6e721aaB27C03Bc8Fef38A52Bb4";

    // Get contract instances
    const factory = await hre.ethers.getContractAt("Factory", FACTORY_ADDRESS);
    const tokenA = await hre.ethers.getContractAt("TestToken", TOKEN_A_ADDRESS);
    const tokenB = await hre.ethers.getContractAt("TestToken", TOKEN_B_ADDRESS);

    console.log("\n=== Initial State ===");
    console.log("Factory Address:", FACTORY_ADDRESS);
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

    // Create a new pool
    console.log("\n=== Creating New Pool ===");
    const createPoolTx = await factory.createPool(TOKEN_A_ADDRESS, TOKEN_B_ADDRESS, 3000, 60);
    await createPoolTx.wait();
    
    const poolAddress = await factory.getPool(TOKEN_A_ADDRESS, TOKEN_B_ADDRESS, 3000);
    console.log("New pool created at:", poolAddress);
    
    const pool = await hre.ethers.getContractAt("CustomPool", poolAddress);

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
    await tokenA.approve(poolAddress, liquidityAmount);
    await tokenB.approve(poolAddress, liquidityAmount);
    console.log("Token approvals completed");

    // Add liquidity
    await pool.addLiquidity(liquidityAmount);
    console.log("Added liquidity: 1000 TTA + 1000 TTB");

    // Send STT directly to the pool
    const sttAmount = ethers.parseEther("1"); // 1 STT
    await deployer.sendTransaction({
        to: poolAddress,
        value: sttAmount
    });
    console.log("Sent 1 STT to pool");

    // Check pool state after adding liquidity
    console.log("\n=== Pool State After Adding Liquidity ===");
    const poolSTTBalance = await hre.ethers.provider.getBalance(poolAddress);
    console.log("Pool STT Balance:", ethers.formatEther(poolSTTBalance));
    
    const poolTokenABalance = await tokenA.balanceOf(poolAddress);
    const poolTokenBBalance = await tokenB.balanceOf(poolAddress);
    console.log("Pool Token A Balance:", ethers.formatEther(poolTokenABalance));
    console.log("Pool Token B Balance:", ethers.formatEther(poolTokenBBalance));

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

    // Check pool balances after swap
    const afterSwapPoolSTTBalance = await hre.ethers.provider.getBalance(poolAddress);
    const afterSwapPoolTokenABalance = await tokenA.balanceOf(poolAddress);
    const afterSwapPoolTokenBBalance = await tokenB.balanceOf(poolAddress);

    console.log("\n=== Pool Balances After Swap ===");
    console.log("Pool STT Balance:", ethers.formatEther(afterSwapPoolSTTBalance));
    console.log("Pool Token A Balance:", ethers.formatEther(afterSwapPoolTokenABalance));
    console.log("Pool Token B Balance:", ethers.formatEther(afterSwapPoolTokenBBalance));

    // Calculate changes
    const sttChange = afterSwapSTTBalance - initialSTTBalance;
    const tokenAChange = afterSwapTokenABalance - initialTokenABalance;

    console.log("\n=== Balance Changes ===");
    console.log("STT Change:", ethers.formatEther(sttChange));
    console.log("Token A Change:", ethers.formatEther(tokenAChange));

    console.log("\n=== STT to Token Swap Test Completed Successfully! ===");
    console.log("✅ Successfully swapped STT for tokens!");
    console.log("✅ Pool has liquidity and swap functionality is working!");
    console.log("✅ New pool address:", poolAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 