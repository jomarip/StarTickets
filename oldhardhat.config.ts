import "catapulta/hardhat";
import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-web3"
import "@nomiclabs/hardhat-etherscan"
import "@typechain/hardhat"
import "hardhat-gas-reporter"
import "solidity-coverage"
import "hardhat-deploy"

import { HardhatUserConfig } from "hardhat/config"
import dotenv from "dotenv"
import { ethers } from "ethers"

dotenv.config()

if (process.env.HARDHAT_FORK) {
  process.env["HARDHAT_DEPLOY_FORK"] = process.env.HARDHAT_FORK
}


let config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        url: "https://api.avax.network/ext/bc/C/rpc",
        accounts: [process.env.PRIVATE_KEY],
      },
      deploy: ["./deploy"],
    },
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [process.env.PRIVATE_KEY],
    },
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      deploy: ["./deploy/mainnet/"],
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  paths: {
    sources: "./contracts",
    artifacts: "./build/artifacts",
    cache: "./build/cache",
  },
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: false,
            runs: 10000,
          },
        },
      },
    ],
  },
  typechain: {
    outDir: "./build/typechain/",
    target: "ethers-v5",
  },
  gasReporter: {
    currency: "USD",
    gasPrice: 21,
  },
  mocha: {
    timeout: 200000,
  },
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
      1: 0, // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
      42161: 0, // use the same address on arbitrum mainnet
      10: 0, // use the same address on optimism mainnet
      250: 0, // use the same address on fantom mainnet
    },
    libraryDeployer: {
      default: 1, // use a different account for deploying libraries on the hardhat network
      1: 0, // use the same address as the main deployer on mainnet
      42161: 0, // use the same address on arbitrum mainnet
      10: 0, // use the same address on optimism mainnet
      250: 0, // use the same address on fantom mainnet
    },
  },
 
}

if (process.env.ACCOUNT_PRIVATE_KEYS) {
  config.networks = {
    ...config.networks,
    avalanche: {
      ...config.networks?.mainnet,
      accounts: JSON.parse(process.env.ACCOUNT_PRIVATE_KEYS),
    },
    arbitrum_mainnet: {
      ...config.networks?.arbitrum_mainnet,
      accounts: JSON.parse(process.env.ACCOUNT_PRIVATE_KEYS),
    },
    optimism_mainnet: {
      ...config.networks?.optimism_mainnet,
      accounts: JSON.parse(process.env.ACCOUNT_PRIVATE_KEYS),
    },
    fantom_mainnet: {
      ...config.networks?.fantom_mainnet,
      accounts: JSON.parse(process.env.ACCOUNT_PRIVATE_KEYS),
    },
  }
}

if (process.env.FORK_MAINNET === "true" && config.networks) {
  console.log("FORK_MAINNET is set to true")
  config = {
    ...config,
    networks: {
      ...config.networks,
      hardhat: {
        ...config.networks.hardhat,
        forking: {
          url: process.env.ALCHEMY_API ? process.env.ALCHEMY_API : "",
        },
        chainId: 1,
      },
    },
    external: {
      deployments: {
        localhost: ["deployments/mainnet"],
      },
    },
  }
}

export default config