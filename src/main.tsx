import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import App from "./App";

// Create a theme with your customizations
const theme = createTheme({
  // You can customize your theme here
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
