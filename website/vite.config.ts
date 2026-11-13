import {fileURLToPath} from 'node:url';
import {historicalPhotoPrivacy} from './build-plugins/historical-photo-privacy.ts';
import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    historicalPhotoPrivacy(fileURLToPath(new URL("./public",import.meta.url)),fileURLToPath(new URL("./build/client",import.meta.url))),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    reactRouter(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
});
