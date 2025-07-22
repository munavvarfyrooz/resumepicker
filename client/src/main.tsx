import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection:', event.reason);
  // Prevent the default behavior that logs to console
  event.preventDefault();
});

createRoot(document.getElementById("root")!).render(<App />);
