# **INTRODUCCIÓN**

# **UN FIXTURE ENTRE PLANOS**
_«Una cita sintética de apertura que replica el estilo del original sin_
_contener una sola línea de su contenido.»_


Este documento es un fixture del manual v0.6.0: texto inventado que replica
la estructura markdown del manual real. Existe para que los builds herméticos
y los tests ejerciten el parser del Códex.

## **Una sección de la introducción**


Prosa sintética de la introducción, con un término <u>subrayado</u> y una
nota al pie<sup>1</sup> como las que produce la conversión.


1 Una nota al pie sintética, artefacto de conversión.

# **CAPÍTULO 1**

# **LA FORMA DE UN CAPÍTULO**


Prosa de apertura que pertenece al capítulo, antes del primer fragmento.


![](images/fixture-manual.pdf-1-0.png)

## **Fragmento 1: La primera prueba**


Un párrafo íntegro de texto sintético que el parser debe conservar sin
alterar, palabra por palabra.

### **Una subsección**


  - Primer elemento de una lista sintética

  - Segundo elemento, con **negrita** y _cursiva_

## **Fragmento 2: Datos tabulados**


|Aspecto|Valor|
|---|---|
|Columna|Celda|
|Fila|Celda|


Prosa posterior a la tabla.

# **CAPÍTULO 2**

# **LA MEMORIA DEL FIXTURE**


Prosa de apertura del segundo capítulo, también sintética.

## **Fragmento 1: Historia sintética**


Este fragmento existe para que los tests busquen contenido en el capítulo
dos.

# **CAPÍTULO 3**

# **LAS TABLAS DE PRUEBA**


Prosa del tercer capítulo.

# **CAPÍTULO 4**

# **LAS CITAS Y LOS SUBTÍTULOS**


Prosa del cuarto capítulo.

# **CAPÍTULO 5**

# **EL QUINTO ESQUELETO**


Prosa del quinto capítulo.

# **CAPÍTULO 6**

# **EL SEXTO ESQUELETO**


Prosa del sexto capítulo.

# **CAPÍTULO 7**

# **EL SÉPTIMO ESQUELETO**


Prosa del séptimo capítulo, el último numerado.

# **EL ESPEJO ROTO**

# **Módulo sintético para el fixture**


El módulo final contiene sus propios encabezados de primer nivel, que el
parser NO debe confundir con límites de capítulo.

# **Una sección interna del módulo**


Prosa interna del módulo con un personaje sintético.

#### **Un personaje del módulo**


Descripción sintética de un personaje de prueba.
