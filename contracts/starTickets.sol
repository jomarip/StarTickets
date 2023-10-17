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

    mapping(address => IERC20Burnable) public subjectToToken;

    constructor(address _starsArena) {
        starsArena = IStarsArena(_starsArena);
    }

    function buyTickets(address[] memory subjects, uint256[] memory amounts) public payable {
        require(subjects.length == amounts.length, "Mismatch between subjects and amounts");
        
        uint256 totalBuyPrice = 0;
        for (uint i = 0; i < subjects.length; i++) {
            uint256 buyPrice = starsArena.getBuyPriceAfterFee(subjects[i], amounts[i]);
            totalBuyPrice += buyPrice;
        }
        require(msg.value >= totalBuyPrice, "Insufficient funds for ticket prices including fees");

        for (uint i = 0; i < subjects.length; i++) {
            starsArena.buyShares{value: starsArena.getBuyPriceAfterFee(subjects[i], amounts[i])}(subjects[i], amounts[i]);
            IERC20Burnable token = subjectToToken[subjects[i]];
            if (address(token) == address(0)) {
                ERC20Burnable newToken = new ERC20Burnable("Ticket Token", "TKT");
                subjectToToken[subjects[i]] = newToken;
                token = newToken;
            }
            token.mint(msg.sender, amounts[i]);
        }

        uint256 remainingFunds = msg.value - totalBuyPrice;
        if (remainingFunds > 0) {
            payable(msg.sender).transfer(remainingFunds);
        }
    }

    function sellTickets(address[] memory subjects, uint256[] memory amounts) public {
        require(subjects.length == amounts.length, "Mismatch between subjects and amounts");

        uint256 totalSellPrice = 0;
        for (uint i = 0; i < subjects.length; i++) {
            IERC20Burnable token = subjectToToken[subjects[i]];
            require(address(token) != address(0), "Token for subject not found");
            token.burnFrom(msg.sender, amounts[i]);
            totalSellPrice += starsArena.getSellPriceAfterFee(subjects[i], amounts[i]);
            starsArena.sellShares(subjects[i], amounts[i]);
        }

        payable(msg.sender).transfer(totalSellPrice);
    }
}
