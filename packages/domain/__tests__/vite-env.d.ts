// The register test reads STD-052's copy as text with Vite's import.meta.glob.
// Only the form that test uses: this package keeps vite/client's types out.
interface ImportMeta {
  glob<T = unknown>(
    pattern: string,
    options: { readonly query: '?raw'; readonly import: 'default'; readonly eager: true },
  ): Record<string, T>;
}
