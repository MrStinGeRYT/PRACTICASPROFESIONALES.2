# Prácticas Profesionales — UNACAR

Sistema de consulta y administración del directorio de empresas para Prácticas Profesionales de la Universidad Autónoma del Carmen.

## Estructura del proyecto

```
/
├── index.html                   ← Página pública (GitHub Pages)
├── .gitignore
├── .nojekyll                    ← Necesario para GitHub Pages
├── README.md
│
├── pages/
│   ├── admin-login.html         ← Inicio de sesión del administrador
│   └── admin-dashboard.html     ← Panel administrativo
│
├── css/
│   ├── MenuPrincipal.css
│   ├── adm-loging.css
│   └── admin-lobby.css
│
├── js/
│   ├── empresas.js
│   ├── supabase-config.js
│   ├── supabase-client.js
│   ├── admin-loging.js
│   ├── admin-guard.js
│   └── admin-empresas.js
│
├── imagenes/
│   └── (logos, fondo, etc.)
│
└── docs/
    ├── GUIAPP.pdf
    └── Plan de trabajo.docx
```

## Tecnologías

- **Frontend:** HTML, CSS, JavaScript (sin frameworks)
- **Base de datos:** Supabase (PostgreSQL)
- **Hospedaje:** GitHub Pages

## Respaldos Excel

Los respaldos Excel se descargan localmente desde el panel administrativo.
El almacenamiento permanente por periodos se implementará en una segunda etapa.

## Unidad

Dirección General de Servicios al Estudiante — Unidad de Gestión Estudiantil  
Universidad Autónoma del Carmen
