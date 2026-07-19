# Prácticas Profesionales — Universidad Autónoma del Carmen

> **Dirección General de Servicios al Estudiante · Unidad de Gestión Estudiantil**

Directorio público de empresas disponibles para prácticas profesionales, con panel administrativo protegido por autenticación.

---

## Estructura del proyecto

```
/
├── index.html                    ← Página pública (directorio de empresas)
├── .gitignore
├── .nojekyll                     ← Necesario para GitHub Pages
├── README.md
│
├── pages/
│   ├── admin-login.html          ← Inicio de sesión administrativo
│   └── admin-dashboard.html      ← Panel administrativo
│
├── assets/
│   ├── css/
│   │   ├── base.css              ← Sistema de diseño compartido
│   │   ├── public.css            ← Estilos de la página pública
│   │   ├── admin-login.css       ← Estilos del login
│   │   └── admin-dashboard.css   ← Estilos del panel admin
│   │
│   ├── js/
│   │   ├── config/
│   │   │   ├── supabase-config.js   ← URL y anon key de Supabase
│   │   │   └── supabase-client.js   ← Cliente único compartido
│   │   ├── services/
│   │   │   ├── auth-service.js      ← login, logout, validateAdmin
│   │   │   └── companies-service.js ← getCurrentCompanies, uploadCurrentCompanies
│   │   ├── public/
│   │   │   └── companies-table.js   ← Tabla pública con filtros y paginación
│   │   ├── admin/
│   │   │   ├── admin-login.js       ← Lógica del formulario de login
│   │   │   └── admin-dashboard.js   ← Lógica del panel admin
│   │   └── shared/
│   │       └── auth-guard.js        ← Protección de rutas admin
│   │
│   ├── images/
│   │   ├── logo-unacar.png          ← Logotipo institucional izquierdo
│   │   ├── logo-dgse.png            ← Logotipo DGSE derecho
│   │   ├── fondo.jpg                ← Imagen de fondo (optimizada)
│   │   └── unused/                  ← Imágenes no referenciadas (conservadas)
│   │       ├── logo-dgse-alt.png
│   │       ├── dgse-logo-sin-fondo.png
│   │       ├── fondo1.png
│   │       ├── r.jpg
│   │       └── usuario.png
│   │
│   └── documents/
│       ├── GUIAPP.pdf               ← Guía de prácticas profesionales
│       └── Plan-de-trabajo.docx     ← Formato del plan de trabajo
│
└── docs/
    ├── BACKEND_DECISION.md          ← Comparativa de backends
    └── SETUP.md                     ← Configuración paso a paso
```

---

## Publicación en GitHub Pages

1. Ve a **Settings → Pages** en el repositorio de GitHub
2. Selecciona **Branch: main**, carpeta **/ (root)**
3. El archivo `.nojekyll` en la raíz evita que GitHub Pages procese Jekyll
4. La URL pública será: `https://mrstingeryт.github.io/PRACTICASPROFESIONALES.2/`

> **Importante:** Todas las rutas en el código usan rutas relativas (`./` y `../`) para funcionar tanto en la raíz del dominio como en un subdirectorio.

---

## Backend: Supabase

El proyecto usa **Supabase** como backend. La autenticación, base de datos y permisos están gestionados en el proyecto de Supabase.

### Configuración mínima

Edita `assets/js/config/supabase-config.js`:

```javascript
window.SUPABASE_URL      = "TU_URL_DE_SUPABASE";
window.SUPABASE_ANON_KEY = "TU_ANON_KEY";
window.SUPABASE_TABLE    = "registros_empresas";
```

> La `SUPABASE_ANON_KEY` es una **clave publicable** (por diseño de Supabase). La seguridad real viene de las políticas **Row Level Security (RLS)** configuradas en PostgreSQL. Consulta `docs/SETUP.md` para los detalles.

---

## Funcionamiento de la tabla pública

- Muestra los registros de `registros_empresas` con búsqueda, filtros, ordenamiento y paginación
- **Búsqueda**: por nombre de empresa, programa educativo o giro
- **Filtros**: por programa educativo o por giro (selects desplegables)
- **Ordenamiento**: por nombre, programa o giro (ascendente/descendente)
- **Paginación**: 10, 25, 50 o 100 registros por página
- **Escritorio**: tabla completa con encabezados ordenables
- **Móvil**: tarjetas expandibles con botón "Ver detalles"

---

## Panel administrativo

Acceso: `/pages/admin-login.html`

### Requisitos
- Cuenta en Supabase con `is_admin = true` en la tabla `profiles`

### Operaciones disponibles (Etapa 1)
- Ver todos los registros actuales
- Buscar registros por nombre
- Importar un archivo Excel (reemplaza los datos actuales)
- Cerrar sesión

### Estructura esperada del Excel
| Columna | Nombre en Excel |
|---|---|
| Empresa | `NOMBRE` o `nombre` |
| Dirección | `DIRECCION` o `direccion` |
| Teléfono | `TELEFONO` o `telefono` |
| Persona de contacto | `NOMBRE_CARTA` o `nombre_carta` |
| Puesto | `PUESTO_CARTA` o `puesto_carta` |
| Correo | `CORREO_CONT` o `correo_cont` |
| Programa educativo | `PROGRAMA EDUCATIVO SOLICITADO` |
| Giro | `GIRO DE LA EMPRESA` |

---

## Etapa 2 (pendiente de autorización)

La siguiente etapa implementará:
- Sistema de **periodos** (Febrero a junio / Agosto a diciembre) por año
- **Versiones** de cada carga, con historial y restauración
- **Storage privado** en Supabase para los archivos Excel originales
- Políticas **RLS** completas
- **Respaldo** de los datos actuales antes de la migración

---

## Solución de problemas frecuentes

| Problema | Solución |
|---|---|
| La tabla no carga datos | Verifica que `SUPABASE_URL` y `SUPABASE_ANON_KEY` estén correctas en `supabase-config.js` |
| Error 401 al cargar datos | Revisa las políticas RLS en Supabase — `anon` debe tener SELECT en `registros_empresas` |
| El login no redirige | Verifica que el usuario tenga `is_admin = true` en la tabla `profiles` |
| Imágenes no cargan en GitHub Pages | Confirma que las rutas son relativas (`./assets/...` desde la raíz, `../assets/...` desde `/pages/`) |
| El panel admin muestra "Verificando sesión…" indefinidamente | Revisa que `supabase-client.js` se cargue antes de `auth-guard.js` |

---

## Uso con GitHub Desktop

1. Todos los cambios de esta etapa aparecerán en GitHub Desktop como modificaciones, movimientos y nuevos archivos
2. **No se realizó ningún commit ni push** — el repositorio está en el estado de trabajo previo al commit
3. Cuando estés listo para publicar, realiza el commit desde GitHub Desktop y luego Push
