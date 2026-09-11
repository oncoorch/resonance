# RESONANCE — Music Library Organizer

Aplicación web local para analizar, revisar y organizar bibliotecas musicales grandes **sin convertir audio, sin borrar originales y sin login visible**.

## Qué hace

- Escanea recursivamente una carpeta de música real y reporta auditoría de cobertura: audios leídos, bytes de audio, archivos no-audio ignorados y errores.
- Propone nombres finales limpios usando el nombre de la canción directamente, sin prefijos como `01 -` o `001.`.
- Genera una revisión de solo lectura antes de escribir nada.
- Separa claramente el flujo:
  1. **EJECUTAR REVISIÓN**: analiza origen/destino y crea plan, no escribe.
  2. **REVISAR Y APROBAR**: congela la revisión, no escribe.
  3. **APLICAR Y EJECUTAR**: copia al destino en modo seguro.
- Incluye **STOP** para detener una ejecución antes del siguiente archivo.
- Trata conflictos de destino así:
  - archivo diferente o colisión interna: bloqueo;
  - destino ya contiene el mismo archivo por tamaño/hash: advertencia aprobable, sin sobrescribir.
- Mantiene originales intactos. El modo seguro copia, verifica hash y registra rollback.
- Exporta playlists compatibles con Apple Music solo después de verificar el organizador.

## Seguridad

- Servidor local en `127.0.0.1`.
- Acepta `http://127.0.0.1:4888/`, `http://localhost:4888/` y `http://resonance.local:4888/`.
- Defensas de Host/Origin, sesión HttpOnly y CSRF.
- No acepta rutas arbitrarias desde el navegador; usa permisos/grants emitidos por backend.
- Rechaza symlinks, traversal, archivos especiales y origen/destino solapados.
- OpenAI se configura en **Configuración → OpenAI**; la key queda solo en memoria del proceso Node y no se devuelve al frontend. No envía audio.

## Requisitos

- macOS + Chrome/Chromium para el selector nativo.
- Node.js 22 o superior y npm.
- Opcional: `uv` para tests del helper de tags.
- Opcional: API key de OpenAI Platform y contacto MusicBrainz.

## Instalar y ejecutar en desarrollo

```bash
npm install
npm run doctor
npm run dev
```

Abre `http://127.0.0.1:4173`.

## Ejecutar producción local

```bash
npm run build
NODE_ENV=production npm start
```

Abre:

- `http://resonance.local:4888/`
- o `http://127.0.0.1:4888/`

Para activar `resonance.local`, el equipo debe tener esta línea en `/etc/hosts`:

```text
127.0.0.1 resonance.local
```

## Docker

```bash
docker compose up --build
```

El contenedor publica solo loopback:

```yaml
ports:
  - "127.0.0.1:4888:4888"
```

Para usar carpetas reales con Docker, monta explícitamente origen y destino en `docker-compose.yml`; se recomienda origen `:ro`:

```yaml
volumes:
  - /ruta/a/musica:/music/source:ro
  - /ruta/a/destino:/music/destination
```

En macOS, para el flujo completo con selector nativo, se recomienda producción local sin Docker.

## Flujo de uso

1. Pulsa **Seleccionar carpeta de música**.
2. Elige la carpeta origen; el análisis es de solo lectura.
3. Revisa la auditoría: cantidad de audios, bytes, no-audio ignorado y errores.
4. Ve a Organización y autoriza destino.
5. Pulsa **EJECUTAR REVISIÓN**.
6. Corrige bloqueos si aparecen.
7. Pulsa **REVISAR Y APROBAR**. Esto no escribe.
8. Pulsa **APLICAR Y EJECUTAR**. Esto copia al destino y verifica.
9. Si detectas un error durante miles de operaciones, pulsa **STOP**.

## Apple Music

1. Termina y verifica la organización.
2. En Música, añade la carpeta organizada a la biblioteca.
3. Exporta playlist desde RESONANCE como Apple XML o M3U8.
4. En Música usa **Archivo → Biblioteca → Importar playlist**.

RESONANCE no modifica `Music Library.musiclibrary` ni usa APIs privadas de Apple.

## Pruebas

```bash
npm run fixtures:generate
npm run lint
npm run typecheck
npm test
npm run tags:test
npm run test:e2e
npm run build
npm audit
```

Los fixtures son sintéticos y no contienen música del usuario.

## Documentación

- `AGENTE.md`: handoff para Codex/Claude/Antigravity u otros agentes.
- `ARCHITECTURE.md`: arquitectura, seguridad e invariantes.
- `TASKS.md`: fases y criterios de aceptación.
- `docs/SECURITY.md`: modelo de confianza y límites.
- `docs/SUPPORT.md`: formatos y soporte.
- `docs/TEST-RESULTS.md`: evidencia de pruebas.
