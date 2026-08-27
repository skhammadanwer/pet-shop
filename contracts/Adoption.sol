pragma solidity ^0.5.0;

contract Adoption {

  struct Pet {
    string name;
    string breed;
    uint age;
    string location;
    string picture;
  }

  // The shop's inventory. Grows whenever addPet is called.
  Pet[] public pets;

  // adopters[i] owns pets[i]; address(0) means not yet adopted.
  address[] public adopters;

  event PetAdded(uint petId, string name);
  event PetAdopted(uint petId, address adopter);

  // Adding a pet to the shop
  function addPet(
    string memory name,
    string memory breed,
    uint age,
    string memory location,
    string memory picture
  ) public returns (uint) {
    require(bytes(name).length > 0, "Pet needs a name");

    pets.push(Pet(name, breed, age, location, picture));
    adopters.push(address(0));

    uint petId = pets.length - 1;
    emit PetAdded(petId, name);

    return petId;
  }

  // How many pets are currently in the shop
  function getPetCount() public view returns (uint) {
    return pets.length;
  }

  // Adopting a pet
  function adopt(uint petId) public returns (uint) {
    require(petId < pets.length, "No such pet");

    adopters[petId] = msg.sender;
    emit PetAdopted(petId, msg.sender);

    return petId;
  }

  // Retrieving the adopters
  function getAdopters() public view returns (address[] memory) {
    return adopters;
  }

}
