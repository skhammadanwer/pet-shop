const Adoption = artifacts.require("Adoption");

contract("Adoption features", function(accounts) {
  const deployer = accounts[0];
  const user = accounts[1];
  const other = accounts[2];
  const recipient = accounts[3];

  let adoption;

  async function addSamplePet(from, name) {
    return adoption.addPet(
      name || "Aquila",
      "Bald Eagle",
      5,
      "Toronto, Ontario",
      "images/eagle.JPG",
      { from: from }
    );
  }

  beforeEach(async function() {
    adoption = await Adoption.new({ from: deployer });
    await addSamplePet(deployer, "Frieda");
    await addSamplePet(deployer, "Gina");
  });

  it("seeds inventory through addPet and reports pet count", async function() {
    const count = await adoption.getPetCount();
    assert.equal(count.toString(), "2");

    const pet0 = await adoption.pets(0);
    assert.equal(pet0[0], "Frieda");
    assert.equal(pet0[1], "Bald Eagle");
  });

  it("lets any connected account add a pet with on-chain metadata", async function() {
    const result = await addSamplePet(user, "Aquila");
    const count = await adoption.getPetCount();
    assert.equal(count.toString(), "3");

    const added = await adoption.pets(2);
    assert.equal(added[0], "Aquila");
    assert.equal(added[3], "Toronto, Ontario");
    assert.equal(added[4], "images/eagle.JPG");

    const log = result.logs.find(function(entry) {
      return entry.event === "PetAdded";
    });
    assert.ok(log, "PetAdded event should fire");
    assert.equal(log.args.petId.toString(), "2");
  });

  it("rejects addPet when the name is empty", async function() {
    try {
      await adoption.addPet("", "Beagle", 1, "Lagos", "images/eagle.JPG", { from: user });
      assert.fail("empty name should revert");
    } catch (err) {
      assert.ok(err.message.includes("revert") || err.message.includes("Pet needs a name"));
    }
  });

  it("lets a user adopt an available pet once", async function() {
    const returnedId = await adoption.adopt.call(0, { from: user });
    assert.equal(returnedId.toString(), "0");

    await adoption.adopt(0, { from: user });
    const owner = await adoption.adopters(0);
    assert.equal(owner, user);

    try {
      await adoption.adopt(0, { from: other });
      assert.fail("second adopt should revert");
    } catch (err) {
      assert.ok(err.message.includes("revert"));
    }
  });

  it("rejects adopt for a pet id that does not exist", async function() {
    try {
      await adoption.adopt(99, { from: user });
      assert.fail("invalid pet id should revert");
    } catch (err) {
      assert.ok(err.message.includes("revert"));
    }
  });

  it("lets the current owner transfer and records history", async function() {
    await adoption.adopt(1, { from: user });
    await adoption.transfer(1, recipient, { from: user });

    const owner = await adoption.adopters(1);
    assert.equal(owner, recipient);

    const history = await adoption.getHistory(1);
    assert.equal(history[0].length, 2);
    assert.equal(history[0][0], user);
    assert.equal(history[0][1], recipient);
    assert.equal(history[1].length, 2);
  });

  it("rejects transfer from a non-owner and rejects the zero address", async function() {
    await adoption.adopt(0, { from: user });

    try {
      await adoption.transfer(0, recipient, { from: other });
      assert.fail("non-owner transfer should revert");
    } catch (err) {
      assert.ok(err.message.includes("revert"));
    }

    try {
      await adoption.transfer(0, "0x0000000000000000000000000000000000000000", { from: user });
      assert.fail("zero address transfer should revert");
    } catch (err) {
      assert.ok(err.message.includes("revert"));
    }
  });

  it("lets any account add and read vaccination records", async function() {
    await adoption.addVaccinationRecord(
      0,
      "Rabies",
      "2025-03-12",
      "Lisco Animal Clinic",
      { from: user }
    );
    await adoption.addVaccinationRecord(
      0,
      "DHPP",
      "2024-11-04",
      "Lisco Animal Clinic",
      { from: other }
    );

    const count = await adoption.getVaccinationCount(0);
    assert.equal(count.toString(), "2");

    const record = await adoption.getVaccinationRecord(0, 0);
    assert.equal(record.vaccineName || record[0], "Rabies");
    assert.equal(record.clinicName || record[2], "Lisco Animal Clinic");
  });

  it("rejects vaccination records with empty fields", async function() {
    try {
      await adoption.addVaccinationRecord(0, "", "2025-03-12", "Clinic", { from: user });
      assert.fail("expected empty vaccine name to be rejected");
    } catch (err) {
      assert.ok(
        /revert|Vaccine name required/i.test(err.message),
        err.message
      );
    }
  });

  it("grows getAdopters with addPet and keeps new pets available", async function() {
    await addSamplePet(deployer, "Scrappy");
    const adopters = await adoption.getAdopters();
    assert.equal(adopters.length, 3);
    assert.equal(adopters[2], "0x0000000000000000000000000000000000000000");

    await adoption.adopt(2, { from: user });
    const updated = await adoption.getAdopters();
    assert.equal(updated[2], user);
  });
});

contract("Adoption migration seed", function(accounts) {
  it("deploys with pets.json inventory, history, and vaccination seed data", async function() {
    const adoption = await Adoption.deployed();
    const count = await adoption.getPetCount();
    assert.ok(count.toNumber() >= 16, "migration should seed at least 16 pets");

    const adopters = await adoption.getAdopters();
    assert.equal(adopters[0], accounts[2], "pet 0 should end with accounts[2]");
    assert.equal(adopters[2], accounts[3], "pet 2 should end with accounts[3]");
    assert.equal(adopters[6], accounts[0], "pet 6 should end with accounts[0]");

    const history2 = await adoption.getHistory(2);
    assert.equal(history2[0].length, 3);

    const vac0 = await adoption.getVaccinationCount(0);
    const vac2 = await adoption.getVaccinationCount(2);
    const vac6 = await adoption.getVaccinationCount(6);
    assert.equal(vac0.toString(), "2");
    assert.equal(vac2.toString(), "1");
    assert.equal(vac6.toString(), "2");
  });
});
