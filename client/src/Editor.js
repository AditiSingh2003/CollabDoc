import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const SOCKET_URL = process.env.REACT_APP_SERVER_URL || "http://localhost:5000";
const socket = io(SOCKET_URL);

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
  const [lastSavedContent, setLastSavedContent] = useState("");
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [users, setUsers] = useState([]);
  const myName = `Guest-${Math.floor(Math.random() * 10000)}`;
  const myColor = `#${Math.floor(Math.random() * 16777215).toString(16)}`;

  const quillRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  // Document logic
  useEffect(() => {
    const normalizedId = urlId?.trim();
    const shouldCreateNew = !normalizedId || normalizedId === "new" || normalizedId.length < 10;

    if (shouldCreateNew) {
      socket.emit("create-document", (newId) => {
        if (newId) {
          setDocumentId(newId);
          navigate(`/doc/${newId}`, { replace: true });
          socket.emit("join-document", newId);
        } else {
          setError("Failed to create document");
          setIsLoading(false);
        }
      });
      return;
    }

    setDocumentId(normalizedId);
    socket.emit("join-document", normalizedId);

    const onLoadDocument = (docContent) => {
      setContent(docContent || "");
      setLastSavedContent(docContent || "");
      setIsLoading(false);
    };

    const onReceiveChanges = (newContent) => {
      setContent(newContent || "");
      setLastSavedContent(newContent || "");
      setSaveStatus("Saved");
    };

    socket.on("load-document", onLoadDocument);
    socket.on("receive-changes", onReceiveChanges);
    socket.on("error", (msg) => setError(msg || "Unknown error"));

    // Presence
    socket.on("users-presence", (list) => setUsers(list));
    socket.on("user-joined", (u) => setUsers(prev => [...prev, u]));
    socket.on("user-left", ({ name }) => setUsers(prev => prev.filter(x => x.name !== name)));

    return () => {
      socket.off("load-document", onLoadDocument);
      socket.off("receive-changes", onReceiveChanges);
      socket.off("error");
      socket.off("connect_error");
      socket.off("users-presence");
      socket.off("user-joined");
      socket.off("user-left");
    };
  }, [urlId, navigate]);

  // Debounced save
  useEffect(() => {
    if (!documentId || content === lastSavedContent) return;

    setSaveStatus("Saving...");

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      socket.emit("send-changes", { documentId, content });
      setLastSavedContent(content);
      setSaveStatus("Saved");
    }, DEBOUNCE_SAVE_MS);

    return () => clearTimeout(saveTimeoutRef.current);
  }, [content, documentId, lastSavedContent]);

  const handleChange = (newContent) => {
    setContent(newContent);
  };

  const copyLink = () => {
    const link = `${window.location.origin}/doc/${documentId}`;
    navigator.clipboard.writeText(link);
    alert("Link copied!");
  };

  if (isLoading) return <div style={{ padding: "40px", textAlign: "center" }}>Loading document...</div>;
  if (error) return <div style={{ padding: "40px", color: "red", textAlign: "center" }}>Error: {error}</div>;

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
          <span
            style={{
              color: saveStatus === "Saving..." ? "var(--save-saving)" : "var(--save-saved)",
              fontWeight: 500,
            }}
          >
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
          top: "120px",
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
            <div key={u.name} style={{ color: u.color || myColor, marginBottom: "6px" }}>
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