# NAVIBORI Studio v0.1

## Purpose
NAVIBORI Studio is the spatial content-management system for municipalities and venue operators.

## Core rule
No production entity may be published without provenance.

## Editing model
The editor supports:
- buildings/floors/spaces
- POI
- route nodes
- route edges
- QR anchors
- accessibility metadata
- temporary closures
- draft/published lifecycle

## Accessibility
Drag-and-drop may be offered as an enhancement, but every essential operation must also be available through keyboard-accessible form controls.

## Publication workflow
1. Create or import.
2. Attach source/provenance.
3. Validate geometry and metadata.
4. Review.
5. Publish.
6. Record revision/audit event.

## Current prototype
The initial Studio screen intentionally uses demo-only records and blocks publication of records whose provenance begins with `Demo`.

## Future integration
Once the dedicated NAVIBORI Supabase/PostGIS project exists, Studio will connect to:
- venue-scoped RLS policies;
- spatial geometry columns;
- revision history;
- role-aware publishing;
- map import/export;
- route QA tools.
