# Adaptive Peripheral Fabric

NAVIBORI adapts the same spatial experience to different peripherals instead of creating separate products.

## Supported interaction classes
- keyboard
- mouse / trackpad
- touch
- stylus / pen
- gamepad
- XR controller
- future XENO adapters

## Browser-first strategy
### Pointer Events
Primary abstraction for mouse, touch and pen.

### Gamepad
Optional navigation surface for kiosk, TV, controller and immersive setups.

### WebHID / WebUSB
Experimental adapter surfaces only. Never required for core navigation.

### XR
Capability-gated and consent-gated.

## Adaptive UI rules
- coarse/touch input → larger targets
- fine pointer → compact controls
- no hover → never hide required actions behind hover
- reduced motion → disable ornamental transitions
- gamepad → strong focus rings and sequential navigation
- compact viewport → reduce HUD density, preserve map
- large display/kiosk → persistent spatial status, larger map

## XENO future-device rule
Unknown hardware must enter through a normalized adapter contract:

device → transport adapter → normalized events → Reality Firewall → NAVIBORI command bus

No future device receives direct authority over canonical spatial data.
