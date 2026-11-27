// DealSleuth entrypoint (Node 22, standard library only).
//
// The site itself is plain static files in app/ (index.html, style.css,
// main.js, data.js) plus 3-4 real browser screenshots in screenshots/.
// This program's only job is to hand those files in: it copies app/ and
// screenshots/ into the grader's output directory and writes the dossier
// the judge reads, using the kit's vendored buildDossier library.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// In the grader, MAKEFUN_OUTPUT_DIR is unset and /output is used instead.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const appDir = join(repoRoot, "app");
const shotsDir = join(repoRoot, "screenshots");

// The gate refuses an entry past its caps, so refuse early with a clear
// message instead of writing a dossier the scorer would reject.
const appEntries = readdirSync(appDir, { withFileTypes: true, recursive: true });
if (appEntries.length > 993) {
  throw new Error(`app/ holds ${appEntries.length} entries, over the 993 cap`);
}
const shotNames = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((name) => !name.startsWith("."))
  : [];
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`screenshots/ holds ${shotNames.length} images, need 3 or 4`);
}

mkdirSync(outputDir, { recursive: true });
cpSync(appDir, join(outputDir, "app"), { recursive: true });
mkdirSync(join(outputDir, "screenshots"), { recursive: true });
cpSync(shotsDir, join(outputDir, "screenshots"), { recursive: true });

// buildDossier walks the output directory and writes the dossier from the
// files actually handed in, so the dossier always matches the submission.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216
});
writeFileSync(join(outputDir, "dossier.json"), dossier);

console.log(
  `DealSleuth handed in: ${appEntries.length} app entries, ` +
    `${shotNames.length} screenshots, dossier ${dossier.length} bytes.`
);
