pragma solidity ^0.5.0;

contract Adoption {
  address[16] public adopters;
  mapping(uint => address[]) private historyOwners;
  mapping(uint => uint[]) private historyTimes;

  event Transferred(uint petId, address from, address to, uint timestamp);

  function adopt(uint petId) public returns (uint) {
    require(petId >= 0 && petId <= 15);
    require(adopters[petId] == address(0));

    adopters[petId] = msg.sender;
    historyOwners[petId].push(msg.sender);
    historyTimes[petId].push(now);

    emit Transferred(petId, address(0), msg.sender, now);
    return petId;
  }

  function transfer(uint petId, address newOwner) public {
    require(petId >= 0 && petId <= 15);
    require(adopters[petId] == msg.sender);
    require(newOwner != address(0));

    address previous = adopters[petId];
    adopters[petId] = newOwner;
    historyOwners[petId].push(newOwner);
    historyTimes[petId].push(now);

    emit Transferred(petId, previous, newOwner, now);
  }

  function getAdopters() public view returns (address[16] memory) {
    return adopters;
  }

  function getHistory(uint petId) public view returns (address[] memory, uint[] memory) {
    require(petId >= 0 && petId <= 15);
    return (historyOwners[petId], historyTimes[petId]);
  }
}
