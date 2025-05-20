import React from "react";
import ReactDOM from "react-dom/client"; // Use "react-dom/client" for React 18+
import App from "./App";
import "./App.css";

const root = ReactDOM.createRoot(document.getElementById("root")); // Correct way for React 18
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
