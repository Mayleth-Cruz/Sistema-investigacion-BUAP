# Backend - Sistema Integral de Información para la Investigación (SI3)

Backend RESTful modular desarrollado en **PHP** y **MySQL** siguiendo las mejores prácticas de arquitectura limpia, separación de responsabilidades (Controller - Service - Repository) y tipado estricto.

## Estructura de Carpetas

```
backend/
├── config/              # Parámetros globales y de base de datos
│   ├── app.php          # CORS, entorno y zona horaria
│   └── database.php     # Conexión MySQL con soporte de variables de entorno
├── public/              # Directorio público expuesto al servidor web
│   ├── index.php        # Front Controller con autoloader PSR-4 y rutas
│   ├── router.php       # Enrutador para el servidor embebido de PHP
│   └── .htaccess        # Reglas mod_rewrite para Apache/XAMPP
├── src/
│   ├── Core/            # Componentes reutilizables del framework ligero
│   │   ├── Database.php # Conexión PDO Singleton y transacciones
│   │   ├── Request.php  # Abstracción de peticiones y parseo de JSON
│   │   ├── Response.php # Salidas JSON estándar y CORS
│   │   ├── Router.php   # Despachador de rutas con parámetros dinámicos
│   │   └── Validator.php# Validación de correos, ORCID y requeridos
│   ├── Database/
│   │   ├── schema.sql   # DDL de tablas (investigadores, proyectos, etc.)
│   │   └── seed.sql     # Datos semilla realistas
│   └── Modules/         # Módulos desacoplados del dominio
│       ├── Researchers/ # Módulo de Investigadores
│       ├── Projects/    # Módulo de Proyectos de Investigación
│       ├── Publications/# Módulo de Artículos y Publicaciones Científicas
│       ├── Production/  # Módulo de Producción Técnica (Patentes, Tesis)
│       ├── Metrics/     # Módulo de Monitoreo y Estadísticas
│       └── Dissemination/# Módulo de Difusión y Citas BibTeX
├── .env.example         # Ejemplo de variables de configuración
└── README.md
```

## Inicialización de la Base de Datos

En tu terminal o cliente MySQL (como phpMyAdmin, MySQL Workbench o DBeaver), ejecuta:

```bash
# 1. Crear la base de datos y las tablas
mysql -u root -p < src/Database/schema.sql

# 2. Cargar los datos semilla de prueba
mysql -u root -p < src/Database/seed.sql
```

## Ejecución del Servidor PHP

Desde la raíz del proyecto, puedes usar el script automatizado `./run.sh`, o ejecutar directamente:

```bash
php -S 127.0.0.1:8000 -t backend/public backend/public/router.php
```
