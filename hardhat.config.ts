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



let config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
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
 
}


export default config