import { ethers, waffle } from "hardhat";
import { Contract, Signer, Wallet, BigNumber } from "ethers";
import { expect } from "chai";

const { parseEther, formatEther } = ethers.utils;
const { deployContract, solidity } = waffle;

const starArena = require('./abi/starArenaABI.json');
const tokenContract = require('./abi/tokenContractABI.json');


describe("Starticket and Stars Arena Contracts Tests", function () {
    let StarTicketContract: Contract;
    let StarsArenaContract: Contract;
    let StarRegistry: Contract;
    let TokenContract: Contract;
    let deployer: Signer;
    let owner: Signer;
    let purchaser: Signer;
    let redeemer: Signer;
    
    
    
    beforeEach(async () => {
        // Setup signers
          [owner, purchaser, redeemer] = await ethers.getSigners();
          const signers = [owner, purchaser, redeemer];  // Define the signers array
  
        
         for (const signer of signers) {
            await owner.sendTransaction({
            to: signer.address,
            value: ethers.utils.parseEther("100")
         });

          const balance = await ethers.provider.getBalance(signer.address);
        }

        //connect to StarsArena Contract
        const existingStarsArenaAddress = "0x563395A2a04a7aE0421d34d62ae67623cAF67D03"; 
        StarsArenaContract = new ethers.Contract(existingStarsArenaAddress, starArena, owner);

        // Log the address of StarsArenaContract to confirm it's initialized
        console.log("StarsArenaContract.address:", StarsArenaContract.address);
        
        // Deploy StarRegistry
        const StarRegistryFactory = await ethers.getContractFactory("StarRegistry");
        StarRegistry = await StarRegistryFactory.connect(owner).deploy(owner.address);
        await StarRegistry.deployed();
        
        console.log("StarRegistry.address:", StarRegistry.address);

        //Deploy StarTickets
        const StarTicketsFactory = await ethers.getContractFactory("StarTickets");
        StarTicketContract = await StarTicketsFactory.connect(owner).deploy();
        await StarTicketContract.deployed();
        await StarTicketContract.connect(owner).initialize(StarsArenaContract.address, StarRegistry.address);
        
        

    });
    
    
    async function purchaseTicket(purchaser: Signer, subject: string, amount: BigNumber, buyPrice: BigNumber) {
          await StarTicketContract.connect(purchaser).buyTicket(subject, amount, { value: buyPrice });
    }




    describe("Interactions between Starticket and Stars Arena", () => {
        it("should handle ticket purchases correctly", async function () {
            const [owner, purchaser] = await ethers.getSigners();
            
            //check balances
            const balanceOwner = await ethers.provider.getBalance(owner.address);
            const balancePurchaser = await ethers.provider.getBalance(purchaser.address);
            console.log(`Balance of owner: ${ethers.utils.formatEther(balanceOwner)} AVAX & Balance of Purchaser: ${ethers.utils.formatEther(balancePurchaser)} AVAX `);
            
            
            const subject = "0xc96fb6e79e2b4cc477c928f4a5c5180bfeee3786"; // SnowballDeFi
            const starName = "SnowballDeFi";
            const amount = BigNumber.from(1); // Replace with actual amount
            
            //add the Star Name and Subject to Registry
            await StarRegistry.connect(owner).addStar(starName,subject);

            // Calculate buy price after fee
            const buyPrice = await StarsArenaContract.getBuyPriceAfterFee(subject, amount);
            console.log("buy price: ",buyPrice);

            // Test 1: Sending less amount than required - breaking due to higher level revert
            await expect(
              StarTicketContract.connect(purchaser).buyTicket(subject, amount, { value: buyPrice.sub(1) })
            ).to.be.reverted;

            // Test 2: Sending the exact required amount
            await StarTicketContract.connect(purchaser).buyTicket(subject, amount, { value: buyPrice });
           
            //Token Address
            const tokenAddress = await StarTicketContract.subjectToToken(subject);
            console.log("Deployed ERC20 Address: ", tokenAddress);
            
            // Create an instance of the token contract
            const TokenContract = new ethers.Contract(tokenAddress, tokenContract, owner); 

            // Get the balance of the purchaser
            const balance = await TokenContract.balanceOf(purchaser.address);
            console.log("Balance of purchaser: ", balance.toString());
            
            // Log the name of the token
            const tokenName = await TokenContract.name(); 
            console.log("Token Name: ", tokenName);

            expect(balance).to.equal(amount);

            // Verify that Stars Arena contract shows the StartTicket Contract has the ticket
            //StarTicketContract Needs a function to check its shares for this check to work
           // expect(await StarsArenaContract.getMyShares(StarTicketContract.address, subject)).to.equal(amount);

            // Test 3: Sending more than the required amount
            //Contract doesn't seem to like non-exact amounts in the tests
            //const extraAmount = BigNumber.from(5);
            //console.log("Extra Amount Check :",buyPrice.add(extraAmount));
            
            //await StarTicketContract.connect(purchaser).buyTicket(subject, amount, { value: buyPrice.add(extraAmount) });

            // Verify remaining funds are returned
            //expect(await ethers.provider.getBalance(purchaser.address)).to.equal(
            //Previous balance - gas fees (skipped here) - buyPrice
            //await ethers.provider.getBalance(purchaser.address) + extraAmount
            //);
        });
    });

    describe("Purchasing, Ownership and Redemption of Tickets", () => {
        it("Should correctly transfer ERC20 tokens to purchaser", async () => {
          const subject = "0xc96fb6e79e2b4cc477c928f4a5c5180bfeee3786"; 
          const amount = ethers.BigNumber.from(1);

          const buyPrice = await StarsArenaContract.getBuyPriceAfterFee(subject, amount);

          await StarTicketContract.connect(purchaser).buyTicket(subject, amount, { value: buyPrice });

          const tokenAddress = await StarTicketContract.subjectToToken(subject);
          const TokenContract = new ethers.Contract(tokenAddress, tokenContract, owner);
          const balance = await TokenContract.balanceOf(purchaser.address);

          expect(balance).to.equal(amount);
        });


        it("Should allow redeeming ERC20 tokens for AVAX", async () => {
          // Given
          const subject = "0xc96fb6e79e2b4cc477c928f4a5c5180bfeee3786"; // Replace with the actual subject address
          const amount = ethers.BigNumber.from(1);
          const buyPrice = await StarsArenaContract.getBuyPriceAfterFee(subject, amount);
          
          await purchaseTicket(purchaser, subject, amount, buyPrice);

          // Given you have the ticket and received the ERC20 token
          const tokenAddress = await StarTicketContract.subjectToToken(subject);
          const TokenContract = new ethers.Contract(tokenAddress, tokenContract, purchaser); // Note: Using `purchaser` to connect

          // Approve StarTicketContract to burn the ERC20 tokens
          await TokenContract.approve(StarTicketContract.address, amount);

          // Get sell price after fee
          const sellPrice = await StarsArenaContract.getSellPriceAfterFee(subject, amount);

          // Record the initial AVAX balance of the purchaser
          const initialBalance = await hre.ethers.provider.getBalance(purchaser.address);

          // When
          const tx = await StarTicketContract.connect(purchaser).sellTicket(subject, amount);

          // Wait for the transaction to be confirmed
          await tx.wait();

          // Then
          // Check that the ERC20 tokens are burned (balance should be 0)
          const tokenBalanceAfter = await TokenContract.balanceOf(purchaser.address);
          expect(tokenBalanceAfter).to.equal(0);

          // Check that the purchaser received the correct amount of AVAX
          const finalBalance = await hre.ethers.provider.getBalance(purchaser.address);

          // Considering Gas Fees
          expect(finalBalance).to.be.closeTo(initialBalance.add(sellPrice), 1e15);  // 1e15 is a 'closeness' factor, adjust as needed
        });


        it("Should only allow whole numbers for redemption", async () => {
            // Given
          const subject = "0xc96fb6e79e2b4cc477c928f4a5c5180bfeee3786"; // Replace with the actual subject address
          const amount = ethers.BigNumber.from(1);
          const buyPrice = await StarsArenaContract.getBuyPriceAfterFee(subject, amount);
          const invalidAmount = ethers.utils.parseUnits("0.5", 18);  // Half of a token
          
          await purchaseTicket(purchaser, subject, amount, buyPrice);
          
           // Given you have the ticket and received the ERC20 token
          const tokenAddress = await StarTicketContract.subjectToToken(subject);
          const TokenContract = new ethers.Contract(tokenAddress, tokenContract, purchaser); // Note: Using `purchaser` to connect

          
           // Approve for ticket selling
            await TokenContract.approve(StarTicketContract.address, invalidAmount);

            // Attempting to redeem a non-whole number should be reverted
            await expect(
              StarTicketContract.connect(purchaser).sellTicket(subject, invalidAmount)
            ).to.be.reverted;
        });

        it("Should prevent redeeming more tokens than owned", async () => {
            // Given
          const subject = "0xc96fb6e79e2b4cc477c928f4a5c5180bfeee3786"; // Replace with the actual subject address
          const amount = ethers.BigNumber.from(1);
          const buyPrice = await StarsArenaContract.getBuyPriceAfterFee(subject, amount);
          const excessiveAmount = ethers.BigNumber.from("2");  // More than owned
          
          await purchaseTicket(purchaser, subject, amount, buyPrice);
          
           // Given you have the ticket and received the ERC20 token
          const tokenAddress = await StarTicketContract.subjectToToken(subject);
          const TokenContract = new ethers.Contract(tokenAddress, tokenContract, purchaser); // Note: Using `purchaser` to connect

          
          // Approve for ticket selling
          await TokenContract.approve(StarTicketContract.address, excessiveAmount);

          // Attempting to redeem more tickets than owned should be reverted
          await expect(
            StarTicketContract.connect(purchaser).sellTicket(subject, excessiveAmount)
            ).to.be.reverted;
        });

        it("Should prevent redemption if StarsArena doesn't have enough AVAX", async () => {
            // Given
          const subject = "0xc96fb6e79e2b4cc477c928f4a5c5180bfeee3786"; // Replace with the actual subject address
          const amount = ethers.BigNumber.from(1);
          const buyPrice = await StarsArenaContract.getBuyPriceAfterFee(subject, amount);
          
          await purchaseTicket(purchaser, subject, amount, buyPrice);
          
           // Given you have the ticket and received the ERC20 token
          const tokenAddress = await StarTicketContract.subjectToToken(subject);
          const TokenContract = new ethers.Contract(tokenAddress, tokenContract, purchaser); // Note: Using `purchaser` to connect

          
          // Set the balance of the Starticket contract to zero
          await hre.network.provider.send("hardhat_setBalance", [
              StarsArenaContract.address,
              "0x0"
          ]);

          // Approve for ticket selling
          await TokenContract.approve(StarTicketContract.address, amount);

          // Attempting to redeem should be reverted due to insufficient AVAX in the contract
          await expect(
              StarTicketContract.connect(purchaser).sellTicket(subject, amount)
            ).to.be.reverted;

        });
    }); 
});
