import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/caveat";
import "@fontsource/kalam/devanagari-400.css"; // Hindi/Marathi handwriting fallback
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
