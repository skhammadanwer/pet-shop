pragma solidity ^0.5.0;

contract Adoption {

    address[16] public adopters;

    // Fee required to return a pet
    uint public returnFee = 0.01 ether;

    // Adopt a pet
    function adopt(uint petId) public returns (uint) {

        require(
            petId >= 0 && petId <= 15,
            "Invalid pet ID"
        );

        require(
            adopters[petId] == address(0),
            "Pet is already adopted"
        );

        adopters[petId] = msg.sender;

        return petId;
    }

    // Return a pet for a fee
    function returnPet(uint petId) public payable returns (uint) {

        require(
            petId >= 0 && petId <= 15,
            "Invalid pet ID"
        );

        require(
            adopters[petId] == msg.sender,
            "You are not the adopter of this pet"
        );

        require(
            msg.value == returnFee,
            "Incorrect return fee"
        );

        // Clear the adopter so the pet becomes available again
        adopters[petId] = address(0);

        return petId;
    }

    // Return all adopter addresses
    function getAdopters()
        public
        view
        returns (address[16] memory)
    {
        return adopters;
    }
}