# Music Library Organizer — Arquitectura y especificación

Estado: **MVP LOCAL IMPLEMENTADO; revisión de endurecimiento y certificación sobre datos reales en curso**.
Fecha de revisión documental: 2026-09-10, zona -05:00.
Directorio del proyecto: `/Users/Rattio/music-library-organizer`.
Modelo de esta planificación: `gpt-6-astra`, proveedor `openai-codex`.

> La puerta de implementación fue autorizada por el usuario. Este documento sigue siendo la arquitectura vinculante; una casilla futura de `TASKS.md` no debe interpretarse como capacidad ya certificada.

## 1. Objetivo, alcance y nomenclatura

Aplicación web local para seleccionar música desordenada, analizarla sin alterar los archivos, identificarla de forma conservadora, revisar un plan exacto y organizar copias verificadas por artista/álbum. No conversión de audio, no modificación de la base privada de Música de Apple, no extracción de credenciales.

Se distinguen tres niveles para evitar la ambigüedad de la solicitud:

- **Etapa de trabajo A: PLANIFICAR**, completada.
- **Etapa de trabajo B: IMPLEMENTAR**, autorizada y ejecutada para el MVP local copy-only.
- Dentro de B: **entrega funcional I, organizador** (fases técnicas 1–7 y controles de calidad transversales de fase 9), y **entrega funcional II, playlists** (fase técnica 8, únicamente después de aprobar I).

Las nueve fases técnicas originales se conservan en `TASKS.md`. Tests y documentación empiezan en la fase 1, no se posponen hasta la 9.

### Supuestos explícitos

1. Primera plataforma de aceptación: macOS + Chrome, archivos en discos locales. Windows/Linux tendrán adaptadores y pruebas propias antes de anunciar soporte completo; no se presenta como certificada una plataforma no ensayada.
2. Aplicación personal, de un usuario, sin servidor público, cuentas remotas ni Electron.
3. No se ha seleccionado ninguna biblioteca real ni se ha autorizado acceso a música. La implementación usará exclusivamente fixtures propios hasta una selección explícita.
4. Modo inicial SIMULACIÓN; Internet, OpenAI y portadas desactivados hasta consentimiento. Habilitar Internet permite consultas mínimas necesarias, no una investigación indiscriminada.
5. No se garantiza identificar una grabación sin evidencia. `track01` sin tags ni contexto puede permanecer sin identificar. Fingerprinting acústico/AcoustID es una extensión futura, no una capacidad supuesta de la IA textual.
6. «No modificar durante análisis» significa cero escrituras en origen/destino: catálogo, caché y logs se escriben únicamente en datos privados de la aplicación. Las lecturas pueden actualizar tiempos de acceso administrados por el sistema operativo; no se promete evitar ese efecto del SO.

## 2. Decisiones arquitectónicas

### ADR-01 — Web React + servicio local Node, sin Electron

- Frontend: TypeScript estricto, React, Vite, TanStack Query/Table/Virtual, formularios validados con Zod. Interfaz en español, responsive y accesible por teclado.
- Backend: TypeScript/ESM, Fastify, SQLite, workers y jobs persistentes. Un único servicio local sirve frontend y API en producción.
- SQLite: migraciones SQL versionadas, foreign keys, WAL, política de sincronización durable para journal. Driver elegido mediante prueba de instalación y compatibilidad de Node; `better-sqlite3` es candidato, no una dependencia ya probada. Operaciones pesadas fuera del event loop.
- Lectura: `music-metadata`, que documenta múltiples formatos, tags y lectura por streams.[9]
- Hashes: `node:crypto`, streams de tamaño acotado, nunca cargar toda la colección en memoria.
- Escritura de tags: adaptadores por formato; candidato Mutagen en un helper Python privado y aislado. Mutagen documenta soporte de múltiples contenedores, Unicode y tags avanzados; esto **no demuestra** conservación de todos los campos desconocidos de cualquier archivo.[8]
- FFmpeg/ffprobe: candidatos exclusivamente para generación de fixtures y validación de payload de audio. No se utilizará remux genérico ni recodificación para escribir tags.
- SDK OpenAI oficial, solo importable desde backend. Su documentación identifica Responses como API principal.[12]

El backend se justifica por llaves privadas, acceso nativo explícito, rutas absolutas para playlists, SQLite, streams independientes de la pestaña, journaling durable, escritura por formato y publicación sin sobrescritura. No se añade una plataforma de agentes ni herramientas que ejecuten instrucciones de la IA.

### ADR-02 — Permisos de navegador y Node son independientes

`window.showDirectoryPicker()` se llama directamente por gesto del usuario, en contexto local seguro, inicialmente con `mode: 'read'`. Los handles pueden guardarse en IndexedDB, pero hay que verificar/requerir permiso al recuperarlos. `resolve()` proporciona una ruta relativa al handle; no es una ruta absoluta del SO. La documentación también limita `move()` fuera de OPFS y para directorios.[1]

**Flujo elegido, sin atajos privados:**

1. «Seleccionar carpeta de música» abre `showDirectoryPicker` y permite una vista previa real de lectura desde el navegador.
2. Antes del escaneo persistente del servicio, mostrar «Autorizar esta carpeta al servicio local». Un selector nativo de macOS, lanzado por un adaptador con script fijo y sin interpolación de paths, pide seleccionar la misma carpeta. Se explica por qué existe esta segunda autorización.
3. El servicio recibe la ruta del selector nativo, muestra la ruta completa para confirmación y emite un `root_id` opaco con alcance lectura. Nunca intenta convertir el handle del navegador en una ruta del SO, buscar carpetas por nombre ni recorrer HOME.
4. Se contrasta el manifiesto relativo de la selección del navegador con el origen nativo. Diferencias obligan a repetir/confirmar la selección. Un manifiesto no prueba identidad física: la autoridad del acceso Node es la selección nativa confirmada, no ese contraste. No crear archivos marcadores durante el análisis.
5. Para destino se sigue el mismo permiso explícito; el servicio lo inspecciona en lectura para simulación y adquiere permiso de escritura de aplicación solo al aprobar un plan. Un destino vacío no se puede identificar por contenido: se confirma la ruta nativa visible.
6. Si falta File System Access API, ofrecer selector nativo como alternativa explicada. Si se rechaza la autorización Node, permanece la vista previa limitada; no fingir que existe organización completa.
7. Los grants Node son de sesión, revocables. Tras reiniciar, el catálogo permanece pero no se vuelve a recorrer una raíz hasta reautorizarla. Los jobs se recuperan pendientes de permiso.

No se pedirán dos permisos para simular una seguridad inexistente: el UI explica sus alcances. La viabilidad/UX de este puente es el primer spike bloqueante de implementación. Si se sustituye por un único selector nativo para simplificar, hay que actualizar esta decisión y obtener aprobación; no quitar silenciosamente el requisito `showDirectoryPicker`.

### ADR-03 — Seguridad del servicio local

- Bind solo a loopback; nunca `0.0.0.0`. Origen canónico estable y puertos documentados. Vite solo en loopback y proxy `/api` en desarrollo.
- Allowlist exacta de Host/Origin, sin CORS comodín; rechazar DNS rebinding. No operaciones mutantes mediante GET.
- Sesión local distinta de OpenAI: código aleatorio de emparejamiento de un uso al iniciar, canjeado por sesión HttpOnly/SameSite, protección CSRF en mutaciones. No publicar tokens de sesión en logs ni bundles. Apertura automática opcional con bootstrap de un uso y limpieza inmediata del fragmento URL.
- API de archivos basada en IDs del catálogo y capabilities de raíces; nunca aceptar `source: '/cualquier/ruta'` ni comandos arbitrarios.
- Validar segmentos, `..`, NUL, rutas absolutas, separadores codificados y escapes. Comprobar contención real por componentes, no prefijo textual. Rechazar symlinks/aliases/reparse points en recorridos operativos y entradas no regulares; tratar hard links como identidades de archivo, no ejecutar dos escrituras sobre el mismo inode.
- Al copiar/limpiar/deshacer, trabajar con descriptores y verificar identidad antes/después. `realpath()` seguido de escritura por ruta no elimina por sí solo TOCTOU. Spike debe demostrar apertura no-follow y publicación no-clobber en macOS; si Node no permite proteger el recorrido completo, adaptar un helper nativo descriptor-relative para esas primitivas. Hasta entonces no habilitar operaciones destructivas.
- Origen/destino iguales, anidados en cualquier dirección o alias del mismo árbol: bloquear por defecto y pedir otra selección; evita escanear las copias y ciclos. Exclusión permanente de carpetas técnicas en reescaneos de bibliotecas previamente organizadas.
- Una sola ejecución mutante por destino, bloqueo de instancia/journal. Planes inmutables, acciones idempotentes y precondiciones por archivo.
- Contenido local/remoto no confiable: escapar HTML, sin `dangerouslySetInnerHTML`; sin ejecutar shell desde tags, filenames o modelo; límites a JSON, tags, imágenes y resultados remotos.
- Descargas de portadas con HTTPS, hosts permitidos y validación de cada redirect/DNS; bloquear localhost/redes privadas, protocolos no HTTP(S), tamaño descomprimido excesivo y bombas de imagen. CSP sin scripts externos; no telemetría.
- Datos privados en `~/Library/Application Support/MusicLibraryOrganizer/`, permisos restrictivos. DB y reportes contienen rutas privadas: no subirlos, registrar cuerpos completos de proveedores ni enviarlos en diagnósticos por defecto.

## 3. Estructura prevista

```text
music-library-organizer/
  ARCHITECTURE.md
  TASKS.md
  README.md                         # se crea en implementación
  package.json / package-lock.json
  .env.example / .gitignore
  apps/
    web/src/
      app/ components/ features/ hooks/ lib/
      features/{library,tracks,artists,albums,genres,duplicates,
                unidentified,organization,history,settings,playlists}/
    server/src/
      app.ts config.ts
      api/ security/ db/ workers/ jobs/
      services/{scanner,metadata,matching,providers,cache,planner,
                duplicates,filesystem,organization,audit,rollback,playlists}/
      platform/{macos,windows,linux}/
  packages/core/src/
      types/ schemas/ normalization/ matching/ paths/ quality/
  helpers/tag-writer/                # si supera spike; Python privado
  tests/{unit,integration,e2e,security,fixtures,performance}/
  scripts/{dev,start,doctor,generate-fixtures,...}
  docs/{SUPPORT,SECURITY,ACCEPTANCE,TEST-RESULTS,...}.md
```

`core` no accede a red/disco. Proveedores no reciben capabilities de filesystem. Frontend no importa secretos ni módulos Node. Jobs no dependen de componentes React. Código ESM, errores tipados y funciones pequeñas; ningún archivo monolítico.

Contrato ilustrativo, no código implementado:

```ts
type Verification =
  | { state: 'verified'; originalHash: string; finalHash: string }
  | { state: 'blocked'; code: 'SOURCE_CHANGED' | 'DESTINATION_CONFLICT' };
```

### Instalación y comandos previstos

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run test:e2e
npm run build
npm start
```

Comandos auxiliares previstos: `npm run doctor`, `npm run test:security`, `npm run test:performance`, `npm run fixtures:generate`, `npm run test:providers:live`.

No existen todavía scripts ejecutables. Al implementar se resolverán versiones estables actuales, requisitos de engine, licencias y lockfile; no dejar dependencias `latest` flotantes en producción. El SDK OpenAI se resolverá desde su distribución oficial en ese momento.

Para un helper Python, instalación aislada con Python/Mutagen fijados y verificables, nunca pip global. La distribución debe incluir bootstrap/doctor explícito y paquetes reproducibles para macOS; si no logra funcionar desde el flujo simple solicitado, es un bloqueo de empaquetado, no una nota escondida. Node 26.8.1, npm 11.19.0 y Python 3.13.0 se observaron en esta sesión; se localizó ffmpeg, no ffprobe. No se instalaron dependencias.

## 4. Persistencia y modelo de dominio

SQLite es autoridad del catálogo y journal. IndexedDB solo guarda handles de navegador/preferencias efímeras, no otro catálogo divergente.

| Entidad | Datos/relaciones esenciales |
|---|---|
| `roots` | ID opaco, rol, ruta nativa, identidad volumen/directorio, autorización de sesión separada |
| `scan_sessions` | raíz, estado, fechas, contadores descubiertos/procesados, fases y versión parser |
| `scan_entries` | cola durable por ruta relativa, identidad/size/mtime, estado de cada etapa, errores |
| `tracks` | ID estable, título/artista/álbum/track/disc/años, original_path, final_path, original_filename, hash original/final, scan_date, metadata_source, confidence, favorito futuro |
| `track_files` | representaciones físicas, contenedor/codec/extensión, bytes, duración, bitrate, sample rate, bit depth, hashes, estado |
| `artists`, `track_artists` | nombres originales/canónicos, aliases, créditos múltiples y rol |
| `albums` | album_artist + título + identidad de release/edición; MB release/release-group independientes |
| `metadata_snapshots` | tags nativos originales y seleccionados, valores binarios referenciados, versión parser |
| `metadata_candidates` | candidato, fuente, IDs, evidencia por campo, puntuación, contradicciones, elección humana |
| `genres`, `track_genres`, `genre_rules` | original/normalizado, evidencia, reglas del usuario versionadas |
| `duplicates`, `duplicate_members` | exacto/posible, evidencia, representante y decisión explícita |
| `search_cache` | clave versionada, consulta mínima, respuesta, fuente, fechas/TTL/negativos |
| `provider_requests` | estado, cache hit, modelo, usage, web calls, coste estimado si disponible |
| `organization_plans`, `plan_items` | revisión inmutable, precondiciones, paths propuestos, tags/artwork, conflictos, aprobación |
| `operations`, `operation_events` | write-ahead intent, transición durable, hashes, backups, verificación, error |
| `playlists`, `playlist_tracks` | futuro: definición/reglas, membresía ordenada por IDs estables, exportaciones |
| `settings`, `errors` | configuración sin key API; archivo/fase/categoría/recuperabilidad |

Una grabación musical y un archivo físico no son la misma identidad. Un MP3 y un FLAC pueden ser dos representaciones sin convertirse en duplicados exactos. `hash` original nunca se reemplaza por hash post-tags. Renombrar no borra favoritos ni decisiones.

Índices por sesión/estado, hash, artista/título normalizados, release, confianza, campos ausentes; paginación/keyset y búsqueda indexada. Fechas de escaneo/auditoría en UTC; fechas musicales con precisión conocida (año, mes o día), sin inventar 1 de enero. `release_date`, `original_release_date`, `recording_date` separados.

## 5. Escaneo y rendimiento

- Recorrido recursivo incremental, detectar extensión y confirmar contenedor; registrar audio no soportado/corrupto en vez de ignorarlo.
- Extensiones base: mp3, m4a, aac, flac, alac, wav, aif/aiff/aifc, ogg/oga, opus. ALAC es codec: frecuentemente en M4A, no se clasifica por extensión solamente. Otros parsers soportados aparecen en matriz de capacidades.
- Leer todos los tags nativos y comunes disponibles antes de solicitar red; guardar IDs MusicBrainz, ISRC, compositor, compilation, artwork y campos personalizados. Portadas grandes se extraen bajo límite a caché local, no se envían con cada fila.
- Concurrencia inicial configurable y acotada: lectura metadata 4, hash/copia 2, escritura tags 1, OpenAI 1–2, MusicBrainz global 1. Son valores de partida para benchmark, no rendimiento probado.
- Parsers de archivos y helpers se aíslan en workers/procesos terminables con tiempo y memoria acotados; un archivo malformado que bloquee el parser no puede detener el servicio completo. Reiniciar el worker, registrar el error y continuar. No enviar comandos construidos por interpolación al shell.
- Hash por stream; leer metadata y hash son etapas reanudables distintas. Conservar progreso completo de archivo, reiniciar hash parcial tras cancelación sin asumir que un hash incompleto es válido.
- Persistir descubrimiento por lotes y directorios pendientes; al reanudar reconciliar entradas del directorio interrumpido y deduplicar por raíz/ruta, sin volver a procesar todo lo ya confirmado. Revalidar tamaño/mtime/identidad, y hash antes de aplicar.
- Mostrar «Descubriendo N archivos» mientras total no se conoce; después `procesados / descubiertos`. No total ficticio ni porcentaje completo mientras haya trabajos pendientes.
- Pausar: no despachar nuevas tareas, concluir/abortar limpiamente la unidad en curso. Cancelar: conservar auditoría/confirmados, no borrar archivos de usuario; distinguir `cancel_requested` de `cancelled`. Continuar tras cerrar pestaña es configurable; el backend mantiene el estado y la reapertura recupera eventos.
- UI virtualizada, búsqueda/orden/filtros en servidor, estadísticas agregadas SQL y eventos SSE con secuencia/reconexión. No mandar 50.000 portadas/filas por actualización.
- Objetivo de pruebas: 1.000, 10.000, 50.000+ entradas; límite de memoria objetivo menor de 1 GiB en dataset de benchmark documentado, sin crecimiento proporcional al tamaño de audio. Registrar hardware, tamaño, latencias y memoria; no prometer tiempos universales.

## 6. Normalización, identificación y confianza

### Normalizar para comparar no es reescribir artísticamente

Separar `raw`, `comparison_key`, `canonical_display`. Preservar cadenas originales. NFC en salida; comparación Unicode/casefold y equivalencias controladas para apóstrofes, guiones y espacios. No quitar diacríticos de la salida ni fusionar homógrafos automáticamente. La clave de comparación genera candidatos, no demuestra identidad de artistas.

Reglas conservadoras, versionadas y explicables para URLs, prefijos conocidos de descarga, `[Official Audio]`, `(Official Video)`, `[320kbps]` y track repetido. Mostrar cada transformación propuesta. Retener Live, Acoustic, Remix, Remastered, Extended Mix, Radio Edit, feat./featuring, Version, mono/stereo, aniversario, Deluxe y año de mezcla. No convertir todos los nombres a Title Case.

Géneros: alias obvios (`Hip Hop`, `hiphop` → `Hip-Hop`), guardar original y normalizado, reglas editables con preview; ausencia de género no bloquea organización ni dispara IA por defecto.

### Pipeline escalonado

1. **Local:** tags principales completos y coherentes, sin placeholders/contradicciones → aceptar para propuesta, sin MusicBrainz/OpenAI. Tener campos llenos no prueba verdad: revisar incoherencias de álbum, disco, track y duración.
2. **Paths:** inferir artista/álbum/track/título de ruta relativa; guardar que es inferencia, no hecho. No inventar año.
3. **Estructurado:** MusicBrainz por identificadores válidos primero, luego búsquedas escapadas artista/título/álbum/duración; usar releases/media/tracks para edición, número de pista y disco. Recording ID no determina release/track/año. Recuperar todas las páginas necesarias; búsquedas limitadas se declaran truncadas y no producen falsa unicidad. Cover Art Archive solo para release elegido y con opción activa. Wikidata, solo relaciones útiles/documentadas, mediante módulo separado.
4. **OpenAI fallback:** solo si permanece ambigüedad, contradicción o evidencia insuficiente tras niveles anteriores. Sin identificador/contexto razonable, devolver desconocido en vez de «adivinar». Si solo falta género, no consultar salvo investigación secundaria explícita.

MusicBrainz exige identificación útil y máximo una llamada por segundo por aplicación; su servicio público es gratuito para uso no comercial, no una garantía ilimitada para una futura distribución comercial.[6][7] Configurar un contacto real de mantenedor/usuario antes de habilitar el proveedor, sin inventar emails. Cola compartida por proceso, intervalo mínimo 1.100 ms, `Retry-After`, backoff exponencial con jitter, límites por intento, timeout, pausa ante 429/503. No recursión infinita.

Caché multinivel: consulta estructurada por release/recording/ISRC primero; fallback artista+título+duración. Incluir también álbum/edición, qualifiers, disc/track, IDs y versión normalizador/proveedor para no contaminar remasters. La clave aproximada no basta para escoger un álbum. Single-flight para llamadas concurrentes idénticas; TTL inicial configurable (positivos 30 días, negativos 24 horas), decisiones humanas persistentes hasta cambio explícito. Agrupar búsquedas por álbum, no repetirlas por pista.

### Puntuación explicable, no probabilidad certificada

Rangos: 95–100 prácticamente seguro según evidencia disponible; 85–94 alto; 70–84 revisar; 0–69 dudoso. Verde ≥85, amarillo 70–84, rojo ≤69; texto/iconos además de color.

Para candidatos externos, puntuación base propuesta con contribuciones acotadas: título 25, artista 25, álbum/edición 20, duración 10, pista/disco 10, año 5, coherencia de grupo 5. Evidencia ausente no se normaliza artificialmente hasta 100. IDs fuertes corroborados pueden subir la puntuación; uno contradictorio bloquea selección automática. Pesos/umbrales se calibran con fixtures y revisión de falsos positivos antes de aprobar.

Reglas superiores al score:
- Nunca seleccionar por el `confidence` autodeclarado de OpenAI; validación determinista de evidencia por campo.
- Release ambiguo, distinto qualifier o escasa diferencia entre primeros candidatos → revisión aunque coincidan artista y título.
- La ruta usa confianza de los campos organizativos; tags se aprueban campo a campo. Género desconocido no baja artificialmente una identificación sólida.
- `null` significa desconocido, nunca instrucción de borrar un tag.
- Usuario puede editar todo; registrar `manual`, no convertir edición humana en «100% verificado por base de datos».
- Nada se ejecuta por score sin aprobación global del plan; filas <85 se excluyen inicialmente y requieren revisión/selección consciente.

## 7. OpenAI, privacidad y costes

Solo backend, SDK `openai` oficial y Responses API. Structured Outputs usa `text.format`/JSON Schema estricto o helper oficial Zod; hay que manejar refusals, respuestas incompletas y errores, además de validar semántica.[3][12] Búsqueda oficial con `tools: [{type: 'web_search'}]` y conservación de citations/sources reales.[4]

```dotenv
# Contenido previsto de .env.example; aún no creado
OPENAI_API_KEY=
OPENAI_MODEL=
```

`.env.local` solo backend, gitignored; nunca prefijo VITE, localStorage, logs, respuestas de configuración, bundles o navegador. UI muestra configurada/no configurada, modelo y límites, no la key ni prefijos de ella.

**Modelo económico propuesto:** `gpt-5.6-luna`, documentado actualmente como orientado a coste/volumen con Responses, Structured Outputs y web search.[2] No es el modelo con el que se implementará necesariamente. Revalidar catálogo oficial y acceso de la cuenta durante implementación; `OPENAI_MODEL` prevalece. No cambiar silenciosamente a uno caro si falla. No fijar precios eternos ni confundir suscripción ChatGPT con facturación API.

La documentación de Codex distingue su autenticación e indica API keys de Platform para llamadas generales a OpenAI.[5] No implementar «Login con ChatGPT» ni leer cookies, sesiones, auth.json, llaveros o credenciales de Codex/Hermes. Cualquier mecanismo futuro requiere nueva ADR respaldada por documentación oficial específica para terceros.

Payload mínimo: basename saneado, contexto relativo reducido, duración, tags relevantes, candidatos e IDs; nunca audio, hash innecesario, ruta HOME absoluta, username ni colección completa. Una pantalla explica proveedores y campos a enviar antes de activarlos. `store: false` cuando sea compatible, sin prometer retención cero del proveedor.

Schema ampliado: campos del ejemplo del usuario más `release_id`, `recording_id`, `release_date`, `original_release_date`, `recording_date`, `field_evidence`, `candidate_id` y `unresolved_fields`, todos explícitos/nullable donde corresponda. `sources` se contrasta con fuentes recibidas o citations de herramienta; no tomar una URL inventada como evidencia. El modelo no puede llamar filesystem ni autorizar operaciones.

Llamada común: resolver candidatos sin web. Solo investigación requerida y autorizada habilita web. Si combinación de modelo/schema/tools no funciona, usar investigación separada y posterior extracción estructurada, ambas contabilizadas; no degradar a JSON arbitrario aceptado sin validar.

Cuotas configurables por sesión (llamadas, tokens máximos por salida, web calls, presupuesto aproximado), botón detener, cache hits y requests fallidos visibles. Registrar `usage` real y modelo efectivo; coste calculado solo con tabla de precios fechada validada, etiquetado ESTIMADO y cargos de búsqueda separados. Si no hay tarifa, mostrar tokens/coste no disponible, nunca $0 ficticio. Contar canciones resueltas por fuente aparte de número de peticiones/reintentos.

## 8. Plan de organización y paths

Identidad lógica de álbum: artista del álbum + álbum + identidad de edición/release cuando disponible. Artista de carpeta = album_artist fiable; si no, artista principal. No agrupar artistas solo porque comparten `Greatest Hits`.

```text
Musica_Organizada/Artista/Álbum/01 - Título.ext
Musica_Organizada/Artista/Álbum/1-01 - Título.ext
Musica_Organizada/Compilations/Álbum/01 - Artista - Título.ext
```

Varios discos: disco conocido y evidencia de álbum multidisco → `D-NN`. Compilación multidisco → `D-NN - Artista - Título`. Sin track → `Título.ext` (en compilación añadir artista). No inferir compilation solo de múltiples artistas/featuring. Si compilation no está respaldado por tag o release, solicitar revisión.

No fusionar ediciones iguales en nombre pero distintas en identidad. Añadir desambiguador visible y estable de edición/año/MBID corto cuando necesario; no inventar etiquetas «Remastered». El desambiguador está en la simulación y requiere aprobación.

Sanear segmentos para OS destino: separadores, NUL/control, nombres reservados, puntos/espacios finales, `.`/`..`, longitudes en bytes/componentes y colisiones Unicode/case-insensitive. Preservar acentos, ñ, japonés, coreano y cirílico. Resolver truncamientos con sufijo estable visible, no ASCII transliteration. Conservar extensión original y contenedor; no inferir conversión de `.m4a` a `.alac`.

Sin identificación: fila excluida por defecto; usuario puede conservar sin cambios o copiar bajo `_Sin_Identificar/` manteniendo basename y ruta relativa segura, siempre visible en plan. No fabricar artista/álbum canónicos para rellenar carpetas.

`organization_plan` es snapshot inmutable: raíz, manifest/version, metadata/decisiones, target exacto, tags propuestos, artwork, roles de duplicados, estimación de espacio/backups y hashes/precondiciones. Congelar también respuestas externas, versiones de adaptadores y reglas de nombres. Editar metadata/reglas/destino/selección o cambiar una versión que altere el resultado invalida aprobación y crea revisión nueva. Durante ejecución no se vuelve a consultar MusicBrainz/OpenAI ni a reinterpretar candidatos; el artwork aprobado debe estar identificado y cacheado por hash antes de aplicar, o requerir un plan nuevo.

**Contrato de exactitud:** la simulación fija rutas, selección de archivos, acciones y valores de tags aprobados; no promete conocer de antemano los bytes ni el tamaño exacto de un archivo retaggeado. El espacio se presenta expresamente como estimación conservadora y se comprueba otra vez antes de escribir. No producir audio retaggeado en origen/destino durante simulación para obtener una cifra aparentemente exacta. Una eventual preproducción de artefactos requeriría un área de preparación autorizada y una fase distinta de la simulación de solo lectura.

Conflictos con destino: si hash igual, proponer reutilizar sin adquirir propiedad del archivo; hash diferente, bloquear hasta elegir omitir o path alternativo explícito. MVP no ofrece sobrescritura de archivos ajenos. No generar sufijos improvisados durante ejecución: detener ítem y regenerar plan. Dos elementos del propio plan que convergen también se resuelven antes de aprobar.

## 9. Duplicados y selección de calidad

- Exactos: SHA-256 del archivo completo más tamaño; conservar una representación activa en biblioteca final. Hash parcial/tags coincidentes no es exactitud.
- Posibles musicales: candidatos por artista+título normalizados, qualifier compatible, duración con tolerancia documentada, álbum, ISRC/recording ID; registrar diferencias. Evitar comparar todas las parejas de 50.000 archivos: índices/buckets y ventanas de duración.
- No unión transitiva ciega: A≈B y B≈C no garantiza A≈C. Mantener aristas/evidencia y revisar consistencia del grupo.
- `Preferir calidad` únicamente recomienda: codec lossless real (FLAC/ALAC/PCM WAV/AIFF), AAC de alta calidad, MP3 por bitrate, resto. M4A no equivale automáticamente a AAC y WAV/AIFF pueden contener otro codec. No inferir buena masterización/upscale por sample rate alto ni equiparar bitrates entre codecs.
- Exactos: propuesta de representante estable, usuario puede cambiarlo. En modo seguro los extras permanecen en origen y solo uno se copia al árbol activo. Si decide separarlos, copiar/verificar a `_Duplicados_Pendientes/<operación>/...`; no borrar originales.
- Posibles: selección explícita del usuario; si conserva ambos se proponen paths distintos. Nunca eliminar FLAC porque también hay MP3.
- En modo ORGANIZAR, retirar origen es una acción separada después de verificar y mantener rollback; mover a cuarentena conservadora primero. No borrar permanentemente por activar el modo.
- «Eliminar definitivamente duplicados»: flujo posterior, listado exacto/bytes, hashes revalidados y confirmación explícita, limitado a miembros de cuarentena del journal. No eliminación recursiva libre; no tocar backups necesarios ni originales ajenos. Advertir pérdida de rollback para esas copias.

## 10. Copia, tags y verificación transaccional

### Invariantes

1. Nunca borrar primero.
2. Nunca sobrescribir implícitamente.
3. Nada de audio a APIs externas.
4. Nunca recodificar el audio.
5. Cambios solo del plan aprobado y contra las precondiciones verificadas.
6. No anunciar éxito solo porque SQLite hizo commit: el filesystem se verifica por separado.

### Transacción por archivo

```text
PLANNED → INTENT_DURABLE → SOURCE_REVALIDATED
→ COPYING_TEMP → RAW_COPY_VERIFIED → BACKUP_VERIFIED
→ TAGGING_STAGED (opcional) → CONTENT_VALIDATED
→ PUBLISHED_NO_CLOBBER → FINAL_VERIFIED → COMMITTED
```

Estados alternativos: `CONFLICT`, `FAILED`, `CANCELLED`, `RECOVERY_REQUIRED`, `ROLLED_BACK`, `ROLLBACK_BLOCKED`.

1. Confirmar revisión aprobada, lock de destino, grants, capacidad de disco para copia + staging + rollback y estado del origen.
2. Persistir intent durable antes de tocar el filesystem. Abrir origen sin seguir enlaces; comparar identidad, tamaño, timestamps y hash vigente con plan.
3. Crear temporal exclusivo en el mismo volumen del destino, nunca truncar ruta existente. Copiar por stream calculando hash, flush, cerrar y releer temporal para hash independiente. Verificar estabilidad del origen al final; un cambio invalida el ítem.
4. Comparar SHA-256 original con **copia sin retagging**. Esta es la verificación binaria solicitada.
5. Si se retaggea, disponer de original/backup byte-a-byte verificable. No depender de un origen que luego puede desaparecer: antes de permitir retirar originales, reservar backup íntegro durable por hash. Para máxima seguridad, primera versión conserva backup íntegro en `.music-organizer/rollback/<run>/` antes de retagging.
6. Aplicar cambios solo sobre staging. Validar campo a campo, inventario de tags opacos, artwork y audio payload antes/después. Conservación del audio debe comparar bytes de frames/packets o payload estructural según contenedor, no solo duración/codec o PCM decodificado. Si no se puede demostrar, omitir retagging de ese archivo y comunicarlo.
7. Registrar `original_sha256`, `raw_copy_sha256`, `final_sha256`, `audio_payload_sha256_before/after` y qué verificador se usó. Tras tags no exigir falsamente `original_sha256 == final_sha256`.
8. Publicar sin reemplazo de forma probada en volumen soportado. Un `rename` común puede sobrescribir; no basta `exists()` antes. Usar primitiva no-clobber validada (por ejemplo link exclusivo de staging en filesystem compatible y retirada controlada del temporal), o helper nativo. Si no se puede garantizar, bloquear, no degradar a escritura insegura.
9. Flush donde soporte el SO, releer el destino final, confirmar hash/metadata/payload, persistir COMMITTED. Generar reportes desde el journal. Fallo al guardar journal/reportes tras publicación exige recovery, no repetir copia a ciegas.
10. Retirar origen requiere nueva confirmación, rehash de origen y destino y rollback disponible. Nunca se incluye implícitamente en «APLICAR ORGANIZACIÓN».

### Matriz de tags que debe validarse, no prometerse

| Formato/codec | Lectura/organización | Escritura propuesta |
|---|---|---|
| MP3 | sí mediante parser; corrupción por archivo | ID3 adaptador, versión preservada si posible, sin borrar TXXX/PRIV/POPM/artwork |
| FLAC | sí | Vorbis comments/pictures, preservar bloques desconocidos y audio |
| M4A AAC/ALAC | sí, codec inspeccionado | átomos MP4, campos libres/chapters/gapless preservados o bloqueo |
| OGG Vorbis/Opus | sí | comentarios manteniendo packets y datos de reproducción; comprobar streams encadenados |
| WAV/AIFF | sí | solo variantes/chunks probados; BWF/iXML/otros intactos; si no, copy-only |
| AAC ADTS/formatos adicionales | lectura y copia cuando parser lo soporte | copy-only cuando no exista contrato fiable de tags |
| DRM/cifrado/dañado | detectar/registrar | no intentar romper protección ni reescribir |

Todos los archivos razonablemente legibles se pueden copiar/renombrar aunque no admitan retagging certificado. UI expone motivo exacto de `tags no modificados`; no considerar soporte de lectura como soporte de escritura.

Actualizar tags: propuesta activada solo para campos de alta confianza y formatos aprobados, tras aprobación del plan. Campos: Title, Artist, Album, Album Artist, Track, Disc, Year de la edición, Genre, Compilation; Disc/Track totals preservados, múltiples artistas no aplanados destructivamente. Compositor/ISRC/IDs extraídos y catalogados; escritura adicional solo si usuario la solicita y adaptador la prueba. Valores null no borran campos existentes; borrado de tag requiere acción específica fuera del autocompletado.

Artwork opcional, conservar el existente por defecto. Preferir thumbnail 500 de Cover Art Archive, que documenta 250/500/1200 px.[11] Límites iniciales configurables de 1.200 px y 1 MiB incrustado; validar dimensiones/tipo y reescalar imagen si necesario, nunca audio. Si portada no cumple, omitirla con aviso. Descarga/artwork no mejora la confianza musical por sí misma.

## 11. Auditoría, recuperación y rollback

SQLite no da atomicidad conjunta con filesystem. Journal write-ahead con `operation_id`, `plan_id/revision`, tipo, source/destination, hashes pre/post, timestamp, verified, backup, estado, error y secuencia de eventos. Recovery inspecciona intents abiertos al iniciar y reconcilia temporales, publicados y hashes; no adopta archivos ajenos ni los borra para «limpiar».

Reportes versionados dentro de `.music-organizer/reports/<run>/`; publicar `organization-report.json` y `.csv` como reporte más reciente solo si son propiedad reconocida de la aplicación. Si existen reportes ajenos, conflicto. CSV UTF-8, escaping correcto, protección contra fórmulas al abrir hojas de cálculo y registro de esa codificación. JSON conserva valores exactos.

«Deshacer última organización» genera primero plan inverso. Trabaja solo con archivos creados/respaldados por esa operación y hashes actuales iguales al esperado. Si usuario cambió un destino/origen después, no lo sobrescribe ni borra: `ROLLBACK_BLOCKED` con elección manual.

- Original intacto: retirar copias propias a cuarentena reversible, restaurar catálogo.
- Original retirado: restaurar copia byte-a-byte desde backup verificado a ruta libre, comprobar hash, después retirar la copia organizada si corresponde.
- Archivo preexistente reutilizado por hash: nunca lo elimina el rollback.
- Carpetas: solo quitar las creadas por la operación si están vacías y la retirada está aprobada.
- Cambios posteriores dependientes: impedir deshacer fuera de orden sin resolver dependencias.
- Backups/journal no se purgan automáticamente. Mostrar espacio ocupado y política de retención; purga separada con advertencia de irreversibilidad y confirmación.
- Reportes e historial no se destruyen al deshacer: añadir eventos inversos.

Discos externos: guardar identidad de volumen además de ruta. Desmontaje/remontaje o ruta que ahora identifica otro disco → pausa y nueva autorización. NFS/SMB/filesystems con garantías desconocidas: no certificar escrituras hasta matriz específica.

## 12. Interfaz funcional

Sidebar: Biblioteca, Canciones, Artistas, Álbumes, Géneros, Duplicados, Sin identificar, Playlists (bloqueada antes de entrega II), Historial, Configuración.

Flujo principal real: seleccionar/autorizar → **ANALIZAR BIBLIOTECA** → revisar candidatos/editar → **SIMULAR ORGANIZACIÓN** → original ↓ destino propuesto + tags/duplicados/conflictos → **APLICAR ORGANIZACIÓN** con resumen y confirmación.

Dashboard: archivos totales, audio detectado, artistas, álbumes, géneros, bytes, completos/incompletos, duplicados y no identificados, errores. Procesos: leyendo metadatos, calculando hashes, consultando MusicBrainz, resolviendo coincidencias, consultando OpenAI, preparando biblioteca. Pausar/continuar/cancelar con estado verificable.

Tabla: selección, título original, identificado, artista, álbum, año, género, track, formato, calidad, confianza, fuente, estado. Orden, búsqueda, filtros, selección múltiple, edición y detalle de evidencia por campo. Filtros: confianza <80, sin álbum/artista/género, duplicados, revisar, IA, MusicBrainz. Acciones de lote muestran cuántas filas y qué campos cambian, nunca aplican a filas ocultas por sorpresa.

Configuración: origen/destino, modo, OpenAI habilitado/modelo, búsquedas estructuradas y web IA separadas, actualizar tags, artwork/límites, géneros/reglas, calidad lossless, límites de red/jobs, caché, backups. Playlists automáticas/formato solo tras entrega II.

Modos:
- SIMULACIÓN, inicial: ninguna escritura en raíces, botón aplicar requiere elegir modo seguro/organizar y aprobar.
- SEGURO: copiar/verificar y conservar origen.
- ORGANIZAR: mismo pipeline; al final habilita acción independiente de retirar originales con confirmación, nunca borrado implícito.

## 13. Entrega II — Playlists y Música de Apple

**No implementar antes de pasar la puerta CORE en TASKS.md.**

Favoritos por ID de track; playlists por género original/normalizado, artista, década/año de edición, favoritos y combinaciones (`Favoritas Rock`, `Favoritas 80s`, `Favoritas Radiohead`). Año desconocido queda fuera de filtros temporales. Definiciones persistentes, membresía estable y orden configurable; usar solo archivos finales existentes/verificados, excluyendo cuarentena, staging y backups.

Exportadores puros separados:
- XML plist compatible con biblioteca/playlists de Música/iTunes: `Tracks`, enteros Track ID locales consistentes, metadatos, `Location`, `Playlists`, `Playlist Items`, referencias correctas y Persistent IDs estables. No asumir que IDs locales son IDs internos de Apple.
- `file://` absoluto generado con `pathToFileURL`, luego escaping XML mediante serializador; nunca concatenar ni doble percent-encode. Fixtures con espacios, ñ, Unicode, &, #, %, comillas.
- M3U8 UTF-8, `#EXTM3U`/`#EXTINF`, paths relativos calculados desde `_Playlists/` para portabilidad; tratar saltos de línea/inyección de directivas.
- Guardar una/varias/todas en `_Playlists/`, conflictos y escritura segura como cualquier exportación. Múltiples playlists no implican repetir las canciones en disco.

Apple documenta importar mediante Archivo > Biblioteca > Importar playlist, y advierte que las canciones ya deben estar presentes en su biblioteca.[10] Eso no garantiza que cualquier XML sintácticamente válido sea interoperable: hay que importar exportaciones generadas en una biblioteca de prueba separada, comprobar membresía/rutas y guardar evidencia.

README deberá incluir **IMPORTAR EN APPLE MUSIC**:
1. Añadir primero `Musica_Organizada` a Música (solo carpetas activas, no duplicados/backups).
2. Esperar hasta ver las canciones.
3. Importar después los XML con Archivo > Biblioteca > Importar playlist.
4. Recomendar mantener referencias en sitio/desactivar copia automática si se quiere una sola copia física; explicar que mover/reorganizar archivos en Música puede romper correspondencias.
5. Explicar soporte de formatos de Música: una biblioteca local organizada puede contener formatos que Música no importe/reproduzca. No convertirlos; mostrar compatibilidad por formato probada y advertir/omitir del XML Apple con informe cuando corresponda. M3U8 puede conservarlos para otros reproductores.
6. No usar APIs privadas ni escribir Music Library.musiclibrary. Cualquier prueba en la biblioteca real del usuario requiere autorización adicional.

## 14. Errores y pruebas que condicionan producción

Errores por archivo/fase: audio corrupto, no soportado, permiso denegado, metadata ilegible, búsqueda fallida, ambiguo, escritura, fuente modificada, conflicto destino, disco lleno, volumen cambiado, backup inválido. Error de archivo permite continuar con otros; fallo sistémico de disco/DB/journal pausa el job de forma segura.

Unitarios: normalización, Unicode, paths, matching, scores, ediciones, compilaciones, multidisco, géneros, calidad, duplicados y exportadores futuros.
Integración: parsers sobre audio real generado, proveedores con respuestas de contrato simuladas solo en tests, SQLite/migraciones/reanudación, copias/hashes, tags opacos y audio payload, rollback.
E2E Chrome: todos los botones conectados al backend y filesystem real temporal; selector real adicional supervisado porque mockear `showDirectoryPicker` no prueba permisos nativos.
Fallos inyectados: ENOSPC/EACCES, archivo corrupto, 429/503/timeout/refusal, payload externo malicioso, corrupción de copia, crash en cada transición, cancelación, destino aparecido entre simulación/aplicación, enlaces y cambios concurrentes.
Seguridad: loopback, Host/Origin/CSRF, capabilities, traversal, symlinks/TOCTOU, SSRF, XSS, key ausente del bundle/logs, ninguna solicitud de audio externo.
Rendimiento: fixtures de 1k/10k/50k, paginación virtualizada, RSS y event loop, tiempos medidos con entorno documentado. Metadata ficticia solo en tests; fixtures de parser deben contener bytes de audio válidos.

Ninguna fase se aprueba por unit tests aislados: debe existir flujo conectado y evidencia en `docs/TEST-RESULTS.md`. Un proveedor sin key/cupo o importación Apple no ensayada se marca BLOQUEADO/NO VERIFICADO, no aprobado por mocks. Entrega de producción requiere `npm install`, lint, typecheck, tests, build, `npm start` y prueba real servida por el build; no usar dev server como sustituto.

## 15. Riesgos bloqueantes y límites de actuación

| Riesgo | Decisión/puerta |
|---|---|
| Permiso navegador no transferible a Node | spike selector y autorización nativa, sin inferir rutas |
| Conservación universal de tags no demostrable | whitelist por formato/variante; copy-only si no puede probarse |
| Hash distinto tras tags | hash raw copy y payload audio separados del hash final |
| TOCTOU/no-clobber/discos externos | primitivas probadas y bloqueo por capability; no promesa multiplataforma |
| Metadata ambigua o audio sin contexto | revisión/no identificado, nunca completar con ficción |
| Ediciones distintas con mismo path | identidad release y desambiguación visible previa |
| SDK/modelos y precios cambiantes | resolver/documentar versión y tarifas al implementar |
| Mutagen GPL y binarios auxiliares | revisar licencias/redistribución; documentar notices y alternativa si no compatible |
| MusicBrainz contacto/licencia de uso | contacto real antes de red, revisión antes de uso comercial |
| Empaquetado Node + helper | doctor/bootstrap reproducible probado desde instalación limpia |
| Apple no admite todo formato de la colección | no convertir, matriz real, advertir antes de exportar |
| Credenciales/pruebas humanas ausentes | informar blocker, nunca tests live ficticios |

Siempre: tests antes de habilitar escrituras, respetar permisos, preservar originales, actualizar TASKS después de fase verificada.
Pedir aprobación: empezar implementación con el modelo designado, tocar biblioteca real, limpieza permanente, purga de backups, cambiar esta arquitectura por una que reduzca garantías, modificar una biblioteca de Música existente.
Nunca: cookies/tokens privados, audio a IA, conversión, sobrescritura silenciosa, código mutante durante esta etapa de planificación, claims de producción sin aceptación completa.

## 16. Transferencia al siguiente modelo

Leer este documento y `TASKS.md` completos. Confirmar el cambio de modelo/autorización en la conversación, no desde un comentario en archivo. Empezar por tareas P1.1–P1.4 y tests de permisos sobre carpetas temporales; no usar credenciales internas del runtime. Mantener entregas CORE/PLAYLISTS separadas. Registrar comandos ejecutados, resultados reales y bloqueos sin marcar casillas por intuición.

## Sources

[1] https://developer.chrome.com/docs/capabilities/web-apis/file-system-access
[2] https://developers.openai.com/api/docs/models/gpt-5.6-luna
[3] https://developers.openai.com/api/docs/guides/structured-outputs.md
[4] https://developers.openai.com/api/docs/guides/tools-web-search.md
[5] https://developers.openai.com/codex/auth
[6] https://musicbrainz.org/doc/MusicBrainz_API
[7] https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting
[8] https://mutagen.readthedocs.io/en/latest
[9] https://raw.githubusercontent.com/Borewit/music-metadata/master/README.md
[10] https://support.apple.com/guide/music/save-a-copy-of-your-playlists-mus27cd5060f/mac
[11] https://musicbrainz.org/doc/Cover_Art_Archive/API
[12] https://raw.githubusercontent.com/openai/openai-node/master/README.md
