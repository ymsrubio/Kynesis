# Kynesis

Kynesis watches a cuber's ordinary speedcube through a single camera and works out which moves they make, so cubers without a smart cube can record and drill their turning.

## Language

**Cuber**:
The person turning the cube in front of the camera.
_Avoid_: User, player, solver

**Speedcube**:
An ordinary 3x3 puzzle cube with no sensors or electronics in it.
_Avoid_: Puzzle, cube (when the smart/non-smart distinction matters)

**Smart cube**:
A cube with built-in sensors that reports its own turns over Bluetooth. Kynesis exists for cubers who don't have one.

**Face turn**:
A turn of one outer layer, named U, D, L, R, F or B by where that layer sits in the cuber's current view (not by its color), optionally followed by `'` (counter-clockwise) or `2` (half turn).
_Avoid_: Twist

**Wide move**:
A turn of an outer layer together with the middle layer next to it, named r, u, l, d, f or b with the same suffixes as a **Face turn**.
_Avoid_: Double-layer turn

**Slice move**:
A turn of only a middle layer, named M (between L and R, turning like L), E (between U and D, turning like D) or S (between F and B, turning like F), with the same suffixes as a **Face turn**.
_Avoid_: Middle turn

**Rotation**:
A turn of the whole cube in the cuber's hands, named x, y or z, which changes no pieces relative to each other.
_Avoid_: Regrip, cube turn

**Move**:
Any single step Kynesis recognises: a **Face turn**, a **Wide move**, a **Slice move** or a **Rotation**. Which one it is depends on which part of the cube moved as seen by the camera, not only on how the pieces end up.

**Move log**:
The running list of **Moves** Kynesis has recognised, written in standard cube notation.
_Avoid_: History, transcript, solution

**Calibration**:
The step where the cuber shows each face of their **Speedcube** to the camera once, so Kynesis learns how that cube's sticker colors look in the current lighting.
_Avoid_: Setup, scan

## Relationships

- A **Cuber** turns one **Speedcube** in front of one camera
- The camera faces the **Cuber**, so it sees the cuber's B and U faces, with the cuber's R on the camera's left
- One **Calibration** covers every **Move log** recorded until the page is reloaded or the cuber recalibrates
- Every **Move** is a **Face turn**, a **Wide move**, a **Slice move** or a **Rotation**
- A **Wide move** leaves the pieces exactly where a **Face turn** plus a **Rotation** would (r = L x), but it is a different **Move**
