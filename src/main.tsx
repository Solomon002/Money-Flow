import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./base.css";
import "./styles.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>,
);
