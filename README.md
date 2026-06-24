# El Diario Nacional — Con Autopublicación en Facebook

## Archivos del proyecto
```
noticiero/
├── index.html        — Página principal con noticias en tiempo real
├── style.css         — Estilos
├── main.js           — Lógica del frontend (integración con API de noticias)
├── server.js         — Servidor Express + cron de Facebook
├── package.json      — Dependencias
├── .env.example      — Plantilla de variables de entorno
└── render.yaml       — Config de Render
```

---

## ¿Cómo configurar Facebook?

### Paso 1 — Crear una app en Meta for Developers
1. Ve a https://developers.facebook.com
2. Click en **"Mis apps"** → **"Crear app"**
3. Tipo: **"Empresa"** o **"Acceso a funciones de la app"**
4. Añade el producto **"Facebook Login"** y **"Pages API"**

### Paso 2 — Obtener el Page Access Token
1. Ve a **Graph API Explorer**: https://developers.facebook.com/tools/explorer
2. Selecciona tu app en el desplegable superior
3. En **"User or Page"** selecciona tu Página de Facebook
4. Agrega los permisos: `pages_manage_posts`, `pages_read_engagement`
5. Click en **"Generate Access Token"** y autoriza
6. Copia el token generado

### Paso 3 — Convertir a token de larga duración (importante)
El token anterior dura ~1 hora. Para que sea permanente:
```
GET https://graph.facebook.com/v19.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id=TU_APP_ID
  &client_secret=TU_APP_SECRET
  &fb_exchange_token=TOKEN_CORTO
```
Puedes hacer esto directo en el Graph API Explorer con el endpoint anterior.

### Paso 4 — Obtener el ID de tu Página
- Ve a tu Página de Facebook → Acerca de → desplázate hasta el final → **ID de la página**
- O en el Graph API Explorer ejecuta: `GET /me?fields=id,name` con el token de página

---

## Variables de entorno en Render

En tu servicio de Render → **Environment** → agrega:

| Variable         | Valor                          |
|------------------|-------------------------------|
| `FB_PAGE_ID`     | ID numérico de tu página      |
| `FB_ACCESS_TOKEN`| Token de larga duración       |
| `SITE_URL`       | https://tu-sitio.onrender.com |
| `CRON_INTERVAL`  | `0 */3 * * *` (cada 3 horas)  |
| `NEWS_API_BASE`  | URL de tu API (si es otro servicio) |
| `ADMIN_TOKEN`    | Una contraseña segura         |

---

## Endpoints de administración

| Endpoint | Descripción |
|----------|-------------|
| `GET /admin/fb-status?token=TU_TOKEN` | Ver estado, historial de posts y próxima ejecución |
| `POST /admin/fb-publicar-ahora?token=TU_TOKEN` | Forzar publicación inmediata |
| `POST /admin/fb-limpiar?token=TU_TOKEN` | Limpiar historial (permite re-publicar) |

---

## Configuración en Render (Web Service Node)

- **Build Command:** `npm install`
- **Start Command:** `node server.js`
- **Environment:** Node
