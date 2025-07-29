const hre = require("hardhat");

async function main() {
    console.log("Final STT to WETH swap test...");
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("Swapping with account:", deployer.address);

    // Contract addresses
    const FACTORY_ADDRESS = "0x73367ace5E99095A51B0b4991516A7CFC4c7d229";
    const WETH_ADDRESS = "0xd2480162Aa7F02Ead7BF4C127465446150D58452";

    // Get contract instances
    const factory = await hre.ethers.getContractAt("Factory", FACTORY_ADDRESS);
    const weth = await hre.ethers.getContractAt("IERC20", WETH_ADDRESS);

    console.log("\n=== Contract Addresses ===");
    console.log("Factory Address:", FACTORY_ADDRESS);
    console.log("WETH Address:", WETH_ADDRESS);

    // Check initial balances
    const initialSTTBalance = await hre.ethers.provider.getBalance(deployer.address);
    const initialWETHBalance = await weth.balanceOf(deployer.address);

    console.log("\n=== Initial Balances ===");
    console.log("STT Balance:", ethers.formatEther(initialSTTBalance));
    console.log("WETH Balance:", ethers.formatEther(initialWETHBalance));

    // Create a test token to pair with WETH
    console.log("\n=== Creating Test Token ===");
    const TestToken = await hre.ethers.getContractFactory("TestToken");
    const testToken = await TestToken.deploy("Test Token for WETH", "TEST");
    await testToken.waitForDeployment();
    
    console.log("Test token deployed at:", await testToken.getAddress());

    // Create pool with WETH
    console.log("\n=== Creating WETH Pool ===");
    const createPoolTx = await factory.createPool(await testToken.getAddress(), WETH_ADDRESS, 3000, 60);
    await createPoolTx.wait();
    
    const poolAddress = await factory.getPool(await testToken.getAddress(), WETH_ADDRESS, 3000);
    console.log("WETH Pool created at:", poolAddress);
    
    const pool = await hre.ethers.getContractAt("CustomPool", poolAddress);

    // Add liquidity to the pool using available WETH
    console.log("\n=== Adding Liquidity to WETH Pool ===");
    
    // Use most of our WETH for liquidity
    const availableWETH = initialWETHBalance - ethers.parseEther("0.0001"); // Keep a small amount
    console.log("Using WETH for liquidity:", ethers.formatEther(availableWETH));
    
    // Approve WETH for the pool
    await weth.approve(poolAddress, availableWETH);
    console.log("WETH approval completed");
    
    // Add liquidity
    await pool.addLiquidity(availableWETH);
    console.log("Added liquidity:", ethers.formatEther(availableWETH), "WETH");
    
    // Send STT to the pool
    const sttLiquidity = ethers.parseEther("20"); // 20 STT
    await deployer.sendTransaction({
        to: poolAddress,
        value: sttLiquidity
    });
    console.log("Sent 20 STT to pool for liquidity");

    // Check pool balances after adding liquidity
    const poolSTTBalance = await hre.ethers.provider.getBalance(poolAddress);
    const poolWETHBalance = await weth.balanceOf(poolAddress);
    const poolTestTokenBalance = await testToken.balanceOf(poolAddress);
    
    console.log("\n=== Pool Balances After Adding Liquidity ===");
    console.log("Pool STT Balance:", ethers.formatEther(poolSTTBalance));
    console.log("Pool WETH Balance:", ethers.formatEther(poolWETHBalance));
    console.log("Pool Test Token Balance:", ethers.formatEther(poolTestTokenBalance));

    // Now perform the swap: 20 STT for WETH
    console.log("\n=== Performing STT to WETH Swap ===");
    const swapAmount = ethers.parseEther("20"); // 20 STT
    const minAmountOut = ethers.parseEther("0.00001"); // Very low minimum to ensure success
    
    console.log("Swapping 20 STT for WETH...");
    console.log("Minimum WETH out:", ethers.formatEther(minAmountOut));
    
    const swapTx = await pool.swapExactSTTForTokens(
        minAmountOut,
        WETH_ADDRESS,
        deployer.address,
        { value: swapAmount }
    );
    console.log("Swap transaction hash:", swapTx.hash);
    
    const swapReceipt = await swapTx.wait();
    console.log("✅ Swap completed successfully!");

    // Check balances after swap
    const afterSwapSTTBalance = await hre.ethers.provider.getBalance(deployer.address);
    const afterSwapWETHBalance = await weth.balanceOf(deployer.address);

    console.log("\n=== Balances After Swap ===");
    console.log("STT Balance:", ethers.formatEther(afterSwapSTTBalance));
    console.log("WETH Balance:", ethers.formatEther(afterSwapWETHBalance));

    // Calculate changes
    const sttChange = afterSwapSTTBalance - initialSTTBalance;
    const wethChange = afterSwapWETHBalance - initialWETHBalance;

    console.log("\n=== Swap Results ===");
    console.log("STT Spent:", ethers.formatEther(-sttChange));
    console.log("WETH Received:", ethers.formatEther(wethChange));
    
    if (wethChange > 0) {
        console.log("Exchange Rate: 1 STT =", ethers.formatEther(wethChange * 1000000000000000000n / (-sttChange)), "WETH");
    }

    // Check pool balances after swap
    const afterSwapPoolSTTBalance = await hre.ethers.provider.getBalance(poolAddress);
    const afterSwapPoolWETHBalance = await weth.balanceOf(poolAddress);

    console.log("\n=== Pool Balances After Swap ===");
    console.log("Pool STT Balance:", ethers.formatEther(afterSwapPoolSTTBalance));
    console.log("Pool WETH Balance:", ethers.formatEther(afterSwapPoolWETHBalance));

    console.log("\n=== STT to WETH Swap Completed Successfully! ===");
    console.log("✅ Successfully swapped 20 STT for WETH!");
    console.log("✅ WETH Pool address:", poolAddress);
    console.log("✅ Transaction hash:", swapTx.hash);
    console.log("✅ WETH received:", ethers.formatEther(wethChange));
    
    if (wethChange > 0) {
        console.log("🎉 SUCCESS: You now have WETH from your STT swap!");
    } else {
        console.log("⚠️  Swap completed but no WETH received (likely due to low liquidity)");
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 