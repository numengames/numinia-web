# Khepri · Numen Games Design System — Kit v4.2.0

**El .md es la ley; este kit es la mudanza con la ley dentro.** Todo lo necesario para
implementar el sistema en un proyecto: documento maestro, guía viva, activos de marca,
fuentes con sus licencias, plantilla canónica y el kit generado.

## Instalación (agente de código: esta es tu orden)

1. Descomprime este kit en `khepri/` del repositorio **conservando la estructura**. No modifiques nada dentro.
2. Añade al `CLAUDE.md` del repo el bloque de abajo.
3. Enlaza o copia `kit/khepri.css` y `kit/khepri.js` como base de la pieza (§13.1: se copian, no se reescriben).
4. Trabaja según el `.md`: elige plano (§13), nivel (§11), pasa la checklist (§19.4).
5. Verifica que `index.html` abre con las fuentes cargando y sin errores de consola.

## Bloque para CLAUDE.md

```
## Sistema de diseño
Todo diseño se rige por khepri/2026_08_15-Numen_Design_System-v4.2.0.md (Khepri v4.2.0).
Precedencia (§0.3): ante contradicción con material antiguo, Khepri manda.
Kit generado en khepri/kit/ (css, js, tokens.json): se enlaza o copia, jamás se reescribe.
Presupuesto de lectura: fragmento §19.5 ~1,2k tokens (tarea rápida) · §19 ~5k (producción)
· documento ~30k (auditoría). Antes de entregar: checklist §19.4.
```

## Estructura

- `2026_08_15-Numen_Design_System-v4.2.0.md` — el documento maestro (fuente de verdad).
- `index.html` — la guía viva: cada regla, demostrada; norma completa desplegable por sección.
- `kit/` — `khepri.css` · `khepri.js` · `khepri.tokens.json`, **generados del .md** al empaquetar.
- `assets/` — marca (SVG `currentColor`), glifos del juego, fuentes woff2 **con sus licencias OFL**, texturas horneadas, sprites del registro píxel.
- `plantillas/` — factura canónica (Diurno, A4, una página).

Los materiales pesados de 3D (normal 4096², alpha de horneado) viajan en el paquete
**Materiales**, aparte — §6.2. Licencia del sistema: CC0 1.0 (marcas excluidas, §15).

*La binaria de la guía no es ruido: decodifícala.*
