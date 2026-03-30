# Contributing to Numinia Digital Goods

Thanks for your interest in contributing! This project is an open registry of CC0 digital assets.

## Ways to contribute

### 1. Add assets
- **Via admin panel**: Go to [numinia.store/en/admin](https://numinia.store/en/admin), connect MetaMask, upload files
- **Via PR to data repo**: Add files to [numinia-digital-goods-data](https://github.com/PabloFMM/numinia-digital-goods-data)

Supported formats: GLB, VRM, HYP, STL, MP3, OGG, MP4, WebM, JPG, PNG

### 2. Improve the app
1. Fork the repo
2. Create a branch (`git checkout -b feat/my-feature`)
3. Make changes
4. Run checks: `npm run type-check && npm test`
5. Submit a PR

### 3. Translate
Translation files are in `src/locales/`. Currently supported: English (en), Japanese (ja).

To add a new language, copy `src/locales/en/` to `src/locales/{code}/` and translate the JSON values.

## Development setup

```bash
git clone https://github.com/PabloFMM/numinia-digital-goods.git
cd numinia-digital-goods
cp .env.example .env.local
npm install
npm run dev
```

## Code guidelines

- TypeScript strict mode — no `any` unless absolutely necessary
- Use `env.ts` for environment variables, never `process.env` directly
- 3D components must use `next/dynamic({ ssr: false })`
- i18n uses static imports only (no dynamic template literals)
- Run `npm run type-check && npm test` before submitting

## Project structure

See [CLAUDE.md](./CLAUDE.md) for the full architecture guide.

## Questions?

Open a [GitHub Issue](https://github.com/PabloFMM/numinia-digital-goods/issues) or DM [@numinia_store](https://x.com/numinia_store).
