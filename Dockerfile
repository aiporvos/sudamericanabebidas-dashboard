# ── Etapa 1: build de la SPA ────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .
# URL del webhook n8n (WF6) y contraseña de acceso. Se fijan en build-time
# porque Vite las inyecta en el bundle (no hay backend propio en esta SPA).
ARG VITE_WEBHOOK_URL=https://n8n.aiporvos.com/webhook/dashboard-calidad
ARG VITE_DASHBOARD_PASSWORD=calidad2026
ENV VITE_WEBHOOK_URL=$VITE_WEBHOOK_URL
ENV VITE_DASHBOARD_PASSWORD=$VITE_DASHBOARD_PASSWORD
RUN npm run build

# ── Etapa 2: nginx sirviendo estáticos ──────────────────────────────────────
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
