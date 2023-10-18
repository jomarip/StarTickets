import { ethers, waffle } from "hardhat";
import { Contract, Signer, Wallet, BigNumber } from "ethers";
import { expect } from "chai";

const { parseEther, formatEther } = ethers.utils;
const { deployContract, solidity } = waffle;

const starArena = require('./abi/starArenaABI.json');


describe("Starticket and Stars Arena Contracts Tests", function () {
    let StarticketContract: Contract;
    let StarsArenaContract: Contract;
    let owner: Signer;
    let purchaser: Signer;
    let redeemer: Signer;
    
    beforeEach(async () => {
         // Setup signers
        [owner, purchaser, redeemer] = await ethers.getSigners();
        
        //connect to StarsArena Contract
        const existingStarsArenaAddress = "0x563395A2a04a7aE0421d34d62ae67623cAF67D03"; 
        StarsArenaContract = new ethers.Contract(existingStarsArenaAddress, starArena, owner);
    
        // Deploy the StarTickets Contract
        const StarTickets = await ethers.getContractFactory("StarTickets");
        starticketContract = await deployContract(owner, StarTickets, [starsArenaContract.address]);
     });
     
   

    describe("Interactions between Starticket and Stars Arena", () => {
        it("should handle ticket purchases correctly", async function () {
            const [owner, user] = await ethers.getSigners();
            const subject = "0xc96fb6e79e2b4cc477c928f4a5c5180bfeee3786"; // SnowballDeFi
            const amount = BigNumber.from(1); // Replace with actual amount

            // Calculate buy price after fee
            const buyPrice = await starsArena.getBuyPriceAfterFee(subject, amount);

            // Test 1: Sending less amount than required
            await expect(
              starTickets.connect(user).buyTicket(subject, amount, { value: buyPrice.sub(1) })
            ).to.be.revertedWith("Insufficient funds for ticket price including fee");

            // Test 2: Sending the exact required amount
            await starTickets.connect(user).buyTicket(subject, amount, { value: buyPrice });

            // Verify that the user received the ERC20 token
            const token = await starTickets.subjectToToken(subject);
            expect(await token.balanceOf(user.address)).to.equal(amount);

            // Verify that Stars Arena contract shows the user has the ticket
            expect(await starsArena.sharesBalance(user.address, subject)).to.equal(amount);

            // Test 3: Sending more than the required amount
            const extraAmount = BigNumber.from(5);
            await starTickets.connect(user).buyTicket(subject, amount, { value: buyPrice.add(extraAmount) });

            // Verify remaining funds are returned
            expect(await ethers.provider.getBalance(user.address)).to.equal(
              // Previous balance - gas fees (skipped here) - buyPrice
              await ethers.provider.getBalance(user.address) + extraAmount
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