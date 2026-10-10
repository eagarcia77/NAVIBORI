# Peripheral Confidence + Navi Morphing

## Peripheral Confidence
NAVIBORI ranks available interaction/position signals using:
- availability
- permission
- confidence
- freshness

No sensor becomes authoritative simply because it is present.

## Input Fusion
The top three valid signals may contribute to a fused confidence score.

Examples:
- QR + UWB + vision
- pointer + keyboard
- gamepad + haptics
- XR controller + pose stream

## Degraded mode
If confidence is weak, NAVIBORI must state that the signal is degraded and fall back to a safer interaction mode.

## Navi Morphing
Navi changes presentation, not identity.

Possible presentations:
- visual
- compact visual
- spatial audio
- haptic-ready
- XR avatar

The approved NAVIBORI logo and Navi mascot remain the canonical identity across all modes.
