import React from "react";
import { invoke } from "@forge/bridge";

export default function App() {

  console.log("App component mounted");
  const handleClick = async () => {
    try {
      console.log("Starting migration...");
      const result = await invoke("runMigration");
      alert("Migration Done! ✅");
      console.log(result);
    } catch (err) {
      alert("Migration failed ❌");
      console.error("Error caught on frontend:", err); // Log the error explicitly
    }
  };  

  return (
    <div style={{ padding: 20 }}>
      <h2>🚀 Confluence Migration Tool</h2>
      <button onClick={handleClick}>Start Migration1</button>
    </div>
  );
}
