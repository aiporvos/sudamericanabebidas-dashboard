# Dashboard de Calidad — Sudamericana Bebidas

SPA (React + TypeScript + Vite + Recharts) que muestra las evidencias de **Calidad de Lata**
procesadas por el pipeline Telegram → n8n → gpt-4o. Lee los datos del webhook del
workflow **WF6 «API Dashboard»** (`GET /webhook/dashboard-calidad`, consulta
`v_evidencias_completas` en Postgres).

- **KPIs:** evidencias, % OK, No OK, revisión manual pendiente, confianza media, tokens + costo.
- **4 gráficos:** evidencias por día (apilado), resultados por línea, fotos por tipo, consumo de IA.
- **Filtros:** fecha, línea (multi), tipo de foto (multi), resultado, estado, búsqueda libre.
- **Tabla:** ordenable y paginada, con coherencia lata↔tablero, defectos y textos leídos.
- **Detalle con foto:** clic en una fila abre un modal con la imagen original (MinIO) y todos los campos.
- **Login** con logo de Sudamericana Bebidas — gate de acceso simple (ver abajo).
- **Chat "Lupa"** — asistente IA flotante, integrado con n8n (ver abajo).
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

## Login

Pantalla de acceso simple con el logo de Sudamericana Bebidas (`src/assets/logo-sudamericana.png`,
fondo blanco removido). Es un **gate del lado del cliente**, sin backend propio: la contraseña se
fija en build-time con `VITE_DASHBOARD_PASSWORD` (default: `calidad2026`) y queda en el bundle JS —
sirve para que no entre cualquiera que encuentre la URL, **no es seguridad real** (los datos en sí
ya dependen del CORS de WF6). Al loguearse se guarda un flag en `localStorage`
(`sudamericana_dashboard_auth`); el botón **Salir** del header lo borra. Lógica en `src/auth.ts`,
componente en `src/components/Login.tsx`.

Para cambiar la contraseña en producción: `docker build --build-arg VITE_DASHBOARD_PASSWORD=<clave> .`
o el equivalente en Dokploy (Environment → build args).

## Chat "Lupa" (asistente IA)

Burbuja flotante abajo a la derecha (bottom sheet en móvil) que abre un panel de chat.
Componente en `src/components/ChatWidget.tsx`, lógica de sesión/fetch en `src/chat.ts`.

- **Sesión**: `sessionId` persistido en `localStorage` (`sudamericana_calidad_chat_session`)
  para que n8n pueda mantener contexto entre recargas. Botón "Nueva sesión" en la cabecera
  del chat lo resetea.
- **Endpoint**: `POST` a `VITE_CHAT_WEBHOOK_URL` (default:
  `https://n8n.aiporvos.com/webhook/dashboard-calidad-chat`), body
  `{ "session_id": "...", "mensaje": "..." }`, respuesta esperada `{ "respuesta": "..." }`.
  Timeout de 30s con `AbortController`.

> ⚠️ **El webhook todavía NO EXISTE en n8n** (falta construir un workflow nuevo, ej.
> "Calidad de Lata — 7) Chat Asistente IA", con nodo AI Agent + lectura de
> evidencias/resultados en Postgres, y CORS `Allowed Origins` = `https://dashboard.cluna.ar`
> igual que WF6). Hasta entonces, el chat funciona visualmente pero cualquier mensaje
> enviado muestra el error de conexión — es el comportamiento esperado, no un bug.

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
4. En *Domains* agregá el dominio (actual: `dashboard.cluna.ar`), puerto **80**, HTTPS con Let's Encrypt.
5. Deploy. Cada `git subtree push` redeploya automáticamente (o botón Deploy manual si el
   provider de GitHub no dispara solo — ver historial del proyecto).

### ⚠️ CORS del WF6 (imprescindible)

El navegador solo puede leer el webhook si n8n responde con
`Access-Control-Allow-Origin` que incluya el dominio del dashboard. En el nodo
**Webhook** de WF6, en *Options → Allowed Origins (CORS)*, está fijado a
`https://dashboard.cluna.ar` (cerrado, no `*`). Si cambia el dominio, actualizar ahí
y en el nodo "Responder JSON". Sin esto, el dashboard queda en «datos de ejemplo» con el banner rojo.

Checklist rápido si no carga:
1. WF6 **activo** en n8n (toggle ON) → probar `curl https://n8n.aiporvos.com/webhook/dashboard-calidad`.
2. CORS configurado (ver arriba).
3. Vista `v_evidencias_completas` existente en Postgres (`db/vistas-bi.sql`).
