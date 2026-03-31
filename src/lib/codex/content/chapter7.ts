import type { CodexChapter } from '../types';

export const chapter7: CodexChapter = {
  id: 'ch7',
  number: 7,
  title: 'CONSTRUYENDO LA AVENTURA',
  subtitle: 'El latido del tablero',
  epigraph:
    'Una aventura no se escribe; se cultiva. El DJ planta semillas, los jugadores las riegan, y la historia crece en direcciones que nadie podia prever.',
  fragments: [
    {
      id: 'ch7-f1',
      title: 'La Plantilla Modular',
      body: `<h3>Seis fases para construir cualquier aventura</h3>

<p>Toda aventura de Numinia se construye sobre una <strong>Plantilla Modular</strong> de seis fases que funciona como un esqueleto narrativo flexible: lo suficientemente estructurado para dar forma a la sesion, lo suficientemente abierto para adaptarse a las decisiones imprevisibles de los jugadores. Dos de estas fases son <em>obligatorias</em> (la primera y la ultima); las cuatro intermedias son <em>opcionales</em> y pueden combinarse, repetirse o eliminarse segun las necesidades de la historia.</p>

<h3>Fase I: Presentacion (obligatoria, siempre primera)</h3>

<p>La Presentacion es el punto de partida inevitable de toda aventura. En esta fase, el DJ establece el <strong>conflicto semilla</strong>: la situacion, el evento o la anomalia que pondra en marcha la historia. La Presentacion cumple tres funciones criticas: <em>situar</em> (donde estan los personajes, que hora es, que atmosfera domina la escena), <em>motivar</em> (por que deberian los personajes involucrarse, que esta en juego) y <em>abrir</em> (que caminos de accion se vislumbran, que preguntas quedan sin respuesta).</p>

<p>Una buena Presentacion es breve, densa y evocadora. El DJ no necesita explicar todo; necesita encender la curiosidad. Un rumor inquietante escuchado en una taberna, una convocatoria urgente del Consejo, una anomalia de frecuencia detectada por los instrumentos de una Academia, un mensaje cifrado encontrado en el bolsillo de un desconocido: cualquiera de estos puede ser un detonante eficaz. Lo importante es que el detonante <em>implique</em> a los personajes de manera personal, que conecte con sus historias, sus Escuelas, sus preguntas sin respuesta.</p>

<h3>Fase II: Deriva (opcional)</h3>

<p>La Deriva es la fase de exploracion y preparacion, donde los personajes se mueven por el mundo de Numinia siguiendo las pistas, intuiciones e hipotesis que la Presentacion ha generado. La Deriva puede tomar tres formas principales, dependiendo de la naturaleza de la aventura:</p>

<p><strong>Investigacion:</strong> Los personajes recopilan informacion. Interrogan a personajes no jugadores, consultan archivos, examinan escenas, descifran codigos. Es la forma de Deriva mas cerebral y la mas alineada con el sistema de Rumorologia y Piezas del Prisma. Ideal para aventuras de misterio.</p>

<p><strong>Travesia:</strong> Los personajes viajan a traves de la ciudad o de la Periferia, enfrentandose a los peligros y las maravillas del camino. La Travesia pone enfasis en la exploracion geografica, los encuentros con criaturas y los desafios ambientales. Ideal para aventuras de exploracion.</p>

<p><strong>Preparacion:</strong> Los personajes se preparan para un evento futuro: un ritual, una negociacion, un enfrentamiento anticipado. Buscan aliados, consiguen recursos, disenan estrategias, se entrenan. La Preparacion genera tension anticipatoria y permite a los jugadores sentir que sus decisiones logisticas tienen peso. Ideal para aventuras politicas o belicas.</p>

<h3>Fase III: Accion (opcional)</h3>

<p>La Accion es la fase de confrontacion directa, donde las tensiones acumuladas estallan en escenas de alta intensidad. Como la Deriva, la Accion puede tomar diferentes formas:</p>

<p><strong>Ejecucion:</strong> Los personajes llevan a cabo un plan elaborado durante la Deriva. Un golpe, una infiltracion, un ritual complejo, una operacion de rescate. El enfasis esta en la coordinacion del grupo y en como el plan se adapta (o fracasa) al contacto con la realidad.</p>

<p><strong>Enfrentamiento:</strong> Combate directo contra una amenaza. Puede ser fisico (contra criaturas o facciones hostiles), dialectico (un debate publico donde el resultado tiene consecuencias legales) o simbolico (un duelo de frecuencia donde los contrincantes proyectan su voluntad a traves de la energia de Numinia).</p>

<p><strong>Tension:</strong> Una situacion de presion creciente sin salida clara. Los personajes estan atrapados, rodeados, bajo sospecha, contra el reloj. No hay un enemigo definido contra el que luchar; hay una situacion que se deteriora y que requiere ingenio, cooperacion y nervios de acero para resolverse.</p>

<h3>Fase IV: Turbulencia (opcional, rara)</h3>

<p>La Turbulencia es la fase mas inusual de la Plantilla Modular: un momento en que la narrativa se desestabiliza de maneras imprevistas, introduciendo elementos que desafian las reglas habituales del mundo de juego. La Turbulencia no aparece en todas las aventuras; es un ingrediente especial que el DJ reserva para momentos de maxima intensidad narrativa o para campanas que exploran los limites de la realidad de Numinia.</p>

<p><strong>Metarrealidad:</strong> La frontera entre la ficcion del juego y la realidad de los jugadores se vuelve porosa. Los personajes descubren indicios de que su mundo es un constructo, de que alguien los observa, de que las leyes de su realidad son mas arbitrarias de lo que creian. Este tipo de Turbulencia debe manejarse con extrema delicadeza, pero cuando funciona produce momentos de vertigo narrativo inolvidables.</p>

<p><strong>Temporalidad:</strong> El tiempo se comporta de manera anormal. Los personajes reviven escenas pasadas con variaciones, experimentan fragmentos del futuro, o se encuentran en un bucle temporal del que deben escapar. La Tirada de Heterocosmica es especialmente relevante en estas situaciones.</p>

<p><strong>Narcosis:</strong> La percepcion colectiva se altera. Los personajes comparten una alucinacion, un sueno o una vision inducida por la frecuencia, y deben actuar dentro de este espacio onirico siguiendo reglas diferentes a las del mundo normal. Los exitos y fracasos en la Narcosis tienen consecuencias reales cuando los personajes regresan.</p>

<h3>Fase V: Resolucion (semiobligatoria)</h3>

<p>La Resolucion es el momento en que los jugadores <strong>construyen su teoria</strong>. Reunen las piezas del Prisma acumuladas durante la aventura, las combinan en una narrativa coherente que explica el misterio central, y realizan la <strong>Tirada del Prisma</strong> para determinar si su teoria se convierte en la verdad del mundo de juego. La Resolucion es semiobligatoria: esta presente en la mayoria de las aventuras, pero puede omitirse en sesiones puramente orientadas a la accion o la exploracion que no giran en torno a un misterio.</p>

<p>La dinamica de la Resolucion es unica en el panorama del juego de rol: los jugadores no descubren la verdad; la <em>construyen</em>. Esto significa que dos grupos diferentes, jugando la misma aventura con las mismas piezas del Prisma, pueden llegar a verdades completamente distintas. La Tirada del Prisma no determina si la teoria es "correcta" en un sentido absoluto; determina si el mundo de Numinia la acepta como verdadera, con todas las consecuencias narrativas que ello implica.</p>

<h3>Fase VI: Cierre (obligatoria, siempre ultima)</h3>

<p>El Cierre es la fase final de toda aventura, el momento de <strong>volver a la fuente</strong>: regresar al punto de partida narrativo y evaluar como ha cambiado. Los personajes regresan a su distrito, a su Academia, a su hogar, y descubren que el mundo (y ellos mismos) ya no son exactamente los mismos que al principio de la aventura.</p>

<p>El Cierre incluye un mecanismo especifico: la <strong>Balanza</strong>, un debate estructurado entre los jugadores (en personaje) donde evaluan las consecuencias de sus acciones. Fue la decision correcta? Que se gano? Que se perdio? Que harian diferente? La Balanza no tiene tirada de dados; es pura narrativa, pura reflexion, puro roleplay. Pero sus conclusiones se registran y tienen efectos en futuras sesiones: las consecuencias de una aventura se convierten en las semillas de la siguiente.</p>`
    },
    {
      id: 'ch7-f2',
      title: 'Notas para el DJ',
      body: `<h3>Diez principios para dirigir Numinia</h3>

<p>Dirigir una partida de Numinia es un acto de <strong>escucha creativa</strong>. El DJ no es un autor que ejecuta un guion, ni un arbitro que aplica reglas, ni un adversario que intenta derrotar a los jugadores. Es un <em>facilitador de historias</em>, un catalizador que combina los ingredientes que aportan todos los participantes para producir algo que ninguno de ellos podria haber creado por separado. Los siguientes diez principios son la brujula del DJ de Numinia:</p>

<p><strong>1. Haz preguntas, no suposiciones.</strong> Nunca asumas que sabes lo que los jugadores piensan, sienten o quieren hacer. Pregunta. <em>"Que observa tu personaje al entrar en la sala?"</em>, <em>"Como te sientes despues de lo que ha dicho el Consejero?"</em>, <em>"Tu personaje confia en ella?"</em>. Las preguntas generan contenido narrativo, profundizan los personajes y mantienen a los jugadores comprometidos con la ficcion.</p>

<p><strong>2. Deja huecos.</strong> No llenes cada segundo de silencio, cada rincon de la escena, cada detalle del mundo. Los huecos son espacios de posibilidad: invitaciones para que los jugadores los llenen con su imaginacion. Un mapa con zonas en blanco es mas interesante que un mapa completo. Una historia con preguntas sin respuesta es mas fascinante que una historia donde todo esta explicado.</p>

<p><strong>3. Dale vida a todo.</strong> En Numinia, nada es decorado. Cada personaje no jugador tiene una historia, una motivacion, un deseo. Cada lugar tiene una atmosfera, un sonido, un olor. Cada objeto tiene una textura, un peso, una historia. No necesitas preparar todo esto con antelacion; necesitas estar dispuesto a improvisarlo cuando los jugadores presten atencion a algo que no esperabas.</p>

<p><strong>4. Juega para descubrir.</strong> No planifiques el final de la sesion. Planifica la situacion inicial, los personajes no jugadores, los conflictos latentes y las piezas del Prisma disponibles. Despues, deja que la historia se desarrolle organicamente. Si sabes desde el principio como va a terminar la aventura, no estas jugando a Numinia; estas escribiendo una novela con publico.</p>

<p><strong>5. Convierte los fracasos en oportunidades.</strong> Cuando un jugador falla una tirada, no lo castigues; transformalo. Un fallo no es un callejon sin salida; es una bifurcacion inesperada. <em>"No consigues abrir la cerradura, pero al forzarla activas un mecanismo oculto que revela un pasadizo secreto."</em> Los mejores momentos de una partida de Numinia nacen de los fracasos, no de los exitos.</p>

<p><strong>6. Haz que el mundo reaccione.</strong> Numinia no es un escenario estatico que espera a que los jugadores actuen. Es un organismo vivo que responde a lo que ocurre en el. Si los personajes salvan un barrio, la gente los reconoce en la calle. Si ignoran una amenaza, sus consecuencias se manifiestan en sesiones posteriores. Si descubren un secreto, alguien se entera de que lo saben. La ciudad tiene memoria.</p>

<p><strong>7. Piensa en escenas, no en encuentros.</strong> No planifiques combates ni puzzles; planifica <em>escenas</em>: momentos dramaticos con un escenario, unos personajes y una tension. Una escena puede resolverse con combate, con dialogo, con investigacion, con huida o con cualquier otra accion que los jugadores imaginen. La funcion del DJ es crear la situacion; la funcion de los jugadores es decidir como responder a ella.</p>

<p><strong>8. Se un fan de los personajes.</strong> Los Khepris de los jugadores son los protagonistas de la historia. Quieres que tengan exito, que brillen, que se enfrenten a desafios a la altura de sus capacidades. Esto no significa hacerles la vida facil; significa hacerles la vida <em>interesante</em>. Los mejores adversarios son los que obligan a los protagonistas a dar lo mejor de si mismos.</p>

<p><strong>9. Trae lo extrano a lo cotidiano.</strong> La magia de Numinia no esta en las batallas epicas ni en las revelaciones cosmicas (aunque tambien). Esta en los momentos en que lo extraordinario irrumpe en lo ordinario: un gato callejero que habla en frecuencias que solo un Khepri puede oir, un reloj publico que marca una hora que no existe, una carta de amor encontrada en un archivo clasificado. Lo extrano cotidiano es la firma estetica de Numinia.</p>

<p><strong>10. Valora todas las contribuciones.</strong> Cada jugador aporta algo unico a la mesa: creatividad, humor, emocion, logica, osadia. El DJ debe asegurarse de que todas las voces sean escuchadas y todas las contribuciones sean integradas. Si un jugador introvertido tiene una idea brillante pero no se atreve a proponerla, creale el espacio. Si un jugador entusiasta domina la conversacion, redirige la atencion. La mesa de Numinia es una democracia creativa.</p>

<h3>Estructura de una sesion: tiempos recomendados</h3>

<p>Aunque cada sesion es diferente, una estructura temporal orientativa para una sesion de tres horas podria ser:</p>

<ul>
<li><strong>Gancho (15 minutos):</strong> Recapitulacion breve de la sesion anterior, ambientacion de la escena inicial y presentacion del detonante de la aventura. El Gancho debe ser rapido e impactante: una imagen, una frase, un sonido que capture la atencion de todos y los sumerja inmediatamente en la ficcion.</li>
<li><strong>Investigacion (60-90 minutos):</strong> El bloque mas extenso de la sesion, dedicado a la exploracion, la recopilacion de pistas, la interaccion con personajes no jugadores y la acumulacion de Piezas del Prisma. Este bloque admite pausas naturales, cambios de escena y momentos de planificacion grupal.</li>
<li><strong>Revelacion (30 minutos):</strong> El momento en que las piezas empiezan a encajar. Los jugadores comparten sus hallazgos, cruzan informacion y formulan teorias. Este bloque es intensamente dialogico y puede ser el mas satisfactorio intelectualmente de toda la sesion.</li>
<li><strong>Climax (45-60 minutos):</strong> La fase de accion: enfrentamiento, ritual, negociacion, carrera contrarreloj o cualquier otra forma de conflicto dramatico donde las decisiones se materializan y las consecuencias se hacen irreversibles.</li>
<li><strong>Consecuencias (15-30 minutos):</strong> El Cierre: reflexion sobre lo ocurrido, actualizacion del estado del mundo, avance de tramas personales y colectivas. El DJ hace preguntas, los jugadores responden, y las semillas de la proxima sesion se plantan en el terreno fertil de lo que acaba de ocurrir.</li>
</ul>

<blockquote>El DJ de Numinia no controla la historia. La cuida. Como un jardinero que planta, riega, poda y observa, sabiendo que el jardin siempre crecera de maneras que no puede anticipar por completo.</blockquote>`
    },
    {
      id: 'ch7-f3',
      title: 'El Espejo Roto',
      body: `<h3>Una aventura completa para Numinia</h3>

<p><em>El Espejo Roto</em> es una aventura disenada para un grupo de 3-5 Khepris de cualquier Escuela Ontologica, jugable en una o dos sesiones. Combina investigacion, puzzle, combate y debate, y puede servir como primera aventura de una campana o como sesion autoconclusiva. A continuacion se presenta su estructura completa, siguiendo la Plantilla Modular.</p>

<h3>Escena 1: Consejo Dividido (Fase I: Presentacion)</h3>

<p>Los personajes son convocados a una sesion extraordinaria del <strong>Consejo de Concordia</strong> en la Gran Sala de la Plaza del Agora. Al llegar, encuentran un ambiente tenso: los ocho miembros del Consejo estan divididos en cuatro posiciones irreconciliables respecto a un asunto urgente.</p>

<p>Hace tres dias, durante una rutina de mantenimiento en el Nivel Delta, un equipo de tecnicos de la Legion del Umbral descubrio un artefacto de la civilizacion de la Plenitud que habia permanecido oculto durante siglos: un <strong>espejo</strong> de dos metros de altura, enmarcado en un metal desconocido con inscripciones en un lenguaje que nadie ha podido descifrar. El espejo no refleja la realidad: muestra <em>otra version</em> de Numinia, una ciudad similar pero diferente, donde los edificios tienen otra disposicion, los colores son mas saturados y figuras borrosas se mueven al otro lado del cristal.</p>

<p>Las cuatro facciones del Consejo son:</p>

<ul>
<li><strong>Faccion de la Custodia</strong> (2 consejeros del Vitruviano): Proponen sellar el espejo en una boveda de maxima seguridad y estudiarlo lentamente, durante decadas si es necesario, antes de tomar cualquier decision. Creen que los artefactos de la Plenitud son demasiado peligrosos para manejarlos con prisa.</li>
<li><strong>Faccion de la Apertura</strong> (2 consejeros del Sicomoro): Proponen investigar el espejo activamente, intentar comunicarse con lo que sea que hay al otro lado y, eventualmente, cruzar. Creen que el miedo al conocimiento es mas peligroso que el conocimiento mismo.</li>
<li><strong>Faccion de la Destruccion</strong> (2 consejeros de Salomon): Proponen destruir el espejo de inmediato. Argumentan que la Plenitud cayo por jugar con fuerzas que no comprendia, y que Numinia no debe repetir ese error.</li>
<li><strong>Faccion de la Negociacion</strong> (2 consejeros de Ouroboros): Proponen contactar con las entidades del otro lado del espejo e intentar establecer algun tipo de comercio o intercambio. Donde otros ven peligro, ellos ven oportunidad.</li>
</ul>

<p>El Consejo no puede alcanzar la mayoria cualificada de seis votos necesaria para ninguna decision, asi que recurre a los Khepris: les pide que bajen al Nivel Delta, examinen el espejo, investiguen su naturaleza y vuelvan con una recomendacion informada. Se les advierte de que el equipo de tecnicos que descubrio el espejo ha reportado fenomenos extranos desde entonces: suenos compartidos, perdidas de memoria, sensaciones de ser observados.</p>

<h3>Escena 2: El Corredor de Mobius (Fase II: Deriva + Fase III: Accion)</h3>

<p>El camino hacia el espejo atraviesa una seccion del Nivel Delta conocida como el <strong>Corredor de Mobius</strong>, un pasaje subterraneo de la era de la Plenitud cuya geometria desafia la logica euclidiana: el corredor parece ser un anillo sin fin, donde caminar en linea recta te devuelve al punto de partida, y donde las direcciones se invierten sin previo aviso.</p>

<p><strong>Puzzle de las pinturas anomalas:</strong> Las paredes del Corredor estan cubiertas de pinturas murales que representan escenas de la vida en la Plenitud. Pero las pinturas estan <em>vivas</em>: las figuras se mueven lentamente, los paisajes cambian con el paso del tiempo, y si un personaje toca una pintura, puede percibir fragmentos sensoriales de la escena representada (sonidos, olores, emociones). La clave para avanzar por el Corredor es identificar las pinturas que estan <em>invertidas</em> (escenas que muestran un reflejo espejado de la realidad) y tocarlas en el orden correcto, lo que abre pasajes ocultos que permiten progresar.</p>

<p>Mientras los personajes resuelven el puzzle, se encuentran con dos tipos de amenazas:</p>

<p><strong>Esfinges de Frecuencia:</strong> Guardianes automaticos de la era de la Plenitud, reactivados por la energia del espejo. Tienen forma de leones alados con rostros humanos tallados en cristal de frecuencia. No atacan fisicamente; plantean acertijos. Si el personaje responde correctamente, la Esfinge se desactiva y se convierte en una pieza del Prisma (la informacion contenida en el acertijo revela algo sobre la naturaleza del espejo). Si responde incorrectamente, la Esfinge emite un pulso de frecuencia que causa dano epistemico: el personaje olvida temporalmente un dato importante.</p>

<p><strong>Umbrilegos:</strong> La presencia del espejo ha generado una concentracion inusual de Umbrilegos en el Corredor, parasitos simbolicos que se alimentan de los significados rotos por la distorsion del espejo. Los Umbrilegos no son una amenaza directa en combate, pero erosionan la coherencia narrativa del grupo: si no se les contiene, los personajes empezaran a confundir sus recuerdos, a contradecirse y a perder el hilo de su investigacion.</p>

<p><strong>El Reloj de Distorsion:</strong> A medida que los personajes avanzan por el Corredor, la influencia del espejo se intensifica. El DJ utiliza un <strong>Reloj de Distorsion</strong> de seis segmentos. Cada vez que el grupo falla una tirada, pierde tiempo o se detiene demasiado, se rellena un segmento. Cuando el Reloj se completa, la distorsion alcanza un nivel critico: las paredes del Corredor se vuelven transparentes, revelando la version alternativa de Numinia al otro lado, y los personajes empiezan a ver versiones alternativas de si mismos caminando en la direccion opuesta.</p>

<h3>Escena 3: El Deposito Secreto (Fase IV: Turbulencia + Fase V: Resolucion)</h3>

<p>Al final del Corredor, los personajes llegan al <strong>Deposito Secreto</strong>, la camara donde se encuentra el espejo. Pero al cruzar el umbral, descubren que <em>estan dentro del espejo</em>. No recuerdan haber cruzado; simplemente, en algun punto del Corredor, la realidad y el reflejo se intercambiaron sin que lo notaran.</p>

<p>El interior del espejo es una version distorsionada del Deposito: las mismas paredes, el mismo suelo, pero todo ligeramente <em>incorrecto</em>. Los colores son demasiado vivos, los angulos son demasiado agudos, los sonidos llegan con un leve retraso. Y en el centro de la camara, donde deberia estar el espejo, hay una <strong>brecha</strong>: una grieta en el tejido de la realidad a traves de la cual se puede ver el Deposito real, al otro lado.</p>

<p>La brecha se esta expandiendo. Si no se repara, la distincion entre la realidad y el reflejo se colapsara, y ambas versiones de Numinia se fusionaran de maneras impredecibles y potencialmente catastroficas.</p>

<p><strong>Mecanismo de reparacion:</strong> Para cerrar la brecha, los personajes deben pronunciar <strong>triadas de palabras</strong> que representen conceptos complementarios: tres palabras cuyo significado combinado forme una verdad coherente. Cada triada exitosa sella una porcion de la brecha. Las triadas deben ser inventadas por los jugadores en el momento, y el DJ evalua su validez segun la coherencia y la profundidad del concepto expresado. Por ejemplo: <em>"Memoria, Cambio, Puente"</em> (el recuerdo conecta lo que fue con lo que sera) o <em>"Fractura, Luz, Musica"</em> (a traves de las grietas entra lo que transforma). Se necesitan al menos cinco triadas para sellar la brecha por completo.</p>

<p>Mientras los personajes trabajan en las triadas, la brecha reacciona: cada cierre parcial provoca una fluctuacion de frecuencia que manifiesta visiones del pasado de Numinia, revelaciones sobre la naturaleza del espejo (es un dispositivo de comunicacion de la Plenitud, disenado para conectar versiones paralelas de la realidad) y fragmentos de informacion que los jugadores pueden utilizar como Piezas del Prisma para construir su teoria.</p>

<h3>Epilogo: Consejo Final (Fase VI: Cierre)</h3>

<p>De vuelta en la superficie, los personajes son recibidos de nuevo por el Consejo de Concordia. Deben presentar su informe y su recomendacion. Pero aqui es donde la aventura se eleva de lo mecanico a lo filosofico: la decision de que hacer con el espejo no es un problema con solucion correcta. Es un <strong>dilema genuino</strong> que los jugadores deben debatir entre si y luego defender ante el Consejo.</p>

<p><strong>La Balanza del Consejo:</strong> El mecanismo de resolucion del epilogo es un debate estructurado. Cada jugador dispone de tres minutos para exponer su posicion ante el Consejo (en personaje). Los demas jugadores y el DJ, interpretando a los consejeros, pueden hacer preguntas. Despues de todas las exposiciones, se celebra una votacion: los ocho consejeros del Consejo votan influidos por los argumentos de los Khepris, y el DJ asigna los votos segun la calidad y la coherencia de las intervenciones de los jugadores.</p>

<p>Los resultados posibles son:</p>

<ul>
<li><strong>Consenso (6+ votos en la misma direccion):</strong> El Consejo adopta la recomendacion de los Khepris. La decision se implementa y sus consecuencias se desarrollaran en futuras sesiones. Los personajes ganan prestigio y la confianza del Consejo.</li>
<li><strong>Mayoria simple (5 votos):</strong> La decision se adopta pero con oposicion significativa. La faccion perdedora no acepta el resultado de buen grado y puede convertirse en un antagonista recurrente en la campana.</li>
<li><strong>Empate (4-4):</strong> La discordia se instala en el Consejo. No se toma ninguna decision, y el espejo permanece en un limbo juridico. La situacion se deteriora lentamente mientras las facciones maniobran para imponer su voluntad por medios extraoficiales. Es el peor resultado para la estabilidad de Numinia, pero quiza el mas interesante narrativamente.</li>
</ul>

<p>Independientemente del resultado, la aventura termina con una escena breve pero significativa: cada personaje, de vuelta en su espacio privado, se mira en un espejo ordinario. El DJ pregunta a cada jugador: <em>"Que ve tu personaje en el espejo esta noche?"</em>. La respuesta revela como la experiencia ha cambiado al personaje, y planta la semilla para la siguiente aventura.</p>

<blockquote>El Espejo Roto no es una aventura sobre un artefacto peligroso. Es una aventura sobre la naturaleza de la realidad, la responsabilidad del conocimiento y el precio de las decisiones colectivas. El espejo es solo el pretexto. La verdadera historia es lo que los jugadores eligen hacer con lo que descubren.</blockquote>`
    }
  ]
};
