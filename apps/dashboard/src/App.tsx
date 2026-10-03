import type { CurrentUser } from "@ticketing/contracts";
import { useState } from "react";
import { LoginForm } from "./auth/LoginForm.tsx";

export function App() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  if (!user) return <LoginForm onSuccess={setUser} />;

  return <h1>Hoş geldin, {user.email}</h1>;
}
