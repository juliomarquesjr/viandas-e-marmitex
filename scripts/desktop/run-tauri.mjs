import { spawn } from "node:child_process";
import { delimiter, join } from "node:path";
import { homedir } from "node:os";

function prependToPath(env, entry) {
  const currentPath = env.PATH ?? "";
  const pathEntries = currentPath.split(delimiter).filter(Boolean);
  const alreadyPresent = pathEntries.some(
    (pathEntry) => pathEntry.toLowerCase() === entry.toLowerCase(),
  );

  if (alreadyPresent) {
    return env;
  }

  return {
    ...env,
    PATH: `${entry}${delimiter}${currentPath}`,
  };
}

function withRequiredBinsInPath(env) {
  const cargoBin = join(homedir(), ".cargo", "bin");
  const localBin = join(process.cwd(), "node_modules", ".bin");
  return prependToPath(prependToPath(env, cargoBin), localBin);
}

const args = process.argv.slice(2);
const tauriCommand = "tauri";

const child = spawn(tauriCommand, args, {
  stdio: "inherit",
  env: withRequiredBinsInPath(process.env),
  shell: process.platform === "win32",
});

child.on("error", (error) => {
  console.error("Falha ao iniciar comando tauri:", error.message);
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
