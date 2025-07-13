require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Debug: Check if environment variables are loaded
console.log("Hardhat config - PRIVATE_KEY:", process.env.PRIVATE_KEY ? "Set" : "Not set");
console.log("Hardhat config - RPC_URL:", process.env.RPC_URL || "Not set");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    somniaTestnet: {
      url: process.env.RPC_URL || "https://dream-rpc.somnia.network/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 50312,
    },
  },
};
