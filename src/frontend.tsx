import "./index.css";
import App from "./app";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const elemOrNull = document.querySelector("#root");
if (!elemOrNull) {
  throw new Error("Root element #root not found in document");
}
const elem = elemOrNull;

const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// Import.meta.hot is available in Bun dev (HMR) mode; undefined after production bundling
// Note: import.meta.hot.data must be accessed directly (Bun restriction — no aliasing via variable)
interface HotData {
  root?: ReturnType<typeof createRoot>;
}

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Bun types import.meta.hot as always-truthy but it is undefined after production bundling
if (import.meta.hot) {
  const data = import.meta.hot.data as HotData;
  const root = (data.root ??= createRoot(elem));
  root.render(app);
} else {
  createRoot(elem).render(app);
}
