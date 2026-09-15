declare module '*?inline' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_HF_DEFAULT_KEY: string;
  readonly VITE_GEMINI_DEFAULT_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
