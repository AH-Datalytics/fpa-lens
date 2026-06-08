/**
 * Parse the Regional Director's monthly SITREP (PDF) into a structured digest
 * via the Claude API, written to public/data/sitrep.json.
 *
 * The SITREP is narrative, so this uses Claude with a strict structured-output
 * tool schema + prompt caching. It extracts only what is explicitly stated;
 * anything absent is returned null rather than guessed.
 *
 * Usage:
 *   node scripts/extractSitrep.mjs <path-to-sitrep.pdf>
 *   SITREP_INPUT=<path> node scripts/extractSitrep.mjs
 *
 * Requires ANTHROPIC_API_KEY (from env / .env.vercel-prod locally).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalEnv } from "./sharepoint/graph.mjs";

const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUTPUT_PATH = `${REPO_ROOT}/public/data/sitrep.json`;
const MODEL = "claude-sonnet-4-6";

const SCHEMA = {
  type: "object",
  properties: {
    reportMonth: { type: "string", description: "Reporting month and year, e.g. 'April 2026'" },
    executiveSummary: { type: "string", description: "1-3 sentence plain summary from the Executive Summary section" },
    readiness: {
      type: "object",
      description: "Readiness Report colors, each exactly Green, Amber, or Red (null if not stated)",
      properties: {
        infrastructure: { type: ["string", "null"], enum: ["Green", "Amber", "Red", null] },
        staffing: { type: ["string", "null"], enum: ["Green", "Amber", "Red", null] },
        financial: { type: ["string", "null"], enum: ["Green", "Amber", "Red", null] },
        media: { type: ["string", "null"], enum: ["Green", "Amber", "Red", null] },
      },
      required: ["infrastructure", "staffing", "financial", "media"],
    },
    permits: {
      type: "object",
      description: "Permits issued, from Department Execution > Engineering",
      properties: {
        issued: { type: ["integer", "null"] },
        period: { type: ["string", "null"], description: "The month the count is for, e.g. 'March 2026'" },
        type: { type: ["string", "null"], description: "Permit type if stated, e.g. 'Levee Safety'" },
      },
      required: ["issued", "period", "type"],
    },
    safety: {
      type: "object",
      properties: {
        accidents: { type: ["integer", "null"] },
        incidents: { type: ["integer", "null"] },
      },
      required: ["accidents", "incidents"],
    },
    staffing: {
      type: "object",
      properties: {
        vacancies: { type: ["integer", "null"] },
        classifiedHeadcount: { type: ["integer", "null"] },
        unclassifiedHeadcount: { type: ["integer", "null"] },
      },
      required: ["vacancies", "classifiedHeadcount", "unclassifiedHeadcount"],
    },
    maintenanceActivities: {
      type: "array",
      description: "Concise bullets from Department Execution > Maintenance",
      items: { type: "string" },
    },
    projects: {
      type: "array",
      description: "Capital projects with a short status",
      items: {
        type: "object",
        properties: { name: { type: "string" }, status: { type: "string" } },
        required: ["name", "status"],
      },
    },
  },
  required: ["reportMonth", "executiveSummary", "readiness", "permits", "safety", "staffing", "maintenanceActivities", "projects"],
};

const SYSTEM = [
  "You extract structured data from the Southeast Louisiana Flood Protection Authority's",
  "monthly Regional Director SITREP. Extract ONLY facts explicitly stated in the document.",
  "If a value is not present, use null (or an empty array). Never infer or estimate numbers.",
  "Readiness colors must be exactly Green, Amber, or Red as written.",
].join(" ");

function resolveInput() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith("-"));
  const p = arg || process.env.SITREP_INPUT;
  if (!p) throw new Error("No SITREP path given (arg or SITREP_INPUT).");
  return p;
}

// .docx is a zip; word/document.xml holds the text. Extract via Python stdlib
// (already available in CI) so we don't add a Node dependency. Claude's document
// block only accepts PDF, so Word files are sent as plain text instead.
function docxToText(path) {
  const py = [
    "import sys, zipfile, re, html",
    "x = zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode('utf-8','ignore')",
    "x = re.sub(r'</w:p>', chr(10), x)",
    "x = re.sub(r'<[^>]+>', '', x)",
    "print(html.unescape(x))",
  ].join("\n");
  return execFileSync("python3", ["-c", py, path], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
}

/** Build the Claude message content for a SITREP file (PDF or Word). */
function buildContent(path) {
  const ext = path.toLowerCase().split(".").pop();
  if (ext === "pdf") {
    const pdf = readFileSync(path).toString("base64");
    return [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } },
      { type: "text", text: "Extract the SITREP digest from this document using the sitrep_digest tool." },
    ];
  }
  if (ext === "docx") {
    const text = docxToText(path);
    return [
      { type: "text", text: `SITREP document text:\n\n${text}\n\nExtract the SITREP digest using the sitrep_digest tool.` },
    ];
  }
  throw new Error(`Unsupported SITREP format: .${ext} (expected pdf or docx)`);
}

async function main() {
  loadLocalEnv();
  const KEY = process.env.ANTHROPIC_API_KEY;
  if (!KEY) throw new Error("ANTHROPIC_API_KEY is not set.");

  const path = resolveInput();
  console.log(`Parsing ${basename(path)} with ${MODEL}...`);
  const content = buildContent(path);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      tools: [{ name: "sitrep_digest", description: "Return the SITREP digest.", input_schema: SCHEMA }],
      tool_choice: { type: "tool", name: "sitrep_digest" },
      messages: [{ role: "user", content }],
    }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${JSON.stringify(json)}`);

  const tool = json.content?.find((c) => c.type === "tool_use");
  if (!tool) throw new Error(`No tool_use in response: ${JSON.stringify(json).slice(0, 500)}`);

  const digest = { ...tool.input, source: basename(path), generatedFrom: "Claude " + MODEL };
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(digest, null, 2));
  console.log(`Wrote ${OUTPUT_PATH}`);
  if (json.usage) console.log(`Tokens: in=${json.usage.input_tokens} out=${json.usage.output_tokens}`);
}

main().catch((e) => {
  console.error("SITREP parse failed:", e.message);
  process.exit(1);
});
