import { createRoot } from "react-dom/client";
import { validateDocument } from "../src/index.ts";
import { exampleDocument } from "./example.ts";
import { App } from "./App.tsx";

const result = validateDocument(exampleDocument);
if (!result.success) throw new Error("Demo document is invalid");
const root = document.getElementById("root");
if (!root) throw new Error("Demo root is missing");
createRoot(root).render(<App />);
