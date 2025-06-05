import React from "react";
import { useRouter } from "next/router";

export default function RunDetail() {
  const router = useRouter();
  const { id } = router.query;
  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Run Details (#{id})</h1>
      <p>This page will show the progress and results of a focus-group simulation run.</p>
    </main>
  );
} 