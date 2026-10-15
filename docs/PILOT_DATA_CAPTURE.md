# Pilot 001 — Juana Díaz Spatial Data Capture

## Objective
Create a validated digital representation of the Mercado Metropolitano de Juana Díaz without guessing locations, paths, accessibility features or emergency information.

## Required source package
Preferred source material, in descending order:
1. authoritative architectural/facility floor plan;
2. municipal or venue-maintained CAD/PDF plan;
3. verified measured survey;
4. documented field walk with measurements and photographs.

Public web maps may support exterior context, but they are not sufficient to establish indoor routing.

## Inventory
Capture and verify:
- venue perimeter;
- public entrances/exits;
- parking areas and pedestrian approaches;
- floors/levels;
- corridors;
- tenant spaces;
- public/common spaces;
- bathrooms;
- information/service points;
- event areas;
- stairs;
- ramps;
- elevators/lifts where applicable;
- documented accessibility barriers;
- QR anchor locations;
- temporary-closure capable segments.

## POI record
Each POI should include:
- stable ID;
- official/display name;
- category;
- floor;
- coordinates/geometry;
- public visibility;
- accessibility metadata;
- source/provenance;
- verification date;
- publication status.

## Route graph QA
Every route edge must be field- or plan-validated for:
- connectivity;
- distance;
- indoor/outdoor state;
- stairs;
- elevator dependency;
- accessibility;
- temporary closure support.

## AR anchors
QR anchors should be installed only at stable, visually identifiable locations. Each anchor maps to a known route node and floor.

## Versioning
Spatial changes must create a new revision. Keep:
- who changed it;
- source of change;
- verification date;
- publish date;
- previous version.

## Acceptance
No indoor navigation is labeled production-ready until a human reviewer completes an end-to-end route test for the published graph.
