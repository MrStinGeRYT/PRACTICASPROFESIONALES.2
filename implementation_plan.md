# Plan de Implementación — Prácticas Profesionales

## Situación actual

El repositorio está limpio (`nothing to commit`), en la rama `main`. Todos los archivos están en la raíz del proyecto sin una estructura de carpetas organizada. El diseño visual está intacto y debe conservarse al 100%.

---

## Análisis del estado actual

### Archivos en la raíz (sin organizar)
- **HTML:** `index.html`, `adm-loging.html`, `admin-lobby.html`
- **CSS:** `MenuPrincipal.css`, `adm-loging.css`, `admin-lobby.css`
- **JS:** `empresas.js`, `supabase-config.js`, `supabase-client.js`, `admin-loging.js`, `admin-guard.js`, `admin-empresas.js`, `main.js`
- **Imágenes en raíz:** `logo_.png`, `logo_admin_white.png`, `imageneslogo_admin_white.png`, `imagenesfondoidiomas.jpg`, `Fondo1.png`, `DGSE_LOGO sin fondo.png`, `R.jpg`, `Usuario3-removebg-preview.png`
- **Docs:** `GUIAPP.pdf`, `Plan de trabajo.docx`
- **Otros:** `package.json`, `package-lock.json`, `supabase-config.js`
- **Carpetas vacías:** `css/`, `js/`, `doc/`, `docs/`, `imagenes/`
- **Excluir:** `node_modules/` (se agrega a .gitignore, sqlite3 no se usa)

---

## Estructura de carpetas propuesta

```
PRACTICASPROFESIONALES.2/
├── index.html              ← Raíz (GitHub Pages requiere index.html aquí)
├── adm-loging.html
├── admin-lobby.html
├── .gitignore              ← [NUEVO]
├── css/
│   ├── MenuPrincipal.css
│   ├── adm-loging.css
│   └── admin-lobby.css
├── js/
│   ├── empresas.js
│   ├── supabase-config.js
│   ├── supabase-client.js
│   ├── admin-loging.js
│   ├── admin-guard.js
│   ├── admin-empresas.js
│   └── main.js
├── imagenes/
│   ├── logo_.png
│   ├── logo_admin_white.png
│   ├── imageneslogo_admin_white.png
│   ├── imagenesfondoidiomas.jpg
│   ├── Fondo1.png
│   ├── DGSE_LOGO sin fondo.png
│   ├── R.jpg
│   └── Usuario3-removebg-preview.png
└── docs/
    ├── GUIAPP.pdf
    └── Plan de trabajo.docx
```

> **Nota:** `doc/` se eliminará (está vacío). `package.json` y `package-lock.json` se eliminarán porque `sqlite3` no se usa en ningún archivo JS del proyecto.

---

## Cambios por archivo

### Raíz

#### [MODIFY] [index.html](file:///c:/Users/aleja/Documents/PRACTICASPROFESIONALES.2/index.html)
Actualizar rutas:
- `./MenuPrincipal.css` → `./css/MenuPrincipal.css`
- `./logo_.png` → `./imagenes/logo_.png`
- `./logo_admin_white.png` → `./imagenes/logo_admin_white.png`
- `./GUIAPP.pdf` → `./docs/GUIAPP.pdf`
- `./Plan de trabajo.docx` → `./docs/Plan de trabajo.docx`
- `./supabase-config.js` → `./js/supabase-config.js`
- `./empresas.js` → `./js/empresas.js`

#### [MODIFY] [adm-loging.html](file:///c:/Users/aleja/Documents/PRACTICASPROFESIONALES.2/adm-loging.html)
Actualizar rutas:
- `./adm-loging.css` → `./css/adm-loging.css`
- `./logo_.png` → `./imagenes/logo_.png`
- `./logo_admin_white.png` → `./imagenes/logo_admin_white.png`
- `./supabase-config.js` → `./js/supabase-config.js`
- `./admin-loging.js` → `./js/admin-loging.js`

#### [MODIFY] [admin-lobby.html](file:///c:/Users/aleja/Documents/PRACTICASPROFESIONALES.2/admin-lobby.html)
Actualizar rutas:
- `./admin-lobby.css` → `./css/admin-lobby.css`
- `./logo_.png` → `./imagenes/logo_.png`
- `./logo_admin_white.png` → `./imagenes/logo_admin_white.png`
- `./supabase-config.js` → `./js/supabase-config.js`
- `./supabase-client.js` → `./js/supabase-client.js`
- `./admin-guard.js` → `./js/admin-guard.js`
- `./admin-empresas.js` → `./js/admin-empresas.js`
- **Agregar funcionalidad de guardar Excel por año/periodo** (nueva sección en sidebar)

#### [NEW] [.gitignore](file:///c:/Users/aleja/Documents/PRACTICASPROFESIONALES.2/.gitignore)

---

### css/ (archivos movidos con `git mv`)

#### [MODIFY] [css/MenuPrincipal.css](file:///c:/Users/aleja/Documents/PRACTICASPROFESIONALES.2/css/MenuPrincipal.css)
Actualizar: `url('./imagenesfondoidiomas.jpg')` → `url('../imagenes/imagenesfondoidiomas.jpg')`

#### [MODIFY] [css/adm-loging.css](file:///c:/Users/aleja/Documents/PRACTICASPROFESIONALES.2/css/adm-loging.css)
Actualizar: `url('./imagenesfondoidiomas.jpg')` → `url('../imagenes/imagenesfondoidiomas.jpg')`

#### [MODIFY] [css/admin-lobby.css](file:///c:/Users/aleja/Documents/PRACTICASPROFESIONALES.2/css/admin-lobby.css)
Actualizar: `url('./imagenesfondoidiomas.jpg')` → `url('../imagenes/imagenesfondoidiomas.jpg')`

---

### js/ (archivos movidos con `git mv`)

#### [MODIFY] [js/admin-guard.js](file:///c:/Users/aleja/Documents/PRACTICASPROFESIONALES.2/js/admin-guard.js)
Actualizar: `LOGIN_PAGE = "adm-loging.html"` — las rutas de página siguen igual (HTML en raíz).

#### [MODIFY] [js/admin-empresas.js](file:///c:/Users/aleja/Documents/PRACTICASPROFESIONALES.2/js/admin-empresas.js)
- Actualizar: `LOGIN_PAGE = "adm-loging.html"` — sin cambio (HTML en raíz).
- **NUEVO:** Agregar función `guardarExcelHistorico(anio, periodo)` que descarga un `.xlsx` con los datos actuales de Supabase **sin eliminar** los anteriores. Se integra en el panel lateral con campos `<select>` de año y periodo, y botón "Guardar Excel".

---

### Responsividad en `index.html` / `MenuPrincipal.css`

Se agregarán media queries adicionales en `css/MenuPrincipal.css` para:
- **Tableta (≤ 1024px):** reducir logos, ajustar `.formulario-contenedor` a `max-width: 95%`, ajustar fuente del título h2.
- **Teléfono (≤ 600px):** logos más pequeños, buscador a full-width, tabla con scroll horizontal (`overflow-x: auto`), estandarte ajustado.

> **Garantía:** No se cambia ningún color, tipografía, fondo, logo, estandarte, menú flotante, pie de página ni estructura visual.

---

## Funcionalidad nueva: Guardar Excel por año/periodo

En `admin-lobby.html` se añade al panel lateral:

```html
<!-- Guardar Excel histórico -->
<hr>
<p><strong>Guardar Excel por periodo</strong></p>
<select id="selAnio" class="form-select mb-2">
  <option value="2024">2024</option>
  <option value="2025">2025</option>
  <option value="2026" selected>2026</option>
</select>
<select id="selPeriodo" class="form-select mb-2">
  <option value="Enero-Junio">Enero-Junio</option>
  <option value="Julio-Diciembre">Julio-Diciembre</option>
</select>
<button class="btn btn-warning mt-1" id="btnGuardarExcel">
  💾 Guardar Excel
</button>
```

En `js/admin-empresas.js` se añade la función que:
1. Lee todos los registros actuales de Supabase.
2. Genera un `.xlsx` con SheetJS (ya cargado).
3. Descarga el archivo con nombre `Empresas_{Anio}_{Periodo}.xlsx`.
4. **No borra** nada de la BD — solo es una exportación/snapshot.

---

## Archivos a eliminar (con `git rm`)

- `package.json` — sqlite3 no se usa en el proyecto (es un sitio estático con Supabase)
- `package-lock.json` — idem
- Carpeta `doc/` — vacía, se elimina
- `node_modules/` — ya ignorada con .gitignore (no se trackeaba)

---

## Verificación

1. `git status` muestra todos los movimientos como `renamed` (gracias a `git mv`).
2. Las rutas en HTML/CSS/JS apuntan correctamente a subcarpetas.
3. El sitio abre correctamente con la imagen de fondo, logos, banner, estandarte, tabla y menú flotante intactos.
4. En panel admin: aparece la sección de guardar Excel, el botón descarga el .xlsx sin borrar datos.
5. Responsive en móvil: tabla con scroll horizontal, logos más pequeños.
