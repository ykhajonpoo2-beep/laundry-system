const fs = require("fs");
const { createClient } = require("redis");

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
  const url = env.LAUNDRY_RECOVERY_REDIS_URL;
  if (!url) {
    console.log("RESULT: REDIS_URL_MISSING");
    return;
  }

  const client = createClient({
    url,
    socket: { connectTimeout: 5000, reconnectStrategy: false }
  });

  client.on("error", () => {});
  try {
    await client.connect();
    const pong = await client.ping();
    console.log("RESULT: REDIS_OK", pong);
  } catch (e) {
    console.log("RESULT: REDIS_FAILED", e.code || e.name || "ERROR");
    console.log(String(e.message || "").replace(/redis:\/\/[^@\s]+@/gi, "redis://[REDACTED]@").replace(/rediss:\/\/[^@\s]+@/gi, "rediss://[REDACTED]@"));
  } finally {
    if (client.isOpen) await client.quit().catch(() => {});
  }
}
main().catch(e => console.log("RESULT: TEST_FAILED", e.name));
