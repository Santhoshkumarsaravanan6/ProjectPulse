import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Your real Power Automate HTTP trigger URL
const FLOW_URL =
  "https://93cd50265ecdea7aa4fd295cb67b42.d4.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/22/workflows/fa6a24a2ca4b4db498b9eb939349553a/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=YBkFBfYF1FPY_DHWRI0JSpXmHw0ST46XX93XUHeXvwc";

const flowUrlObj = new URL(FLOW_URL);
const flowOrigin = flowUrlObj.origin; // scheme + host + port only
const flowPathAndQuery = flowUrlObj.pathname + flowUrlObj.search; // the rest, incl. the sig

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // The app calls fetch("/flow") in dev; this forwards that
      // request server-side to the real Power Automate URL,
      // avoiding the browser's CORS restriction entirely.
      '/flow': {
        target: flowOrigin,
        changeOrigin: true,
        secure: true,
        rewrite: () => flowPathAndQuery,
      },
    },
  },
})