/// <reference types="vite/client" />

/**
 * Typed build-time environment.
 *
 * Without this, `import.meta.env.VITE_API_URL` is `any` and every value derived
 * from it silently loses its type — including the API client's base URL. Naming
 * the variables here also documents exactly which ones the client expects.
 */
interface ImportMetaEnv {
  /** Absolute URL of the Savewise API, including the `/api` prefix. */
  readonly VITE_API_URL?: string;
  /** Public origin of the web client, used for canonical URLs. */
  readonly VITE_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
