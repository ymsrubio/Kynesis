import { chooseSource } from "./chooseSource";
import { startFeed } from "./startFeed";

const video = document.querySelector<HTMLVideoElement>("#feed")!;
const status = document.querySelector<HTMLElement>("#status")!;

void startFeed(chooseSource(window.location.search, window.location.origin), video, status);
