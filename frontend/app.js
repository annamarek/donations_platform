const CONTRACT_ADDRESS = "0x854c6E66D05e5164c6C3Fe587AD4b21813bB52B0";
const API_BASE_URL = "http://127.0.0.1:3001";

const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "donor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "message",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "Donated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "message",
        "type": "string"
      }
    ],
    "name": "donate",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "getDonation",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "donor",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "message",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct DonationTracker.Donation",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getDonationsCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalDonated",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const connectBtn = document.getElementById("connectBtn");
const donationForm = document.getElementById("donationForm");
const formStatus = document.getElementById("formStatus");
const walletStatus = document.getElementById("walletStatus");
const totalDonatedEl = document.getElementById("totalDonated");
const donationsList = document.getElementById("donationsList");

let provider;
let signer;
let contract;

function shortAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function setStatus(text, type = "") {
  formStatus.className = `status ${type}`.trim();
  formStatus.textContent = text;
}

function renderDonation(donation, prepend = false) {
  const li = document.createElement("li");
  li.className = "donation-item";

  const amountEth = ethers.formatEther(donation.amount);
  const time = new Date(Number(donation.timestamp) * 1000).toLocaleString();
  const safeMessage = donation.message?.trim() || "(no message)";

  li.innerHTML = `
    <div class="donation-top">
      <strong>${amountEth} ETH</strong>
      <span class="address">${shortAddress(donation.donor)} • ${time}</span>
    </div>
    <p class="message">${safeMessage}</p>
  `;

  if (prepend) {
    donationsList.prepend(li);
  } else {
    donationsList.appendChild(li);
  }
}

async function loadDonations() {
  donationsList.innerHTML = "";
  const count = Number(await contract.getDonationsCount());
  const from = Math.max(0, count - 20); // Keep UI light.

  for (let i = count - 1; i >= from; i -= 1) {
    const donation = await contract.getDonation(i);
    renderDonation(donation, false);
  }
}

async function refreshTotals() {
  const total = await contract.totalDonated();
  totalDonatedEl.textContent = `Total donated: ${ethers.formatEther(total)} ETH`;
}

function subscribeToEvents() {
  contract.on("Donated", async (donor, amount, message, timestamp) => {
    renderDonation({ donor, amount, message, timestamp }, true);
    await refreshTotals();
  });
}

async function saveDonationToDatabase({
  txHash,
  donor,
  amountEth,
  message,
  chainId,
  contractAddress,
  blockTimestamp
}) {
  const response = await fetch(`${API_BASE_URL}/api/donations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      txHash,
      donor,
      amountEth,
      message,
      chainId,
      contractAddress,
      blockTimestamp
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "Failed to save donation to DB");
  }
}

async function connectWallet() {
  if (!window.ethereum) {
    setStatus("MetaMask is not installed.", "error");
    return;
  }

  if (CONTRACT_ADDRESS.startsWith("PASTE_")) {
    setStatus("Paste deployed contract address in app.js first.", "error");
    return;
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = await provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  const wallet = await signer.getAddress();
  walletStatus.textContent = `Connected: ${shortAddress(wallet)}`;

  await refreshTotals();
  await loadDonations();
  subscribeToEvents();
  setStatus("Wallet connected.", "ok");
}

connectBtn.addEventListener("click", async () => {
  try {
    await connectWallet();
  } catch (error) {
    setStatus(error?.reason || error?.message || "Failed to connect wallet.", "error");
  }
});

donationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!contract) {
    setStatus("Connect wallet first.", "error");
    return;
  }

  const donateBtn = document.getElementById("donateBtn");
  const amount = document.getElementById("amount").value;
  const message = document.getElementById("message").value;

  if (!amount || Number(amount) <= 0) {
    setStatus("Enter valid amount.", "error");
    return;
  }

  try {
    donateBtn.disabled = true;
    setStatus("Sending transaction...");

    const tx = await contract.donate(message, {
      value: ethers.parseEther(amount)
    });
    const receipt = await tx.wait();

    const block = await provider.getBlock(receipt.blockNumber);
    const wallet = await signer.getAddress();
    const network = await provider.getNetwork();

    try {
      await saveDonationToDatabase({
        txHash: tx.hash,
        donor: wallet,
        amountEth: amount,
        message,
        chainId: Number(network.chainId),
        contractAddress: CONTRACT_ADDRESS,
        blockTimestamp: block?.timestamp || null
      });
    } catch (dbError) {
      console.error(dbError);
      setStatus("Donation on-chain succeeded, but DB save failed.", "error");
      donationForm.reset();
      return;
    }

    setStatus("Donation sent and saved to MSSQL.", "ok");
    donationForm.reset();
  } catch (error) {
    setStatus(error?.reason || error?.message || "Donation failed.", "error");
  } finally {
    donateBtn.disabled = false;
  }
});
