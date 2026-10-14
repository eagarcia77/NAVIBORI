# NAVIBORI 3.5 — Administración de permisos merchant

## Alcance
El panel privado /merchant/permissions permite a un administrador autenticado de un venue:
- Ver los usuarios con rol **merchant** de ese venue (correo confirmado e identificador).
- Conceder el rol **merchant** a una cuenta de NAVIBORI que ya exista y haya confirmado su correo.
- Revocar exclusivamente el rol **merchant**, con confirmación, sin borrar el negocio ni sus promociones.
- Consultar la auditoría mediante los mecanismos de administración del venue.

La asignación de `platform_owner`, `municipality_admin` y `venue_manager` queda **fuera** de este panel.

## Autoridad y protección
Las RPC públicas `list_merchant_venue_access`,
`grant_merchant_venue_access` y `revoke_merchant_venue_access`
son **SECURITY INVOKER**. Delegan las operaciones privilegiadas a
funciones `SECURITY DEFINER` en el esquema `navibori_private`,
que no se expone a PostgREST. Las funciones privadas comprueban
explícitamente `auth.uid()` y una membresía administrativa
**del mismo venue**. Nunca dependen de `user_metadata` ni de botones
del navegador. Todas usan `search_path=''`, referencias calificadas,
parámetros tipados, prohíben cambios de acceso propios, nunca otorgan
privilegios administrativos y registran el actor en `audit_logs`.
La lista de correos solo puede consultarla un administrador del venue.

## Estado del proyecto y acceso inicial
En la auditoría del 14 de octubre de 2026, NAVIBORI tenía 1 cuenta
registrada, 1 venue y **0 membresías**. Por tanto el panel no concede
acceso por sí mismo.

El primer administrador debe ser designado explícitamente por el titular
del proyecto mediante un proceso privilegiado y verificado (p. ej.
Supabase SQL Editor, luego de corroborar cuenta y venue). Nunca crear
ese rol automáticamente a partir de un registro público o una URL.
No publicar ni copiar identificadores de usuarios o credenciales.

## Límites de la fase
- No se envían correos de invitación; la cuenta debe existir y tener su
  dirección confirmada.
- No se gestionan roles administrativos ni múltiples subroles merchant.
- No se modifican el GPS, rutas, cartografía NovaScene 3D ni promociones.
- La revocación se hace efectiva sobre futuras operaciones que requieran
  membresía, verificadas en Supabase RLS/RPC.
- Los registros de auditoría no se borran al revocar.

## Validaciones antes de producción
1. Aplicar `docs/database/MERCHANT_MEMBERSHIP_ADMIN_V1.sql` y, después,
   `docs/database/MERCHANT_MEMBERSHIP_PRIVATE_RPC_V1.sql` al proyecto
   dedicado NAVIBORI. Ambas migraciones ya se aplicaron el 14 de octubre de 2026.
2. Comprobar permisos `EXECUTE`, la separación por venue, los errores
   de usuario no autenticado y los registros de auditoría.
3. Verificar la compilación CI, unit tests y Render.
4. Con cuentas de prueba separadas: administrador de venue A, merchant A,
   merchant B y usuario sin rol; comprobar aislamiento y revocación.
5. Revisar advertencias de Supabase Security Advisor. Los wrappers
   públicos son SECURITY INVOKER; el analizador ya no advierte sobre estas
   funciones. Sigue pendiente la protección de contraseñas filtradas.
