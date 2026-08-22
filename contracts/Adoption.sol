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
  // IMPORTANT！！！！！！！！！！！！！！！！！！！！！！！！
  // When you guys doing adding pets part please alter code below.
  address[16] public adopters;

  // Current number of pets.
  // The Add Pet feature can update this value later.
  uint public petCount = 16;

  // Adopting a pet
  function adopt(uint petId) public returns (uint) {
    require(petId >= 0 && petId <= 15);

    adopters[petId] = msg.sender;

    return petId;
  }
  // Retrieving the adopters
  function getAdopters() public view returns (address[16] memory) {
    return adopters;
  }

  //------------------------------------------------
  // Vaccination Record
  //------------------------------------------------

  // Vaccination Record feature
  struct VaccinationRecord {
    string vaccineName;
    string vaccinationDate;
    string clinicName;
  }

  // Each pet ID can have multiple vaccination records
  mapping(uint => VaccinationRecord[]) private vaccinationRecords;

  // Vaccination Record functions
  
  // Add a vaccination record for a pet
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

  // Get the number of vaccination records for one pet
  function getVaccinationCount(uint petId)
      public
      view
      returns (uint)
  {
      require(petId < petCount, "Invalid pet ID");

      return vaccinationRecords[petId].length;
  }

  // Return one vaccination record
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