pragma solidity ^0.5.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Adoption.sol";

contract TestAdoption {
// The address of the adoption contract to be tested
 Adoption adoption = Adoption(DeployedAddresses.Adoption());

// The id of the pet that will be used for testing
 uint expectedPetId = 8;

//The expected owner of adopted pet is this contract
 address expectedAdopter = address(this);

// Testing that the migration seeded the shop
function testShopIsSeeded() public {
  uint count = adoption.getPetCount();

  Assert.isAtLeast(count, 17, "Shop should be seeded with the pets from pets.json");
}

// Testing the addPet() function
function testUserCanAddPet() public {
  uint countBefore = adoption.getPetCount();

  uint newPetId = adoption.addPet("Aquila", "Bald Eagle", 5, "Toronto, Ontario", "images/golden-retriever.jpeg");

  Assert.equal(newPetId, countBefore, "New pet should take the next free id.");
  Assert.equal(adoption.getPetCount(), countBefore + 1, "Pet count should grow by one.");
}

// Testing the adopt() function
function testUserCanAdoptPet() public {
  uint returnedId = adoption.adopt(expectedPetId);

  Assert.equal(returnedId, expectedPetId, "Adoption of the expected pet should match what is returned.");
}

// Testing retrieval of a single pet's owner
function testGetAdopterAddressByPetId() public {
  address adopter = adoption.adopters(expectedPetId);

  Assert.equal(adopter, expectedAdopter, "Owner of the expected pet should be this contract");
}

// Testing retrieval of all pet owners
function testGetAdopterAddressByPetIdInArray() public {
  // Store adopters in memory rather than contract's storage
  address[] memory adopters = adoption.getAdopters();

  Assert.equal(adopters[expectedPetId], expectedAdopter, "Owner of the expected pet should be this contract");
}


}
