const hre = require("hardhat");

async function main() {
    console.log("🎯 Testing INSOMN Swap with Existing Pool...");
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("Testing with account:", deployer.address);

    // Contract addresses from previous deployment
    const FACTORY_ADDRESS = "0x8669cD81994740D517661577A72B84d0a308D8b0";
    const INSOMN_ADDRESS = "0xCdaC954Cff3be5eBED645745c85dc13cC2c97836";
    const POOL_ADDRESS = "0xaA19FBBd3f5FD24cd5Db040364e91b9fa86aa18f";
    const WETH_ADDRESS = "0xd2480162Aa7F02Ead7BF4C127465446150D58452";

    // Get contract instances
    const factory = await hre.ethers.getContractAt("Factory", FACTORY_ADDRESS);
    const insomnToken = await hre.ethers.getContractAt("INSOMNToken", INSOMN_ADDRESS);
    const pool = await hre.ethers.getContractAt("CustomPool", POOL_ADDRESS);

    console.log("\n=== Contract Addresses ===");
    console.log("Factory Address:", FACTORY_ADDRESS);
    console.log("INSOMN Token Address:", INSOMN_ADDRESS);
    console.log("Pool Address:", POOL_ADDRESS);
    console.log("WETH Address:", WETH_ADDRESS);

    // Check initial balances
    const initialSTTBalance = await hre.ethers.provider.getBalance(deployer.address);
    const initialInsomnBalance = await insomnToken.balanceOf(deployer.address);

    console.log("\n=== Initial Balances ===");
    console.log("STT Balance:", ethers.formatEther(initialSTTBalance));
    console.log("INSOMN Balance:", ethers.formatEther(initialInsomnBalance));

    // Check pool info
    const token0 = await pool.token0();
    const token1 = await pool.token1();
    console.log("\n=== Pool Info ===");
    console.log("Pool Token 0:", token0);
    console.log("Pool Token 1:", token1);

    // Check pool balances
    const poolSTTBalance = await hre.ethers.provider.getBalance(POOL_ADDRESS);
    const poolInsomnBalance = await insomnToken.balanceOf(POOL_ADDRESS);
    
    console.log("\n=== Pool Balances ===");
    console.log("Pool STT Balance:", ethers.formatEther(poolSTTBalance));
    console.log("Pool INSOMN Balance:", ethers.formatEther(poolInsomnBalance));

    // If pool has liquidity, test the swap
    if (poolSTTBalance > 0 && poolInsomnBalance > 0) {
        console.log("\n=== Pool has liquidity! Testing STT to INSOMN Swap ===");
        
        const swapAmount = ethers.parseEther("20"); // 20 STT
        const minAmountOut = ethers.parseEther("1000"); // Minimum 1000 INSOMN out
        
        console.log("Swapping 20 STT for INSOMN...");
        console.log("Minimum INSOMN out:", ethers.formatEther(minAmountOut));
        
        const swapTx = await pool.swapExactSTTForTokens(
            minAmountOut,
            INSOMN_ADDRESS,
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
        const insomnChange = afterSwapInsomnBalance - initialInsomnBalance;

        console.log("\n=== Swap Results ===");
        console.log("STT Spent:", ethers.formatEther(-sttChange));
        console.log("INSOMN Received:", ethers.formatEther(insomnChange));
        
        if (insomnChange > 0) {
            console.log("Exchange Rate: 1 STT =", ethers.formatEther(insomnChange * 1000000000000000000n / (-sttChange)), "INSOMN");
        }

        // Test reverse swap: INSOMN to STT
        if (insomnChange > 0) {
            console.log("\n=== Testing INSOMN to STT Swap ===");
            const reverseSwapAmount = ethers.parseEther("5000"); // 5000 INSOMN
            const minSTTOut = ethers.parseEther("0.1"); // Minimum 0.1 STT out
            
            console.log("Swapping 5000 INSOMN for STT...");
            console.log("Minimum STT out:", ethers.formatEther(minSTTOut));
            
            // Approve INSOMN for swap
            await insomnToken.approve(POOL_ADDRESS, reverseSwapAmount);
            
            const reverseSwapTx = await pool.swapExactTokensForSTT(
                reverseSwapAmount,
                minSTTOut,
                INSOMN_ADDRESS,
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

            console.log("\n🎉 === INSOMN Swap Test Completed Successfully! ===");
            console.log("✅ STT to INSOMN Swap: SUCCESSFUL");
            console.log("✅ INSOMN to STT Swap: SUCCESSFUL");
            console.log("✅ Exchange Rate: 1 STT =", ethers.formatEther(insomnChange * 1000000000000000000n / (-sttChange)), "INSOMN");
            console.log("🎯 Your INSOMN token is working perfectly!");
        }
        
    } else {
        console.log("\n⚠️  Pool needs more liquidity. Adding some...");
        
        // Add more INSOMN tokens to the pool
        const additionalInsomn = ethers.parseEther("50000"); // 50,000 more INSOMN
        await insomnToken.transfer(POOL_ADDRESS, additionalInsomn);
        console.log("✅ Added 50,000 more INSOMN tokens to pool");
        
        // Add more STT to the pool
        const additionalSTT = ethers.parseEther("25"); // 25 more STT
        await deployer.sendTransaction({
            to: POOL_ADDRESS,
            value: additionalSTT
        });
        console.log("✅ Added 25 more STT to pool");
        
        console.log("\n🔄 Pool liquidity updated! You can now test swaps.");
        console.log("💡 Run this script again to test the swap functionality.");
    }

    console.log("\n🔗 Block Explorer: https://shannon-explorer.somnia.network/");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 