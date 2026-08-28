var Adoption = artifacts.require("Adoption");
var seedPets = require("../src/pets.json");

module.exports = async function(deployer, network, accounts) {
  await deployer.deploy(Adoption);
  var adoption = await Adoption.deployed();

  for (var i = 0; i < seedPets.length; i++) {
    var pet = seedPets[i];
    await adoption.addPet(
      pet.name,
      pet.breed,
      pet.age,
      pet.location,
      pet.picture,
      { from: accounts[0] }
    );
  }

  await adoption.adopt(0, { from: accounts[1] });
  await adoption.transfer(0, accounts[2], { from: accounts[1] });
  await adoption.adopt(2, { from: accounts[1] });
  await adoption.transfer(2, accounts[2], { from: accounts[1] });
  await adoption.transfer(2, accounts[3], { from: accounts[2] });
  await adoption.adopt(6, { from: accounts[2] });
  await adoption.transfer(6, accounts[0], { from: accounts[2] });

  await adoption.addVaccinationRecord(
    0,
    "Rabies",
    "2025-03-12",
    "Lisco Animal Clinic",
    { from: accounts[0] }
  );
  await adoption.addVaccinationRecord(
    0,
    "DHPP",
    "2024-11-04",
    "Lisco Animal Clinic",
    { from: accounts[0] }
  );
  await adoption.addVaccinationRecord(
    2,
    "Rabies",
    "2025-06-20",
    "Freeburn Vet",
    { from: accounts[0] }
  );
  await adoption.addVaccinationRecord(
    6,
    "Bordetella",
    "2025-01-18",
    "Soudan Pet Hospital",
    { from: accounts[0] }
  );
  await adoption.addVaccinationRecord(
    6,
    "Rabies",
    "2024-08-09",
    "Soudan Pet Hospital",
    { from: accounts[0] }
  );
};
