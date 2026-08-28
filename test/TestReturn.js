const Adoption = artifacts.require("Adoption");

contract("Adoption returnPet", function(accounts) {
  const empty = "0x0000000000000000000000000000000000000000";
  const owner = accounts[4];
  const other = accounts[5];

  function toBN(value) {
    if (web3.utils && web3.utils.toBN) {
      return web3.utils.toBN(value);
    }
    return web3.toBigNumber(value);
  }

  it("lets the owner return a pet for the fee and keeps history", async function() {
    const adoption = await Adoption.deployed();
    const petId = 9;
    const fee = await adoption.returnFee();
    const contractBefore = await web3.eth.getBalance(adoption.address);

    await adoption.adopt(petId, { from: owner });

    const historyAfterAdopt = await adoption.getHistory(petId);
    assert.equal(historyAfterAdopt[0].length, 1);

    await adoption.returnPet(petId, { from: owner, value: fee });

    const current = await adoption.adopters(petId);
    assert.equal(current, empty);

    const history = await adoption.getHistory(petId);
    assert.equal(history[0].length, 2, "History should include adopt and return");
    assert.equal(history[0][0], owner);
    assert.equal(history[0][1], empty);

    const contractAfter = await web3.eth.getBalance(adoption.address);
    assert.equal(
      toBN(contractAfter).sub(toBN(contractBefore)).toString(),
      toBN(fee).toString(),
      "Contract should keep the return fee"
    );
  });

  it("lets someone else adopt a returned pet", async function() {
    const adoption = await Adoption.deployed();
    const petId = 9;
    await adoption.adopt(petId, { from: other });
    const current = await adoption.adopters(petId);
    assert.equal(current, other);
  });

  it("rejects return from a non-owner", async function() {
    const adoption = await Adoption.deployed();
    const fee = await adoption.returnFee();
    const petId = 10;

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
    const adoption = await Adoption.deployed();
    const petId = 11;

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
