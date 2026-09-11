# Music Library Organizer — Plan de trabajo y aceptación

Estado: **MVP local implementado y verificado; endurecimiento completo aún pendiente**. Hay aplicación ejecutable, dependencias fijadas, pruebas automatizadas y build de producción. Las casillas inferiores siguen siendo la matriz de aceptación completa: solo se marcan al verificarse literalmente.
Proyecto: `/Users/Rattio/music-library-organizer`.
Arquitectura vinculante: `ARCHITECTURE.md`.

## Control del modelo y alcance

- [x] A.1 Revisar requisitos y distinguir planificación/implementación de las entregas organizador/playlists.
- [x] A.2 Consultar documentación actual de navegador, MusicBrainz, metadatos, OpenAI y Música de Apple; registrar fuentes en arquitectura.
- [x] A.3 Crear `ARCHITECTURE.md` y este plan con fases, dependencias, pruebas y límites.
- [x] B.0 **COMPLETADO: el usuario cambió de modelo y autorizó implementar con «Implementa».**

Esta pausa prevalece sobre la instrucción genérica posterior «empieza inmediatamente a implementar FASE 1». El usuario pidió un relevo explícito entre PLANIFICAR e IMPLEMENTAR.

Las tareas siguientes forman la matriz completa de aceptación. Algunas ya cuentan con implementación y evidencia en `docs/TEST-RESULTS.md`; las no marcadas permanecen pendientes y no deben anunciarse como certificadas.

## Convenciones de ejecución

1. Implementar verticalmente: UI → API → dominio → disco/DB real de pruebas, no pantallas con datos inventados.
2. Empezar cada módulo con tests de comportamiento y fallo. Actualizar esta lista **después** de verificar la fase, no solo después de escribir código.
3. Cada tarea modifica un conjunto pequeño de archivos; dividir antes de superar un cambio revisable. Archivos barrel/config relacionados pueden ser subtareas, no un permiso para crear un monolito.
4. `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:integration` y `npm run build` son puertas transversales desde que existan scripts. E2E conectado obligatorio al cerrar cada fase funcional.
5. Registrar commit si existe repositorio/autorización, comandos, códigos de salida, artefactos y limitaciones en `docs/TEST-RESULTS.md`. No crear/pushear un repositorio remoto sin solicitud.
6. Mocks solo en tests. Casos live y pruebas nativas/Apple tienen renglones separados; SKIPPED no cuenta como PASSED.
7. Prohibido tocar biblioteca real, borrar originales, purgar backups, configurar credenciales o usar la biblioteca actual de Música para pruebas sin autorización correspondiente.

## Fase 1 — Base, autorización y escaneo recursivo

Dependencia: B.0. Objetivo: seleccionar una carpeta real autorizada y detectar audio recursivamente sin modificarla.

- [ ] P1.1 Base TypeScript/React/Vite/Node.
  - Archivos: `package.json`, `apps/web/src/app/App.tsx`, `apps/server/src/app.ts`, `tsconfig.json`, `vite.config.ts`.
  - Aceptación: scripts dev/build/start, frontend y healthcheck local conectado; ninguna música ficticia en UI.
  - Verificación: instalación real, lint/typecheck, `npm run build`; `npm start` + lectura HTTP de página/API. Registrar versiones y lockfile.
- [ ] P1.2 Seguridad inicial y configuración privada.
  - Archivos: `apps/server/src/security/session.ts`, `apps/server/src/security/origin.ts`, `apps/server/src/config.ts`, `.env.example`, `.gitignore`.
  - Aceptación: loopback, Host/Origin allowlist, CSRF, sesión distinta de OpenAI, secretos backend-only; `.env.example` con `OPENAI_API_KEY=` y `OPENAI_MODEL=` vacíos.
  - Verificación: `tests/security/local-server.test.ts`; rechazos reales de origen/host extraños y búsqueda de secretos de prueba en bundle/logs.
- [ ] P1.3 Spike bloqueante: selector web y autorización Node.
  - Archivos: `apps/web/src/features/library/FolderPicker.tsx`, `apps/web/src/lib/directory-handles.ts`, `apps/server/src/platform/macos/folder-picker.ts`, `apps/server/src/security/root-grants.ts`, `tests/e2e/folder-permissions.spec.ts`.
  - Aceptación: `showDirectoryPicker` por gesto; selector nativo explícito; rutas visibles confirmadas; cancelación/revocación; no inferencia de ruta, búsqueda HOME ni marcadores escritos.
  - Verificación: prueba Chrome/nativa supervisada con directorios temporales, una selección equivocada y un destino vacío. E2E con picker simulado se etiqueta automatización, no sustituto de esta prueba.
- [ ] P1.4 Primitivas de filesystem y límites de raíz.
  - Archivos: `apps/server/src/services/filesystem/root.ts`, `apps/server/src/services/filesystem/entries.ts`, `apps/server/src/services/filesystem/capabilities.ts`, `tests/security/root-paths.test.ts`.
  - Aceptación: rechazar traversal, symlinks y raíces iguales/anidadas; identificar volúmenes; no seguir enlaces para «completar» recorrido. Documentar qué primitivas requieren helper nativo.
  - Verificación: carpetas temporales con aliases, hard links, permisos denegados y enlaces fuera de raíz; comprobar destino/origen intactos.
- [ ] P1.5 Escáner incremental y detección de audio.
  - Archivos: `apps/server/src/services/scanner/walk.ts`, `apps/server/src/services/scanner/formats.ts`, `apps/web/src/features/library/ScanProgress.tsx`, `tests/integration/scanner.test.ts`.
  - Aceptación: recursion arbitraria, extensiones base, contenedores confirmados después, errores por entrada y conteos reales; ninguna escritura en raíz.
  - Verificación: colección temporal multinivel con Unicode, no-audio y corruptos; inventario/hashes fuente/destino antes/después. Prueba desde UI hasta listado real.

**Puerta P1:** seleccionar/autorización y escaneo real demostrados, conteos cotejados programáticamente, análisis sin escritura en árboles seleccionados. Si el puente de permisos no funciona, resolver aquí antes de acumular funcionalidades.

## Fase 2 — Tags, catálogo e interfaz de biblioteca

Dependencia: P1.

- [ ] P2.1 SQLite y repositorios versionados.
  - Archivos: `apps/server/src/db/client.ts`, `apps/server/src/db/migrations/001-core.sql`, `apps/server/src/db/tracks.ts`, `tests/integration/catalog.test.ts`.
  - Aceptación: entidades de arquitectura incluyendo artistas/álbumes/sesiones/operaciones/duplicados/candidatos y tablas de playlists reservadas; migración/reinicio sin pérdida; secretos excluidos.
  - Verificación: instalar driver en Node objetivo, migración de DB vacía/versionada, constraints, índices, persistencia tras proceso nuevo.
- [ ] P2.2 Fixtures de audio y lectura completa.
  - Archivos: `scripts/generate-fixtures.ts`, `tests/fixtures/manifest.json`, `apps/server/src/services/metadata/read.ts`, `tests/integration/metadata-reading.test.ts`.
  - Aceptación: archivos de audio reales generados/licenciados para MP3, FLAC, AAC/M4A, ALAC/M4A, WAV, AIFF, OGG y OPUS; tags comunes/nativos, IDs, portada y errores.
  - Verificación: hashes de fixtures, parseo real con resultados esperados, variante incompleta, corrupta y tags personalizados. No metadata mock como único test de parser.
- [ ] P2.3 Jobs durables y control.
  - Archivos: `apps/server/src/jobs/runner.ts`, `apps/server/src/jobs/scan-job.ts`, `apps/server/src/api/events.ts`, `tests/integration/scan-resume.test.ts`.
  - Aceptación: batches, fases, pausa/continuación/cancelación, eventos SSE, reanudar sin reprocesar confirmados, nueva autorización tras reinicio.
  - Verificación: detener proceso a mitad de carpeta/archivo, reconectar navegador, permisos revocados, errores aislados; contador consistente sin duplicar catálogo.
- [ ] P2.4 Biblioteca/tabla reales y edición.
  - Archivos: `apps/web/src/features/tracks/TrackTable.tsx`, `apps/web/src/features/tracks/TrackEditor.tsx`, `apps/server/src/api/tracks.ts`, `tests/e2e/library.spec.ts`.
  - Aceptación: columnas requeridas, búsqueda/orden/filtros paginados, selección múltiple, edición manual persistente, favoritas aún bloqueadas si no entrega II.
  - Verificación: E2E edita/reabre/filtra datos de archivos reales; virtualización y selección del alcance correcto.
- [ ] P2.5 Navegación y estadísticas.
  - Archivos: `apps/web/src/components/Sidebar.tsx`, `apps/web/src/features/library/Dashboard.tsx`, `apps/server/src/db/aggregates.ts`, `tests/e2e/library-views.spec.ts`.
  - Aceptación: vistas Artistas/Álbumes/Géneros/Sin identificar con datos SQL, estados vacíos/errores, layout responsive, teclado.
  - Verificación: concordancia entre totales, filas y catálogo; no datos demo; ningún género ausente bloquea track.

**Puerta P2:** catálogo persiste, todos los formatos de lectura declarados tienen evidencia y la tabla opera sobre ese catálogo real.

## Fase 3 — Normalización, identificación estructurada y caché

Dependencia: P2.

- [ ] P3.1 Normalizadores no destructivos.
  - Archivos: `packages/core/src/normalization/names.ts`, `packages/core/src/normalization/genres.ts`, `tests/unit/normalization.test.ts`, `tests/unit/unicode.test.ts`.
  - Aceptación: raw/comparison/canonical separados; ruido de descargas, espacios/apóstrofes/guiones/URLs; qualifiers musicales conservados y reglas de género editables.
  - Verificación: tests table-driven y propiedades/idempotencia; The Beatles no implica title-case universal; ñ/CJK/cirílico intactos.
- [ ] P3.2 Parser de contexto y modelo de ediciones.
  - Archivos: `packages/core/src/matching/path-hints.ts`, `packages/core/src/matching/release-identity.ts`, `tests/unit/path-hints.test.ts`, `tests/unit/releases.test.ts`.
  - Aceptación: artista/álbum/track por carpetas, año desconocido nullable, release/recording separados, compilación y multidisco respaldados.
  - Verificación: Radiohead/OK Computer, Greatest Hits de artistas distintos, Abbey Road por edición, un álbum con varios invitados que no es compilación.
- [ ] P3.3 MusicBrainz con políticas reales.
  - Archivos: `apps/server/src/services/providers/musicbrainz.ts`, `apps/server/src/services/providers/rate-limiter.ts`, `tests/integration/musicbrainz-contract.test.ts`, `tests/integration/musicbrainz-live.test.ts`.
  - Aceptación: IDs validados, búsqueda escapada, release/medium/track correctos, paginación, User-Agent con contacto real, intervalo global ≥1.100 ms y Retry-After.
  - Verificación: contrato fixture con 429/503/timeout/truncación y test live opt-in de lookup público; sin contacto real no habilitar proveedor ni fabricar uno.
- [ ] P3.4 Caché, single-flight y políticas de privacidad.
  - Archivos: `apps/server/src/services/cache/search-cache.ts`, `apps/server/src/services/providers/consent.ts`, `apps/server/src/db/migrations/002-cache.sql`, `tests/integration/provider-cache.test.ts`.
  - Aceptación: positivos/negativos TTL, versionado, release/qualifiers en clave, decisiones humanas persistentes; Internet apagado inicialmente.
  - Verificación: solicitudes idénticas simultáneas producen una llamada; mismo título diferente remaster no reutiliza resultado; sin consentimiento cero conexiones externas.
- [ ] P3.5 Matching y evidencia por campo.
  - Archivos: `packages/core/src/matching/score.ts`, `apps/server/src/services/matching/pipeline.ts`, `apps/web/src/features/tracks/CandidateReview.tsx`, `tests/unit/matching.test.ts`.
  - Aceptación: local fiable no consulta proveedores; ausencias no elevan score, ambigüedad/qualifiers/IDs contradictorios bloquean automática; review editable.
  - Verificación: dataset de positivos/negativos difíciles con reporte de falsos positivos; selección local/estructurada visible de extremo a extremo.

**Puerta P3:** consultas reales necesarias y cacheadas, metadatos originales preservados, ediciones no fusionadas, desconocidos honestos.

## Fase 4 — OpenAI fallback, web y confianza

Dependencia: P3. OpenAI no debe frenar el funcionamiento offline.

- [ ] P4.1 SDK oficial y contrato estricto.
  - Archivos: `apps/server/src/services/providers/openai.ts`, `packages/core/src/schemas/identification.ts`, `tests/integration/openai-contract.test.ts`, `docs/PROVIDERS.md`.
  - Aceptación: resolver SDK actual y modelo económico documentado, `OPENAI_MODEL`, Responses + Structured Outputs, sin ChatGPT/Codex auth privada, key nunca frontend.
  - Verificación: salida válida, negativa/refusal, JSON inválido, truncamiento, modelo no disponible y 401/429; errores sin secretos.
- [ ] P4.2 Política de fallback y búsqueda web.
  - Archivos: `apps/server/src/services/matching/ai-policy.ts`, `apps/server/src/services/providers/web-research.ts`, `tests/integration/ai-policy.test.ts`, `tests/integration/openai-live.test.ts`.
  - Aceptación: solo fallbacks elegibles, payload mínimo textual, sources cotejadas, ninguna herramienta filesystem, género ausente no dispara IA solo.
  - Verificación: tests de red para casos local/MB deterministas (cero OpenAI); test live sin audio cuando usuario configure API key y autorice gasto. Si no, marcar live bloqueado, no verificado.
- [ ] P4.3 Revisión humana y seguridad de resultados.
  - Archivos: `apps/web/src/features/tracks/ConfidenceBadge.tsx`, `apps/server/src/services/matching/evidence.ts`, `tests/unit/confidence.test.ts`, `tests/security/provider-input.test.ts`.
  - Aceptación: score determinista propio, evidencia por campo, URL inventada no prueba, texto remoto no instrucciones, baja confianza nunca incluida silenciosamente.
  - Verificación: inyección en tags/resultados, IDs falsos, metadata contradictoria y candidato de confianza autodeclarada alta sin evidencia.
- [ ] P4.4 Configuración/uso/coste.
  - Archivos: `apps/web/src/features/settings/ProviderSettings.tsx`, `apps/web/src/features/library/AIUsage.tsx`, `apps/server/src/services/providers/usage.ts`, `tests/e2e/provider-settings.spec.ts`.
  - Aceptación: consultas/tokens/cache hits/fuentes reales, cuota/cancelar, coste estimado separado del gasto exacto; credencial solo configurada/no.
  - Verificación: contadores reconciliados SQL, retries contados, sin precio disponible mostrar no disponible y nunca coste inventado.

**Puerta P4:** flujo offline intacto y fallback seguro conectado. No anunciar integración live validada si falta credencial/permiso.

## Fase 5 — Simulación exacta y conflictos

Dependencia: P3 y política P4 integrada (OpenAI puede estar desactivado).

- [ ] P5.1 Constructor de paths estable.
  - Archivos: `packages/core/src/paths/library-path.ts`, `packages/core/src/paths/sanitize.ts`, `tests/unit/library-path.test.ts`, `tests/unit/compilations.test.ts`.
  - Aceptación: Artista/Álbum/NN, D-NN, compilación auténtica, sin track, Unicode, desambiguación por edición, no conversión de extensión.
  - Verificación: case-insensitive/NFC-NFD, nombres reservados, límite byte/segmento, títulos repetidos y álbumes homónimos.
- [ ] P5.2 Plan versionado y análisis de conflictos.
  - Archivos: `apps/server/src/services/planner/create-plan.ts`, `apps/server/src/services/planner/conflicts.ts`, `apps/server/src/db/migrations/003-plans.sql`, `tests/integration/plan.test.ts`.
  - Aceptación: snapshot inmutable, raíces/precondiciones, metadata/artwork/backup/duplicados y espacio; cambio invalida aprobación. Hash destino existente usa mismo servicio que P6.1, no duplicar implementación.
  - Verificación: conflicto interno y externo; mismo hash reutilizable, distinto hash bloqueado; plan de solo lectura deja raíces intactas. Ejecución sin nuevas consultas externas, respuestas/adaptadores congelados y cambios de versión invalidan aprobación; espacio retaggeado se etiqueta estimado, no exacto.
- [ ] P5.3 Pantalla de simulación y aprobación.
  - Archivos: `apps/web/src/features/organization/PlanPreview.tsx`, `apps/web/src/features/organization/ApprovalDialog.tsx`, `apps/server/src/api/plans.ts`, `tests/e2e/simulation.spec.ts`.
  - Aceptación: ORIGINAL ↓ DESTINO exacto, diffs de tags, espacio, excluidos, conflictos, modo inicial SIMULACIÓN; sin aplicar implícitamente.
  - Verificación: editar/replanificar, revisión obsoleta rechazada, seleccionar subconjunto, hashes fuente/destino iguales antes/después.

**Puerta P5:** simulación exacta de lo que podrá ejecutar el motor. Servicio hash de P6.1 debe estar integrado antes de dar por verificados conflictos binarios; puede desarrollarse como dependencia técnica adelantada sin habilitar copias.

## Fase 6 — Hash, duplicados, copia y organización real

Dependencia: P5; P6.1 se comparte anticipadamente con P5.2.

- [ ] P6.1 Hash streaming y duplicados exactos.
  - Archivos: `apps/server/src/services/filesystem/hash.ts`, `apps/server/src/services/duplicates/exact.ts`, `tests/integration/hashing.test.ts`, `tests/unit/duplicates.test.ts`.
  - Aceptación: SHA-256 completo, caché validada, un representante activo, original hash inmutable; archivo modificado invalida agrupación.
  - Verificación: bytes iguales/nombre distinto, metadata distinta/audio igual no exactos, archivos grandes y memoria acotada.
- [ ] P6.2 Candidatos musicales y calidad.
  - Archivos: `apps/server/src/services/duplicates/musical.ts`, `packages/core/src/quality/rank.ts`, `apps/web/src/features/duplicates/DuplicateReview.tsx`, `tests/unit/musical-duplicates.test.ts`.
  - Aceptación: FLAC/MP3 posibles, no autoeliminados; codec inspeccionado, preferencia configurable solo recomienda; evitar unión transitiva errónea.
  - Verificación: live/studio/remix, duración próxima, ISRC compartido y remaster distinto, selección conservar ambos con paths propios.
- [ ] P6.3 Motor copy/verify y journal inicial.
  - Archivos: `apps/server/src/services/organization/copy.ts`, `apps/server/src/services/filesystem/publish.ts`, `apps/server/src/services/audit/journal.ts`, `tests/integration/copy-verify.test.ts`.
  - Aceptación: INTENT durable antes de escribir, stream → hash independiente, no-clobber probado, ownership, locks y origen revalidado; cero borrado inicial.
  - Verificación: copia real temporal y hash final; source changed, destino creado concurrentemente, volumen cambiado, EACCES, ENOSPC, fallo de journal. Rechazar primitivas no seguras.
- [ ] P6.4 Aplicación integrada y cuarentena.
  - Archivos: `apps/server/src/jobs/organization-job.ts`, `apps/server/src/services/duplicates/quarantine.ts`, `apps/web/src/features/organization/RunProgress.tsx`, `tests/e2e/organize-library.spec.ts`.
  - Aceptación: crear Musica_Organizada solo al aprobar, paths exactos, duplicados pendientes con informe y originales intactos en SEGURO; pause/cancel status real.
  - Verificación: recorrido UI completo sobre archivos reales, cotejar árbol/hashes con plan; ninguna fila omitida sin estado/error.

**Puerta P6:** biblioteca organizada real sin retagging opcional todavía, hashes coincidentes, conflicto seguro, originales intactos. No habilitar retirada de originales hasta rollback P7.

## Fase 7 — Tags, auditoría completa y rollback

Dependencia: P6.

- [ ] P7.1 Spike de escritor y empaquetado aislado.
  - Archivos: `helpers/tag-writer/pyproject.toml`, `helpers/tag-writer/main.py`, `apps/server/src/services/metadata/write-adapter.ts`, `scripts/doctor.ts`, `docs/SUPPORT.md`.
  - Aceptación: Mutagen u alternativa tras revisión, no pip global, versiones/licencias, límites y timeout, doctor reproducible. Declarar unsupported/copy-only, no escritor genérico destructivo.
  - Verificación: instalación limpia del helper y protocolo real; comportamiento seguro si falta runtime/binario. Si no se cumple instalación simple, resolver empaquetado antes de producción.
- [ ] P7.2 Verificación por formato y audio payload.
  - Archivos: `apps/server/src/services/metadata/verify-tags.ts`, `apps/server/src/services/metadata/audio-payload.ts`, `tests/integration/tag-roundtrip.test.ts`, `tests/fixtures/tag-preservation.json`.
  - Aceptación: conservar desconocidos/custom/artwork/chapters/gapless; comparación de frames/packets real, no solo duración; raw hash separado de final hash.
  - Verificación: matriz MP3/FLAC/MP4/OGG/WAV/AIFF, tags raros y variantes; cualquier caso no demostrable deshabilita escritura de ese caso, no organización.
- [ ] P7.3 Backups y portadas opcionales.
  - Archivos: `apps/server/src/services/metadata/staged-update.ts`, `apps/server/src/services/audit/backups.ts`, `apps/server/src/services/providers/cover-art.ts`, `tests/integration/staged-tags.test.ts`.
  - Aceptación: backup íntegro antes de cambio, tags solo campos aprobados alta confianza, null no borra, artwork opcional con límites por bytes/píxeles, copia original intacta.
  - Verificación: archivos antes/después, rollback de retagging, imagen enorme/corrupta/redirect privado, ausencia de portada y fallo aislado sin conversión.
- [ ] P7.4 Recovery y reportes.
  - Archivos: `apps/server/src/services/audit/recovery.ts`, `apps/server/src/services/audit/reports.ts`, `apps/web/src/features/history/History.tsx`, `tests/integration/crash-recovery.test.ts`.
  - Aceptación: JSON/CSV, rutas y verificaciones exactas, reportes versionados y no overwrite de ajenos; recovery por estados de FS+DB no solo DB.
  - Verificación: matar proceso después de cada transición, reiniciar/reautorizar/reconciliar; sin archivos perdidos/adoptados a ciegas ni operaciones repetidas.
- [ ] P7.5 Deshacer con plan inverso.
  - Archivos: `apps/server/src/services/rollback/plan.ts`, `apps/server/src/services/rollback/execute.ts`, `apps/web/src/features/history/UndoDialog.tsx`, `tests/integration/rollback.test.ts`.
  - Aceptación: restaurar bytes originales y catálogo, solo ownership propio, hash actual validado; bloquear cambios humanos posteriores y dependencias.
  - Verificación: rollback completo y parcial, original existente/ausente, backup dañado, destino editado, preexistente reutilizado; original final idéntico al inicial.
- [ ] P7.6 Retirada/purga explícita y separada.
  - Archivos: `apps/server/src/services/organization/retire-originals.ts`, `apps/server/src/services/duplicates/purge.ts`, `apps/web/src/features/duplicates/PurgeDialog.tsx`, `tests/security/destructive-actions.test.ts`.
  - Aceptación: acción nueva tras organización, hashes y backups revalidados, cuarentena primero; eliminación permanente solo selección confirmada de duplicados autorizados, nunca limpieza recursiva genérica.
  - Verificación: cancelar confirmación hace cero cambios; paths inyectados/revisión obsoleta rechazados; purgar no elimina backups requeridos ni archivos ajenos; advertencia de irreversibilidad.

### PUERTA CORE — Entrega funcional I

**No pasar a fase 8 hasta que cada C01–C16 esté verificado, las fases 1–7 estén integradas y se hayan ejecutado controles de fase 9 aplicables al CORE.**

| ID | Criterio del usuario | Evidencia obligatoria | Estado |
|---|---|---|---|
| C01 | Seleccionar una carpeta real | Chrome picker y permiso nativo reales, cancelación/revocación | PENDIENTE |
| C02 | Escanear recursivamente | árbol temporal multinivel; conteos comprobados por script | PENDIENTE |
| C03 | Mostrar todas las canciones | tabla paginada/filtros y conteo DB = inventario detectado | PENDIENTE |
| C04 | Leer metadata | fixtures de audio reales para matriz declarada, tags nativos | PENDIENTE |
| C05 | Determinar título/artista/álbum/año cuando sea posible | casos local/path/release, desconocidos/ediciones correctos | PENDIENTE |
| C06 | Consultar Internet solo cuando sea necesario | consentimiento, logs/minimización, cero red casos locales | PENDIENTE |
| C07 | OpenAI solo fallback | tests de política + llamada Responses real autorizada | PENDIENTE |
| C08 | Mostrar confianza | badges + evidencia + score propio + revisión manual | PENDIENTE |
| C09 | Detectar duplicados | exactos SHA-256 y posibles musicales separados, calidad configurable | PENDIENTE |
| C10 | Simulación exacta | comparación plan vs árbol ejecutado; cero escritura al simular | PENDIENTE |
| C11 | Crear Musica_Organizada | carpeta real creada solo después de aprobación | PENDIENTE |
| C12 | Copiar y organizar | prueba E2E UI→API→FS, no helper desconectado | PENDIENTE |
| C13 | Verificar hash/no corrupción | original = raw copy; final y payload verificados tras tags | PENDIENTE |
| C14 | Renombrar | nombres por pista/disco/compilación/Unicode sin cambiar formato | PENDIENTE |
| C15 | Mantener historial | DB durable, JSON/CSV, recovery y rollback ensayados | PENDIENTE |
| C16 | No borrar accidentalmente | fallos/crashes/no-clobber, origen intacto, purga explícita | PENDIENTE |

Credencial OpenAI ausente permite entrega offline claramente limitada, pero **no** marcar C07 live aprobado ni entrega completa para el requisito del usuario. Si necesita desbloqueo externo, informar y pedirlo; no sustituir por respuesta fabricada.

## Fase 8 — Favoritos, playlists y exportaciones

Dependencia estricta: PUERTA CORE aprobada. No comenzar esta parte antes.

- [ ] P8.1 Favoritos y reglas de playlists locales.
  - Archivos: `apps/server/src/services/playlists/rules.ts`, `apps/server/src/db/playlists.ts`, `apps/web/src/features/playlists/Playlists.tsx`, `tests/integration/playlist-rules.test.ts`.
  - Aceptación: favoritos persistentes, artista/género/año/década/combinaciones, género original/normalizado, IDs estables y solo archivos finales activos.
  - Verificación: renombrar no pierde favorito, año desconocido no se inventa, cuarentena ausente, filtros compuestos correctos.
- [ ] P8.2 XML y M3U8 puros.
  - Archivos: `apps/server/src/services/playlists/apple-xml.ts`, `apps/server/src/services/playlists/m3u8.ts`, `tests/unit/apple-xml.test.ts`, `tests/unit/m3u8.test.ts`.
  - Aceptación: plist válido, tracks/referencias consistentes, `pathToFileURL`, escaping sin doble encoding; M3U8 UTF-8 portable.
  - Verificación: parseo con parser independiente/plutil, roundtrip fileURLToPath, archivos existentes, espacios/ñ/CJK/&/#/%/comillas, líneas maliciosas, IDs y orden estables.
- [ ] P8.3 Exportación conectada y segura.
  - Archivos: `apps/server/src/services/playlists/export.ts`, `apps/web/src/features/playlists/AppleExport.tsx`, `apps/server/src/api/playlists.ts`, `tests/e2e/playlist-export.spec.ts`.
  - Aceptación: una/varias/todas en `_Playlists`, conflictos explícitos, formatos incompatibles con Música informados sin conversión.
  - Verificación: leer archivos exportados desde FS real, resolver todas sus rutas y cotejar miembros con catálogo.
- [ ] P8.4 Importación real de Apple y documentación.
  - Archivos: `README.md`, `docs/APPLE-MUSIC-ACCEPTANCE.md`, `tests/fixtures/apple-xml-reference.xml`.
  - Aceptación: sección IMPORTAR EN APPLE MUSIC con añadir biblioteca primero, esperar y luego importar XML; copia automática/rutas/formato explicados.
  - Verificación: importar canciones de prueba y XML generado en biblioteca de Música de prueba aislada autorizada; comprobar membresía/reproducción/formato. No escribir DB privada. Documentar cualquier necesidad de intervención del usuario.

### PUERTA PLAYLISTS — Entrega funcional II

| ID | Criterio del usuario | Evidencia obligatoria | Estado |
|---|---|---|---|
| L01 | Marcar favoritos | estado sobrevive reinicio y renombrado | PENDIENTE |
| L02 | Playlists por artista | miembros reales correctos | PENDIENTE |
| L03 | Playlists por género | original/normalizado, combinaciones | PENDIENTE |
| L04 | Playlists por año/década | límites de décadas/fecha edición/desconocidos | PENDIENTE |
| L05 | Crear Apple Music XML | validación + importación real aislada | PENDIENTE |
| L06 | Crear M3U8 | UTF-8, rutas y orden comprobados | PENDIENTE |
| L07 | Guardar en _Playlists | exportaciones reales sin overwrite implícito | PENDIENTE |
| L08 | Explicar importación en Música de Apple | README y ensayo de instrucciones | PENDIENTE |

## Fase 9 — Calidad transversal, rendimiento y empaquetado final

No esperar a la fase 8 para comenzar estas tareas. Se ejecutan incrementalmente y se repiten para CORE y PLAYLISTS.

- [ ] P9.1 Suites y cobertura crítica.
  - Archivos: `vitest.config.ts`, `playwright.config.ts`, `tests/security/acceptance.test.ts`, `docs/ACCEPTANCE.md`.
  - Aceptación: todas las categorías solicitadas presentes, gates y fallos críticos ensayados; cobertura no sustituye comportamiento.
  - Verificación: lint, typecheck, unit/integration/e2e/security con exit codes reales; no `--passWithNoTests` ni suites críticas skipped para declarar éxito.
- [ ] P9.2 Benchmark grande reproducible.
  - Archivos: `tests/performance/catalog-benchmark.ts`, `tests/performance/scan-benchmark.ts`, `docs/PERFORMANCE.md`.
  - Aceptación: 1k/10k/50k+ inventario, batches/streaming/virtualización, pausa/cancel responsive, duplicados sin comparación cuadrática total.
  - Verificación: medir RSS/CPU/event loop/latencias, documentar hardware y tamaños; distinguir benchmark de metadata del de audio físico real, sin extrapolación presentada como medición.
- [ ] P9.3 Revisión de seguridad, licencias y dependencias.
  - Archivos: `docs/SECURITY.md`, `docs/THIRD-PARTY-NOTICES.md`, `docs/SUPPORT.md`, `scripts/check-release.ts`.
  - Aceptación: modelo de amenazas/OS/volúmenes soportados, licencias auxiliares, ningún secreto, dependencias fijadas y vulnerabilidades revisadas; todas las escrituras limitadas a grants.
  - Verificación: revisión independiente de pipeline destructivo, tests TOCTOU/no-clobber/SSRF/CSRF/XSS, auditoría dependencias con hallazgos y mitigación real.
- [ ] P9.4 Instalación y producción desde limpio.
  - Archivos: `README.md`, `scripts/start.ts`, `scripts/dev.ts`, `scripts/doctor.ts`, `docs/TEST-RESULTS.md`.
  - Aceptación: comandos simples funcionan, migraciones/puertos/shutdown claros, helper empaquetado o instalador explícito reproducible, local-only sin red obligatoria para funcionar.
  - Verificación: directorio limpio → `npm install` → lint/typecheck/tests/build → `npm start` → healthcheck y E2E contra build de producción. Reiniciar/reanudar un job y deshacer organización real de prueba.
- [ ] P9.5 Cierre con evidencia, sin claims parciales.
  - Archivos: `TASKS.md`, `docs/ACCEPTANCE.md`, `docs/TEST-RESULTS.md`.
  - Aceptación: cada fila CORE/PLAYLISTS tiene evidencia identificable o estado bloqueado; no marcar preparado para producción si faltan verificaciones críticas.
  - Verificación: auditoría programática de IDs/cobertura/recuentos y revisión humana del informe. Entregar ruta del proyecto, comandos, límites y resultados reales resumidos.

## Dependencias y paralelismo permitido

Secuencia principal: P1 → P2 → P3 → P4 → P5 → P6 → P7 → CORE → P8 → PLAYLISTS; P9 transversal. P6.1 hash se puede adelantar para P5.2.

En paralelo, después de definir contratos: normalizadores/tests, adaptador MusicBrainz/caché, tabla/vistas SQL; después de P6, matrices de tags y reportes/UI de historial. No varios escritores sobre el mismo módulo crítico. Integración/operaciones/rollback bajo un responsable y revisión independiente. No delegar permisos del usuario ni usar subagentes como sustituto de pruebas.

## Trazabilidad de los apartados originales

| Requisito | Cobertura prevista |
|---|---|
| R01 Objetivo, análisis antes de cambios | P1–P7, CORE, pausa B.0 |
| R02 Arquitectura web/local | P1.1–P1.4, ADR-01/02/03 |
| R03 Carpetas/estructura/formatos | P1.3–P1.5, P5.1, P6.4 |
| R04 Metadatos completos | P2.2, P3.2/P3.3, P7.2 |
| R05 Normalización conservadora | P3.1 |
| R06 Identificación escalonada | P3.2–P3.5, P4.2 |
| R07 OpenAI oficial/modelo/schema | P4.1–P4.4 |
| R08 API key/no auth privada | P1.2, P4.1, P9.3 |
| R09 Fuentes/fechas/edición | P3.2/P3.3/P3.5, P4.2 |
| R10 Confianza/edición | P2.4, P3.5, P4.3 |
| R11 Renombrado/Unicode | P5.1/P5.3, P6.4 |
| R12 Tags/artwork/rollback | P7.1–P7.5 |
| R13 Duplicados exactos/musicales/calidad | P6.1/P6.2 |
| R14 Cuarentena/purga confirmada | P6.4, P7.6 |
| R15 Copiar/verificar/retirar después | P6.3, P7.3/P7.6 |
| R16 Simulación/aprobación | P5.2/P5.3 |
| R17 DB/catálogo/reanudar | P2.1/P2.3, P9.4 |
| R18 Auditoría/reportes/deshacer | P6.3, P7.4/P7.5 |
| R19 Interfaz/sidebar/progreso | P1.5, P2.4/P2.5, P6.4 |
| R20 Tabla/filtros/edición/lotes | P2.4, P3.5, P4.3 |
| R21 Estadísticas OpenAI | P4.4 |
| R22 Caché | P3.4 |
| R23 Playlists/favoritos posterior | CORE → P8.1 |
| R24 Apple XML/M3U8/exportar | P8.2/P8.3 |
| R25 Importación Apple/file URLs | P8.2/P8.4 |
| R26 Géneros/reglas | P3.1, P8.1 |
| R27 Conflictos/identidad álbum | P3.2, P5.1/P5.2 |
| R28 Ediciones/remasters | P3.1/P3.2/P3.5, P5.1 |
| R29 Tests/fixtures reales | P2.2, tests de todas las fases, P9.1 |
| R30 Protección de archivos | P1.4, P5.2, P6.3, P7, P9.3 |
| R31 Modos SIMULACIÓN/SEGURO/ORGANIZAR | P5.3, P6.4, P7.6 |
| R32 Configuración | P1.3, P4.4, P5.3, P7.3, P8.1/P8.3 |
| R33 Privacidad/local/minimización | P1.2, P3.4, P4.2, P9.3 |
| R34 Errores aislados/categorizados | P1.5, P2.3, P3.3, P4.1, P6.3, P7.4 |
| R35 Rendimiento/control | P2.3/P2.4, P6.1/P6.2, P9.2 |
| R36 Orden técnico nueve fases | este documento; P9 transversal, CORE antes de P8 |
| R37 Árbol final esperado | P5.1, P6.4, P7.4, P8.3 |
| R38 Aceptación organizador/playlists | C01–C16 y L01–L08 |
| R39 Forma de trabajo/documentos/ejecución | etapa A realizada; B.0 antes de instalar/programar, gates reales |

## Estado de verificación en esta etapa

Verificado: directorio elegido no existía antes de crear documentos; herramientas locales inspeccionadas en lectura; documentación técnica consultada; arquitectura/plan escritos.
No ejecutado por el relevo de modelo solicitado: npm install, lint, typecheck, tests de aplicación, build, servidor, escaneo de biblioteca, escritura/renombrado de audio, OpenAI de la aplicación e importación Apple.
No hay credenciales configuradas ni permisos de música concedidos. El siguiente paso requiere el mensaje del usuario que autorice implementación con el modelo elegido.
