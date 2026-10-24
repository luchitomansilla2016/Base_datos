# 📋 Historial y Resumen Técnico del Proyecto - REGPOL Huánuco 2.0

**Fecha de actualización:** 23 de octubre de 2026  
**Carpeta sincronizada (OneDrive):** `c:\Users\luchi\OneDrive\PROTCTO DE PROGRAMAS\BASE DE DATOS DEL PERSONAL`

---

## 1. ¿Dónde está mi Base de Datos en Supabase?

Todo el sistema (Personal, Registro Documentario, Auto-Registro QR y Google Sheets) ha sido **unificado** en una única Base de Datos activa en Supabase:

- **ID del Proyecto Supabase:** `cmbjqttrwdphrirerzyx`
- **URL de la Base de Datos:** `https://cmbjqttrwdphrirerzyx.supabase.co`
- **Enlace directo al Panel de Supabase:**  
  👉 [https://supabase.com/dashboard/project/cmbjqttrwdphrirerzyx](https://supabase.com/dashboard/project/cmbjqttrwdphrirerzyx)
- **Enlace directo al Editor SQL de Supabase:**  
  👉 [https://supabase.com/dashboard/project/cmbjqttrwdphrirerzyx/sql/new](https://supabase.com/dashboard/project/cmbjqttrwdphrirerzyx/sql/new)
- **Cuenta / Correo Administrador registrado:** `luchitomansilla2016@gmail.com` (Usuario GitHub: `luchitomansilla2016`)
- **Credenciales de acceso al Sistema Web (`index.html` y `documentos.html`):**
  - **CIP:** `31390176`
  - **Contraseña:** `123450`
  - **Efectivo:** `ST2 PNP MANSILLA SANTA MARIA JOSE LUIS`
  - **Rol:** `ADMIN`

---

## 2. Resumen de Mejoras y Soluciones Aplicadas

1. **Unificación de Bases de Datos (`index.html`, `documentos.html`, `registro.html`, `google_apps_script_reincorporacion.js`):**
   - Anteriormente el módulo de documentos apuntaba a un segundo proyecto de Supabase (`ngsujkfmkgofngqwuqnf.supabase.co`) que se encontraba pausado/inaccesible.
   - Se migró y unificó toda la configuración para trabajar exclusivamente con el proyecto principal activo (`cmbjqttrwdphrirerzyx.supabase.co`).
2. **Adaptador Inteligente de Usuarios y Documentos en la Nube:**
   - `documentos.html` ahora valida usuarios directamente contra la tabla `usuario_oficina` y lee los firmantes desde la tabla `jefes`.
   - Mientras no se ejecute el script SQL de tablas individuales, los documentos (`oficios`, `orden_incorporacion`, `orden_reincorporacion`, `orden_lactancia`, `orden_gravidez`, etc.) se guardan, numeran y leen automáticamente en la nube a través de `historial_movimientos` (`modulo_origen = doc_<tabla>`).
3. **Script SQL para Tablas Independientes:**
   - Archivo: `unificar_base_de_datos_supabase.sql`.
   - Puedes copiar su contenido en el SQL Editor de Supabase y presionar **Run** para crear las 14 tablas documentarias dedicadas con sus permisos RLS.
4. **Respaldo Local Completo (`RESPALDO_SUPABASE/`):**
   - Se descargaron todas las tablas activas en formato `.json` dentro de la subcarpeta `RESPALDO_SUPABASE/` (incluyendo los 2,781 registros de `personal_policial`, `referidos`, `reasignados`, `destacados`, `unidades`, `grados`, `jefes`, etc.).

---

## 3. ¿Dónde se guarda el historial de Antigravity en esta PC?

- **Ruta interna de Antigravity (solo en esta PC):**  
  `C:\Users\luchi\.gemini\antigravity\brain\79c541f9-8dcc-4091-8467-7b94c2328bca`
- **En OneDrive (disponible en cualquier otra PC):**  
  Este archivo (`HISTORIAL_CONVERSACION_Y_CONFIGURACION.md`) y toda la carpeta `BASE DE DATOS DEL PERSONAL` están dentro de tu **OneDrive**, por lo que se sincronizan automáticamente en tus demás computadoras.
