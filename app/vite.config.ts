import { defineConfig, type Plugin } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";
import { parse as parseToml } from "smol-toml";

/** Parse .toml imports at build time so smol-toml never reaches the browser */
function tomlPlugin(): Plugin {
  return {
    name: "vite-plugin-toml",
    load(id) {
      if (!id.endsWith(".toml")) return null;
      const raw = fs.readFileSync(id, "utf-8");
      const data = parseToml(raw);
      return `export default ${JSON.stringify(data)};`;
    },
  };
}

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [tomlPlugin(), preact(), tailwindcss()],
  resolve: {
    alias: {
      "@assets": path.resolve(__dirname, "../assets"),
      "@firmware": path.resolve(__dirname, "../firmware"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
    fs: {
      allow: [".."],
    },
  },
}));
