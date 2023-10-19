// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

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
        require(registrars[msg.sender], "You are not a registrar");
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
