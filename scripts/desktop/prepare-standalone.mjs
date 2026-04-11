import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const standaloneDir = path.join(projectRoot, ".next", "standalone");
const staticDir = path.join(projectRoot, ".next", "static");
const publicDir = path.join(projectRoot, "public");

const resourcesRoot = path.join(projectRoot, "src-tauri", "resources");
const appResourcesDir = path.join(resourcesRoot, "app");

async function ensureExists(target, label) {
  try {
    await stat(target);
  } catch {
    throw new Error(`${label} nao encontrado em ${target}. Rode \"npm run desktop:next:build\" primeiro.`);
  }
}

async function main() {
  await ensureExists(standaloneDir, "Build standalone do Next.js");
  await ensureExists(staticDir, "Assets estaticos do Next.js");

  await rm(appResourcesDir, { recursive: true, force: true });
  await mkdir(appResourcesDir, { recursive: true });

  await cp(standaloneDir, appResourcesDir, { recursive: true });

  // Prevent recursive embedding of previously generated desktop resources.
  await rm(path.join(appResourcesDir, "src-tauri"), { recursive: true, force: true });

  const nextStaticDest = path.join(appResourcesDir, ".next", "static");
  await mkdir(path.dirname(nextStaticDest), { recursive: true });
  await cp(staticDir, nextStaticDest, { recursive: true });

  await cp(publicDir, path.join(appResourcesDir, "public"), { recursive: true });

  console.log(`Desktop resources preparados em: ${appResourcesDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
