import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AppProviders from "./app/AppProviders.jsx";
// Same self-hosted typeface and weights as fixonest_frontend (no runtime
// request to Google Fonts; a weight's file only downloads once it's used).
// Set as Tailwind's --font-sans in styles/index.css.
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "./styles/index.css";
import App from "./app/App.jsx";

// Application entry point: keep this minimal, compose providers in app/AppProviders.jsx.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
