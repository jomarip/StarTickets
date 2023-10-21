import { ethers, getNamedAccounts } from "hardhat";
import dotenv from "dotenv";

dotenv.config();

//console.log("Private Key:", process.env.PRIVATE_KEY);
const privateKey = process.env.PRIVATE_KEY || ""; // Make sure this is properly set in your .env file

async function main() {
  const provider = ethers.provider; // Hardhat's built-in provider
  const wallet = new ethers.Wallet(privateKey); // Create a wallet from the private key
  const signer = wallet.connect(provider); // Connect the wallet to the provider


  // The rest of your deployment logic
  const owner = "0x3CdD4A239f696bc9DfbB6d90954Ae5B77800F73d";
  
  console.log("Account balance:", (await signer.getBalance()).toString());

  // Fetch StarRegistry Factory
  const StarRegistryFactory = await ethers.getContractFactory("StarRegistry");

  // Deploy StarRegistry contract
  const starRegistry = await StarRegistryFactory.connect(signer).deploy(owner);
  await starRegistry.deployed();

  console.log("StarRegistry contract deployed to:", starRegistry.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
