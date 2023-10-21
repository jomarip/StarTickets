// Sources flattened with hardhat v2.18.1 https://hardhat.org

// SPDX-License-Identifier: MIT

// File @openzeppelin/contracts/utils/Context.sol@v5.0.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (utils/Context.sol)

pragma solidity ^0.8.20;

/**
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }
}


// File @openzeppelin/contracts/access/Ownable.sol@v5.0.0

// Original license: SPDX_License_Identifier: MIT
// OpenZeppelin Contracts (last updated v5.0.0) (access/Ownable.sol)

pragma solidity ^0.8.20;

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * The initial owner is set to the address provided by the deployer. This can
 * later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
abstract contract Ownable is Context {
    address private _owner;

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error OwnableUnauthorizedAccount(address account);

    /**
     * @dev The owner is not a valid owner account. (eg. `address(0)`)
     */
    error OwnableInvalidOwner(address owner);

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the address provided by the deployer as the initial owner.
     */
    constructor(address initialOwner) {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        if (owner() != _msgSender()) {
            revert OwnableUnauthorizedAccount(_msgSender());
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby disabling any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}


// File contracts/starRegistry.sol

// Original license: SPDX_License_Identifier: MIT
pragma solidity ^0.8.0;

contract StarRegistry is Ownable {

    mapping(string => address) public starToSubjectAddress;  // Mapping from Star's name to subject address
    mapping(address => string) public subjectAddressToStar;
    mapping(address => bool) public registrars;  // Mapping to keep track of permissioned registrars

    event StarAdded(string starName, address subjectAddress);
    event StarUpdated(string starName, address subjectAddress);
    event RegistrarAdded(address registrar);
    event RegistrarRemoved(address registrar);
    
    constructor(address initialOwner) Ownable(initialOwner) {
    }
    
    modifier onlyRegistrar() {
        require(msg.sender == owner() || registrars[msg.sender], "You are not a registrar");
        _;
    }

    function addRegistrar(address _registrar) public onlyOwner {
        registrars[_registrar] = true;
        emit RegistrarAdded(_registrar);
    }

    function removeRegistrar(address _registrar) public onlyOwner {
        delete registrars[_registrar];
        emit RegistrarRemoved(_registrar);
    }

    
    function addStar(string memory _starName, address _subjectAddress) public onlyRegistrar {
        require(starToSubjectAddress[_starName] == address(0), "Star already registered");
        require(bytes(subjectAddressToStar[_subjectAddress]).length == 0, "Address already registered");

        starToSubjectAddress[_starName] = _subjectAddress;
        subjectAddressToStar[_subjectAddress] = _starName;
        emit StarAdded(_starName, _subjectAddress);
    }

    function updateStar(string memory _starName, address _newSubjectAddress) public onlyRegistrar {
        require(starToSubjectAddress[_starName] != address(0), "Star not found");
        starToSubjectAddress[_starName] = _newSubjectAddress;
        emit StarUpdated(_starName, _newSubjectAddress);
    }
    
    function updateStar(string memory _oldStarName, string memory _newStarName, address _newSubjectAddress) public onlyRegistrar {
        require(starToSubjectAddress[_oldStarName] != address(0), "Star not found");
        
        delete subjectAddressToStar[starToSubjectAddress[_oldStarName]];
        delete starToSubjectAddress[_oldStarName];
        addStar(_newStarName, _newSubjectAddress);
    }
    
    function getSubjectAddressOfStar(string memory _starName) public view returns (address) {
        return starToSubjectAddress[_starName];
    }
    
     function getStarOfSubjectAddress(address _subjectAddress) public view returns (string memory) {
        return subjectAddressToStar[_subjectAddress];
    }
    
    // If you want batch uploads
    function addStars(string[] memory _starNames, address[] memory _subjectAddresses) public onlyRegistrar {
        require(_starNames.length == _subjectAddresses.length, "Array length mismatch");
        
        for (uint256 i = 0; i < _starNames.length; i++) {
            addStar(_starNames[i], _subjectAddresses[i]);
        }
    }
}
