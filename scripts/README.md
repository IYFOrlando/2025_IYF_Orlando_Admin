# Scripts – cuáles usar y cuáles son obsoletos

Resumen de cada script y si conviene mantenerlo o no.

---

## ✅ Recomendados (útiles de verdad)

| Script | Para qué sirve | Cuándo usarlo |
|--------|----------------|----------------|
| **import-spring-academy-registrations.cjs** | Copia registros de `spring_academy_2026` → `2026-iyf_orlando_academy_spring_semester` (solo 17 ene, sin drafts). | Migraciones/imports de registros. |
| **import-2026-spring-invoices.cjs** | Copia facturas de `academy_invoices_2026` → `2026_spring_academy_invoices_2026` (solo de alumnos de la cohorte 2026 spring). | Cuando quieras usar la colección nueva de facturas. |
| **build-cloudflare.js** | Build para Cloudflare Pages (incluye fix de TypeScript). | En el pipeline de deploy. |
| **fix-typescript-errors.js** | Corrige errores típicos de TypeScript antes del build. | Lo usa `build-cloudflare.js`; no hace falta correrlo a mano salvo que quieras. |

---

## 🔧 Mantenimiento / datos (usar con cuidado)

| Script | Para qué sirve | Nota |
|--------|----------------|------|
| **fix-pricing-conversion.cjs** | Corrige precios guardados en dólares en lugar de centavos en `settings/pricing`. Identifica precios < $10 y los multiplica por 100. | **Usar si ves precios como $0.40 en lugar de $40.00**. Modo `--dry-run` disponible. |
| **update-prices-admin.cjs** | Actualiza precios en Firestore (Admin SDK). | Requiere cuenta de servicio. |
| **update-prices-cli.cjs** | Idem vía cliente Firebase. | Requiere auth / reglas que lo permitan. |
| **update-academies-with-teachers.cjs** | Asigna profesores a academias. | Útil si mantienes profesores por academia. |
| **update-academies-teachers-data.cjs** | Actualiza datos de profesores en academias. | Similar al anterior; revisar si no es duplicado. |
| **seed-academies-admin.cjs** / **seed-academies-admin.js** | Carga academias con Firebase Admin. | Queda uno solo; el .cjs y .js hacen lo mismo. |
| **seed-academies-2026.js** | Carga academias 2026 con SDK cliente. | Alternativa a los seed con Admin. |
| **seed-academies-firebase.js** | Otra variante de seed de academias. | Mucha variedad de “seed”; unificar criterio. |
| **seed-academies-cli.sh** | Seed vía Firebase CLI. | Útil si no quieres Node/Admin. |

---

## ⚠️ De uso puntual o posiblemente obsoletos

| Script | Para qué sirve | Recomendación |
|--------|----------------|----------------|
| **list-invoices.js** | Lista facturas por consola. | Útil para debug; **usa la colección configurada** (ej. `2026_spring_academy_invoices_2026` o la que tengas en config). Si sigue con `academy_invoices` suelta datos viejos. |
| **fix-kids-academy.mjs** | Corrige “Kids” → “Kids Academy” en registros. | One‑off; si ya se aplicó, se puede archivar. |
| **inspect-josie.mjs** | Inspecciona datos de un estudiante (id fijo). | Debug muy específico; archivar o borrar. |
| **remove-duplicates.mjs** | Borra facturas duplicadas (deja 1 por alumno). **Actualizado para usar `2026_spring_academy_invoices_2026`**. | One‑off; si ya limpiaste, archivar. |
| **reconcile-data.mjs** | Reconcilia registros con facturas/precios. | Mantener solo si sigues usándolo; si no, archivar. |
| **import-registrations-client.mjs** | Import de registros con SDK cliente (sin Admin). | Alternativa a `import-spring-academy-registrations.cjs`; elegir uno y documentarlo. |
| **seed-academies-console.js** | Código para pegar en la consola del navegador. | Solo para pegar en DevTools; no es “script” ejecutable. |

---

## Qué hacer en la práctica

1. **Quedarse con:**  
   `import-spring-academy-registrations.cjs`, `import-2026-spring-invoices.cjs`, `build-cloudflare.js`, `fix-typescript-errors.js` y, si los usas, **uno** de los seed de academias y **uno** de los update de precios/academias.

2. **Actualizar**  
   `list-invoices.js` para que use la colección de facturas que usa la app (ej. `2026_spring_academy_invoices_2026` o la que pongas en `shared.js`).

3. **Archivar** (mover a `scripts/archive/` o eliminar si estás seguro):  
   Los que sean one‑off y ya aplicados (`fix-kids-academy.mjs`, `inspect-josie.mjs`, `remove-duplicates.mjs`) y los que sean duplicados de otro script que sí uses.

4. **Unificar**  
   Variantes de “seed academies” y “update prices” en un solo script por tarea, y dejar el resto como legacy o borrarlo.

---

## Información que no coincida (email vs dashboard)

Si en el **reporte diario por email** ves números distintos a los del **Daily Report** en pantalla:

- El email se arma con el mismo `dailyStats` que usa la pestaña Daily Report.
- Revisa que **total revenue** y **total pending** en el correo usen las mismas fuentes que en la UI (p. ej. “solo factura vigente por alumno” para pending y mismo criterio de “revenue”).
- Si quieres, se puede revisar campo por campo (total students, new today, revenue today, pending, academias, niveles de Korean) para que el HTML del email use exactamente las mismas variables y fórmulas que la interfaz.
