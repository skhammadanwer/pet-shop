pragma solidity ^0.5.0;

contract Adoption {
    // An array of 17 Ethereum addresses, one slot per pet.
    // Public state variables get an automatic getter; for arrays the
    // getter takes an index key and returns a single value.
    address[17] public adopters;

    // Adopting a pet: takes a petId (uint) and returns a uint.
    function adopt(uint petId) public returns (uint) {
        // Only pet IDs 0 through 16 exist.
        require(petId >= 0 && petId <= 16);

        // Record the address of whoever called this function.
        adopters[petId] = msg.sender;

        // Return the petId as confirmation.
        return petId;
    }

    // Retrieving the adopters.
    // "view" means the function does not modify contract state.
    // The return type must be declared as address[17] memory.
    function getAdopters() public view returns (address[17] memory) {
        return adopters;
    }
}
