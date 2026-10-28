# Contributing to NAVIBORI XR

## Branching
Use short-lived branches and pull requests. Do not develop major features directly on `main`.

Recommended prefixes:
- `foundation/`
- `feature/`
- `fix/`
- `docs/`
- `security/`

## Quality gates
Every change should:
1. type-check successfully;
2. build successfully;
3. preserve keyboard navigation;
4. avoid embedding credentials;
5. keep venue data tenant-aware;
6. document new spatial entities or schema changes.

## Spatial-data rule
Do not invent physical locations, indoor routes, accessibility features, emergency exits or floor-plan geometry. Production spatial data must be derived from validated source material.
