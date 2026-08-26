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
      });
  });
};
