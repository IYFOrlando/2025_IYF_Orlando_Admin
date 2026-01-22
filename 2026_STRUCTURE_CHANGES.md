# Cambios de Estructura para 2026

## 📋 Resumen de Cambios

Para el semestre de primavera 2026, se han realizado cambios importantes en la estructura de datos:

### ❌ Ya NO se usan:
- **2 Periodos** (Period 1 y Period 2)
- **Estructura `firstPeriod` y `secondPeriod`** (aunque se mantiene para compatibilidad con datos antiguos)

### ✅ Nueva estructura (2026):
- **Sin periodos**: Las academias se seleccionan sin dividirse en periodos
- **Estructura flexible**: Puede ser un array `selectedAcademies` o academias individuales
- **Academias actualizadas**: Ver lista abajo

## 🎓 Academias para 2026 Spring Semester

Las academias disponibles para 2026 son:

1. **Art** - $100
2. **English** - $50
3. **Kids Academy** - $50
4. **Korean Language** - $50 (con niveles: Alphabet, Beginner, Intermediate, K-Movie Conversation)
5. **Piano** - $100
6. **Pickleball** - $50
7. **Soccer** - $50
8. **Taekwondo** - $100

## 📝 Estructura de Registro (2026)

### Opción A: Array de Academias Seleccionadas (Recomendado)

```javascript
{
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  // ... otros campos ...
  selectedAcademies: [
    {
      academy: "Art",
      level: "N/A",
      schedule: "9:30 AM - 11:30 AM" // Opcional
    },
    {
      academy: "Korean Language",
      level: "Beginner",
      schedule: "10:20 AM - 11:35 AM"
    }
  ]
}
```

### Opción B: Estructura Legacy (Compatibilidad)

Para mantener compatibilidad con datos antiguos, también se soporta:

```javascript
{
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  // ... otros campos ...
  firstPeriod: {
    academy: "Art",
    level: "N/A"
  },
  secondPeriod: {
    academy: "Korean Language",
    level: "Beginner"
  }
}
```

**Nota:** El sistema automáticamente detecta y procesa ambas estructuras.

## 🔄 Código Actualizado

### Auto-Invoice (`src/lib/autoInvoice.ts`)

El código de auto-invoice ha sido actualizado para:

1. **Soportar ambas estructuras** (nueva y legacy)
2. **No requerir periodos** - `period` ahora puede ser `null`
3. **Procesar arrays de academias** - Si existe `selectedAcademies`, lo usa
4. **Mantener compatibilidad** - Sigue funcionando con registros antiguos

### Tipos TypeScript (`src/features/payments/types.ts`)

```typescript
export type InvoiceLine = {
  academy: string
  period: 1 | 2 | null  // null para 2026 (sin periodos)
  level?: string | null
  schedule?: string | null  // Horario de la academia (2026)
  unitPrice: number
  qty: number
  amount: number
  // ... otros campos
}
```

## 📧 Documentación Actualizada

Los siguientes archivos han sido actualizados para reflejar estos cambios:

- ✅ `src/lib/autoInvoice.ts` - Soporta nueva estructura
- ✅ `src/features/payments/types.ts` - `period` ahora es opcional/null
- ⚠️ `FRONTEND_EMAIL_INVOICE_EXAMPLE.js` - Necesita actualización en el frontend
- ⚠️ `INVOICE_ACCESS_FOR_USERS.md` - Necesita actualización

## 🚀 Para el Frontend

Si estás actualizando el frontend, asegúrate de:

1. **Guardar academias como array:**
```javascript
const registrationData = {
  // ... otros campos ...
  selectedAcademies: selectedAcademies.map(sel => ({
    academy: sel.academy,
    level: sel.level || 'N/A',
    schedule: sel.schedule || null
  }))
}
```

2. **O mantener estructura simple** (el auto-invoice lo procesará):
```javascript
// Si solo seleccionan una academia
{
  academy: "Art",
  level: "N/A"
}
```

3. **No usar periodos** - Ya no son necesarios

## ⚠️ Notas Importantes

- **Compatibilidad hacia atrás**: El sistema sigue procesando registros antiguos con `firstPeriod`/`secondPeriod`
- **Sin periodos**: Los invoices generados en 2026 tendrán `period: null`
- **Precios actualizados**: Ver `src/lib/constants.ts` para precios actuales
- **Academias actualizadas**: Ver lista arriba

## 🔍 Verificación

Para verificar que todo funciona:

1. Crear un registro de prueba con la nueva estructura
2. Verificar que el invoice se genera correctamente
3. Verificar que los precios son correctos
4. Verificar que no hay referencias a periodos en el invoice
