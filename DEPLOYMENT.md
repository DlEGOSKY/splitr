# Splitr — Guía de despliegue v3

URL producción: `https://DIEGOSKY.github.io/splitr`
Package Android: `com.diegosky.splitr`

---

## Flujo general

1. Build local con Vite → genera `dist/`
2. Publicar `dist/` a GitHub Pages (o Netlify)
3. Verificar PWA
4. Actualizar APK/AAB TWA con Bubblewrap
5. Subir nueva versión a Play Console

---

## PASO 1 — Build de producción

```bash
npm install
npm run build
```

Esto genera `dist/` con:
- `index.html` (entry con hashes)
- `assets/` — JS + CSS con content hashing
- `sw.js` + `workbox-*.js` — Service Worker generado por VitePWA
- `manifest.webmanifest` — manifest PWA generado
- `icons/` — copiadas desde `icons/`
- `registerSW.js` — registro automático del SW

**Bundle esperado (v3.0.0):** ~427 KB JS inicial + 139 KB CSS (132 + 26 KB gzip respectivamente).

---

## PASO 2 — Deploy a GitHub Pages

### Opción A: gh-pages branch manual
```bash
# Desde main, build y push al branch gh-pages
npm run build
npx gh-pages -d dist --dotfiles
```

(Requiere `npm install -D gh-pages` una vez. **Pedir aprobación** antes de agregar como devDep.)

### Opción B: GitHub Actions
Crear `.github/workflows/deploy.yml` con un workflow estándar que corra `npm ci && npm run build` y publique `dist/` via `peaceiris/actions-gh-pages`.

### Opción C: Netlify
- Conectar el repo en Netlify
- Build command: `npm run build`
- Publish directory: `dist`

En todos los casos, la URL final debe servir `index.html` como SPA y `sw.js` con `Content-Type: application/javascript`.

---

## PASO 3 — Verificar PWA con Lighthouse

1. Abre la URL en Chrome de escritorio
2. DevTools (F12) → Lighthouse → Mode: Navigation → PWA + Performance → Analyze
3. Debe salir verde en:
   - **Installable** (manifest + iconos 192/512 + start_url)
   - **PWA Optimized** (SW activo, offline fallback)
   - Performance ≥ 90 en móvil simulado

Si aparece warning de iconos, verifica que `dist/icons/icon-*.png` fueron copiados por Vite.

---

## PASO 4 — Actualizar la app TWA (Android / Play Store)

Splitr en Play Store es una **TWA (Trusted Web Activity)** que apunta a la URL PWA.

### Primera vez (solo si no existe el proyecto TWA)

```bash
npm install -g @bubblewrap/cli
mkdir splitr-twa && cd splitr-twa
bubblewrap init --manifest https://DIEGOSKY.github.io/splitr/manifest.webmanifest
```

Responder con:

| Campo | Valor |
|-------|-------|
| Package ID | `com.diegosky.splitr` |
| App name | `Splitr` |
| App short name | `Splitr` |
| Host | `DIEGOSKY.github.io` |
| Start URL | `/splitr/` |
| Theme color | `#04020e` |
| Background color | `#04020e` |
| Icon path | ruta a `icons/icon-512.png` del repo |
| Signing key | **Create new** |
| Key password | inventar y **guardar en 1Password/Drive** |

### Actualizaciones (cada release v3.x)

En la carpeta `splitr-twa/`:
```bash
# Bump versionCode y versionName en twa-manifest.json
# (versionCode debe ser > al publicado actual)

bubblewrap update        # sincroniza metadata con el manifest web
bubblewrap build         # genera app-release-bundle.aab
```

Sale también el **SHA256 fingerprint** — copiarlo.

---

## PASO 5 — Configurar assetlinks.json

El archivo `.well-known/assetlinks.json` del repo **debe** contener el fingerprint de la firma TWA. Sin esto, la app muestra la barra de URL de Chrome en vez de pantalla completa.

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.diegosky.splitr",
    "sha256_cert_fingerprints": [
      "AA:BB:CC:...fingerprint real..."
    ]
  }
}]
```

Commit + push:
```bash
git add .well-known/assetlinks.json
git commit -m "chore: update assetlinks for TWA v3.x"
git push
```

Verificar en:
```
https://DIEGOSKY.github.io/splitr/.well-known/assetlinks.json
```

Y confirmar que Google lo ve:
```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://DIEGOSKY.github.io/splitr&relation=delegate_permission/common.handle_all_urls
```
Debe responder `"matched": true`.

---

## PASO 6 — Subir a Play Console

1. [play.google.com/console](https://play.google.com/console) → seleccionar la app existente (si es update) o crear nueva
2. Producción → Crear nueva versión
3. Subir `splitr-twa/app-release-bundle.aab`
4. **Release notes** (incluir resumen del CHANGELOG):
   ```
   v3.0.0 — Migración completa a React
   - Nueva arquitectura más fluida
   - Stats reales con export CSV
   - Deep links compartibles
   - Modo equipo con resultado completo
   - Temas, skins y paywall refinados
   ```
5. Revisar y enviar
6. Esperar revisión: 2 horas – 3 días

---

## Checklist pre-release

- [ ] `npm run build` sin errores ni warnings
- [ ] `npx tsc --noEmit` limpio
- [ ] Smoke test manual en Chrome + Firefox desktop
- [ ] Smoke test en dispositivo Android real (Chrome + TWA)
- [ ] Lighthouse PWA score ≥ 90
- [ ] `manifest.webmanifest` servido con `application/manifest+json`
- [ ] SW registrado correctamente (ver `/sw.js` en prod)
- [ ] `.well-known/assetlinks.json` accesible + `"matched": true`
- [ ] `package.json` version bumped
- [ ] CHANGELOG.md actualizado
- [ ] Commit tagged: `git tag v3.x.y && git push --tags`

---

## ⚠️ Cosas críticas

- **Guarda el `.jks` de Bubblewrap** en 3 sitios (1Password, Drive, USB). Sin el keystore no puedes actualizar la app NUNCA MÁS. Google no recupera claves.
- **Package ID inmutable** — `com.diegosky.splitr` no se puede cambiar post-publicación.
- **VersionCode debe crecer** en cada release. Usa formato `MMmmpp` (ej: `30100` para 3.1.0).
- **assetlinks debe estar publicado ANTES** de que Google revise la release — si no, los usuarios ven Chrome UI en la app.

---

## Archivos legacy relacionados con deploy

En `_legacy/` se conservan (por si el TWA actual aún referencia rutas antiguas):
- `index.old.html` — HTML monolítico pre-Vite
- `manifest.json` — manifest manual (VitePWA ahora genera `manifest.webmanifest`)
- `sw.js` — SW manual (VitePWA ahora genera con workbox)
- `_config.yml` — Jekyll config

Si la TWA en Play Store aún apunta a `/splitr/index.html` (ruta legacy), verificar que el redirect funcione o actualizar el `start_url` en el próximo TWA build.
