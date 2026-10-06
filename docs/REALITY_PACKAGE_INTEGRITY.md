# Reality Package Integrity

NAVIBORI experiences should be able to prove which exact spatial package they are using.

## Phase 1 — implemented
Deterministic canonicalization + SHA-256 integrity hash.

A package includes:
- venue
- dataset ID
- revision
- publication timestamp
- provenance
- enabled experience modules
- canonical payload

A content change produces a different hash.

## Phase 2
Add publisher signatures using a managed asymmetric key.

Target flow:

published spatial dataset
→ canonical Reality Package
→ SHA-256
→ publisher signature
→ cache/offline distribution
→ device verification
→ Map/Twin/AR/VR consumption

## Rule
An integrity hash proves content consistency, not publisher identity. Do not call Phase 1 a digital signature.

## Future XENO use
Navi can expose:
- package revision
- integrity state
- provenance
- cached/live status
- signature validity when Phase 2 exists.
