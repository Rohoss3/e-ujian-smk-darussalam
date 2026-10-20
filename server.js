/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error handling request:", err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Global socket io reference
  global.io = io;

  io.on("connection", (socket) => {
    // Siswa joins exam room
    socket.on("join_ujian", ({ ujianId, pesertaId, siswaNama }) => {
      socket.join(`ujian_${ujianId}`);
      socket.join(`peserta_${pesertaId}`);
      io.to(`pengawas_${ujianId}`).emit("peserta_terhubung", {
        pesertaId,
        siswaNama,
        socketId: socket.id,
        timestamp: new Date().toISOString(),
      });
    });

    // Pengawas / Guru joins proctoring monitoring room
    socket.on("join_pengawas", ({ ujianId }) => {
      socket.join(`pengawas_${ujianId}`);
    });

    // Student sends periodic heartbeat telemetry
    socket.on("telemetri_siswa", (data) => {
      // Forward telemetry immediately to teacher room
      io.to(`pengawas_${data.ujianId}`).emit("update_telemetri", data);
    });

    // Student reports anti-cheat violation
    socket.on("lapor_pelanggaran", (data) => {
      io.to(`pengawas_${data.ujianId}`).emit("insiden_pelanggaran", {
        ...data,
        receivedAt: new Date().toISOString(),
      });
    });

    // Teacher sends warning to specific student
    socket.on("kirim_peringatan_siswa", ({ pesertaId, pesan }) => {
      io.to(`peserta_${pesertaId}`).emit("peringatan_pengawas", {
        pesan,
        timestamp: new Date().toISOString(),
      });
    });

    // Teacher forces submit / disqualification
    socket.on("paksa_kumpulkan_siswa", ({ pesertaId, alasan }) => {
      io.to(`peserta_${pesertaId}`).emit("perintah_selesai_paksa", {
        alasan,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      // Socket disconnected
    });
  });

  httpServer.listen(port, () => {
    console.log(`> SMK E-Ujian Server berjalan di http://${hostname}:${port}`);
    console.log(`> Socket.io Real-time Proctoring Engine Siap`);
  });
});
