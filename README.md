# 🚀 ActivAmigos

**ActivAmigos** es una plataforma social diseñada específicamente para personas con discapacidades cognitivas, con el objetivo de fomentar la socialización, la autonomía y la creación de redes de apoyo a través de actividades y grupos de interés común. La aplicación utiliza un enfoque de **gamificación** para motivar a los usuarios a participar en la vida social real, ofreciendo recompensas tangibles como niveles y logros por sus acciones dentro de la comunidad.

---

## ✨ Características Principales

### 🤝 Socialización Accesible
* **Grupos de Interés**: Espacios para conectar con personas que comparten aficiones como cocina, deporte o arte.
* **Actividades y Calendario**: Agenda de planes locales donde los usuarios pueden inscribirse, ver el calendario semanal y confirmar asistencia.
* **Chat en Tiempo Real**: Comunicación instantánea dentro de cada grupo y actividad mediante el uso de WebSockets.

### 🎮 Sistema de Gamificación
* **XP y Niveles**: Los usuarios acumulan puntos de experiencia (XP) por participar, chatear y proponer planes.
* **Incentivo Visual**: Un cohete animado en el dashboard indica cuántos puntos faltan para alcanzar el siguiente nivel, motivando la constancia.
* **Logros Desbloqueables**: Medallas especiales como "¡Hola!" por el primer mensaje o "Súper Activo" por participar en varias actividades.

### 🛡️ Seguridad y Moderación
* **Semáforo de Conducta**: Indicador visual que refleja el comportamiento del usuario basado en reportes y cumplimiento de normas.
* **Gestión de Reportes**: Sistema integrado para reportar conductas inapropiadas, permitiendo una moderación activa de la comunidad.

---

## 🛠️ Stack Tecnológico

### Backend (Flask)
* **Lenguaje**: Python 3.11.
* **Framework**: Flask-Smorest para una API RESTful documentada con Swagger.
* **ORM**: SQLAlchemy para la gestión de modelos de datos.
* **Real-time**: Flask-SocketIO para el sistema de mensajería.
* **Almacenamiento**: MinIO (S3 compatible) para el manejo de imágenes de perfil.

### Frontend (Angular)
* **Framework**: Angular 19.
* **Estilos**: Tailwind CSS para un diseño moderno y responsive.
* **Estado**: RxJS y BehaviorSubjects para la gestión de notificaciones y logros en tiempo real.

### Infraestructura
* **Base de Datos**: PostgreSQL.
* **Contenerización**: Docker y Docker Compose para un despliegue unificado.
* **Servidor Web**: Nginx configurado como proxy inverso.

---

## 🚀 Instalación y Configuración

### Requisitos Previos
* Docker y Docker Compose instalados.
* Node.js v20+ (si se requiere desarrollo local del frontend).

### Pasos para el Despliegue
1. **Clonar el repositorio.**
2. **Configurar el entorno**: Crear un archivo `.env` en la carpeta `backend/` basado en el archivo `.env.example` proporcionado.
3. **Levantar los servicios**:
   ```bash
   docker-compose up --build
   ```
4. **Inicialización de Datos (Seeders)**: Cargar el catálogo de logros y datos iniciales mediante el script de seeding:
   ```bash
   docker-compose exec backend python scripts/seed_achievements_simple.py
   ```

---

## 📁 Estructura del Proyecto

* **`/backend`**: Contiene la API, servicios de negocio (puntos, moderación, auth) y utilidades de logros.
* **`/frontend/activamigos-frontend`**: Código fuente de la interfaz de usuario dividida en componentes `core`, `features` y `shared`.
* **`/nginx`**: Configuraciones de servidor y proxy.

---

## 📬 Contacto

Para consultas técnicas o soporte sobre la plataforma:
* **Profesor Responsable**: Miguel Gea.
* **Desarrollador**: Manuel Frías (mffriaslorite@correo.ugr.es)
