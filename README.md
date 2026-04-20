# FitCRM - Gestión de Entrenamiento Personal

## 🚀 Cómo ejecutar

1. Asegúrate de tener **Node.js** instalado (v18+)
   - Descárgalo en: https://nodejs.org

2. Abre la terminal en esta carpeta y ejecuta:

```bash
npm install
npm run dev
```

3. Se abrirá automáticamente en tu navegador en `http://localhost:3000`

## 📋 Módulos

- **👥 Clientes Centro** - Vista general con contadores (activos, pausados, baja) y cambio de estado
- **📊 Ficha Progresión** - Búsqueda de cliente + Perfil (edad, objetivo, condición física) + Marcas de ejercicios con tabla de progresión
- **📋 Seguimiento** - Recordatorios para bajas, operaciones, vacaciones, con notificaciones
- **🎯 Leads** - Gestión de potenciales clientes con embudo de conversión

## 🏋️ Ejercicios trackeados

Press Banca, Globe Squat, Peso Muerto, Hip-Thrust, Press Hombro, Remo, Jalón al Pecho

Cada ejercicio registra: Fecha, Series, Peso, Reps → calcula Volumen y Score automáticamente.

## 💾 Datos

Los datos se guardan en el navegador (localStorage). No se pierden al cerrar la página.

## 📦 Para producción

```bash
npm run build
```

Genera los archivos en la carpeta `dist/` listos para subir a cualquier hosting.
<!-- v63 rebuild -->
