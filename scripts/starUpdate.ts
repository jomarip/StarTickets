import { ethers } from "hardhat";
import { Contract, Wallet } from "ethers";
import fs from 'fs';
import readline from 'readline';
import fsPromises from 'fs/promises';
import dotenv from "dotenv";

dotenv.config();

async function readLinesIntoArray(stream: readline.Interface) {
  return new Promise<string[]>((resolve, reject) => {
    const array: string[] = [];
    stream.on('line', (line) => {
      array.push(line);
    });
    stream.on('close', () => {
      resolve(array);
    });
    stream.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  const provider = ethers.provider;
  const privateKey = process.env.PRIVATE_KEY || "";
  const wallet = new ethers.Wallet(privateKey);
  const signer = wallet.connect(provider);

  const starRegistryAddress = "0xacb927baDFe7b07dc5b43e6485A97de21d40dc05";
  const starRegistryABI = [{"inputs":[{"internalType":"address","name":"initialOwner","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"registrar","type":"address"}],"name":"RegistrarAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"registrar","type":"address"}],"name":"RegistrarRemoved","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"starName","type":"string"},{"indexed":false,"internalType":"address","name":"subjectAddress","type":"address"}],"name":"StarAdded","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"string","name":"starName","type":"string"},{"indexed":false,"internalType":"address","name":"subjectAddress","type":"address"}],"name":"StarUpdated","type":"event"},{"inputs":[{"internalType":"address","name":"_registrar","type":"address"}],"name":"addRegistrar","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_starName","type":"string"},{"internalType":"address","name":"_subjectAddress","type":"address"}],"name":"addStar","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string[]","name":"_starNames","type":"string[]"},{"internalType":"address[]","name":"_subjectAddresses","type":"address[]"}],"name":"addStars","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_subjectAddress","type":"address"}],"name":"getStarOfSubjectAddress","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"_starName","type":"string"}],"name":"getSubjectAddressOfStar","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"registrars","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_registrar","type":"address"}],"name":"removeRegistrar","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"starToSubjectAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"subjectAddressToStar","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_oldStarName","type":"string"},{"internalType":"string","name":"_newStarName","type":"string"},{"internalType":"address","name":"_newSubjectAddress","type":"address"}],"name":"updateStar","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_starName","type":"string"},{"internalType":"address","name":"_newSubjectAddress","type":"address"}],"name":"updateStar","outputs":[],"stateMutability":"nonpayable","type":"function"}];  // Replace with the actual ABI

  const StarRegistry = new ethers.Contract(starRegistryAddress, starRegistryABI, signer);

  const starData: { starName: string, subjectAddress: string }[] = [];
  const starsPerBatch = 250;

  console.log("Initializing star and subject streams...");

  const starStream = readline.createInterface({
    input: fs.createReadStream('star.csv'),
    output: process.stdout,
    terminal: false
  });

  const subjectStream = readline.createInterface({
    input: fs.createReadStream('subject.csv'),
    output: process.stdout,
    terminal: false
  });

  console.log("Reading data from streams...");

  try {
    const [starNames, subjectAddresses] = await Promise.all([
      readLinesIntoArray(starStream),
      readLinesIntoArray(subjectStream)
    ]);

    console.log("Both streams have been read.");

    let lastSuccessfulBatch = 0;
    try {
      const data = await fsPromises.readFile('last_successful_batch.txt', 'utf8');
      lastSuccessfulBatch = parseInt(data, 10);
      if (isNaN(lastSuccessfulBatch)) {
        console.error("Parsed value from 'last_successful_batch.txt' is NaN.");
        process.exit(1);
      }
    } catch (e) {
      console.error("An error occurred while reading 'last_successful_batch.txt': ", e);
      // Write a new 'last_successful_batch.txt' with value 0
      await fsPromises.writeFile('last_successful_batch.txt', '0');
      console.log("'last_successful_batch.txt' file has been created.");
    }

    console.log("Stream closed. Processing the data...");

    for (let i = 0; i < starNames.length; i++) {
      starData.push({ starName: starNames[i], subjectAddress: subjectAddresses[i] });
    }

    console.log("Star Data Length: ", starData.length);

    if (starData.length === 0) {
      console.log("The starData array is empty. Exiting.");
      process.exit(1);
    }

    console.log(`Starting from index: ${lastSuccessfulBatch}`);

    for (let i = lastSuccessfulBatch; i < starData.length; i += starsPerBatch) {
      console.log(`Processing batch starting at index ${i}`);
      try {
        const batch = starData.slice(i, i + starsPerBatch);

        if (batch.length === 0) {
          console.log("No data in this batch. Exiting loop.");
          break;
        }

        const starNamesBatch = batch.map(b => b.starName);
        const subjectAddressesBatch = batch.map(b => b.subjectAddress);

        console.log(`Attempting to send transaction for batch: ${JSON.stringify(starNamesBatch)}`);
        
        //const estimatedGas = await StarRegistry.connect(signer).estimateGas.addStars(starNamesBatch, subjectAddressesBatch);
        //console.log("Transaction sent: ",estimatedGas);
        
        const tx = await StarRegistry.connect(signer).addStars(starNamesBatch, subjectAddressesBatch, {
  gasLimit: 15000000,
  maxPriorityFeePerGas: ethers.utils.parseUnits('1', 'gwei'),
  maxFeePerGas: ethers.utils.parseUnits('30', 'gwei')
});

        //const tx = await StarRegistry.connect(signer).addStars(starNamesBatch, subjectAddressesBatch);
        console.log(`Transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log(`Transaction confirmed: ${tx.hash}`);
        console.log(`Successfully submitted star names: ${starNamesBatch.join(', ')}`);

        lastSuccessfulBatch = i + starsPerBatch;
        await fsPromises.writeFile('last_successful_batch.txt', lastSuccessfulBatch.toString());
      } catch (e) {
        console.error(`Transaction failed: ${e}`);
        process.exit(1);
      }
    }


  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
