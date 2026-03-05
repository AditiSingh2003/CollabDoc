// client/src/App.js
import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Editor from "./Editor";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/doc/:id" element={<Editor />} />
      <Route path="*" element={<div style={{ padding: "100px", textAlign: "center" }}>404 – Page not found</div>} />
    </Routes>
  );
}

function Home() {
  const navigate = useNavigate();

  const createNewDocument = () => {
    // Navigate to a valid route segment and let Editor create a real document ID.
    navigate("/doc/new");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        textAlign: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Hero Section */}
      <div style={{ maxWidth: "800px", marginBottom: "60px" }}>
        <h1
          style={{
            fontSize: "3.5rem",
            fontWeight: 800,
            margin: "0 0 16px",
            background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-1px",
          }}
        >
          CollabDoc
        </h1>

        <p
          style={{
            fontSize: "1.4rem",
            color: "#4b5563",
            margin: "0 0 32px",
            lineHeight: 1.5,
            maxWidth: "600px",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Real-time collaborative editing. No sign-up. No fluff.<br />
          Just create, share the link, and type together — instantly.
        </p>

        {/* Primary CTA */}
        <button
          onClick={createNewDocument}
          style={{
            padding: "16px 40px",
            fontSize: "1.25rem",
            fontWeight: 600,
            background: "#3b82f6",
            color: "white",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            boxShadow: "0 10px 25px rgba(59,130,246,0.25)",
            transition: "all 0.2s ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 15px 35px rgba(59,130,246,0.35)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 10px 25px rgba(59,130,246,0.25)";
          }}
        >
          Create New Document →
        </button>
      </div>

      {/* Features */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "32px",
          maxWidth: "1100px",
          width: "100%",
        }}
      >
        <div style={{ background: "white", padding: "32px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <h3 style={{ fontSize: "1.5rem", marginBottom: "12px" }}>Instant Sync</h3>
          <p style={{ color: "#6b7280" }}>See changes live as others type — no refresh needed.</p>
        </div>

        <div style={{ background: "white", padding: "32px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <h3 style={{ fontSize: "1.5rem", marginBottom: "12px" }}>Share via Link</h3>
          <p style={{ color: "#6b7280" }}>Anyone with the URL can join and edit immediately.</p>
        </div>

        <div style={{ background: "white", padding: "32px", borderRadius: "16px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <h3 style={{ fontSize: "1.5rem", marginBottom: "12px" }}>Cloud Saved</h3>
          <p style={{ color: "#6b7280" }}>Your document is saved automatically — reopen anytime.</p>
        </div>
      </div>

      <footer style={{ marginTop: "80px", color: "#9ca3af", fontSize: "0.9rem" }}>
        Built with React • Socket.io • Supabase
      </footer>
    </div>
  );
}

export default App;
