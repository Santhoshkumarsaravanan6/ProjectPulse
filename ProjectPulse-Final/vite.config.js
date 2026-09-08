import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Your real Power Automate HTTP trigger URL — master data flow
const FLOW_URL =
  "https://93cd50265ecdea7aa4fd295cb67b42.d4.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/22/workflows/fa6a24a2ca4b4db498b9eb939349553a/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=YBkFBfYF1FPY_DHWRI0JSpXmHw0ST46XX93XUHeXvwc";

// Your real Power Automate HTTP trigger URL — audit email flow
const AUDIT_FLOW_URL =
  "https://93cd50265ecdea7aa4fd295cb67b42.d4.environment.api.powerplatform.com:443/powerautomate/automations/direct/cu/18/workflows/c7212c437f6d41948d051538730ea7d2/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=R9u4HkZeRsU2g0mvWkuc3POFQHqzMAa3uEnRbgDzT6E";

const flowUrlObj = new URL(FLOW_URL);
const flowOrigin = flowUrlObj.origin;
const flowPathAndQuery = flowUrlObj.pathname + flowUrlObj.search;

const auditFlowUrlObj = new URL(AUDIT_FLOW_URL);
const auditFlowOrigin = auditFlowUrlObj.origin;
const auditFlowPathAndQuery = auditFlowUrlObj.pathname + auditFlowUrlObj.search;

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
        secure: false,
        rewrite: () => flowPathAndQuery,
      },
      // The app calls fetch("/auditflow") to fire the audit-log
      // notification email. Same proxy pattern as /flow above.
      '/auditflow': {
        target: auditFlowOrigin,
        changeOrigin: true,
        secure: false,
        rewrite: () => auditFlowPathAndQuery,
      },
    },
  },
})
