> ⚠️ **HISTORICAL DOCUMENT (superseded).** This is the original 2026-04-03 CTO
> proposal, kept as context. Where it disagrees with `CLAUDE.md`, `DECISIONS.md`
> (ADR-001+), or `docs/decisions/`, those win — e.g. i18n is 5 languages
> (ADR-001, not "EN/JA/ES"), Astro is current-stable (ADR-015), and phases/
> status live in `TODO.md` + `missions/`.

# NUMINIA.STORE — Plan de Reconstrucción desde Cero

**Autor:** Auditoría CTO externa
**Fecha:** 2026-04-03
**Versión:** 0.1.0
**Estado:** Propuesta para validación por los Oráculos

---

## 1. Diagnóstico ejecutivo

### Lo que existe hoy

numinia.store es un fork de ToxSam/os3a-gallery (11 commits originales, 84 en el fork) reconvertido en galería de assets 3D CC0. El código actual fue diseñado como visor estático de archivos GLB. No refleja ningún aspecto del universo Numinia, su modelo organizacional, su sistema RPG, ni su filosofía fundacional.

### Lo que debería ser

Tras analizar los siete documentos seminales — el manual RPG completo (4668 líneas), las relaciones epistémicas Numen/Numinia, la estructura de roles basada en Systems Thinking, el compendio de atributos y rangos, el diseño de Session Zero, el documento Brand & Culture, y Welcome to Numinia — la conclusión es clara:

**numinia.store debe ser la materialización digital de la cultura material de Numinia.** Una plataforma con arquitectura de profundidad progresiva:

- **Capa 0 (Superficie):** Galería CC0 pública. Cualquier persona descarga assets sin saber nada de Numinia. SEO máximo, alcance global, remix culture.
- **Capa 1 (Contexto):** Los assets revelan su contexto narrativo. Un avatar VRM no es solo un modelo 3D — es un Centinela de la Casa de los Guardianes. Un sello no es un badge — es una recompensa del Umbral del Valor.
- **Capa 2 (Identidad):** Wallet connect (SIWE). Los ciudadanos de Numinia acceden con su identidad on-chain. Su rango, gremio y facción se reflejan en la interfaz.
- **Capa 3 (Juego):** Los digital goods cobran vida dentro del sistema RPG. Los sellos de Session Zero se refunden en la Fragua. Los avatares desbloqueados tienen significado dentro del modelo funcional.

### Puntuaciones actualizadas

| Dimensión                            | Antes de leer docs |  Después   | Comentario                                              |
| ------------------------------------ | :----------------: | :--------: | ------------------------------------------------------- |
| Visión fundacional                   |    No evaluada     | **9.5/10** | Epistemología sólida, RPG completo, modelo replicable   |
| Coherencia visión↔ejecución          |         —          |  **1/10**  | La brecha más grande que he visto en un proyecto        |
| Valor de los datos (991+ CC0 assets) |        8/10        |  **8/10**  | Se mantiene — el tesoro es portable                     |
| Session Zero en Hyperfy              |    No evaluado     |  **7/10**  | Existe y funciona — validación del modelo               |
| Código actual de numinia.store       |       3.4/10       |  **2/10**  | Baja más al entender lo que debería ser                 |
| Ecosistema Numen Games (19 repos)    |        6/10        |  **7/10**  | Hay piezas reutilizables (agents, models, integrations) |

---

## 2. Principios de arquitectura

Derivados directamente de los documentos seminales, no inventados:

### 2.1 File Over App (heredado del CLAUDE.md actual, validado)

> "La app es un viewer/interfaz, no la fuente de verdad. Los datos viven en archivos abiertos."

Esto se mantiene y se refuerza. La app puede morir; los archivos permanecen en Arweave/IPFS/GitHub.

### 2.2 Operating System → Functional Model → Narrative Projection

La tricotomía de Peirce aplicada a la arquitectura:

- **Operating System (Object):** La lógica de negocio — APIs, datos, identidad, permisos.
- **Functional Model (Ground):** La estructura que da significado — gremios, facciones, rangos, roles, competencias. Es la capa de dominio.
- **Narrative Projection (Representamen):** La interfaz — lo que el ciudadano/visitante ve, toca, y experimenta. numinia.store es esto.

### 2.3 Remix Culture (CC0 como axioma)

> "Feel free to copy it and make it better."

Todo asset público es CC0. El código es MIT u otra licencia open source. La plataforma es un bien público digital.

### 2.4 Progressive Disclosure (la galería como puerta de entrada)

Un visitante casual llega por SEO buscando "free 3D assets CC0", descarga lo que necesita, y se va satisfecho. Un visitante curioso descubre el contexto narrativo. Un ciudadano de Numinia ve su rango, sus sellos, y su progresión.

**La misma plataforma. Tres experiencias.**

### 2.5 Seguridad y Soberanía de Datos (ZK como prioridad declarada)

El documento Brand & Culture menciona explícitamente "data sovereignty, privacy zero proof of knowledge." Esto no es decorativo — debe implementarse:

- Autenticación: SIWE (Sign-In With Ethereum) — ya existe como dependencia en el proyecto actual.
- Identidad: La wallet es la identidad. Sin emails, sin passwords, sin bases de datos de usuarios.
- ZK-proofs: Para verificar rango/gremio sin revelar la wallet completa (fase futura).

---

## 3. Stack tecnológico propuesto

### Criterios de selección

Tomados literalmente de tu respuesta: "estándar de la industria, open source o free software, priorizando la seguridad, el ZK, la integración con 3D y XR."

### Stack seleccionado

| Capa                   | Tecnología                                               | Justificación                                                                                                                                                                 |
| ---------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Framework**          | **Astro 5** + islas React                                | SSG por defecto (SEO máximo para la galería CC0), hidratación parcial solo donde se necesita 3D/interactividad. El web de Numen Games ya usa Astro — coherencia de ecosistema |
| **Islas interactivas** | **React 19** + Three.js/R3F                              | Solo el viewer 3D y componentes interactivos se hidratan. El 90% de la galería es HTML estático                                                                               |
| **3D/XR**              | **Three.js** + @react-three/fiber + @pixiv/three-vrm     | Stack actual probado. Se mantiene pero en componentes limpios y testeados                                                                                                     |
| **Estilos**            | **Tailwind CSS 4** + tokens de diseño Numinia            | Sistema de diseño propio derivado de la identidad visual de Brand & Culture                                                                                                   |
| **Auth**               | **SIWE** (Sign-In With Ethereum) via viem                | Ya es dependencia del proyecto. Wallet = identidad. Sin base de datos de usuarios                                                                                             |
| **Datos (metadata)**   | **GitHub** (JSON) → migración futura a Ceramic/ComposeDB | File Over App. Los datos están en repos públicos. La app los consume                                                                                                          |
| **Datos (binarios)**   | **Arweave** (permanente) + **R2** (CDN/cache)            | Pipeline automático: upload → Arweave TX ID → cache en R2 → servir                                                                                                            |
| **Gamificación**       | **Modelo de dominio en TypeScript**                      | Gremios, facciones, rangos, sellos, competencias como tipos del dominio                                                                                                       |
| **ZK (futuro)**        | **Semaphore** o **Zupass**                               | Verificación de membresía en gremio/facción sin revelar wallet                                                                                                                |
| **Testing**            | **Vitest** + Playwright + Testing Library                | Unit + integration + e2e desde el primer commit                                                                                                                               |
| **CI/CD**              | **GitHub Actions**                                       | type-check → lint → test → build → deploy                                                                                                                                     |
| **Deploy**             | **Vercel** (mantenido) o **Cloudflare Pages**            | Ambos soportan Astro SSG. Cloudflare da más control sobre R2                                                                                                                  |
| **Monorepo**           | **Turborepo**                                            | Separar: `apps/store`, `packages/domain`, `packages/3d-viewer`, `packages/ui`                                                                                                 |

### Por qué Astro en vez de Next.js

1. **SEO:** El 90% de numinia.store es contenido estático (páginas de assets, colecciones, documentación). Astro genera HTML puro sin JavaScript. Cada asset tiene su propia URL indexable.
2. **Performance:** Zero JS por defecto. El viewer 3D se hidrata solo cuando el usuario lo necesita. Las páginas de galería cargan en <1s.
3. **Coherencia:** numengames-web ya usa Astro. Un solo framework en el ecosistema.
4. **Islas:** Los componentes React (viewer 3D, wallet connect, panel de ciudadano) se cargan solo donde hacen falta, con `client:visible` o `client:load`.
5. **i18n nativo:** Astro tiene routing i18n integrado (EN/JA/ES) sin middleware manual.

---

## 4. Arquitectura de datos

### 4.1 Estructura del Domain Model

Derivado directamente de los documentos seminales:

```
packages/domain/
├── types/
│   ├── agent.ts           # Personal Traits, Profile, Position, Identity, Role, Rank
│   ├── guild.ts            # 4 guilds × 2 branches × 2 houses (Basic Level Theory)
│   ├── faction.ts          # 4 factions (Prototype Theory: Education, Game, Organization, Art)
│   ├── rank.ts             # Nomad → Citizen → Pilgrim → Vernacular → Archon → Oracle
│   ├── asset.ts            # GLB/VRM metadata + narrative context (collection, lore, guild affinity)
│   ├── seal.ts             # Session Zero rewards (8 seals → Cyberdog avatar)
│   ├── competence.ts       # Skills organized by domains
│   └── character-sheet.ts  # Complete character sheet as type
├── resolvers/
│   ├── asset-url.ts        # Arweave → R2 → GitHub fallback chain
│   └── guild-resolver.ts   # Superordinate → Basic → Subordinate level resolution
├── validators/
│   └── env.ts              # Zod validation — fail at startup, not runtime
└── constants/
    ├── guilds.ts           # Alchemists, Exegetes, Procurators, Sentinels
    ├── factions.ts         # Hermeticists, Heirs of Eleusis, Stellar Circle, Neo-Atlantists
    └── districts.ts        # Ouroboros, Sycamore, etc.
```

### 4.2 Estructura del repositorio de datos

```
numinia-digital-goods-data/  (ya existe, se evoluciona)
├── data/
│   ├── projects.json        # Colecciones (existente)
│   ├── assets/              # Metadata por colección (existente)
│   └── lore/                # NUEVO: contexto narrativo por asset
│       ├── guild-affinities.json
│       └── collection-lore.json
├── content/                 # Contenido editorial (ya existe)
├── seals/                   # NUEVO: definiciones de sellos de Session Zero
│   └── session-zero.json
└── download-counts.json     # Tracking de descargas (existente)
```

### 4.3 Pipeline de assets

```
Creador sube asset
       ↓
  Upload a Arweave (ArDrive/Turbo SDK)
       ↓
  TX ID guardado en JSON del data repo
       ↓
  GitHub Action: sync a R2 (cache CDN)
       ↓
  numinia.store consume desde R2 (fast) con fallback a Arweave (permanent)
```

---

## 5. Estructura de la aplicación

```
apps/store/                    # Astro app
├── src/
│   ├── pages/
│   │   ├── [lang]/
│   │   │   ├── index.astro           # Landing — Capa 0
│   │   │   ├── archive/
│   │   │   │   ├── index.astro       # Galería paginada — Capa 0
│   │   │   │   └── [slug].astro      # Detalle de asset — Capa 0/1
│   │   │   ├── collections/
│   │   │   │   └── [id].astro        # Colección con contexto narrativo — Capa 1
│   │   │   ├── citizen/
│   │   │   │   ├── index.astro       # Dashboard de ciudadano — Capa 2
│   │   │   │   ├── character.astro   # Hoja de personaje — Capa 2/3
│   │   │   │   └── seals.astro       # Mis sellos — Capa 3
│   │   │   ├── inspector/
│   │   │   │   └── index.astro       # GLB Inspector — Capa 0
│   │   │   ├── finder/
│   │   │   │   └── index.astro       # Asset Finder — Capa 0
│   │   │   └── lore/
│   │   │       └── index.astro       # Archivo Akáshico — Capa 1
│   │   └── api/
│   │       ├── auth/
│   │       │   └── siwe.ts           # SIWE verify
│   │       ├── download/
│   │       │   └── [id].ts           # Download tracking
│   │       └── assets/
│   │           └── [collection].ts   # Asset data API
│   ├── components/
│   │   ├── gallery/                  # Componentes estáticos (Astro)
│   │   ├── viewer/                   # React islands (client:visible)
│   │   │   ├── GLBViewer.tsx
│   │   │   ├── VRMViewer.tsx         # Reescrito desde 0 — max 200 líneas
│   │   │   └── InspectorPanel.tsx
│   │   ├── citizen/                  # React islands (client:load)
│   │   │   ├── WalletConnect.tsx
│   │   │   ├── CharacterSheet.tsx
│   │   │   └── SealCollection.tsx
│   │   └── ui/                       # Design system Numinia
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── CitizenLayout.astro
│   ├── styles/
│   │   └── tokens.css                # Variables CSS derivadas de Brand & Culture
│   └── lib/
│       ├── data.ts                   # Fetch data from GitHub/R2
│       ├── i18n.ts                   # EN/JA/ES
│       └── auth.ts                   # SIWE session management
├── public/
│   ├── fonts/
│   └── images/
├── astro.config.mjs
├── tailwind.config.ts
└── vitest.config.ts
```

---

## 6. Fases de construcción

### Fase 0 — Cimientos (Semanas 1-3)

**Objetivo:** Repo limpio, CI/CD, domain model, zero vulnerabilidades.

- Inicializar monorepo con Turborepo
- Crear `packages/domain` con todos los tipos del modelo Numinia (gremios, facciones, rangos, assets, sellos)
- Configurar Astro + Tailwind + Vitest + Playwright
- Implementar validación de env vars con Zod (fallo al arrancar)
- CI: type-check → lint → test → build en GitHub Actions
- Definir tokens de diseño derivados de Brand & Culture
- Tests: 100% del domain model cubierto

**Entregable:** Monorepo que compila, pasa tests, y despliega una página vacía en Vercel/Cloudflare.

### Fase 1 — Galería CC0 (Semanas 4-8)

**Objetivo:** Reemplazar numinia.store actual con una galería estática superior.

- Migrar datos de `numinia-digital-goods-data` al nuevo formato
- Páginas estáticas para cada asset (SSG — una URL por asset, SEO perfecto)
- Páginas de colección con contexto narrativo (Capa 1 — cada colección tiene lore)
- Viewer 3D reescrito desde cero: máximo 200 líneas por componente
- Búsqueda y filtrado client-side (sin necesidad de API)
- Descarga directa + batch download
- i18n: EN/JA/ES
- Responsive, accesible, rápido

**Entregable:** numinia.store v2 live — funcionalmente superior al actual pero sin identidad wallet.

### Fase 2 — Identidad y Soberanía (Semanas 9-12)

**Objetivo:** Wallet connect, rango, ciudadanía.

- SIWE (Sign-In With Ethereum) con viem
- Sesión httpOnly cookie con nonce criptográfico (fix del CSRF actual)
- Dashboard de ciudadano: rango, gremio, facción
- Hoja de personaje básica (read-only desde datos on-chain o off-chain verificados)
- Integración con los sellos de Session Zero (verificar que el usuario completó escape rooms en Hyperfy)
- CORS configurado correctamente (origin explícito, no wildcard)

**Entregable:** Los ciudadanos de Numinia pueden conectar su wallet y ver su identidad.

### Fase 3 — Gamificación (Semanas 13-18)

**Objetivo:** Los digital goods cobran vida dentro del sistema RPG.

- Sellos de Session Zero: visualización, progresión, refundición (la Fragua)
- Desbloqueo del avatar Cyberdog al completar los 8 sellos
- Sistema de tracking de descargas con contexto narrativo
- Archivo Akáshico: sección de lore donde cada colección tiene su historia
- Prism Cells: sistema de recompensas por facción (tracking visual)
- Integración con Huly (board de misiones) — link bidireccional

**Entregable:** numinia.store refleja el sistema RPG. Los assets tienen significado.

### Fase 4 — Descentralización real (Semanas 19-26)

**Objetivo:** File Over App completamente implementado.

- Pipeline automático de upload a Arweave (ArDrive Turbo SDK — ya es dependencia)
- Todos los assets CC0 con TX IDs permanentes
- GitHub API cache (ISR o in-memory) para evitar rate limiting
- ZK exploration: Semaphore para verificación de gremio sin revelar wallet
- API pública documentada para que terceros consuman los datos
- Exportación de la hoja de personaje como archivo portable (JSON-LD o similar)

**Entregable:** Cualquier desarrollador puede construir su propia interfaz sobre los datos de Numinia. La app es reemplazable; los datos son eternos.

### Fase 5 — XR y Metaverso (Semanas 27+)

**Objetivo:** Conexión bidireccional numinia.store ↔ Hyperfy.

- Deep links desde numinia.store hacia los espacios de Hyperfy
- Assets descargados se pueden usar directamente en Hyperfy
- Session Zero completion status sincronizado
- WebXR preview de assets en la propia web (AR view)
- Integración con numinia-agents (digital agents que operan en los espacios)

**Entregable:** numinia.store es el puente entre el web 2D y el metaverso 3D de Numinia.

---

## 7. Lo que se salva del proyecto actual

| Asset                                                                    | Acción                                        | Destino                                |
| ------------------------------------------------------------------------ | --------------------------------------------- | -------------------------------------- |
| 991+ assets CC0 (data repo)                                              | Migrar metadata al nuevo schema               | `packages/domain` types + data repo    |
| Dominio numinia.store                                                    | Mantener                                      | Apunta al nuevo deploy                 |
| i18n EN/JA                                                               | Migrar traducciones                           | Astro i18n nativo                      |
| Dependencias validadas (Three.js, @pixiv/three-vrm, viem, siwe, ArDrive) | Mantener en el nuevo package.json             | Sin cambio                             |
| CLAUDE.md                                                                | Evolucionar como documentación del nuevo repo | Se reescribe con la nueva arquitectura |
| CI/CD (GitHub Actions)                                                   | Adaptar al monorepo                           | Turborepo + Actions                    |
| Session Zero en Hyperfy                                                  | No tocar — es infraestructura independiente   | Se integra vía API en Fase 3           |

### Lo que se descarta

- Todo el código fuente del fork de ToxSam (0 líneas reutilizadas)
- El App.js huérfano
- El AuthHandler.tsx con console.logs
- El PreviewPanel.tsx de 1943 líneas
- Los 306 console.log
- La configuración CORS rota
- El flujo OAuth de GitHub (reemplazado por SIWE)
- El `arweaveMapping.ts` estático (reemplazado por TX IDs en los datos)

---

## 8. Métricas de éxito

### Fase 1 (Galería)

- Lighthouse Performance: >95
- Lighthouse SEO: >95
- Tiempo de carga primera visita: <1.5s
- Cada asset tiene URL propia indexable
- 0 console.log en producción
- 0 vulnerabilidades de seguridad conocidas
- Test coverage domain model: >90%

### Fase 2 (Identidad)

- Login con wallet en <3 clicks
- Sesión segura con nonce criptográfico
- CORS correctamente configurado
- 0 datos personales almacenados en servidor

### Fase 3 (Gamificación)

- Los 8 sellos de Session Zero son visibles y verificables
- Cada colección tiene contexto narrativo visible
- La hoja de personaje refleja gremio, facción, y rango

### Fase 4 (Descentralización)

- 100% de assets con TX ID en Arweave
- API pública documentada
- Al menos 1 aplicación de terceros consume los datos

---

## 9. Riesgos y mitigaciones

| Riesgo                                                         | Probabilidad | Impacto | Mitigación                                                                                              |
| -------------------------------------------------------------- | :----------: | :-----: | ------------------------------------------------------------------------------------------------------- |
| Astro no soporta bien las islas React con Three.js             |    Media     |  Alto   | Prototipo técnico en Fase 0 — si falla, fallback a Next.js con output: export                           |
| Session Zero en Hyperfy no tiene API para verificar completion |     Alta     |  Medio  | Diseñar sistema de verificación manual (firmar mensaje con wallet al completar) hasta que exista API    |
| La comunidad actual es 0 (0 stars, 0 forks)                    |   Certeza    |  Bajo   | No es un problema — se construye comunidad con el producto, no al revés                                 |
| Arweave costs para 991+ assets                                 |    Media     |  Bajo   | ArDrive Turbo con créditos prepagados. Los GLBs son relativamente pequeños                              |
| Scope creep por la riqueza del universo Numinia                |     Alta     |  Alto   | Cada fase tiene un entregable concreto y desplegable. No se empieza la siguiente sin cerrar la anterior |

---

## 10. Primera acción

Antes de escribir una línea de código, el primer deliverable debería ser un **spike técnico** de 2-3 días que valide:

1. Astro 5 + isla React con Three.js/@pixiv/three-vrm renderizando un VRM correctamente
2. SIWE login flow con viem en un endpoint de Astro
3. Fetch de datos desde el repo numinia-digital-goods-data via GitHub API

Si estos tres puntos funcionan juntos, la arquitectura propuesta es viable. Si alguno falla, se ajusta antes de invertir semanas.

---

_"Sin reglas no hay juego; y sin juego no hay alma; y sin alma... no hay Numinia."_

_Este plan es la primera regla del nuevo juego._
