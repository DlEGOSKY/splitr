# Splitr — Guía de despliegue
# Usuario: DIEGOSKY
# URL final: https://DIEGOSKY.github.io/splitr

---

## PASO 1 — Subir a GitHub (5 minutos)

Abre una terminal en la carpeta quien-paga/ y corre esto exacto:

```bash
git init
git add .
git commit -m "Splitr v1.0"
git remote add origin https://github.com/DIEGOSKY/splitr.git
git push -u origin main
```

Luego en GitHub:
→ Settings del repo → Pages → Branch: main → / (root) → Save
→ Espera 2 minutos → entra a https://DIEGOSKY.github.io/splitr

Si ves la app funcionando, continúa al paso 2.

---

## PASO 2 — Verificar PWA con Lighthouse

En Chrome (PC), abre https://DIEGOSKY.github.io/splitr
→ F12 → Lighthouse → Mode: Navigation → PWA → Analyze
→ Debe mostrar verde en todo. Si hay error de íconos, ignóralo por ahora.

---

## PASO 3 — Crear el APK con Bubblewrap

```bash
# Instalar Bubblewrap (solo la primera vez)
npm install -g @bubblewrap/cli

# Crear carpeta del proyecto TWA
mkdir splitr-twa
cd splitr-twa

# Inicializar — Bubblewrap leerá tu manifest automáticamente
bubblewrap init --manifest https://DIEGOSKY.github.io/splitr/manifest.json
```

Bubblewrap te preguntará varias cosas. Responde así:

| Pregunta | Respuesta |
|----------|-----------|
| Package ID | com.diegosky.splitr |
| App name | Splitr |
| App short name | Splitr |
| Host | DIEGOSKY.github.io |
| Start URL | /splitr/index.html |
| Theme color | #090912 |
| Background color | #090912 |
| Icon path | (ruta a icons/icon-512.png) |
| Signing key | Create new |
| Key password | (inventa una, GUÁRDALA) |

```bash
# Compilar — genera el .aab listo para Play Store
bubblewrap build
```

Cuando termine, te mostrará algo como:
```
SHA256 fingerprint: AA:BB:CC:11:22:33:...
```
COPIA ESE FINGERPRINT — lo necesitas en el paso 4.

---

## PASO 4 — Completar assetlinks.json (CRÍTICO)

Sin este paso, la app mostrará la barra de URL de Chrome en la Play Store.

Edita el archivo .well-known/assetlinks.json con tu fingerprint real:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.diegosky.splitr",
    "sha256_cert_fingerprints": [
      "AA:BB:CC:11:22:33:PEGA_TU_FINGERPRINT_AQUI"
    ]
  }
}]
```

Luego haz push:
```bash
git add .well-known/assetlinks.json
git commit -m "Add assetlinks"
git push
```

Verifica que funciona entrando a:
https://DIEGOSKY.github.io/splitr/.well-known/assetlinks.json
(debe mostrar el JSON sin error 404)

---

## PASO 5 — Subir a Play Console

1. play.google.com/console → Crear app → Android → Gratis
2. Nombre: Splitr — ¿Quién Paga?
3. Categoría: Entretenimiento
4. Clasificación de contenido: Todos
5. Versiones → Producción → Crear versión nueva
6. Subir el archivo: splitr-twa/app-release-bundle.aab
7. Capturas de pantalla: toma 2-8 del teléfono con la app corriendo
8. Descripción corta (80 chars): "Elige quién paga de forma dramática. 8 modos, 20 temas, animaciones."
9. Descripción larga: pega la que quieras
10. Revisar y enviar

Tiempo de revisión: entre 2 horas y 3 días.

---

## ⚠️ Cosas importantes

- GUARDA el archivo .jks que crea Bubblewrap — sin él no puedes actualizar la app nunca más
- El Package ID (com.diegosky.splitr) no se puede cambiar después de publicar
- Si cambias el keystore pierdes la app — haz backup en Google Drive o similar
- El assetlinks.json DEBE estar accesible ANTES de que Google revise la app

---

## Verificar assetlinks en producción

https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://DIEGOSKY.github.io/splitr&relation=delegate_permission/common.handle_all_urls

Si devuelve `"matched": true` → perfecto, no habrá barra de URL.
