import { fileURLToPath } from "node:url";
import starlight from "@astrojs/starlight";
import { astroServerOptions, ModuleKitError, onShutdown } from "@lazurio/module-kit";
import { defineConfig } from "astro/config";
import { sidebar } from "./src/sidebar";

const LISTENER = "app";

// Host and port come only from the Launchpad listener (Lazurio Module Standard
// 4.2). Astro evaluates `server` during `astro build`, `astro check` and
// `astro sync` too, so the listener is read only when Astro serves.
const serving = process.argv.includes("dev") || process.argv.includes("preview");

function listenerServer(): ReturnType<typeof astroServerOptions> {
  try {
    return astroServerOptions(LISTENER);
  } catch (error) {
    if (!(error instanceof ModuleKitError)) throw error;
    console.error(`Start through Lazurio lifecycle: ${error.message}`);
    process.exit(2);
  }
}

// SIGTERM from the Launchpad ends the dev server with exit 0 (standard 4.4).
if (serving) onShutdown(() => undefined);

export default defineConfig({
  site: "https://knowledgebase.example.local",
  ...(serving ? { server: listenerServer() } : {}),
  // Static assets live next to the canonical pages in data/v2.
  publicDir: fileURLToPath(new URL("../../data/v2/public", import.meta.url)),
  vite: {
    // No .env* files on the start path (standard 4.3).
    envDir: false,
    server: { strictPort: true },
    preview: { strictPort: true },
  },
  redirects: {
    "/": "/cs/",
  },
  integrations: [
    starlight({
      title: "Knowledgebase",
      favicon: "/favicon.svg",
      locales: {
        cs: { label: "Čeština", lang: "cs" },
        en: { label: "English", lang: "en" },
      },
      defaultLocale: "cs",
      sidebar,
      routeMiddleware: "./src/routeData.ts",
      customCss: ["./src/styles/docs.css"],
    }),
  ],
});
