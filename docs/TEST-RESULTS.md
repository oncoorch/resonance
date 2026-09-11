# Evidencia de verificación

Fecha: 2026-09-10 18:49:59 -0500
Plataforma: macOS, Node.js 26.8.1, Chrome/Chromium.

## Puertas automatizadas

Ejecutadas desde `/Users/Rattio/music-library-organizer`:

| Comando | Resultado |
|---|---|
| `npm run lint` | PASSED |
| `npm run typecheck` | PASSED |
| `npm test` | PASSED — 26 archivos, 54 tests |
| `npm run tags:test` | PASSED — 3 tests sobre copias sintéticas |
| `npm run test:e2e` | PASSED — acceso sin login, selección de carpeta en un paso y campo de API key en Chromium |
| `npm run build` | PASSED — frontend y servidor de producción |
| `npm audit` | PASSED — 0 vulnerabilidades conocidas |

## Pruebas cubiertas

- Inicio automático sin login visible, cookie HttpOnly, CSRF, validación Host/Origin y rutas de test bloqueadas en producción.
- Grants de raíz, rechazo de solapamientos, traversal, symlinks y sustitución de raíz.
- Selección nativa directa de carpeta en un solo paso, sin aceptar rutas arbitrarias desde el navegador.
- Lectura real de MP3, FLAC, M4A/AAC, M4A/ALAC, AAC, OGG, Opus, WAV y AIFF sintéticos.
- Hash SHA-256 incremental, detección de duplicados exactos y exclusión de archivos retirados tras reescaneo.
- Plan con modo y revisión inmutables, hashes de origen congelados, conflictos existentes e internos, CAS de ejecución y prohibición de escritura desde simulación.
- Copia no-clobber con `O_NOFOLLOW`, verificación antes y después, `fsync` y publicación por hard link.
- Reinicios durante `applying` pasan a `recovery_required` y bloquean automatización.
- Rollback por hash e identidad; una copia modificada queda bloqueada en vez de eliminarse.
- Playlists bloqueadas hasta una organización aplicada; únicamente la regla certificada de favoritas está habilitada.
- M3U8 y XML Apple generados desde rutas finales; publicación no-clobber.
- Helper de tags contenido por raíz de staging y desconectado del organizador operativo.
- MusicBrainz con contacto, rate limit, caché, timeout y respuesta acotada; OpenAI estructurado, backend-only, timeout, sin almacenamiento y con aceptación humana.

## Smoke de producción

- `npm start` sirvió la aplicación y API en loopback.
- La sesión local se creó automáticamente, sin token ni pantalla de login.
- Dashboard conectado renderizado sin datos de demostración.
- Playlists aparecieron deshabilitadas antes de superar la puerta del organizador.
- Consola del navegador: 0 errores, 0 advertencias después de la carga verificada.

## No verificado todavía

- No se ha escaneado ni modificado música real del usuario.
- No se ha ejecutado una consulta live a MusicBrainz u OpenAI.
- No se ha importado XML en Música de Apple; por tanto, esa compatibilidad no se declara certificada.
- Tags, carátulas, retirada de originales, NAS, exFAT/FAT y volúmenes cloud permanecen bloqueados.
- No existe repositorio Git en el directorio; no hubo commit.
