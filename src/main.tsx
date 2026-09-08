import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { applyStoredTheme } from "./theme";
import "./styles.css";

// index.html already set the attribute before first paint; this keeps the module the single
// place that owns the rule, so a change there cannot be silently contradicted here.
applyStoredTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
