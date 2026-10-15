# NAVIBORI NOVA — Extraterrestrial Audit v2

## Purpose
Extend NAVIBORI from spatial intelligence into **spatial continuity**: experiences should survive connectivity changes, device changes, rendering modes and collaboration boundaries.

## New platform layer: Continuity Fabric

### 1. Spatial Command Bus
Holo-Coquí and future AI agents must never manipulate the interface through unstructured instructions.

All agent output should resolve to typed commands such as:
- focus POI
- route to POI
- activate map layer
- open portal
- start quest
- enter AR/VR/Twin
- speak verified guidance

This makes AI behavior auditable and testable.

### 2. Cross-Reality Session Handoff
A visitor may begin on:
- desktop Twin,
- continue on mobile map,
- arrive and switch to AR,
- later replay the experience in VR.

The handoff payload preserves intent rather than raw sensor history.

### 3. Local-First Spatial Cache
The visitor shell should remain useful during intermittent connectivity:
- last published map package
- critical POI metadata
- saved itinerary
- route graph version
- accessibility profile selected by the visitor
- static cultural content

Never cache secret administration data in the public visitor shell.

### 4. Background Reconciliation
Where Background Sync exists, queued non-sensitive actions can synchronize once connectivity returns.
Fallback: visible retry queue while app is open.

### 5. Mesh Presence
WebRTC DataChannel can support peer-to-peer session state for explicitly joined groups:
- shared destination
- meeting point
- quest progress
- temporary pointers

No persistent friend tracking or automatic location sharing.

### 6. WarpStream
WebTransport can serve future low-latency streams:
- crowd aggregate updates
- event-state deltas
- multiplayer quest state
- Twin telemetry

Fallback: WebSocket / Supabase Realtime / polling.

### 7. Multimodal Capture Pipeline
WebCodecs can support future controlled processing of video/audio frames for:
- venue capture assistance
- portal recording
- XR media transforms
- computer-vision preprocessing

This does not imply automatic recognition is enabled.

### 8. BLE / IoT Bridge
Web Bluetooth may connect approved venue peripherals where browser support exists.

Potential uses:
- beacon commissioning
- interactive exhibits
- sensor commissioning
- maintenance tools

This remains experimental and permission-gated.

### 9. Spatial Continuity Principle
Persist **intent and verified state**, not unnecessary surveillance data.

Prefer:
- selected destination
- selected route profile
- current quest
- map layer
- published dataset version

Avoid:
- continuous historical precise location
- raw camera frames
- raw microphone capture
- permanent peer presence

## New innovation layers

### Reality Compiler
A future build pipeline that takes:
1. canonical spatial geometry
2. semantic metadata
3. temporal state
4. device capabilities
5. accessibility preferences

and compiles an appropriate experience for:
- 2D map
- 3D Twin
- AR
- VR
- audio-only
- reduced-motion mode

### Context Kernel
A deterministic context object should describe:
- venue
- floor
- time
- published dataset version
- user-selected route preferences
- device capabilities
- consent state
- active event
- connectivity state

AI can reason over the kernel, but cannot override its validated facts.

### Reality Firewall
Before any AI-generated spatial action is executed:
- validate action type
- validate referenced entity exists
- validate publication state
- validate role/permission
- validate sensor consent
- validate safety class
- require confirmation for sensitive mode transitions

## North Star
NAVIBORI should preserve continuity of a place across devices, time and realities without sacrificing truth, privacy or accessibility.
