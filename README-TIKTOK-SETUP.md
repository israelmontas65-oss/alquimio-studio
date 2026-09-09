# Guía Paso a Paso: Configuración Oficial de TikTok Developer API v2 para Alquimia Studio

Esta guía contiene las instrucciones exactas para conectar tu aplicación de TikTok Developer con el backend de **Alquimia Studio** en Cloudflare Pages.

---

## 1. Valores Exactos de Redirect URI para TikTok

En el portal de TikTok Developer deberás registrar **exactamente** estos Redirect URIs (respeta mayúsculas, minúsculas y sin barras finales `/`):

| Entorno | Redirect URI Exacto | Propósito |
| :--- | :--- | :--- |
| **Producción Web / PWA** | `https://alquimia-studio.pages.dev/oauth/tiktok` | Producción en vivo |
| **Desarrollo Web Local** | `http://localhost:8081/oauth/tiktok` | Pruebas locales con Expo Web |
| **App Móvil Nativa (iOS / Android)** | `alquimio://oauth/tiktok` | Deep Link para retorno automático a la app |

> ⚠️ **IMPORTANTE**: Si el valor registrado en TikTok difiere en un solo carácter (por ejemplo, `/api/tiktok/callback` en vez de `/oauth/tiktok`), TikTok mostrará el error `redirect_uri mismatch` y bloqueará la conexión.

---

## 2. Paso a Paso en TikTok Developer Portal (`developers.tiktok.com`)

1. Ingresa a [TikTok for Developers](https://developers.tiktok.com/) e inicia sesión con tu cuenta de TikTok.
2. Ve a **Manage apps** (Gestionar aplicaciones) y haz clic en **Connect an app** o selecciona tu app existente (**Alquimia**).
3. Completa los detalles de la aplicación:
   - **App name**: `Alquimia`
   - **App icon**: Sube el logotipo oficial de Alquimia.
   - **Category**: `Content & Media` o `Tools`.
4. En la sección **Products / Products to add**:
   - Agrega **Login Kit** (para autenticación con OAuth 2.0).
   - Agrega **Content Posting API v2** (para publicación directa de videos).
5. Configura los **Redirect Domains & URIs**:
   - En la sección **Redirect domain**, ingresa: `alquimia-studio.pages.dev`
   - En la sección **Redirect URI**, agrega las 3 URLs de la tabla superior:
     - `https://alquimia-studio.pages.dev/oauth/tiktok`
     - `http://localhost:8081/oauth/tiktok`
     - `alquimio://oauth/tiktok`
6. En la sección de **Scopes** (Permisos), asegúrate de que estén seleccionados:
   - `user.info.basic`
   - `user.info.profile`
   - `video.upload`
   - `video.publish`
7. En la pestaña **Basic Settings / Credentials**:
   - Copia tu **Client Key** (ejemplo: `aw1234567890abcdef...`).
   - Copia tu **Client Secret** (ejemplo: `1234567890abcdef...`).
8. **Modo Sandbox / Testers**:
   - Mientras la app esté en desarrollo (Sandbox), ve a **Roles > Testers**.
   - Haz clic en **Add tester** e ingresa el `@usuario` de TikTok de tu cuenta y de las cuentas que usarás para probar.
   - Abre la app de TikTok en tu celular con esa cuenta, ve a la **Bandeja de entrada > Notificaciones del sistema > Desarrolladores** y **acepta la invitación de tester**.

---

## 3. Dónde Configurar las Variables en Cloudflare Pages

Las credenciales **NUNCA** deben guardarse en el código de la app ni en el dispositivo móvil; deben vivir exclusivamente en el servidor Cloudflare Pages:

1. Ingresa al [Dashboard de Cloudflare](https://dash.cloudflare.com/).
2. En el menú lateral izquierdo, selecciona **Workers & Pages**.
3. Haz clic en tu proyecto: **`alquimia-studio`**.
4. En el menú horizontal superior del proyecto, haz clic en **Settings** (Configuración).
5. En el menú lateral de Settings, selecciona **Environment variables** (Variables de entorno).
6. Haz clic en **Add variables** (Agregar variables).
7. Agrega las dos variables con sus nombres exactos en mayúsculas:

| Variable | Valor | Entornos donde debe estar |
| :--- | :--- | :--- |
| `TIKTOK_CLIENT_KEY` | Tu Client Key copiado de TikTok | **Production** y **Preview** |
| `TIKTOK_CLIENT_SECRET` | Tu Client Secret copiado de TikTok | **Production** y **Preview** |

8. Haz clic en **Save** (Guardar).
9. *(Opcional)* En **Deployment**, haz clic en **Retry deployment** o haz un nuevo despliegue para que las variables surtan efecto inmediatamente.

---

## 4. Alternativa Rápida por Terminal (Wrangler CLI)

Si prefieres agregarlas desde tu terminal:

```bash
# Para Production:
npx wrangler pages secret put TIKTOK_CLIENT_KEY --project-name=alquimia-studio
# (Pega tu Client Key y presiona Enter)

npx wrangler pages secret put TIKTOK_CLIENT_SECRET --project-name=alquimia-studio
# (Pega tu Client Secret y presiona Enter)
```

---

## 5. Verificación y Diagnóstico

Una vez configuradas las variables:
1. Abre [https://alquimia-studio.pages.dev](https://alquimia-studio.pages.dev).
2. Toca en la fila de **TikTok** ("Toca para conectar").
3. Presiona el botón **"Conectar con TikTok (OAuth 2.0)"**.
4. Si las variables están bien configuradas, se abrirá la pantalla oficial de autorización de TikTok (`login.tiktok.com` / `open.tiktokapis.com`).
5. Si alguna variable faltara, el servidor te devolverá exactamente:
   - `Falta configurar la variable TIKTOK_CLIENT_KEY en las variables de entorno de Cloudflare Pages.`
   - O `Falta configurar la variable TIKTOK_CLIENT_SECRET en las variables de entorno de Cloudflare Pages.`
   Y además quedará registrado en tiempo real en los **Logs de Cloudflare Pages Functions**.
