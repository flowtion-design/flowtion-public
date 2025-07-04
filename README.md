# Flowtion

Flowtion es una aplicación desarrollada en Angular que brinda soporte para facilitar experiencias de co-diseño virtual. Utiliza Firebase como backend y emplea Angular Material para la interfaz de usuario.

Este proyecto fue desarrollado en el marco de la tesina de grado de las alumnas **Oriana Florencia Arevalos** y **Candela Mariel Rouaux Servat**, denominada “Flowtion: Herramienta de soporte para facilitar experiencias de co-diseño virtual”.

En relación con otras herramientas existentes, Flowtion aporta:
* Plantillas para crear la secuencia de actividades, como así también personalizarlas.
* Soporte para propagar automáticamente las ideas creadas entre actividades.
* Posibilidad de monitoreo del acontecer de cada grupo en forma simultánea durante la puesta en práctica del co-diseño.

## Requisitos previos

- Node.js >= 18
- Angular CLI >= 18
- Cuenta de Firebase (configurada en `src/environments/environment.ts`)

## Instalación

1. Clona el repositorio:
   ```bash
   git clone <url-del-repo>
   cd flowtion
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```

## Comandos útiles

- `npm start` o `ng serve`: Inicia el servidor de desarrollo en `http://localhost:4200/`.
- `ng build`: Compila la aplicación para producción en la carpeta `dist/`.
- `ng test`: Ejecuta los tests unitarios con Karma.

## Estructura del proyecto

- `src/app/` — Módulo principal y componentes base.
- `src/components/` — Componentes reutilizables (post-it, timer, dialogs, etc.).
- `src/pages/` — Páginas principales (dashboard, home, user-profile, etc.).
- `src/services/` — Servicios para lógica de negocio y acceso a datos (Firebase, usuarios, recursos, etc.).
- `src/interfaces/` — Definiciones de interfaces TypeScript.
- `src/utils/` — Utilidades y helpers.
- `src/assets/` — Imágenes, fuentes y otros recursos estáticos.

## Tecnologías principales

- Angular 18
- Angular Material & CDK
- Firebase / AngularFire
- RxJS
- date-fns
- PapaParse
- Swiper

## Configuración de Firebase

Asegúrate de configurar correctamente los datos de Firebase en `src/environments/environment.ts`.

## Licencia

Este proyecto está licenciado bajo la licencia [Creative Commons Attribution-NonCommercial 4.0 International](./LICENSE).
Ver más en https://creativecommons.org/licenses/by-nc/4.0/
