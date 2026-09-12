# PLAN — RESONANCE: biblioteca personal, multiusuario y multidispositivo

Fecha: 2026-09-11. Versión: 1. Fuente de requisitos: `GOALS.md`.

**Estado: PLAN COMPLETO PARA REVISIÓN; NO AUTORIZADO PARA IMPLEMENTACIÓN.**

Este documento describe trabajo futuro. No afirma que las funciones, seguridad, compatibilidad o despliegue estén implementados o probados. En esta etapa solo se inspeccionaron código, Git, capturas y documentación, y se redactaron los documentos solicitados. No se ejecutaron builds, pruebas de aplicación, migraciones, organización de música, reinicios, push, DNS, despliegues ni cobros.

## 1. Contrato de ejecución y alcance

- Trabajar cada objetivo por separado, con tareas, archivos, pruebas y cierre verificable. El orden técnico no cambia la numeración del usuario.
- Si el usuario dice **cambiar**, revisar este plan; no implementar. Si dice **implementar**, ejecutar únicamente el alcance aprobado.
- No modificar silenciosamente cambios existentes de otros trabajos/sesiones. Antes de implementar, identificar su procedencia y crear un punto de recuperación local sin secretos ni música.
- Actualizar `GOALS.md` y este documento después de cada entrega. Registrar evidencia real, no porcentajes estimados de avance técnico.
- Completar/verificar localmente antes de GitHub y VPS, conforme a la petición actual. Esto sustituye para este ciclo la instrucción histórica de publicar antes de cambiar código.
- Respetar los originales, aprobación inmutable, STOP, recuperación, aislamiento de cuentas y separación entre catálogo y archivos físicos.
- No añadir una tienda, catálogo Apple/Spotify, radio comercial, recomendaciones licenciadas ni sincronización automática de iPod como si estuvieran incluidos en las capturas.

## 2. Estado inspeccionado y riesgos que condicionan el plan

Raíz: `/Users/Rattio/music-library-organizer`.

### 2.1 Evidencia local de esta inspección

| Hallazgo | Evidencia | Consecuencia para el plan |
|---|---|---|
| HEAD local `5927808` y cuatro archivos previamente modificados | `git status --short --branch`, `git log -3`, `git diff --stat` | Preservar esos cambios; no asumir que `c49ff57` sigue siendo HEAD ni restaurar componentes a ciegas. |
| `origin` apunta a `https://github.com/oncoorch/resonance.git` | `git remote -v` | Propuesta: mantener ese remoto; confirmar titularidad antes del push porque el historial mencionaba `sherckuith/resonance`. No cambiar el remoto automáticamente. |
| Exportación devuelve JSON con una ruta, no un archivo descargable | `apps/server/src/app.ts:551–560`, `apps/web/src/lib/api.ts:54`, `Playlists.tsx:12` | Implementar respuesta/descarga real, además de guardado opcional en carpeta. No es suficiente cambiar el mensaje de éxito. |
| Playlists admiten una sola regla y guardan miembros al crearse | `app.ts:530–549`, `Playlists.tsx:15` | Crear motor de reglas combinadas y actualización de listas inteligentes; no describir snapshots actuales como listas que se actualizan solas. |
| Quedan defaults `simulation` en esquema, inicialización y reset | `apps/server/src/db/catalog.ts`, `db/migrations/001-core.sql` | G01 incluye migración no destructiva y revisión de planes antiguos, no solo ocultar selector. |
| Excepción de espacio para el mismo volumen y sugerencia `move-same-disk` | `app.ts:177–180,471` | No equivale a mover, clonar o disponer de capacidad. Corregir/verificar antes de operar archivos reales. |
| Normalización aproximada agresiva y descarte de álbumes por prefijos como `live`, `soundtrack`, `greatest hits` | Diff de `services/organization-naming.ts` | Riesgo de perder identidad legítima: convertir esas conjeturas en propuestas y conservar metadatos válidos. |
| Sesión bootstrap automática y esquema global | `app.ts:215–221`, `db/catalog.ts:4–16` | No es autenticación multiusuario. Prohibido publicar el servicio local tal como está. |
| Reproductor pertenece a una tabla y consulta hasta 100 filas | `TrackTable.tsx:22–25,42` | Reproductor global y paginación/virtualización reales, sin perder cola al navegar ni ocultar resto de biblioteca. |
| Inicio es `library`; todavía no hay HOME independiente | `apps/web/src/app/App.tsx:23,37` | Añadir bienvenida/rutas, conservando Biblioteca. |
| Frase local y bloqueo de playlists en Sidebar | `components/Sidebar.tsx:5–6,20–22` | G06 elimina leyenda; G07 separa capacidad de crear/reproducir de exportar archivos no disponibles. |
| Overrides de algunos controles solo para `data-theme="dark"`, mientras existen `tokyo`, `github-dark`, `dracula` | `apps/web/src/styles.css:9–10,25,28–34`; V01/V02 | Sustituir parches por tokens compartidos de superficie/texto/estado. No se midió aún una relación numérica de contraste. |
| Cancelar osascript rechaza el error crudo | `platform/macos/folder-picker.ts:9–12`, `app.ts:228–232` | Normalizar cancelación, mantener grants previos y no confundir cancelar con error de aplicación. |
| Docker local contiene rutas/volúmenes locales, no arquitectura cloud multiusuario | `Dockerfile`, `docker-compose.yml`, `config.ts` | Preparar despliegue independiente; no montar carpetas del VPS o datos NICOP como biblioteca. |

Archivos con modificaciones previas: `apps/server/src/app.ts`, `apps/server/src/config.ts`, `apps/server/src/services/organization-naming.ts`, `apps/web/src/features/settings/ProviderSettings.tsx`. La compilación y el proceso activo no se comprobaron en esta fase: no se declara que el árbol actual esté sano ni roto por errores históricos ya potencialmente cambiados.

### 2.2 Lectura de las referencias visuales

V01/V02 muestran campos y tarjetas claros con texto pálido sobre un entorno oscuro. V03 aporta tabla compacta, búsqueda, columnas técnicas y selección. V04/V05 aportan secciones y cuadrículas con carátulas. V06 muestra detalle de playlist, cola, reproductor inferior y acciones distintas para playlist/biblioteca. V07/V08 aportan opciones de visualización, importación/exportación y duplicados. Se adoptarán esos patrones funcionales con diseño/recursos originales; las capturas no demuestran que RESONANCE ya los tenga.

## 3. Decisiones arquitectónicas propuestas para aprobación

### D01 — Arquitectura híbrida: organización local + cuenta cloud

**Recomendada:** conservar un componente local para escanear, organizar y enviar a la papelera en equipos autorizados; añadir una aplicación web multiusuario en `https://resonance.oncoorch.com` para cuentas, catálogo sincronizado, playlists, preferencias y reproducción de audio que el usuario haya subido expresamente.

La API de selección de carpetas del navegador tiene disponibilidad limitada y requiere interacción del usuario; no proporciona a un VPS acceso nativo al disco del cliente.[1] Por ello no se prometerá organización de todo el sistema de archivos desde cualquier móvil o navegador.

| Capacidad | Equipo con componente local | Navegador remoto/móvil |
|---|---|---|
| HOME, perfil, temas, catálogo y playlists de su cuenta | Sí | Sí |
| Reproducir archivos presentes en ese equipo | Sí, mediante autorización local | No por el mero hecho de iniciar sesión |
| Reproducir audio subido por el usuario a su espacio cloud | Sí | Sí, si el formato/navegador lo soporta |
| Organizar carpetas originales y papelera del sistema | Sí, adaptador del SO certificado | No sobre carpetas de otro equipo; operar solo material propio disponible y autorizado |
| Importar archivos seleccionados | Carpeta autorizada o importación | Selector de archivos/subida; capacidades de directorios según navegador |
| Biblioteca con equipo origen apagado | Catálogo cacheado; audio según disponibilidad | Catálogo disponible; audio solo si está subido |
| Exportar listas | Descarga y/o guardado autorizado con rutas válidas | Descarga con destino de importación explícito; nunca rutas internas Linux inutilizables |

- Primera versión certificada del organizador nativo: macOS. Diseñar adaptadores Windows/Linux, sin declararlos compatibles antes de probar picker, permisos y papelera allí. La UI web sí tendrá matriz escritorio/tablet/móvil desde el inicio.
- Vincular el componente local con la cuenta mediante inicio de sesión y autorización explícita de ese equipo; credenciales internas revocables, sin copiar tokens manualmente. Spike de callback de login y separación de orígenes antes de comprometer tecnología.
- Preferir comunicación **saliente** del componente al servicio cloud; no exponer el puerto local a Internet ni abrir CORS universal. El cloud nunca recibe permiso general para ejecutar shell ni rutas arbitrarias.
- Mantener confirmación de operaciones físicas en el equipo propietario. No permitir que otro dispositivo borre archivos locales por una orden remota silenciosa.
- Audio cloud privado por defecto. Subidas seleccionadas y reanudables, checksum, cuotas y cancelación; no subir la biblioteca de decenas de GB automáticamente.
- No incluir streaming en vivo desde el Mac hacia Internet en el primer alcance: añade disponibilidad, NAT y seguridad diferentes. Si se prefiere a las subidas, requiere una modificación expresa del plan.

**Alternativa:** producto cloud-only con carga previa de todos los archivos. Más simple de operar, pero pierde organización directa de respaldos locales y aumenta almacenamiento/tráfico; no recomendada para el propósito actual.

### D02 — Datos locales y multiusuario

- Conservar SQLite local y su biblioteca; no resetearla. Proponer PostgreSQL para cuentas/catálogo cloud por concurrencia y separación de responsabilidades, evitando migrar todas las rutas nativas al servidor.
- Modelo propuesto: `users`, `sessions`, `profiles`, `user_preferences`, `devices`, `libraries`, `library_memberships`, `recordings`, `releases`, `tracks`, `file_assets`, `file_locations`, `playlists`, `playlist_items`, `playlist_rules`, `playback_state`, `jobs`, `trash_items`, `subscriptions`, `billing_events` y auditoría.
- Distinguir grabación, aparición en álbum, pista del catálogo y archivo físico. Un hash igual no autoriza borrar una pertenencia legítima a un álbum o playlist.
- Cada recurso cloud tiene propietario/biblioteca explícitos; autorización en API, jobs, streaming, descargas, avatar y almacenamiento. IDs opacos no sustituyen controles de acceso.
- Cada cuenta comienza con una biblioteca privada. Compartir bibliotecas entre cuentas queda fuera de esta versión salvo aprobación adicional.
- Migración de biblioteca existente: backup consistente, asignación explícita al propietario elegido en el dispositivo local, ensayo con copia y posibilidad de revertir. No entregar los datos existentes al primer registro público.
- Sincronización: IDs estables, revisiones, operaciones idempotentes, cambios incrementales y tombstones; resolver edición concurrente sin sobrescribir metadatos manuales en silencio. Rutas absolutas permanecen locales.
- Cuenta cloud es la autoridad de preferencias; dispositivo puede conservar caché. Logout/cambio de usuario limpia cola, caché privada, audio y favicon. No mantener reproducción de la cuenta anterior.

### D03 — Semántica segura y límites globales

- Quitar modo no significa que preview o aprobación escriban audio. Un plan aprobado sigue ligado a revisión, identidad del archivo, hashes y destino autorizado.
- Los conflictos aislados se omiten con motivo. Fallos globales reales —permiso insuficiente, falta de capacidad para la estrategia seleccionada, integridad o recuperación pendiente— se explican y no se ocultan para aparentar éxito.
- No usar hardlinks editables para ahorrar espacio si una escritura de tags podría modificar el original. Evaluar copia o clon copy-on-write certificado; si no hay capacidad, ofrecer espacio requerido, selección segura más pequeña u otro destino.
- Duplicados binarios, candidatos de misma grabación y otras versiones son categorías separadas; metadatos/duración son evidencia, no prueba suficiente para borrado automático. Normalización Unicode conservadora; no convertir `DAY` en otro artista ni invalidar `Live` solo por el nombre.
- La auditoría muestra archivos escaneados, no-audio, errores, seguros, pendientes, ya existentes, ejecutados y bytes, con denominadores y resultados persistidos.

### D04 — Diseño componible, no interfaces distintas por identidad

Separar `themeId` (paleta), `styleId` (formas/profundidad), densidad, tamaño de texto, movimiento, adornos y `iconVariant`. Mismos componentes y lógica en todos los estilos. Tema/estilo se pueden cambiar independientemente y previsualizar antes de guardar. La identidad personal solo genera recomendaciones opcionales.

### D05 — Comercialización futura

Proponer precios mensuales en **USD** por el símbolo `$`, pendiente de confirmación. La fase inicial es gratuita y no pide tarjeta. La suscripción remunera funciones de reproducción/servicio de biblioteca personal, no otorga derechos sobre música ajena. No activar producción de pagos hasta validar país/entidad del comercio, impuestos, soporte, política de cancelación, viabilidad del tráfico y proveedor disponible. Detalles en G12.

## 4. Orden de implementación propuesto

| Secuencia | Unidad | Depende de | Entregable separado |
|---|---|---|---|
| 1 | G00, prerrequisito técnico | Aprobación del plan | Línea base, recuperación y seguridad del organizador verificadas |
| 2 | G01 | G00 | Sin modo visible y compatibilidad de datos antiguos |
| 3 | G02 | G00 | Contraste consistente mediante tokens |
| 4 | G04 | G00 | HOME predeterminado y rutas |
| 5 | G05-A | G00, G04 y D01/D02 aprobadas | Arquitectura híbrida, autenticación y aislamiento, todavía local/staging |
| 6 | G06 | G02, G04, G05-A | Responsive y mensajes por capacidad real |
| 7 | G09 | G00, G05-A, G06 | Biblioteca navegable y acciones seguras |
| 8 | G07 | G05-A, G09 | Playlists combinables y descarga real |
| 9 | G08 | G05-A, G07, G09 | Reproductor/cola completos |
| 10 | G10 | G02, G06, G08 | Catálogo de estilos visuales |
| 11 | G11 | G05-A, G06 | Perfil privado y avatar editable |
| 12 | G03 | G10, G11 | Recomendaciones y catálogo ampliado de temas |
| 13 | G13 | G03, G10, G11 | R/onda, favicon y variantes |
| 14 | G14 | G04, G05-A | Detección de dispositivo, HOME de nuevo dispositivo, login, vinculación y reproducción local por dispositivo |
| 15 | G15 | G11, G14 | Datos y bases de datos por dispositivo, tipo visible y historial de dispositivos |
| 16 | G12 | G05-A, G08, aprobación comercial | Facturación sandbox completa, producción desactivada |
| 17 | G16 | G12, G14, G15 | Límites de dispositivos en PRO (3) y ULTRA (10) con RU |
| 18 | RU | G12, G16 | Capa transversal de entitlements y uso restringido por plan |
| 19 | G05-B | G16 y RU, más gate final | GitHub, Dokploy, DNS, HTTPS y verificación pública |

G00 es una dependencia identificada durante la inspección, no un objetivo estético añadido. G05 se cierra únicamente cuando A y B estén verificados. Las correcciones no relacionadas que aparezcan se registran y se consultan, en vez de ampliar alcance sin aviso.

## 5. Trabajo y aceptación por objetivo

### G00 — Línea base y seguridad del núcleo (prerrequisito)

**Tareas:**
1. Inventariar cambios existentes, proceso activo, versión servida y ubicación de DB sin exponer secretos; backup consistente y restauración de prueba en copia.
2. Ejecutar diagnósticos actuales sin tuberías que oculten el código de salida; corregir solo bloqueos reales y dependencias de los objetivos.
3. Reproducir cancelación de picker, persistencia de raíces, revisión/aprobación/apply parcial, STOP y recuperación con una biblioteca aislada de prueba.
4. Auditar normalización, colisiones, espacio y contabilidad de duplicados; conservar metadatos válidos y variantes de álbum/grabación. Eliminar estrategias anunciadas pero inexistentes.
5. Validar copia/hash/no-clobber, aislamiento de pendientes, interrupción y reanudación/recuperación, sin tocar la biblioteca real para pruebas destructivas.

**Archivos:** `apps/server/src/app.ts`, `config.ts`, `services/filesystem.ts`, `services/organization-naming.ts`, `platform/macos/folder-picker.ts`, `db/catalog.ts`; pruebas existentes de naming, espacio, scan, backend y recovery.

**AC-G00:** con fixtures propios, un lote mixto ejecuta los seguros y deja ambiguos intactos; cancelación no borra grants; STOP deja un estado recuperable; originales y destinos ajenos conservan hashes; un error de espacio no produce éxito ficticio. Registrar qué build fue ejercitado. No usar música real en pruebas de mutación.

### G01 — Sin modo visible

**Tareas:** retirar control/textos/props y campos API innecesarios; desacoplar política interna de estados del flujo; migración versionada de defaults/configuraciones antiguas sin reset de catálogo; mantener planes históricos como auditoría. Revalidar/reaprobar planes antiguos o incompatibles antes de ejecutarlos, nunca convertirlos automáticamente en operaciones aprobadas. Corregir reset para no resucitar `simulation`; actualizar documentación histórica que induce a error.

**Archivos:** `features/settings/ProviderSettings.tsx`, `features/organization/PlanPreview.tsx`, `app/App.tsx`, `types.ts`, `lib/api.ts`, `apps/server/src/app.ts`, `db/catalog.ts`, nueva migración, `AGENTE.md`, `README.md`.

**AC-G01:** no existe selector/etiqueta de modo en ES/EN; instalación nueva, datos antiguos y reset no provocan `SIMULATION_CANNOT_WRITE`; preview/aprobación no escriben, aplicar exige revisión válida y funciona con pendientes. Pruebas: extender `tests/integration/backend-api.test.ts` y agregar `tests/integration/mode-migration.test.ts`.

### G02 — Contraste coherente

**Tareas:** inventariar componentes/estados de todas las vistas; definir tokens primitivos → semánticos → componente; sustituir fondos/textos hardcoded, incluyendo selectores nativos, avisos y portales de diálogos. Persistencia y aplicación de tema al arrancar para evitar destello claro; ES/EN inmediato. Añadir opción seguir sistema y reducir movimiento sin pisar elección manual.

**Archivos:** `apps/web/src/styles.css`, nuevos `apps/web/src/theme/{tokens.css,registry.ts,ThemeProvider.tsx}`, `components/Primitives.tsx`, `features/settings/ProviderSettings.tsx`, `app/App.tsx`.

**AC-G02:** texto normal al menos 4.5:1 y texto grande al menos 3:1; indicadores/controles relevantes al menos 3:1 frente al color adyacente, aplicando las excepciones normativas y sin depender únicamente de color.[3][4] Medir colores computados y fondos compuestos, no asignar una cifra por mirar capturas. Verificar claro/Tokyo/GitHub Dark/Dracula en todas las vistas y estados; texto seleccionado, placeholders y diálogos legibles. Pruebas nuevas `tests/e2e/themes.spec.ts` y `tests/unit/theme-tokens.test.ts`; revisión visual real complementaria.

### G03 — Recomendación opcional por perfil

**Catálogo inicial propuesto:**
- Familia kawaii: Sakura, Lavender Dream, Peach Cloud; recomendación inicial para mujer si elige recibirla.
- Familia Tokyo: Tokyo Night, Tokyo Storm, Midnight Blue; recomendación inicial para hombre si elige recibirla.
- Familia expresiva/inclusiva: Pride Pastel, Spectrum Night, Aurora, Trans Pastel; recomendación por afinidad autodeclarada, no por inferencia.
- Neutrales: GitHub Dark, Dracula, Paper, Monochrome; para cualquiera o sin declarar preferencias.

**Tareas:** género opcional/autodescripción y afinidad estética separada; recomendaciones explicables, selector completo, previsualización, restablecer recomendación solo por acción explícita. No reemplazar un tema manual al editar género ni usar orientación como deducción de ese dato.

**Archivos:** `theme/registry.ts`, nuevo `theme/recommendations.ts`, `features/profile/Profile.tsx`, `features/settings/Personalization.tsx`, preferencias API/DB.

**AC-G03:** todos los temas están disponibles para todas las cuentas; sin género se puede terminar onboarding; cambiar identidad no cambia una elección manual; preferencias sobreviven logout/login y son privadas. `tests/unit/theme-recommendations.test.ts`, `tests/e2e/profile-personalization.spec.ts`.

### G04 — HOME predeterminado

**Tareas:** añadir ruta `/` HOME y navegación Inicio/Biblioteca; bienvenida con propuesta de valor y registro/login, y versión autenticada con saludo, accesos a importar/organizar/escuchar, recientes reales y estado de biblioteca. Estado vacío útil, sin canciones ficticias. No bloquear usuario recurrente con un tour obligatorio.

**Archivos:** `app/App.tsx`, nuevos `app/routes.tsx`, `features/home/Home.tsx`, `components/Sidebar.tsx`, `types.ts`.

**AC-G04:** abrir URL base o iniciar sesión sin destino explícito muestra HOME; Biblioteca permanece accesible; refresh/back/enlace profundo no rompe navegación ni expone contenido privado; no hay redirección a Configuración por defecto. `tests/e2e/home.spec.ts`.

### G05-A — Arquitectura, cuentas y sesiones

**Tareas:**
1. Spike acotado y con criterios de salida para el componente local, callback seguro, uploads resumibles y reproducción Range cloud. Si falla D01, presentar alternativa antes de ampliar producto.
2. Separar módulos de API por dominio; adoptar una solución de autenticación mantenida compatible con Fastify y despliegue propio, evaluada por seguridad/mantenimiento, sin criptografía casera.
3. Registro/login, verificación de correo, recuperación de contraseña, logout, revocación de sesiones/dispositivos y límites de intentos. Contraseñas con hash moderno; cookies `HttpOnly`, `Secure` en HTTPS, SameSite adecuado, CSRF/Origin, expiración/rotación. No exponer tokens en frontend persistente.
4. Quitar bootstrap anónimo como acceso a datos en cloud; endpoints públicos mínimos y explícitos. Reautenticación para cambios sensibles; administración restringida, sin acceso musical entre usuarios por defecto.
5. Implementar aislamiento de biblioteca, recursos, workers, audio, exportación, fotos, preferencias y facturación; autorización repetida al ejecutar jobs, no solo al encolarlos.
6. Migración de propiedad de catálogo local con autorización en el equipo, sin subida automática de audio. Implementar sincronización versionada/reintentos/deletes lógicos y conflictos visibles.
7. Adaptador de almacenamiento cloud privado, rutas opacas y cuotas; uploads reanudables, validación de formato real, checksum, limitación de parser/recursos, limpieza de parciales. Rango HTTP y streaming autenticado sin cargar todo el archivo en RAM.
8. Crear política de privacidad/retención/exportación de datos; separar secretos por entorno y por servicio. Correo de verificación y reset requiere SMTP/proveedor real antes de release.

**Archivos existentes:** `apps/server/src/app.ts`, `config.ts`, `db/catalog.ts`, `security/*`, `apps/web/src/lib/api.ts`, `app/App.tsx`.

**Nuevos propuestos:** `apps/server/src/{auth,routes,storage,sync}/`, `apps/server/src/db/cloud/`, `apps/web/src/features/auth/`, `apps/local/` como límite de responsabilidad a concretar en el spike, `docs/architecture/hybrid.md` y `docs/SECURITY.md`. Estos directorios no se crean durante planificación.

**AC-G05-A:** dos cuentas de prueba independientes pueden registrarse/verificar correo/entrar/salir/restablecer acceso; A no puede leer/modificar pistas, raíz, job, audio, foto, playlist, descarga o suscripción de B cambiando IDs. Login no concede permisos de carpetas. Sesión revocada pierde acceso y audio. Subida interrumpida reanuda sin duplicar; equipo apagado no figura con audio disponible salvo subida. Migración conserva conteos y hashes de los datos de ensayo.

**Pruebas:** nuevos `tests/security/tenant-isolation.test.ts`, `tests/integration/auth.test.ts`, `tests/integration/sync.test.ts`, `tests/integration/uploads.test.ts`, `tests/e2e/multiuser.spec.ts`; correo real de entorno de prueba, no solo mocks de formularios.

### G06 — Multidispositivo y textos honestos

**Tareas:** quitar «Only on this device»/«Solo en este dispositivo»; sustituir branding exclusivamente local por RESONANCE. Menú lateral colapsable y navegación móvil, tablas con columnas prioritarias/detalle desplegable, menús táctiles, safe areas, formularios y reproductor sin desbordamiento. Estados «disponible», «requiere equipo origen» y «no subido» donde importen, no como restricción global de marca.

**Archivos:** `components/Sidebar.tsx`, `app/App.tsx`, `styles.css`, `features/library/CollectionView.tsx`, `features/tracks/TrackTable.tsx`, nuevos componentes responsive.

**AC-G06:** recorrer flujos en anchos propuestos 360, 390, 768, 1024 y 1440 CSS px; navegación con teclado/táctil y zoom, foco no tapado por reproductor; áreas táctiles preferentemente 44 px. UI funcional en Safari/iOS y Chrome/Android reales antes de declarar esas plataformas certificadas. Si no hay dispositivo, registrar validación pendiente; emulación no sustituye prueba física de audio/background. `tests/e2e/responsive.spec.ts`.

### G07 — Playlists completas y descargas

**Modelo y editor:**
- Manual: crear, renombrar, portada, descripción, agregar selección de cualquier vista, retirar miembros, reordenar con arrastre y botones accesibles, duplicar y eliminar lista sin borrar pistas.
- Inteligente: grupos `TODAS` (AND), `CUALQUIERA` (OR) y exclusiones (NOT), combinables/anidados con límites de profundidad y tamaño. Valores múltiples mediante chips, no un string separado por comas ambiguo.
- Campos iniciales: género/subgénero/etiqueta, artista, artista del álbum, álbum, título, año/intervalo, duración, formato, bitrate cuando se conozca, favoritos, fecha de incorporación, fecha/contador de reproducción, tipo de versión, disponibilidad y calidad de metadatos. BPM/ánimo/energía solo cuando existan tags, edición manual o análisis aprobado; sin inventar valores para rellenar filtros.
- Operadores según tipo: es/no es, pertenece/no pertenece, contiene, rango, anterior/posterior y presente/ausente. Nulos con semántica explícita; validación Zod y SQL parametrizado/allowlist, nunca SQL provisto por usuario.
- Orden por campo/aleatorio con semilla estable, límite de pistas o duración, evitar repetición opcional por archivo/grabación sin eliminar versiones legítimas. Para mezcla, seleccionar varios ritmos con OR; como opción avanzada, cupos ponderados por género con política explícita para canciones multigénero y escasez.
- Preview con canciones, conteo, duración, faltantes, exclusiones y explicación de por qué cada pista entra. Smart actualiza al cambiar catálogo; permitir congelar como manual y añadir inclusiones/exclusiones fijas.
- Historial/contador de reproducción se habilita al completar G08; el editor no mostrará datos inventados mientras tanto.

**Ejemplos de aceptación:** `(Rock OR Metal OR Salsa) AND año entre 1990 y 2025 AND NOT versión Live`; `(artista Queen OR Nirvana) AND favorita`; lista manual con tres versiones de una canción; mezcla ponderada con suma validada, sin contar dos veces una pista con varias etiquetas.

**Exportación/importación:**
1. Descargar una lista como archivo con `Content-Type`, nombre seguro, `Content-Disposition: attachment`; frontend recibe blob/enlace descargable y confirma resultado verificable. Varias listas: ZIP con archivos separados; clic repetido no falla porque ya exista un archivo en el servidor.
2. Separar acción **Descargar** de **Guardar en carpeta autorizada**; esta última no sobrescribe sin resolución explícita. No exigir destino local para descargar metadatos válidos.
3. M3U8 UTF-8 con `#EXTM3U`, `#EXTINF`, orden preservado y rutas relativas basadas en ubicación elegida del paquete/biblioteca; XML plist con IDs/referencias válidas y `file:` URLs correspondientes al equipo de importación. No usar rutas del VPS como si fueran rutas del Mac.
4. Un archivo de playlist no contiene el audio. Explicar ubicación/mapeo de música, pistas no disponibles y exportación como snapshot de reglas. Ofrecer manifiesto de relocalización y opción futura de paquete con audio propio, sujeta a tamaño/permiso/coste; no empaquetar toda la música por defecto.
5. Importar M3U/M3U8/XML mediante parser seguro con entidades externas desactivadas, límites y preview; mapear a archivos del usuario por identidad/ruta confirmada, reportar faltantes, no ejecutar URLs ni aceptar traversal.
6. Validar importación en Apple Music en biblioteca de prueba: primero audio propio accesible en su biblioteca, luego XML y comprobación de pistas realmente importadas, ya que Music puede omitir ítems no disponibles.[6] Documentar transferencia mediante herramientas de Apple al dispositivo.[9] No prometer que una URL streaming autenticada funcione como pista local de Apple Music o iPod.

**Archivos:** `features/playlists/Playlists.tsx`, nuevos `PlaylistEditor.tsx`, `PlaylistDetail.tsx`, `RuleBuilder.tsx`; `lib/api.ts`, `types.ts`; separar `routes/playlists.ts`, ampliar `services/playlists.ts`, crear `services/playlist-rules.ts`, migraciones de miembros/reglas/exclusiones.

**AC-G07:** reglas guardadas devuelven conjunto exacto esperado; mixtas incluyen varios ritmos; editar catálogo actualiza smart pero no altera snapshot manual; ninguna pertenencia legítima desaparece por dedupe. Botones descargan bytes no vacíos y archivos parseables; resultado E2E inspecciona contenido/orden/rutas, no solo toast. Reimportación real en Music y M3U8 en un reproductor compatible; faltantes se explican y no se ocultan.

**Pruebas:** extender `tests/unit/playlists.test.ts`; nuevos `tests/unit/playlist-rules.test.ts`, `tests/integration/playlist-crud.test.ts`, `tests/e2e/playlist-downloads.spec.ts`. Fixtures con acentos, &, rutas con espacios, nulos, multigénero y formatos incompatibles.

### G08 — Reproductor y cola global

**Tareas:** un solo motor de audio fuera del árbol de cada vista; mini player persistente y menú `/player`; cola desde biblioteca, álbum, selección o playlist completa paginada. Reproducir ahora/siguiente/al final, anterior/siguiente, pausa, STOP, seek, volumen, repetición una/todas y aleatorio reversible; mostrar carátula/título/artista/álbum/duración/disponibilidad. Evitar doble reproducción y distinguir STOP de audio de STOP de organización.

Persistir cola/progreso por cuenta/dispositivo sin autoplay al iniciar sesión; conflictos entre dispositivos no pisarán una sesión activa. Historial/favoritos y contador con regla documentada, sin contar cada evento `play` como escucha completa. Teclas multimedia y pantalla bloqueada mediante detección de Media Session: su disponibilidad depende del navegador, y algunos dispositivos requieren gesto para iniciar audio.[2]

Endpoint streaming con permisos por pista, `Range`, cancelación, errores y formatos soportados. Primera entrega conserva originales; incompatibles se explican. Transcodificación de reproducción, gapless/crossfade y caché offline son extensiones separadas sujetas a spike/costes; no se simulan con controles sin función. Limpieza segura de caché privada al salir.

**Archivos:** nuevos `features/player/{PlayerProvider.tsx,PlayerPage.tsx,MiniPlayer.tsx,Queue.tsx}`, `lib/playback.ts`; `app/App.tsx`, `TrackTable.tsx`, `PlaylistDetail.tsx`; `routes/stream.ts`, `storage/*`, modelos de reproducción.

**AC-G08:** reproducir playlist completa, cambiar varias vistas sin cortar, next/seek/aleatorio/repetición/STOP efectivos; siguiente pista y pérdida de disponibilidad con comportamiento explícito, sin bucles infinitos de error. Aislamiento de audio entre cuentas, y Range real responde sin transferir el archivo entero. Verificación auditiva real de archivos autorizados de prueba; no declarar éxito solo por renderizar `<audio>`. `tests/unit/player-queue.test.ts`, `tests/integration/audio-range.test.ts`, `tests/e2e/player.spec.ts`.

### G09 — Biblioteca, menú contextual y borrado seguro

**Tareas:**
1. Biblioteca, recientes, canciones, artistas, álbumes, géneros y favoritas con búsqueda persistente, filtros combinables y links de drill-down. Lista/cuadrícula, carátulas, agrupación por artista del álbum y edición, orden multicolumna, columnas elegibles/redimensionables y densidad.
2. Tabla comparable a V03: título, duración, artista, álbum, género, año, pista/disco, formato, bitrate, tamaño, fecha de incorporación/modificación, favorito y estado; datos faltantes como desconocidos, no porcentajes fijos de «confianza» inventados.
3. Paginación/virtualización para toda la biblioteca, selección explícita de visibles o todos los resultados de una consulta congelada. Mostrar total/seleccionados y alcance de acciones masivas; no limitar silenciosamente a las primeras filas.
4. Menú común por clic derecho, tres puntos y teclado: reproducir, siguiente/final de cola, agregar a playlist/nueva, favorito, información/editar metadatos, ir a álbum/artista, comparar versiones, exportar selección y mostrar ubicación cuando el componente local lo permita. Acciones G07/G08 se conectan al completar sus objetivos, sin botones muertos en la versión final.
5. Controles de Visualización: mostrar columnas, densidad, lista/cuadrícula, búsqueda, cola, estado. No mostrar «letras», «crear estación» o «abrir URL de transmisión» como funciones listas si no existe implementación/licencia; se difieren explícitamente.
6. Importar catálogo/playlists con preview y exportar metadatos sin exponer paths nativos en respuestas de otros dispositivos. La importación no sobrescribe archivos de audio.

**Semántica obligatoria de eliminación:**

| Acción | Efecto | Recuperación |
|---|---|---|
| Quitar de playlist | Solo la membresía; conserva catálogo y archivo | Deshacer/reagregar; smart crea exclusión explícita |
| Quitar de biblioteca | Excluir del catálogo de esa cuenta y retirar referencias activas; archivo intacto | Restaurar exclusión; tombstone evita reaparición silenciosa al reescanear |
| Enviar archivo a papelera | Afecta el archivo físico exacto autorizado; muestra referencias/playlist/álbum afectados | Papelera nativa local, o papelera lógica cloud con retención propuesta de 30 días, sujeta a aprobación/coste |

Borrado físico con confirmación clara incluso individual; lotes muestran cantidad, bytes, impacto y reversibilidad. Revalidar identidad y permisos inmediatamente antes; registro por archivo y actualización de catálogo solo tras éxito. Fallos se aíslan. Si no existe papelera fiable, bloquear ese elemento con explicación; nunca hacer fallback a borrado permanente. Restaurar sin sobrescribir archivos surgidos después. Purga cloud/retención y derechos de eliminación de cuenta se diseñan por separado; no borrado implícito por cancelar suscripción.

Comparador de duplicados: grupos por hash+tamaño; candidatos por evidencia musical aparte; duración, álbum/edición, formato y escucha lado a lado. Recomendaciones, no eliminación automática. Cada aparición legítima puede conservarse aunque comparta audio.

**Archivos:** `features/tracks/TrackTable.tsx`, `features/library/CollectionView.tsx`, nuevos `TrackContextMenu.tsx`, `DuplicateReview.tsx`, `TrashView.tsx`, servicios de selección/paginación; `routes/tracks.ts`, `services/trash.ts`, adaptadores `platform/*`, `db/*`.

**AC-G09:** todas las vistas comparten acciones coherentes y selección completa; quitar miembro nunca elimina audio; excluir catálogo sobrevive rescan; papelera/restauración real con fixtures verifica hashes y no-clobber; lote parcialmente fallido informa éxitos/fallos/pendientes sin perder archivos. Nirvana studio/unplugged y la misma grabación en dos álbumes no se fusionan sin decisión. `tests/integration/trash.test.ts`, `tests/security/trash-boundaries.test.ts`, `tests/e2e/library-actions.spec.ts`, regresiones de naming/duplicates existentes.

### G10 — Estilos en Personalización

**Interpretaciones propuestas (por revisar):**

| Nombre pedido/estilo | Propuesta visual, nunca significado supuesto como hecho |
|---|---|
| Spatial UI, predeterminado | Capas y profundidad moderada, paneles flotantes, jerarquía clara, sin exigir 3D/VR |
| spacemorphismo | Preset cósmico/espacial: profundidad y fondos orbitales discretos |
| animalismo | Motivos de fauna/mascotas opcionales; aclarar si el usuario quería decir otro movimiento visual |
| minimalismo | Superficies limpias, poco adorno, tabla legible y alta densidad opcional |
| maximalismo | Color/textura/portadas expresivas en decoración, área de lectura controlada |
| claimorfismo | Interpretación propuesta: claymorphism, formas de arcilla suaves y volumétricas; conservar nombre hasta confirmación |
| Glassmorphism | Cristal translúcido con fondo sólido alternativo |
| Neumorphism accesible | Relieve acompañado de bordes/foco, nunca dependiente solo de sombras |
| Flat / Editorial | Interfaz plana o tipográfica, simple y apta para equipos modestos |

**Tareas:** tokens de forma/sombra/espaciado/movimiento separados del color; galería de previsualización con tabla, formulario y player reales; control de adornos, intensidad, movimiento reducido y restaurar. No cargar escenas pesadas ni ruido visual en el área de trabajo. Los nombres ambiguos se aprueban antes de diseñar sus presets definitivos.

**Archivos:** `theme/styles.ts`, `theme/tokens.css`, `features/settings/Personalization.tsx`, componentes comunes y preferencias API.

**AC-G10:** cada estilo de la lista aprobada tiene diferencias visibles y funcionales, no solo cambia el nombre; tema y estilo independientes; todas las combinaciones admitidas conservan contraste/foco/acciones. Pruebas automáticas de matriz de tokens y smoke visual por estilo con tema claro/oscuro; no proclamar probado el catálogo completo si faltan combinaciones. `tests/e2e/personalization-styles.spec.ts`.

### G11 — Perfil y avatar

**Campos propuestos:** username único, nombre/apellidos y nombre visible, correo verificado; avatar; biografía/pronombres/género opcionales; idioma, zona horaria, país/ciudad, dirección estructurada opcional y privada; enlaces a redes, web y canales; atributos musicales/intereses voluntarios; privacidad, sesiones/dispositivos y exportar/eliminar cuenta. Fecha de nacimiento, teléfono e identificadores legales no se pedirán por rutina: solo si existe una finalidad aprobada. Datos de facturación separados del perfil público.

**Avatar:** iniciales con fallback a username, galería original/licenciada de genéricos y subida JPEG/PNG/WebP. Validar firma, tamaño/píxeles, orientación; recodificar imagen para eliminar EXIF; rechazar formatos activos no sanitizados. Editor con zoom, desplazamiento, recorte cuadrado, máscara circular de preview y alternativas por teclado. Guardar región/proporción y derivados; límites propuestos de 5 MB y control de dimensión, revisables. Borrar versión anterior al confirmar nueva, preservando recuperación ante fallo de guardado.

Enlaces sociales inicialmente como URLs verificadas en formato/seguridad; una URL no significa «cuenta vinculada». Si se aprueba vinculación real, implementar OAuth por proveedor con scopes mínimos y revocación, sin pedir contraseñas externas. No abrir un directorio social público por defecto.

**Archivos:** nuevos `features/profile/{Profile.tsx,AvatarEditor.tsx,SocialLinks.tsx}`, `routes/profile.ts`, `services/avatar.ts`, almacenamiento y modelos de cuenta/preferencias.

**AC-G11:** subir imagen, elegir recorte, guardar/recargar y conservar miniatura; genérico/iniciales/foto alternables; error/cancelación no pierde avatar válido. Ninguna cuenta lee foto/correo/dirección privados de otra. Links no ejecutan `javascript:` ni introducen XSS. `tests/integration/profile.test.ts`, `tests/security/avatar-upload.test.ts`, `tests/e2e/profile-personalization.spec.ts`.

### G12 — Suscripciones y pagos, gratis al inicio

**Catálogo comercial propuesto, sujeto a aprobación:**

| Plan | Precio propuesto | Beneficio de reproducción propuesto |
|---|---|---|
| Free | Gratis | Organizador, depuración, listas/exportación y reproducción local; durante lanzamiento todas las funciones habilitadas por la política gratuita aprobada |
| Listen | USD $1/mes | Reproducción remota del audio propio subido, con cuota moderada por definir |
| Listen Plus | USD $2/mes | Mayor cuota de transferencia/almacenamiento y preferencias de reproducción sincronizadas |
| Listen Max | USD $3/mes | Mayor cuota y opciones de reproducción adicionales realmente implementadas; no prometer transcodificación/offline sin aprobarlas y probarlas |

No publicar cuotas «ilimitadas». Definir almacenamiento, transferencia, concurrencia y costes reales antes de ofrecer planes: servidor, backups, correo, comisión fija/variable del procesador, impuestos y soporte. A estos precios una cuota mal elegida puede hacer inviable el servicio. La propuesta no estima rentabilidad sin datos. No restringir música local ni borrar biblioteca por impago; vencimiento afecta solo prestaciones remotas definidas y se comunica sin sorpresas.

**Tareas:** seleccionar procesador disponible para país/entidad del usuario; preferencia técnica inicial Checkout/Billing alojados (por ejemplo Stripe si es elegible), con portal de facturas/cancelación y métodos locales del proveedor donde correspondan. Alternativa por disponibilidad, no integrar múltiples gateways sin necesidad.

Separar catálogo de planes, entitlements y proveedor; configuración explícita `billingMode=free` inicial, sandbox aparte, producción desactivada hasta autorización. Consentimiento de renovación, precio total/moneda/impuestos visibles, cancelación sencilla, recibos, actualización de pago y política de devolución. Ningún método se activa solo por visitar una URL de retorno.

Webhooks con firma validada sobre cuerpo original, idempotencia por evento y operación, tolerancia a reintentos/orden distinto y reconciliación con estado del proveedor. Estados active/past_due/canceled y cambios de plan comprobados; no confiar en un precio/plan enviado por frontend. Datos de tarjeta nunca en DB/logs/chat.

**Archivos:** nuevos `routes/billing.ts`, `billing/{provider.ts,plans.ts,entitlements.ts,webhooks.ts}`, `features/billing/`, migraciones y documentación de operación/privacidad.

**AC-G12:** recorrido sandbox real checkout→evento→derecho de reproducción; firma falsa rechazada, duplicado no cobra/otorga doble, impago/cancelación/renovación/cambio de plan/portal probados. En lanzamiento gratis no aparece cobro obligatorio ni tarjeta, y no existen suscripciones creadas sin consentimiento. Producción permanece apagada; activación comercial posterior no queda autorizada por aprobar el desarrollo. `tests/integration/billing.test.ts`, `tests/security/billing-webhooks.test.ts`, `tests/e2e/billing.spec.ts` y evidencia sandbox del proveedor.

### G13 — R manuscrita, onda y favicon

**Tareas:** crear variantes originales de R vectorial manuscrita en primer plano, onda posterior pastel con dos valles y un pico central. La referencia a campana de Gauss se interpreta visualmente, no como una función gaussiana exacta con valles. Presentar propuestas antes de fijar la marca.

Paletas de R negro/azul/rojo/lila y colores fuertes adicionales; onda y fondo independientes con combinaciones legibles. Exportar SVG/ICO/PNG y tamaños para pestaña e instalación; miniaturas en Personalización y opción restaurar recomendación. Favicons mediante URL versionada según variante para evitar caché cruzada; no incluir foto/género/datos sensibles en URL. Icono general neutro antes del login y al salir.

**Archivos:** `apps/web/public/brand/`, entrada HTML del proyecto, `theme/icon-variants.ts`, `features/settings/Personalization.tsx`, componente de marca, manifest si se aprueba PWA.

**AC-G13:** ninguna nota musical como marca/favicon principal; R y onda distinguibles en previsualización de 16/32/48 px, pestaña real y tamaños mayores. Cambio de color conserva preferencia propia, no de otra cuenta; cache/logout verificados. El icono de una PWA ya instalada puede requerir actualización/reinstalación según plataforma: no prometer cambio instantáneo del icono del sistema. `tests/e2e/favicon.spec.ts` y revisión visual de propuestas aprobadas.

### G14 — Detección temporal de dispositivo, vinculación al login y reproducción local por dispositivo

**Petición:** detectar el dispositivo donde se abre la app y usar los archivos locales de ese dispositivo; si el formato y el navegador lo soportan, reproducir esos archivos locales; dispositivo nuevo debe mostrar HOME indicando nuevo dispositivo, usar login y vincular el dispositivo al usuario que lo está usando; así se puede organizar carpetas locales según el acceso en el dispositivo y el dispositivo, importar/crear biblioteca, playlist y demás.

**Tareas:**
1. Definir estrategia de detección conservadora: tipo de dispositivo/navigator hints/estado de la app, sin depender de datos sensibles no necesarios; cada heurística documentada y comprobable; cuando no se puede determinar, tratar como dispositivo no identificado.
2. En dispositivo no vinculado: detección de nuevo dispositivo, mostrar HOME indicando nuevo dispositivo, pedir login/invitación y vincular dispositivo al usuario tras autenticación válida. Sin login no apropiarse de biblioteca ajena.
3. Reproducción local por dispositivo: usar APIs del navegador para reproducir archivos locales disponibles y autorizados en ese dispositivo; verificar formato/navegador/alcance; mostrar explícitamente disponibilidad/incompatibilidad; no leer archivos sin autorización del usuario en ese dispositivo.
4. Organización local por dispositivo: cuando el dispositivo tiene componente local autorizado, permitir escaneo/importación/organización de carpetas de ese dispositivo; confirmación física en el equipo propietario; nunca operar carpetas de otro dispositivo de forma remota.
5. Separar reproducción local (archivos presentes y autorizados en ese dispositivo) de reproducción cloud (audio subido/expuesto por la cuenta); no mezclar ni ambiguar.
6. Idempotencia y límites de permisos por dispositivo; revocación de vinculación de dispositivo; lógica de dispositivo desconectado/apagado.

**Archivos:** nuevos `apps/web/src/features/devices/`, `routes/devices.ts`, `services/device-detection.ts`, `services/local-playback.ts`; ampliar `app/App.tsx`, `features/home/Home.tsx`, `features/auth/`; modelos `devices`, `device_sessions`.

**AC-G14:** dispositivo nuevo muestra HOME indicando nuevo dispositivo y pide login; tras login válido, dispositivo queda vinculado al usuario; reproducción local solo de archivos autorizados/disponibles en ese dispositivo con formato/navegador compatibles; organización local solo en el equipo propietario; sin login no se accede a biblioteca de otro usuario. Pruebas: `tests/unit/device-detection.test.ts`, `tests/integration/device-linking.test.ts`, `tests/e2e/device-first-run.spec.ts`; matriz de formatos/navegadores documentada y revisada.

### G15 — Datos y bases de datos por dispositivo, tipo visible y historial de dispositivos

**Petición:** manejo de datos y bases de datos identificando el dispositivo; debe mostrarse el dispositivo; en la cuenta, en configuración, debe mostrarse en cada usuario el tipo de dispositivo usado y el historial de dispositivos usados en la app.

**Tareas:**
1. Modelar `devices` como entidad propia: id, usuario, tipo, etiqueta opcional, estado, fecha de vinculación, fecha de último uso, metadatos mínimos aprobados; separar de sesiones y de perfil.
2. Persistencia por dispositivo: registrar uso de dispositivo por usuario; historial de dispositivos usados en la app por usuario; datos locales (grants, caché privada) asociados a dispositivo/sesión; sin mezclar biblioteca de un usuario en dispositivo de otro.
3. Mostrar dispositivo actual en la interfaz adecuada; en Configuración de la cuenta, mostrar tipo de dispositivo vinculado y el historial de dispositivos usados en la app; permitir ver/quitar/nombrar; expulsar sesión/dispositivo como acción explícita.
4. Privacidad y control: lo que se almacena de dispositivo es explícito y configurable; el usuario puede eliminar dispositivo/historial sin perder cuenta ni música; no acumular datos de dispositivo innecesarios.
5. Bases de datos: esquema de dispositivos en cloud; relación con local DB cuando aplica; respaldo/consulta de historial sin exponer datos de otros usuarios.

**Archivos:** nuevos `db/cloud/devices.sql`, modelos `Device`, `DeviceHistory`; `routes/devices.ts`, `features/settings/AccountDevices.tsx`, `features/profile/Profile.tsx`.

**AC-G15:** usuario puede ver dispositivo actual y el historial de dispositivos usados en la app desde Configuración de la cuenta; tipo de dispositivo visible; quitar/dispositivo revoca acceso local y limpia sesiones asociadas sin borrar música de otros usuarios; histórico conserva lo explícito aprobado. Pruebas: `tests/integration/devices.test.ts`, `tests/security/device-data.test.ts`, `tests/e2e/account-devices.spec.ts`.

### G16 — Límites de dispositivos en PRO y ULTRA con RU

**Petición:** en versiones PRO y ULTRA limitar uso en varios dispositivos; PRO para 3, ULTRA para 10 dispositivos.

**Tareas:**
1. Definir qué significa límite de dispositivos: dispositivos vinculados, dispositivos simultáneamente activos, o ambos; documento de decisión explícito antes de implementar.
2. Entitlements por plan: Free, PRO (3 dispositivos), ULTRA (10 dispositivos); verificación de límite al vincular/dispositivo nuevo y al iniciar sesión; sin limitar música local ya organizada ni borrar biblioteca por impago.
3. UI/UX de límites: mostrar límite actual, dispositivos usados, acciones de reemplazo/quitar y mensaje claro al alcanzar el límite; no invisibilizar ni vigilar de forma invasiva.
4. RU (restricted use) como capa transversal: gating de funciones por plan, aplicación de límites de dispositivos, auditoría de uso de entitlement; sin código de cobro en frontend.
5. Separar titularidad de dispositivo de disponibilidad simultánea según se decida; si un usuario quita un dispositivo, liberar plaza si corresponde.

**Archivos:** `billing/entitlements.ts`, `billing/plans.ts`, `services/device-limits.ts`, `routes/billing.ts`; actualizar `features/settings/AccountDevices.tsx`, `features/devices/`.

**AC-G16:** PRO limita a 3 dispositivos, ULTRA a 10, Free sin ese límite de dispositivos; al alcanzar el límite se muestra mensaje y acciones claras; quitar/dispositivo libera capacidad; límite comprobado en vinculación e inicio de sesión; sin vigilancia invasiva ni comparación entre usuarios. Pruebas: `tests/integration/device-limits.test.ts`, `tests/security/entitlements.test.ts`, `tests/e2e/device-limits.spec.ts`; validado contra planes reales en sandbox.

### G05-B — Publicar y desplegar en NICOP sin afectar otros proyectos

**Precondiciones:** objetivos funcionales aprobados y verificados localmente; arquitectura y política de datos aceptadas; cuentas SMTP/proveedor/infra disponibles por canal seguro; confirmar repo canónico y coste/capacidad del VPS. No reutilizar credenciales vistas en chat ni guardarlas en Markdown.

**Secuencia futura:**
1. Revisar diff/secretos/licencias, documentación y resultados; construir una versión reproducible con migraciones y backup/restore probado. Aclarar qué partes del componente local se distribuyen y cómo se actualizan.
2. Publicar en remoto confirmado; verificar commit exacto en GitHub y marcar release. No cambiar `origin` ni asumir que ambas organizaciones son equivalentes.
3. Consultar inventario/capacidad del Contabo NICOP y proyectos Dokploy; crear proyecto **nuevo y dedicado** RESONANCE, sin reutilizar base de datos, volúmenes, dominios o credenciales de ONCOORCH/NICOP.
4. Servicios aislados: web/API, worker si se necesita, PostgreSQL y almacenamiento privado aprobado. Contenedor no-root, healthchecks, límites, red interna, sin puertos de DB públicos y sin mounts del host completos. Credenciales por entorno en Dokploy, no `.env` del repo.
5. Desplegar staging con cuentas de ensayo, ejecutar migraciones y probar recuperación. Bind interno del contenedor y proxy/Host/Origin configurados para el dominio real, no simplemente cambiar loopback a Internet.
6. Crear/verificar dominio `resonance.oncoorch.com` en el proyecto. Consultar zona Cloudflare y DNS existente; crear A/AAAA o CNAME según destino realmente verificado, evitando registros en conflicto. No inventar IP del VPS ni publicar un AAAA sin IPv6 operativo.
7. Configurar HTTPS con certificado válido y TLS estricto; comprobar redirects, cookies seguras, seguridad proxy, CSRF, headers y healthchecks. Definir tratamiento de proxy/cache del audio y subida según límites/condiciones vigentes; nunca cachear contenido privado como público.
8. Verificar desde fuera: HOME, alta/verificación/login, cuentas aisladas, subida/reproducción/seek, playlist/export, perfil/tema, logs sin secretos, rate limits y reinicio sin pérdida. Validar publicación desde navegador y lectura posterior de dominio/DNS/Dokploy y commit desplegado.
9. Monitorizar disponibilidad, errores, jobs, espacio, transferencia y backups cifrados; restaurar backup en instancia aislada. Rollback a imagen previa solo con esquema compatible o restauración controlada, sin perder cambios nuevos inadvertidamente.
10. Entregar URL HTTPS, commit/image digest, proyecto/app IDs, registros DNS relevantes, pruebas y runbook sanitizado. No declarar VPS «listo» con solo respuesta HTTP 200.

**Archivos futuros:** `Dockerfile`, nuevo `deploy/compose.production.yml`, configuración de entorno de ejemplo sin secretos, `docs/DEPLOYMENT.md`, `docs/BACKUP-RESTORE.md`, `docs/TEST-RESULTS.md`, `README.md`, CI `.github/workflows/`.

**AC-G05-B:** el dominio exacto sirve el commit aprobado por HTTPS; flujo multiusuario y audio/download real funciona fuera del equipo local; datos sobreviven reinicio; restauración demostrada; proyectos preexistentes no se modificaron. Facturación continúa gratis/desactivada en producción hasta autorización comercial separada.

## 6. Validación funcional y criterio de cierre

### Gates por objetivo

1. Prueba pequeña que reproduzca el problema o criterio antes de cambiar lógica; no tests ceremoniales ajenos al objetivo.
2. Implementación completa de frontend/API/persistencia/capacidad necesaria.
3. Pruebas de contrato y seguridad afectadas, más recorrido real del usuario con datos de ensayo.
4. Revisión de diff, regresiones y evidencia; actualizar estado solo tras comprobar.

### Gate integrado antes de publicar

Comandos **propuestos, no ejecutados en esta planificación**; los scripts existen en `package.json` salvo nuevas suites que se agregarán con sus objetivos:

```sh
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:security
npm run tags:test
npm run build
npm run test:e2e
npm audit
```

Agregar pruebas de rendimiento existentes y nuevas de paginación/cola/carga multiusuario, con umbrales acordados después de medir hardware/datos de ensayo. Revisar dependencias y hallazgos de auditoría antes de release, sin presentar fallos de herramienta como aprobación. Confirmar app compilada realmente servida, no solamente proceso levantado.

Prueba integrada obligatoria: entrar como A → importar fixture → escanear/auditar → revisar y aprobar lote mixto → aplicar seguros/STOP/recuperar → revisar duplicados/versiones → crear mezcla inteligente/manual → escuchar cola navegando → exportar/importar listas → quitar miembro/excluir catálogo/enviar fixture a papelera/restaurar → cambiar tema/estilo/avatar → salir → entrar como B y comprobar aislamiento. Luego repetir capacidades cloud aprobadas en staging y producción.

No usar la biblioteca real ni la base de datos personal para pruebas destructivas. Lectura real y primera aplicación a música real requieren alcance explícito, backup y confirmación. La certificación Apple Music/iPod se registra por equipo/SO/dispositivo disponible; si no hay hardware, permanece pendiente, no se sustituye por un mock.

## 7. Registro de cumplimiento (actualizar durante implementación)

| Unidad | Aprobación | Implementación | Evidencia/commit |
|---|---|---|---|
| G00 | Pendiente | No iniciada | — |
| G01 | Pendiente | No iniciada | — |
| G02 | Pendiente | No iniciada | — |
| G03 | Pendiente | No iniciada | — |
| G04 | Pendiente | No iniciada | — |
| G05-A | Pendiente | No iniciada | — |
| G05-B | Pendiente | No iniciada | — |
| G06 | Pendiente | No iniciada | — |
| G07 | Pendiente | No iniciada | — |
| G08 | Pendiente | No iniciada | — |
| G09 | Pendiente | No iniciada | — |
| G10 | Pendiente | No iniciada | — |
| G11 | Pendiente | No iniciada | — |
| G12 | Pendiente | No iniciada | — |
| G13 | Pendiente | No iniciada | — |
| G14 | Pendiente | No iniciada | — |
| G15 | Pendiente | No iniciada | — |
| G16 | Pendiente | No iniciada | — |
| RU | Pendiente | No iniciada | — |

Formato de evidencia por entrega: fecha, GOAL y AC, archivos cambiados, pruebas/comandos y códigos de salida, recorrido UI, plataforma real, resultados de seguridad, commit, limitaciones y decisión del usuario. Estados permitidos: pendiente de aprobación → aprobado → en curso → en verificación → cumplido; o bloqueado con motivo. G05 solo cumplido cuando A y B lo estén.

## 8. Decisiones pendientes para la revisión

1. **Arquitectura híbrida recomendada:** mantener organizador local y subir opcionalmente audio privado para reproducir desde otros equipos. Confirmar frente a cloud-only o streaming desde el Mac, que alteran alcance y costes.
2. **Repositorio:** se observó `oncoorch/resonance` en `origin`; confirmar que es el destino canónico de publicación frente al nombre histórico `sherckuith/resonance`.
3. **Estilos:** aprobar/ajustar las interpretaciones de «spacemorphismo», «animalismo» y «claimorfismo». No es necesario bloquear trabajo del núcleo por esta decisión visual, pero sí cerrar esos presets antes de implementarlos.
4. **Perfil/social:** propuesta de datos opcionales privados y enlaces sociales primero; confirmar proveedores si se quiere OAuth real, y si se desea algún perfil público (por defecto no).
5. **Cobros:** confirmar USD, país/entidad del comercio, proveedor disponible y beneficios/cuotas; iniciar gratis, sandbox para pagos y sin activar producción automáticamente.
6. **Retención/capacidad:** aprobar presupuesto de almacenamiento/tráfico y papelera cloud propuesta de 30 días; la papelera nativa local sigue las capacidades del SO. Ninguna caducidad provocará borrado silencioso de originales locales.

Estas decisiones son para revisar el plan, no una petición de contraseñas. Solo se pedirán accesos por canal seguro al llegar a la etapa aprobada que los necesita.

## 9. Referencias de producto y límites documentados

Las propuestas de implementación son decisiones de diseño de este plan, no afirmaciones de compatibilidad ya verificada. V01–V08 están inventariadas en `GOALS.md`. Documentación consultada durante esta planificación, con recuperación en navegador cuando el extractor falló.

### 9.1 Comparación de aplicaciones y decisiones adoptadas

| Referencia verificada | Funcionalidad documentada | Aplicación en RESONANCE |
|---|---|---|
| Apple Music | Reglas con alguno/todos, anidación, límites y actualización en tiempo real; los miembros de smart no se agregan/eliminan directamente.[5] | G07: constructor visual AND/OR/NOT. Las inclusiones/exclusiones manuales se implementan como una extensión explícita de RESONANCE, no se atribuyen a Apple. |
| Apple Music: exportar/importar | Exportación XML e información de playlists, sin audio; la importación incluye únicamente canciones presentes en la biblioteca y omite las no disponibles.[6] | G07: comprobar/importar primero audio propio en Music, luego la playlist; validar faltantes y rutas. La documentación no certifica por sí sola nuestro generador XML o M3U8. |
| Spotify: Play Queue | Cola desde barra de reproducción, añadir por menú contextual, reordenar y retirar/vaciar cola en interfaces de escritorio y móvil.[7] | G08/G09: cola global, tres puntos/clic derecho, arrastre con alternativa accesible; no integrar catálogo Spotify. |
| Navidrome | Navegación basada en tags, compilaciones/multidisco, playlists inteligentes, favoritos/contadores por usuario y acceso a bibliotecas por usuario.[8] | G05/G09: identidad musical por metadatos y propiedad explícita. No inferir álbumes de carpetas recuperadas. No se adopta su compatibilidad de formatos sin probar nuestro player. |
| Apple Music/Finder | Conexión de iPhone/iPad/iPod al Mac, confianza del dispositivo y ajustes de sincronización a través de Finder.[9] | G07: guía de transferencia compatible y prueba de dispositivo; no prometer sincronización directa desde una web. |

### 9.2 Infraestructura y facturación

- Dokploy documenta crear, consultar y listar proyectos mediante su CLI autenticada.[10] El proyecto nuevo deberá complementarse con separación real de redes, datos y secretos; un nombre de proyecto no es por sí solo una barrera de seguridad.
- Stripe requiere firma sobre cuerpo original de webhooks, puede entregar duplicados y no garantiza orden de eventos.[11] G12 adoptará persistencia de eventos, idempotencia y reconciliación; se acepta un evento después de validarlo y persistirlo antes del trabajo asíncrono.
- Stripe publica una lista de países/regiones soportados.[12] Se comprobará la elegibilidad de la entidad comercial, no se asumirá por la ubicación de los clientes ni por el idioma del usuario.
- Cloudflare documenta límites de subida por solicitud; la página consultada indica 100 MB en Free/Pro y 200 MB en Business, y propone fragmentar subidas o un destino DNS-only como alternativas.[13] Revalidar plan real, límites del proxy/origen y timeouts al desplegar; una lista de audio no debe subirse como una sola solicitud gigante.
- **Riesgo contractual de audio:** los términos de CDN contemplan limitar/desactivar el servicio cuando se utiliza para una proporción desmedida de audio u otros archivos grandes sin el servicio de pago apropiado.[14] No se presupone que el proxy estándar sea un CDN musical ilimitado, ni que desactivar caché resuelva por sí solo esa condición. Propuesta: web/API con Cloudflare según configuración aprobada y evaluar una ruta de audio separada DNS-only con HTTPS y controles propios, o almacenamiento/CDN contratado adecuado, antes de G05-B. DNS-only expone el origen y requiere protección/capacidad adicionales; no se activará sin validar esa decisión.

## Sources

[1] https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker
[2] https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API
[3] https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum
[4] https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
[5] https://support.apple.com/es-es/guide/music/mus1712973f4/mac
[6] https://support.apple.com/es-es/guide/music/mus27cd5060f/mac
[7] https://support.spotify.com/us/article/play-queue
[8] https://navidrome.org/docs/overview
[9] https://support.apple.com/en-ca/guide/music/mus86d751aec/mac
[10] https://docs.dokploy.com/docs/cli/project
[11] https://docs.stripe.com/webhooks
[12] https://stripe.com/global
[13] https://developers.cloudflare.com/cache/concepts/default-cache-behavior
[14] https://www.cloudflare.com/service-specific-terms-application-services
