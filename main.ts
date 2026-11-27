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

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

// Relative file paths (with byte sizes) under a directory, depth first.
function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, base));
    else if (entry.isFile()) out.push({ rel: full.slice(base.length + 1), bytes: statSync(full).size });
  }
  return out.sort((a, b) => (a.rel < b.rel ? -1 : 1));
}

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

// Post-copy integrity check: the grader reads only what landed in the
// output directory, so a silent short copy would hand in a broken site.
// Fail loudly instead of writing a dossier for a partial submission.
const copiedApp = listFiles(join(outputDir, "app"));
const sourceApp = listFiles(appDir);
if (
  copiedApp.length !== sourceApp.length ||
  copiedApp.some((f, i) => f.rel !== sourceApp[i].rel || f.bytes !== sourceApp[i].bytes)
) {
  throw new Error(
    `app/ copy mismatch: source has ${sourceApp.length} files, output has ${copiedApp.length}`
  );
}
const copiedShots = listFiles(join(outputDir, "screenshots"));
for (const shot of copiedShots) {
  if (shot.bytes > 262144) {
    throw new Error(`screenshot ${shot.rel} is ${shot.bytes} bytes, over the 256 KiB cap`);
  }
}

// data.js is the single source of deals; count them the same way the
// dossier text will show them, so a truncated or stale copy is caught.
const dealCount = (readFileSync(join(appDir, "data.js"), "utf8").match(/^\s*id: "/gm) ?? []).length;
if (dealCount === 0) throw new Error("data.js holds no deals");

// buildDossier walks the output directory and writes the dossier from the
// files actually handed in, so the dossier always matches the submission.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 16777216
});
writeFileSync(join(outputDir, "dossier.json"), dossier);

// Verify the dossier actually written: it must parse, and it must carry
// every deal (data.js fits whole in the dossier text, so the counts match).
const dossierText = readFileSync(join(outputDir, "dossier.json"), "utf8");
const dossierJson = JSON.parse(dossierText);
const dossierDealCount = (dossierJson.text.match(/^\s*id: "/gm) ?? []).length;
if (dossierDealCount !== dealCount) {
  throw new Error(`dossier carries ${dossierDealCount} deals, data.js has ${dealCount}`);
}

console.log(
  `DealSleuth handed in: ${copiedApp.length} app files copied, ` +
    `${copiedShots.length} screenshots (${copiedShots.reduce((n, s) => n + s.bytes, 0)} bytes), ` +
    `${dealCount} deals, dossier ${dossier.length} bytes.`
);
