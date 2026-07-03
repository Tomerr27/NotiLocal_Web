/* ============================================================
   El Diario Nacional — main.js
   Integración con News API (tu servidor en Render)
   ============================================================ */

// ——— CONFIGURACIÓN ———
// Apunta a tu propio servidor Node de noticias en Render.
// Si el frontend y el API están en el mismo servidor, usa "" (ruta relativa).
// Si son servicios distintos, pon la URL completa, ej:
//   const API_BASE = "https://tu-api.onrender.com";
const API_BASE = "https://notilocal.onrender.com";   // <-- cambia aquí si tu API está en otro dominio

const IMG_FALLBACK = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=70&auto=format";

/* ============================================================
   ADSENSE — carga responsable
   ------------------------------------------------------------
   Las Políticas del Programa de AdSense prohíben mostrar anuncios
   servidos por Google en pantallas SIN contenido del editor (vacías,
   en carga/skeleton, en error) o usadas solo para navegación.
   Por eso el script de AdSense y los <ins class="adsbygoogle"> nunca
   se cargan por adelantado: se insertan y se muestran únicamente
   cuando ya hay noticias reales renderizadas en la página, y se
   ocultan de nuevo mientras se cargan nuevas secciones.
   ============================================================ */
let adsScriptLoaded = false;
const AD_SLOT_IDS = ["ad-slot-1", "ad-slot-2"];

function hideAds() {
  AD_SLOT_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  });
}

function showAdsForRealContent() {
  // Nunca mostrar anuncios si no hay artículos reales que acompañarlos.
  const slots = AD_SLOT_IDS.map(id => document.getElementById(id)).filter(Boolean);
  if (!slots.length) return;

  if (!adsScriptLoaded) {
    adsScriptLoaded = true;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4996768496189065";
    script.crossOrigin = "anonymous";
    script.onload = () => {
      slots.forEach(slot => {
        slot.hidden = false;
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* noop */ }
      });
    };
    document.head.appendChild(script);
  } else {
    slots.forEach(slot => { slot.hidden = false; });
    // Si el script ya está cargado y estamos re-mostrando anuncios en una
    // navegación posterior, no volvemos a hacer push sobre <ins> ya inicializados.
  }
}

// Mapa de categoría API → badge CSS + etiqueta visual
const CAT_MAP = {
  business:      { cls: "cat-economia",  label: "Economía" },
  tech:          { cls: "cat-tech",      label: "Tecnología" },
  sports:        { cls: "cat-deportes",  label: "Deportes" },
  health:        { cls: "cat-mexico",    label: "Salud" },
  science:       { cls: "cat-tech",      label: "Ciencia" },
  entertainment: { cls: "cat-politica",  label: "Cultura" },
  world:         { cls: "cat-mundo",     label: "Mundo" },
  politics:      { cls: "cat-politica",  label: "Política" },
  general:       { cls: "cat-mexico",    label: "México" },
};

function catInfo(cat) {
  return CAT_MAP[cat] || { cls: "cat-mexico", label: cat || "Noticias" };
}

function tiempoRelativo(fechaStr) {
  if (!fechaStr) return "";
  const diff = (Date.now() - new Date(fechaStr)) / 1000;
  if (diff < 60)   return "Hace un momento";
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400)return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} días`;
}

async function fetchNoticias(params = {}) {
  const qs = new URLSearchParams({ idioma: "es", pais: "mx", cantidad: 10, ...params });
  const res = await fetch(`${API_BASE}/noticias?${qs}`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const data = await res.json();
  return data.articulos || [];
}

async function fetchTop(params = {}) {
  const qs = new URLSearchParams({ idioma: "es", cantidad: 10, ...params });
  const res = await fetch(`${API_BASE}/noticias/top?${qs}`);
  if (!res.ok) throw new Error(`Error ${res.status}`);
  const data = await res.json();
  return data.articulos || [];
}

// ——— TICKER ———
function buildTicker(articulos) {
  const track = document.getElementById("ticker");
  if (!track || !articulos.length) return;

  const items = articulos.map(a =>
    `<span class="ticker-item">${a.titulo}</span><span class="sep">·</span>`
  ).join("");

  track.innerHTML = items + items; // duplicar para loop infinito

  const totalW = track.scrollWidth / 2;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes ticker-scroll {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-${totalW}px); }
    }
  `;
  document.head.appendChild(style);
  track.style.animation = `ticker-scroll ${Math.max(30, totalW / 60)}s linear infinite`;

  const bar = document.querySelector(".breaking-bar");
  if (bar) bar.addEventListener("mouseenter", () => track.style.animationPlayState = "paused");
  if (bar) bar.addEventListener("mouseleave", () => track.style.animationPlayState = "running");
}

// ——— HERO ———
function renderHero(articulos) {
  if (!articulos.length) return;
  const a = articulos[0];
  const cat = catInfo(a.categoria);

  // Imagen
  const imgWrap = document.querySelector(".hero-img-wrap");
  const img = document.getElementById("hero-img");
  if (imgWrap && img) {
    imgWrap.classList.remove("skeleton-box");
    img.src = a.imagen || IMG_FALLBACK;
    img.alt = a.titulo;
    img.style.display = "block";
    img.onerror = () => { img.src = IMG_FALLBACK; };
  }

  // Badge
  const badgeEl = document.getElementById("hero-cat");
  if (badgeEl) {
    badgeEl.className = `category-badge ${cat.cls}`;
    badgeEl.textContent = cat.label;
    badgeEl.style.display = "";
  }

  // Eyebrow
  const eyebrow = document.getElementById("hero-eyebrow");
  if (eyebrow) eyebrow.textContent = a.fuente || "Noticia destacada";

  // Título
  const titleEl = document.getElementById("hero-title");
  if (titleEl) titleEl.textContent = a.titulo;

  // Deck
  const deckEl = document.getElementById("hero-deck");
  if (deckEl) deckEl.textContent = a.descripcion || "";

  // Meta
  const metaEl = document.getElementById("hero-meta");
  if (metaEl) {
    metaEl.innerHTML = `
      ${a.autor ? `<span class="author">Por <strong>${a.autor}</strong></span>` : ""}
      <time>${tiempoRelativo(a.publicado_en)}</time>
    `;
  }

  // Extracto — texto adicional del artículo (más allá del resumen corto),
  // para aprovechar el espacio del hero y dar más contexto antes de salir
  // hacia la fuente original.
  const extractEl = document.getElementById("hero-extract");
  if (extractEl) {
    const extracto = (a.contenido || "").trim();
    if (extracto && extracto.toLowerCase() !== (a.descripcion || "").trim().toLowerCase()) {
      extractEl.innerHTML = `${extracto} <a href="${a.url}" target="_blank" rel="noopener" class="hero-extract-link" onclick="event.stopPropagation();">Leer la nota completa en ${a.fuente || "la fuente original"} →</a>`;
      extractEl.style.display = "";
    } else {
      extractEl.style.display = "none";
    }
  }

  // "También te puede interesar" — un par de enlaces relacionados para
  // llenar el espacio del hero con contenido útil en vez de vacío.
  const relatedEl = document.getElementById("hero-related");
  if (relatedEl) {
    const relacionados = articulos.slice(1, 4);
    if (relacionados.length) {
      relatedEl.innerHTML = `
        <strong class="hero-related-title">También te puede interesar</strong>
        <ul>
          ${relacionados.map(r => `<li><a href="${r.url}" target="_blank" rel="noopener" onclick="event.stopPropagation();">${r.titulo}</a></li>`).join("")}
        </ul>
      `;
    }
  }

  // Click → abrir artículo
  const heroMain = document.getElementById("hero-main");
  if (heroMain && a.url) {
    heroMain.style.cursor = "pointer";
    heroMain.addEventListener("click", () => window.open(a.url, "_blank", "noopener"));
  }
}

// ——— SIDEBAR ———
function renderSidebar(articulos) {
  const sidebar = document.getElementById("hero-sidebar");
  if (!sidebar) return;
  const items = articulos.slice(1, 6);
  sidebar.innerHTML = items.map((a, i) => {
    const cat = catInfo(a.categoria);
    return `
      ${i > 0 ? '<div class="divider"></div>' : ""}
      <article class="side-card" tabindex="0" role="link"
        onclick="window.open('${a.url}','_blank','noopener')"
        style="cursor:pointer;">
        <span class="category-badge ${cat.cls}">${cat.label}</span>
        <h3 class="headline-md">${a.titulo}</h3>
        <div class="meta-row">
          <time>${tiempoRelativo(a.publicado_en)}</time>
        </div>
      </article>
    `;
  }).join("");
}

// ——— GRID SECUNDARIO ———
function renderGrid(articulos) {
  const grid = document.getElementById("news-grid");
  if (!grid) return;
  const items = articulos.slice(6, 12);
  if (!items.length) { grid.innerHTML = "<p style='color:var(--gris-500);grid-column:1/-1;padding:16px 0'>No hay más artículos disponibles.</p>"; return; }

  grid.innerHTML = items.map(a => {
    const cat = catInfo(a.categoria);
    return `
      <article class="news-card" tabindex="0" role="link"
        onclick="window.open('${a.url}','_blank','noopener')"
        style="cursor:pointer;">
        <div class="card-img-wrap">
          <img src="${a.imagen || IMG_FALLBACK}" alt="${a.titulo}"
            loading="lazy" onerror="this.src='${IMG_FALLBACK}'" />
        </div>
        <span class="category-badge ${cat.cls}">${cat.label}</span>
        <h3 class="headline-sm">${a.titulo}</h3>
        <p class="card-deck">${a.descripcion || ""}</p>
        <div class="meta-row">
          ${a.autor ? `<span class="author">Por <strong>${a.autor}</strong></span>` : ""}
          <time>${tiempoRelativo(a.publicado_en)}</time>
        </div>
      </article>
    `;
  }).join("");
}

// ——— COLUMNAS MUNDO / DEPORTES ———
async function renderColumna(elId, categoria) {
  const el = document.getElementById(elId);
  if (!el) return;
  try {
    const arts = await fetchNoticias({ categoria, cantidad: 4 });
    if (!arts.length) throw new Error("vacío");
    el.innerHTML = arts.map((a, i) => {
      const cat = catInfo(a.categoria);
      return `
        ${i > 0 ? '<div class="divider"></div>' : ""}
        <article class="list-article" tabindex="0" role="link"
          onclick="window.open('${a.url}','_blank','noopener')"
          style="cursor:pointer;">
          <span class="category-badge ${cat.cls}">${cat.label}</span>
          <h3 class="headline-sm">${a.titulo}</h3>
          <time>${tiempoRelativo(a.publicado_en)}</time>
        </article>
      `;
    }).join("");
  } catch {
    el.innerHTML = `<p style="color:var(--gris-500);padding:12px 0;font-size:.85rem;">No se pudieron cargar las noticias.</p>`;
  }
}

// ——— BÚSQUEDA ———
function initSearch() {
  const input  = document.getElementById("search-input");
  const btn    = document.getElementById("search-btn");
  const status = document.getElementById("search-status");

  async function doSearch() {
    const q = input.value.trim();
    if (!q) return;
    btn.disabled = true;
    btn.textContent = "Buscando...";
    status.hidden = false;
    status.textContent = `Buscando "${q}"...`;
    document.getElementById("seccion-label").textContent = `Resultados: ${q}`;
    hideAds(); // pantalla de búsqueda en curso: sin anuncios hasta tener resultados

    try {
      const arts = await fetchNoticias({ q, cantidad: 15 });
      if (!arts.length) {
        status.textContent = "No se encontraron resultados.";
        return;
      }
      status.hidden = true;
      renderHero(arts);
      renderSidebar(arts);
      renderGrid(arts);
      showAdsForRealContent();
      window.scrollTo({ top: document.querySelector(".hero").offsetTop - 80, behavior: "smooth" });
    } catch(e) {
      status.textContent = "Error al buscar. Intenta de nuevo.";
    } finally {
      btn.disabled = false;
      btn.textContent = "Buscar";
    }
  }

  btn.addEventListener("click", doSearch);
  input.addEventListener("keydown", e => { if (e.key === "Enter") doSearch(); });
}

// ——— NAV POR CATEGORÍA ———
function initNav() {
  document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      const cat = link.dataset.categoria;
      const label = link.textContent;
      document.getElementById("seccion-label").textContent = cat ? `Sección: ${label}` : "Lo más reciente";

      // Limpiar búsqueda
      document.getElementById("search-input").value = "";
      document.getElementById("search-status").hidden = true;

      // Mostrar skeletons mientras carga (y ocultar anuncios: pantalla de carga)
      document.getElementById("hero-sidebar").innerHTML = skeletonCards(4);
      document.getElementById("news-grid").innerHTML = skeletonCards(3, true);
      hideAds();

      try {
        const arts = cat
          ? await fetchNoticias({ categoria: cat, cantidad: 15 })
          : await fetchTop({ cantidad: 15 });
        if (!arts.length) throw new Error("vacío");
        renderHero(arts);
        renderSidebar(arts);
        renderGrid(arts);
        showAdsForRealContent();
      } catch {
        showError("No se pudieron cargar las noticias de esta sección.");
        hideAds();
      }
    });
  });
}

function skeletonCards(n, full = false) {
  return Array.from({ length: n }).map((_, i) =>
    `${i > 0 && !full ? '<div class="divider"></div>' : ""}
     <div class="${full ? "news-card " : ""}skeleton-card${full ? "-full" : ""}"></div>`
  ).join("");
}

function showError(msg) {
  const grid = document.getElementById("news-grid");
  if (grid) grid.innerHTML = `<p style="color:var(--gris-500);grid-column:1/-1;padding:16px 0">${msg}</p>`;
}

// ——— RELOJ ———
function initClock() {
  const el = document.querySelector(".date-tag");
  if (!el) return;
  const opts = { weekday:"long", year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit" };
  const update = () => el.textContent = new Date().toLocaleDateString("es-MX", opts);
  update();
  setInterval(update, 60000);
}

// ——— NEWSLETTER ———
function initNewsletter() {
  const btn   = document.querySelector(".newsletter-form button");
  const input = document.querySelector(".newsletter-form input[type=email]");
  if (!btn || !input) return;
  btn.addEventListener("click", () => {
    if (!input.value.includes("@")) { input.style.borderColor = "#D63031"; input.focus(); return; }
    input.style.borderColor = "";
    btn.textContent = "¡Suscrito!";
    btn.style.background = "#00B894";
    input.value = "";
    input.disabled = btn.disabled = true;
    setTimeout(() => {
      btn.textContent = "Suscribirme";
      btn.style.background = "";
      input.disabled = btn.disabled = false;
    }, 4000);
  });
}

// ——— DEEP LINK POR CATEGORÍA (?categoria=tech) ———
function applyCategoriaFromURL() {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get("categoria");
  if (!cat) return;
  const link = document.querySelector(`.nav-link[data-categoria="${cat}"]`);
  if (link) link.click();
}

// ——— INIT ———
async function init() {
  initClock();
  initSearch();
  initNav();
  initNewsletter();

  try {
    // Carga principal: top noticias
    const [topArts, mundoArts] = await Promise.all([
      fetchTop({ cantidad: 15 }),
      fetchNoticias({ categoria: "world", cantidad: 4 }),
    ]);

    buildTicker(topArts);
    renderHero(topArts);
    renderSidebar(topArts);
    renderGrid(topArts);

    // Columnas
    await Promise.all([
      renderColumna("col-mundo", "world"),
      renderColumna("col-deportes", "sports"),
      renderColumna("col-tech", "tech"),
      renderColumna("col-cultura", "entertainment"),
    ]);

    // Solo mostramos anuncios cuando confirmamos que hay noticias reales.
    if (topArts.length) showAdsForRealContent(); else hideAds();

    // Si se llegó desde un enlace con ?categoria=, aplicar ese filtro
    applyCategoriaFromURL();

  } catch (err) {
    console.error("Error cargando noticias:", err);
    document.getElementById("ticker").innerHTML =
      '<span class="ticker-item">No se pudo conectar con el servidor de noticias.</span>';
    showError("No se pudo conectar con la API de noticias. Verifica que tu servidor esté activo.");
    hideAds(); // nunca anuncios sobre una pantalla de error / sin contenido
  }
}

document.addEventListener("DOMContentLoaded", init);
