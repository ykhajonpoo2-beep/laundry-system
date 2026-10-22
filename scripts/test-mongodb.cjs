const fs = require("fs");
const { MongoClient } = require("mongodb");

function readEnvFile(path) {
  if (!fs.existsSync(path)) return {};
  return Object.fromEntries(
    fs.readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter(line => line.trim() && !line.trim().startsWith("#"))
      .map(line => {
        const i = line.indexOf("=");
        if (i < 0) return [line.trim(), ""];
        return [
          line.slice(0, i).trim(),
          line.slice(i + 1).trim().replace(/^(['"])(.*)\1$/, "$2")
        ];
      })
  );
}

async function main() {
  const env = {
    ...readEnvFile(".env"),
    ...readEnvFile(".env.local"),
    ...process.env
  };
  const uri = env.MONGODB_URI;

  if (!uri) {
    console.log("RESULT: MONGODB_URI_MISSING");
    return;
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000
  });

  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("RESULT: MONGODB_OK");
  } catch (e) {
    console.log("RESULT: MONGODB_FAILED");
    console.log("ERROR TYPE:", e.name || "UnknownError");
    console.log("ERROR CODE:", e.code || "not provided");
  } finally {
    await client.close().catch(() => {});
  }
}

main().catch(e => console.log("RESULT: TEST_FAILED", e.name || "UnknownError"));
