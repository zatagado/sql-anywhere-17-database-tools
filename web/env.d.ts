/// <reference types="vite/client" />

/** Minimal VS Code webview API (provided when running inside a webview panel). */
export interface VsCodeApi {
  postMessage(message: unknown): void
  getState(): unknown
  setState(state: unknown): unknown
}

declare global {
  interface Window {
    __vscodeApi__?: VsCodeApi
    /** Set by extension HTML before the Vue bundle loads; selects which root view to mount. */
    __VSCODE_WEBVIEW_VIEW__?: 'queryResults' | 'test'
  }
}
