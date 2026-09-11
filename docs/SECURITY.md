# Seguridad

## Límites de confianza

El navegador, nombres/tags de archivos, respuestas externas y paths recibidos son no confiables. El servidor acepta operaciones de filesystem solo mediante IDs opacos de raíces autorizadas en la sesión; el endpoint de paths directos existe exclusivamente en tests. Se rechazan rutas relativas peligrosas, enlaces simbólicos y raíces superpuestas.

El servicio escucha solo en loopback y valida Host/Origin, sesión HttpOnly y CSRF. No habilitar CORS global ni exponer el puerto por túneles. Las credenciales de proveedores nunca se sirven al frontend ni se registran.

## Invariantes de archivos

- Análisis y simulación: cero escrituras en origen/destino.
- Copia: staging exclusivo, SHA-256 independiente y publicación no-clobber.
- Tags: solo staging, formatos permitidos; nunca null como instrucción de borrado.
- Retirada/borrado: no forman parte de la aplicación automática inicial.
- Rollback: no reemplaza o elimina un archivo modificado después por el usuario.
- Audio: nunca se envía a MusicBrainz/OpenAI.

## Alcance certificado

La publicación no-clobber usa hard links desde un temporal en el mismo directorio; funciona en volúmenes macOS locales que soporten links POSIX. Volúmenes de red, FAT/exFAT, proveedores cloud y Windows/Linux requieren pruebas específicas. Ante una capacidad no demostrada, la app debe bloquear la escritura y seguir en simulación/copy-only.

## Reportar

No incluyas API keys, rutas personales completas ni archivos de audio en un reporte. Adjunta el estado de `npm run doctor`, versión de Node, código de error y pasos con una carpeta temporal reproducible.
