# AGENTE.md — guía para agentes IA

## Proyecto
RESONANCE es una aplicación web local para organizar bibliotecas musicales grandes en macOS + Chrome. Debe operar de forma conservadora: leer primero, simular/revisar, aprobar, aplicar en modo seguro y conservar originales.

## Invariantes no negociables
- No repetir ni almacenar claves API compartidas por el usuario. Cualquier key vista en chat se considera comprometida y debe revocarse.
- El servidor escucha en loopback; proteger Host/Origin/CSRF/sesión. `resonance.local` debe resolver a `127.0.0.1`.
- No aceptar paths arbitrarios del frontend salvo en tests; usar grants/capacidades emitidos por backend.
- Rechazar symlinks, traversal, archivos especiales y solapamiento origen/destino.
- No modificar originales ni recodificar audio.
- Simulación/revisión no escribe. Aprobación no escribe. Solo la aplicación final escribe en destino autorizado.
- La revisión aprobada es inmutable: ejecución no reconsulta IA.
- Copia byte a byte, hash final, no clobber; destino existente idéntico por tamaño/hash es advertencia aprobable, no bloqueo.
- Playlists Apple/M3U8 solo después de que el organizador haya sido verificado.

## Estado implementado
- MVP React/Vite + Fastify + SQLite.
- Selector nativo macOS sin login/token visible.
- Campo OpenAI en Configuración; key solo en memoria del proceso Node.
- Escaneo recursivo con auditoría de archivos audio/no-audio/bytes.
- Nombres finales sin prefijo numérico de pista.
- Flujo: EJECUTAR REVISIÓN → REVISAR Y APROBAR → APLICAR Y EJECUTAR; STOP para ejecución en curso.
- Conflictos explicados: bloqueos para archivos distintos/colisiones; advertencias para destino idéntico.
- Tema pastel/kawaii con unicornio/arcoíris.
- Dockerfile y docker-compose local.

## Comandos de desarrollo
```bash
npm install
npm run doctor
npm run dev
npm run typecheck
npm test
npm run tags:test
npm run test:e2e
npm run build
npm audit
```

## Producción local
```bash
npm run build
NODE_ENV=production npm start
# abrir http://resonance.local:4888/ o http://127.0.0.1:4888/
```

## Docker
```bash
docker compose up --build
```
Para usar carpetas reales en Docker, montar explícitamente origen como `:ro` y destino como lectura/escritura en `docker-compose.yml`.

## Fases realizadas
1. Investigación de APIs y modelo de amenazas.
2. Arquitectura/planificación en `ARCHITECTURE.md` y `TASKS.md`.
3. MVP backend/frontend con pruebas unitarias, integración, seguridad y E2E.
4. Endurecimiento: grants, CSRF, Host/Origin, no-clobber, rollback verificado, staging de tags, ocultamiento de paths sensibles al navegador.
5. Ajustes pedidos por usuario: GitHub primero, auditoría completa, naming sin números, flujo claro con STOP, tema infantil, docs Docker y `resonance.local`.

## Checklist antes de entregar cambios
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run tags:test`
- [ ] `npm run test:e2e`
- [ ] `npm run build`
- [ ] `npm audit`
- [ ] Verificar UI real en `http://resonance.local:4888/` o `http://127.0.0.1:4888/`.
- [ ] Revisar `git diff` para confirmar que no hay secretos.
- [ ] Commit convencional y push a `origin/main`.

## TODO siguiente
- Implementar ejecución realmente en background/job queue para progreso por archivo persistente más fino.
- Añadir reporte descargable de auditoría de escaneo: audio leído, no-audio ignorado, errores, bytes esperados vs bytes del plan.
- Añadir edición manual masiva de metadatos antes de aprobar.
- Certificar escritura de tags por formato/adaptador en contenedor antes de habilitarla.
- Añadir comparación de destino anterior cuando cambian reglas de naming para sugerir limpieza segura de duplicados ya organizados.
- Añadir importación guiada a Apple Music con checklist visual.
