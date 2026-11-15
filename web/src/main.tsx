import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// Map styles load before ours so our overrides win (the map library itself is lazy-loaded).
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
