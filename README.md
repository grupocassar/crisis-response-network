# Emergency Network

Sistema de Respuesta Rápida para Catástrofes.

Plataforma web progresiva (PWA) diseñada para operar en condiciones extremas: baja batería, conectividad limitada (2G/Edge), infraestructura degradada y usuarios bajo estrés.

El sistema permite reportar, buscar y actualizar información sobre personas y zonas afectadas durante eventos de emergencia, manteniendo el consumo de datos y recursos al mínimo.

## Principios del Sistema

### Fricción Cero

El reporte inicial puede completarse en menos de 20 segundos utilizando únicamente la información esencial.

### Bajo Consumo

Diseñado para funcionar en redes lentas e inestables. Evita conexiones persistentes innecesarias y reduce al mínimo el tráfico de datos.

### Operación Dual

El sistema contempla dos flujos principales:

* Personas: búsqueda y localización de familiares o conocidos.
* Zonas Críticas: coordinación de incidentes, refugios y áreas afectadas.

### Confianza Progresiva

Los reportes conservan su historial completo y reciben distintos niveles de confianza según la fuente de información.

Ejemplos:

* Ciudadano
* Familiar
* Voluntario
* Personal médico
* Organismo oficial

### Tolerancia a Errores

Implementa búsqueda difusa para localizar registros incluso cuando existen errores tipográficos, nombres incompletos o variaciones en la escritura.

## Arquitectura

### Frontend

* React
* Vite
* Progressive Web App (PWA)

### Edge y Distribución

* Cloudflare Pages
* Caché distribuida
* Protección contra tráfico malicioso

### Persistencia

* Supabase
* PostgreSQL

### Backend

* Node.js
* Express

### Notificaciones

* Telegram Bot API

## Estructura del Repositorio

```text
emergency-network/
├── frontend/      # React + Vite
├── backend/       # Node.js + Express
└── supabase/      # Migraciones y esquemas SQL
```

## Hoja de Ruta

* [ ] Crear proyecto Supabase y ejecutar migraciones iniciales.
* [ ] Implementar tablas de incidentes, personas y zonas.
* [ ] Activar pg_trgm para búsqueda difusa.
* [ ] Integrar frontend con Supabase.
* [ ] Implementar API para automatizaciones y notificaciones.
* [ ] Incorporar capacidades offline mediante Service Worker.
* [ ] Implementar sistema de niveles de confianza.
* [ ] Optimizar funcionamiento bajo redes de baja calidad.

## Objetivo

Proporcionar una herramienta resiliente para comunidades, organizaciones humanitarias y equipos de respuesta que necesiten compartir información crítica durante una emergencia, incluso cuando las comunicaciones tradicionales resulten insuficientes.
