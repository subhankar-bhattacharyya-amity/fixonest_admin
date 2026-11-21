import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { Toaster } from "sonner";
import {
  CircleCheck,
  CircleX,
  Info,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
import { store } from "./store.js";
import { AuthBootstrap } from "@/features/auth/index.js";

// Lucide icons (the panel's icon set) replace Sonner's built-in ones; their
// per-type colours come from styles/index.css's [data-sonner-toaster] rules.
const TOAST_ICONS = {
  success: <CircleCheck size={20} />,
  error: <CircleX size={20} />,
  warning: <TriangleAlert size={20} />,
  info: <Info size={20} />,
  loading: <LoaderCircle size={20} className="animate-spin" />,
};

// Every app-wide provider is composed here (Redux, Router, ...) so main.jsx
// stays a one-liner. Sonner's Toaster is a single app-wide instance - call
// the `toast()` API from anywhere, it renders here; every failed API call
// already reaches it automatically via lib/httpClient.js's response interceptor.
// Its card look (white, slate border, rounded-2xl, teal/rose accents) lives in
// styles/index.css so it matches the panel's other cards.
export default function AppProviders({ children }) {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthBootstrap />
        {children}
        <Toaster
          position="bottom-right"
          theme="light"
          icons={TOAST_ICONS}
          duration={4000}
          visibleToasts={4}
          offset={24}
          mobileOffset={16}
        />
      </BrowserRouter>
    </Provider>
  );
}
