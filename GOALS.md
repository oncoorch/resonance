# GOALS — RESONANCE

Fecha: 2026-09-11. Versión: 2. Estado: **objetivos registrados; implementación pendiente de aprobación**.

## Autoridad y forma de trabajo

Este documento registra los objetivos solicitados por el usuario y las propuestas que el plan exposición agrega para revisión. `PLAN.md` contiene el procedimiento, dependencias, criterios de aceptación y registro de cumplimiento. Los objetivos no se consideran implementados por aparecer en estos archivos.

1. Planificar **todos** los objetivos antes de modificar la aplicación.
2. Avisar al usuario y detenerse para que revise el plan.
3. Si responde **implementar**, ejecutar el alcance aprobado, trabajando cada objetivo por separado. Si responde **cambiar**, modificar el plan según sus indicaciones y volver a presentarlo.
4. No mezclar refactorizaciones o funcionalidades ajenas con un objetivo. Compartir fundamentos técnicos solo mediante dependencias explícitas.
5. Por cada objetivo: implementación completa, prueba funcional real y evidencia; actualizar el estado en ambos documentos. Una maqueta, botón sin backend o HTTP 200 no demuestra cumplimiento.
6. Para esta entrega, terminar y verificar el repositorio local antes de publicar en GitHub y desplegar. No publicar, desplegar ni activar cobros durante la etapa de planificación.
7. La petición actual de cuentas multiusuario sustituye la preferencia anterior de RESONANCE sin login. La eliminación del modo visible no elimina la revisión, aprobación, STOP ni las protecciones de archivos.

## Propósito que debe conservarse

RESONANCE es ante todo un **organizador y depurador de bibliotecas musicales personales** para personas no técnicas. La reproducción, personalización y suscripciones complementan ese propósito; no lo sustituyen por una copia de una tienda de música.

- Escanear y auditar todos los archivos; identificar metadatos sin inventarlos.
- Organizar por artista/álbum/título, sin asumir que las carpetas de respaldos antiguos son álbumes reales.
- Si falta el álbum, usar el artista como agrupación de respaldo, indicando que no es un álbum identificado.
- Mantener grabaciones live, unplugged, acústicas, remasters y pertenencias legítimas a varios álbumes; no fusionarlas solo por título o duración.
- Separar duplicados binarios verificados de grabaciones posiblemente equivalentes. No borrar automáticamente por una sugerencia de IA o coincidencia aproximada.
- Procesar los elementos seguros; dejar ambiguos pendientes, sin afectar sus destinos y sin bloquear el resto por esos casos.
- Nunca sustituir una grabación diferente ni alterar/eliminar originales como efecto secundario de organización. Cualquier sustitución explícita requiere evidencia de compatibilidad de metadatos/duración, decisión del usuario y recuperación.
- Borrado explícito individual o por lotes hacia papelera recuperable; confirmación clara para lotes, progreso y STOP.
- Estadísticas con denominadores correctos, archivos únicos y porcentajes verificables.
- Exportación útil para Apple Music y flujo documentado hacia iPhone/iPod touch, sin prometer sincronización directa desde el navegador.

## Objetivos solicitados

### G01 — Eliminar la presentación del modo

**Petición:** «ya no es necesario mostrar el modo, elimina eso».

Eliminar selectores, etiquetas y explicaciones de modo de organización en toda la interfaz. Resolver compatibilidad de datos antiguos para que ni `simulation` ni un cambio de configuración bloqueen la ejecución aprobada. Mantener un único flujo seguro de preparar, revisar, aprobar y ejecutar.

**Estado:** pendiente de aprobación. **Plan:** G01.

### G02 — Corregir contraste y temas oscuros

**Petición:** al cambiar a un tema oscuro, usar colores de texto y fondo apropiados, evitando el mal contraste actual.

Corregir todas las superficies, tablas, tarjetas de playlists, selectores, formularios, menús, avisos, diálogos y reproductor; incluir estados activo, seleccionado, hover, foco, error y deshabilitado. Aplicación inmediata y persistente del tema y del idioma.

**Estado:** pendiente de aprobación. **Plan:** G02.

### G03 — Género voluntario y recomendaciones de temas

**Petición:** elegir género en el perfil; recomendar kawaii para mujeres, Tokyo para hombres y temas relacionados para personas de género indefinido o GLBT; ampliar las opciones sin restringir ningún tema por género.

Preferencia autodeclarada y opcional, nunca inferida de nombre, foto o música. Incluir «prefiero no indicarlo» y autodescripción. Las afinidades LGBTQ+ pueden elegirse independientemente del género. Sugerencias, no asignaciones obligatorias: toda persona puede elegir cualquier tema y conservar su elección manual.

**Estado:** pendiente de aprobación. **Plan:** G03.

### G04 — HOME como bienvenida predeterminada

**Petición:** la página de bienvenida debe estar en HOME y abrirse por defecto.

HOME separado de Biblioteca. Bienvenida pública antes de iniciar sesión y bienvenida personalizada al entrar; no enviar automáticamente a tablas ni a Configuración. Mantener navegación explícita y enlaces internos válidos.

**Estado:** pendiente de aprobación. **Plan:** G04.

### G05 — Registro, login, sesiones multiusuario y publicación

**Petición:** implementar login y registro para varios usuarios; cuando el repositorio local esté listo, subir a GitHub y desplegar en VPS Contabo NICOP, con un proyecto nuevo en Dokploy y DNS Cloudflare, en `resonance.oncoorch.com`.

Separar cuentas, bibliotecas, archivos, playlists, preferencias, permisos y sesiones. Planificar cómo convivirán organización local y reproducción multidispositivo. Publicación solo después de verificar la versión local y la seguridad multiusuario.

**Regla global solicitada:** repositorio local terminado/verificado → GitHub → VPS Contabo NICOP → proyecto Dokploy nuevo por aplicación → dominio y DNS Cloudflare. Guardada como convención permanente; no concede acceso implícito a otros proyectos, pacientes, bases de datos o secretos de NICOP.

**Estado:** pendiente de aprobación. **Plan:** G05-A (arquitectura/cuentas) y G05-B (publicación). Son dos entregables del mismo objetivo, no dos productos independientes.

### G06 — Quitar «Only on this device» y adaptar dispositivos

**Petición:** eliminar esa leyenda; versión final adaptable a cualquier tipo de dispositivo.

Eliminar la frase ES/EN y otros mensajes que presenten todo el producto como exclusivamente local. Diseñar escritorio, tablet y móvil. Explicar únicamente limitaciones reales y contextuales: un archivo no subido o un equipo desconectado no pueden aparecer falsamente disponibles en otro dispositivo.

**Estado:** pendiente de aprobación. **Plan:** G06.

### G07 — Playlists funcionales, combinables y exportables

**Petición:** los botones XML/M3U8 deben descargar; elegir pistas según múltiples parámetros, incluyendo mezcla de varios ritmos; revisar aplicaciones similares y adoptar sus mejores características.

Listas manuales e inteligentes, filtros combinables, múltiples géneros/artistas/álbumes, inclusiones/exclusiones, vista previa de pistas, edición y orden. Diferenciar descarga en navegador de guardado en carpeta. Inspirarse en patrones funcionales de Apple Music, Spotify y bibliotecas personales como Navidrome; no copiar marcas ni depender de un catálogo externo para que funcionen las listas.

**Estado:** pendiente de aprobación. **Plan:** G07.

### G08 — Sección Reproductor

**Petición:** un menú con reproductor que permita reproducir biblioteca y playlists.

Reproductor persistente, vista ampliada y cola compartida por todas las vistas; reproducir, pausar, STOP, anterior/siguiente, búsqueda temporal, volumen, aleatorio y repetición. Mantener reproducción al navegar y mostrar claramente disponibilidad o incompatibilidad de archivos.

**Estado:** pendiente de aprobación. **Plan:** G08.

### G09 — Biblioteca y menús útiles inspirados en Apple Music

**Petición:** imitar la organización de listas, álbumes, géneros y menús al hacer clic derecho o pulsar los tres puntos: crear/agregar playlists, eliminar archivo, quitar de biblioteca o playlist, etc.

Vistas de canciones, artistas, álbumes, géneros, recientes y favoritas; listas y cuadrículas con búsqueda, clasificación y columnas configurables. Menú contextual compartido con equivalentes táctiles y de teclado. Separar estrictamente eliminación física, exclusión del catálogo y retirada de una playlist. Importar/exportar biblioteca/playlists, mostrar duplicados e información del archivo según las capacidades reales.

**Estado:** pendiente de aprobación. **Plan:** G09.

### G10 — Personalización de lenguaje visual

**Petición:** Spatial UI y otros diseños elegibles, incluidos los nombres «spacemorphismo», «animalismo», «minimalismo», «maximalismo», «claimorfismo» y más, dentro de Configuración → Personalización.

Separar **tema cromático** de **estilo visual**. Ofrecer miniaturas y vista previa, mantener acceso a todas las funciones y legibilidad en todas las combinaciones admitidas. Los términos del usuario se conservan; las interpretaciones de los menos estandarizados se explican en el plan y quedan sujetas a revisión, sin corregirlos silenciosamente.

**Estado:** pendiente de aprobación. **Plan:** G10.

### G11 — Perfil completo y avatar editable

**Petición:** avatar genérico, iniciales de nombres/apellidos o username, foto propia con zoom y recorte; redes sociales, canales, atributos, dirección, correo, nombres y datos personales necesarios.

Perfil con campos agrupados, opcionales salvo los imprescindibles para la cuenta. Foto con editor y vista previa del recorte; controles de privacidad, edición, exportación y eliminación. Enlaces sociales separados de cuentas realmente vinculadas por OAuth. No pedir contraseñas de redes ni hacer públicos dirección, correo o género por defecto.

**Estado:** pendiente de aprobación. **Plan:** G11.

### G12 — Gratuito inicialmente y suscripciones seguras

**Petición:** aplicación inicialmente gratis, pero preparar suscripciones mensuales desde $1 hasta $3 para reproducción musical, con métodos de pago seguros.

Preparar Free y planes mensuales de $1, $2 y $3. Moneda, beneficios, límites, país del comercio y procesador deben aprobarse antes de activar cobros. Gratis inicialmente, sin pedir tarjeta ni suscribir automáticamente. Cobros alojados por proveedor habilitado y probado, sin almacenar números de tarjeta/CVV. Reproducción de archivos propios con derechos, no venta implícita de acceso al catálogo Apple/Spotify.

**Estado:** pendiente de aprobación. **Plan:** G12.

### G13 — Identidad R manuscrita y favicon personalizable

**Petición:** no usar nota musical; usar una **R manuscrita**, delante de una onda con **dos valles y un pico**, de aspecto central semejante a una campana de Gauss. R en negro, azul, rojo, lila y otros colores fuertes; onda posterior en colores suaves/pastel, elegibles según preferencias o recomendaciones.

Diseño original y legible en tamaños pequeños. Preferencias de color manuales y recomendaciones opcionales; favicon por sesión/usuario sin contaminar otros perfiles. Iconos de aplicación y de instalación con las limitaciones del navegador explícitas.

**Estado:** pendiente de aprobación. **Plan:** G13.

## Objetivos nuevos solicitados

### G14 — Detección temporal de dispositivo, vinculación al login y uso local de archivos

**Petición:** cuando la app detecte el dispositivo donde se abre, usar los archivos locales de ese dispositivo. Si el formato y el navegador lo soportan, reproducir los archivos locales de ese dispositivo. Dispositivo nuevo: mostrar HOME indicando nuevo dispositivo, pedir login y vincular ese dispositivo al usuario. Con el acceso adecuado en el dispositivo, se puede importar/crear biblioteca, playlist y demás.

Inicio del dispositivo: identificar tipo/estado del dispositivo de manera conservadora, mostrar HOME para el primer uso real y pedir login o invitación donde corresponda. Vincular/dispositivo/usuario separadamente, sin asociar datos de una cuenta a otro nombre visual, perfil o foto. Respaldo de cuenta y datos de dispositivo diferenciados; si un dispositivo pierde la vinculación o se usa sesión vacía, no apropiarse de la biblioteca de otra cuenta.

**Estado:** pendiente de aprobación. **Plan:** G14.

### G15 — Manejo explícito de datos y bases de datos por dispositivo

**Petición:** manejo de datos y bases de datos identificando el dispositivo; debe mostrarse qué dispositivo se usa; en la configuración del usuario debe mostrarse el tipo de dispositivo y el historial de dispositivos usados en la app.

Identificar dispositivo como entidad con tipo, etiqueta, estado y fecha de uso, separación de historial/localización y atributos verdaderos de la cuenta; mostrar dispositivo actual y lista de dispositivos conocidos por usuario; en Configuración → cuenta, mostrar tipo de dispositivo vinculado y el historial de dispositivos usados en la app. Evitar composición automática de ubicación, nombre de red o MAC sin propósito de producto; cada dato de dispositivo debe ser explícito, conservable y susceptible de ser eliminado.

**Estado:** pendiente de aprobación. **Plan:** G15.

### G16 — Límites de dispositivos en PRO y ULTRA con RU

**Petición:** en versiones PRO y ULTRA, limitar cuántos dispositivos pueden usarse; PRO = 3 dispositivos, ULTRA = 10 dispositivos.

Entender disponibles como dispositivos vinculados o simultáneamente activos, según se decida. Mostrar límite por usuario y contrato actual, detectar cuándo se alcanza, ofrecer acciones de reemplazo/quitar/dispositivo visible y separar titularidad de dispositivo de disponibilidad simultánea. Los límites son propiedad del plan/entitlement, no un hardcodeo visual. No vigilar dispositivos de forma invasiva ni comparar con otros usuarios; los controles se tratan en G12 y en los límites de capacidad.

**Estado:** pendiente de aprobación. **Plan:** G16.

## Referencias visuales proporcionadas

Directorio local de las capturas: `/Users/Rattio/Library/Application Support/Hermes/composer-images/`. Inspeccionadas como referencias en esta planificación; no son recursos gráficos autorizados para incorporar al producto.

|| Referencia | Archivo | Uso |
|---|---|---|
|| V01 | `Captura_de_pantalla_2026-09-11_a_la_s_22.18.57_81fcb3.png` | RESONANCE: selectores de modo/tema y contraste incorrecto en campos claros. |
|| V02 | `Captura_de_pantalla_2026-09-11_a_la_s_22.28.10_bed134.png` | RESONANCE: playlists, guardado en `_Playlists`, tarjetas/exportación con bajo contraste y leyenda local. |
|| V03 | `Captura_de_pantalla_2026-09-11_a_la_s_22.35.59_cf9628.png` | Apple Music: tabla densa, columnas, búsqueda y navegación. |
|| V04 | `Captura_de_pantalla_2026-09-11_a_la_s_22.36.10_bc6ac9.png` | Apple Music: jerarquía de secciones, carátulas y tarjetas; no implica tienda o catálogo licenciado. |
|| V05 | `Captura_de_pantalla_2026-09-11_a_la_s_22.36.45_22dd8d.png` | Apple Music: colecciones visuales por categoría/género; no implica ofrecer sus radios. |
|| V06 | `Captura_de_pantalla_2026-09-11_a_la_s_22.37.59_c72013.png` | Apple Music: detalle playlist, acciones contextuales, cola y reproductor inferior. |
|| V07 | `Captura_de_pantalla_2026-09-11_a_la_s_22.50.29_1274f0.png` | Apple Music: menú Visualización, búsqueda, opciones de vista, cola y estado. |
|| V08 | `Captura_de_pantalla_2026-09-11_a_la_s_22.50.51_abbe8c.png` | Apple Music: importar/exportar, organizar biblioteca y mostrar duplicados. |

## Registro de decisiones

- 2026-09-11: se reciben y documentan G01–G16. Ninguno aprobado para implementación en esta etapa.
- Las cifras, límites y propuestas concretas de `PLAN.md` que no estaban en la petición son propuestas para revisión, no requisitos inventados ni servicios ya disponibles.
- La etapa siguiente depende de la respuesta del usuario: **implementar** o **cambiar**.
