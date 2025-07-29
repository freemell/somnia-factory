const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying INSOMN Token and Setting Up Swap Pool...");
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Contract addresses
    const FACTORY_ADDRESS = "0x73367ace5E99095A51B0b4991516A7CFC4c7d229";

    // Get factory instance
    const factory = await hre.ethers.getContractAt("Factory", FACTORY_ADDRESS);

    console.log("\n=== Contract Addresses ===");
    console.log("Factory Address:", FACTORY_ADDRESS);

    // Check initial balances
    const initialSTTBalance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("\n=== Initial Balances ===");
    console.log("STT Balance:", ethers.formatEther(initialSTTBalance));

    // Deploy INSOMN Token
    console.log("\n=== Deploying INSOMN Token ===");
    const INSOMNToken = await hre.ethers.getContractFactory("INSOMNToken");
    const insomnToken = await INSOMNToken.deploy();
    await insomnToken.waitForDeployment();
    
    const insomnAddress = await insomnToken.getAddress();
    console.log("✅ INSOMN Token deployed at:", insomnAddress);
    console.log("Token Name:", await insomnToken.name());
    console.log("Token Symbol:", await insomnToken.symbol());
    console.log("Token Decimals:", await insomnToken.decimals());
    
    // Check INSOMN balance
    const insomnBalance = await insomnToken.balanceOf(deployer.address);
    console.log("INSOMN Balance:", ethers.formatEther(insomnBalance));

    // Create pool with INSOMN and WETH
    console.log("\n=== Creating INSOMN/WETH Pool ===");
    const WETH_ADDRESS = "0xd2480162Aa7F02Ead7BF4C127465446150D58452";
    
    const createPoolTx = await factory.createPool(insomnAddress, WETH_ADDRESS, 3000, 60);
    await createPoolTx.wait();
    
    const poolAddress = await factory.getPool(insomnAddress, WETH_ADDRESS, 3000);
    console.log("✅ INSOMN/WETH Pool created at:", poolAddress);
    
    const pool = await hre.ethers.getContractAt("CustomPool", poolAddress);

    // Get pool info
    const token0 = await pool.token0();
    const token1 = await pool.token1();
    console.log("Pool Token 0:", token0);
    console.log("Pool Token 1:", token1);

    // Add liquidity to the pool
    console.log("\n=== Adding Liquidity to INSOMN/WETH Pool ===");
    
    // Add INSOMN liquidity
    const insomnLiquidity = ethers.parseEther("100000"); // 100,000 INSOMN tokens
    await insomnToken.approve(poolAddress, insomnLiquidity);
    await pool.addLiquidity(insomnLiquidity);
    console.log("✅ Added liquidity: 100,000 INSOMN tokens");
    
    // Send STT to the pool
    const sttLiquidity = ethers.parseEther("50"); // 50 STT
    await deployer.sendTransaction({
        to: poolAddress,
        value: sttLiquidity
    });
    console.log("✅ Sent 50 STT to pool for liquidity");

    // Check pool balances after adding liquidity
    const poolSTTBalance = await hre.ethers.provider.getBalance(poolAddress);
    const poolInsomnBalance = await insomnToken.balanceOf(poolAddress);
    
    console.log("\n=== Pool Balances After Adding Liquidity ===");
    console.log("Pool STT Balance:", ethers.formatEther(poolSTTBalance));
    console.log("Pool INSOMN Balance:", ethers.formatEther(poolInsomnBalance));

    // Now perform the swap: 20 STT for INSOMN
    console.log("\n=== Performing STT to INSOMN Swap ===");
    const swapAmount = ethers.parseEther("20"); // 20 STT
    const minAmountOut = ethers.parseEther("1000"); // Minimum 1000 INSOMN out
    
    console.log("Swapping 20 STT for INSOMN...");
    console.log("Minimum INSOMN out:", ethers.formatEther(minAmountOut));
    
    const swapTx = await pool.swapExactSTTForTokens(
        minAmountOut,
        insomnAddress,
        deployer.address,
        { value: swapAmount }
    );
    console.log("Swap transaction hash:", swapTx.hash);
    
    const swapReceipt = await swapTx.wait();
    console.log("✅ Swap completed successfully!");

    // Check balances after swap
    const afterSwapSTTBalance = await hre.ethers.provider.getBalance(deployer.address);
    const afterSwapInsomnBalance = await insomnToken.balanceOf(deployer.address);

    console.log("\n=== Balances After Swap ===");
    console.log("STT Balance:", ethers.formatEther(afterSwapSTTBalance));
    console.log("INSOMN Balance:", ethers.formatEther(afterSwapInsomnBalance));

    // Calculate changes
    const sttChange = afterSwapSTTBalance - initialSTTBalance;
    const insomnChange = afterSwapInsomnBalance - insomnBalance;

    console.log("\n=== Swap Results ===");
    console.log("STT Spent:", ethers.formatEther(-sttChange));
    console.log("INSOMN Received:", ethers.formatEther(insomnChange));
    console.log("Exchange Rate: 1 STT =", ethers.formatEther(insomnChange * 1000000000000000000n / (-sttChange)), "INSOMN");

    // Check pool balances after swap
    const afterSwapPoolSTTBalance = await hre.ethers.provider.getBalance(poolAddress);
    const afterSwapPoolInsomnBalance = await insomnToken.balanceOf(poolAddress);

    console.log("\n=== Pool Balances After Swap ===");
    console.log("Pool STT Balance:", ethers.formatEther(afterSwapPoolSTTBalance));
    console.log("Pool INSOMN Balance:", ethers.formatEther(afterSwapPoolInsomnBalance));

    // Test reverse swap: INSOMN to STT
    console.log("\n=== Testing INSOMN to STT Swap ===");
    const reverseSwapAmount = ethers.parseEther("5000"); // 5000 INSOMN
    const minSTTOut = ethers.parseEther("0.1"); // Minimum 0.1 STT out
    
    console.log("Swapping 5000 INSOMN for STT...");
    console.log("Minimum STT out:", ethers.formatEther(minSTTOut));
    
    // Approve INSOMN for swap
    await insomnToken.approve(poolAddress, reverseSwapAmount);
    
    const reverseSwapTx = await pool.swapExactTokensForSTT(
        reverseSwapAmount,
        minSTTOut,
        insomnAddress,
        deployer.address
    );
    console.log("Reverse swap transaction hash:", reverseSwapTx.hash);
    
    const reverseSwapReceipt = await reverseSwapTx.wait();
    console.log("✅ Reverse swap completed successfully!");

    // Check final balances
    const finalSTTBalance = await hre.ethers.provider.getBalance(deployer.address);
    const finalInsomnBalance = await insomnToken.balanceOf(deployer.address);

    console.log("\n=== Final Balances ===");
    console.log("Final STT Balance:", ethers.formatEther(finalSTTBalance));
    console.log("Final INSOMN Balance:", ethers.formatEther(finalInsomnBalance));

    // Calculate total changes
    const totalSTTChange = finalSTTBalance - initialSTTBalance;
    const totalInsomnChange = finalInsomnBalance - insomnBalance;

    console.log("\n=== Total Results ===");
    console.log("Total STT Change:", ethers.formatEther(totalSTTChange));
    console.log("Total INSOMN Change:", ethers.formatEther(totalInsomnChange));

    console.log("\n🎉 === INSOMN Token and Swap System Successfully Deployed! ===");
    console.log("✅ INSOMN Token Address:", insomnAddress);
    console.log("✅ INSOMN/WETH Pool Address:", poolAddress);
    console.log("✅ Factory Address:", FACTORY_ADDRESS);
    console.log("✅ STT to INSOMN Swap: SUCCESSFUL");
    console.log("✅ INSOMN to STT Swap: SUCCESSFUL");
    console.log("✅ Exchange Rate: 1 STT =", ethers.formatEther(insomnChange * 1000000000000000000n / (-sttChange)), "INSOMN");
    console.log("🎯 Your INSOMN token is now live and tradeable!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 