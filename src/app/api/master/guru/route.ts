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
    let needsSave = false;

    const jurMap = new Map(store.jurusan.map((j) => [j.id, j]));
    const userMap = new Map(store.users.map((u) => [u.id, u]));
    const mapelMap = new Map(store.mataPelajaran.map((m) => [m.id, m]));

    // Group wali kelas by teacher
    const waliKelasMap = new Map<string, Array<{ id: string; nama: string }>>();
    for (const k of store.kelas) {
      if (k.waliKelasId) {
        const list = waliKelasMap.get(k.waliKelasId) || [];
        list.push({ id: k.id, nama: k.nama });
        waliKelasMap.set(k.waliKelasId, list);
      }
    }

    const guruList = store.users.filter((u) => u.role === "GURU");
    const result = guruList.map((g) => {
      if (!Array.isArray(g.mapelIds)) {
        g.mapelIds = [];
      }

      // Reconcile: If any mapel has guruPengampuId === g.id, ensure it is included in g.mapelIds
      store.mataPelajaran.forEach((m) => {
        if (m.guruPengampuId === g.id && !g.mapelIds.includes(m.id)) {
          g.mapelIds.push(m.id);
          needsSave = true;
        }
      });

      // Also ensure mapel has guruPengampuId set if g.mapelIds includes it and no one else is set
      g.mapelIds.forEach((mid) => {
        const m = mapelMap.get(mid);
        if (m && !m.guruPengampuId) {
          m.guruPengampuId = g.id;
          needsSave = true;
        }
      });

      const assignedMapel = g.mapelIds.map((mid) => mapelMap.get(mid)).filter(Boolean) as typeof store.mataPelajaran;
      const waliKelas = waliKelasMap.get(g.id) || [];

      return {
        id: g.id,
        nama: g.name,
        username: g.username,
        nip: g.nip || "-",
        email: g.email || "-",
        status: g.status || "AKTIF",
        mapelIds: g.mapelIds,
        mapelList: assignedMapel.map((m) => {
          const jur = m.jurusanId ? jurMap.get(m.jurusanId) : undefined;
          return {
            id: m.id,
            kode: m.kode,
            nama: m.nama,
            jurusanKode: jur?.kode || "UMUM",
            jurusanNama: jur?.nama || "Umum (Semua Jurusan)",
          };
        }),
        waliKelasList: waliKelas,
      };
    });

    if (needsSave) {
      saveStore(store);
    }

    const availableMapel = store.mataPelajaran.map((m) => {
      const jur = m.jurusanId ? jurMap.get(m.jurusanId) : undefined;
      const currentGuru = m.guruPengampuId ? userMap.get(m.guruPengampuId) : undefined;
      return {
        id: m.id,
        kode: m.kode,
        nama: m.nama,
        jurusanId: m.jurusanId || null,
        jurusanKode: jur?.kode || "UMUM",
        jurusanNama: jur?.nama || "Mata Pelajaran Umum (Semua Jurusan)",
        guruPengampuNama: currentGuru?.name || null,
        guruPengampuId: m.guruPengampuId || null,
      };
    });

    return NextResponse.json(
      {
        success: true,
        guru: result,
        availableMapel,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5, stale-while-revalidate=10",
        },
      }
    );
  } catch (error) {
    console.error("GET Master Guru Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat data guru" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Akses khusus Administrator" }, { status: 403 });
    }

    const body = await req.json();
    const { action, id, nama, username, nip, email, password, mapelIds } = body;

    const store = loadStore();

    if (action === "create") {
      if (!nama || !username) {
        return NextResponse.json({ success: false, message: "Nama dan username guru wajib diisi" }, { status: 400 });
      }

      const existingUser = store.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
      if (existingUser) {
        return NextResponse.json({ success: false, message: "Username sudah terdaftar" }, { status: 400 });
      }

      const hashedPassword = await hashPassword(password || "guru123");
      const assignedMapels = Array.isArray(mapelIds) ? mapelIds : [];
      const newGuru = {
        id: `usr-guru-${Date.now()}`,
        username: username.toLowerCase().replace(/\s+/g, "_"),
        password: hashedPassword,
        name: nama.trim(),
        nip: nip ? nip.trim() : undefined,
        email: email ? email.trim() : undefined,
        role: "GURU" as const,
        mapelIds: assignedMapels,
        status: "AKTIF" as const,
      };

      store.users.push(newGuru);

      // Link guru to selected mapels
      if (assignedMapels.length > 0) {
        store.mataPelajaran.forEach((m) => {
          if (assignedMapels.includes(m.id)) {
            m.guruPengampuId = newGuru.id;
          }
        });
      }

      saveStore(store);
      return NextResponse.json({ success: true, message: `Guru ${nama} berhasil ditambahkan`, guru: newGuru });
    }

    if (action === "edit") {
      const target = store.users.find((u) => u.id === id && u.role === "GURU");
      if (!target) {
        return NextResponse.json({ success: false, message: "Guru tidak ditemukan" }, { status: 404 });
      }

      target.name = nama ? nama.trim() : target.name;
      target.nip = nip !== undefined ? nip.trim() : target.nip;
      target.email = email !== undefined ? email.trim() : target.email;

      if (password && password.trim().length >= 6) {
        target.password = await hashPassword(password.trim());
      }

      if (Array.isArray(mapelIds)) {
        target.mapelIds = mapelIds;
        // Synchronize guruPengampuId in mataPelajaran
        store.mataPelajaran.forEach((m) => {
          if (mapelIds.includes(m.id)) {
            m.guruPengampuId = target.id;
          } else if (m.guruPengampuId === target.id) {
            // Find another teacher who also has this mapel if any
            const otherGuru = store.users.find((u) => u.role === "GURU" && u.id !== target.id && u.mapelIds?.includes(m.id));
            m.guruPengampuId = otherGuru ? otherGuru.id : undefined;
          }
        });
      }

      saveStore(store);
      return NextResponse.json({ success: true, message: "Data guru dan mata pelajaran diampu berhasil diperbarui", guru: target });
    }

    if (action === "toggle_status") {
      const target = store.users.find((u) => u.id === id && u.role === "GURU");
      if (!target) {
        return NextResponse.json({ success: false, message: "Guru tidak ditemukan" }, { status: 404 });
      }

      target.status = target.status === "NONAKTIF" ? "AKTIF" : "NONAKTIF";
      saveStore(store);

      return NextResponse.json({
        success: true,
        message: `Status guru ${target.name} diubah menjadi ${target.status}`,
        status: target.status,
      });
    }

    if (action === "delete") {
      const index = store.users.findIndex((u) => u.id === id && u.role === "GURU");
      if (index === -1) {
        return NextResponse.json({ success: false, message: "Guru tidak ditemukan" }, { status: 404 });
      }

      const deletedGuru = store.users[index];

      // Unassign from wali kelas if any
      store.kelas.forEach((k) => {
        if (k.waliKelasId === id) {
          delete k.waliKelasId;
        }
      });

      // Unassign from mata pelajaran
      store.mataPelajaran.forEach((m) => {
        if (m.guruPengampuId === id) {
          delete m.guruPengampuId;
        }
      });

      // Remove guru from users
      store.users.splice(index, 1);
      saveStore(store);

      return NextResponse.json({
        success: true,
        message: `Guru ${deletedGuru.name} berhasil dihapus dari sistem`,
      });
    }

    return NextResponse.json({ success: false, message: "Aksi tidak dikenal" }, { status: 400 });
  } catch (error) {
    console.error("POST Master Guru Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memproses data guru" }, { status: 500 });
  }
}
