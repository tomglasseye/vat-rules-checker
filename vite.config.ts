import netlify from "@netlify/vite-plugin";
import netlifyReactRouter from "@netlify/vite-plugin-react-router";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    reactRouter(),
    // Deploys the app as Netlify Functions
    netlifyReactRouter(),
    // Local Netlify platform in `npm run dev`, including the local database in .netlify/db.
    // Edge functions are off: the app has none, and the Deno server they need fails to start
    // because @netlify/edge-functions-dev passes `--allow-scripts`, which Deno 2.9 rejects.
    netlify({ edgeFunctions: { enabled: false } }),
  ],
});
