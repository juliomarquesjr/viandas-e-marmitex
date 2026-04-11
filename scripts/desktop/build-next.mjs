import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

const env = {
  ...process.env,
  NEXT_BUILD_STANDALONE: "true",
  APP_RUNTIME: "desktop",
  NEXT_PUBLIC_APP_RUNTIME: "desktop",
};

const child = spawn(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
