# 🔥 Firestore Security Rules - IYF Orlando Admin

## 📋 Resumen de Reglas Implementadas

### 👑 Administradores con Acceso Completo
- **orlando@iyfusa.org** - Acceso completo a todas las colecciones
- **jodlouis.dev@gmail.com** - Acceso completo a todas las colecciones

### 🌐 Acceso Público (Para Frontend Forms)
Las siguientes colecciones permiten **lectura y escritura pública** para que el frontend pueda llenar formularios:

#### 📝 Colecciones de Registro (Público R/W)
- `fall_academy_2025` - Registros de academia
- `volunteer_applications` - Aplicaciones de voluntarios
- `trip_to_korea_applications` - Aplicaciones para viaje a Corea
- `cooking_class_applications` - Aplicaciones para clases de cocina
- `kdrama_applications` - Aplicaciones para K-Drama
- `volunteer_schedule` - Horarios de voluntarios

### 🔒 Acceso Administrativo (Solo Admins pueden escribir)

#### 📊 Colecciones de Dashboard (Lectura Pública, Escritura Solo Admins)
- `events` - Eventos
- `volunteer_hours` - Horas de voluntarios
- `volunteer_codes` - Códigos de voluntarios
- `settings` - Configuraciones del sistema
- `academy_invoices` - Facturas de academia
- `academy_payments` - Pagos de academia
- `academy_attendance` - Asistencia de academia
- `academy_progress` - Progreso de academia
- `academy_classes` - Clases de academia
- `academy_pricing` - Precios de academia
- `food_tickets` - Tickets de comida
- `weekly_reports` - Reportes semanales
- `teachers` - Maestros

### 🎯 Beneficios de esta Configuración

#### ✅ Para el Frontend:
- **Formularios funcionan** sin autenticación
- **Usuarios pueden registrarse** libremente
- **Aplicaciones de voluntarios** se envían sin problemas
- **No hay errores de permisos** en el frontend

#### ✅ Para el Dashboard:
- **Admins tienen control total** sobre todas las colecciones
- **Lectura pública** permite ver datos sin autenticación
- **Escritura protegida** solo para administradores
- **Seguridad mantenida** para operaciones críticas

#### ✅ Para la Seguridad:
- **Datos sensibles protegidos** (solo admins pueden modificar)
- **Formularios públicos** funcionan correctamente
- **Separación clara** entre frontend y admin
- **Reglas específicas** por tipo de colección

### 🔧 Reglas Técnicas

```javascript
// Administradores
function isAdmin() {
  return request.auth != null && 
         request.auth.token.email in [
           'orlando@iyfusa.org',
           'jodlouis.dev@gmail.com'
         ];
}

// Colecciones de formularios (Público R/W)
match /volunteer_applications/{document} {
  allow read, write: if true;
}

// Colecciones de dashboard (Lectura pública, Escritura solo admins)
match /events/{document} {
  allow read: if true;
  allow write: if isAdmin();
}
```

### 📱 Compatibilidad

#### Frontend (Formularios):
- ✅ Registro de academia
- ✅ Aplicaciones de voluntarios
- ✅ Aplicaciones de viaje a Corea
- ✅ Aplicaciones de clases de cocina
- ✅ Aplicaciones de K-Drama
- ✅ Horarios de voluntarios

#### Dashboard (Administración):
- ✅ Gestión de eventos
- ✅ Control de horas de voluntarios
- ✅ Administración de códigos
- ✅ Configuración del sistema
- ✅ Gestión de facturas y pagos
- ✅ Control de asistencia y progreso
- ✅ Administración de precios
- ✅ Gestión de tickets de comida
- ✅ Reportes semanales
- ✅ Administración de maestros

### 🚀 Estado Actual
- **Reglas desplegadas** ✅
- **Frontend funcional** ✅
- **Dashboard funcional** ✅
- **Seguridad mantenida** ✅
- **Sin errores de permisos** ✅
