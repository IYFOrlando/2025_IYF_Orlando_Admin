# Actualización del Frontend (iyforlando) - 2026 Spring Semester

## 🎯 Cambios Necesarios en el Frontend

Para sincronizar el frontend (`https://www.iyforlando.org`) con el admin dashboard, necesitas hacer estos cambios:

### 1. Actualizar `src/config/shared.js`

Agregar la nueva colección para 2026 Spring Semester:

```javascript
collections: {
  fallAcademy: "fall_academy_2025", // Mantener para compatibilidad
  fallAcademy2026: "fall_academy_2026", // Mantener si se usa
  springAcademy: "spring_academy_2026", // Mantener para compatibilidad
  springAcademy2026: "2026-iyf_orlando_academy_spring_semester", // ⭐ NUEVO - Usar este
  volunteerApplications: "volunteer_applications",
  // ... resto de colecciones
}
```

**O mejor aún**, exportar una constante específica:

```javascript
// Para 2026 Spring Semester
export const SPRING_2026_COLLECTION = "2026-iyf_orlando_academy_spring_semester";

// O agregar al objeto collections
export const COLLECTIONS_CONFIG = {
  // ... otras colecciones
  springAcademy2026: "2026-iyf_orlando_academy_spring_semester",
  // ...
};
```

### 2. Actualizar `src/components/Registration/RegistrationForms.jsx`

**Buscar donde se guarda el registro** (probablemente línea ~505 o similar) y cambiar de:
```javascript
await addDoc(collection(db, "spring_academy_2026"), submissionData);
```

**A:**
```javascript
import { SPRING_2026_COLLECTION } from "../../config/shared.js";
// O
import { COLLECTIONS_CONFIG } from "../../config/shared.js";

// Usar la configuración compartida (sin hardcodeo)
await addDoc(collection(db, SPRING_2026_COLLECTION), submissionData);
// O
await addDoc(collection(db, COLLECTIONS_CONFIG.springAcademy2026), submissionData);
```

### 3. Verificar Precios y Horarios

El archivo `src/config/pricing.js` ya tiene los precios actualizados para 2026:
- ✅ **Precios actualizados:**
  - Art: $100
  - English: $50
  - Kids Academy: $50
  - Korean Language: $50
  - Piano: $100
  - Pickleball: $50
  - Soccer: $50
  - Taekwondo: $100

- ✅ **Horarios actualizados:**
  - Art: 9:30 AM - 11:30 AM
  - English: 10:00 AM - 11:30 AM
  - Kids Academy: 10:30 AM - 12:15 PM
  - Korean Language: Varía por nivel (Alphabet: 9:00 AM - 10:15 AM, Beginner: 10:20 AM - 11:35 AM, etc.)
  - Piano: 10:00 AM - 11:30 AM
  - Pickleball: 7:15 AM - 9:15 AM
  - Soccer: 9:00 AM - 10:30 AM
  - Taekwondo: 9:20 AM - 10:20 AM & 10:30 AM - 11:30 AM

### 4. Verificar Colección de Academias

El frontend usa `academies_2026_spring` para obtener precios y horarios. Esto está bien y no necesita cambios.

**IMPORTANTE:** Asegúrate de que la colección `academies_2026_spring` en Firestore tenga los precios actualizados:
- Art: $100 (10000 centavos)
- English: $50 (5000 centavos)
- Kids Academy: $50 (5000 centavos)
- Korean Language: $50 (5000 centavos)
- Piano: $100 (10000 centavos)
- Pickleball: $50 (5000 centavos)
- Soccer: $50 (5000 centavos)
- Taekwondo: $100 (10000 centavos)

## 📋 Checklist de Sincronización

- [ ] Actualizar `src/config/shared.js` con la nueva colección
- [ ] Actualizar `RegistrationForms.jsx` para usar `COLLECTIONS_CONFIG.springAcademy2026`
- [ ] Verificar que los precios en `pricing.js` estén actualizados (ya están ✅)
- [ ] Probar un registro en el frontend
- [ ] Verificar que aparece en el admin dashboard
- [ ] Verificar que el invoice se genera automáticamente

## 🔄 Flujo Completo

```
1. Usuario se registra en www.iyforlando.org
   ↓
2. Frontend guarda en: 2026-iyf_orlando_academy_spring_semester
   ↓
3. Admin Dashboard (2025-iyf-orlando-admin.pages.dev) detecta el cambio
   ↓
4. Auto-invoice se genera usando precios de:
   - academies_2026_spring (si está disponible)
   - O settings/pricing (fallback)
   ↓
5. Invoice aparece en Payments page del admin
```

## 🚀 Después de los Cambios

1. **Hacer commit y push** del frontend a Vercel
2. **Verificar** que el admin dashboard detecta los nuevos registros
3. **Probar** que los invoices se generan con los precios correctos

## 📝 Notas Importantes

- Los precios están en dólares en `pricing.js` pero el admin los guarda en centavos
- El auto-invoice convierte automáticamente de dólares a centavos
- Las academias se obtienen de `academies_2026_spring` en Firestore
- Los precios también están en `settings/pricing` en Firestore (usado por el admin)
