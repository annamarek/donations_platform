const API_BASE_URL = "http://127.0.0.1:3001";

const rowsEl = document.getElementById("rows");
const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refreshBtn");

function formatDate(item) {
  if (item.BlockTimestamp) {
    return new Date(Number(item.BlockTimestamp) * 1000).toLocaleString();
  }
  return new Date(item.CreatedAt).toLocaleString();
}

function setStatus(text, type = "") {
  statusEl.className = `status ${type}`.trim();
  statusEl.textContent = text;
}

function renderRows(items) {
  rowsEl.innerHTML = "";

  for (const item of items) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.Id}</td>
      <td>${formatDate(item)}</td>
      <td>${item.Donor}</td>
      <td>${item.AmountEth}</td>
      <td class="tx" title="${item.TxHash}">${item.TxHash}</td>
      <td>${item.Message || ""}</td>
    `;
    rowsEl.appendChild(tr);
  }
}

async function loadDonations() {
  try {
    setStatus("Loading...");
    const response = await fetch(`${API_BASE_URL}/api/donations?limit=200`);
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "Failed to load donations");
    }

    renderRows(data.items || []);
    setStatus(`Loaded ${data.items.length} rows.`, "ok");
  } catch (error) {
    setStatus(error.message || "Load failed", "error");
  }
}

refreshBtn.addEventListener("click", loadDonations);
loadDonations();
