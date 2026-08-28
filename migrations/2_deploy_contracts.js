var Adoption = artifacts.require("Adoption");

module.exports = function(deployer, network, accounts) {
  deployer.deploy(Adoption).then(function() {
    return Adoption.deployed();
  }).then(function(adoption) {
    return adoption.adopt(0, { from: accounts[1] })
      .then(function() {
        return adoption.transfer(0, accounts[2], { from: accounts[1] });
      })
      .then(function() {
        return adoption.adopt(2, { from: accounts[1] });
      })
      .then(function() {
        return adoption.transfer(2, accounts[2], { from: accounts[1] });
      })
      .then(function() {
        return adoption.transfer(2, accounts[3], { from: accounts[2] });
      })
      .then(function() {
        return adoption.adopt(6, { from: accounts[2] });
      })
      .then(function() {
        return adoption.transfer(6, accounts[0], { from: accounts[2] });
      })
      .then(function() {
        return adoption.addVaccinationRecord(
          0,
          "Rabies",
          "2025-03-12",
          "Lisco Animal Clinic",
          { from: accounts[0] }
        );
      })
      .then(function() {
        return adoption.addVaccinationRecord(
          0,
          "DHPP",
          "2024-11-04",
          "Lisco Animal Clinic",
          { from: accounts[0] }
        );
      })
      .then(function() {
        return adoption.addVaccinationRecord(
          2,
          "Rabies",
          "2025-06-20",
          "Freeburn Vet",
          { from: accounts[0] }
        );
      })
      .then(function() {
        return adoption.addVaccinationRecord(
          6,
          "Bordetella",
          "2025-01-18",
          "Soudan Pet Hospital",
          { from: accounts[0] }
        );
      })
      .then(function() {
        return adoption.addVaccinationRecord(
          6,
          "Rabies",
          "2024-08-09",
          "Soudan Pet Hospital",
          { from: accounts[0] }
        );
      });
  });
};
