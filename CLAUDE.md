# CLAUDE.md — Numinia Digital Goods

> Context file for AI agents (Claude, Copilot, etc.) and human developers.
> Read this before touching any code. Updated: 2026-03-30.

---

## What this project is

**Numinia Digital Goods** is a platform for CC0-licensed digital assets: 3D models (GLB), avatars (VRM), Hyperfy worlds (HYP), audio, and video. Fork of [ToxSam/os3a-gallery](https://github.com/ToxSam/os3a-gallery), rebranded and extended.

**Core philosophy: File Over App + Decentralized**
- The app is a viewer/interface, not the source of truth
- Data lives in open files (JSON in GitHub, binaries on CDN/Arweave)
- The app can be replaced; the files remain forever

**Live:** https://numinia.store

---

## Repository map (2 repos)

```
numinia-digital-goods          ← THIS REPO: Next.js 16 app (code only)
numinia-digital-goods-data     ← Data repo: JSON metadata + asset binaries
```

### Data repo structure
```
numinia-digital-goods-data/
├── data/
│   ├── projects.json                    ← project index (5 categories)
│   ├── assets/numinia-assets.json       ← GLB catalog
│   ├── avatars/numinia-avatars.json     ← VRM catalog
│   ├── worlds/numinia-worlds.json       ← HYP catalog
│   ├── audio/numinia-audio.json         ← audio catalog
│   └── video/numinia-video.json         ← video catalog
├── content/
│   ├── models/      ← .glb files
│   ├── avatars/     ← .vrm files
│   ├── worlds/      ← .hyp files
│   ├── audio/       ← .mp3, .ogg
│   ├── video/       ← .mp4, .webm
│   └── thumbnails/  ← .png previews
├── data/versions/   ← version history per asset
```

---

## Asset ID System (UUID v7)

**See `ID_SYSTEM.md` for the full specification.**

Format: `ndg-{uuid-v7}` — Example: `ndg-019078e5-5a4c-7b00-8000-1a2b3c4d5e6f`

- RFC 9562 standard, 122 bits entropy, zero coordination
- `generateAssetId()` in `src/lib/asset-id.ts`
- `createAssetMetadata()` builds complete JSON entry with version, status, nft, storage
- `formatCanonical()` for NFT tokenURIs: `ndg:vrm:{uuid}:v0.1.0`
- Old IDs (slug-timestamp, UUID v4) continue to work — backward compatible

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.1, App Router, React 18 |
| Styling | Tailwind CSS 3 + shadcn/ui (copied to `src/components/ui/`) |
| 3D | Three.js 0.162 + @pixiv/three-vrm |
| Admin Auth | SIWE (Sign-In with Ethereum) via MetaMask |
| User Auth | GitHub OAuth (session cookie, httpOnly, secure) |
| Storage | GitHub (metadata), R2/CDN planned, Arweave (permanent, future) |
| Env | Zod validation in `src/lib/env.ts` (skips during build phase) |
| i18n | Static imports in `src/lib/i18n.tsx` — EN + JA |
| Tests | Vitest 4 + React Testing Library + jsdom — 50 tests |
| CI | GitHub Actions: type-check → test → build |
| Deploy | Vercel |

---

## Architecture decisions (do not change without discussion)

### 1. GitHub as metadata database
`src/lib/github-storage.ts` reads/writes JSON files to `numinia-digital-goods-data` via GitHub API.
- All env vars go through `src/lib/env.ts` — never use `process.env.X` directly
- camelCase in TypeScript, snake_case in JSON — conversion happens in github-storage.ts
- `updateAvatarInSource()` and `deleteAvatarFromSource()` write back to the correct per-project file

### 2. Asset URL resolution chain
`src/lib/assetUrls.ts` resolves relative paths to full URLs:
1. Arweave TX ID mapping (legacy content via `arweaveMapping.ts`)
2. R2 CDN URL (when configured)
3. GitHub raw fallback (`content/{type}/{file}`)

### 3. 3D components are all lazy-loaded
VRMViewer, GLBInspector, HomeVRMViewer → all use `next/dynamic({ ssr: false })`.
Do NOT add static imports for 3D components in any page/layout.

### 4. i18n uses static imports
`src/lib/i18n.tsx` imports all 16 translation files statically (8 per locale).
Do NOT use dynamic `import()` with template literals — Turbopack cannot bundle them.

### 5. Admin auth is wallet-based (SIWE)
- `/en/admin` shows WalletConnect gate
- Only ETH addresses in `ADMIN_WALLET_ADDRESSES` env var can access
- Session stored in `admin_session` httpOnly cookie (24h TTL)
- `getAdminSession()` in `src/lib/auth/getSession.ts` checks both wallet and OAuth

### 6. shadcn/ui components are copied, not installed
Actual components are in `src/components/ui/`. Use the CLI to add new ones:
```bash
npx shadcn-ui@latest add [component-name]
```

---

## Environment variables

See `.env.example`. Validated by Zod at runtime (skipped during `next build`).

| Variable | Required | Purpose |
|---|---|---|
| `GITHUB_REPO_OWNER` | Yes | Data repo owner (`PabloFMM`) |
| `GITHUB_REPO_NAME` | Yes | Data repo name (`numinia-digital-goods-data`) |
| `GITHUB_TOKEN` | Yes | Read/write data repo (PAT with `repo` scope) |
| `GITHUB_BRANCH` | No | Defaults to `main` |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth (login only, not needed for gallery) |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth |
| `ADMIN_WALLET_ADDRESSES` | No | Comma-separated ETH addresses for admin access |
| `NEXT_PUBLIC_SITE_URL` | No | Defaults to `http://localhost:3000` |
| `R2_*` | No | Cloudflare R2 (upload degrades gracefully) |

---

## Current status (2026-03-31)

### What's done
- ✅ OAuth CSRF fixed (crypto.randomUUID + httpOnly cookie)
- ✅ CORS conflict resolved (removed `*` from middleware)
- ✅ Branding: all ToxSam/opensource3dassets/opensourceavatars → Numinia
- ✅ i18n: static imports, correct provider nesting
- ✅ Env: Zod validation, build-phase skip, 0 direct process.env bypasses
- ✅ Admin: SIWE wallet auth, Claude-style sidebar, draggable modal, stats, settings
- ✅ Data repo: organized content/ folder structure, orphaned files cleaned
- ✅ console.log: 1 remaining (text only), 208 removed from 3D viewers
- ✅ Tests: 137 passing across 15 files (API routes, auth, libs, hooks)
- ✅ .env.local removed from git tracking
- ✅ All admin API routes protected with getAdminSession()
- ✅ R2 presigned upload (500MB limit), GitHub fallback
- ✅ UUID v7 asset ID system (RFC 9562)
- ✅ Favorites system (heart button, localStorage)
- ✅ NFT fields in admin modal (chain, contract, tokenId, type, OpenSea link)
- ✅ Hyperfy .hyp preview (GLB extraction from binary)
- ✅ Auto-thumbnail generation (Three.js offscreen canvas)
- ✅ Mobile responsive admin sidebar
- ✅ Actions menu on gallery cards (download, copy link, share)
- ✅ 0 JSX files remaining (all migrated to TSX)
- ✅ 1 `any` type remaining (VRMLoaderPlugin parser callback)

### What's remaining
| Task | Impact | Effort |
|---|---|---|
| User login flow (wallet + email) | High | 4h |
| User profile page (OpenSea style) | High | 3h |
| NFT ownership check (Base chain) | High | 2h |
| Digital Goods / Loot section (admin) | High | 3h |
| IPFS/Arweave storage layer | High | 4h |
| Optimistic locking (GitHub API writes) | Medium | 1h |
| Animation/Emote catalog structure | Medium | 2h |
| 5 @ts-nocheck files (3D viewers, 8K lines) | Low | 6h |

---

## Key files for AI agents

| File | Purpose |
|---|---|
| `src/lib/github-storage.ts` | All data CRUD + per-project file write-back |
| `src/lib/env.ts` | Zod-validated env vars (use this, never process.env) |
| `src/lib/auth/getSession.ts` | Unified admin session check (wallet + OAuth) |
| `src/lib/i18n.tsx` | Static translation loading (16 files) |
| `src/lib/assetUrls.ts` | URL resolution chain |
| `src/middleware.ts` | i18n routing + CORS |
| `src/app/api/admin/upload/route.ts` | Asset upload (GitHub API) |
| `src/app/api/auth/wallet/verify/route.ts` | SIWE signature verification |
| `src/components/admin/WalletConnect.tsx` | MetaMask connection flow |
| `src/components/AvatarAdminDashboard.tsx` | Admin CRUD UI |
| `src/components/finder/PreviewPanel.tsx` | Main viewer (940 lines, media viewer extracted) |
| `src/lib/utils/hypParser.ts` | Hyperfy .hyp binary parser (GLB extraction) |
| `src/lib/hooks/useFavorites.ts` | Favorites system (localStorage) |
| `src/components/asset/AssetActions.tsx` | Three-dot actions menu on gallery cards |

---

## What NOT to do

- Do NOT commit `.env.local` — already happened once, was cleaned
- Do NOT import 3D components statically — always `next/dynamic({ ssr: false })`
- Do NOT use dynamic `import()` with template literals in i18n — Turbopack breaks
- Do NOT use `process.env.X` directly — use `env.ts`
- Do NOT write to `data/avatars.json` — use `updateAvatarInSource()` / `deleteAvatarFromSource()` which write to the correct per-project file
- Do NOT add `GITHUB_REPO_OWNER=ToxSam` — that points to the original author's data

---

## Running locally

```bash
git clone https://github.com/PabloFMM/numinia-digital-goods.git
cd numinia-digital-goods
cp .env.example .env.local
# Fill in GITHUB_TOKEN, GITHUB_REPO_OWNER=PabloFMM, GITHUB_REPO_NAME=numinia-digital-goods-data

npm install
npm run dev          # http://localhost:3000


# INSTRUCCIONES PARA CLAUDE CODE — Remediación Auditoría Numinia

> **CONTEXTO:** Una auditoría profesional de seguridad y código ha identificado 8 vulnerabilidades y múltiples problemas de calidad en el ecosistema Numinia (2 repos + web). Este documento contiene instrucciones precisas ordenadas por prioridad. Ejecuta en orden. No saltes pasos.
>
> **REPOS:**
> - `numinia-digital-goods` → Next.js 16 app (código)
> - `numinia-digital-goods-data` → JSON metadata + assets (datos)
>
> **Lee `CLAUDE.md` primero.** Contiene el mapa completo del proyecto.

---

## BLOQUE 1 — SEGURIDAD CRÍTICA (hacer PRIMERO, antes de cualquier otra cosa)

### 1.1 — Fix vercel.json (ROOT CAUSE de docs rotas)

**Archivo:** `vercel.json`
**Problema:** El buildCommand actual es `"next build"` pero el package.json define `"build": "next build && node scripts/copy-docs.js"`. El vercel.json sobrescribe el script del package.json, por lo que `copy-docs.js` NUNCA se ejecuta en producción. Esto causa que TODAS las páginas de Resources en la web muestren el mismo contenido genérico.

**Acción:**
```json
{
  "buildCommand": "npm run build"
}
```

**Verificación:** Tras deploy, visitar `https://numinia.store/en/resources/about/philosophy` y confirmar que ya NO muestra el mismo texto que `/en/resources`.

---

### 1.2 — Fix OAuth CSRF (vulnerabilidad ALTA)

**Archivo:** `src/app/api/auth/github/route.ts`
**Problema:** El parámetro `state` en el flujo OAuth es una URL en lugar de un nonce criptográfico. Esto permite ataques CSRF donde un atacante puede vincular su cuenta GitHub con la sesión de una víctima.

**Acción:**
1. En la ruta que INICIA el OAuth (GET handler que redirige a GitHub):
   - Generar un nonce: `const state = crypto.randomUUID()`
   - Guardarlo en una cookie httpOnly:
     ```typescript
     cookies().set('oauth_state', state, {
       httpOnly: true,
       secure: process.env.NODE_ENV === 'production',
       sameSite: 'lax',
       maxAge: 600, // 10 minutos
       path: '/'
     })
     ```
   - Pasar ese `state` a la URL de autorización de GitHub

2. En el CALLBACK (`src/app/api/auth/github/callback/route.ts`):
   - Leer la cookie: `const savedState = cookies().get('oauth_state')?.value`
   - Comparar con el `state` recibido en query params
   - Si no coinciden, retornar `Response.json({ error: 'Invalid state' }, { status: 403 })`
   - Si coinciden, borrar la cookie y continuar con el flujo normal
   ```typescript
   const url = new URL(request.url)
   const state = url.searchParams.get('state')
   const savedState = cookies().get('oauth_state')?.value

   if (!state || !savedState || state !== savedState) {
     return Response.json({ error: 'CSRF validation failed' }, { status: 403 })
   }

   cookies().delete('oauth_state')
   // ... continuar con el intercambio de code por token
   ```

**Verificación:** Iniciar flujo OAuth, interceptar la URL de callback, modificar el parámetro `state` manualmente → debe devolver 403.

---

### 1.3 — Fix CORS (vulnerabilidad MEDIA-ALTA)

**Archivo:** `next.config.js`
**Problema:** La configuración actual tiene `Access-Control-Allow-Origin: *` combinado con `Access-Control-Allow-Credentials: true`. Esta combinación es inválida según la especificación CORS y puede causar comportamiento impredecible.

**Acción:** Buscar la sección de headers CORS en `next.config.js` y reemplazar:
```javascript
// ANTES (mal):
{ key: 'Access-Control-Allow-Origin', value: '*' },
{ key: 'Access-Control-Allow-Credentials', value: 'true' },

// DESPUÉS (bien):
{ key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_SITE_URL || 'https://numinia.store' },
{ key: 'Access-Control-Allow-Credentials', value: 'true' },
```

Si se necesita soportar múltiples orígenes (desarrollo + producción), usar un middleware dinámico en lugar de headers estáticos:
```javascript
// En middleware.ts o en las API routes que necesiten CORS:
const allowedOrigins = ['https://numinia.store', 'http://localhost:3000']
const origin = request.headers.get('origin')
if (origin && allowedOrigins.includes(origin)) {
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Credentials', 'true')
}
```

---

### 1.4 — Eliminar console.logs que filtran datos de usuario

**Archivo:** `AuthHandler.tsx` (en la RAÍZ del proyecto, no en src/)
**Problema:** Línea `console.log('User session found:', sessionData.user)` imprime el objeto usuario completo (id, username, email, role) en la consola del navegador de CUALQUIER visitante.

**Acción inmediata:** Eliminar o reemplazar TODOS los console.log de este archivo:
```typescript
// ELIMINAR estas líneas:
console.log('Checking session...');
console.log('User session found:', sessionData.user);
console.log('No session found. Redirecting to login...');
console.log('No user in session. Redirecting to login...');
console.error('Error checking session:', error);
```

**Acción completa (306 console.logs en todo el proyecto):**
1. Ejecutar: `grep -rn "console\.log\|console\.error\|console\.warn\|console\.debug" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | wc -l`
2. Para VRMViewer (226 de 306): eliminar todos los console.log. Si alguno es necesario para debug, reemplazar por un logger condicional:
   ```typescript
   const isDev = process.env.NODE_ENV === 'development'
   const log = (...args: unknown[]) => isDev && console.log(...args)
   ```
3. Para API routes: mismo tratamiento — eliminar o condicionar a development.

---

### 1.5 — Añadir validación Zod de variables de entorno

**Archivo:** `src/lib/env.ts`
**Problema:** Zod está instalado (`"zod": "^4.3.6"` en package.json) pero NO se usa para validar env vars. Las variables faltantes fallan silenciosamente. `GITHUB_REPO_OWNER` defaults a `'ToxSam'` si no está definida, enviando datos al repo equivocado.

**Acción:** Reescribir `src/lib/env.ts` para usar Zod:
```typescript
import { z } from 'zod'

const envSchema = z.object({
  // Requeridas
  GITHUB_REPO_OWNER: z.string().min(1, 'GITHUB_REPO_OWNER is required — do NOT default to ToxSam'),
  GITHUB_REPO_NAME: z.string().default('numinia-digital-goods-data'),
  GITHUB_BRANCH: z.string().default('main'),
  GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required for data operations'),

  // OAuth (requeridas si se usa login)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_REDIRECT_URI: z.string().optional(),

  // R2 (opcionales — fallback a GitHub)
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().default('numinia-assets'),
  R2_PUBLIC_URL: z.string().optional(),

  // Admin
  ADMIN_WALLET_ADDRESSES: z.string().optional(),

  // URLs públicas
  NEXT_PUBLIC_SITE_URL: z.string().default('https://numinia.store'),
  NEXT_PUBLIC_OPEN_SOURCE_3D_ASSETS_RAW_BASE: z.string().optional(),
  NEXT_PUBLIC_POLYGON_MODELS_RAW_BASE: z.string().optional(),
})

function validateEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error('❌ Environment validation failed:')
    for (const issue of result.error.issues) {
      console.error(`   ${issue.path.join('.')}: ${issue.message}`)
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing required environment variables')
    }
  }
  return result.success ? result.data : (process.env as unknown as z.infer<typeof envSchema>)
}

export const env = validateEnv()
```

**IMPORTANTE:** Luego buscar TODOS los usos de `process.env.GITHUB_REPO_OWNER` en el código y reemplazar por `env.GITHUB_REPO_OWNER`. Especialmente en `src/lib/github-storage.ts` donde hay un fallback peligroso a `'ToxSam'`.

---

## BLOQUE 2 — LIMPIEZA DE CÓDIGO (hacer después de seguridad)

### 2.1 — Eliminar archivos huérfanos de la raíz

**Problema:** `AuthHandler.tsx`, `App.js` (con espacio al principio: `  App.js`), y `trigger-redeploy.txt` están en la raíz del proyecto fuera de `src/`.

**Acción:**
```bash
# Verificar si AuthHandler.tsx en raíz se usa en algún import:
grep -rn "from.*['\"].*AuthHandler" src/ --include="*.ts" --include="*.tsx"

# Si NO se importa desde ningún sitio (probable — hay uno correcto en src/):
git rm "./AuthHandler.tsx"
git rm "./ App.js"  # OJO: tiene espacios al principio del nombre
git rm "./trigger-redeploy.txt"
```

### 2.2 — Eliminar phantom package

**Archivo:** `package.json`
**Acción:** Eliminar `"@shadcn/ui": "^0.0.4"` de dependencies. Es un phantom package que podría ser reclaimable como supply chain attack.

También mover `"@types/jszip": "^3.4.0"` de `dependencies` a `devDependencies`.

Y eliminar uno de `classnames` / `clsx` (ambos hacen lo mismo). Verificar cuál se usa más:
```bash
grep -rn "from 'classnames'" src/ | wc -l
grep -rn "from 'clsx'" src/ | wc -l
```
Eliminar el que se usa menos y reemplazar sus imports por el otro.

### 2.3 — Limpiar .gitignore para que .env.local no aparezca en el file tree

**Problema:** `.env.local` aparece en el file tree de GitHub (devuelve 404 al acceder). Esto sucede porque fue commiteado en algún momento y luego eliminado con `git rm`, pero el gitignore no lo previno a tiempo. Verificar:

```bash
# ¿Está .env.local en el historial?
git log --all --full-history -- .env.local

# Si SÍ aparece en el historial, limpiar con:
git filter-repo --path .env.local --invert-paths
# O si no tienes git-filter-repo:
# Usar BFG Repo-Cleaner: bfg --delete-files .env.local
```

**Esto es CRÍTICO si .env.local contenía secretos reales (GITHUB_TOKEN, CLIENT_SECRET, R2 keys). Todos esos secretos deben considerarse comprometidos y rotarse.**

---

## BLOQUE 3 — README Y DOCUMENTACIÓN (repo app)

### 3.1 — Reescribir README.md del app repo

**Problema actual:** El README tiene URLs con espacios que no funcionan, créditos que dicen "ToxSam", versión de Next.js incorrecta (dice 14, es 16), links a Discord muertos, y Twitter con texto/URL que no coinciden.

**Acción:** Reescribir el README. Puntos clave:
- Cambiar "Next.js 14" → "Next.js 16"
- Cambiar URLs de clone: `https://github.com/PabloFMM/numinia-digital-goods.git` (sin espacios)
- Credits: "Gallery Development: PabloFMM (fork of ToxSam/os3a-gallery)"
- Twitter: `[@numinia_xyz](https://x.com/numinia_xyz)`
- Eliminar link de Discord muerto `[Join our community](#)`
- Cambiar "Made with ❤️ by ToxSam" → "Originally by ToxSam, extended by PabloFMM for the Numinia ecosystem"
- Data Repository link: `github.com/PabloFMM/numinia-digital-goods-data` (no ToxSam)
- Environment Variables section: referenciar `.env.example` con `GITHUB_REPO_OWNER=PabloFMM` (NO ToxSam)
- Añadir badge de CI status
- Añadir sección de SECURITY.md

### 3.2 — Añadir SECURITY.md

**Acción:** Crear `SECURITY.md` en la raíz:
```markdown
# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Numinia Digital Goods, please report it responsibly:

1. **Do NOT open a public GitHub issue**
2. Email: [add your security email here]
3. Include: description, steps to reproduce, potential impact

We will acknowledge receipt within 48 hours and aim to provide a fix within 7 days for critical issues.

## Supported Versions

| Version | Supported |
|---------|-----------|
| main branch | ✅ |
| All others | ❌ |
```

### 3.3 — Añadir CONTRIBUTING.md

**Acción:** Crear `CONTRIBUTING.md` con:
- Cómo hacer setup local (referir a README)
- Cómo contribuir assets (PR al data repo, con formato JSON esperado)
- Cómo contribuir código (PR al app repo, con checklist: type-check, tests, no console.logs)
- Code of Conduct

---

## BLOQUE 4 — DOCUMENTACIÓN DEL DATA REPO

### 4.1 — Reescribir README del data repo

**Repo:** `numinia-digital-goods-data`
**Problema:** El README tiene UNA línea. Para un repo que es la "fuente de verdad" (filosofía File Over App), esto es inaceptable.

**Acción:** Escribir un README completo:
```markdown
# Numinia Digital Goods — Data

The source of truth for all Numinia Digital Goods metadata.
This repo contains JSON metadata and CC0-licensed 3D assets.

## Repository Structure

```
data/
├── projects.json           # Collection metadata (name, description, license, creator)
└── assets/
    ├── pm-momuspark.json   # MomusPark collection assets
    ├── pm-medieval.json    # Medieval Fair collection assets
    └── ...                 # One file per collection
content/
└── [content files]         # Static content for the web app
download-counts.json        # Download statistics per asset
```

## JSON Schema

### projects.json
[Documenta la estructura real — inspeccionar el archivo y describir cada campo]

### Asset files (data/assets/*.json)
[Documenta la estructura de cada asset entry — campos como name, file_url, thumbnail_url, license, etc.]

## How to Contribute Assets

1. Fork this repo
2. Add your asset metadata to the appropriate JSON file
3. Ensure your 3D files are CC0 or CC-BY licensed
4. Submit a PR

## Relationship to Other Repos

- **numinia-digital-goods**: The Next.js web app that reads from this repo
- **open-source-3D-assets**: ToxSam's original data repo (legacy, read-only)

## License

CC0-1.0 — All data and assets are public domain.
```

### 4.2 — Añadir CLAUDE.md al data repo

**Acción:** Crear `CLAUDE.md` en `numinia-digital-goods-data`:
```markdown
# CLAUDE.md — Numinia Digital Goods Data

> Context file for AI agents. Updated: [fecha].

## What this repo is

Source of truth for Numinia Digital Goods metadata.
The app repo (`numinia-digital-goods`) reads JSON from here via GitHub API.

## File structure

- `data/projects.json` — Collection definitions
- `data/assets/*.json` — One file per collection, each containing an array of asset objects
- `content/` — Static content files (markdown docs for the web)
- `download-counts.json` — Download statistics

## JSON conventions

- Use snake_case for all JSON keys
- The app converts to camelCase in `github-storage.ts`
- Asset URLs should point to Arweave TX IDs when available, GitHub raw as fallback

## How the app reads this data

The app uses `@octokit/rest` to fetch files from this repo.
The env var `GITHUB_REPO_OWNER` in the app must be set to `PabloFMM`.
The env var `GITHUB_REPO_NAME` must be set to `numinia-digital-goods-data`.

## Do NOT

- Store binary 3D files directly in git (use Arweave, reference TX IDs in JSON)
- Change JSON key names without coordinating with the app repo
- Delete asset entries — mark as deprecated instead
```

---

## BLOQUE 5 — FIX i18n ROTO EN PRODUCCIÓN

### 5.1 — Arreglar traducciones de About y Gallery

**Problema:** Las páginas `/en/about` y `/en/gallery` muestran claves i18n raw (`about.title`, `header.navigation.avatars`) en lugar de texto traducido. La home (`/en`) funciona bien.

**Diagnóstico:** Inspeccionar los archivos de traducción:
```bash
# Encontrar archivos de locale:
find src/locales -type f -name "*.json" -o -name "*.ts"

# Verificar si las claves `about.*` y `header.navigation.*` existen:
grep -r "about.title" src/locales/
grep -r "header.navigation.avatars" src/locales/
```

**Causas probables (verificar en orden):**
1. Las claves están en el archivo de locale EN pero no se cargan en esas páginas
2. El middleware no pasa el locale correctamente a esas rutas
3. Las traducciones están incompletas (faltan keys)

**Acción:** Asegurar que TODAS las claves usadas en `about` page y en el header están definidas en los archivos de traducción para ambos idiomas (en/ja).

### 5.2 — Arreglar footer inconsistente

**Problema:** Algunas páginas dicen "© 2026 Thanks ToxSam. All Numinia Digital Good are CC0." (con typo: "Good" sin 's'), otras dicen "© 2026 Numinia Digital Goods. All assets are CC0."

**Acción:** Buscar el componente de footer:
```bash
grep -rn "Thanks ToxSam" src/
grep -rn "Digital Good " src/  # con espacio después, para encontrar el typo
```

Unificar a:
```
© 2026 Numinia Digital Goods. Originally by ToxSam. All assets are CC0.
```

---

## BLOQUE 6 — TESTING (hacer después de los fixes de seguridad)

### 6.1 — Tests para el flujo OAuth

**Crear:** `src/app/api/auth/github/__tests__/route.test.ts`

Tests mínimos:
1. La ruta GET genera un state nonce y lo guarda en cookie
2. La URL de redirección contiene el state correcto
3. El callback rechaza si el state no coincide (403)
4. El callback rechaza si no hay cookie de state (403)
5. El callback acepta si el state coincide y borra la cookie

### 6.2 — Tests para env validation

**Crear:** `src/lib/__tests__/env.test.ts`

Tests mínimos:
1. Falla si GITHUB_REPO_OWNER está vacío
2. Falla si GITHUB_TOKEN está vacío
3. Pasa con todas las vars requeridas definidas
4. Usa defaults correctos para vars opcionales

### 6.3 — Tests para assetUrls.ts

**Crear:** `src/lib/__tests__/assetUrls.test.ts`

Tests mínimos:
1. Resuelve a Arweave TX ID si existe mapping
2. Resuelve a R2 URL si Arweave no disponible
3. Fallback a GitHub raw si ni Arweave ni R2

---

## BLOQUE 7 — DEUDA TÉCNICA (cuando haya tiempo)

### 7.1 — Dividir PreviewPanel.tsx (1943 líneas)

**Archivo:** `src/components/finder/PreviewPanel.tsx`

No tocarlo sin tests. Primero escribir tests básicos de render, luego extraer:
- `PreviewPanelHeader.tsx` — título, controles, metadata
- `PreviewPanelViewer.tsx` — el visor 3D
- `PreviewPanelActions.tsx` — botones de descarga
- `usePreviewPanel.ts` — hook con toda la lógica de estado

### 7.2 — Migrar JSX → TSX

Quedan 16 archivos JSX en VRMViewer/GLBInspector. Migrar uno por uno:
```bash
find src/ -name "*.jsx" -type f
```
Para cada archivo: renombrar a .tsx, añadir tipos a props y estado, resolver errores de TypeScript.

### 7.3 — Reducir `any` en github-storage.ts

Este archivo tiene 24 `any`. Es el archivo más crítico (CRUD contra GitHub API). Priorizar tipar:
- Las respuestas de Octokit
- Los objetos de asset/project
- Los parámetros de funciones públicas

### 7.4 — Configurar Dependabot

**Crear:** `.github/dependabot.yml`
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
```

### 7.5 — Añadir caché para GitHub API

`src/lib/github-storage.ts` hace llamadas a la API de GitHub sin caché. Con el rate limit de 5000 req/hora (autenticado), esto puede ser un problema en picos de tráfico.

Opciones:
1. ISR (Incremental Static Regeneration) en las rutas que leen datos
2. In-memory cache con TTL de 5 minutos
3. `unstable_cache` de Next.js

---

## CHECKLIST DE VERIFICACIÓN POST-FIXES

Después de aplicar todos los cambios, verificar:

- [ ] `npm run type-check` pasa sin errores
- [ ] `npm test` pasa (incluyendo los nuevos tests)
- [ ] `npm run build` completa exitosamente
- [ ] No hay console.log en código de producción: `grep -rn "console\." src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".test." | wc -l` → debería ser 0 (o solo el logger condicional)
- [ ] `.env.local` NO aparece en `git status` ni en el file tree de GitHub
- [ ] `vercel.json` usa `"buildCommand": "npm run build"`
- [ ] Las páginas de Resources en producción muestran contenido diferenciado
- [ ] La página About muestra texto real, no claves i18n
- [ ] El footer es consistente en todas las páginas
- [ ] OAuth flow funciona y rechaza state inválido
- [ ] No hay `Access-Control-Allow-Origin: *` en los headers de respuesta

---

## ORDEN DE EJECUCIÓN RECOMENDADO

```
1. Leer CLAUDE.md completo
2. BLOQUE 1.1 → vercel.json (2 min)
3. BLOQUE 1.2 → OAuth CSRF fix (15 min)
4. BLOQUE 1.3 → CORS fix (5 min)
5. BLOQUE 1.4 → console.log cleanup (30 min)
6. BLOQUE 1.5 → Zod env validation (30 min)
7. BLOQUE 2.1 → Eliminar archivos huérfanos (5 min)
8. BLOQUE 2.2 → Limpiar package.json (5 min)
9. BLOQUE 5.1 → Fix i18n (variable — depende del diagnóstico)
10. BLOQUE 5.2 → Fix footer (10 min)
11. BLOQUE 3 → README y docs del app repo (30 min)
12. BLOQUE 4 → README y CLAUDE.md del data repo (30 min)
13. BLOQUE 6 → Tests (1-2 horas)
14. BLOQUE 7 → Deuda técnica (cuando haya tiempo)
15. Ejecutar checklist de verificación
```
npm run type-check   # TypeScript validation
npm test             # Vitest (50 tests)
npm run build        # Production build
```
