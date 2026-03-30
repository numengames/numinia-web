# Numinia Digital Goods

A curated registry of free CC0 digital assets: 3D models (GLB), avatars (VRM), worlds (HYP), audio, and video. Built for games, VR, and metaverse projects.

**Live:** [numinia.store](https://numinia.store)

## What is this?

Numinia Digital Goods is an open platform for discovering and managing CC0-licensed digital assets. All assets are free to use in any project, no attribution required.

**Philosophy: File Over App** -- the data lives in open files (JSON on GitHub, binaries on CDN/Arweave). The app is a viewer, not the source of truth.

## Repository structure

```
numinia-digital-goods          <-- THIS REPO: Next.js app (code only)
numinia-digital-goods-data     <-- Data repo: JSON metadata + asset binaries
```

The data repo is organized by type:

```
content/
├── models/       GLB 3D models
├── avatars/      VRM avatars
├── worlds/       HYP Hyperfy worlds
├── audio/        MP3, OGG
├── video/        MP4, WebM
└── thumbnails/   Preview images
```

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, App Router, React 18, TypeScript |
| Styling | Tailwind CSS 3 + shadcn/ui |
| 3D | Three.js + @pixiv/three-vrm + STL viewer |
| Auth | SIWE (Sign-In with Ethereum) for admin, GitHub OAuth for users |
| Storage | GitHub (metadata), Cloudflare R2 (CDN), Arweave (permanent) |
| Tests | Vitest 4 + React Testing Library (138 tests) |
| Deploy | Vercel |

## Getting started

```bash
git clone https://github.com/PabloFMM/numinia-digital-goods.git
cd numinia-digital-goods
cp .env.example .env.local
# Fill in GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME
npm install
npm run dev
```

Visit `http://localhost:3000`

## Admin panel

Go to `/en/admin` and connect with MetaMask. Only ETH addresses in `ADMIN_WALLET_ADDRESSES` env var can access.

Features:
- Upload assets (GLB, VRM, HYP, STL, MP3, OGG, MP4, WebM, JPG, PNG)
- Hide/show, rename, delete assets
- NFT fields (chain, contract, token ID, type)
- Auto-thumbnail generation from 3D models
- Stats dashboard, notification badges, changelog
- All changes commit directly to the data repo

## Contributing

1. **Add assets**: Upload via admin panel or PR to [numinia-digital-goods-data](https://github.com/PabloFMM/numinia-digital-goods-data)
2. **Improve the app**: Fix bugs, add features -- [open an issue](https://github.com/PabloFMM/numinia-digital-goods/issues)
3. **Translate**: Help translate to more languages (currently EN + JA)

## License

Code: MIT. Assets: CC0 (check each asset's license).

## Credits

- **Original gallery**: [ToxSam/os3a-gallery](https://github.com/ToxSam/os3a-gallery) (forked and extended)
- **Polygonal Mind**: CC0 3D asset collections
- **Numen Games**: [numen.games](https://numen.games)

## Links

- [numinia.store](https://numinia.store)
- [Data repo](https://github.com/PabloFMM/numinia-digital-goods-data)
- [@numinia_store](https://x.com/numinia_store)
- [Numen Games](https://numen.games)
