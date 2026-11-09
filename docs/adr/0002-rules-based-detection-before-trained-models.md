# Rules-based move detection before trained models

The first move detector is hand-written vision code, not a trained neural network:
- It reads the visible sticker colors (using the **Calibration**) and compares frames to tell which **Face turn** happened.
- It tracks which block of stickers moved in the image to separate **Wide moves**, **Slice moves** and **Rotations** from face turns.

This works at slow speed (about 3 TPS or less) without a labelled dataset, which Kynesis doesn't have.

Trained models are expected later, brought in only where the rules fail: motion blur, fingers covering stickers, full solve speed. Building them will need move-labelled video, most cheaply recorded with a **Smart cube**. So someone seeing ML-shaped problems solved with hand-written rules should know this was a deliberate starting point, not an oversight.
