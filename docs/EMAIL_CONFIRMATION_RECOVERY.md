# NAVIBORI — Recuperación del correo de confirmación (octubre 2026)

## Estado observado
Una cuenta registrada puede tener `email_confirmed_at IS NULL` aunque
`confirmation_sent_at` tenga fecha. El registro de envío NO prueba
entrega al buzón.

Supabase documenta que su SMTP incorporado se limita a direcciones
preautorizadas de miembros del proyecto y no es adecuado para producción.
Referencia: https://supabase.com/docs/guides/auth/auth-smtp

## Nuevo flujo
1. En `/login`, usar «Reenviar correo de confirmación».
2. Enviar el correo de la cuenta. La acción del servidor ejecuta
   `supabase.auth.resend({type:'signup', email, options:{emailRedirectTo:...}})`.
3. El resultado no revela si una cuenta existe; Supabase aplica
   su propia protección frente a envíos frecuentes.
4. Abrir el enlace desde el mismo navegador donde se solicitó cuando
   sea posible (flujo SSR PKCE).
5. `/auth/callback` comprueba el código de intercambio o un
   token_hash válido. Nunca modifica tablas de usuarios ni roles
   directamente.
6. Iniciar sesión, y entonces solicitar la asignación administrativa
   explícita para el primer venue. Confirmar el correo NO asigna roles.

## Configuración obligatoria de Supabase antes del piloto comercial
Proyecto dedicado NAVIBORI:

* En Authentication → SMTP, configurar un proveedor SMTP apropiado
  (por ejemplo Resend o Amazon SES) y una dirección remitente validada.
  https://supabase.com/dashboard/project/dwvmkmdrekovuckcyvfq/auth/smtp
* En Authentication → URL Configuration, configurar **Site URL**
  como `https://navibori.onrender.com` y añadir a Redirect URLs
  `https://navibori.onrender.com/auth/callback`.
  https://supabase.com/dashboard/project/dwvmkmdrekovuckcyvfq/auth/url-configuration
* Comprobar el correo de confirmación con una cuenta de prueba,
  el enlace, intercambio PKCE, expiración y límites de envío.
* Verificar SPF, DKIM y DMARC del dominio remitente; no colocar
  claves SMTP en GitHub ni en campos públicos de Next.js.
* Activar protección CAPTCHA antes de abrir registro al público y
  estudiar la advertencia de protección de contraseñas filtradas.

## Límites de la implementación
La aplicación no puede garantizar la entrega si SMTP no está autorizado.
No se deshabilita la verificación de email y no se confiere el rol
`platform_owner` automáticamente a ningún email.
