import { createApp } from "./app.ts";

createApp().listen(3000, () => {
  console.log("api listening on http://localhost:3000");
});
