pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

interface IStarsArena {
    function buyShares(address sharesSubject, uint256 amount) external payable;
    function sellShares(address sharesSubject, uint256 amount) external payable;
    function getBuyPrice(address sharesSubject, uint256 amount) external view returns (uint256);
    function getSellPrice(address sharesSubject, uint256 amount) external view returns (uint256);
    function getBuyPriceAfterFee(address sharesSubject, uint256 amount) external view returns (uint256);
    function getSellPriceAfterFee(address sharesSubject, uint256 amount) external view returns (uint256);
}

contract StarTickets {
    IStarsArena public starsArena;

    mapping(address => address) public subjectToToken;

    constructor(address _starsArena) {
        starsArena = IStarsArena(_starsArena);
    }

    function buyTicket(address subject, uint256 amount) public payable {
        require(msg.value >= amount, "Insufficient funds sent");

        uint256 buyPrice = starsArena.getBuyPrice(subject, amount);
        require(msg.value >= buyPrice, "Insufficient funds for ticket price");

        starsArena.buyShares{value: buyPrice}(subject, amount);

        address tokenAddress = subjectToToken[subject];
        if (tokenAddress == address(0)) {
            // Deploy a new ERC20 for this subject
            ERC20Burnable newToken = new ERC20Burnable("Ticket Token", "TKT");
            subjectToToken[subject] = address(newToken);
            tokenAddress = address(newToken);
        }

        IERC20(tokenAddress).mint(msg.sender, amount);
    }

    function sellTicket(address subject, uint256 amount) public {
        require(subjectToToken[subject] != address(0), "Token for subject not found");

        address tokenAddress = subjectToToken[subject];
        IERC20(tokenAddress).burnFrom(msg.sender, amount);

        uint256 sellPrice = starsArena.getSellPrice(subject, amount);
        starsArena.sellShares(subject, amount);

        payable(msg.sender).transfer(sellPrice);
    }
}
