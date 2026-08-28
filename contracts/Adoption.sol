pragma solidity ^0.5.0;

contract Adoption {
  struct Pet {
    string name;
    string breed;
    uint age;
    string location;
    string picture;
  }

  Pet[] public pets;
  address[] public adopters;

  mapping(uint => address[]) private historyOwners;
  mapping(uint => uint[]) private historyTimes;

  event PetAdded(uint petId, string name);
  event Transferred(uint petId, address from, address to, uint timestamp);

  uint public returnFee = 0.01 ether;

  struct VaccinationRecord {
    string vaccineName;
    string vaccinationDate;
    string clinicName;
  }

  mapping(uint => VaccinationRecord[]) private vaccinationRecords;

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

  function getPetCount() public view returns (uint) {
    return pets.length;
  }

  function adopt(uint petId) public returns (uint) {
    require(petId < pets.length, "Invalid pet ID");
    require(adopters[petId] == address(0));

    adopters[petId] = msg.sender;
    historyOwners[petId].push(msg.sender);
    historyTimes[petId].push(now);

    emit Transferred(petId, address(0), msg.sender, now);
    return petId;
  }

  function transfer(uint petId, address newOwner) public {
    require(petId < pets.length, "Invalid pet ID");
    require(adopters[petId] == msg.sender);
    require(newOwner != address(0));

    address previous = adopters[petId];
    adopters[petId] = newOwner;
    historyOwners[petId].push(newOwner);
    historyTimes[petId].push(now);

    emit Transferred(petId, previous, newOwner, now);
  }

  function returnPet(uint petId) public payable {
    require(petId < pets.length, "Invalid pet ID");
    require(adopters[petId] == msg.sender, "You are not the adopter");
    require(msg.value == returnFee, "Incorrect return fee");

    address previous = adopters[petId];
    adopters[petId] = address(0);
    historyOwners[petId].push(address(0));
    historyTimes[petId].push(now);

    emit Transferred(petId, previous, address(0), now);
  }

  function getAdopters() public view returns (address[] memory) {
    return adopters;
  }

  function getHistory(uint petId) public view returns (address[] memory, uint[] memory) {
    require(petId < pets.length, "Invalid pet ID");
    return (historyOwners[petId], historyTimes[petId]);
  }

  function addVaccinationRecord(
    uint petId,
    string memory vaccineName,
    string memory vaccinationDate,
    string memory clinicName
  ) public {
    require(petId < pets.length, "Invalid pet ID");
    require(bytes(vaccineName).length > 0, "Vaccine name required");
    require(bytes(vaccinationDate).length > 0, "Vaccination date required");
    require(bytes(clinicName).length > 0, "Clinic name required");

    vaccinationRecords[petId].push(
      VaccinationRecord(
        vaccineName,
        vaccinationDate,
        clinicName
      )
    );
  }

  function getVaccinationCount(uint petId)
    public
    view
    returns (uint)
  {
    require(petId < pets.length, "Invalid pet ID");
    return vaccinationRecords[petId].length;
  }

  function getVaccinationRecord(
    uint petId,
    uint recordIndex
  )
    public
    view
    returns (
      string memory vaccineName,
      string memory vaccinationDate,
      string memory clinicName
    )
  {
    require(petId < pets.length, "Invalid pet ID");
    require(
      recordIndex < vaccinationRecords[petId].length,
      "Invalid vaccination record"
    );

    VaccinationRecord storage record = vaccinationRecords[petId][recordIndex];

    return (
      record.vaccineName,
      record.vaccinationDate,
      record.clinicName
    );
  }
}
