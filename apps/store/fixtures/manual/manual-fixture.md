INTRODUCCIÓN
Manual sintético de pruebas
Este documento es un fixture: texto inventado que replica la estructura tipográfica del manual real sin contener una sola línea de su contenido. Existe para que los builds herméticos y los tests ejerciten el parser del Códice.
«Toda estructura necesita un esqueleto de prueba.»
EL PROPÓSITO DE ESTE FIXTURE
El parser reconoce capítulos, fragmentos, subtítulos en mayúsculas, citas y tablas. Cada forma aparece al menos una vez en este documento.
CAPÍTULO 1
La forma de un capítulo
Un capítulo abre con su título y prosa de apertura que pertenece al fragmento de apertura.
Fragmento 1: La primera prueba
Un párrafo íntegro de texto sintético que el parser debe conservar sin alterar.
Fragmento 2: La segunda prueba
Otro párrafo sintético para que el capítulo tenga más de un fragmento.
CAPÍTULO 2
La memoria del fixture
Prosa de apertura del segundo capítulo, también sintética.
Fragmento 1: Historia sintética del fixture
Este fragmento existe porque los tests estructurales buscan un fragmento cuyo título contenga la palabra Historia en el capítulo dos.
CAPÍTULO 3
Las tablas de prueba
Prosa que precede a la tabla de este capítulo.
Fragmento 1: Datos tabulados
ASPECTO	VALOR
Columna	Celda
Fila	Celda
CAPÍTULO 4
Las citas y los subtítulos
«Una cita sintética de apertura.»
UN SUBTÍTULO EN MAYÚSCULAS
Prosa normal tras el subtítulo.
CAPÍTULO 5
El cierre del esqueleto
Último capítulo sintético: garantiza que el total de capítulos alcanza el mínimo que los tests estructurales exigen.
