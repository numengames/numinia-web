# Sistema de Diseño de Numen Games — Kit v5.0.0

**El .md es la ley; este kit es la mudanza con la ley dentro.** Todo lo necesario para
implementar el sistema en un proyecto: documento maestro, guía viva, activos de marca,
fuentes con sus licencias, plantilla canónica y el kit generado.

> **El nombre clave «Khepri» se retiró en la 5.0.0** (§0.4). El sistema se llama por lo
> que es. Ninguna regla cambió con el renombrado; el escarabajo sigue siendo el
> escarabajo (es marca, no nombre del sistema), y por eso los ficheros de activos
> conservan su nombre físico.

## Instalación (agente de código: esta es tu orden)

1. Descomprime este kit en `design-system/` del repositorio **conservando la estructura**. No modifiques nada dentro.
2. Añade al `CLAUDE.md` del repo el bloque de abajo.
3. Enlaza o copia `kit/sistema.css` y `kit/sistema.js` como base de la pieza (§13.1: se copian, no se reescriben).
4. Trabaja según el `.md`: declara **registro** (§2.8) antes que medio, elige plano (§13), nivel (§11), pasa la checklist (§19.4).
5. Verifica que `index.html` abre con las fuentes cargando y sin errores de consola.

## Bloque para CLAUDE.md

```
## Sistema de diseño
Todo diseño se rige por design-system/2026_08_18-Sistema_de_Diseno-v5_0_0.md
(Sistema de Diseño de Numen Games v5.0.0). El nombre clave «Khepri» se retiró en §0.4.
Registro antes que medio (§2.8): Umbral · Velo · Low-poly · Píxel.
Precedencia (§0.3): ante contradicción con material antiguo, este documento manda.
Kit generado en design-system/kit/ (sistema.css, sistema.js, sistema.tokens.json):
se enlaza o copia, jamás se reescribe.
Presupuesto de lectura: fragmento §19.5 ~2,1k tokens (tarea rápida) · §19 ~7,5k
(producción) · documento ~46k (auditoría). Antes de entregar: checklist §19.4.
```

## Estructura

- `2026_08_18-Sistema_de_Diseno-v5_0_0.md` — el documento maestro (fuente de verdad).
- `index.html` — la guía viva: cada regla, demostrada; norma completa desplegable por sección.
- `kit/` — `sistema.css` · `sistema.js` · `sistema.tokens.json`, **generados del .md** al empaquetar.
- `assets/` — marca (SVG `currentColor`), glifos del juego, fuentes woff2 **con sus licencias OFL**
  (Geist, Geist Mono, Pixelify Sans y la tercera voz Alegreya —redonda, itálica y small caps, §4.6—),
  texturas horneadas, sprites del registro píxel.
- `plantillas/` — factura canónica (Diurno, A4, una página).

Los materiales pesados de 3D (normal 4096², alpha de horneado) viajan en el paquete
**Materiales**, aparte — §6.2. Licencia del sistema: CC0 1.0 (marcas excluidas, §15).

*La binaria de la guía no es ruido: decodifícala.*
