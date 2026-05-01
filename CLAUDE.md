# T2Tcrm — Contexto del proyecto

CRM web a medida para Time2Train (centro de entrenamiento personal y salud en Madrid).

## Stack

- **Frontend**: React 18 + Vite (sin TypeScript, sin Tailwind). Estilos inline mediante objeto de tema dark/light.
- **Backend**: Supabase (PostgreSQL) vía REST. Migrar las anon keys hardcodeadas en `App.jsx` y `Bonus.jsx` a variables de entorno está pendiente.
- **Despliegue**: Vercel (`fitcrm-beige.vercel.app`). PWA con service worker.
- **API serverless**: `api/chat.js` (proxy a Anthropic) y `api/timp.js` (proxy a TIMP Pro).
- **Backups**: GitHub Actions + `scripts/backup.mjs` vuelcan tablas Supabase a `backups/*.json` con notificación a Telegram.
- **Lazy loading**: todos los módulos cargan con `React.lazy` desde `App.jsx`.

## Integración TIMP Pro

- **Centro UUID**: `ebb9a2c0-782e-4d77-b5eb-17d18a1f8949`.
- **Endpoints útiles**: `/subscriptions` (clientes, active_membership, phone, email), `/autopurchases` (bonos, fraccionados), `/admissions` (solo reservas futuras), `/vouchers` (tipos de bono), `/purchases`.
- **No disponibles vía API**: sesiones consumidas, admissions pasadas, cuotas semanales (vienen del Excel "Cuotas").
- **Fechas TIMP**: vienen en UTC. Convertir SIEMPRE a hora local antes de mostrar/comparar.
- Solo Jesús y Miguel autorizados en el bot de Telegram (`ALLOWED_TG_IDS` en Vercel).

## Módulo Renovaciones

Renovación = última semana del bono. Semana de renovación = lunes de `fechaValor`.

**Estados**:
- `Pendiente`: aún no ha pagado.
- `Reserva`: ha pagado ≤ 30% del precio.
- `MitadPagada`: ha pagado > 30% (fraccionado, 2º pago a las 6 semanas).
- `Renovado`: pagado al completo.
- `NoRenueva`: marcado manualmente.

**Reglas**:
- Filtrar `active_membership: false`.
- Cliente con bono futuro (semanas en blanco) sigue activo.
- Pagos fraccionados se autodetectan desde TIMP.
- Reserva → resto se cobra en la próxima clase.
- MitadPagada → 2º pago 6 semanas después.
- Las alertas no se disparan si está en estado mitad/reserva/renovado.

## Parser de Excel "Cuotas"

Multi-sección. Reglas clave:

- `AGOTADO` = `usadas + caducadas ≥ total` AND `enUso == 0`.
- `sinCanjear` = sesiones futuras → no contar.
- `enUso` = sesiones pendientes → no contar.
- Semana de renovación = semana del Excel + 7 días.
- Filtros: excluir apaños (`cad ≥ total`), excluir si el cliente tiene otro bono activo, deduplicar por cliente, excluir bajas, excluir si hay un bono más nuevo (`hasNewerBono`).
- Blacklist editable: tabla `client_blacklist` con UI modal en Renovaciones.

## Excel "Reservas transcurridas"

Se sube cada lunes (rango 01/01/YYYY → domingo de la semana del Cuotas).

- Cruzar con Cuotas: para cada bono activo, contar reservas con `Estado = Aceptada` AND `Canjeada = Sí/No` (pendiente de canje cuenta), `Venta` contiene `tipoBono`, `Inicio` entre `fechaValor` y domingo.
- Si `reservas_reales ≥ total` → `AGOTADO`.
- Fallback a `usadas + caducadas` si no hay archivo de Reservas.
- Botón en UI: 📤 Reservas. Clave Supabase: `reservas_excel`.

## Bonos (whitelist de entrenamiento)

**Incluidos**: Bono 10/20/5 sesiones duales, Entrenamiento sesión, Time partner (1d), Time partner plus (2d), Time pro (3d), Time pro+ (4d), todos en versión trimestral.

**Excluidos**: Fisio, Nutrición, Gympass.

**Sesiones por tipo**:
| Bono | 4 semanas | Trimestral |
|---|---|---|
| Time partner (1d) | 4 | 12 |
| Time plus (2d) | 8 | 24 |
| Time pro (3d) | 12 | 36 |
| Time pro+ (4d) | 16 | 48 |

- Bonos duales (10/20/5 sesiones): validez 6 meses.
- "Cabeza Cuadrada": gestión de sesiones avanzadas. Consume sesión pendiente de canje y cancela una del final del bono.

## Cancelaciones y reservas

- Una cancelación solo cuenta si el cliente NO tiene otra sesión válida ese mismo día.
- Alertas de cola solo si `reservas válidas < capacidad`.
- Auto-refresh cada 5 minutos.
- Estados booking: `valid`, `canceled`, `at_queue`, `canceled_at_queue`.
- Métodos de pago: `credit_card`, `inapp`, `deposit`, `cash`, `debit`, `installment`. Objetivo: migrar todos a `inapp`.

## Retrasos de pago

Tab dentro de Renovaciones. Lógica:

- **Pago único sin pagar** → retraso desde día 7.
- **Fraccionado con 2º pago pendiente** → retraso desde día 49 (semana 7: el 2º pago tocaba en la semana 6 + 1 semana de gracia).
- Tope por defecto: 60 días.
- Componente: `RetrasosPago.jsx`.
- Clientes movidos manualmente marcan flag `movido: true` (precio completo). Compatibilidad retro: notas con "Movido desde" se tratan como `movido`.

## Performance

- Caché TIMP local en `localStorage` (key `t2tcrm_timp_cache`) → CRM carga en <1s.
- Auto-sync cada 60s. Constante `SYNC_INTERVAL_MS` configurable.
- Flag `syncInProgress` previene sincronizaciones duplicadas.
- Botón global 🔄 Refrescar en header con animación.

## Módulos del CRM

- **Entrenamiento**: tab Fichas primero. 7 ejercicios con series/peso/reps → volumen y score.
- **Nutrición**.
- **Fisioterapia**: informes de sesión, notificaciones de día de entreno. Tabla Supabase: `fisio_reports`.
- **Horarios**: cuadrante semanal del staff, asignación de festivos con dropdowns de intercambio.
- **Leads**: filtro año/mes. Estados Excel: Nada / En Negociación / Entreno de Prueba / Alta / Perdido. Alta resaltado en verde. Campo de fecha de contacto y origen.
- **Clientes**: borrado con confirmación.
- **Bonus**: lógica de fidelización a 90 días (trimestral+1 renovación, o 4+ mensuales, o mensual→trimestral).
- **Pagos**: cobros desglosados por método.
- **Cancelaciones**: admisiones/cancelaciones próximas N semanas vía TIMP.
- **AIAssistant**: chat con contexto del CRM, consulta `/api/chat`.
- **Dashboard**: stats de clientes, renovaciones de la semana, vista mensual.

## Datos importados

- 148 clientes con ~4.200 registros de ejercicios.
- 268 leads (LEADS_25.xlsx + LEADS_26.xlsx).
- 301 clientes (186 activos, 115 inactivos) desde `Time2Train_Actualizado.xlsx` vía 11 archivos HTML.

## Equipo y centro

- Centro: Time2Train, calle Modesto Lafuente, Madrid.
- ~190 clientes, 7 personas en plantilla (Miguel, Diego, Mari Carmen, Maribel, Marcelo, Laura, Jesús).
- Servicios: entrenamiento, nutrición, fisioterapia.
- Expansión en estudio: 2ª sede en Doctor Esquerdo (Niño Jesús, Retiro).

## Convenciones de código

- Componentes en `src/`, nombrados en PascalCase.
- Sin TypeScript: cuidado con tipos en runtime, sobre todo con fechas y números de Excel.
- Estilos inline con objeto de tema (`T`).
- Las anon keys de Supabase están hardcodeadas (deuda técnica conocida — migrar a env vars).
- README está desactualizado (describe arquitectura antigua con localStorage).
