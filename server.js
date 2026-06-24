require('dotenv').config();
const express = require('express');
const path    = require('path');
const cron    = require('node-cron');
const fetch   = require('node-fetch');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── CONFIGURACIÓN ────────────────────────────────────────────
// URL base de tu API de noticias (si está en otro servicio de Render)
// Si es el mismo servidor, déjalo vacío ""
const NEWS_API_BASE = process.env.NEWS_API_BASE || "";

// Facebook
const FB_PAGE_ID      = process.env.FB_PAGE_ID;       // ID numérico de tu página
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;  // Token de página (long-lived)

// URL pública de tu sitio (para incluir en los posts de Facebook)
const SITE_URL = process.env.SITE_URL || "https://tu-sitio.onrender.com";

// Intervalo de publicación (expresión cron)
// Por defecto: cada 3 horas  →  "0 */3 * * *"
// Cada hora                  →  "0 * * * *"
// Cada 30 minutos            →  "*/30 * * * *"
const CRON_INTERVAL = process.env.CRON_INTERVAL || "0 */3 * * *";

// ─── ESTADO EN MEMORIA ────────────────────────────────────────
let publishedUrls = new Set();   // evita duplicados entre ciclos
let publishLog    = [];          // historial de publicaciones (últimas 50)
let lastRun       = null;
let nextRun       = null;
let isRunning     = false;

// ─── HELPERS ──────────────────────────────────────────────────
function logEntry(status, titulo, url, error = null) {
  const entry = {
    fecha: new Date().toISOString(),
    status,   // "ok" | "skip" | "error"
    titulo,
    url,
    error,
  };
  publishLog.unshift(entry);
  if (publishLog.length > 50) publishLog.pop();
  console.log(`[FB] ${status.toUpperCase()} — ${titulo?.slice(0, 60)}`);
  return entry;
}

// ─── OBTENER NOTICIAS ─────────────────────────────────────────
async function getTopNoticias(cantidad = 5) {
  const url = `${NEWS_API_BASE}/noticias/top?idioma=es&cantidad=${cantidad}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`News API error ${res.status}`);
  const data = await res.json();
  return data.articulos || [];
}

// ─── PUBLICAR EN FACEBOOK ─────────────────────────────────────
async function postToFacebook(articulo) {
  if (!FB_PAGE_ID || !FB_ACCESS_TOKEN) {
    throw new Error("FB_PAGE_ID o FB_ACCESS_TOKEN no configurados en .env");
  }

  // Armar mensaje atractivo
  const emoji = {
    business: "💼", tech: "💻", sports: "⚽", health: "🏥",
    science: "🔬", entertainment: "🎭", world: "🌍",
    politics: "🏛️", general: "📰",
  };
  const icon = emoji[articulo.categoria] || "📰";

  const mensaje = [
    `${icon} ${articulo.titulo}`,
    "",
    articulo.descripcion ? articulo.descripcion.slice(0, 200) + (articulo.descripcion.length > 200 ? "…" : "") : "",
    "",
    `🔗 Lee la nota completa en El Diario Nacional:`,
    `${SITE_URL}`,
    "",
    `Fuente: ${articulo.fuente || "El Diario Nacional"}`,
  ].filter(l => l !== undefined).join("\n");

  // Publicar con link (Facebook genera preview automático)
  const fbUrl = `https://graph.facebook.com/v19.0/${FB_PAGE_ID}/feed`;
  const body = {
    message: mensaje,
    link: articulo.url,  // URL original del artículo → FB genera Open Graph preview
    access_token: FB_ACCESS_TOKEN,
  };

  const res = await fetch(fbUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Facebook API error ${res.status}`);
  }
  return data.id; // post id
}

// ─── CICLO PRINCIPAL ──────────────────────────────────────────
async function publicarNoticias() {
  if (isRunning) return;
  isRunning = true;
  lastRun   = new Date().toISOString();
  console.log(`\n[FB] Iniciando ciclo de publicación — ${lastRun}`);

  try {
    const articulos = await getTopNoticias(5);

    for (const art of articulos) {
      if (publishedUrls.has(art.url)) {
        logEntry("skip", art.titulo, art.url);
        continue;
      }

      try {
        const postId = await postToFacebook(art);
        publishedUrls.add(art.url);
        logEntry("ok", art.titulo, art.url);
        console.log(`[FB] Post creado: ${postId}`);

        // Pequeña pausa entre posts para no saturar la API
        await new Promise(r => setTimeout(r, 3000));
      } catch (err) {
        logEntry("error", art.titulo, art.url, err.message);
      }
    }
  } catch (err) {
    console.error("[FB] Error obteniendo noticias:", err.message);
    logEntry("error", "Error al obtener noticias", null, err.message);
  } finally {
    isRunning = false;
  }
}

// ─── CRON ─────────────────────────────────────────────────────
function calcNextRun(cronExpr) {
  // Aproximación: parsear horas del patrón */N
  const match = cronExpr.match(/\*\/(\d+)/);
  if (match) {
    const ms = parseInt(match[1]) * 60 * 60 * 1000;
    return new Date(Date.now() + ms).toISOString();
  }
  return "—";
}

const job = cron.schedule(CRON_INTERVAL, () => {
  nextRun = calcNextRun(CRON_INTERVAL);
  publicarNoticias();
}, { timezone: "America/Mexico_City" });

nextRun = calcNextRun(CRON_INTERVAL);
console.log(`[FB] Cron programado: "${CRON_INTERVAL}" — Próxima ejecución ~${nextRun}`);

// ─── RUTAS EXPRESS ────────────────────────────────────────────
app.use(express.static(path.join(__dirname)));

// Panel de estado (JSON) — úsalo para monitorear
app.get('/admin/fb-status', (req, res) => {
  // Protección simple con token de admin
  const token = req.query.token;
  if (process.env.ADMIN_TOKEN && token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "No autorizado" });
  }
  res.json({
    configurado: !!(FB_PAGE_ID && FB_ACCESS_TOKEN),
    cron: CRON_INTERVAL,
    ultimaEjecucion: lastRun,
    proximaEjecucion: nextRun,
    enEjecucion: isRunning,
    urlsPublicadas: publishedUrls.size,
    historial: publishLog,
  });
});

// Forzar publicación manual (útil para pruebas)
app.post('/admin/fb-publicar-ahora', async (req, res) => {
  const token = req.query.token;
  if (process.env.ADMIN_TOKEN && token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "No autorizado" });
  }
  if (isRunning) {
    return res.json({ mensaje: "Ya hay un ciclo en ejecución, espera." });
  }
  res.json({ mensaje: "Ciclo iniciado en segundo plano." });
  publicarNoticias();
});

// Limpiar historial de URLs publicadas (para re-publicar)
app.post('/admin/fb-limpiar', (req, res) => {
  const token = req.query.token;
  if (process.env.ADMIN_TOKEN && token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "No autorizado" });
  }
  publishedUrls.clear();
  res.json({ mensaje: "Historial limpiado. Las noticias podrán publicarse de nuevo." });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🗞️  El Diario Nacional en puerto ${PORT}`);
  console.log(`📘 Facebook autopublicación: ${FB_PAGE_ID ? "ACTIVA" : "⚠️  Pendiente de configurar .env"}`);

  // Ejecutar inmediatamente al arrancar (opcional, comenta si no quieres)
  // publicarNoticias();
});
