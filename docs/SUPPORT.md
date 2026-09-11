# Soporte

## Lectura y organización

| Formato | Lectura | Copia/renombrado | Tags opcionales |
|---|---:|---:|---:|
| MP3 | Sí | Sí | Helper aislado probado; bloqueado en la app |
| FLAC | Sí | Sí | Helper aislado; bloqueado en la app |
| M4A AAC / M4A ALAC | Sí, codec inspeccionado | Sí | Helper aislado; bloqueado en la app |
| OGG Vorbis / Opus | Sí | Sí | Helper aislado; bloqueado en la app |
| WAV / AIFF | Sí | Sí | Helper aislado; bloqueado en la app |
| AAC ADTS | Sí | Sí | Copy-only |
| DRM/cifrado/corrupto | Error registrado | No si no puede leerse con seguridad | No |

«Lectura» no implica autorización para reescribir tags. El flujo operativo actual es copy-only: el helper de tags se prueba por separado y no está conectado a la aplicación. La app preserva la extensión y el codec; nunca convierte audio.

## Plataformas

macOS + Chrome y volúmenes locales son el primer objetivo probado. Firefox/Safari pueden usar capacidades reducidas porque `showDirectoryPicker` no es equivalente. Windows, Linux, NAS, exFAT/FAT y carpetas sincronizadas requieren adaptador/ensayo antes de habilitar operaciones de escritura.

## Límites conocidos

- Una pista sin tags ni contexto útil puede permanecer sin identificar.
- MusicBrainz/OpenAI son opcionales y necesitan configuración/consentimiento.
- La simulación fija rutas/acciones/tags, pero el tamaño tras retagging es una estimación.
- Apple Music no importa necesariamente todos los codecs que la biblioteca local puede conservar.
