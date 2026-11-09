# Move detection runs in the browser

Kynesis is a web app, and all camera processing happens on the cuber's own device, in the browser. No video frames go to a server. This keeps hosting cost at zero, keeps the cuber's camera feed private and avoids network lag. The cost is that detection is limited to what runs in real time on WASM/WebGPU, which rules out heavy server-side models.

## Considered Options

- **Server-side processing**: rejected. Streaming frames to a GPU backend would allow bigger models, but every cuber would cost money, every move would wait on a network round trip, and the camera feed would leave the device.
- **Native mobile app**: rejected for the MVP. It gives faster native vision, but means app store work and two codebases, while a web app works with any laptop webcam or phone with nothing to install.
