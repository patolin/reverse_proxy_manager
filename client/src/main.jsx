import React from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./App.jsx";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Application root element was not found");
}

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#234fce" },
    background: { default: "#f5f7fb", paper: "#ffffff" },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
  },
});

createRoot(rootElement).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
