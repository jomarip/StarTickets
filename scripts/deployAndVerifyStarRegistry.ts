import { ethers } from "hardhat";
import dotenv from "dotenv";
import axios from "axios";
import fs from "fs";

dotenv.config();

const privateKey = process.env.PRIVATE_KEY || ""; // Make sure this is properly set in your .env file
const snowtraceApiKey = process.env.SNOWTRACE_API_KEY || ""; // Add your Snowtrace API key to your .env file

async function main() {
  const provider = ethers.provider; // Hardhat's built-in provider
  const wallet = new ethers.Wallet(privateKey); // Create a wallet from the private key
  const signer = wallet.connect(provider); // Connect the wallet to the provider

  console.log("Account balance:", (await signer.getBalance()).toString());
  
  const owner = "0x3CdD4A239f696bc9DfbB6d90954Ae5B77800F73d";

  // Fetch StarRegistry Factory
  const StarRegistryFactory = await ethers.getContractFactory("StarRegistry");

  // Deploy StarRegistry contract
  const starRegistry = await StarRegistryFactory.connect(signer).deploy(owner);
  await starRegistry.deployed();

  console.log("StarRegistry contract deployed to:", starRegistry.address);

  // Contract Verification
  const contractName = "StarRegistry";
  const compilerVersion = "v0.8.20+commit.a1b79de6"; // Replace with your compiler version
  const optimizationUsed = 0; // Replace based on your config
  const runs = 200; // Replace based on your config
  const constructorArguments = "0000000000000000000000003cdd4a239f696bc9dfbb6d90954ae5b77800f73d"; // Replace with ABI-encoded constructor arguments

  const sourceCode = fs.readFileSync(`contracts/starRegistry.sol`, "utf8");

  const apiUrl = "https://api.snowtrace.io/api";
  const requestPayload = {
    apikey: snowtraceApiKey,
    module: "contract",
    action: "verifysourcecode",
    sourceCode,
    contractaddress: starRegistry.address,
    codeformat: "solidity-single-file",
    contractname: contractName,
    compilerversion: compilerVersion,
    optimizationused: optimizationUsed,
    runs,
    constructorArguements: constructorArguments,
    // Add more params like licenseType, library names, and addresses if needed
  };

  try {
    const response = await axios.post(apiUrl, requestPayload, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const { data } = response;
    if (data.status === "1") {
      console.log(`Verification successful. GUID: ${data.result}`);
    } else {
      console.log(`Verification failed. Error: ${data.result}`);
    }
  } catch (error) {
    console.error(`Failed to verify contract. Error: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
