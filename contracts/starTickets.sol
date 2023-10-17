// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

interface IStarsArena {
    function buyShares(address sharesSubject, uint256 amount) external payable;
    function sellShares(address sharesSubject, uint256 amount) external payable;
    function getBuyPriceAfterFee(address sharesSubject, uint256 amount) external view returns (uint256);
    function getSellPriceAfterFee(address sharesSubject, uint256 amount) external view returns (uint256);
}

contract StarTickets {
    IStarsArena public starsArena;
    

    struct Contributor {
        address payable addr;
        uint256 contribution;
        uint256 timestamp;
    }

    mapping(address => IERC20Burnable) public subjectToToken;
    mapping(address => Contributor[]) public buyPoolContributors;
    mapping(address => uint256) public buyPoolTotalContribution;
    mapping(address => Contributor[]) public sellPoolContributors;
    mapping(address => uint256) public sellPoolTotalTokens;

    constructor(address _starsArena) {
        starsArena = IStarsArena(_starsArena);
    }
    
     function buyTicket(address subject, uint256 amount) public payable {
        require(msg.value >= amount, "Insufficient funds sent");

        uint256 buyPrice = starsArena.getBuyPriceAfterFee(subject, amount);
        require(msg.value >= buyPrice, "Insufficient funds for ticket price including fee");

        // Buy the ticket
        starsArena.buyShares{value: buyPrice}(subject, amount);

        // Return remaining funds
        uint256 remainingFunds = msg.value - buyPrice;
        if (remainingFunds > 0) {
            payable(msg.sender).transfer(remainingFunds);
        }

        // Now using IERC20Burnable interface
        IERC20Burnable token = subjectToToken[subject];
        if (address(token) == address(0)) {
            // Deploy a new ERC20 for this subject
            ERC20Burnable newToken = new ERC20Burnable("Ticket Token", "TKT");
            subjectToToken[subject] = newToken;
            token = newToken;
        }
        token.mint(msg.sender, amount);  // directly use the mapped interface
    }

    function sellTicket(address subject, uint256 amount) public {
        IERC20Burnable token = subjectToToken[subject];
        require(address(token) != address(0), "Token for subject not found");

        token.burnFrom(msg.sender, amount);  // directly use the mapped interface

        uint256 sellPrice = starsArena.getSellPriceAfterFee(subject, amount);
        starsArena.sellShares(subject, amount);

        payable(msg.sender).transfer(sellPrice);
    }
    
    function sortContributors(Contributor[] storage contributors) internal {
        uint256 len = contributors.length;
        for (uint256 i = 0; i < len; i++) {
            for (uint256 j = 0; j < len - i - 1; j++) {
                if (contributors[j].timestamp > contributors[j + 1].timestamp) {
                    Contributor memory temp = contributors[j];
                    contributors[j] = contributors[j + 1];
                    contributors[j + 1] = temp;
                }
            }
        }
    }

     function addToBuyPool(address subject, uint256 amount) public payable {
        require(msg.value == amount, "Mismatch in sent and declared value");
        
        buyPoolContributors[subject].push(Contributor({
            addr: payable(msg.sender),
            contribution: amount,
            timestamp: block.timestamp
        }));
        buyPoolTotalContribution[subject] += amount;
    }

    function executeBuyPool(address subject, uint256 thresholdAmount) public {
        require(buyPoolTotalContribution[subject] >= thresholdAmount, "Threshold not met");

        uint256 buyPrice = starsArena.getBuyPriceAfterFee(subject, thresholdAmount);
        require(buyPrice <= buyPoolTotalContribution[subject], "Insufficient funds in pool");

        // Buy the ticket
        starsArena.buyShares{value: buyPrice}(subject, thresholdAmount);
        
       
       // Sort contributors by timestamp and reimburse
        
        Contributor[] storage contributors = buyPoolContributors[subject];
        uint256 sortLen = contributors.length;  // For sorting
        sortContributors(contributors);

        // Reimburse contributors and adjust the total pool value
        uint256 remainingFunds = buyPoolTotalContribution[subject] - buyPrice;
        uint256 reimbursed = 0;

        for (uint256 i = 0; i < sortLen; i++) {
            if (reimbursed + contributors[i].contribution <= remainingFunds) {
                contributors[i].addr.transfer(contributors[i].contribution);
                reimbursed += contributors[i].contribution;
            } else {
                uint256 partial = remainingFunds - reimbursed;
                contributors[i].addr.transfer(partial);
                reimbursed += partial;
                break;
            }
        }

        buyPoolTotalContribution[subject] = remainingFunds - reimbursed;
        
         uint256 fundsUsed = 0;
        uint256 len = buyPoolContributors[subject].length;

        // Mint tokens and distribute them to contributors
        IERC20Burnable token = subjectToToken[subject];
        if (address(token) == address(0)) {
            // Deploy a new ERC20 for this subject
            ERC20Burnable newToken = new ERC20Burnable("Ticket Token", "TKT");
            subjectToToken[subject] = newToken;
            token = newToken;
        }

        for (uint256 i = 0; i < len && fundsUsed < buyPrice; i++) {
            uint256 amountToUse = contributors[i].contribution;
            if (fundsUsed + amountToUse > buyPrice) {
                amountToUse = buyPrice - fundsUsed;
            }
            fundsUsed += amountToUse;

            // Reduce the contributor's remaining funds
            contributors[i].contribution -= amountToUse;

            uint256 tokenAmount = (amountToUse * thresholdAmount) / buyPrice;
            token.mint(contributors[i].addr, tokenAmount);
        }

        // Filter out contributors with zero remaining funds and prepare for the next round
        uint256 j = 0;
        for (uint256 i = 0; i < len; i++) {
            if (contributors[i].contribution > 0) {
                contributors[j] = contributors[i];
                j++;
            }
        }
        // Adjust the length of the array to remove zeroed contributors
        assembly { sstore(contributors.slot, j) }
    }

        function addToSellPool(address subject, uint256 amount) public {
        IERC20Burnable token = subjectToToken[subject];
        require(address(token) != address(0), "No associated token for the subject");

        token.transferFrom(msg.sender, address(this), amount);

        sellPoolContributors[subject].push(Contributor({
            addr: payable(msg.sender),
            contribution: amount,
            timestamp: block.timestamp
        }));
        sellPoolTotalTokens[subject] += amount;
    }

    function executeSellPool(address subject, uint256 thresholdAmount) public {
        require(sellPoolTotalTokens[subject] >= thresholdAmount, "Threshold not met");

        uint256 sellPrice = starsArena.getSellPriceAfterFee(subject, thresholdAmount);
        IERC20Burnable token = subjectToToken[subject];

        // Sell the tokens
        token.approve(address(starsArena), thresholdAmount);
        starsArena.sellShares(subject, thresholdAmount);

         // Sort contributors by timestamp
        Contributor[] storage contributors = sellPoolContributors[subject];
        uint256 sortLen = contributors.length;  // For sorting
        sortContributors(contributors);

        // Distribute the received Avax to contributors
        uint256 tokensUsed = 0;
        for (uint256 i = 0; i < sortLen && tokensUsed < thresholdAmount; i++) {
            uint256 amountToUse = contributors[i].contribution;
            if (tokensUsed + amountToUse > thresholdAmount) {
                amountToUse = thresholdAmount - tokensUsed;
            }
            tokensUsed += amountToUse;

            // Reduce the contributor's remaining tokens
            contributors[i].contribution -= amountToUse;

            uint256 avaxAmount = (amountToUse * sellPrice) / thresholdAmount;
            contributors[i].addr.transfer(avaxAmount);
        }

        sellPoolTotalTokens[subject] -= thresholdAmount;

        // Filter out contributors with zero remaining tokens
        uint256 j = 0;
        for (uint256 i = 0; i < sortLen; i++) {
            if (contributors[i].contribution > 0) {
                contributors[j] = contributors[i];
                j++;
            }
        }
        // Adjust the length of the array to remove zeroed contributors
        assembly { sstore(contributors.slot, j) }
    }

}
