# El Diario Nacional

Página web de noticias lista para desplegar en Render.com.

## Archivos

```
noticiero/
├── index.html   — Página principal
├── style.css    — Estilos
├── main.js      — Lógica interactiva
├── render.yaml  — Configuración de Render
└── README.md
```

## Cómo subir a Render

1. **Sube los archivos a GitHub:**
   - Crea un repo en github.com
   - Sube los 4 archivos (index.html, style.css, main.js, render.yaml)

2. **Crea el servicio en Render:**
   - Ve a https://render.com y crea cuenta gratuita
   - Click en **"New +"** → **"Static Site"**
   - Conecta tu repositorio de GitHub
   - En **"Publish Directory"** escribe: `.`
   - Click **"Create Static Site"**

3. **¡Listo!** Render te dará una URL del tipo `https://el-diario-nacional.onrender.com`

## Personalización

- Cambia el nombre del periódico en `index.html` (busca "El Diario Nacional")
- Edita colores en `style.css` en la sección `:root`
- Reemplaza las noticias de ejemplo con contenido real
