pragma solidity ^0.5.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/Adoption.sol";

contract TestAdoption {
  Adoption adoption = Adoption(DeployedAddresses.Adoption());

  uint expectedPetId = 8;
  address expectedAdopter = address(this);
  address expectedNewOwner = address(0x123);

  function testShopIsSeeded() public {
    uint count = adoption.getPetCount();
    Assert.isAtLeast(count, 16, "Shop should be seeded with the pets from pets.json");
  }

  function testUserCanAdoptPet() public {
    uint returnedId = adoption.adopt(expectedPetId);
    Assert.equal(returnedId, expectedPetId, "Adoption of the expected pet should match what is returned.");
  }

  function testGetAdopterAddressByPetId() public {
    address adopter = adoption.adopters(expectedPetId);
    Assert.equal(adopter, expectedAdopter, "Owner of the expected pet should be this contract");
  }

  function testGetAdopterAddressByPetIdInArray() public {
    address[] memory adopters = adoption.getAdopters();
    Assert.equal(adopters[expectedPetId], expectedAdopter, "Owner of the expected pet should be this contract");
  }

  function testOwnerCanTransferPet() public {
    adoption.transfer(expectedPetId, expectedNewOwner);
    address adopter = adoption.adopters(expectedPetId);
    Assert.equal(adopter, expectedNewOwner, "Owner of the pet should be the transfer recipient");
  }

  function testHistoryRecordsAdoptAndTransfer() public {
    address[] memory owners;
    uint[] memory timestamps;
    (owners, timestamps) = adoption.getHistory(expectedPetId);

    Assert.equal(owners.length, 2, "History should include adopt and transfer");
    Assert.equal(timestamps.length, 2, "History should include two timestamps");
    Assert.equal(owners[0], expectedAdopter, "First owner should be this contract");
    Assert.equal(owners[1], expectedNewOwner, "Second owner should be the transfer recipient");
  }

  function testUserCanAddPet() public {
    uint countBefore = adoption.getPetCount();
    uint newPetId = adoption.addPet(
      "Aquila",
      "Bald Eagle",
      5,
      "Toronto, Ontario",
      "images/eagle.JPG"
    );

    Assert.equal(newPetId, countBefore, "New pet should take the next free id.");
    Assert.equal(adoption.getPetCount(), countBefore + 1, "Pet count should grow by one.");
  }
}
