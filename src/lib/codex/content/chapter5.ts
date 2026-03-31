import type { CodexChapter } from '../types';

export const chapter5: CodexChapter = {
  id: 'ch5',
  number: 5,
  title: 'GEOGRAFIA Y CULTURA',
  subtitle: 'La geografia de lo simbolico',
  epigraph:
    'Numinia no se recorre con los pies. Se recorre con los sentidos abiertos y la mente dispuesta a perderse. Cada calle es una frase; cada distrito, un capitulo; la ciudad entera, un libro que se reescribe mientras lo lees.',
  fragments: [
    {
      id: 'ch5-f1',
      title: 'Los cuatro distritos',
      body: `<h3>La topografia de una ciudad flotante</h3>

<p>Numinia se organiza en torno a cuatro <strong>distritos principales</strong>, cada uno situado en una meseta elevada a diferente altura sobre el nivel base de la ciudad. Estos distritos no son divisiones administrativas arbitrarias; son <em>entidades culturales</em> con personalidad propia, historia, estetica y una relacion distintiva con el conocimiento, la frecuencia y la vida cotidiana. Entre ellos, la <strong>Plaza del Agora</strong> ocupa el centro geometrico y simbolico de Numinia: un vasto espacio abierto, parcialmente cubierto por un techo de cristal iridiscente, donde los cuatro distritos convergen y donde la vida publica de la ciudad alcanza su maxima intensidad.</p>

<h3>Distrito Vitruviano (Noroeste, 130 metros)</h3>

<p>El mas elevado de los cuatro distritos, el <strong>Vitruviano</strong> se alza a ciento treinta metros sobre el nivel base, accesible mediante escalinatas helicoidales talladas en la propia roca y ascensores neumaticos de vapor comprimido. Es el distrito del <strong>conocimiento</strong>, sede de las principales Academias de Numinia y hogar de la faccion de los <strong>Hermetistas</strong>, aquellos que creen que el saber debe ser custodiado con rigor y compartido solo con quienes demuestren estar preparados para recibirlo.</p>

<p>La arquitectura del Vitruviano es monumental y geometrica: edificios de planta octogonal con fachadas de piedra blanca y cobre envejecido, ventanales emplomados que proyectan espectros de luz coloreada sobre los pasillos interiores, y torres de observacion coronadas por instrumentos de medicion de frecuencia que giran lentamente como veletas de precision. Las calles son anchas y estan dispuestas en patron radial, convergiendo en la <strong>Biblioteca Circular</strong>, el edificio mas alto del distrito y uno de los mas antiguos de toda Numinia: una torre cilindrica de diecinueve pisos cuyas paredes interiores estan completamente cubiertas de estanterias que se extienden hasta el techo abovedado.</p>

<p>El ambiente del Vitruviano es austero y contemplativo. Los sonidos dominantes son el eco de pasos sobre marmol, el murmullo de conversaciones academicas y el zumbido suave de los instrumentos de medicion. El aroma predominante es una mezcla de pergamino antiguo, tinta metalica y el ozono sutil que emanan los cristales de frecuencia almacenados en los laboratorios. Los Hermetistas que dominan el distrito valoran la precision, la erudicion y la paciencia, y miran con cierta suspicacia a quienes buscan el conocimiento sin someterse a la disciplina de las Academias.</p>

<h3>Distrito Ouroboros (Sureste, 40 metros)</h3>

<p>El mas bajo y el mas extenso de los distritos, <strong>Ouroboros</strong> se extiende a cuarenta metros sobre el nivel base en una sucesion irregular de plataformas, terrazas y callejones conectados por puentes colgantes, escaleras de caracol y pasajes semisubterraneos. Es el distrito del <strong>juego</strong>, del comercio, de la noche y de la vida al margen: el corazon hedonista y comercial de Numinia, dominado por la faccion de los <strong>Herederos de Eleusis</strong>, quienes creen que la experiencia directa, el riesgo y el placer son caminos tan validos hacia la verdad como la erudicion academica.</p>

<p>La arquitectura de Ouroboros es caotica, organica y perpetuamente inacabada. Los edificios se construyen unos sobre otros sin plan aparente, creando un laberinto tridimensional de tiendas, talleres, tabernas, casas de apuestas, teatros improvisados y mercados que funcionan a todas horas. Las fachadas estan cubiertas de carteles luminosos alimentados por gas coloreado, grafitis elaborados que cambian con la luz, y enredaderas mecanicas cuyos zarcillos de cobre se retuercen lentamente siguiendo patrones fractales. El sonido omnipresente es una mezcla de musica en vivo, pregones de vendedores, risas, discusiones y el traqueteo metalico de las maquinas recreativas que llenan los salones de juego.</p>

<h3>Distrito de Salomon (Suroeste, 70 metros)</h3>

<p>A setenta metros de altura, el <strong>Distrito de Salomon</strong> es el distrito del <strong>orden</strong>: sede de los tribunales, los archivos juridicos, las oficinas gubernamentales y los templos civicos donde se dirimen los conflictos entre ciudadanos, entre facciones y entre distritos. La faccion dominante es el <strong>Circulo Estelar</strong>, una agrupacion de legisladores, jueces, diplomaticos y administradores que creen que la civilizacion se sostiene sobre la norma consensuada y que el caos es el enemigo natural del progreso.</p>

<p>La arquitectura de Salomon es simetrica, sobria y funcional, con amplias avenidas flanqueadas por edificios de piedra gris y hierro forjado cuyos porticos estan decorados con bajorrelieves alegoricos que representan las virtudes civicas: la Justicia, la Prudencia, la Templanza, la Fortaleza. Los espacios interiores son amplios y bien iluminados, disenados para la deliberacion publica: salas con forma de hemiciclo, tribunas elevadas, mesas circulares donde ningun asiento es mas alto que otro. El sonido caracteristico de Salomon es el murmullo grave de las asambleas en sesion, interrumpido ocasionalmente por el toque de campanas que marca los cambios de turno en los debates.</p>

<h3>Distrito del Sicomoro (Noreste, 100 metros)</h3>

<p>A cien metros de altura, el <strong>Sicomoro</strong> es el distrito del <strong>arte</strong>, la experimentacion y la creacion. Su nombre proviene del arbol sagrado que, segun la leyenda, Vera Holberin planto en el centro del distrito el dia de la fundacion y que aun hoy sigue creciendo, con ramas que se extienden sobre los tejados circundantes como los brazos de un guardian vegetal. La faccion dominante son los <strong>Neo-Atlantes</strong>, creadores, inventores, artistas y visionarios que creen que el futuro se construye en los talleres y los escenarios, no en las bibliotecas ni en los tribunales.</p>

<p>La arquitectura del Sicomoro es la mas eclectica y cambiante de toda Numinia. Los edificios se modifican constantemente: fachadas que se repintan cada estacion, estructuras modulares que se reconfiguran para albergar nuevas instalaciones artisticas, terrazas que se convierten en escenarios al aire libre. Los materiales son diversos y a menudo reciclados: madera recuperada, metal de desguace, cristal soplado, tela tensada sobre armazones de bambu. Los talleres del Sicomoro producen desde automatas de alta ingenieria hasta esculturas cineticas que danzan con el viento, desde instrumentos musicales de frecuencia hasta vestimentas que cambian de color segun el estado de animo de quien las lleva.</p>

<h3>La Periferia</h3>

<p>Mas alla de los cuatro distritos se extiende la <strong>Periferia</strong> de Numinia: un cinturon de territorios salvajes, semiexplorados y frecuentemente peligrosos que rodean la ciudad y la separan del mundo exterior. La Periferia no es un espacio vacio; es un ecosistema complejo donde las ruinas de la civilizacion de la Plenitud se mezclan con fenomenos naturales amplificados por la frecuencia residual:</p>

<ul>
<li><strong>Mar de Silices:</strong> Una vasta extension de arena cristalizada que se extiende al este de la ciudad, brillando bajo el sol como un oceano solidificado. Navegable con vehiculos especiales, es fuente de materiales raros pero tambien hogar de depredadores subterraneos.</li>
<li><strong>Hundimiento de Viridial:</strong> Un crater kilometrico al sur, cubierto de vegetacion anormalmente densa y bioluminiscente. Se dice que en su centro aun funciona una maquina de la Plenitud que altera el crecimiento biologico.</li>
<li><strong>Lamas de Basalto:</strong> Formaciones de roca volcanica al oeste, con sistemas de cuevas que albergan colonias de criaturas de frecuencia y depositos de minerales con propiedades excepcionales.</li>
<li><strong>Paramo de Hesiode:</strong> Una llanura desolada al norte, donde el viento arrastra fragmentos de frecuencia que producen alucinaciones en los viajeros no protegidos. Los Armonautas mas experimentados dicen que, en noches claras, se pueden ver las siluetas de ciudades fantasma en el horizonte.</li>
<li><strong>Subvalle de Neuma:</strong> Un sistema de valles hundidos bajo el nivel de la ciudad, accesibles solo por descenso vertical, donde el aire es denso y la frecuencia alcanza concentraciones peligrosas. Territorio de exploracion avanzada, no apto para novatos.</li>
</ul>

<p>Completando la geografia de Numinia, el <strong>Oceano de Lunacar</strong> se extiende mas alla de la Periferia, un cuerpo de agua cuyas corrientes transportan particulas de frecuencia y cuyo fondo oculta ruinas sumergidas de la era anterior. El <strong>Rio Virelai</strong> atraviesa la ciudad de norte a sur, alimentando los sistemas hidraulicos y las fuentes publicas, mientras que el <strong>Nivel Delta</strong> constituye el estrato mas profundo de Numinia: los tuneles, catacumbas y caminos subterraneos donde las viejas maquinas aun zumban en la oscuridad.</p>`
    },
    {
      id: 'ch5-f2',
      title: 'Gobierno y legislacion',
      body: `<h3>La arquitectura del poder en Numinia</h3>

<p>El sistema de gobierno de Numinia es un ejercicio deliberado de <strong>complejidad equilibrada</strong>: un entramado de instituciones, cuerpos deliberativos y mecanismos de control mutuo disenado para que ninguna faccion, individuo o idea pueda dominar la ciudad de manera unilateral. Los Primeros Concordantes, traumatizados por la concentracion de poder que habia destruido la civilizacion de la Plenitud, construyeron un sistema donde la autoridad siempre esta distribuida, donde cada decision requiere multiples consensos y donde la disidencia tiene canales legitimos de expresion.</p>

<h3>Estructura de cada distrito</h3>

<p>Cada uno de los cuatro distritos de Numinia posee su propia estructura de gobierno interna, compuesta por cuatro organos complementarios:</p>

<p><strong>La Asamblea Civica:</strong> El organo mas abierto y democratico, formado por todos los ciudadanos registrados del distrito que deseen participar. La Asamblea se reune una vez por ciclo lunar en un espacio publico designado (generalmente la plaza principal del distrito) y funciona como foro de debate, consulta popular y expresion de la voluntad ciudadana. Sus resoluciones no son vinculantes por si mismas, pero tienen un peso politico enorme: un Consejo de Sabios que ignore sistematicamente las demandas de su Asamblea se arriesga a la <em>Mocion de Desconfianza</em>, un mecanismo que puede forzar la renovacion completa de los cargos del distrito.</p>

<p><strong>El Consejo de Sabios:</strong> Un cuerpo de entre cinco y nueve miembros, seleccionados mediante un proceso que combina merito academico, sorteo y ratificacion popular. Los Consejeros Sabios son los responsables de la gestion cotidiana del distrito: presupuestos, infraestructuras, servicios publicos, relaciones con los otros distritos. Su mandato dura cuatro anos (una Tetrada), y no pueden ser reelegidos de manera consecutiva. Cada Consejo de Sabios esta obligado a incluir al menos un miembro de cada Escuela Ontologica presente en el distrito, garantizando la pluralidad de perspectivas.</p>

<p><strong>El Senado Legislativo:</strong> Un cuerpo de legisladores profesionales, formados en la Escuela de Derecho Numiniano del Distrito de Salomon, cuya funcion es redactar, revisar y aprobar las normas que rigen la vida del distrito. Los Senadores son designados por el Consejo de Sabios, pero su independencia esta protegida por el <em>Principio de Inmunidad Legislativa</em>: una vez designado, un Senador no puede ser destituido por el Consejo que lo nombro, sino unicamente por un tribunal especial del Proconsulado.</p>

<p><strong>El Proconsulado:</strong> El organo de control y supervision, compuesto por tres <em>Proconsules</em> elegidos por la Asamblea Civica con un mandato de seis anos. Los Proconsules no gobiernan ni legislan; investigan. Su funcion es vigilar que los demas organos cumplan las normas, gestionen los recursos con honestidad y respeten los derechos de los ciudadanos. El Proconsulado tiene potestad para auditar cualquier institucion del distrito, convocar comparecencias publicas y, en casos extremos, decretar la <em>Suspension Cautelar</em> de un organo de gobierno que considere corrupto o disfuncional.</p>

<h3>El Consejo de Concordia</h3>

<p>Por encima de las estructuras de los distritos se situa el <strong>Consejo de Concordia</strong>, el organo supremo de gobierno de Numinia. Compuesto por dos representantes de cada distrito (designados por sus respectivos Consejos de Sabios), el Consejo de Concordia se ocupa de los asuntos que afectan a la ciudad en su conjunto: defensa, relaciones con el exterior, gestion de la frecuencia, regulacion de las Academias, politica territorial sobre la Periferia.</p>

<p>Las decisiones del Consejo de Concordia requieren una <strong>mayoria cualificada</strong> de seis de los ocho miembros, lo que obliga a negociaciones continuas entre distritos y garantiza que ninguna decision importante se tome sin un consenso amplio. En caso de empate irresoluble, el Consejo puede recurrir al <em>Arbitraje de los Oraculos</em>, un mecanismo excepcional y cargado de ceremonia que se invoca muy raramente.</p>

<h3>Los Oraculos</h3>

<p>Los <strong>Oraculos</strong> son las figuras fundacionales de Numinia: los mas venerados de los Primeros Concordantes, aquellos cuya vision y sacrificio hicieron posible la ciudad. Aunque los Oraculos originales murieron hace siglos, su titulo se transmite a una nueva generacion mediante un proceso de seleccion secreto y altamente ritualizado. Los Oraculos actuales son siete, y su identidad publica es conocida, pero su proceso de deliberacion interna es estrictamente confidencial. No gobiernan en sentido ejecutivo; su funcion es <em>custodial</em>: preservar el espiritu fundacional de Numinia e intervenir solo cuando la ciudad se desvia peligrosamente de sus principios.</p>

<h3>El Decalogo Fundacional</h3>

<p>La base normativa de todo el sistema de gobierno es el <strong>Decalogo Fundacional</strong>, un documento redactado por los Primeros Concordantes que establece los diez valores irrenunciables de Numinia:</p>

<ul>
<li><strong>I. Memoria:</strong> El pasado se estudia para comprender, no para venerar ni para condenar.</li>
<li><strong>II. Pluralidad:</strong> Ninguna verdad es la unica verdad. La diversidad de pensamiento es fortaleza, no debilidad.</li>
<li><strong>III. Cocreacion:</strong> La ciudad pertenece a quienes la habitan y la construyen. Gobernar es servir, no mandar.</li>
<li><strong>IV. Resonancia:</strong> Todo esta conectado. Las consecuencias de cada acto se extienden mas alla de lo inmediato.</li>
<li><strong>V. Transparencia:</strong> El poder que se ejerce en la sombra es poder ilegitimo. La rendicion de cuentas es permanente.</li>
<li><strong>VI. Proporcion:</strong> La respuesta a un problema debe ser proporcional a su magnitud. La desmesura es enemiga de la justicia.</li>
<li><strong>VII. Hospitalidad:</strong> Numinia acoge a quien llega con buena voluntad. El extranjero es un ciudadano potencial, no una amenaza.</li>
<li><strong>VIII. Experimentacion:</strong> El error honesto es un paso hacia el conocimiento. Solo el error repetido por negligencia merece sancion.</li>
<li><strong>IX. Belleza:</strong> Lo funcional no esta completo hasta que es bello. La estetica no es lujo; es necesidad del espiritu.</li>
<li><strong>X. Humildad:</strong> Numinia no es perfecta. La aspiracion a la perfeccion es el mayor peligro para una ciudad que aspira a ser justa.</li>
</ul>`
    },
    {
      id: 'ch5-f3',
      title: 'Escuelas Ontologicas',
      body: `<h3>Seis maneras de entender la realidad</h3>

<p>Las <strong>Escuelas Ontologicas</strong> de Numinia no son meras instituciones educativas. Son <em>paradigmas existenciales</em>: marcos completos de interpretacion de la realidad que determinan como sus adeptos perciben el mundo, formulan preguntas, buscan respuestas y actuan sobre su entorno. Cada Khepri pertenece a una Escuela, y esta afiliacion influye profundamente en su manera de pensar, sentir y relacionarse con la frecuencia.</p>

<p>Las seis Escuelas Ontologicas representan seis facetas del prisma de la realidad. Ninguna es superior a las demas; cada una ilumina aspectos que las otras dejan en sombra. La tension creativa entre ellas es, segun los fundadores, el motor del progreso intelectual de Numinia.</p>

<h3>Escuela de la Materia Invisible</h3>

<p>La Escuela de la <strong>Materia Invisible</strong> sostiene que la realidad esta compuesta de capas ocultas de materia y energia que los sentidos ordinarios no pueden percibir. La frecuencia no es una fuerza mistica; es una propiedad fisica de un sustrato material que aun no hemos aprendido a medir con precision. Los adeptos de esta Escuela son empiristas rigurosos, experimentadores incansables, constructores de instrumentos y disenadores de protocolos de medicion. Su Academia, la <strong>Academia del Velo Translucido</strong>, es un complejo de laboratorios, talleres y observatorios situado en el Distrito Vitruviano, donde los estudiantes aprenden a detectar, medir y manipular las manifestaciones fisicas de la frecuencia.</p>

<p>Los Khepris de la Materia Invisible tienden a ser analiticos, meticulosos y escepticos. Desconfian de las explicaciones que no pueden verificarse empiricamente y prefieren los datos a las intuiciones. En terminos de juego, sobresalen en las tiradas de Analizar y Percibir, y sus Competencias suelen orientarse hacia la ingenieria, la alquimia y la investigacion forense.</p>

<h3>Escuela de las Formas Emergentes</h3>

<p>La Escuela de las <strong>Formas Emergentes</strong> propone que la realidad no tiene una estructura fija, sino que se organiza dinamicamente en patrones que emergen de la interaccion entre elementos simples. La frecuencia es la manifestacion de estos patrones emergentes: no una sustancia, sino una <em>relacion</em>, un modo de organizacion que surge cuando las condiciones son las adecuadas. Los adeptos de esta Escuela son pensadores sistemicos, matematicos, filosofos de la complejidad y observadores de redes. Su Academia, la <strong>Academia de las Espirales</strong>, se encuentra en el Distrito del Sicomoro, en un edificio cuya planta se reconfigura cada estacion siguiendo algoritmos de crecimiento fractal.</p>

<p>Los Khepris de las Formas Emergentes ven conexiones donde otros ven coincidencias. Son excelentes reconociendo patrones, anticipando tendencias y comprendiendo sistemas complejos. En terminos de juego, sobresalen en las tiradas de Intuir y Recordar, y sus Competencias se orientan hacia la criptografia, la cartografia y el analisis de redes.</p>

<h3>Escuela del Tiempo Fractal</h3>

<p>La Escuela del <strong>Tiempo Fractal</strong> sostiene que el tiempo no es lineal ni ciclico, sino <em>fractal</em>: una estructura autosimilar donde los mismos patrones se repiten a diferentes escalas. El pasado no esta detras de nosotros ni el futuro delante; ambos existen simultaneamente en diferentes niveles de la fractalidad temporal. La frecuencia es la capacidad de percibir y navegar estas capas del tiempo. Su Academia, la <strong>Academia del Reloj Infinito</strong>, ocupa una torre del Distrito Vitruviano cuyo interior esta disenado para desorientar la percepcion temporal: pasillos sin ventanas, relojes que marcan horas diferentes, salas donde la gravedad fluctua suavemente.</p>

<p>Los Khepris del Tiempo Fractal tienen una relacion inusual con la memoria y la anticipacion. Son propensos a estados de <em>deja vu</em> intenso, visiones fugaces del futuro y momentos de conexion con el pasado remoto. En terminos de juego, sobresalen en las tiradas de Sintonizar y Canalizar, y sus Competencias se orientan hacia la historiografia, la profecia y la arqueologia temporal.</p>

<h3>Escuela de los Lenguajes Primordiales</h3>

<p>La Escuela de los <strong>Lenguajes Primordiales</strong> postula que la realidad esta estructurada como un lenguaje: tiene una gramatica, una sintaxis y un vocabulario, y la frecuencia es la <em>voz</em> con la que ese lenguaje se pronuncia. Descifrar la frecuencia es, literalmente, aprender a leer el idioma del universo. Los adeptos de esta Escuela son linguistas, semioticos, poetas, musicos y criptografos. Su Academia, la <strong>Academia de la Palabra Raiz</strong>, esta en el Distrito de Salomon, en un edificio cuyas paredes interiores estan cubiertas de inscripciones en idiomas vivos, muertos e inventados.</p>

<p>Los Khepris de los Lenguajes Primordiales son comunicadores natos, interpretes de simbolos y decodificadores de mensajes ocultos. En terminos de juego, sobresalen en las tiradas de Persuadir y Analizar, y sus Competencias se orientan hacia la linguistica, la criptografia avanzada y la diplomacia.</p>

<h3>Escuela de la Simbiosis Extendida</h3>

<p>La Escuela de la <strong>Simbiosis Extendida</strong> propone que la individualidad es una ilusion funcional: en realidad, todos los seres vivos (y muchos sistemas no vivos) estan interconectados en una red de relaciones simbioticas que la frecuencia hace visible. El Khepri no es un individuo que usa la frecuencia; es un <em>nodo</em> de la red que la frecuencia constituye. Su Academia, la <strong>Academia del Arbol Compartido</strong>, se encuentra en el Distrito del Sicomoro, literalmente construida en torno al gran Sicomoro fundacional, cuyas raices se entrelazan con los cimientos del edificio.</p>

<p>Los Khepris de la Simbiosis Extendida son empaticos, cooperativos y especialmente sensibles a las dinamicas grupales. En terminos de juego, sobresalen en las tiradas de Intuir e Impresionar, y sus Competencias se orientan hacia la medicina, la ecologia y la gestion de conflictos.</p>

<h3>Escuela del Umbral Animico</h3>

<p>La Escuela del <strong>Umbral Animico</strong> es la mas mistica y la mas controvertida de las seis. Sostiene que la realidad tiene un componente <em>animico</em>, una dimension de consciencia que permea toda la existencia y que la frecuencia es su manifestacion perceptible. Los objetos, los lugares, los fenomenos naturales no solo existen; en cierto sentido, <em>sienten</em>. La frecuencia es el eco de esa sensibilidad cosmica. Su Academia, la <strong>Academia del Espejo Profundo</strong>, ocupa una serie de salas subterraneas bajo el Distrito Ouroboros, cerca del Anfiteatro Sumergido, donde la frecuencia ambiente es mas intensa y las fronteras entre percepcion y vision se difuminan.</p>

<p>Los Khepris del Umbral Animico son contemplativos, intuitivos y a menudo perturbadores para quienes no comparten su sensibilidad. Tienen experiencias que rozan lo visionario: suenos profeticos, percepciones de presencias invisibles, momentos de comunion con el entorno. En terminos de juego, sobresalen en las tiradas de Sintonizar y Canalizar, y sus Competencias se orientan hacia la meditacion, la oniromancia y el contacto con entidades de frecuencia.</p>`
    },
    {
      id: 'ch5-f4',
      title: 'Calendario y Efemerides',
      body: `<h3>El tiempo en Numinia: trece ciclos lunares</h3>

<p>Numinia no mide el tiempo como nosotros. Su calendario se rige por los <strong>ciclos lunares</strong>, trece en total, cada uno de veintinueve dias, lo que produce un ano numiniano de <strong>377 dias</strong>. Esta diferencia con el calendario solar no es un capricho; refleja una decision filosofica de los fundadores: alinear la medida del tiempo con los ritmos naturales mas perceptibles (las fases de la luna visible desde Numinia) en lugar de con abstracciones astronomicas que requieren instrumentos de precision.</p>

<p>Los trece ciclos lunares llevan nombres que evocan aspectos de la experiencia humana y de la mitologia numiniana:</p>

<ul>
<li><strong>1. Ciclo de la Semilla:</strong> Comienzo del ano. Tiempo de planificacion, propuestas y proyectos nuevos. Las Academias abren sus periodos de inscripcion.</li>
<li><strong>2. Ciclo del Telar:</strong> Tiempo de trabajo paciente y constante. Los talleres del Sicomoro organizan sus principales ferias de artesanias.</li>
<li><strong>3. Ciclo de la Llama:</strong> Tiempo de pasion e intensidad. El Distrito Ouroboros celebra sus festivales nocturnos mas espectaculares.</li>
<li><strong>4. Ciclo del Espejo:</strong> Tiempo de introspeccion y autoevaluacion. Los ciudadanos reflexionan sobre sus acciones del ciclo anterior.</li>
<li><strong>5. Ciclo de la Bruma:</strong> Tiempo de misterio y secretos. La frecuencia ambiental alcanza su primer pico anual, produciendo fenomenos inusuales.</li>
<li><strong>6. Ciclo de la Balanza:</strong> Tiempo de justicia y equilibrio. Los tribunales de Salomon procesan los casos acumulados durante el primer semestre.</li>
<li><strong>7. Ciclo del Puente:</strong> El ciclo central del ano. Tiempo de intercambios entre distritos, ferias comerciales y diplomacia interdistrital.</li>
<li><strong>8. Ciclo de la Tormenta:</strong> Tiempo de turbulencia. Las lluvias de frecuencia son mas intensas, y la ciudad se prepara para fenomenos atmosfericos anormales.</li>
<li><strong>9. Ciclo del Eco:</strong> Tiempo de memoria y homenaje. Se celebran los ritos en honor a los Primeros Concordantes y los caidos de la Gran Caida.</li>
<li><strong>10. Ciclo de la Maquina:</strong> Tiempo de innovacion y experimentacion. Las Academias presentan sus avances del ano y los talleres compiten en desafios de ingenieria.</li>
<li><strong>11. Ciclo del Crepusculo:</strong> Tiempo de transicion y melancolia. Los dias se acortan, la frecuencia ambiental alcanza su segundo pico, y los Khepris reportan suenos inusualmente vividos.</li>
<li><strong>12. Ciclo de la Serpiente:</strong> Tiempo de renovacion y transformacion. Los ciudadanos cierran asuntos pendientes, resuelven deudas y reparan relaciones danadas.</li>
<li><strong>13. Ciclo del Umbral:</strong> El ultimo ciclo del ano. Tiempo de fronteras y limites. Los rituales de cierre se celebran en toda la ciudad, y los Oraculos pronuncian su unica declaracion publica anual.</li>
</ul>

<h3>Las tres fases de cada ciclo</h3>

<p>Cada ciclo lunar de veintinueve dias se divide internamente en tres fases que marcan el ritmo de la vida cotidiana en Numinia:</p>

<p><strong>Nadir del Velo (dias 1-9):</strong> Corresponde a la luna nueva y los dias circundantes. Es un periodo de <strong>quietud y planificacion</strong>. La frecuencia ambiental es baja, los fenomenos anomalos son raros y los numinianos aprovechan para tareas que requieren concentracion y estabilidad. Las reuniones del Consejo de Concordia se celebran preferentemente durante el Nadir.</p>

<p><strong>Kairos del Velo (dias 10-20):</strong> Corresponde a la luna llena y su periodo de influencia. Es un periodo de <strong>actividad e intensidad</strong>. La frecuencia ambiental alcanza su maximo ciclico, los Khepris sienten sus capacidades amplificadas, y la ciudad vibra con una energia casi palpable. Los rituales, las ceremonias y los eventos publicos se concentran en el Kairos. Tambien es el periodo de mayor riesgo de fenomenos anomalos: distorsiones de frecuencia, manifestaciones espontaneas, alteraciones perceptivas.</p>

<p><strong>Crepusculo del Velo (dias 21-29):</strong> Corresponde a la luna menguante y los ultimos dias del ciclo. Es un periodo de <strong>reflexion y cierre</strong>. La frecuencia desciende gradualmente, los fenomenos se calman, y los numinianos evaluan lo ocurrido durante el Kairos. El dia 29, el ultimo del ciclo, se llama el <em>Dia del Umbral</em> y es considerado un momento de transicion: ni el ciclo que termina ni el que comienza, un parentesis temporal donde, segun la tradicion, las reglas habituales de la realidad se relajan levemente.</p>

<h3>Grandes periodos</h3>

<p>Ademas de los ciclos mensuales y anuales, Numinia reconoce periodos de tiempo mayores con significacion cultural y cosmica:</p>

<ul>
<li><strong>Tetrada (4 anos):</strong> El ciclo politico basico. Los mandatos de los Consejos de Sabios duran una Tetrada. Cada cambio de Tetrada se celebra con elecciones, renovaciones institucionales y una revision publica de los logros y fracasos del periodo anterior.</li>
<li><strong>Espectro (52 anos):</strong> Un ciclo de trece Tetradas que marca una generacion completa. El cambio de Espectro es un acontecimiento de gran solemnidad: se revisan los principios fundacionales, se evalua el estado de la ciudad a largo plazo y los Oraculos emiten un dictamen especial conocido como la <em>Lectura del Espectro</em>.</li>
<li><strong>Anamnesis Mayor:</strong> Un periodo no fijo, determinado por los Oraculos, que marca un momento de <em>recuerdo colectivo</em>: la ciudad entera se detiene para confrontar un aspecto de su pasado que ha sido olvidado, reprimido o malinterpretado. Las Anamnesis Mayores son raras (solo se han proclamado tres en la historia de Numinia) pero transformadoras.</li>
</ul>`
    },
    {
      id: 'ch5-f5',
      title: 'Otras agrupaciones',
      body: `<h3>El tejido social mas alla de distritos y Escuelas</h3>

<p>Numinia no se agota en sus cuatro distritos, sus seis Escuelas Ontologicas y sus tres Fuerzas. Bajo la superficie de las estructuras oficiales bulle un ecosistema de <strong>agrupaciones, ordenes, gremios y corrientes</strong> que enriquecen la vida social de la ciudad y proporcionan a los jugadores un mapa complejo de alianzas, rivalidades y oportunidades. Estas agrupaciones operan en diferentes niveles de visibilidad y legitimidad, desde las instituciones reconocidas por el Consejo de Concordia hasta las redes clandestinas que actuan en las sombras de Ouroboros.</p>

<h3>Instituciones reconocidas</h3>

<p><strong>La Legion del Umbral:</strong> El cuerpo de seguridad de Numinia, responsable del mantenimiento del orden publico, la defensa de la ciudad frente a amenazas externas y la contencion de fenomenos anomalos de frecuencia. La Legion no es un ejercito en sentido clasico; sus miembros, los <em>Umbrales</em>, son una combinacion de guardian civico, bombero de frecuencia y mediador de conflictos. Reciben formacion en combate, pero tambien en negociacion, primeros auxilios y gestion de crisis. Estan organizados en <em>Cohortes</em> de diez miembros, cada una especializada en un tipo de amenaza: Cohortes de Superficie (patrullas urbanas), Cohortes de Profundidad (operaciones en el Nivel Delta), Cohortes de Periferia (exploracion y defensa de las fronteras) y Cohortes de Frecuencia (intervencion en eventos anomalos).</p>

<p><strong>La Camara de Palimpsestos:</strong> Una institucion dedicada a la recuperacion, restauracion e interpretacion de textos danados, fragmentarios o cifrados procedentes de la civilizacion de la Plenitud. Los <em>Palimpsestistas</em> son una mezcla de bibliotecarios, arqueologos textuales y criptografos que trabajan en condiciones de extrema delicadeza con manuscritos que a veces tienen siglos de antiguedad y que pueden contener informacion peligrosa. La Camara tiene su sede en el Distrito de Salomon, en un edificio subterraneo con temperatura y humedad controladas, y sus descubrimientos se comunican primero al Consejo de Concordia antes de hacerse publicos.</p>

<p><strong>El Archivo Summa:</strong> Un proyecto de investigacion permanente dedicado al estudio de la Periferia y los territorios mas alla de los limites conocidos de Numinia. El Archivo Summa financia expediciones, recopila informes de exploradores, mantiene cartografias actualizadas y publica boletines periodicos sobre las condiciones de la Periferia. Su sede esta en el Distrito del Sicomoro, pero sus agentes operan por toda la Periferia, a menudo en condiciones de gran peligro y aislamiento.</p>

<h3>Organizaciones clandestinas</h3>

<p><strong>La Comuna de la Luz Invisible:</strong> Una red clandestina de activistas, pensadores radicales y disidentes que opera en los margenes de la legalidad numiniana. La Comuna cree que las instituciones de Numinia, pese a sus ideales fundacionales, se han calcificado y corrompido, y que es necesario un cambio radical en la estructura de poder de la ciudad. Sus metodos van desde la propaganda subversiva y la organizacion de protestas hasta el sabotaje de infraestructuras y la filtracion de documentos clasificados. La Comuna no tiene sede fija; sus miembros se reunen en locales cambiantes del Distrito Ouroboros, utilizando codigos de frecuencia para comunicarse entre si.</p>

<h3>Corrientes semirreligiosas</h3>

<p>En una ciudad donde la frontera entre ciencia y misterio es porosa, han surgido multiples <strong>corrientes de pensamiento con caracter semirreligioso</strong> que interpretan la frecuencia y los fenomenos de Numinia en clave espiritual:</p>

<p><strong>Los Cultores del Akasha:</strong> Creen que la frecuencia es la manifestacion fisica de un registro cosmico universal, una memoria del universo donde toda experiencia queda inscrita para siempre. Sus rituales buscan acceder a este registro para obtener conocimiento del pasado remoto y, en casos excepcionales, del futuro. Son contemplativos, pacifistas y profundamente respetados por la Escuela del Umbral Animico, con la que comparten muchas afinidades.</p>

<p><strong>Los Heresiarcas del Vortice:</strong> Una corriente mas radical que sostiene que la frecuencia no es benigna ni neutra, sino una fuerza caotica que debe ser liberada de las restricciones impuestas por las Academias y el Consejo. Los Heresiarcas practican rituales de <em>desencadenamiento</em>: experiencias extremas disenadas para romper las barreras perceptivas y permitir un contacto directo con la frecuencia en su estado salvaje. Son vistos con sospecha por las autoridades y con fascinacion por los jovenes rebeldes del Ouroboros.</p>

<p><strong>El Circulo de Khepri:</strong> Una orden devocional dedicada a la veneracion de Athanasius Holberin y, a traves de el, del escarabajo como simbolo de transformacion. Los miembros del Circulo llevan amuletos con forma de coleoptero, practican rituales de <em>metamorfosis simbolica</em> y creen que los Khepris son la siguiente etapa en la evolucion de la humanidad. Aunque sus creencias son consideradas excentricas por la mayoria de los numinianos, el Circulo tiene una influencia sorprendente en ciertos ambitos: varios miembros del Consejo de Sabios del Vitruviano son simpatizantes discretos.</p>

<h3>Logias, Ligas y Hermandades</h3>

<p>Ademas de las organizaciones mencionadas, Numinia alberga una constelacion de agrupaciones menores que los personajes pueden encontrar, unirse o enfrentar durante sus aventuras:</p>

<ul>
<li><strong>Logias:</strong> Grupos cerrados, generalmente de menos de veinte miembros, organizados en torno a un secreto compartido o un objetivo especifico. Las Logias operan con rituales de iniciacion, juramentos de confidencialidad y jerarquias internas. Algunas son benignas (la Logia del Astrolabio, dedicada a la cartografia estelar); otras son siniestras (la Logia de la Mano Cerrada, sospechosa de trafico de artefactos prohibidos).</li>
<li><strong>Ligas:</strong> Asociaciones abiertas de profesionales, artistas o entusiastas que comparten un oficio o una pasion. Las Ligas son menos secretas que las Logias y mas especializadas que los gremios. La Liga de los Relojeros, la Liga de los Herboristas, la Liga de los Titiriteros de Frecuencia: cada una tiene su cultura interna, sus rivalidades y sus tradiciones.</li>
<li><strong>Hermandades:</strong> Vinculos de lealtad mutua entre individuos que han compartido una experiencia transformadora: una expedicion peligrosa a la Periferia, la supervivencia a un evento anomalo, la graduacion en una Academia especialmente exigente. Las Hermandades no tienen estructura formal; son lazos personales que se mantienen mediante reuniones periodicas, codigos de ayuda mutua y una lealtad que, en muchos casos, supera a la que los miembros sienten por sus distritos o Escuelas.</li>
</ul>`
    }
  ]
};
