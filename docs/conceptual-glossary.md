# Glosario conceptual — los 25 términos que sostienen el proyecto

> **For humans.** Los conceptos fundacionales de Numinia explicados sin jerga: qué es cada cosa, qué incertidumbre resuelve conocerla y qué permite hacer aquí. Sin términos del juego de rol (esos viven en el corpus seminal); máximo 25 entradas, las conceptualmente más importantes.
>
> **Epistemic value.** Un vocabulario compartido: cualquier persona — o agente — que entre al proyecto sabe qué significan exactamente sus palabras clave.
> **Pragmatic value.** Fuente para copy, onboarding, documentación y decisiones de producto; el árbitro cuando un texto duda entre tecnicismo y claridad.
> **In the system.** Observa: la misión del proyecto y su stack. Regula: el lenguaje de nivel I/III. Acoplado a: docs/glossary.md (autoridad de nombres ES↔EN), CLAUDE.md, docs/analytics.md.
>
> _Part of the Law. Index: [LEY.md](./LEY.md)_

Formato de cada entrada: **qué es** (llano) · **valor epistémico** (qué te aclara saberlo) · **valor pragmático** (qué te permite hacer aquí) · **sinónimos** si aplican.

---

## Fundamentos de red y propiedad

### 1. Web3

**Qué es.** La capa de internet donde la propiedad y la identidad se verifican con criptografía en redes abiertas, en lugar de depender de una empresa que guarda tu cuenta.
**Valor epistémico.** Distingue entre _usar_ un servicio y _poseer_ algo dentro de él — la diferencia que estructura todo Numinia.
**Valor pragmático.** Explica por qué un asset o un rango pueden ser tuyos de verdad: portables, verificables, no confiscables por el proveedor.
**Sinónimos:** internet descentralizada, internet de la propiedad.

### 2. Blockchain

**Qué es.** Un registro compartido y ordenado que muchas máquinas mantienen a la vez, donde lo escrito no puede alterarse sin que se note.
**Valor epistémico.** Resuelve "¿quién garantiza esto si no hay autoridad central?": la garantía es matemática y colectiva, no institucional.
**Valor pragmático.** Es donde vivirán las pruebas de propiedad de la Fase 4 (loot, sellos); hoy explica el destino, no el presente.
**Sinónimos:** cadena de bloques, registro distribuido (DLT).

### 3. Wallet

**Qué es.** El llavero criptográfico de una persona: un par de claves con el que firma, demuestra identidad y custodia lo suyo. No "contiene" dinero: contiene la capacidad de demostrar.
**Valor epistémico.** Separa identidad de cuenta: la cuenta te la da (y quita) un servicio; la wallet es tuya aunque el servicio desaparezca.
**Valor pragmático.** Es la puerta del L.A.P.: probar que posees una dirección es todo lo que Numinia pide para reconocerte.
**Sinónimos:** cartera digital, monedero.

### 4. NFT

**Qué es.** Un apunte en blockchain que señala a un objeto digital y dice "esta unidad concreta pertenece a esta wallet".
**Valor epistémico.** Aclara que lo escaso no es el archivo (copiable) sino el _título de propiedad_ sobre él.
**Valor pragmático.** El mecanismo previsto para que el loot y las recompensas de temporada sean posesiones reales de los ciudadanos.
**Sinónimos:** token no fungible.

### 5. Licencia abierta (CC0)

**Qué es.** Una declaración legal que regala una obra al mundo: CC0 renuncia a todos los derechos posibles y la deja en dominio público.
**Valor epistémico.** Resuelve "¿puedo usar esto?" con un sí rotundo y sin letra pequeña — la incertidumbre legal es el mayor freno invisible a la creación.
**Valor pragmático.** Todo el catálogo público de Numinia es CC0: descárgalo, remézclalo, véndelo si quieres. _Remix_ es un pilar de la casa.
**Sinónimos:** dominio público, sin derechos reservados.

### 6. Soberanía digital

**Qué es.** La capacidad de una persona de controlar su identidad, sus datos y sus bienes digitales sin pedir permiso a un intermediario.
**Valor epistémico.** Da nombre al problema que Web3 intenta resolver y al criterio con que Numinia evalúa cada feature: ¿esto empodera o crea dependencia?
**Valor pragmático.** Justifica decisiones concretas de la plataforma: ficha exportable, sellos que se llevan puestos, sesiones que emitimos nosotros y no un vendor.
**Sinónimos:** autonomía digital, self-sovereignty.

### 7. Brecha digital

**Qué es.** La distancia entre quienes pueden usar la tecnología con soltura y quienes quedan fuera — por acceso, habilidades o diseño hostil.
**Valor epistémico.** Explica la misión-puente de Numinia: no es una dapp para conversos, es una escalera desde Web2.
**Valor pragmático.** Obliga a que todo funcione sin wallet, sin JavaScript y sin saber qué es una blockchain: el nivel de entrada siempre es humano.
**Sinónimos:** exclusión digital.

### 8. Identidad progresiva

**Qué es.** Un modelo de acceso donde cada persona entra por donde puede — invitado, correo, red social, passkey o wallet — y sube de nivel de soberanía cuando quiere.
**Valor epistémico.** Deshace la falsa dicotomía "Web2 o Web3": son escalones del mismo camino.
**Valor pragmático.** Es el diseño del login de Numinia (ADR-006): Google o email para empezar, tu propia wallet cuando estés listo.
**Sinónimos:** onboarding progresivo, auth Web2→Web3.

## Datos y permanencia

### 9. File Over App

**Qué es.** El principio de que los datos deben vivir en archivos legibles y portables, no encerrados dentro de una aplicación que puede morir o cambiar de dueño.
**Valor epistémico.** Invierte la pregunta habitual: no "¿qué app uso?" sino "¿de quién es el archivo cuando la app desaparezca?".
**Valor pragmático.** Rige la arquitectura entera: catálogo en JSON, ficha de personaje en Markdown, estado en git — todo sobrevive a la plataforma.
**Sinónimos:** datos primero, formatos portables.

### 10. Datos con dignidad

**Qué es.** La postura de que los datos de una persona merecen el mismo trato que su propiedad: consentimiento, portabilidad y mínima captura.
**Valor epistémico.** Distingue _propiedad digital_ de _alquiler digital_ — la frase-semilla de la casa: "digital ownership, not digital rental".
**Valor pragmático.** Se traduce en reglas duras: analytics sin PII, telemetría sin identidad, nada personal en servidor sin que el ciudadano lo pida.
**Sinónimos:** dignidad de datos, data dignity.

### 11. Descentralización

**Qué es.** Repartir una función — almacenar, decidir, verificar — entre muchos participantes para que ningún punto único pueda fallar, censurar o capturar el sistema.
**Valor epistémico.** Es un espectro, no un interruptor: ayuda a preguntar _qué_ está descentralizado y _cuánto_, en vez de creer etiquetas.
**Valor pragmático.** Marca la hoja de ruta de Fase 4: del CDN cómodo al almacenamiento permanente, cada paso elimina un punto único.
**Sinónimos:** distribución, resistencia a censura.

### 12. Almacenamiento permanente

**Qué es.** Guardar archivos en redes diseñadas para que duren décadas sin que nadie pague el servidor cada mes — Arweave los escribe una vez para siempre; IPFS los direcciona por contenido, no por ubicación.
**Valor epistémico.** Resuelve "¿y si la empresa cierra?": la permanencia deja de depender de una factura mensual.
**Valor pragmático.** Es la capa final de la cadena de almacenamiento de los assets (Arweave → R2 → IPFS → GitHub): lo que Numinia publica no debe poder desaparecer.
**Sinónimos:** permaweb, almacenamiento descentralizado.

### 13. Interoperabilidad

**Qué es.** Que las cosas funcionen fuera del lugar donde nacieron: un avatar que sirve en muchos mundos, un archivo que abre cualquier herramienta.
**Valor epistémico.** Revela el coste oculto del formato propietario: cada silo es una frontera para tus bienes.
**Valor pragmático.** Por eso Numinia publica en formatos abiertos (VRM, glTF, Markdown, JSON): sus bienes viajan.
**Sinónimos:** portabilidad, estándares abiertos.

### 14. Código abierto

**Qué es.** Software cuyo código puede leerse, usarse, modificarse y redistribuirse — la confianza se audita, no se promete.
**Valor epistémico.** Explica de qué está hecha Numinia (Astro, Three.js, Geist, Phosphor…) y por qué eso importa: sin cajas negras en los cimientos.
**Valor pragmático.** Permite el pilar _Remix_: cópialo y hazlo mejor. Y obliga: nuestro gate de licencias vigila lo que entra.
**Sinónimos:** open source, software libre (matices distintos, espíritu común).

## Agentes y aprendizaje

### 15. Agente digital

**Qué es.** Un sistema de software — hoy, típicamente una IA — que percibe, decide y actúa para cumplir encargos con autonomía real.
**Valor epistémico.** Cambia la pregunta "¿qué herramienta uso?" por "¿con quién trabajo?": el agente es colaborador, no comando.
**Valor pragmático.** Numinia se construye así: agentes digitales con misiones, gates que verifican su trabajo y una Ley que ambos obedecen.
**Sinónimos:** agente de IA, agente autónomo.

### 16. Agente biológico

**Qué es.** Una persona, nombrada con el mismo sustantivo que sus colegas digitales — deliberadamente: en este sistema ambos reciben misiones, criterios de aceptación y responsabilidad.
**Valor epistémico.** El nombre iguala el marco de trabajo sin igualar la naturaleza: mismas reglas de colaboración, distinta autoridad (las decisiones son humanas).
**Valor pragmático.** Permite escribir procesos una sola vez — misiones, Gherkin, la Ley — válidos para cualquier mezcla de equipo.
**Sinónimos:** humano (en contexto de misiones); relacionado: agente híbrido (equipo mixto).

### 17. Gamificación

**Qué es.** Usar las estructuras que hacen funcionar a los juegos — metas claras, progreso visible, recompensa, narrativa — en actividades que no son juegos.
**Valor epistémico.** Bien entendida no es "poner puntos": es diseño de motivación. Mal entendida, es manipulación con confeti.
**Valor pragmático.** Es el campo de la facción prototipo de Numinia y el método del producto: la ciudad entera es una capa de juego sobre el aprender y el crear.
**Sinónimos:** ludificación; relacionado: diseño de motivación (Octalysis).

### 18. Aprendizaje lúdico

**Qué es.** La idea de que los humanos aprenden jugando — no como truco pedagógico, sino porque el juego es la forma natural de explorar lo desconocido sin miedo al error.
**Valor epistémico.** Reordena prioridades: primero la experiencia que invita a explorar, después el contenido.
**Valor pragmático.** Es el pilar _Learn_ de la casa y la razón de las aventuras, los acertijos y la herencia de las aventuras gráficas en el diseño.
**Sinónimos:** aprender jugando, edutainment (peyorativo a evitar).

### 19. Pensamiento sistémico

**Qué es.** Mirar las cosas como sistemas: piezas que se afectan entre sí en bucles, donde la estructura explica el comportamiento mejor que las intenciones.
**Valor epistémico.** Enseña a buscar la causa en las relaciones y no en los culpables — un fallo repetido es una estructura, no un descuido.
**Valor pragmático.** Es el marco de la Ley del proyecto: cada documento declara qué observa, qué regula y a qué se acopla.
**Sinónimos:** systems thinking, visión sistémica.

### 20. Inferencia activa

**Qué es.** Una teoría del cerebro (Friston) según la cual todo organismo sobrevive minimizando la sorpresa: percibe para actualizar su modelo del mundo y actúa para que el mundo se parezca a lo que espera.
**Valor epistémico.** Da un lenguaje común a percepción, acción y aprendizaje — y a por qué los buenos sistemas mantienen sus mapas al día.
**Valor pragmático.** Inspira dos reglas de la casa: los documentos existen para alinear el modelo del mundo (valor epistémico) con la acción (valor pragmático), y el diseño minimiza la sorpresa donde el usuario actúa.
**Sinónimos:** active inference, principio de energía libre (el marco matemático).

## Mundos y cuerpos digitales

### 21. Realidad virtual (VR)

**Qué es.** Tecnología que sustituye por completo tu entorno visual y sonoro por uno digital, normalmente con un visor.
**Valor epistémico.** Marca el extremo inmersivo del espectro: presencia total, mundo totalmente construido.
**Valor pragmático.** El horizonte de la Fase 5: los mundos de Numinia visitables con visor, no solo con pantalla.
**Sinónimos:** realidad inmersiva.

### 22. Realidad extendida (XR)

**Qué es.** El término paraguas para todo el espectro que mezcla lo físico y lo digital: VR (todo digital), AR (digital sobre lo físico) y lo intermedio.
**Valor epistémico.** Evita casarse con un dispositivo: se diseña para el espectro, no para el gadget de moda.
**Valor pragmático.** Por eso Numinia publica mundos en estándares web (WebXR-ready): la misma ciudad debe entrar por navegador, móvil o visor.
**Sinónimos:** realidad mixta (subconjunto), espectro inmersivo.

### 23. Metaverso

**Qué es.** La idea de mundos digitales persistentes y compartidos donde la gente tiene presencia, propiedad y continuidad — más allá del hype, un objetivo de arquitectura: que tus cosas y tu identidad te acompañen entre mundos.
**Valor epistémico.** Separada la palabra del marketing, queda la pregunta útil: ¿qué persiste y qué es tuyo cuando sales?
**Valor pragmático.** Numinia lo practica en pequeño: portales a mundos (oncyber, Hyperfy), avatares portables, identidad que cruza.
**Sinónimos:** mundos virtuales persistentes.

### 24. Avatar

**Qué es.** El cuerpo digital de una persona: la forma que la representa y con la que actúa dentro de un mundo.
**Valor epistémico.** No es decoración: es identidad encarnada — cambia cómo te ven y cómo participas.
**Valor pragmático.** Los avatares del catálogo son CC0 y portables: tu cuerpo digital es tuyo y viaja contigo.
**Sinónimos:** personaje (en contexto de juego), cuerpo digital.

### 25. VRM

**Qué es.** Un formato abierto (estándar japonés sobre glTF) para avatares 3D humanoides: un solo archivo con el modelo, sus huesos y sus permisos de uso, que funciona en cualquier aplicación compatible.
**Valor epistémico.** Es la interoperabilidad hecha formato: demuestra que "un avatar para todos los mundos" es técnica, no promesa.
**Valor pragmático.** El formato de los avatares de Numinia — el visor de la plataforma los renderiza y cualquier mundo compatible los acepta.
**Sinónimos:** relacionado: glTF/GLB (el estándar 3D general del que deriva).

---

_Deliberadamente fuera: los términos del mundo de Numinia (Velo, Umbral, gremios, sellos…) — su casa es el corpus seminal y `docs/glossary.md`. Este glosario crece solo por decisión deliberada y nunca más allá de lo esencial._
