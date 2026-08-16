---
legacy: true
title: 'Website Source Code'
description: 'Where the platform code lives and how to build on the open data'
---

# Website Source Code

The platform is being rebuilt as an Astro + TypeScript monorepo (Three.js, Tailwind CSS 4). The rebuild lives in the numengames organization and the repository opens as it stabilizes.

[numengames on GitHub →](https://github.com/numengames)

## Build on the data instead

While the app repository is private, everything needed to build a viewer of your
own is already public: the [data repository](https://github.com/PabloFMM/numinia-digital-goods-data)
holds every catalog as plain JSON — see [Asset Database](../database/).

## Contributing

Improvements to the data (metadata fixes, new catalogs) are welcome as pull
requests on the [data repository](https://github.com/PabloFMM/numinia-digital-goods-data).

## Architecture

File Over App: the JSON data is the product; binaries live on Arweave, R2 and
IPFS; the site is static-first with islands only where interaction demands them.
