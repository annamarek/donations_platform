require("dotenv").config({ quiet: true });
const express = require("express");
const cors = require("cors");

const app = express();
const port = Number(process.env.API_PORT || 3001);

const dbAuth = (process.env.DB_AUTH || "sql").toLowerCase();
const sqlModule =
  dbAuth === "windows" ? require("mssql/msnodesqlv8") : require("mssql");

function buildDbServer() {
  if (process.env.DB_SERVER) {
    return process.env.DB_SERVER;
  }

  const host = process.env.DB_HOST || "localhost";
  const instance = process.env.DB_INSTANCE;

  if (instance) {
    return `${host}\\${instance}`;
  }

  if (process.env.DB_PORT) {
    return `${host},${process.env.DB_PORT}`;
  }

  return host;
}

function buildDbConfig() {
  const server = buildDbServer();
  const database = process.env.DB_NAME;

  if (!database) {
    throw new Error("DB_NAME is required in .env");
  }

  const options = {
    encrypt: (process.env.DB_ENCRYPT || "false").toLowerCase() === "true",
    trustServerCertificate:
      (process.env.DB_TRUST_CERT || "true").toLowerCase() === "true"
  };

  if (dbAuth === "windows") {
    const odbcDriver =
      process.env.DB_ODBC_DRIVER || "ODBC Driver 18 for SQL Server";
    const connectionString = [
      `Driver={${odbcDriver}}`,
      `Server=${server}`,
      `Database=${database}`,
      "Trusted_Connection=Yes",
      `Encrypt=${options.encrypt ? "Yes" : "No"}`,
      `TrustServerCertificate=${options.trustServerCertificate ? "Yes" : "No"}`
    ].join(";");

    return {
      connectionString: `${connectionString};`,
      options
    };
  }

  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;

  if (!user || !password) {
    throw new Error(
      "DB_USER and DB_PASSWORD are required for DB_AUTH=sql (or switch to DB_AUTH=windows)"
    );
  }

  return {
    user,
    password,
    server,
    database,
    options
  };
}

let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = new sqlModule.ConnectionPool(buildDbConfig()).connect();
  }
  return poolPromise;
}

const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN || "http://127.0.0.1:5500,http://localhost:5500")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients and explicitly allowed browser origins.
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  })
);
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query("SELECT 1 AS ok");
    res.json({
      ok: true,
      message: "API and DB are up",
      dbAuth,
      server: buildDbServer(),
      database: process.env.DB_NAME
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message,
      dbAuth,
      server: buildDbServer(),
      database: process.env.DB_NAME
    });
  }
});

app.post("/api/donations", async (req, res) => {
  const {
    txHash,
    donor,
    amountEth,
    message,
    chainId,
    contractAddress,
    blockTimestamp
  } = req.body || {};

  if (!txHash || !donor || !amountEth || !contractAddress) {
    return res.status(400).json({
      ok: false,
      message: "txHash, donor, amountEth and contractAddress are required"
    });
  }

  try {
    const pool = await getPool();
    await pool
      .request()
      .input("txHash", sqlModule.NVarChar(100), txHash)
      .input("donor", sqlModule.NVarChar(42), donor)
      .input("amountEth", sqlModule.Decimal(38, 18), amountEth)
      .input("message", sqlModule.NVarChar(4000), message || null)
      .input("chainId", sqlModule.Int, chainId || null)
      .input("contractAddress", sqlModule.NVarChar(42), contractAddress)
      .input("blockTimestamp", sqlModule.BigInt, blockTimestamp || null).query(`
        INSERT INTO dbo.Donations
        (TxHash, Donor, AmountEth, Message, ChainId, ContractAddress, BlockTimestamp)
        VALUES
        (@txHash, @donor, @amountEth, @message, @chainId, @contractAddress, @blockTimestamp)
      `);

    return res.status(201).json({ ok: true });
  } catch (error) {
    if (error?.number === 2627 || error?.number === 2601) {
      return res.status(200).json({ ok: true, duplicate: true });
    }

    return res.status(500).json({ ok: false, message: error.message });
  }
});

app.get("/api/donations", async (req, res) => {
  const limitRaw = Number(req.query.limit || 100);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

  try {
    const pool = await getPool();
    const result = await pool.request().input("limit", sqlModule.Int, limit).query(`
      SELECT TOP (@limit)
        Id,
        TxHash,
        Donor,
        AmountEth,
        Message,
        ChainId,
        ContractAddress,
        BlockTimestamp,
        CreatedAt
      FROM dbo.Donations
      ORDER BY Id DESC
    `);

    return res.json({ ok: true, items: result.recordset });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Donation API listening on http://127.0.0.1:${port}`);
});
