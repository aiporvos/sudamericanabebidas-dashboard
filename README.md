# Dashboard de Calidad — Sudamericana Bebidas

SPA (React + TypeScript + Vite + Recharts) que muestra las evidencias de **Calidad de Lata**
procesadas por el pipeline Telegram → n8n → gpt-4o. Lee los datos del webhook del
workflow **WF6 «API Dashboard»** (`GET /webhook/dashboard-calidad`, consulta
`v_evidencias_completas` en Postgres).

- **KPIs:** evidencias, % OK, No OK, revisión manual pendiente, confianza media, tokens + costo.
- **4 gráficos:** evidencias por día (apilado), resultados por línea, fotos por tipo, consumo de IA.
- **Filtros:** fecha, línea (multi), tipo de foto (multi), resultado, estado, búsqueda libre.
- **Tabla:** ordenable y paginada, con coherencia lata↔tablero, defectos y textos leídos.
- Si el webhook no responde, muestra **datos de ejemplo** con un banner de aviso.

## Desarrollo local

```bash
cd apps/dashboard
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + bundle en dist/
```

La URL del webhook se puede cambiar con `VITE_WEBHOOK_URL` (default:
`https://n8n.aiporvos.com/webhook/dashboard-calidad`).

## Docker

```bash
cd apps/dashboard
docker build -t sudamericana-dashboard .
docker run -p 8080:80 sudamericana-dashboard   # http://localhost:8080
```

Para otro webhook: `docker build --build-arg VITE_WEBHOOK_URL=https://... .`
(es build-arg, no variable de runtime: Vite la inyecta en el bundle al compilar).

## Repos y flujo de deploy

- **Repo de trabajo (este):** `aiporvos/sudamericanabebidas` — toda la solución (agentes, docs, workflows, dashboard).
- **Repo de deploy:** `aiporvos/sudamericanabebidas-dashboard` — solo el contenido de `apps/dashboard`, en la raíz. Es el que mira Dokploy.

Para publicar cambios del dashboard (desde la raíz del repo de trabajo):

```bash
git add apps/dashboard && git commit -m "dashboard: <cambio>"
git subtree push --prefix=apps/dashboard dashboard main
```

(el remote `dashboard` apunta a `git@github-aiporvos:aiporvos/sudamericanabebidas-dashboard.git`)

## Deploy en Dokploy

1. En el proyecto **Sudamericana** → *Create Service* → **Application**.
2. Source: GitHub → repo **`sudamericanabebidas-dashboard`**, branch `main`, Build Path `/`, Trigger `On Push`.
3. Build type: **Dockerfile**, *Docker File*: `Dockerfile` (está en la raíz del repo de deploy).
4. En *Domains* agregá el dominio (p. ej. `calidad.aiporvos.com`), puerto **80**, HTTPS con Let's Encrypt.
5. Deploy. Cada `git subtree push` redeploya automáticamente.

### ⚠️ CORS del WF6 (imprescindible)

El navegador solo puede leer el webhook si n8n responde con
`Access-Control-Allow-Origin` que incluya el dominio del dashboard. En el nodo
**Webhook** de WF6, en *Options → Allowed Origins (CORS)*, poner el dominio del
dashboard (p. ej. `https://calidad.aiporvos.com`) o `*` para el MVP. Sin esto, el
dashboard queda en «datos de ejemplo» con el banner rojo.

Checklist rápido si no carga:
1. WF6 **activo** en n8n (toggle ON) → probar `curl https://n8n.aiporvos.com/webhook/dashboard-calidad`.
2. CORS configurado (ver arriba).
3. Vista `v_evidencias_completas` existente en Postgres (`db/vistas-bi.sql`).
