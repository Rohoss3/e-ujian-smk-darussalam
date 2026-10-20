import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { loadStore, saveStore } from "@/lib/data-store";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "SISWA" || user.role === "PENGAWAS") {
      return NextResponse.json({ success: false, message: "Akses ditolak: Hanya Guru & Admin." }, { status: 403 });
    }

    const store = loadStore();

    // Determine assigned subjects for this user
    let teacherMapelIds: string[] = [];
    if (user.role === "GURU") {
      const dbUser = store.users.find((u) => u.id === user.id);
      const userMapelIds = (dbUser && Array.isArray(dbUser.mapelIds)) ? dbUser.mapelIds : (Array.isArray(user.mapelIds) ? user.mapelIds : []);
      const taughtMapels = store.mataPelajaran.filter((m) => m.guruPengampuId === user.id).map((m) => m.id);
      teacherMapelIds = Array.from(new Set([...userMapelIds, ...taughtMapels]));
    } else {
      // Admin has access to all subjects
      teacherMapelIds = store.mataPelajaran.map((m) => m.id);
    }

    const mapelMap = new Map(store.mataPelajaran.map((m) => [m.id, m]));
    const guruMap = new Map(store.users.map((u) => [u.id, u]));
    const jurMap = new Map(store.jurusan.map((j) => [j.id, j]));

    // Group questions by bank
    const soalByBankMap = new Map<string, any[]>();
    for (let i = 0; i < store.soal.length; i++) {
      const s = store.soal[i];
      let list = soalByBankMap.get(s.bankSoalId);
      if (!list) {
        list = [];
        soalByBankMap.set(s.bankSoalId, list);
      }
      list.push(s);
    }

    const result = store.bankSoal.map((b) => {
      const mapel = mapelMap.get(b.mataPelajaranId);
      const rawSoal = soalByBankMap.get(b.id) || [];
      const soal = rawSoal.slice().sort((x, y) => x.nomorUrut - y.nomorUrut);
      const guru = guruMap.get(b.guruId);
      const jur = b.jurusanId ? jurMap.get(b.jurusanId) : (mapel?.jurusanId ? jurMap.get(mapel.jurusanId) : undefined);

      const isMine = user.role === "ADMIN" || b.guruId === user.id || teacherMapelIds.includes(b.mataPelajaranId);

      return {
        ...b,
        mataPelajaranNama: mapel?.nama || "Mata Pelajaran Umum",
        mataPelajaranKode: mapel?.kode || "UMUM",
        jurusanKode: jur?.kode || "UMUM",
        guruNama: guru?.name || "Guru Pengampu",
        jumlahSoal: soal.length,
        isMine,
        soal,
      };
    });

    // Sort: teacher's own bank soal first, then alphabetical
    result.sort((a, b) => {
      if (a.isMine && !b.isMine) return -1;
      if (!a.isMine && b.isMine) return 1;
      return a.judul.localeCompare(b.judul);
    });

    const allMapelList = store.mataPelajaran.map((m) => {
      const jur = m.jurusanId ? jurMap.get(m.jurusanId) : undefined;
      const isAssigned = teacherMapelIds.includes(m.id);
      return {
        id: m.id,
        kode: m.kode,
        nama: m.nama,
        jurusanKode: jur?.kode || "UMUM",
        jurusanNama: jur?.nama || "Umum",
        isAssigned,
      };
    });

    // Teacher's specific mapel list (if none specifically assigned, provide all)
    const teacherMapelList = allMapelList.filter((m) => m.isAssigned);
    const effectiveTeacherMapels = teacherMapelList.length > 0 ? teacherMapelList : allMapelList;

    return NextResponse.json(
      {
        success: true,
        bankSoal: result,
        availableMapel: allMapelList,
        teacherMapelList: effectiveTeacherMapels,
        userRole: user.role,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=4, stale-while-revalidate=8",
        },
      }
    );
  } catch (error) {
    console.error("GET Bank Soal Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat bank soal" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "SISWA" || user.role === "PENGAWAS") {
      return NextResponse.json({ success: false, message: "Akses ditolak: Hanya Guru & Admin." }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;
    const store = loadStore();

    // ACTION 1: Create a new Bank Soal (Paket Soal) for a specific Mata Pelajaran
    if (action === "create_bank") {
      const { judul, mataPelajaranId, deskripsi, tingkat } = body;

      if (!judul || !judul.trim()) {
        return NextResponse.json({ success: false, message: "Judul paket bank soal wajib diisi" }, { status: 400 });
      }

      if (!mataPelajaranId) {
        return NextResponse.json({ success: false, message: "Mata pelajaran wajib dipilih" }, { status: 400 });
      }

      const targetMapel = store.mataPelajaran.find((m) => m.id === mataPelajaranId);
      if (!targetMapel) {
        return NextResponse.json({ success: false, message: "Mata pelajaran tidak ditemukan" }, { status: 404 });
      }

      const newBank = {
        id: `bank-${targetMapel.kode.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now()}`,
        judul: judul.trim(),
        deskripsi: deskripsi ? deskripsi.trim() : `Paket Bank Soal untuk mata pelajaran ${targetMapel.nama}`,
        guruId: user.id,
        mataPelajaranId: targetMapel.id,
        jurusanId: targetMapel.jurusanId,
        tingkat: Number(tingkat) || 11,
      };

      store.bankSoal.push(newBank);
      saveStore(store);

      const jur = store.jurusan.find((j) => j.id === newBank.jurusanId);

      return NextResponse.json({
        success: true,
        message: `Paket Bank Soal "${newBank.judul}" berhasil dibuat untuk ${targetMapel.nama}`,
        bankSoal: {
          ...newBank,
          mataPelajaranNama: targetMapel.nama,
          mataPelajaranKode: targetMapel.kode,
          jurusanKode: jur?.kode || "UMUM",
          guruNama: user.name,
          jumlahSoal: 0,
          isMine: true,
          soal: [],
        },
      });
    }

    // ACTION 2: Delete a question
    if (action === "delete_soal") {
      const { soalId } = body;
      if (!soalId) {
        return NextResponse.json({ success: false, message: "ID soal wajib disertakan" }, { status: 400 });
      }
      const initialLen = store.soal.length;
      store.soal = store.soal.filter((s) => s.id !== soalId);
      if (store.soal.length === initialLen) {
        return NextResponse.json({ success: false, message: "Butir soal tidak ditemukan" }, { status: 404 });
      }
      saveStore(store);
      return NextResponse.json({ success: true, message: "Butir soal berhasil dihapus" });
    }

    // ACTION: Edit Bank Soal Package
    if (action === "edit_bank") {
      const { bankId, judul, deskripsi, tingkat } = body;
      if (!bankId) {
        return NextResponse.json({ success: false, message: "ID bank soal wajib disertakan" }, { status: 400 });
      }

      const targetBank = store.bankSoal.find((b) => b.id === bankId);
      if (!targetBank) {
        return NextResponse.json({ success: false, message: "Paket bank soal tidak ditemukan" }, { status: 404 });
      }

      if (user.role === "GURU" && targetBank.guruId && targetBank.guruId !== user.id) {
        return NextResponse.json({ success: false, message: "Anda hanya berhak mengedit paket bank soal yang Anda buat sendiri" }, { status: 403 });
      }

      if (judul && judul.trim()) targetBank.judul = judul.trim();
      if (deskripsi !== undefined) targetBank.deskripsi = deskripsi.trim();
      if (tingkat) targetBank.tingkat = Number(tingkat);

      saveStore(store);
      return NextResponse.json({
        success: true,
        message: `Paket bank soal "${targetBank.judul}" berhasil diperbarui`,
        bankSoal: targetBank,
      });
    }

    // ACTION: Delete Bank Soal Package
    if (action === "delete_bank") {
      const { bankId } = body;
      if (!bankId) {
        return NextResponse.json({ success: false, message: "ID bank soal wajib disertakan" }, { status: 400 });
      }

      const bankIndex = store.bankSoal.findIndex((b) => b.id === bankId);
      if (bankIndex === -1) {
        return NextResponse.json({ success: false, message: "Paket bank soal tidak ditemukan" }, { status: 404 });
      }

      const targetBank = store.bankSoal[bankIndex];

      if (user.role === "GURU" && targetBank.guruId && targetBank.guruId !== user.id) {
        return NextResponse.json({ success: false, message: "Anda hanya berhak menghapus paket bank soal yang Anda buat sendiri" }, { status: 403 });
      }

      // Check if any exam is using this bank soal
      const linkedExams = store.ujian.filter((u) => u.bankSoalId === bankId);
      if (linkedExams.length > 0) {
        const examNames = linkedExams.map((e) => e.judul).join(", ");
        return NextResponse.json({
          success: false,
          message: `Tidak dapat menghapus paket bank soal karena sedang digunakan oleh jadwal ujian: ${examNames}. Harap hapus jadwal ujian tersebut terlebih dahulu.`,
        }, { status: 400 });
      }

      // Remove bank soal
      store.bankSoal.splice(bankIndex, 1);
      // Remove all questions belonging to this bank
      store.soal = store.soal.filter((s) => s.bankSoalId !== bankId);

      saveStore(store);
      return NextResponse.json({
        success: true,
        message: `Paket bank soal "${targetBank.judul}" dan seluruh butir soalnya berhasil dihapus`,
      });
    }

    // ACTION: Edit Question
    if (action === "edit_soal") {
      const {
        soalId,
        tipeSoal,
        tingkatKesulitan,
        pertanyaan,
        opsiA,
        opsiB,
        opsiC,
        opsiD,
        opsiE,
        kunciJawaban,
        bobot,
      } = body;

      if (!soalId) {
        return NextResponse.json({ success: false, message: "ID soal wajib disertakan" }, { status: 400 });
      }

      const targetSoal = store.soal.find((s) => s.id === soalId);
      if (!targetSoal) {
        return NextResponse.json({ success: false, message: "Butir soal tidak ditemukan" }, { status: 404 });
      }

      if (pertanyaan !== undefined && !pertanyaan.trim()) {
        return NextResponse.json({ success: false, message: "Pertanyaan soal tidak boleh kosong" }, { status: 400 });
      }

      if (kunciJawaban !== undefined && !kunciJawaban.trim()) {
        return NextResponse.json({ success: false, message: "Kunci jawaban tidak boleh kosong" }, { status: 400 });
      }

      if (pertanyaan !== undefined) targetSoal.pertanyaan = pertanyaan.trim();
      if (tipeSoal) targetSoal.tipeSoal = tipeSoal;
      if (tingkatKesulitan) targetSoal.tingkatKesulitan = tingkatKesulitan;
      if (opsiA !== undefined) targetSoal.opsiA = opsiA.trim();
      if (opsiB !== undefined) targetSoal.opsiB = opsiB.trim();
      if (opsiC !== undefined) targetSoal.opsiC = opsiC.trim();
      if (opsiD !== undefined) targetSoal.opsiD = opsiD.trim();
      if (opsiE !== undefined) targetSoal.opsiE = opsiE.trim();
      if (kunciJawaban !== undefined) targetSoal.kunciJawaban = kunciJawaban.trim();
      if (bobot !== undefined) targetSoal.bobot = Number(bobot);

      saveStore(store);
      return NextResponse.json({
        success: true,
        message: `Butir soal #${targetSoal.nomorUrut} berhasil diperbarui`,
        soal: targetSoal,
      });
    }

    // ACTION 3: Create Question (Default or with Mapel selection)
    const {
      bankSoalId,
      mataPelajaranId,
      tipeSoal,
      tingkatKesulitan,
      pertanyaan,
      opsiA,
      opsiB,
      opsiC,
      opsiD,
      opsiE,
      kunciJawaban,
      bobot,
    } = body;

    if (!pertanyaan || !pertanyaan.trim()) {
      return NextResponse.json({ success: false, message: "Pertanyaan soal wajib diisi" }, { status: 400 });
    }

    if (!kunciJawaban || !kunciJawaban.trim()) {
      return NextResponse.json({ success: false, message: "Kunci jawaban wajib diisi" }, { status: 400 });
    }

    let targetBankId = bankSoalId;

    // If teacher selected a Mata Pelajaran instead of choosing a bankSoalId directly
    if (!targetBankId && mataPelajaranId) {
      const existingBank = store.bankSoal.find(
        (b) => b.mataPelajaranId === mataPelajaranId && (b.guruId === user.id || user.role === "ADMIN")
      ) || store.bankSoal.find((b) => b.mataPelajaranId === mataPelajaranId);

      if (existingBank) {
        targetBankId = existingBank.id;
      } else {
        // Automatically create a Bank Soal for this subject
        const targetMapel = store.mataPelajaran.find((m) => m.id === mataPelajaranId);
        const mapelNama = targetMapel?.nama || "Mata Pelajaran";
        const newBank = {
          id: `bank-${(targetMapel?.kode || "mapel").toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now()}`,
          judul: `Bank Soal ${mapelNama}`,
          deskripsi: `Kumpulan butir soal untuk mata pelajaran ${mapelNama}`,
          guruId: user.id,
          mataPelajaranId,
          jurusanId: targetMapel?.jurusanId,
          tingkat: 11,
        };
        store.bankSoal.push(newBank);
        targetBankId = newBank.id;
      }
    }

    if (!targetBankId) {
      return NextResponse.json(
        { success: false, message: "Silakan pilih Mata Pelajaran atau Bank Soal tujuan untuk soal ini" },
        { status: 400 }
      );
    }

    const existingBank = store.bankSoal.find((b) => b.id === targetBankId);
    if (!existingBank) {
      return NextResponse.json({ success: false, message: "Bank soal tujuan tidak ditemukan" }, { status: 404 });
    }

    const existingSoal = store.soal.filter((s) => s.bankSoalId === targetBankId);

    const newSoal = {
      id: `soal-${Date.now()}`,
      bankSoalId: targetBankId,
      nomorUrut: existingSoal.length + 1,
      tipeSoal: (tipeSoal || "PILIHAN_GANDA") as any,
      tingkatKesulitan: (tingkatKesulitan || "SEDANG") as any,
      pertanyaan: pertanyaan.trim(),
      opsiA: opsiA ? opsiA.trim() : "",
      opsiB: opsiB ? opsiB.trim() : "",
      opsiC: opsiC ? opsiC.trim() : "",
      opsiD: opsiD ? opsiD.trim() : "",
      opsiE: opsiE ? opsiE.trim() : "",
      kunciJawaban: kunciJawaban.trim(),
      bobot: Number(bobot) || 5,
    };

    store.soal.push(newSoal);
    saveStore(store);

    return NextResponse.json({
      success: true,
      message: `Butir soal nomor #${newSoal.nomorUrut} berhasil ditambahkan ke ${existingBank.judul}`,
      soal: newSoal,
      bankSoalId: targetBankId,
    });
  } catch (error) {
    console.error("POST Soal Error:", error);
    return NextResponse.json({ success: false, message: "Gagal memproses bank soal" }, { status: 500 });
  }
}
