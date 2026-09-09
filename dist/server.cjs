var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "10mb" }));
function isPrivateHost(hostname) {
  const normHost = hostname.toLowerCase().trim();
  if (normHost === "localhost" || normHost === "::1" || normHost === "0.0.0.0" || normHost.endsWith(".local") || normHost.endsWith(".internal")) {
    return true;
  }
  const ipMatch = normHost.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipMatch) {
    const [, a, b] = ipMatch.map(Number);
    if (a === 127) return true;
    if (a === 10) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 0) return true;
  }
  return false;
}
app.post("/api/scrape", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "A valid public URL is required." });
      return;
    }
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        res.status(400).json({ error: "Only HTTP and HTTPS URLs are supported." });
        return;
      }
      if (isPrivateHost(parsedUrl.hostname)) {
        res.status(403).json({ error: "Access to private, loopback, or internal addresses is restricted." });
        return;
      }
    } catch {
      res.status(400).json({ error: "Malformed URL provided." });
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8e3);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 EducationalMathBot/1.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    clearTimeout(timeout);
    if (!response.ok) {
      res.status(response.status).json({
        error: `Failed to fetch URL: HTTP ${response.status} ${response.statusText}`
      });
      return;
    }
    const html = await response.text();
    const parsedRecords = parseHtmlTables(html);
    res.json({
      success: true,
      url,
      totalDetected: parsedRecords.length,
      records: parsedRecords,
      rawPreviewSnippet: html.slice(0, 1e3)
    });
  } catch (error) {
    if (error.name === "AbortError") {
      res.status(408).json({ error: "Request timed out after 8 seconds." });
      return;
    }
    res.status(500).json({
      error: `Scraping error: ${error.message || "Unable to fetch or parse destination."}`
    });
  }
});
function parseHtmlTables(html) {
  const records = [];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowContent = rowMatch[1];
    const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    const cells = [];
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const cleanText = cellMatch[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
      cells.push(cleanText);
    }
    if (cells.length >= 2) {
      const dateCell = cells.find(
        (c) => /^\d{4}-\d{2}-\d{2}$|^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$|^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}/i.test(c)
      );
      const pairs = cells.map((c) => c.replace(/\D/g, "")).filter((num) => num.length === 2);
      if (dateCell && pairs.length > 0) {
        records.push({
          date: dateCell,
          deshawar: pairs[0] || void 0,
          faridabad: pairs[1] || void 0,
          gali: pairs[2] || void 0,
          ghaziabad: pairs[3] || void 0
        });
      }
    }
  }
  return records;
}
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "date-pair-simulator-backend" });
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Date Pair Simulator server running on port ${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
