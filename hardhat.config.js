require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    somnia: {
      url: process.env.RPC_URL,
      chainId: 50312,
      accounts: [process.env.PRIVATE_KEY]
    },
    'somnia-testnet': {
      url: process.env.RPC_URL,
      chainId: 50312,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: {
      'somnia-testnet': 'empty'
    },
    customChains: [
      {
        network: 'somnia-testnet',
        chainId: 50312,
        urls: {
          apiURL: 'https://somnia.w3us.site/api',
          browserURL: 'https://somnia.w3us.site'
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
}; 