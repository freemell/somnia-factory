const hre = require("hardhat");

async function main() {
    console.log("Testing swaps on Somnia Testnet...");
    
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
    const [reserve0, reserve1, liquidity] = await pool.getReserves();
    const token0 = await pool.token0();
    const token1 = await pool.token1();

    console.log("\n=== Pool Info ===");
    console.log("Token 0:", token0);
    console.log("Token 1:", token1);
    console.log("Reserve 0:", reserve0.toString());
    console.log("Reserve 1:", reserve1.toString());
    console.log("Liquidity:", liquidity.toString());

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

    // Check new pool state
    const [newReserve0, newReserve1, newLiquidity] = await pool.getReserves();
    console.log("\n=== New Pool State ===");
    console.log("Reserve 0:", newReserve0.toString());
    console.log("Reserve 1:", newReserve1.toString());
    console.log("Liquidity:", newLiquidity.toString());

    // Test swap quote
    console.log("\n=== Testing Swap Quote ===");
    const swapAmount = ethers.parseEther("0.1"); // 0.1 STT
    const quote = await getSwapQuote(pool, swapAmount, ethers.ZeroAddress, TOKEN_A_ADDRESS);
    console.log("Quote for 0.1 STT -> TTA:", quote.amountOut.toString());

    // Test STT to Token swap
    console.log("\n=== Testing STT to Token Swap ===");
    const swapTx = await pool.swapExactSTTForTokens(
        quote.amountOut * 95n / 100n, // 95% of quote as minimum
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

    // Test Token to STT swap
    console.log("\n=== Testing Token to STT Swap ===");
    const tokenSwapAmount = ethers.parseEther("50"); // 50 TTA
    
    // Approve tokens for swap
    await tokenA.approve(POOL_ADDRESS, tokenSwapAmount);
    
    const tokenSwapTx = await pool.swapExactTokensForSTT(
        tokenSwapAmount,
        ethers.parseEther("0.05"), // Minimum 0.05 STT out
        TOKEN_A_ADDRESS,
        deployer.address
    );
    console.log("Token swap transaction hash:", tokenSwapTx.hash);
    
    const tokenSwapReceipt = await tokenSwapTx.wait();
    console.log("Token swap completed successfully!");

    // Check final balances
    const finalSTTBalance = await hre.ethers.provider.getBalance(deployer.address);
    const finalTokenABalance = await tokenA.balanceOf(deployer.address);
    const finalTokenBBalance = await tokenB.balanceOf(deployer.address);

    console.log("\n=== Final Balances ===");
    console.log("STT Balance:", ethers.formatEther(finalSTTBalance));
    console.log("Token A Balance:", ethers.formatEther(finalTokenABalance));
    console.log("Token B Balance:", ethers.formatEther(finalTokenBBalance));

    // Calculate changes
    const sttChange = finalSTTBalance - initialSTTBalance;
    const tokenAChange = finalTokenABalance - initialTokenABalance;
    const tokenBBalance = finalTokenBBalance - initialTokenBBalance;

    console.log("\n=== Balance Changes ===");
    console.log("STT Change:", ethers.formatEther(sttChange));
    console.log("Token A Change:", ethers.formatEther(tokenAChange));
    console.log("Token B Change:", ethers.formatEther(tokenBBalance));

    console.log("\n=== All Swap Tests Completed Successfully! ===");
}

async function getSwapQuote(pool, amountIn, tokenIn, tokenOut) {
    const [reserve0, reserve1, liquidity] = await pool.getReserves();
    const token0 = await pool.token0();
    
    let reserveIn, reserveOut;
    if (tokenIn === ethers.ZeroAddress) {
        // STT swap
        reserveIn = await hre.ethers.provider.getBalance(pool.address);
        reserveOut = tokenOut === token0 ? reserve0 : reserve1;
    } else if (tokenOut === ethers.ZeroAddress) {
        // Token to STT swap
        reserveIn = tokenIn === token0 ? reserve0 : reserve1;
        reserveOut = await hre.ethers.provider.getBalance(pool.address);
    } else {
        // Token to token swap
        reserveIn = tokenIn === token0 ? reserve0 : reserve1;
        reserveOut = tokenOut === token0 ? reserve0 : reserve1;
    }
    
    // Calculate fee (0.3% = 3000 basis points)
    const fee = 3000;
    const amountInWithFee = amountIn * (10000n - BigInt(fee)) / 10000n;
    
    // Calculate amount out using constant product formula
    const amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
    
    return { amountIn, amountOut, fee };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 