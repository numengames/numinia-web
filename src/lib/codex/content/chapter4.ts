import type { CodexChapter } from '../types';

export const chapter4: CodexChapter = {
  id: 'ch4',
  number: 4,
  title: 'SISTEMA DE JUEGO',
  subtitle: 'La estructura invisible',
  epigraph:
    'Las reglas no son cadenas: son ritmos. El mejor sistema de juego es aquel que desaparece mientras juegas, como la gramatica desaparece cuando hablas con fluidez.',
  fragments: [
    {
      id: 'ch4-f1',
      title: 'Los Antecedentes',
      body: `<h3>El Sistema Numen: donde la narrativa y el misterio convergen</h3>

<p>Numinia no nace de la nada ludica. Su sistema de juego, bautizado como <strong>Sistema Numen</strong>, es el resultado de una sintesis deliberada entre dos tradiciones del rol narrativo que, aunque comparten valores, rara vez se han fusionado en un mismo motor mecanico: el <em>Powered by the Apocalypse</em> (PbtA) y el <em>Carved from Brindlewood</em> (CfB). A estos pilares se anade un tercer elemento propio: el sistema de resolucion basado exclusivamente en dados de seis caras (D6), que otorga al juego una identidad mecanica singular.</p>

<p>Del <strong>PbtA</strong>, Numinia hereda tres principios fundamentales que atraviesan toda la experiencia de juego:</p>

<ul>
<li><strong>La libertad narrativa como eje:</strong> Los jugadores no estan limitados a un menu cerrado de acciones. Describen lo que sus personajes intentan hacer, y el sistema determina las consecuencias. Las mecanicas existen para dar forma al drama, no para restringirlo.</li>
<li><strong>El fracaso como motor narrativo:</strong> En Numinia, fallar una tirada no significa que la historia se detiene; significa que la historia se complica de maneras inesperadas. Cada fallo es una invitacion al DJ para introducir giros, complicaciones y revelaciones que enriquecen la trama. Los fracasos son, paradojicamente, los momentos mas fertiles de la partida.</li>
<li><strong>El DJ reacciona, no dicta:</strong> La funcion del Director de Juego no es ejecutar un guion preescrito, sino responder a las acciones de los jugadores con principios claros. El DJ tiene sus propios <em>movimientos</em>, herramientas narrativas que utiliza en respuesta a lo que ocurre en la mesa: revelar una verdad incomoda, separar al grupo, poner a alguien en peligro, ofrecer una oportunidad con coste.</li>
</ul>

<p>Del <strong>Carved from Brindlewood</strong>, Numinia toma una innovacion que transforma la naturaleza misma de la investigacion en el juego de rol:</p>

<ul>
<li><strong>La historia avanza por escenas, no por pistas:</strong> En los juegos de misterio tradicionales, el DJ sabe quien es el culpable y los jugadores deben descubrirlo. En Numinia, el misterio es <em>emergente</em>. El DJ prepara escenas, ambientes, personajes y fragmentos de informacion, pero la solucion del enigma no esta predeterminada. Son los jugadores quienes, al interpretar las pistas, construyen la teoria que resuelve el caso.</li>
<li><strong>Los jugadores interpretan las pistas:</strong> Cuando los personajes investigan, obtienen <em>piezas del Prisma</em>, fragmentos de informacion que pueden encajar de multiples maneras. La responsabilidad de dar sentido a estas piezas recae en los jugadores, no en el DJ. Esto genera un tipo de juego intensamente colaborativo y cerebral, donde la conversacion entre jugadores es tan importante como las tiradas de dados.</li>
<li><strong>El misterio es emergente:</strong> La verdad no existe hasta que los jugadores la construyen. Cuando un jugador propone una teoria y realiza la <em>Tirada del Prisma</em>, el resultado de los dados determina si esa teoria se convierte en la realidad del mundo de juego. Este mecanismo es revolucionario porque convierte la investigacion en un acto creativo compartido.</li>
</ul>

<h3>La sintesis: el D6 como lenguaje comun</h3>

<p>El tercer pilar del Sistema Numen es su sistema de dados, que utiliza exclusivamente D6 con una logica propia. En cada tirada, el jugador lanza un numero variable de dados de seis caras determinado por la caracteristica relevante del personaje. Cada dado que muestra un <strong>6</strong> cuenta como un exito; cada dado que muestra un <strong>1</strong> cuenta como un fallo. Los resultados intermedios (2, 3, 4, 5) son neutros. Esta mecanica genera una curva de probabilidad elegante donde los exitos extraordinarios y los fracasos catastroficos son posibles pero infrecuentes, y donde el resultado mas comun es un exito parcial o un fallo menor que mantiene la tension narrativa sin detener la historia.</p>

<p>La combinacion de estos tres pilares produce un sistema que es, al mismo tiempo, riguroso y flexible, mecanico y poetico, predecible en su estructura e impredecible en sus resultados. El Sistema Numen no busca simular la realidad fisica; busca simular la <strong>logica narrativa</strong>, esa sensacion de que cada accion tiene consecuencias, cada decision importa y cada momento de la historia esta conectado con todos los demas.</p>`
    },
    {
      id: 'ch4-f2',
      title: 'Estructura en fases',
      body: `<h3>Las cinco fases de una sesion de Numinia</h3>

<p>Cada sesion de Numinia sigue una estructura de cinco fases que funciona como una columna vertebral narrativa. Estas fases no son rigidas ni cronometradas; son mas bien estaciones de un viaje que el DJ y los jugadores recorren juntos, adaptando la duracion y la intensidad de cada una segun las necesidades de la historia. Lo importante es que las cinco fases esten presentes en toda sesion completa, aunque su peso relativo pueda variar enormemente.</p>

<h3>Fase I: Presentacion</h3>

<p>La primera fase es responsabilidad principal del DJ. En ella, el Director de Juego expone el <strong>conflicto semilla</strong> de la sesion: un evento, un rumor, un encargo, una anomalia, una llamada de auxilio o cualquier otro detonante que ponga en marcha la accion. La Presentacion debe cumplir tres funciones simultaneas: situar a los personajes en el espacio y el tiempo (<em>"Estais en la Plaza del Agora, es medianoche, y las farolas parpadean en un patron que nunca habeis visto"</em>), establecer las apuestas (<em>"Si no encontrais la fuente de la perturbacion antes del amanecer, el Consejo cerrara el Distrito"</em>) y ofrecer al menos dos caminos posibles de accion (<em>"Podeis investigar las catacumbas o interrogar al relojero del turno de noche"</em>).</p>

<p>La Presentacion es breve pero densa. Un DJ experimentado puede establecer todo lo necesario en cinco o diez minutos. La clave esta en la <strong>economia de detalles</strong>: no hace falta describir todo, solo los elementos que importan para la historia y los que estimulan la imaginacion de los jugadores.</p>

<h3>Fase II: Deliberacion</h3>

<p>En la segunda fase, los jugadores toman el control. La Deliberacion es un espacio de conversacion <em>en personaje</em> donde los Khepris discuten lo que saben, comparten sus sospechas, formulan hipotesis y trazan un plan de accion. Esta fase es crucial en Numinia porque el juego valora la inteligencia colectiva sobre la accion individual. Un grupo que delibera bien, que escucha todas las voces y considera multiples perspectivas, tendra mas probabilidades de exito en las fases siguientes.</p>

<p>El DJ, durante la Deliberacion, escucha atentamente. No interviene para corregir ni para guiar, pero si puede responder preguntas sobre el entorno y ofrecer detalles adicionales cuando los jugadores los soliciten. Es tambien un momento excelente para que el DJ tome nota de las teorias que los jugadores estan construyendo, ya que estas teorias alimentaran la logica emergente del misterio.</p>

<h3>Fase III: Investigacion</h3>

<p>La tercera fase es el corazon mecanico de muchas sesiones de Numinia. En la Investigacion, los personajes exploran la ciudad, interrogan a personajes no jugadores, consultan archivos, examinan escenas, descifran codigos y, en general, buscan las <strong>piezas del Prisma</strong> que necesitan para construir su teoria del caso. Cada pieza del Prisma es un fragmento de informacion, una pista, una revelacion parcial que los jugadores recopilan y que, combinada con otras piezas, forma un mosaico de significado.</p>

<p>La regla fundamental de la Investigacion es el <strong>minimo de tres piezas</strong>: antes de intentar la Tirada del Prisma (la tirada que determina si la teoria de los jugadores es correcta), el grupo debe haber obtenido al menos tres piezas del Prisma a traves de la exploracion activa. Este minimo garantiza que la resolucion del misterio no sea prematura ni arbitraria, sino el resultado de un trabajo genuino de investigacion.</p>

<h3>Fase IV: Accion</h3>

<p>La cuarta fase es el climax de la sesion: el momento en que los personajes actuan sobre lo que han descubierto. La Accion puede tomar muchas formas: un enfrentamiento fisico contra una amenaza, una negociacion tensa con una faccion rival, un ritual para sellar una brecha de frecuencia, una carrera contrarreloj para salvar a alguien en peligro. Lo que define la Accion no es su naturaleza especifica, sino su intensidad dramatica y el hecho de que las decisiones tomadas aqui tendran consecuencias irreversibles.</p>

<p>Durante la fase de Accion, el ritmo del juego se acelera. Las tiradas de dados son mas frecuentes, las descripciones mas vivas, las decisiones mas urgentes. El DJ debe gestionar el tempo con cuidado, asegurandose de que cada jugador tenga su momento de protagonismo y de que la tension escalada hacia un punto de maxima intensidad antes de resolverse.</p>

<h3>Fase V: Cierre</h3>

<p>La quinta y ultima fase es la resolucion. En el Cierre, se realiza la <strong>Reserva del Prisma</strong>: los jugadores presentan su teoria completa del misterio, combinando las piezas recopiladas durante la Investigacion, y realizan la tirada que determina si esa teoria se convierte en verdad dentro del mundo de juego. Pero el Cierre es mas que una tirada; es un espacio para la reflexion narrativa. Aqui se discuten las consecuencias de lo ocurrido, se actualizan las relaciones entre personajes, se modifican las condiciones del mundo y se siembran las semillas de futuras aventuras.</p>

<p>El DJ facilita el Cierre haciendo preguntas a los jugadores: <em>"Como se siente tu personaje despues de lo que ha descubierto?"</em>, <em>"Ha cambiado tu opinion sobre el Consejo despues de lo que has visto?"</em>, <em>"Que le cuentas a tu mentor cuando vuelves a la Academia?"</em>. Estas preguntas no son decorativas; son el mecanismo mediante el cual las consecuencias narrativas se inscriben en los personajes y en el mundo.</p>`
    },
    {
      id: 'ch4-f3',
      title: 'La Cocreacion del Mundo',
      body: `<h3>El mundo se construye hablando</h3>

<p>Uno de los principios mas distintivos de Numinia es la <strong>cocreacion narrativa</strong>: la idea de que el mundo de juego no pertenece exclusivamente al DJ, sino que se construye en tiempo real mediante la colaboracion de todos los participantes. Este principio, heredado de la tradicion PbtA, se implementa en Numinia a traves de un sistema estructurado de preguntas que el DJ formula a los jugadores en momentos clave de la partida.</p>

<p>Las preguntas del DJ no son preguntas retoricas ni preguntas cuya respuesta ya conoce. Son <strong>preguntas genuinas</strong>, invitaciones para que los jugadores aporten detalles, historias, relaciones y texturas al mundo de Numinia. Cuando un jugador responde a una de estas preguntas, su respuesta se convierte en <em>verdad narrativa</em>: un hecho establecido del mundo de juego que el DJ y los demas jugadores deben respetar e integrar en la ficcion.</p>

<h3>Tipos de preguntas</h3>

<p>Las preguntas del DJ se clasifican en cuatro categorias, cada una con una funcion narrativa especifica:</p>

<p><strong>Preguntas contextuales:</strong> Buscan enriquecer la escena inmediata con detalles sensoriales y ambientales. <em>"Acabais de entrar en la Biblioteca del Crepusculo. Jugador 1, que es lo primero que tu personaje nota al cruzar el umbral?"</em> o <em>"El mercader os ofrece un te antes de hablar de negocios. Jugador 3, que aroma tiene el te y que recuerdo le evoca a tu personaje?"</em>. Estas preguntas construyen la atmosfera de manera colaborativa, asegurando que el mundo se sienta vivo y lleno de detalles que ningun DJ podria generar solo.</p>

<p><strong>Preguntas de entorno:</strong> Establecen hechos sobre la geografia, la cultura o la historia de Numinia. <em>"Vuestro camino os lleva a un barrio del Distrito Ouroboros que ninguno habeis visitado antes. Jugador 2, como se llama este barrio y por que tiene mala reputacion?"</em> o <em>"En la pared del archivo encontrais un mural antiguo. Jugador 4, que representa el mural y por que es significativo para la historia de la ciudad?"</em>. Estas preguntas expanden el mapa del mundo y crean lugares con historia y personalidad.</p>

<p><strong>Preguntas de personaje:</strong> Revelan aspectos de los personajes no jugadores que habitan Numinia. <em>"El guardia que custodia la entrada no parece convencido de dejaros pasar. Jugador 1, que detalle observas en su comportamiento que te hace pensar que esta asustado?"</em> o <em>"La alquimista os recibe en su taller con una sonrisa tensa. Jugador 3, tu personaje la conoce de antes. Donde se conocieron y por que la relacion se enfrio?"</em>. Estas preguntas dan profundidad a los habitantes de Numinia y crean redes de relaciones que enriquecen la narrativa.</p>

<p><strong>Preguntas de personaje jugador:</strong> Invitan a los jugadores a definir aspectos de sus propios personajes que aun no se han explorado. <em>"Mientras esperais en la antecamara del Consejo, Jugador 2, en que esta pensando tu personaje? Hay algo de este lugar que le resulte familiar?"</em> o <em>"La musica que suena en el festival te recuerda a algo, Jugador 4. Que es, y por que te hace sentir incomodo?"</em>. Estas preguntas profundizan en la vida interior de los personajes y generan material narrativo que el DJ puede utilizar en futuras sesiones.</p>

<h3>Celulas del Prisma como recompensa</h3>

<p>Para incentivar la participacion activa en la cocreacion del mundo, Numinia introduce las <strong>Celulas del Prisma</strong>: pequenas recompensas narrativas que el DJ otorga cuando un jugador ofrece una respuesta especialmente creativa, evocadora o significativa a una pregunta de cocreacion. Una Celula del Prisma puede utilizarse posteriormente para anadir un dado extra a una tirada, para introducir un detalle narrativo favorable en un momento de tension, o para activar una conexion inesperada entre elementos de la historia.</p>

<p>Las Celulas del Prisma no son experiencia ni moneda. Son <strong>fragmentos de autoria compartida</strong>, reconocimientos de que el jugador ha contribuido algo valioso al mundo comun. Su acumulacion no hace al personaje mas poderoso en terminos mecanicos; lo hace mas <em>conectado</em> con el tejido narrativo de Numinia, mas capaz de influir en la historia de maneras sutiles pero significativas.</p>

<blockquote>El mejor mundo de juego no es el que el DJ imagina solo en su habitacion la noche antes de la partida. Es el que surge de la mesa, imprevisible y vibrante, cuando todas las voces contribuyen a su construccion.</blockquote>`
    },
    {
      id: 'ch4-f4',
      title: 'Rumorologia',
      body: `<h3>El arte de investigar lo que se susurra</h3>

<p>En Numinia, la informacion no fluye a traves de canales oficiales ni bases de datos centralizadas. Fluye a traves de <strong>rumores</strong>: historias susurradas en tabernas, notas cifradas dejadas en buzones clandestinos, conversaciones a medias escuchadas en los pasillos de las Academias, grafitis enigmaticos en los muros del Distrito Ouroboros. Los rumores son la sangre informativa de la ciudad, y saber investigarlos, interpretarlos y verificarlos es una de las habilidades mas valiosas que un Khepri puede desarrollar.</p>

<p>El sistema de Rumorologia de Numinia proporciona un marco mecanico para gestionar la investigacion de rumores, asegurando que el proceso sea dramatico, incierto y narrativamente productivo.</p>

<h3>La Tirada de Indagar</h3>

<p>Cuando un personaje quiere investigar un rumor, realiza una <strong>Tirada de Indagar</strong>, utilizando los dados asociados a su caracteristica de Percepcion o Sabiduria (a eleccion del jugador, segun el metodo de investigacion). El numero de exitos obtenidos determina la calidad y cantidad de informacion que el personaje consigue extraer:</p>

<ul>
<li><strong>Exito total (3+ exitos):</strong> El personaje obtiene informacion detallada, fiable y contextualizada. Ademas, descubre una conexion inesperada con otro rumor o con un elemento de la trama principal. El DJ proporciona dos piezas del Prisma relacionadas con el rumor.</li>
<li><strong>Exito normal (1-2 exitos):</strong> El personaje obtiene informacion util pero incompleta. Sabe lo suficiente para seguir investigando, pero le faltan detalles cruciales. El DJ proporciona una pieza del Prisma.</li>
<li><strong>Fallo (0 exitos):</strong> El personaje no obtiene informacion util, o la informacion que obtiene es contradictoria y confusa. El DJ introduce una complicacion: alguien se ha dado cuenta de que el personaje esta haciendo preguntas, la fuente del rumor ha desaparecido, o la investigacion atrae atencion no deseada.</li>
<li><strong>Fracaso (mas 1s que 6s):</strong> El personaje obtiene informacion deliberadamente enganosa o cae en una trampa preparada para quienes investigan ese tema concreto. El DJ introduce una amenaza directa.</li>
</ul>

<h3>Clasificacion de rumores</h3>

<p>No todos los rumores son iguales. Cuando el DJ prepara una sesion, clasifica cada rumor segun su grado de veracidad, utilizando una escala de cinco niveles que los jugadores desconocen pero que determina como la informacion se comporta cuando es investigada:</p>

<ul>
<li><strong>Probablemente verdadero:</strong> El nucleo del rumor refleja un hecho real, aunque los detalles pueden estar distorsionados por la cadena de transmision. Investigar este rumor conduce a informacion fiable que puede usarse como base para teorias solidas.</li>
<li><strong>Parcialmente verdadero:</strong> El rumor contiene elementos reales mezclados con especulacion, exageracion o malentendidos. La verdad esta ahi, pero hay que separarla de la paja. Investigar este rumor produce informacion que debe ser contrastada con otras fuentes.</li>
<li><strong>Probablemente falso:</strong> El rumor es mayoritariamente inexacto, pero su existencia misma es informativa: por que circula esta historia? Quien se beneficia de que la gente crea esto? Investigar este rumor no revela la verdad del asunto, pero puede revelar verdades sobre quien propaga la desinformacion.</li>
<li><strong>Deliberadamente enganoso:</strong> El rumor ha sido fabricado y puesto en circulacion con un proposito especifico: distraer, confundir, provocar o manipular. Investigar este rumor puede conducir a la fuente de la manipulacion, lo cual es, en si mismo, una pista valiosa.</li>
<li><strong>Indeterminado:</strong> El rumor se encuentra en un estado de suspension narrativa: su veracidad no esta establecida y sera determinada por la Tirada del Prisma cuando los jugadores construyan su teoria. Este tipo de rumores es el mas interesante porque su verdad es literalmente cocreada durante el juego.</li>
</ul>

<h3>Comentarios sobre el exito</h3>

<p>Cuando un jugador obtiene un exito en su Tirada de Indagar, el DJ no se limita a entregar informacion en bruto. El exito activa lo que en Numinia se llama un <strong>Comentario</strong>: una reflexion, una observacion o una conexion que el personaje realiza gracias a su experiencia, su formacion o su intuicion. Los Comentarios son el mecanismo mediante el cual la informacion se transforma en <em>comprension</em>. Por ejemplo, si un personaje investiga un rumor sobre desapariciones en el Distrito de Salomon y obtiene un exito, el DJ podria decir: <em>"Descubres que las tres personas desaparecidas eran miembros de la misma logia clandestina. Tu personaje, con su formacion en la Escuela de Lenguajes Primordiales, reconoce el simbolo que aparece en las puertas de sus viviendas: es un glifo de ocultacion, pero esta invertido. Alguien queria que se encontrara."</em></p>

<p>Los Comentarios son contextuales: dependen de quien sea el personaje que investiga. Un Khepri de la Escuela de Materia Invisible notara detalles fisicos y quimicos; uno de la Escuela de Formas Emergentes percibira patrones y estructuras; uno de la Escuela del Umbral Animico captara resonancias emocionales y psiquicas. Esta variabilidad enriquece enormemente la experiencia de juego, porque significa que el mismo rumor puede ser investigado de maneras radicalmente diferentes segun quien lo investigue.</p>`
    },
    {
      id: 'ch4-f5',
      title: 'La Heterocosmica de Dolezel',
      body: `<h3>Los cuatro operadores logicos del mundo posible</h3>

<p>Numinia no es un mundo arbitrario. Es un <strong>mundo posible</strong> en el sentido tecnico que el teorico literario Lubomir Dolezel dio a este concepto: un constructo narrativo con sus propias leyes internas, coherente consigo mismo aunque difiera radicalmente de la realidad empirica. Para gestionar esta coherencia, Numinia adopta los cuatro <em>operadores logicos</em> que Dolezel identifico como los pilares de toda heterocosmica (todo mundo ficcional), transformandolos en herramientas mecanicas de juego.</p>

<p>Los cuatro operadores son las lentes a traves de las cuales el DJ y los jugadores evaluan si un evento, una accion o una situacion es <em>posible</em> dentro del mundo de Numinia. Cada operador define un eje de la realidad del juego:</p>

<h3>Operadores aleticos: lo posible y lo imposible</h3>

<p>Los operadores aleticos determinan que <strong>puede</strong> y que <strong>no puede</strong> ocurrir en Numinia. Definen las leyes naturales del mundo: la frecuencia existe y puede ser manipulada, los automatas pueden tener una forma rudimentaria de conciencia, ciertas piedras almacenan energia, el Mar de Silices es navegable pero peligroso. Pero tambien establecen limites: no existe la teletransportacion instantanea, los muertos no regresan (o al menos no de forma sencilla), nadie puede destruir la ciudad con un gesto. Cuando un jugador propone una accion, lo primero que el DJ evalua es si es <em>aleticamente posible</em> en el contexto de Numinia.</p>

<h3>Operadores deonticos: lo permitido y lo prohibido</h3>

<p>Los operadores deonticos establecen el marco legal, etico y social del mundo. Numinia tiene leyes, tradiciones y tabues que sus habitantes conocen y respetan (o transgreden). El Decalogo Fundacional prohibe el uso de la frecuencia para controlar la voluntad ajena. Las Academias tienen protocolos estrictos sobre la experimentacion con artefactos de la civilizacion caida. El Consejo de Concordia regula el comercio entre distritos. Estos no son obstaculos arbitrarios; son el tejido social de Numinia, y violarlos tiene consecuencias narrativas y mecanicas: perdida de reputacion, persecucion por la Legion del Umbral, ostracismo academico.</p>

<h3>Operadores epistemicos: lo conocido y lo desconocido</h3>

<p>Los operadores epistemicos gestionan la <strong>informacion</strong> dentro del mundo de juego. Determinan que sabe cada personaje, que sabe la sociedad numiniana en general, que se ha olvidado, que se ha ocultado deliberadamente y que es genuinamente incognoscible. Este es el operador mas relevante para la investigacion: cada misterio en Numinia es, en esencia, un problema epistemico, una brecha entre lo que se sabe y lo que se necesita saber. Los rumores, las piezas del Prisma, los Comentarios y las Tiradas de Indagar son todas herramientas epistemicas.</p>

<h3>Operadores axiologicos: lo bueno y lo malo</h3>

<p>Los operadores axiologicos establecen los sistemas de <strong>valor</strong> que coexisten (y a menudo chocan) en Numinia. No hay una moralidad unica y absoluta en la ciudad; hay multiples marcos eticos en tension permanente. Las Fuerzas del Velo creen que ocultar ciertas verdades es un acto de proteccion; las Fuerzas del Umbral creen que todo conocimiento debe ser libre. Las Escuelas Ontologicas valoran diferentes virtudes: la precision, la creatividad, la compasion, la audacia. Los operadores axiologicos no dictan lo que esta bien y lo que esta mal; dictan que <em>marcos de valor</em> existen en el mundo y como entran en conflicto.</p>

<h3>La Tirada de Heterocosmica</h3>

<p>Cuando surge una situacion en la que los cuatro operadores entran en tension, es decir, cuando algo es fisicamente posible pero socialmente prohibido, o cuando la informacion disponible es contradictoria con los valores de una faccion, el DJ puede invocar una <strong>Tirada de Heterocosmica</strong>. Esta tirada, realizada con 2D6, consulta una tabla que determina como el propio mundo de Numinia responde a la tension:</p>

<ul>
<li><strong>2-3:</strong> <em>Fractura cosmica.</em> La tension es irreconciliable. Se produce un evento anomalo: una distorsion de frecuencia, una manifestacion espontanea, un desgarro temporal. El mundo mismo reacciona al conflicto.</li>
<li><strong>4-5:</strong> <em>Predomina lo deontico.</em> Las normas sociales y legales se imponen sobre las demas consideraciones. La tradicion pesa mas que la verdad o el deseo.</li>
<li><strong>6-8:</strong> <em>Equilibrio tenso.</em> Ninguna fuerza domina. La situacion permanece ambigua, y los jugadores deben tomar una decision moral sin red de seguridad.</li>
<li><strong>9-10:</strong> <em>Predomina lo epistemico.</em> La verdad sale a la luz, independientemente de si es conveniente, legal o deseable. La informacion se impone.</li>
<li><strong>11-12:</strong> <em>Resonancia armonica.</em> Los cuatro operadores se alinean momentaneamente. Lo que es posible, es tambien justo, verdadero y valioso. Un momento de claridad cosmica que los Khepris pueden percibir como una vibracion en la frecuencia.</li>
</ul>

<h3>El Marcador de Resonancia</h3>

<p>Cada Tirada de Heterocosmica alimenta el <strong>Marcador de Resonancia</strong>, un indicador global que mide el estado de equilibrio (o desequilibrio) del mundo de Numinia en la campana. Los resultados extremos (2-3 y 11-12) desplazan el Marcador hacia los polos de Caos y Armonia respectivamente, mientras que los resultados intermedios lo mantienen en la zona de Tension. Cuando el Marcador alcanza un umbral critico en cualquier direccion, se desencadena un <strong>Evento de Resonancia</strong>: un acontecimiento a escala de toda la ciudad que altera las condiciones de juego de manera significativa. Los Eventos de Resonancia son los momentos de mayor escala narrativa en Numinia, y su naturaleza depende de la direccion del Marcador.</p>`
    },
    {
      id: 'ch4-f6',
      title: 'Las Funciones del Cuento de Propp',
      body: `<h3>La narratologia como herramienta de juego</h3>

<p>Vladimir Propp, en su obra seminal <em>Morfologia del cuento</em>, identifico treinta y una funciones narrativas recurrentes en los cuentos tradicionales: patrones arquetipicos que aparecen una y otra vez en las historias de todas las culturas. Numinia adapta veinte de estas funciones a su contexto de juego, convirtiendolas en una herramienta mecanica que el DJ puede utilizar para generar eventos, complicaciones y giros narrativos cuando la partida necesita un impulso o cuando el azar narrativo es deseable.</p>

<h3>La Tirada de Evento (1D20)</h3>

<p>Cuando el DJ necesita un evento inesperado, ya sea porque la partida ha perdido ritmo, porque los jugadores han tomado un camino imprevisto, o simplemente porque quiere introducir un elemento de sorpresa, lanza un <strong>D20</strong> y consulta la tabla de Funciones de Propp adaptadas a Numinia:</p>

<ul>
<li><strong>1. Alejamiento:</strong> Un personaje importante se marcha, dejando un vacio que debe llenarse. Un mentor desaparece, un aliado parte en una mision lejana, un protector abandona su puesto.</li>
<li><strong>2. Prohibicion:</strong> Se anuncia una nueva restriccion. El Consejo prohibe el acceso a una zona, una Academia cierra sus puertas, un ritual es declarado ilegal.</li>
<li><strong>3. Transgresion:</strong> Alguien viola una prohibicion, y las consecuencias empiezan a manifestarse. Los personajes pueden ser testigos, victimas o los propios transgresores.</li>
<li><strong>4. Interrogatorio:</strong> Una fuerza antagonista busca informacion sobre los personajes o sobre algo que los personajes poseen. Alguien esta haciendo preguntas sobre ellos.</li>
<li><strong>5. Informacion:</strong> Los personajes reciben un dato crucial de una fuente inesperada: un mensaje cifrado, una confesion involuntaria, un descubrimiento accidental.</li>
<li><strong>6. Engano:</strong> Alguien intenta manipular a los personajes mediante la mentira, la seduccion, el disfraz o la falsificacion. La realidad no es lo que parece.</li>
<li><strong>7. Complicidad:</strong> Los personajes son tentados a participar en algo moralmente ambiguo. Una faccion les ofrece un trato ventajoso pero eticamente cuestionable.</li>
<li><strong>8. Fechoria:</strong> Se comete un acto danino contra alguien cercano a los personajes o contra la comunidad. Un robo, un sabotaje, un secuestro, una destruccion deliberada.</li>
<li><strong>9. Carencia:</strong> Los personajes descubren que les falta algo esencial para completar su mision: un objeto, un conocimiento, un aliado, un recurso.</li>
<li><strong>10. Mediacion:</strong> Un mensajero, un heraldo o un evento publico llama a los personajes a la accion. Se les pide ayuda, se les asigna una mision, se les convoca ante una autoridad.</li>
<li><strong>11. Partida:</strong> Los personajes deben abandonar un lugar seguro y adentrarse en territorio desconocido o peligroso. El viaje es inevitable.</li>
<li><strong>12. Prueba:</strong> Un donante o un guardian somete a los personajes a una prueba antes de concederles lo que necesitan. La prueba puede ser fisica, intelectual o moral.</li>
<li><strong>13. Reaccion:</strong> Los personajes deben responder a la prueba. Su reaccion revela su caracter y determina si obtendran la recompensa.</li>
<li><strong>14. Regalo:</strong> Los personajes obtienen un objeto magico, una informacion clave o un aliado poderoso como resultado de haber superado una prueba.</li>
<li><strong>15. Guia:</strong> Un guia aparece para conducir a los personajes a traves de un espacio peligroso o confuso. El guia puede ser fiable o no.</li>
<li><strong>16. Combate:</strong> Se produce un enfrentamiento directo entre los personajes y una fuerza antagonista. El conflicto puede ser fisico, dialectico o simbolico.</li>
<li><strong>17. Marca:</strong> Los personajes son marcados de alguna manera: una herida, un tatuaje, una reputacion, un efecto de frecuencia. La marca los distingue y tiene consecuencias futuras.</li>
<li><strong>18. Victoria:</strong> Los personajes triunfan sobre la amenaza inmediata, pero la victoria viene acompanada de un coste o una revelacion que complica la situacion general.</li>
<li><strong>19. Reparacion:</strong> Se deshace un dano previo, se recupera algo perdido, se restaura un equilibrio roto. Pero la reparacion revela que el dano era sintoma de algo mayor.</li>
<li><strong>20. Transfiguracion:</strong> Los personajes o el mundo experimentan una transformacion profunda. Nada vuelve a ser como era. Un nuevo orden emerge de las cenizas del antiguo.</li>
</ul>

<h3>El Reloj de la Trama</h3>

<p>Para dar estructura temporal a las Funciones de Propp, Numinia utiliza el <strong>Reloj de la Trama</strong>, un marcador circular dividido en segmentos que representa el avance de la narrativa hacia su climax. Cada vez que se activa una Funcion de Propp (ya sea por tirada de evento o por desarrollo organico de la historia), se rellena un segmento del Reloj. Cuando el Reloj se completa, se produce un <strong>Evento de Engranaje</strong>: un momento narrativo de alta intensidad donde todas las tramas convergen.</p>

<h3>Desequilibrio del Engranaje</h3>

<p>Si el Reloj de la Trama se completa de manera desequilibrada, es decir, si las Funciones activadas pertenecen mayoritariamente a la primera mitad de la tabla (funciones 1-10, orientadas a la preparacion) o a la segunda mitad (funciones 11-20, orientadas a la resolucion), se produce un <strong>Desequilibrio del Engranaje</strong>. El Desequilibrio hace que la escena se colapse hacia el pasado (si predominan funciones de preparacion) o hacia el futuro (si predominan funciones de resolucion), generando una escena fuera de tiempo: un flashback o una vision profetizada que los personajes experimentan como un sueno lucido colectivo.</p>`
    },
    {
      id: 'ch4-f7',
      title: 'Tiradas de dados',
      body: `<h3>El sistema D6 de Numinia</h3>

<p>El corazon mecanico de Numinia es un sistema de dados de seis caras (D6) elegante en su simplicidad y rico en sus posibilidades narrativas. A diferencia de los sistemas que suman resultados o los comparan con umbrales fijos, el D6 de Numinia funciona mediante un conteo de <strong>exitos y fallos individuales</strong> que genera una curva de probabilidad expresiva y dramatica.</p>

<h3>Mecanica basica</h3>

<p>Cuando un personaje intenta una accion cuyo resultado es incierto, el jugador lanza un numero de dados D6 determinado por la <strong>caracteristica relevante</strong> del personaje (tipicamente entre 2 y 6 dados). Cada dado se evalua individualmente:</p>

<ul>
<li>Cada dado que muestra un <strong>6</strong> cuenta como un <strong>exito</strong>.</li>
<li>Cada dado que muestra un <strong>1</strong> cuenta como un <strong>fallo</strong>.</li>
<li>Los resultados de 2 a 5 son <strong>neutros</strong> y no se cuentan.</li>
</ul>

<p>El resultado de la tirada se determina comparando el numero total de exitos con los umbrales del sistema:</p>

<ul>
<li><strong>Exito total (3 o mas exitos):</strong> El personaje logra lo que intenta de manera brillante, completa y sin complicaciones. Ademas, obtiene un beneficio adicional: informacion extra, una ventaja tactica, una impresion favorable, un recurso inesperado. El DJ describe un resultado que supera las expectativas del personaje.</li>
<li><strong>Exito normal (1-2 exitos):</strong> El personaje logra lo que intenta, pero con un matiz. Puede haber un coste menor, una complicacion lateral, un detalle que no salio como estaba planeado. El exito es real, pero viene acompanado de tension narrativa. El DJ ofrece el resultado deseado junto con una consecuencia o una pregunta.</li>
<li><strong>Fallo (0 exitos, 0 fallos):</strong> El personaje no consigue lo que intenta. La accion falla, el plan no funciona, el intento queda en nada. Pero un fallo no es un desastre: es una oportunidad narrativa. El DJ introduce una complicacion, revela informacion a traves del fracaso, o cambia las circunstancias de manera que los jugadores deban replantearse su enfoque.</li>
<li><strong>Fracaso (mas 1s que 6s):</strong> El peor resultado posible. No solo falla la accion, sino que las cosas empeoran de manera significativa. Se revela un peligro oculto, se activa una trampa, se pierde un recurso, se sufre un dano. El DJ tiene carta blanca para hacer un movimiento duro que escale la tension dramatica.</li>
</ul>

<h3>Los 16 movimientos de accion</h3>

<p>El sistema de Numinia define <strong>16 movimientos de accion</strong>, dos por cada una de las ocho caracteristicas del personaje. Cada movimiento describe una categoria amplia de acciones que un personaje puede intentar, y determina que caracteristica se usa para la tirada:</p>

<p><strong>Fuerza (FUE):</strong> <em>Imponer</em> (forzar algo o a alguien mediante la fuerza bruta) y <em>Resistir</em> (soportar un dano fisico, un esfuerzo prolongado o una presion ambiental).</p>

<p><strong>Destreza (DES):</strong> <em>Maniobrar</em> (moverse con agilidad, esquivar, realizar acciones que requieren coordinacion fisica) y <em>Precisar</em> (apuntar, manipular objetos delicados, ejecutar acciones que requieren control fino).</p>

<p><strong>Constitucion (CON):</strong> <em>Aguantar</em> (resistir venenos, enfermedades, efectos de frecuencia o agotamiento prolongado) y <em>Recuperar</em> (sanar, descansar efectivamente, regenerar recursos fisicos).</p>

<p><strong>Inteligencia (INT):</strong> <em>Analizar</em> (examinar una situacion, un objeto o un texto para extraer informacion logica) y <em>Recordar</em> (acceder a conocimientos almacenados, datos academicos, informacion historica).</p>

<p><strong>Sabiduria (SAB):</strong> <em>Percibir</em> (detectar detalles ocultos, leer el ambiente, anticipar peligros) y <em>Intuir</em> (comprender motivaciones, sentir frecuencias, captar verdades no racionales).</p>

<p><strong>Carisma (CAR):</strong> <em>Persuadir</em> (convencer, negociar, inspirar mediante la palabra y la presencia) y <em>Impresionar</em> (intimidar, seducir, provocar una reaccion emocional fuerte).</p>

<p><strong>Percepcion extrasensorial (PER):</strong> <em>Sintonizar</em> (conectar con la frecuencia de un lugar, objeto o ser) y <em>Canalizar</em> (dirigir la frecuencia a traves del propio cuerpo para producir un efecto).</p>

<p><strong>Movimiento (MOV):</strong> <em>Desplazar</em> (cubrir distancias, perseguir o huir, navegar terrenos dificiles) y <em>Reaccionar</em> (actuar con rapidez ante un estimulo subito, tener la iniciativa en un momento critico).</p>

<h3>Tiradas de Competencia</h3>

<p>Ademas de los movimientos de accion, Numinia incluye <strong>Tiradas de Competencia</strong> para situaciones en las que las habilidades especificas del personaje son mas relevantes que sus caracteristicas generales. Las Competencias son conocimientos y destrezas especializadas (Alquimia, Ingenieria de Frecuencia, Historia Antigua, Criptografia, Herbologia, etc.) que anaden dados extra a la tirada cuando son aplicables. Un personaje con la Competencia de Criptografia lanzara dados adicionales al intentar descifrar un codigo, independientemente de su Inteligencia base.</p>

<h3>Tiradas de Confrontacion</h3>

<p>Cuando dos o mas personajes se oponen directamente, se realizan <strong>Tiradas de Confrontacion</strong>. Cada parte lanza sus dados simultaneamente y se comparan los exitos. La parte con mas exitos prevalece, y la diferencia entre los exitos de ambas partes determina la magnitud de la victoria. En caso de empate, la situacion evoluciona de manera inesperada: ambas partes obtienen parcialmente lo que querian, pero de una forma que ninguna habia anticipado.</p>`
    },
    {
      id: 'ch4-f8',
      title: 'Reglas de Combate',
      body: `<h3>Cuando las palabras no bastan</h3>

<p>El combate en Numinia no es el centro del sistema de juego, pero es una realidad de la vida en una ciudad rodeada de peligros, facciones en conflicto y criaturas nacidas de la frecuencia descontrolada. Cuando la violencia estalla, el sistema la gestiona con un balance entre rapidez, dramatismo y consecuencia narrativa. El objetivo no es simular cada golpe con precision tactica, sino crear escenas de accion tensas, cinematicas y significativas donde cada decision cuenta.</p>

<h3>Iniciativa</h3>

<p>Al comienzo de un combate, cada participante realiza una <strong>Tirada de Iniciativa</strong> utilizando su caracteristica de Movimiento (MOV). Los personajes actuan en orden descendente de exitos obtenidos. En caso de empate, los jugadores actuan antes que los personajes no jugadores; entre jugadores empatados, ellos mismos deciden el orden. La iniciativa se determina una sola vez al inicio del combate y se mantiene durante toda la escena, salvo que un evento narrativo justifique un reordenamiento.</p>

<p>La Iniciativa en Numinia no es solo un orden de turnos; es una medida de la <strong>consciencia tactica</strong> del personaje. Un personaje con alta Iniciativa no es necesariamente el mas rapido, sino el que mejor lee el flujo del combate, el que anticipa los movimientos del oponente y el que elige el momento preciso para actuar.</p>

<h3>Tirada de Ataque</h3>

<p>Para atacar, un personaje lanza un numero de dados igual a su <strong>Iniciativa mas la bonificacion del arma</strong>. Cada arma en Numinia tiene tres modos de ataque, cada uno con su propia bonificacion:</p>

<ul>
<li><strong>Ataque Ligero:</strong> Rapido y preciso, con bonificacion moderada. Ideal para combates agiles donde la velocidad importa mas que el dano.</li>
<li><strong>Ataque Pesado:</strong> Lento pero devastador, con alta bonificacion de dano pero posible penalizacion a la siguiente tirada de Iniciativa. Para golpes decisivos.</li>
<li><strong>Ataque Especial:</strong> Unico para cada arma, con efectos narrativos ademas del dano mecanico. El ataque especial de la Nemesis Liquida, por ejemplo, no solo dana sino que <em>ata</em> al objetivo con filamentos de frecuencia.</li>
</ul>

<h3>Tabla de Defensa</h3>

<p>La defensa en Numinia es contextual: no depende de una cifra fija de armadura, sino de la <strong>situacion tactica</strong> del defensor. La Tabla de Defensa establece cinco situaciones que modifican la tirada del defensor:</p>

<ul>
<li><strong>Desprevenido (-2D6):</strong> El personaje no sabe que el ataque viene. No puede reaccionar. Es la peor situacion posible y puede ocurrir por emboscadas, ataques por la espalda o el primer golpe de un combate inesperado.</li>
<li><strong>En desventaja (-1D6):</strong> El personaje sabe que esta siendo atacado pero esta en una posicion desfavorable: acorralado, en terreno dificil, herido, superado en numero.</li>
<li><strong>Situacion neutra (0):</strong> Combate normal, sin ventajas ni desventajas significativas. El defensor lanza sus dados de Defensa sin modificadores.</li>
<li><strong>En ventaja (+1D6):</strong> El personaje tiene una posicion favorable: cobertura, terreno elevado, informacion sobre el oponente, apoyo de un aliado.</li>
<li><strong>Posicion dominante (+2D6):</strong> El personaje controla completamente la situacion defensiva: fortificacion solida, conocimiento total del enemigo, superioridad tactica abrumadora.</li>
</ul>

<p>Los exitos de la tirada de defensa se restan de los exitos de la tirada de ataque. Si el resultado neto es positivo, el ataque causa dano; si es cero o negativo, el defensor ha evitado o absorbido el golpe.</p>

<h3>Dano y consecuencias</h3>

<p>El dano en Numinia no se mide en puntos de golpe numericos, sino en un sistema de <strong>estados de herida</strong> que refleja las consecuencias narrativas del combate. Un personaje puede estar Ileso, Magullado (molestias menores que no afectan a las tiradas), Herido (-1D6 a las tiradas fisicas), Malherido (-2D6 a todas las tiradas), o Fuera de combate (incapaz de actuar hasta recibir atencion). Cada impacto exitoso avanza al personaje un paso en esta escala, o dos pasos si el ataque fue un exito total.</p>

<h3>Combate cooperativo</h3>

<p>Numinia fomenta activamente el <strong>combate cooperativo</strong>, reflejo de su filosofia de juego colaborativa. Cuando dos o mas personajes coordinan sus acciones contra un mismo objetivo, sus exitos se suman en una reserva comun. Esta reserva se evalua con umbrales especiales:</p>

<ul>
<li><strong>3-4 exitos combinados:</strong> Equivalen a un <strong>exito total cooperativo</strong>. El grupo no solo dania al objetivo, sino que obtiene una ventaja tactica significativa: lo desequilibran, lo desarman, lo fuerzan a retroceder, crean una apertura para el siguiente turno.</li>
<li><strong>5 o mas exitos combinados:</strong> Se produce una <strong>destruccion automatica</strong> del objetivo (si es una criatura comun) o un dano critico devastador (si es un antagonista principal). Esta posibilidad representa los momentos de maxima coordinacion del grupo, donde cada miembro aporta su pieza al ataque perfecto.</li>
</ul>

<p>El combate cooperativo requiere que los jugadores <em>describan</em> como se coordinan. No basta con declarar que atacan al mismo tiempo; deben narrar la sinergia: <em>"Mientras Kael distrae a la criatura con un destello de frecuencia, Lyra se desliza por su flanco izquierdo y clava el Filo de Atlas en la juntura de su caparazon, justo donde la placa esta agrietada."</em> Esta exigencia narrativa convierte el combate cooperativo en uno de los momentos mas cinematicos y satisfactorios del juego.</p>

<blockquote>El combate en Numinia no es un problema de optimizacion. Es una escena dramatica donde el precio de la violencia siempre se paga, y donde la mejor victoria es la que no deja cicatrices innecesarias.</blockquote>`
    }
  ]
};
