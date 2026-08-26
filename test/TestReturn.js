const Adoption = artifacts.require("Adoption");

contract("Adoption returnPet", function(accounts) {
  var empty = "0x0000000000000000000000000000000000000000";
  var owner = accounts[4];
  var other = accounts[5];

  function toBN(value) {
    if (web3.utils && web3.utils.toBN) {
      return web3.utils.toBN(value);
    }
    return web3.toBigNumber(value);
  }

  it("lets the owner return a pet for the fee and keeps history", async function() {
    var adoption = await Adoption.deployed();
    var petId = 9;
    var admin = await adoption.admin();
    var fee = await adoption.returnFee();
    var adminBefore = await web3.eth.getBalance(admin);

    await adoption.adopt(petId, { from: owner });

    var historyAfterAdopt = await adoption.getHistory(petId);
    assert.equal(historyAfterAdopt[0].length, 1);

    await adoption.returnPet(petId, { from: owner, value: fee });

    var current = await adoption.adopters(petId);
    assert.equal(current, empty);

    var history = await adoption.getHistory(petId);
    assert.equal(history[0].length, 2, "History should include adopt and return");
    assert.equal(history[0][0], owner);
    assert.equal(history[0][1], empty);

    var adminAfter = await web3.eth.getBalance(admin);
    assert.equal(
      toBN(adminAfter).sub(toBN(adminBefore)).toString(),
      toBN(fee).toString(),
      "Admin should receive the return fee"
    );
  });

  it("rejects return from a non-owner", async function() {
    var adoption = await Adoption.deployed();
    var fee = await adoption.returnFee();
    var petId = 10;

    await adoption.adopt(petId, { from: owner });

    var reverted = false;
    try {
      await adoption.returnPet(petId, { from: other, value: fee });
    } catch (err) {
      reverted = true;
    }
    assert.equal(reverted, true, "Non-owner return should fail");
  });

  it("rejects the wrong return fee", async function() {
    var adoption = await Adoption.deployed();
    var petId = 11;

    await adoption.adopt(petId, { from: owner });

    var reverted = false;
    try {
      await adoption.returnPet(petId, { from: owner, value: 0 });
    } catch (err) {
      reverted = true;
    }
    assert.equal(reverted, true, "Wrong fee should fail");
  });
});
