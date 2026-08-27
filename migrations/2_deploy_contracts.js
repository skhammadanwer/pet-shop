var Adoption = artifacts.require("Adoption");
var seedPets = require("../src/pets.json");

module.exports = async function(deployer) {
  await deployer.deploy(Adoption);

  var instance = await Adoption.deployed();

  // Seed the shop with the starting inventory from pets.json
  for (var i = 0; i < seedPets.length; i++) {
    var pet = seedPets[i];
    await instance.addPet(pet.name, pet.breed, pet.age, pet.location, pet.picture);
  }

  console.log("Seeded " + seedPets.length + " pets into the shop.");
};
