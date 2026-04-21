// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DonationTracker {
    struct Donation {
        address donor;
        uint256 amount;
        string message;
        uint256 timestamp;
    }

    address public owner;
    uint256 public totalDonated;
    Donation[] private donations;

    event Donated(
        address indexed donor,
        uint256 amount,
        string message,
        uint256 timestamp
    );

    constructor() {
        owner = msg.sender;
    }

    function donate(string calldata message) external payable {
        require(msg.value > 0, "Donation must be greater than 0");

        Donation memory newDonation = Donation({
            donor: msg.sender,
            amount: msg.value,
            message: message,
            timestamp: block.timestamp
        });

        donations.push(newDonation);
        totalDonated += msg.value;

        emit Donated(msg.sender, msg.value, message, block.timestamp);
    }

    function getDonationsCount() external view returns (uint256) {
        return donations.length;
    }

    function getDonation(uint256 index) external view returns (Donation memory) {
        require(index < donations.length, "Invalid donation index");
        return donations[index];
    }

    function withdraw() external {
        require(msg.sender == owner, "Only owner can withdraw");
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");
        payable(owner).transfer(balance);
    }
}
