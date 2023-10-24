import { ethers, getNamedAccounts } from "hardhat";
import { utils } from "ethers"; 
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
  const implementation = "0x929FBbbDec4f51c23C2CA403C1C7f20F9Cd780fd";
  const starsArenaAddress = "0x563395A2a04a7aE0421d34d62ae67623cAF67D03";
  
  // Get the function selector for the 'initialize' function
  const functionSelector = utils.id("initialize(address,address,address)").slice(0, 10); // First 4 bytes of the hash

  // ABI-encode the arguments needed for the 'initialize' function
  const encodedArguments = utils.defaultAbiCoder.encode(
    ["address", "address", "address"],
    [starsArenaAddress, implementation, owner]
  );
  
  // Concatenate the function selector and the encoded arguments
  const _data = functionSelector + encodedArguments.slice(2);  // Slice(2) removes the '0x'
  
  console.log("Account balance:", (await signer.getBalance()).toString());

  // Fetch Proxy Factory
  const ProxyFactory = await ethers.getContractFactory("TransparentUpgradeableProxy");

  // Deploy Proxy contract
  
  // ABI-encode the arguments for the TransparentUpgradeableProxy constructor
    const encodedConstructorArgs = ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "bytes"],
      [implementation, owner, _data]
    );
    
  console.log("ABI Encoded Constructor: ",encodedConstructorArgs);

  //const proxy = await ProxyFactory.connect(signer).deploy(implementation,owner,_data);
  //await proxy.deployed();

  console.log("Proxy contract deployed to:", proxy.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
