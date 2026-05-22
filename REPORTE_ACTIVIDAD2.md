# Reporte Técnico — Actividad 2
## Instalación de Docker y Herramientas · Cómputo en la Nube

---

**Institución:** Maestría en Sistemas Computacionales  
**Materia:** Temas Selectos I — Cómputo en la Nube  
**Alumno:** Pedro López  
**Correo:** pedrolpz51@gmail.com  
**Fecha:** 21 de mayo de 2026  
**Sistema operativo:** macOS (Darwin 25.5.0)

---

## 1. Objetivo

Configurar un entorno local en macOS donde se ejecute una API REST desarrollada con LoopBack 4 y una aplicación frontend desarrollada con React + Vite, ambas contenedorizadas con Docker y orquestadas mediante Docker Compose.

---

## 2. Entorno de desarrollo

| Herramienta       | Versión         |
|-------------------|-----------------|
| macOS             | Darwin 25.5.0   |
| Node.js           | v22.22.1        |
| npm               | 10.9.4          |
| Yarn              | 1.22.22         |
| Docker Desktop    | 29.4.3          |
| Docker Compose    | v5.1.3          |
| TypeScript        | ~5.2.2          |
| LoopBack          | 4.x             |
| React + Vite      | 19.x / 8.x      |

---

## 3. Arquitectura del sistema

```
┌────────────────────────────────────────────┐
│              Docker Compose                │
│                                            │
│  ┌──────────────────┐  ┌────────────────┐  │
│  │   students-      │  │   students-    │  │
│  │   backend        │  │   frontend     │  │
│  │                  │  │                │  │
│  │  LoopBack 4 API  │  │  React + Vite  │  │
│  │  Node 24-slim    │  │  Nginx Alpine  │  │
│  │  Puerto: 3000    │  │  Puerto: 80    │  │
│  └────────┬─────────┘  └───────┬────────┘  │
│           │    app-net (bridge) │           │
│           └────────────────────┘           │
└────────────────────────────────────────────┘
         ↑                    ↑
  localhost:3000        localhost:80
```

El frontend sirve los archivos estáticos vía Nginx y actúa como **reverse proxy**: las peticiones a `/students` son redirigidas internamente al contenedor `backend:3000`, eliminando problemas de CORS.

---

## 4. Estructura de archivos

```
msc/
├── docker-compose.yml
├── students-api/               ← API LoopBack 4 (preexistente)
│   ├── Dockerfile
│   └── src/
│       ├── controllers/
│       │   └── student.controller.ts
│       ├── models/
│       │   └── student.model.ts
│       ├── repositories/
│       │   └── student.repository.ts
│       └── datasources/
│           └── db.datasource.ts
└── students-frontend/          ← Frontend React (creado en esta actividad)
    ├── Dockerfile
    ├── nginx.conf
    └── src/
        ├── api/
        │   └── students.ts
        ├── types/
        │   └── student.ts
        ├── components/
        │   ├── StudentForm.tsx
        │   └── StudentTable.tsx
        └── App.tsx
```

---

## 5. Fase 1 — API REST con LoopBack 4

### 5.1 Descripción

La API `students-api` fue generada con el CLI de LoopBack 4 (`lb4 app`). Expone un CRUD completo para el modelo `Student` con almacenamiento en memoria.

### 5.2 Modelo Student

```typescript
// src/models/student.model.ts
@model({ settings: { strict: false } })
export class Student extends Entity {
  @property({ type: 'number', id: true, generated: true })
  StudentId?: number;

  @property({ type: 'string', required: true })
  controlNumber: string;

  @property({ type: 'string', required: true })
  Name: string;
}
```

### 5.3 Endpoints disponibles

| Método   | Ruta               | Descripción                    |
|----------|--------------------|--------------------------------|
| `GET`    | `/students`        | Listar todos los estudiantes   |
| `POST`   | `/students`        | Crear estudiante               |
| `GET`    | `/students/{id}`   | Obtener por ID                 |
| `PATCH`  | `/students/{id}`   | Actualizar parcialmente        |
| `PUT`    | `/students/{id}`   | Reemplazar registro completo   |
| `DELETE` | `/students/{id}`   | Eliminar estudiante            |
| `GET`    | `/students/count`  | Contar registros               |
| `GET`    | `/explorer`        | Swagger UI interactivo         |

### 5.4 Datasource

Se utiliza el conector `memory` de LoopBack para simplicidad en el entorno de demostración. Los datos no persisten al reiniciar el contenedor.

---

## 6. Fase 2 — Frontend React + Vite

### 6.1 Creación del proyecto

```bash
npm create vite@latest students-frontend -- --template react-ts
cd students-frontend
npm install
```

### 6.2 Módulo de acceso a la API

```typescript
// src/api/students.ts
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function getStudents(): Promise<Student[]> { ... }
export async function createStudent(data): Promise<Student> { ... }
export async function deleteStudent(id: number): Promise<void> { ... }
```

En producción (Docker), `VITE_API_URL` no se define — las peticiones se envían al mismo origen (`/students`) y Nginx las redirige al backend.

### 6.3 Componentes

| Componente       | Responsabilidad                            |
|------------------|--------------------------------------------|
| `App.tsx`        | Estado global, carga de datos, handlers    |
| `StudentForm`    | Formulario para agregar estudiante         |
| `StudentTable`   | Tabla con botón de eliminar por registro   |

### 6.4 Configuración de proxy (desarrollo local)

```typescript
// vite.config.ts
server: {
  proxy: {
    '/students': 'http://localhost:3000',
  },
},
```

---

## 7. Fase 3 — Dockerización

### 7.1 Dockerfile del backend

```dockerfile
FROM docker.io/library/node:24-slim

USER node

RUN mkdir -p /home/node/app
WORKDIR /home/node/app

COPY --chown=node package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY --chown=node . .
RUN npm run build

ENV HOST=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node", "."]
```

**Decisiones técnicas:**
- Se usa `USER node` (usuario no-root) para reducir la superficie de ataque.
- `yarn install --frozen-lockfile` garantiza instalación reproducible desde `yarn.lock`.

### 7.2 Dockerfile del frontend (multi-stage)

```dockerfile
# Stage 1: compilar React
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: servir con Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Ventajas del build multi-stage:**
- La imagen final (`nginx:alpine`, ~25 MB) no contiene Node.js ni código fuente.
- Separación limpia entre entorno de compilación y entorno de producción.

### 7.3 Configuración de Nginx

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location /students {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

El bloque `location /students` actúa como **reverse proxy**, resolviendo el nombre `backend` por la red interna de Docker Compose.

### 7.4 Docker Compose

```yaml
services:
  backend:
    build: ./students-api
    container_name: students-backend
    ports:
      - "3000:3000"
    environment:
      HOST: 0.0.0.0
      PORT: 3000
    networks:
      - app-net
    restart: unless-stopped

  frontend:
    build: ./students-frontend
    container_name: students-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - app-net
    restart: unless-stopped

networks:
  app-net:
    driver: bridge
```

---

## 8. Validación

### 8.1 Build de imágenes

```bash
cd ~/code/msc
docker compose build
```

Resultado:

| Imagen            | Tamaño  |
|-------------------|---------|
| `msc-backend`     | 195 MB  |
| `msc-frontend`    | 25.9 MB |

### 8.2 Pruebas de integración

```bash
# Levantar servicios
docker compose up -d

# Crear estudiante
curl -X POST http://localhost:3000/students \
  -H "Content-Type: application/json" \
  -d '{"controlNumber":"21410001","Name":"Pedro López"}'
# → {"controlNumber":"21410001","StudentId":1,"Name":"Pedro López"}

# Listar vía proxy Nginx (puerto 80)
curl http://localhost/students
# → [{"controlNumber":"21410001","StudentId":1,"Name":"Pedro López"}]

# Verificar frontend
curl -o /dev/null -w "%{http_code}" http://localhost
# → 200
```

Todos los servicios responden correctamente.

### 8.3 Estado de los contenedores

```
NAME                IMAGE          STATUS    PORTS
students-backend    msc-backend    Up        0.0.0.0:3000->3000/tcp
students-frontend   msc-frontend   Up        0.0.0.0:80->80/tcp
```

---

## 9. Comandos de operación (macOS)

```bash
# Levantar en background
docker compose up -d

# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f backend

# Detener y eliminar contenedores
docker compose down

# Reconstruir tras cambios en el código
docker compose up --build -d

# Verificar IP local del equipo (equivalente a ipconfig en Windows)
ifconfig | grep "inet " | grep -v 127.0.0.1
```

---

## 10. Diferencias con la guía original (Windows 11)

| Aspecto                  | Windows 11 (guía original)      | macOS (esta actividad)           |
|--------------------------|---------------------------------|----------------------------------|
| Verificar IP local       | `ipconfig`                      | `ifconfig` / `ip addr`           |
| Virtualización           | Hyper-V / WSL2 requerido        | Nativo (no se requiere WSL)      |
| Backend de Docker        | WSL2                            | Virtualization.framework         |
| Cliente DDNS             | App instalable (No-IP/DuckDNS)  | `curl` + LaunchAgent de macOS    |
| Gestión de procesos      | Servicios de Windows            | `launchctl` / `launchd`          |

---

## 11. Fase 5 — Publicación en Internet

### 11.1 Intento de Port Forwarding con DDNS (TP-Link Deco)

Se configuró el servicio DDNS integrado del router TP-Link Deco con el dominio `mscplopez2025.tplinkdns.com`. Se verificó que el dominio resolvía correctamente la IP pública:

```bash
$ nslookup mscplopez2025.tplinkdns.com
Name: mscplopez2025.tplinkdns.com
Address: 187.243.41.182
```

Se configuraron las siguientes reglas de reenvío de puertos en la app Deco:

| Nombre  | IP destino        | Puerto externo | Puerto interno |
|---------|-------------------|----------------|----------------|
| front   | 192.168.68.103    | 8080           | 8080           |
| api     | 192.168.68.103    | 3000           | 3000           |

Sin embargo, el acceso externo no funcionó.

### 11.2 Diagnóstico — CGNAT detectado

Al inspeccionar la configuración WAN del router se encontró la causa:

```
IP Address WAN:   192.168.1.5     ← IP privada (no pública)
Default Gateway:  192.168.1.1
```

El router Deco recibe una **IP privada** de Megacable (`192.168.1.5`), lo que indica que el ISP utiliza **CGNAT** (Carrier-Grade NAT). Megacable comparte una sola IP pública entre múltiples clientes residenciales, haciendo que el port forwarding desde el router doméstico sea inefectivo — el tráfico nunca llega al equipo del usuario.

```
Internet
    │
    ▼
[NAT de Megacable]  ← 187.243.41.182 (compartida entre clientes)
    │
    ▼
[Deco WAN: 192.168.1.5]
    │
    ▼
[Mac: 192.168.68.103]
```

### 11.3 Solución — Túnel con Ngrok

Para resolver el bloqueo de CGNAT se utilizó **Ngrok**, una herramienta que establece un túnel cifrado desde el equipo local hacia servidores en la nube, sin necesidad de abrir puertos en el router.

**Verificación previa:**

```bash
$ ngrok config check
Valid configuration file at /Users/daleth50/Library/Application Support/ngrok/ngrok.yml
```

**Levantamiento del túnel:**

```bash
ngrok http 8080
```

**Resultado:**

```
started tunnel → https://nonresiliently-primsie-charlotte.ngrok-free.dev
```

**Validación:**

```bash
$ curl -s -o /dev/null -w "%{http_code}" \
  -H "ngrok-skip-browser-warning: true" \
  https://nonresiliently-primsie-charlotte.ngrok-free.dev
200
```

La aplicación quedó accesible públicamente desde cualquier red.

### 11.4 Corrección — URL de la API en el frontend

Al acceder desde una URL externa, el frontend intentaba conectar con `http://localhost:3000` — resuelto en el navegador del visitante, no en el servidor. Se corrigió usando ruta relativa por defecto:

```typescript
// src/api/students.ts — antes
const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// después
const BASE = import.meta.env.VITE_API_URL ?? '';
// Las peticiones van a /students en el mismo origen → Nginx las proxea a backend:3000
```

Se reconstruyó la imagen y se verificó que ambos endpoints respondieran correctamente:

```bash
$ docker compose up --build -d
$ curl -o /dev/null -w "%{http_code}\n" http://localhost:8080        # → 200
$ curl -o /dev/null -w "%{http_code}\n" http://localhost:8080/students  # → 200
```

### 11.5 Arquitectura final con Ngrok

```
Internet
    │
    ▼
[Servidores Ngrok]
    │  túnel cifrado (TLS)
    ▼
[Mac: ngrok agent]
    │
    ▼
[Docker: students-frontend :8080]
    │  proxy interno
    ▼
[Docker: students-backend :3000]
```

### 11.6 Comparativa de métodos de publicación

| Método             | Funciona con CGNAT | Requiere dominio | Complejidad |
|--------------------|--------------------|------------------|-------------|
| Port Forwarding    | No                 | Opcional         | Baja        |
| DDNS + Port Fwd    | No                 | Sí               | Media       |
| Ngrok              | Sí                 | No               | Muy baja    |
| Cloudflare Tunnel  | Sí                 | Sí               | Media       |
| IP pública Megacable | Sí (costo extra) | Opcional         | Baja        |

---

## 12. Diferencias con la guía original (Windows 11)

| Aspecto                  | Windows 11 (guía original)      | macOS (esta actividad)           |
|--------------------------|---------------------------------|----------------------------------|
| Verificar IP local       | `ipconfig`                      | `ifconfig` / `ip addr`           |
| Virtualización           | Hyper-V / WSL2 requerido        | Nativo (no se requiere WSL)      |
| Backend de Docker        | WSL2                            | Virtualization.framework         |
| Cliente DDNS             | App instalable (No-IP/DuckDNS)  | DDNS integrado en router Deco    |
| Gestión de procesos      | Servicios de Windows            | `launchctl` / `launchd`          |
| Publicación con CGNAT    | No documentado                  | Ngrok como alternativa           |

---

## 13. Conclusiones

Se logró desplegar exitosamente una aplicación de dos capas (API REST + SPA) usando tecnologías modernas de contenedores. La arquitectura adoptada resuelve el problema de CORS sin modificar la API, usando Nginx como reverse proxy dentro de la red interna de Docker. El build multi-stage del frontend reduce la imagen de ~500 MB a ~26 MB, resultando en despliegues más rápidos y menor superficie de ataque.

La adaptación a macOS resultó directa gracias a que Docker Desktop abstrae las diferencias de plataforma. El reto principal no fue el sistema operativo sino la infraestructura de red del ISP: Izzi utiliza CGNAT en sus cuentas residenciales, bloqueando el port forwarding tradicional. La solución con Ngrok demostró ser efectiva e inmediata, y representa un caso de uso real documentado en la industria para entornos con restricciones de red.

Esta experiencia ilustra la importancia de comprender la topología de red completa al diseñar soluciones de despliegue, no solo la configuración del servidor local.
