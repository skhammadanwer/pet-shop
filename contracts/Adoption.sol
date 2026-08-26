pragma solidity ^0.5.0;

contract Adoption {
  address public admin;

  constructor() public {
    admin = msg.sender;
  }

  modifier onlyAdmin() {
    require(msg.sender == admin, "Only admin can add vaccination records");
    _;
  }

  address[16] public adopters;
  uint public petCount = 16;
  uint public returnFee = 0.01 ether;

  mapping(uint => address[]) private historyOwners;
  mapping(uint => uint[]) private historyTimes;

  event Transferred(uint petId, address from, address to, uint timestamp);

  struct VaccinationRecord {
    string vaccineName;
    string vaccinationDate;
    string clinicName;
  }

  mapping(uint => VaccinationRecord[]) private vaccinationRecords;

  function adopt(uint petId) public returns (uint) {
    require(petId < petCount, "Invalid pet ID");
    require(adopters[petId] == address(0));

    adopters[petId] = msg.sender;
    historyOwners[petId].push(msg.sender);
    historyTimes[petId].push(now);

    emit Transferred(petId, address(0), msg.sender, now);
    return petId;
  }

  function transfer(uint petId, address newOwner) public {
    require(petId < petCount, "Invalid pet ID");
    require(adopters[petId] == msg.sender);
    require(newOwner != address(0));

    address previous = adopters[petId];
    adopters[petId] = newOwner;
    historyOwners[petId].push(newOwner);
    historyTimes[petId].push(now);

    emit Transferred(petId, previous, newOwner, now);
  }

  function returnPet(uint petId) public payable {
    require(petId < petCount, "Invalid pet ID");
    require(adopters[petId] == msg.sender, "You are not the adopter");
    require(msg.value == returnFee, "Incorrect return fee");

    address previous = adopters[petId];
    adopters[petId] = address(0);
    historyOwners[petId].push(address(0));
    historyTimes[petId].push(now);

    emit Transferred(petId, previous, address(0), now);

    address(uint160(admin)).transfer(msg.value);
  }

  function getAdopters() public view returns (address[16] memory) {
    return adopters;
  }

  function getHistory(uint petId) public view returns (address[] memory, uint[] memory) {
    require(petId < petCount, "Invalid pet ID");
    return (historyOwners[petId], historyTimes[petId]);
  }

  function addVaccinationRecord(
    uint petId,
    string memory vaccineName,
    string memory vaccinationDate,
    string memory clinicName
  )
    public
    onlyAdmin
  {
    require(petId < petCount, "Invalid pet ID");

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
    require(petId < petCount, "Invalid pet ID");
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
    require(petId < petCount, "Invalid pet ID");
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
