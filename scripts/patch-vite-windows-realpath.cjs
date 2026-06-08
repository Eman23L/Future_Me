const fs = require("node:fs");
const path = require("node:path");

const viteDist = path.resolve(__dirname, "..", "node_modules", "vite", "dist", "node", "chunks");
const realpathMarker = "exec(\"net use\", (error, stdout) => {";
const esbuildMarker = `esbuild: config.esbuild === false ? false : {
      jsxDev: !isProduction,
      ...config.esbuild
    },`;
const replaceDefineMarker = "async function replaceDefine(code, id, define, config) {\n  const esbuildOptions = config.esbuild || {};";
const minifyMarker = 'minify: raw?.ssr ? false : "esbuild",';

if (!fs.existsSync(viteDist)) {
  process.exit(0);
}

const viteChunk = fs
  .readdirSync(viteDist)
  .find((file) => file.endsWith(".js") && fs.readFileSync(path.join(viteDist, file), "utf8").includes(realpathMarker));

if (!viteChunk) {
  process.exit(0);
}

const filePath = path.join(viteDist, viteChunk);
let source = fs.readFileSync(filePath, "utf8");
let patched = source;

if (!source.includes("catch (error) {\n    safeRealpathSync = fs__default.realpathSync.native;")) {
  patched = patched.replace(
    realpathMarker,
    `try {\n    ${realpathMarker}`
  ).replace(
    "  });\n}\nfunction ensureWatchedFile",
    "  });\n  } catch (error) {\n    safeRealpathSync = fs__default.realpathSync.native;\n  }\n}\nfunction ensureWatchedFile"
  );
}

if (!patched.includes("esbuild: false,")) {
  patched = patched.replace(esbuildMarker, "esbuild: false,");
}

if (!patched.includes("noDiscovery: true,")) {
  patched = patched.replace(
    "disabled: undefined,\n    needsInterop: [],",
    "noDiscovery: true,\n    include: [],\n    needsInterop: [],"
  );
}

patched = patched.replace(
  "optimizeDeps: {\n      holdUntilCrawlEnd: true,\n      ...optimizeDeps,",
  "optimizeDeps: {\n      holdUntilCrawlEnd: true,\n      ...optimizeDeps,\n      noDiscovery: true,\n      include: [],"
);

if (!patched.includes("if (config.esbuild === false) return { code, map: null };")) {
  patched = patched.replace(
    replaceDefineMarker,
    "async function replaceDefine(code, id, define, config) {\n  if (config.esbuild === false) return { code, map: null };\n  const esbuildOptions = config.esbuild || {};"
  );
}

if (patched.includes(minifyMarker)) {
  patched = patched.replace(minifyMarker, "minify: false,");
}

patched = patched.replaceAll("disabled: true,\n      noDiscovery: true,", "noDiscovery: true,");
patched = patched.replaceAll("disabled: true,\n    noDiscovery: true,", "noDiscovery: true,");

if (patched === source) {
  process.exit(0);
}

fs.writeFileSync(filePath, patched);
console.log(`Patched Vite Windows realpath helper in ${path.relative(process.cwd(), filePath)}`);
