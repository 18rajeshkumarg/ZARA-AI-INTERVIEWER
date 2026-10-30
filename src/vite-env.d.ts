/// <reference types="vite/client" />

declare global {
  interface Window {
    /** Set by main.tsx so the load watchdog in index.html can tell a slow
     *  download apart from a bundle that never executed. */
    __ZARA_APP_STARTED__?: boolean
  }
}

export { }
