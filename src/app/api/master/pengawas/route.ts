import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { loadStore, saveStore } from "@/lib/data-store";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses khusus Administrator" }, { status: 403 });
    }

    const store = loadStore();

    const pengawasList = store.users.filter((u) => u.role === "PENGAWAS");
    const result = pengawasList.map((p) => {
      const assignedExams = store.ujian.filter(
        (u) => u.pengawasId === p.id || (u.pengawasIds && u.pengawasIds.includes(p.id))
      );

      return {
        id: p.id,
        nama: p.name,
        username: p.username,
        nip: p.nip || "-",
        email: p.email || "-",
        status: p.status || "AKTIF",
        assignedExamIds: assignedExams.map((u) => u.id),
        assignedExams: assignedExams.map((u) => ({
          id: u.id,
          judul: u.judul,
          kodeUjian: u.kodeUjian,
          status: u.status,
        })),
      };
    });

    const availableExams = store.ujian.map((u) => {
      const mapel = store.mataPelajaran.find((m) => m.id === u.mataPelajaranId);
      return {
        id: u.id,
        judul: u.judul,
        kodeUjian: u.kodeUjian,
        status: u.status,
        mataPelajaran: mapel?.nama || "Umum",
        currentPengawasId: u.pengawasId || null,
      };
    });

    return NextResponse.json({
      success: true,
      pengawas: result,
      availableExams,
    });
  } catch (error) {
    console.error("GET Master Pengawas Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat data pengawas" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses khusus Administrator" }, { status: 403 });
    }

    const body = await req.json();
    const { action, id, nama, username, nip, email, password } = body;
    const examIds = body.examIds || body.assignedExamIds;

    const store = loadStore();

    if (action === "create") {
      if (!nama || !username || !password) {
        return NextResponse.json(
          { success: false, message: "Nama, username, dan password pengawas wajib diisi" },
          { status: 400 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { success: false, message: "Password minimal 6 karakter demi keamanan" },
          { status: 400 }
        );
      }

      const existingUser = store.users.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase()
      );
      if (existingUser) {
        return NextResponse.json({ success: false, message: "Username sudah digunakan" }, { status: 400 });
      }

      const hashedPassword = await hashPassword(password);
      const newPengawas = {
        id: `usr-pengawas-${Date.now()}`,
        username: username.trim().toLowerCase().replace(/\s+/g, "_"),
        password: hashedPassword,
        name: nama.trim(),
        nip: nip ? nip.trim() : undefined,
        email: email ? email.trim() : undefined,
        role: "PENGAWAS" as const,
        status: "AKTIF" as const,
      };

      store.users.push(newPengawas);

      // Link pengawas to selected exams if any
      if (Array.isArray(examIds) && examIds.length > 0) {
        store.ujian.forEach((u) => {
          if (examIds.includes(u.id)) {
            u.pengawasId = newPengawas.id;
            if (!u.pengawasIds) u.pengawasIds = [];
            if (!u.pengawasIds.includes(newPengawas.id)) {
              u.pengawasIds.push(newPengawas.id);
            }
          }
        });
      }

      saveStore(store);
      return NextResponse.json({
        success: true,
        message: `Akun Pengawas ${nama} berhasil dibuat secara aman`,
        pengawas: {
          id: newPengawas.id,
          username: newPengawas.username,
          nama: newPengawas.name,
          role: newPengawas.role,
        },
      });
    }

    if (action === "edit") {
      const target = store.users.find((u) => u.id === id && u.role === "PENGAWAS");
      if (!target) {
        return NextResponse.json({ success: false, message: "Pengawas tidak ditemukan" }, { status: 404 });
      }

      target.name = nama ? nama.trim() : target.name;
      target.nip = nip !== undefined ? nip.trim() : target.nip;
      target.email = email !== undefined ? email.trim() : target.email;

      // Update password only if provided
      if (password && password.trim().length >= 6) {
        target.password = await hashPassword(password.trim());
      }

      // Update assigned exams
      if (Array.isArray(examIds)) {
        store.ujian.forEach((u) => {
          if (examIds.includes(u.id)) {
            u.pengawasId = target.id;
            if (!u.pengawasIds) u.pengawasIds = [];
            if (!u.pengawasIds.includes(target.id)) {
              u.pengawasIds.push(target.id);
            }
          } else {
            if (u.pengawasId === target.id) {
              delete u.pengawasId;
            }
            if (u.pengawasIds) {
              u.pengawasIds = u.pengawasIds.filter((pid) => pid !== target.id);
            }
          }
        });
      }

      saveStore(store);
      return NextResponse.json({
        success: true,
        message: `Data pengawas ${target.name} berhasil diperbarui`,
        pengawas: target,
      });
    }

    if (action === "toggle_status") {
      const target = store.users.find((u) => u.id === id && u.role === "PENGAWAS");
      if (!target) {
        return NextResponse.json({ success: false, message: "Pengawas tidak ditemukan" }, { status: 404 });
      }

      target.status = target.status === "NONAKTIF" ? "AKTIF" : "NONAKTIF";
      saveStore(store);

      return NextResponse.json({
        success: true,
        message: `Status akun pengawas ${target.name} diubah menjadi ${target.status}`,
        status: target.status,
      });
    }

    if (action === "delete") {
      const index = store.users.findIndex((u) => u.id === id && u.role === "PENGAWAS");
      if (index === -1) {
        return NextResponse.json({ success: false, message: "Pengawas tidak ditemukan" }, { status: 404 });
      }

      const deletedName = store.users[index].name;
      store.users.splice(index, 1);

      // Unassign from all exams
      store.ujian.forEach((u) => {
        if (u.pengawasId === id) {
          delete u.pengawasId;
        }
        if (u.pengawasIds) {
          u.pengawasIds = u.pengawasIds.filter((pid) => pid !== id);
        }
      });

      saveStore(store);
      return NextResponse.json({
        success: true,
        message: `Akun pengawas ${deletedName} berhasil dihapus`,
      });
    }

    return NextResponse.json({ success: false, message: "Aksi tidak dikenal" }, { status: 400 });
  } catch (error) {
    console.error("POST Master Pengawas Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memproses data pengawas" }, { status: 500 });
  }
}
