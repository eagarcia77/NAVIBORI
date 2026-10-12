# NAVIBORI XR — Plan maestro de marca, mercadeo y comercio

**Estado:** documento de implementación; NO constituye tienda desplegada ni pagos habilitados.
**Base de desarrollo:** `foundation/navibori-v0.1` (Next.js/React/TypeScript, MapLibre, Supabase).
**Principio:** desarrollar dentro de NAVIBORI; no crear una aplicación paralela.

## Identidad corporativa aprobada
- Nombre: **NAVIBORI XR — Puerto Rico Spatial Experience Platform**
- Lema principal: **Explora. Descubre. Vive Puerto Rico.**
- Lema secundario: **Tu isla. Más cerca.**
- Mascota: **coquí tecnológico**.
- Logo: reutilizar el símbolo/ruta oficial y los activos existentes del repositorio o despliegue. **No redibujar ni reemplazar** hasta identificar el archivo canónico.
- Estética: minimalista, moderna, tecnológica, accesible, centrada en el mapa.

## Funcionalidad primaria protegida
- Inicio: mapa a pantalla completa con GPS y rutas visibles.
- Navegación por automóvil, caminando, bicicleta y scooter según soporte real del motor de rutas.
- Modo 2D/3D, cámara inclinada y controles de navegación sin obstáculos.
- El Store y las campañas **no** muestran ventanas modales, banners flotantes ni anuncios intrusivos durante navegación activa.
- Idioma del dispositivo como preferencia inicial; permitir cambiar manualmente.

## NAVIBORI Store (fase 1)
- Ruta sugerida: `/store`, entrada en menú, fuera del mapa activo.
- Catálogo con imágenes reales autorizadas, tallas, colores, inventario, precios, disponibilidad y variantes.
- Productos iniciales (USD; precios **propuestos**, sujetos a costos y márgenes):
  - NB-CAP-001 Gorra NAVIBORI 24.99
  - NB-TEE-001 T-shirt Essential 29.99
  - NB-BOT-001 Termo Explorer 22.99
  - NB-BAG-001 Tote Bag Urban 19.99
  - NB-HOD-001 Hoodie Premium 49.99
  - NB-STK-001 Pegatinas 5.99
  - NB-KEY-001 Llavero 9.99
  - NB-PR-TEE-001 Camiseta Puerto Rico 34.99
- Colección futura: NAVIBORI Puerto Rico, respetando la marca principal.
- Checkout alojado en proveedor compatible; validación de inventario/precios en servidor, webhooks verificados, pedidos idempotentes; no almacenar tarjetas.
- Configurar impuestos, devoluciones, envío a PR y términos antes de habilitar compras.

## Comercios (fase 2)
- Preservar las rutas existentes `/comercios` y `/merchant` si están presentes.
- Fichas de negocios con dirección, categoría, horario, fotos, promociones y acción **Cómo llegar**.
- Portal de comerciante para campañas y analítica; marketplace solo tras definir pagos a terceros, moderación, comisiones y cumplimiento.

## Mercadeo
1. **Descubre Puerto Rico:** contenidos geolocalizados, historias de negocios y destinos.
2. **Tu negocio en NAVIBORI:** captación de comercios piloto, ficha básica gratuita y servicios premium.
3. **NAVIBORI Lifestyle:** artículos de marca, lanzamientos limitados y contenido de comunidad.
4. Promociones geolocalizadas solo con consentimiento explícito, controles de frecuencia y desactivación sencilla.

## Plan de 90 días
- **Días 1–30:** inventario de activos oficiales, sistema de diseño, proveedores, estructura del catálogo, prototipo accesible y pruebas de regresión GPS.
- **Días 31–60:** panel administrativo, integración de pagos en pruebas, inventario, pedidos, piloto de comercios y campaña de lanzamiento.
- **Días 61–90:** QA móvil, cumplimiento de políticas, analítica, optimización de conversiones y despliegue gradual.

## Indicadores
- Comercios activos, usuarios que solicitan rutas, conversiones de ficha a navegación, usuarios recurrentes.
- Visitas a Store, tasa de añadir al carrito, conversión de checkout, ingreso neto, devoluciones.
- Consentimiento de notificaciones, cancelaciones, fallos de rutas y regresiones de rendimiento.

## Criterios de aceptación
1. Marca, lema y mascota originales conservados.
2. El mapa sigue siendo la pantalla principal.
3. Navegación GPS funcional sin superposiciones comerciales.
4. Store accesible desde menú sin bloquear rutas.
5. Sin afirmaciones de ventas, disponibilidad o pagos hasta validar integraciones reales.
6. PR y revisión de CI antes de fusionar; no desplegar automáticamente sin QA.
