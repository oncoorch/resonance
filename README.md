# Resonancia — Music Library Organizer

Aplicación web local para analizar, revisar y organizar música **sin convertir audio ni borrar originales por defecto**.

## Estado y seguridad

- Plataforma de aceptación inicial: macOS + Chrome.
- El análisis y la simulación no escriben en las carpetas seleccionadas.
- El modo seguro copia por stream, compara SHA-256 y publica sin sobrescribir.
- MusicBrainz y OpenAI están desactivados hasta configurarlos; nunca se envía audio.
- La escritura de tags permanece bloqueada en la aplicación. Existe un helper aislado probado con fixtures, pero no se conecta al organizador hasta completar la certificación por contenedor.
- No modifica `Music Library.musiclibrary` ni usa APIs privadas de Apple.

## Requisitos

- Node.js 22 o superior y npm.
- Chrome/Chromium para la interfaz local.
- Opcional: `uv` para el escritor conservador de tags.
- Opcional: una API key de OpenAI Platform y contacto válido para MusicBrainz.

## Instalar y ejecutar

```bash
npm install
npm run doctor
npm run dev
```

Abre `http://127.0.0.1:4173`. Para build local:

```bash
npm run build
npm start
```

El servidor solo escucha en `127.0.0.1`. No hay login ni token visible. La aplicación crea automáticamente una sesión técnica HttpOnly y conserva las defensas CSRF, Host y Origin.

### Spike de tags (no habilita escritura en la app)

```bash
npm run tags:setup
npm run tags:test
```

Estos comandos prueban el helper sobre copias sintéticas. El flujo operativo sigue siendo copy-only y no modifica tags.

### OpenAI y MusicBrainz

También puedes colocar la API key directamente en **Configuración → OpenAI**. Se conserva únicamente en la memoria del servicio local y no se devuelve al navegador. Como alternativa, puedes exportarla en el entorno:

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-luna
MUSICBRAINZ_CONTACT=
```

La key solo se lee en Node; no uses prefijos `VITE_`. Una suscripción de ChatGPT no reemplaza una API key de OpenAI Platform. MusicBrainz requiere un contacto real y limita consultas; la app aplica cola y caché.

## Flujo

1. **Seleccionar carpeta de música** abre el selector nativo de macOS y comienza inmediatamente el análisis de solo lectura.
2. Revisar confianza, candidatos, duplicados y ediciones.
3. **Simular organización** genera un plan inmutable con rutas exactas y conflictos.
4. Aprobar y aplicar en modo seguro. Los originales permanecen intactos.
5. Consultar historial. El rollback solo elimina copias publicadas si su hash final sigue intacto; nunca retira originales.

Nunca elijas como destino una carpeta igual, superior o interior al origen.

## Pruebas

```bash
npm run fixtures:generate
npm test
npm run tags:test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm audit
```

Los fixtures son tonos sintéticos de 0,2 segundos; no contienen música del usuario.

## IMPORTAR EN APPLE MUSIC

1. Termina y verifica la organización antes de exportar playlists.
2. En Música, añade primero la carpeta `Musica_Organizada` a la biblioteca y espera a que aparezcan las canciones.
3. En Resonancia, exporta una playlist como Apple XML en `_Playlists/`.
4. En Música elige **Archivo > Biblioteca > Importar playlist** y selecciona el XML.
5. La importación solo enlaza canciones que Música ya reconoce en su biblioteca. Formatos no compatibles se informan y pueden conservarse en M3U8 para otros reproductores; la app no los convierte.
6. Si quieres mantener una sola copia física, revisa la preferencia de Música para copiar archivos al añadirlos y evita que Música reorganice los archivos. Cambiar paths después puede romper referencias.

Las URL `file://` se generan desde paths finales absolutos y se escapan mediante APIs estándar. XML y M3U8 no escriben en la base privada de Música.

## Documentación

- `ARCHITECTURE.md`: decisiones, invariantes y modelo de amenazas.
- `TASKS.md`: fases y criterios de aceptación.
- `docs/SECURITY.md`: límites de confianza y operaciones destructivas.
- `docs/SUPPORT.md`: formatos y plataformas.
- `docs/TEST-RESULTS.md`: evidencia de ejecución.
