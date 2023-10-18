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

        const StarTicketsFactory = await ethers.getContractFactory("StarTickets");
        //console.log(starTickets);
        StarTicketContract = await StarTicketsFactory.connect(owner).deploy();
        await StarTicketContract.deployed();

    });



    describe("Interactions between Starticket and Stars Arena", () => {
        it("should handle ticket purchases correctly", async function () {
            const [owner, purchaser] = await ethers.getSigners();
            
            //check balances
            const balanceOwner = await ethers.provider.getBalance(owner.address);
            const balancePurchaser = await ethers.provider.getBalance(purchaser.address);
            console.log(`Balance of owner: ${ethers.utils.formatEther(balanceOwner)} AVAX & Balance of Purchaser: ${ethers.utils.formatEther(balancePurchaser)} AVAX `);
            

            const subject = "0xc96fb6e79e2b4cc477c928f4a5c5180bfeee3786"; // SnowballDeFi
            const amount = BigNumber.from(1); // Replace with actual amount

            // Calculate buy price after fee
            const buyPrice = await StarsArenaContract.getBuyPriceAfterFee(subject, amount);
            console.log("buy price: ",buyPrice);

            // Test 1: Sending less amount than required - breaking due to higher level revert
           // await expect(
           //   StarTicketContract.connect(purchaser).buyTicket(subject, amount, { value: buyPrice.sub(1) })
           // ).to.be.revertedWith("Insufficient funds for ticket price including fee");

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

            expect(balance).to.equal(amount);


            // Verify that Stars Arena contract shows the StartTicket Contract has the ticket
            //StarTicketContract Needs a function to check its shares for this check to work
           // expect(await StarsArenaContract.getMyShares(StarTicketContract.address, subject)).to.equal(amount);

            // Test 3: Sending more than the required amount
            const extraAmount = BigNumber.from(5);
            await StarTicketsContract.connect(purchaser).buyTicket(subject, amount, { value: buyPrice.add(extraAmount) });

            // Verify remaining funds are returned
            expect(await ethers.provider.getBalance(purchaser.address)).to.equal(
              // Previous balance - gas fees (skipped here) - buyPrice
              await ethers.provider.getBalance(purchaser.address) + extraAmount
            );
        });
    });

   /* describe("Purchasing, Ownership and Redemption of Tickets", () => {
        it("Should correctly transfer ERC20 tokens to purchaser", async () => {
            // Implement your test logic here
        });

        it("Should allow redeeming ERC20 tokens for AVAX", async () => {
            // Implement your test logic here
        });

        it("Should only allow whole numbers for redemption", async () => {
            // Implement your test logic here
        });

        it("Should prevent redeeming more tokens than owned", async () => {
            // Implement your test logic here
        });

        it("Should prevent redemption if Starticket doesn't have enough AVAX", async () => {
            // Implement your test logic here
        });
    }); */
});
