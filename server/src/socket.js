// server/src/socket.js
const pool = require("./db");
const { v4: uuidv4 } = require("uuid");

const isValidUUID = (str) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

// In-memory store: { documentId: { socketId: { name, color, position } } }
const usersInRooms = {};

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("create-document", async (callback) => {
      const id = uuidv4();

      try {
        await pool.query("INSERT INTO documents (id, content) VALUES ($1, $2)", [id, ""]);
        callback(id);
      } catch (err) {
        console.error("Create document error:", err.message);
        callback(null);
      }
    });

    socket.on("join-document", async (documentId) => {
      if (!isValidUUID(documentId)) {
        socket.emit("error", "Invalid document ID format");
        return;
      }

      socket.join(documentId);

      const userColor = `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`;
      const userName = `Guest-${Math.floor(Math.random() * 10000)}`;

      if (!usersInRooms[documentId]) {
        usersInRooms[documentId] = {};
      }

      usersInRooms[documentId][socket.id] = {
        name: userName,
        color: userColor,
        position: null,
        socketId: socket.id,
      };

      const currentUsers = Object.values(usersInRooms[documentId]);
      socket.emit("users-presence", currentUsers);

      socket.to(documentId).emit("user-joined", {
        name: userName,
        color: userColor,
        socketId: socket.id,
      });

      try {
        const result = await pool.query("SELECT content FROM documents WHERE id = $1", [documentId]);

        if (result.rows.length > 0) {
          socket.emit("load-document", result.rows[0].content);
        } else {
          socket.emit("error", "Document not found");
        }
      } catch (err) {
        console.error("Load document error:", err.message);
        socket.emit("error", "Failed to load document");
      }
    });

    socket.on("send-changes", async ({ documentId, content }) => {
      if (!isValidUUID(documentId)) {
        console.warn("Invalid documentId in send-changes:", documentId);
        return;
      }

      socket.to(documentId).emit("receive-changes", content);

      try {
        await pool.query("UPDATE documents SET content = $1 WHERE id = $2", [content, documentId]);
      } catch (err) {
        console.error("Save changes error:", err.message);
      }
    });

    socket.on("cursor-move", ({ documentId, position }) => {
      if (!isValidUUID(documentId)) return;
      if (!usersInRooms[documentId]?.[socket.id]) return;

      usersInRooms[documentId][socket.id].position = position;

      socket.to(documentId).emit("remote-cursor", {
        socketId: socket.id,
        position,
        name: usersInRooms[documentId][socket.id].name,
        color: usersInRooms[documentId][socket.id].color,
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      for (const roomId in usersInRooms) {
        if (usersInRooms[roomId][socket.id]) {
          const user = usersInRooms[roomId][socket.id];

          io.to(roomId).emit("user-left", {
            socketId: socket.id,
            name: user.name,
          });

          delete usersInRooms[roomId][socket.id];

          if (Object.keys(usersInRooms[roomId]).length === 0) {
            delete usersInRooms[roomId];
          }
        }
      }
    });
  });
};
