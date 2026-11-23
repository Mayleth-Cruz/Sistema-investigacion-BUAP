# Generador de `flujo.html`

`flujo.html` (en la raíz del repositorio) es una página autocontenida, sin CDN, con tres vistas:
**Flujo** (reproductor de pasos con carriles y almacenes), **Eje 3** (temas: qué piden, cómo está hecho,
cómo probarlo) y **Archivos** (árbol anotado con líneas reales). No se edita a mano: la genera esta carpeta.

## Regenerar y validar

Desde la raíz del repositorio (Node 20, sin dependencias):

```bash
node tools/flujo/build.mjs        # regenera flujo.html
node tests/validar_flujo.mjs      # lo compara con el código real (debe terminar en «OK»)
node tools/flujo/mutaciones.mjs   # (opcional) comprueba que el validador detecta datos rotos
```

`build.mjs` resuelve cada línea citada **buscando el símbolo** en el archivo (no hay números a mano), así que
sobrevive a que el código se mueva. Si un símbolo ya no existe, el build falla y lista todos los que faltan:
corrige la búsqueda en `steps.mjs`, `topics.mjs` o `notes.mjs`. Un archivo nuevo sin descripción sale como
«Sin descripción» y el validador lo rechaza: agrégalo en `archivos.mjs`.

## Qué hay aquí

| Archivo | Para qué |
| --- | --- |
| `steps.mjs` | Vista Flujo: carriles, almacenes, estado acumulado (`CASO_FIELDS`) y los pasos |
| `topics.mjs` | Vista Eje 3: grupos, temas y comandos `curl` |
| `notes.mjs` | Diálogo «Notas» |
| `archivos.mjs` | Descripción de cada archivo del repo (árbol de la vista Archivos) |
| `app.js`, `base.css`, `template.html` | Mecánica, estilos y plantilla de la página |
| `lib.mjs` | Rutas del repo y búsqueda de símbolos (`S`, `T`) |
| `ex/*.json` | Respuestas reales de la API usadas como ejemplos |
| `capturar.mjs` | Regenera `ex/` ejecutando la API real |
| `mutaciones.mjs` | Prueba de mutación del validador |

## Recapturar los ejemplos de la API

```bash
node tools/flujo/capturar.mjs
node tools/flujo/build.mjs && node tests/validar_flujo.mjs
```

`capturar.mjs` copia `backend/src/Database/database.sqlite` a una carpeta temporal (la base versionada no se
toca), levanta `php -S` en un puerto libre con `SI3_SQLITE_PATH` apuntando a la copia y `DB_DRIVER=sqlite`,
recorre el flujo completo (login, cuenta de docente, contraseña temporal, proyecto, envío, revisión…) y guarda
cada respuesta en `ex/`, con el token y la contraseña temporal enmascarados. Al terminar mata el servidor.
Las contraseñas demo se leen de `guia.md` (o de `FLUJO_ADMIN_PASS` y `FLUJO_DOCENTE_PASS`) y nunca se escriben
en `flujo.html`.

## Cuando cambie el código

Si agregas rutas, pasos del flujo o archivos, edita los datos de esta carpeta, vuelve a correr
`build.mjs` y `validar_flujo.mjs`. Los números de línea y el conteo de rutas se actualizan solos.
