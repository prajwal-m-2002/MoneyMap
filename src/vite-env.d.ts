/// <reference types="vite/client" />

// Allow CSS imports as side effects (handled by Vite)
declare module '*.css' {
  const content: Record<string, string>
  export default content
}
