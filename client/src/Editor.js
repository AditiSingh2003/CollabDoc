// src/Editor.js
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const socket = io("http://localhost:5000");

const DEBOUNCE_SAVE_MS = 1500;

function Editor() {
  const { id: urlId } = useParams();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  });

  const [documentId, setDocumentId] = useState(null);
  const [content, setContent] = useState("");
  const [lastSaved, setLastSaved] = useState("");
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [myName] = useState(() => `Guest-${Math.floor(Math.random() * 10000)}`);
  const [myColor] = useState(() => `#${Math.floor(Math.random() * 16777215).toString(16)}`);

  const quillRef = useRef(null);
  const saveTimer = useRef(null);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "light" ? "dark" : "light"));
  };

  // Document logic
  useEffect(() => {
    const normalized = urlId?.trim();
    const shouldCreate = !normalized || normalized === "new" || normalized.length < 10;

    if (shouldCreate) {
      socket.emit("create-document", (newId) => {
        if (newId) {
          setDocumentId(newId);
          navigate(`/doc/${newId}`, { replace: true });
          socket.emit("join-document", newId);
        } else {
          setError("Failed to create");
        }
      });
    } else {
      setDocumentId(normalized);
      socket.emit("join-document", normalized);
    }

    const onLoad = (doc) => {
      setContent(doc || "");
      setLastSaved(doc || "");
      setIsLoading(false);
    };

    socket.on("load-document", onLoad);
    socket.on("receive-changes", (newDoc) => {
      setContent(newDoc);
      setLastSaved(newDoc);
      setSaveStatus("Saved");
    });
    socket.on("error", setError);

    socket.on("users-presence", setUsers);
    socket.on("user-joined", (u) => setUsers(prev => [...prev, u]));
    socket.on("user-left", ({ name }) => setUsers(prev => prev.filter(x => x.name !== name)));

    return () => {
      socket.off("load-document", onLoad);
      socket.off("receive-changes");
      socket.off("error");
      socket.off("users-presence");
      socket.off("user-joined");
      socket.off("user-left");
    };
  }, [urlId, navigate]);

  // Debounced save
  useEffect(() => {
    if (!documentId || content === lastSaved) return;

    setSaveStatus("Saving...");

    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      socket.emit("send-changes", { documentId, content });
      setLastSaved(content);
      setSaveStatus("Saved");
    }, DEBOUNCE_SAVE_MS);

    return () => clearTimeout(saveTimer.current);
  }, [content, documentId, lastSaved]);

  const handleChange = (newVal) => setContent(newVal);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied!");
  };

  if (isLoading) return <div style={{ padding: "40px", textAlign: "center" }}>Loading...</div>;
  if (error) return <div style={{ padding: "40px", color: "red" }}>Error: {error}</div>;

  return (
    <div
      style={{
        height: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        display: "flex",
        flexDirection: "column",
        padding: "16px 24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: "56px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingBottom: "16px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h2 style={{ margin: 0 }}>CollabDoc</h2>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{
            color: saveStatus === "Saving..." ? "var(--save-saving)" : "var(--save-saved)",
            fontWeight: 500,
          }}>
            {saveStatus}
          </span>

          <button
            onClick={toggleTheme}
            style={{
              padding: "8px 14px",
              background: theme === "dark" ? "#374151" : "#e5e7eb",
              color: theme === "dark" ? "#f3f4f6" : "#1f2937",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
          </button>

          <button
            onClick={copyLink}
            style={{
              padding: "8px 16px",
              background: "var(--accent)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Copy Link
          </button>
        </div>
      </div>

      {/* Presence panel */}
      <div
        style={{
          position: "absolute",
          top: "110px",
          right: "32px",
          background: "var(--bg-panel)",
          padding: "14px 18px",
          borderRadius: "12px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
          zIndex: 50,
          minWidth: "220px",
          maxHeight: "65vh",
          overflowY: "auto",
          color: "var(--text)",
          fontSize: "14px",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: "10px" }}>
          Online ({users.length + 1})
        </div>
        <div>
          <div style={{ color: myColor, marginBottom: "6px" }}>
            • {myName} <small>(you)</small>
          </div>
          {users.map((u) => (
            <div key={u.name} style={{ color: u.color, marginBottom: "6px" }}>
              • {u.name}
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div
        style={{
          flex: 1,
          border: "1px solid var(--border)",
          borderRadius: "10px",
          overflow: "hidden",
          background: "var(--bg)",
        }}
      >
        <ReactQuill
          theme="snow"
          value={content}
          onChange={handleChange}
          style={{ height: "100%" }}
          placeholder="Start typing or formatting... changes sync in real-time"
        />
      </div>
    </div>
  );
}

export default Editor;