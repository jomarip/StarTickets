// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

interface IStarsArena {
    function buySharesWithReferrer(address sharesSubject, uint256 amount, address referrer) external payable;
    function sellSharesWithReferrer(address sharesSubject, uint256 amount, address referrer) external payable;
    function getBuyPriceAfterFee(address sharesSubject, uint256 amount) external view returns (uint256);
    function getSellPriceAfterFee(address sharesSubject, uint256 amount) external view returns (uint256);
}

interface IStarRegistry {
    function getSubjectAddressOfStar(string memory _starName) external view returns (address);
    function getStarOfSubjectAddress(address _subjectAddress) external view returns (string memory);
}

interface IERC20Burnable is IERC20 {
    function burn(uint256 amount) external;
    function burnFrom(address account, uint256 amount) external;
    function mint(address to, uint256 amount) external; 
}

contract MyBurnableToken is ERC20Burnable, Ownable {
    constructor(string memory name, string memory symbol, address initialOwner) 
        ERC20(name, symbol) 
        Ownable(initialOwner)
    {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}


contract StarTickets is OwnableUpgradeable, ReentrancyGuardUpgradeable {
    IStarsArena public starsArena;
    IStarRegistry public starRegistry;
    address public referral;

    mapping(address => IERC20Burnable) public subjectToToken;  
    
    event TicketBought(address indexed buyer, address indexed subject, uint256 amount, uint256 price);
    event TicketSold(address indexed seller, address indexed subject, uint256 amount, uint256 price);
    event AvaxWithdrawn(address indexed owner, uint256 amount);
    event ERC20Withdrawn(address indexed owner, address indexed tokenAddress, uint256 amount);
    event ReferrerChanged(address indexed oldReferrer, address indexed newReferrer);
    
    function initialize(address _starsArenaAddress, address _starRegistryAddress, address _referrer) public initializer {
        // Initialize the upgradeable contracts
        __Ownable_init(msg.sender);  // Initialize Ownable
        __ReentrancyGuard_init();  // Initialize ReentrancyGuard

        starsArena = IStarsArena(_starsArenaAddress);
        starRegistry = IStarRegistry(_starRegistryAddress);
        referral = _referrer;
    }

    function buyTicket(address subject, uint256 amount) public payable nonReentrant{
        require(msg.value >= amount, "Insufficient funds sent");

        uint256 buyPrice = starsArena.getBuyPriceAfterFee(subject, amount);
        require(msg.value >= buyPrice, "Insufficient funds for ticket price including fee");

        // Buy the ticket
        starsArena.buySharesWithReferrer{value: buyPrice}(subject, amount,referral);

        // Return remaining funds
        uint256 remainingFunds = msg.value - buyPrice;
        if (remainingFunds > 0) {
            payable(msg.sender).transfer(remainingFunds);
        }

        // Now using IERC20Burnable interface
        IERC20Burnable token = subjectToToken[subject];
        if (address(token) == address(0)) {
            string memory starName = starRegistry.getStarOfSubjectAddress(subject);  // Fetch star name
            
            //Create a Token with the Star's Name
            string memory tokenName;
            string memory tokenSymbol;

            if (bytes(starName).length > 0) {
                tokenName = string(abi.encodePacked(starName, " Star Ticket"));
                tokenSymbol = string(abi.encodePacked(starName, "TKT"));
            } else {
                tokenName = "Star Ticket";
                tokenSymbol = "TKT";
            }
            
            // Deploy a new ERC20 for this subject
            ERC20Burnable newToken = new MyBurnableToken(tokenName, tokenSymbol, address(this));
            subjectToToken[subject] = IERC20Burnable(address(newToken));
            token = IERC20Burnable(address(newToken));

        }
        
        token.mint(msg.sender, amount);  // directly use the mapped interface
        emit TicketBought(msg.sender, subject, amount, buyPrice);  // Emit the event
    }

    function sellTicket(address subject, uint256 amount) public nonReentrant{
        IERC20Burnable token = subjectToToken[subject];
        require(address(token) != address(0), "Token for subject not found");

        token.burnFrom(msg.sender, amount);  // directly use the mapped interface

        uint256 sellPrice = starsArena.getSellPriceAfterFee(subject, amount);
        starsArena.sellSharesWithReferrer(subject, amount, referral);

        payable(msg.sender).transfer(sellPrice);
        emit TicketSold(msg.sender, subject, amount, sellPrice);  // Emit the event
    }
    
    receive() external payable {
    // Custom function logic
    }

     // Function to withdraw AVAX (or ETH) to the owner
    function withdrawAvax() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No AVAX to withdraw");
        payable(owner()).transfer(balance);
        emit AvaxWithdrawn(owner(), balance);  // Emit the event
    }

    // Function to withdraw an arbitrary ERC20 token to the owner
    function withdrawArbitraryERC20(address _tokenAddress) external onlyOwner {
        IERC20 token = IERC20(_tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        token.transfer(owner(), balance);
        emit ERC20Withdrawn(owner(), _tokenAddress, balance);  // Emit the event
    }
    
    //Function to change the referrer
    function setReferrer(address _newReferrer) external onlyOwner {
        require(_newReferrer != address(0), "New referrer cannot be the zero address.");

        address oldReferrer = referral;
        referral = _newReferrer;

        emit ReferrerChanged(oldReferrer, _newReferrer);
}
    
}
