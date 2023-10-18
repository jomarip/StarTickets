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

interface IERC20Burnable is IERC20 {
    function burn(uint256 amount) external;
    function burnFrom(address account, uint256 amount) external;
    function mint(address to, uint256 amount) external; 
}

contract MyBurnableToken is ERC20Burnable {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}
}

contract StarTickets {
    IStarsArena public starsArena;

    mapping(address => IERC20Burnable) public subjectToToken;  // already correctly defined

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
            ERC20Burnable newToken = new MyBurnableToken("Ticket Token", "TKT");
            subjectToToken[subject] = IERC20Burnable(address(newToken));
            token = IERC20Burnable(address(newToken));
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
}
