import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

const rawPort = process.env.PORT ?? process.env.DESKTOP_PORT ?? "3000";
const port = Number.parseInt(rawPort, 10);

if (!Number.isFinite(port) || port < 1 || port > 65535) {
  console.error(`PORT invalida: ${rawPort}`);
  process.exit(1);
}

const env = {
  ...process.env,
  APP_RUNTIME: "desktop",
  NEXT_PUBLIC_APP_RUNTIME: "desktop",
  PORT: String(port),
  HOSTNAME: process.env.HOSTNAME ?? "127.0.0.1",
};

const child = spawn(process.execPath, [nextBin, "start", "-p", String(port), "-H", env.HOSTNAME], {
  stdio: "inherit",
  env,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
