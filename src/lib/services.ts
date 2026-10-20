import { loadStore, saveStore } from "./data-store";
import { verifyPassword, createToken } from "./auth";
import { SessionUser, UserRole, SoalTampil, ProctorTelemetryEvent, JenisPelanggaran } from "@/types";
import { shuffleArrayWithSeed } from "./utils";

export async function loginUser(username: string, passwordPlain: string, expectedRole?: UserRole) {
  const store = loadStore();
  const user = store.users.find(
    (u) =>
      u.username.toLowerCase() === username.toLowerCase() ||
      (u.nisn && u.nisn === username) ||
      (u.nip && u.nip === username)
  );

  if (!user) {
    return { success: false, message: "Username / NISN / NIP tidak terdaftar" };
  }

  if (user.status === "NONAKTIF") {
    return { success: false, message: "Akun Anda saat ini berstatus NONAKTIF. Hubungi Administrator." };
  }

  if (expectedRole && user.role !== expectedRole) {
    return {
      success: false,
      message: `Akses ditolak: Akun ini terdaftar sebagai ${user.role}, bukan ${expectedRole}. Silakan masuk melalui portal yang sesuai.`,
    };
  }

  const isValid = await verifyPassword(passwordPlain, user.password);
  if (!isValid) {
    return { success: false, message: "Kata sandi yang Anda masukkan salah" };
  }

  const kelas = store.kelas.find((k) => k.id === user.kelasId)?.nama || null;
  const jurusan = store.jurusan.find((j) => j.id === user.jurusanId)?.nama || null;

  const sessionUser: SessionUser = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    nisn: user.nisn || null,
    nip: user.nip || null,
    kelas,
    kelasId: user.kelasId || null,
    jurusan,
    jurusanId: user.jurusanId || null,
    foto: user.avatar || null,
  };

  const token = createToken(sessionUser);

  return {
    success: true,
    token,
    user: sessionUser,
  };
}

export function getJadwalUjianForUser(user: SessionUser) {
  const store = loadStore();

  if (user.role === "SISWA") {
    // Robust class matching: match by class name, class ID, or normalized name
    const studentUser = store.users.find((u) => u.id === user.id);
    const resolvedKelasId = user.kelasId || studentUser?.kelasId || "";
    const resolvedKelasObj = resolvedKelasId
      ? store.kelas.find((k) => k.id === resolvedKelasId)
      : store.kelas.find((k) => k.nama.toLowerCase() === (user.kelas || "").toLowerCase());
    const studentKelasName = (user.kelas || resolvedKelasObj?.nama || "").trim().toLowerCase();
    const studentKelasId = (resolvedKelasId || resolvedKelasObj?.id || "").trim().toLowerCase();

    // Filter exams where student's class matches target
    const exams = store.ujian.filter((u) => {
      try {
        let targets: string[] = [];
        if (Array.isArray(u.kelasTarget)) {
          targets = u.kelasTarget;
        } else if (typeof u.kelasTarget === "string") {
          try {
            const parsed = JSON.parse(u.kelasTarget);
            targets = Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            targets = u.kelasTarget.split(",").map((s) => s.trim());
          }
        }

        return targets.some((t) => {
          const tClean = (t || "").trim().toLowerCase();
          return (
            (studentKelasName && tClean === studentKelasName) ||
            (studentKelasId && tClean === studentKelasId) ||
            (resolvedKelasObj && tClean === resolvedKelasObj.nama.trim().toLowerCase()) ||
            (resolvedKelasObj && tClean === resolvedKelasObj.id.trim().toLowerCase())
          );
        });
      } catch {
        return false;
      }
    });

    return exams.map((u) => {
      const mapel = store.mataPelajaran.find((m) => m.id === u.mataPelajaranId);
      const peserta = store.pesertaUjian.find((p) => p.ujianId === u.id && p.siswaId === user.id);
      
      // Remedial status check
      let isEligibleRemedial = true;
      if (u.isRemedial && u.ujianAsliId) {
        const originalPeserta = store.pesertaUjian.find(
          (p) => p.ujianId === u.ujianAsliId && p.siswaId === user.id
        );
        isEligibleRemedial = originalPeserta?.statusKelulusan === "REMEDIAL";
      }

      // Check if this regular exam has a remedial exam created for it
      const remedialExam = store.ujian.find(
        (ru) => ru.isRemedial && ru.ujianAsliId === u.id
      );

      return {
        ...u,
        kkm: u.kkm || 75,
        isRemedial: !!u.isRemedial,
        ujianAsliId: u.ujianAsliId || null,
        isEligibleRemedial,
        mataPelajaran: mapel?.nama || "Umum",
        pesertaStatus: peserta ? peserta.status : "BELUM_MULAI",
        pesertaId: peserta ? peserta.id : null,
        totalNilai: peserta ? peserta.totalNilai : 0,
        statusKelulusan: peserta ? peserta.statusKelulusan : "BELUM_DINILAI",
        nilaiRemedial: peserta?.nilaiRemedial || null,
        remedialUjianId: remedialExam?.id || null,
        remedialToken: remedialExam?.tokenUjian || null,
      };
    });
  }

  if (user.role === "PENGAWAS") {
    // Pengawas only gets exams explicitly assigned to them
    const assigned = store.ujian.filter(
      (u) => u.pengawasId === user.id || (u.pengawasIds && u.pengawasIds.includes(user.id))
    );

    return assigned.map((u) => {
      const mapel = store.mataPelajaran.find((m) => m.id === u.mataPelajaranId);
      const guru = store.users.find((usr) => usr.id === u.guruId);
      const pesertaList = store.pesertaUjian.filter((p) => p.ujianId === u.id);
      return {
        ...u,
        kkm: u.kkm || 75,
        isRemedial: !!u.isRemedial,
        ujianAsliId: u.ujianAsliId || null,
        mataPelajaran: mapel?.nama || "Umum",
        namaGuru: guru?.name || "Guru Pengampu",
        totalPeserta: pesertaList.length,
        pesertaBelumMulai: pesertaList.filter((p) => p.status === "BELUM_MULAI").length,
        pesertaMengerjakan: pesertaList.filter((p) => p.status === "SEDANG_MENGERJAKAN").length,
        pesertaSelesai: pesertaList.filter((p) => p.status === "SELESAI").length,
        pesertaDidiskualifikasi: pesertaList.filter((p) => p.status === "DIDISKUALIFIKASI").length,
      };
    });
  }

  // Admin / Guru sees all exams or their own
  return store.ujian.map((u) => {
    const mapel = store.mataPelajaran.find((m) => m.id === u.mataPelajaranId);
    const guru = store.users.find((usr) => usr.id === u.guruId);
    const pesertaList = store.pesertaUjian.filter((p) => p.ujianId === u.id);
    return {
      ...u,
      kkm: u.kkm || 75,
      isRemedial: !!u.isRemedial,
      ujianAsliId: u.ujianAsliId || null,
      mataPelajaran: mapel?.nama || "Umum",
      namaGuru: guru?.name || "Guru Pengampu",
      totalPeserta: pesertaList.length,
      pesertaBelumMulai: pesertaList.filter((p) => p.status === "BELUM_MULAI").length,
      pesertaMengerjakan: pesertaList.filter((p) => p.status === "SEDANG_MENGERJAKAN").length,
      pesertaSelesai: pesertaList.filter((p) => p.status === "SELESAI").length,
      pesertaDidiskualifikasi: pesertaList.filter((p) => p.status === "DIDISKUALIFIKASI").length,
    };
  });
}

export function getPengawasDetailData(pengawasId: string) {
  const store = loadStore();
  const assignedExams = store.ujian.filter(
    (u) => u.pengawasId === pengawasId || (u.pengawasIds && u.pengawasIds.includes(pengawasId))
  );

  const assignedExamIds = assignedExams.map((u) => u.id);
  const participants = store.pesertaUjian
    .filter((p) => assignedExamIds.includes(p.ujianId))
    .map((p) => {
      const siswa = store.users.find((u) => u.id === p.siswaId);
      const exam = store.ujian.find((u) => u.id === p.ujianId);
      const kelas = store.kelas.find((k) => k.id === siswa?.kelasId)?.nama || siswa?.kelasId || "-";
      return {
        id: p.id,
        ujianId: p.ujianId,
        judulUjian: exam?.judul || "Ujian",
        kodeUjian: exam?.kodeUjian || "-",
        siswaId: p.siswaId,
        namaSiswa: siswa?.name || "Siswa",
        nisn: siswa?.nisn || siswa?.username || "-",
        kelas,
        status: p.status,
        sisaWaktuDetik: p.sisaWaktuDetik,
        durasiMenit: exam?.durasiMenit || 60,
        jumlahPelanggaran: p.jumlahPelanggaran,
        waktuMulai: p.waktuMulai || null,
        waktuSelesai: p.waktuSelesai || null,
        deviceFingerprint: p.deviceFingerprint || null,
      };
    });

  const participantIds = participants.map((p) => p.id);
  const violations = store.logPelanggaran
    .filter((v) => participantIds.includes(v.pesertaUjianId))
    .map((v) => {
      const p = participants.find((item) => item.id === v.pesertaUjianId);
      return {
        ...v,
        namaSiswa: p?.namaSiswa || "Siswa",
        kelas: p?.kelas || "-",
        judulUjian: p?.judulUjian || "Ujian",
      };
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    assignedExams: assignedExams.map((u) => {
      const mapel = store.mataPelajaran.find((m) => m.id === u.mataPelajaranId);
      const guru = store.users.find((usr) => usr.id === u.guruId);
      const examPeserta = participants.filter((p) => p.ujianId === u.id);
      return {
        ...u,
        mataPelajaran: mapel?.nama || "Umum",
        namaGuru: guru?.name || "Guru Pengampu",
        totalPeserta: examPeserta.length,
        pesertaBelumMulai: examPeserta.filter((p) => p.status === "BELUM_MULAI").length,
        pesertaMengerjakan: examPeserta.filter((p) => p.status === "SEDANG_MENGERJAKAN").length,
        pesertaSelesai: examPeserta.filter((p) => p.status === "SELESAI").length,
        pesertaDidiskualifikasi: examPeserta.filter((p) => p.status === "DIDISKUALIFIKASI").length,
      };
    }),
    participants,
    violations,
  };
}

export function verifikasiTokenUjian(ujianId: string, tokenInput: string) {
  const store = loadStore();
  const ujian = store.ujian.find((u) => u.id === ujianId);
  if (!ujian) return { valid: false, message: "Jadwal ujian tidak ditemukan." };

  if (ujian.tokenUjian.trim().toUpperCase() !== tokenInput.trim().toUpperCase()) {
    return { valid: false, message: "Token ujian yang Anda masukkan tidak valid." };
  }

  return { valid: true, ujian };
}

export function mulaiPengerjaanUjian(ujianId: string, siswaId: string) {
  const store = loadStore();
  const ujian = store.ujian.find((u) => u.id === ujianId);
  if (!ujian) throw new Error("Ujian tidak ditemukan");

  // Validasi Remedial Ketat: Siswa non-remedial tidak bisa mengakses ujian remedial
  if (ujian.isRemedial) {
    if (!ujian.ujianAsliId) {
      throw new Error("Konfigurasi sesi remedial tidak valid (ID ujian utama tidak ditemukan).");
    }
    const originalPeserta = store.pesertaUjian.find(
      (p) => p.ujianId === ujian.ujianAsliId && p.siswaId === siswaId
    );
    if (!originalPeserta) {
      throw new Error(
        "Akses Ditolak: Anda belum pernah mengikuti ujian utama. Hanya siswa dengan status REMEDIAL yang berhak mengikuti remedial."
      );
    }
    if (originalPeserta.statusKelulusan === "LULUS") {
      throw new Error(
        "Akses Ditolak: Anda telah dinyatakan LULUS pada ujian utama. Ujian remedial hanya diperuntukkan bagi siswa yang belum mencapai KKM."
      );
    }
    if (originalPeserta.statusKelulusan !== "REMEDIAL") {
      throw new Error(
        "Akses Ditolak: Status kelulusan ujian utama Anda belum memenuhi kriteria remedial."
      );
    }
  }

  let peserta = store.pesertaUjian.find((p) => p.ujianId === ujianId && p.siswaId === siswaId);

  const now = new Date().toISOString();

  if (!peserta) {
    peserta = {
      id: `peserta-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ujianId,
      siswaId,
      status: "SEDANG_MENGERJAKAN",
      waktuMulai: now,
      sisaWaktuDetik: ujian.durasiMenit * 60,
      jumlahPelanggaran: 0,
      seedAcak: Math.floor(Math.random() * 90000) + 10000,
      nilaiPG: 0,
      nilaiEssay: 0,
      totalNilai: 0,
      statusKelulusan: "BELUM_DINILAI",
    };
    store.pesertaUjian.push(peserta);
    saveStore(store);
  } else {
    if (peserta.status === "BELUM_MULAI") {
      peserta.status = "SEDANG_MENGERJAKAN";
      peserta.waktuMulai = now;
      saveStore(store);
    }
  }

  return peserta;
}

export function getSoalForSiswa(ujianId: string, pesertaId: string): SoalTampil[] {
  const store = loadStore();
  const ujian = store.ujian.find((u) => u.id === ujianId);
  const peserta = store.pesertaUjian.find((p) => p.id === pesertaId);

  if (!ujian || !peserta) return [];

  const rawSoal = store.soal.filter((s) => s.bankSoalId === ujian.bankSoalId);

  // Deterministic shuffle of questions per student seed
  let orderedSoal = [...rawSoal];
  if (ujian.acakSoal) {
    orderedSoal = shuffleArrayWithSeed(orderedSoal, peserta.seedAcak);
  }

  // Transform into client-safe questions with shuffled options A-E
  const clientSoal: SoalTampil[] = orderedSoal.map((s, index) => {
    let opsiList: { label: "A" | "B" | "C" | "D" | "E"; text: string; originalKey: "A" | "B" | "C" | "D" | "E" }[] = [];

    if (s.tipeSoal === "PILIHAN_GANDA") {
      const rawOptions: { key: "A" | "B" | "C" | "D" | "E"; text: string }[] = [
        { key: "A", text: s.opsiA || "" },
        { key: "B", text: s.opsiB || "" },
        { key: "C", text: s.opsiC || "" },
        { key: "D", text: s.opsiD || "" },
        { key: "E", text: s.opsiE || "" },
      ].filter((o) => o.text.trim().length > 0) as { key: "A" | "B" | "C" | "D" | "E"; text: string }[];

      let shuffled = [...rawOptions];
      if (ujian.acakOpsi) {
        // Shuffle options using student seed combined with question order
        shuffled = shuffleArrayWithSeed(shuffled, peserta.seedAcak + index * 17);
      }

      const labels: ("A" | "B" | "C" | "D" | "E")[] = ["A", "B", "C", "D", "E"];
      opsiList = shuffled.map((opt, i) => ({
        label: labels[i],
        text: opt.text,
        originalKey: opt.key,
      }));
    }

    return {
      id: s.id,
      nomorUrut: index + 1,
      tipeSoal: s.tipeSoal,
      tingkatKesulitan: s.tingkatKesulitan || "SEDANG",
      pertanyaan: s.pertanyaan,
      gambarUrl: s.gambarUrl,
      opsi: opsiList,
      bobot: s.bobot,
    };
  });

  return clientSoal;
}

export function getJawabanSiswa(pesertaId: string) {
  const store = loadStore();
  return store.jawabanSiswa.filter((j) => j.pesertaUjianId === pesertaId);
}

export function simpanJawabanSiswa(
  pesertaId: string,
  soalId: string,
  jawabanPG?: string,
  jawabanEssay?: string,
  raguRagu?: boolean
) {
  const store = loadStore();
  const peserta = store.pesertaUjian.find((p) => p.id === pesertaId);
  if (!peserta) throw new Error("Peserta tidak ditemukan");
  if (peserta.status !== "SEDANG_MENGERJAKAN") {
    throw new Error("Ujian telah berakhir atau terkunci.");
  }

  let jawaban = store.jawabanSiswa.find((j) => j.pesertaUjianId === pesertaId && j.soalId === soalId);

  const now = new Date().toISOString();

  if (!jawaban) {
    jawaban = {
      id: `jwb-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      pesertaUjianId: pesertaId,
      soalId,
      jawabanPG,
      jawabanEssay,
      raguRagu: raguRagu || false,
      nilaiDidapat: 0,
      updatedAt: now,
    };
    store.jawabanSiswa.push(jawaban);
  } else {
    if (jawabanPG !== undefined) jawaban.jawabanPG = jawabanPG;
    if (jawabanEssay !== undefined) jawaban.jawabanEssay = jawabanEssay;
    if (raguRagu !== undefined) jawaban.raguRagu = raguRagu;
    jawaban.updatedAt = now;
  }

  saveStore(store);
  return jawaban;
}

export function catatPelanggaranAntiCheat(
  pesertaId: string,
  jenis: JenisPelanggaran,
  deskripsi: string,
  snapshotFoto?: string
) {
  const store = loadStore();
  const peserta = store.pesertaUjian.find((p) => p.id === pesertaId);
  if (!peserta) throw new Error("Peserta tidak ditemukan");

  const ujian = store.ujian.find((u) => u.id === peserta.ujianId);
  const maxViolations = ujian?.maxPelanggaran || 3;

  peserta.jumlahPelanggaran += 1;

  const log = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    pesertaUjianId: pesertaId,
    jenisPelanggaran: jenis,
    deskripsi,
    snapshotFoto,
    timestamp: new Date().toISOString(),
  };

  store.logPelanggaran.push(log);

  let isAutoSubmitted = false;
  let isDisqualified = false;

  if (peserta.jumlahPelanggaran >= maxViolations) {
    peserta.status = "DIDISKUALIFIKASI";
    peserta.catatanPengawas = `Diskualifikasi otomatis: Melebihi batas toleransi pelanggaran (${peserta.jumlahPelanggaran}/${maxViolations}).`;
    isDisqualified = true;
    selesaikanUjianOtomatis(peserta.id, store);
  }

  saveStore(store);

  return {
    jumlahPelanggaran: peserta.jumlahPelanggaran,
    maxPelanggaran: maxViolations,
    isDisqualified,
    isAutoSubmitted,
    log,
  };
}

function selesaikanUjianOtomatis(pesertaId: string, store: ReturnType<typeof loadStore>) {
  const peserta = store.pesertaUjian.find((p) => p.id === pesertaId);
  if (!peserta) return;

  const ujian = store.ujian.find((u) => u.id === peserta.ujianId);
  if (!ujian) return;

  const soalList = store.soal.filter((s) => s.bankSoalId === ujian.bankSoalId);
  const jawabanList = store.jawabanSiswa.filter((j) => j.pesertaUjianId === pesertaId);

  let pgScore = 0;
  let pgTotalWeight = 0;

  soalList.forEach((s) => {
    if (s.tipeSoal === "PILIHAN_GANDA") {
      pgTotalWeight += s.bobot;
      const jwb = jawabanList.find((j) => j.soalId === s.id);
      if (jwb && jwb.jawabanPG === s.kunciJawaban) {
        jwb.isCorrect = true;
        jwb.nilaiDidapat = s.bobot;
        pgScore += s.bobot;
      } else if (jwb) {
        jwb.isCorrect = false;
        jwb.nilaiDidapat = 0;
      }
    }
  });

  peserta.nilaiPG = pgScore;
  peserta.totalNilai = pgScore + (peserta.nilaiEssay || 0);
  peserta.waktuSelesai = new Date().toISOString();
  peserta.sisaWaktuDetik = 0;

  const mapel = store.mataPelajaran.find((m) => m.id === ujian.mataPelajaranId);
  const kkm = ujian.kkm ?? mapel?.kkm ?? 75;
  const hasEssay = soalList.some((s) => s.tipeSoal === "ESSAY");

  if (peserta.status !== "DIDISKUALIFIKASI") {
    peserta.status = "SELESAI";
    const hasUncheckedEssay = hasEssay && jawabanList.some((j) => j.jawabanEssay && !j.feedbackEssay && j.nilaiDidapat === 0);
    if (hasUncheckedEssay && (peserta.nilaiEssay === 0 || peserta.nilaiEssay === undefined)) {
      peserta.statusKelulusan = "BELUM_DINILAI";
    } else {
      peserta.statusKelulusan = peserta.totalNilai >= kkm ? "LULUS" : "REMEDIAL";
    }
  } else {
    peserta.statusKelulusan = "REMEDIAL";
  }

  // Jika merupakan sesi remedial, catat nilai remedial
  if (ujian.isRemedial) {
    peserta.nilaiRemedial = peserta.totalNilai;
    if (ujian.ujianAsliId) {
      const originalSession = store.pesertaUjian.find(
        (p) => p.ujianId === ujian.ujianAsliId && p.siswaId === peserta.siswaId
      );
      if (originalSession) {
        originalSession.nilaiRemedial = peserta.totalNilai;
      }
    }
  }
}

export function selesaikanUjianManual(pesertaId: string) {
  const store = loadStore();
  selesaikanUjianOtomatis(pesertaId, store);
  saveStore(store, true);
  const peserta = store.pesertaUjian.find((p) => p.id === pesertaId);
  return peserta;
}

export function updateHeartbeatSiswa(pesertaId: string, sisaWaktuDetik: number) {
  const store = loadStore();
  const peserta = store.pesertaUjian.find((p) => p.id === pesertaId);
  if (!peserta) return null;

  peserta.sisaWaktuDetik = sisaWaktuDetik;

  if (sisaWaktuDetik <= 0 && peserta.status === "SEDANG_MENGERJAKAN") {
    selesaikanUjianOtomatis(pesertaId, store);
    saveStore(store, true);
  } else {
    saveStore(store, false);
  }

  return peserta;
}

export function getProctoringMonitoringData(ujianId: string): ProctorTelemetryEvent[] {
  const store = loadStore();
  const ujian = store.ujian.find((u) => u.id === ujianId);
  if (!ujian) return [];

  const soalCount = store.soal.filter((s) => s.bankSoalId === ujian.bankSoalId).length;
  const pesertaList = store.pesertaUjian.filter((p) => p.ujianId === ujianId);

  // Pre-index lookups
  const userMap = new Map(store.users.map((u) => [u.id, u]));
  const kelasMap = new Map(store.kelas.map((k) => [k.id, k]));

  // Pre-index answered questions count per peserta
  const answersCountMap = new Map<string, number>();
  for (let i = 0; i < store.jawabanSiswa.length; i++) {
    const j = store.jawabanSiswa[i];
    if (j.jawabanPG || j.jawabanEssay) {
      answersCountMap.set(j.pesertaUjianId, (answersCountMap.get(j.pesertaUjianId) || 0) + 1);
    }
  }

  // Pre-index last log per peserta
  const lastLogMap = new Map<string, any>();
  for (let i = 0; i < store.logPelanggaran.length; i++) {
    const l = store.logPelanggaran[i];
    lastLogMap.set(l.pesertaUjianId, l);
  }

  return pesertaList.map((p) => {
    const siswa = userMap.get(p.siswaId);
    const kelas = (siswa?.kelasId ? kelasMap.get(siswa.kelasId)?.nama : undefined) || "SMK";
    const answeredCount = answersCountMap.get(p.id) || 0;
    const lastLog = lastLogMap.get(p.id);

    return {
      pesertaUjianId: p.id,
      ujianId,
      siswaId: p.siswaId,
      siswaNama: siswa?.name || "Siswa",
      kelompokKelas: kelas,
      status: p.status,
      sisaWaktuDetik: p.sisaWaktuDetik,
      jumlahPelanggaran: p.jumlahPelanggaran,
      nomorAktif: answeredCount > 0 ? answeredCount : 1,
      totalSoal: soalCount,
      terjawab: answeredCount,
      lastSnapshot: lastLog?.snapshotFoto,
      lastViolation: lastLog
        ? {
            jenis: lastLog.jenisPelanggaran as JenisPelanggaran,
            deskripsi: lastLog.deskripsi,
            timestamp: lastLog.timestamp,
          }
        : undefined,
    };
  });
}
