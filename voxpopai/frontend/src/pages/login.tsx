import React, { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Pretend to log in with ${email}`);
  };
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Login (Placeholder)</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "300px" }}>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <button type="submit">Login</button>
      </form>
    </main>
  );
} 