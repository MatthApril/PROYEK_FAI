// js/ai/minimax.js

let totalNodeDievaluasi = 0;
// CACHE EVALUASI: Menyimpan hasil evaluasi board yang sudah pernah dihitung agar tidak dihitung ulang
const evaluasiCache = new Map();

function jalankanAI() {
  console.log("AI is thinking...");
  aiSedangBerpikir = true;

  const elemenToggle = document.getElementById("toggleAlphaBeta");
  const elemenDepth = document.getElementById("inputDepth");
  const gunakanAlphaBeta = elemenToggle ? elemenToggle.checked : true;
  let depth = elemenDepth ? parseInt(elemenDepth.value) : 4;

  aiTimeoutId = setTimeout(() => {
    const langkahLegal = ambilLangkahLegalSimulasi(gameState.board, aiColor);

    if (langkahLegal.length === 0) {
      akhiriGame("AI tidak memiliki langkah legal. White wins!");
      aiSedangBerpikir = false;
      aiTimeoutId = null;
      return;
    }

    // // PRIORITAS 1 & 2: Short-circuiting untuk Igo Langsung
    // const igoLangsungAI = cariLangkahIgoLangsung(gameState.board, aiColor);
    // if (igoLangsungAI) {
    //   aiSedangBerpikir = false;
    //   handleKlikKotak(igoLangsungAI.row, igoLangsungAI.col, true);
    //   return;
    // }

    // const igoLangsungHuman = cariLangkahIgoLangsung(
    //   gameState.board,
    //   humanColor,
    // );
    // if (
    //   igoLangsungHuman &&
    //   apakahLangkahLegalUntukBoard(
    //     gameState.board,
    //     igoLangsungHuman.row,
    //     igoLangsungHuman.col,
    //     aiColor,
    //   )
    // ) {
    //   aiSedangBerpikir = false;

    //   console.log("not working")
    //   handleKlikKotak(igoLangsungHuman.row, igoLangsungHuman.col, true);
    //   return;
    // }

    let langkahTerbaik = null;
    let skorTerbaik = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;

    const waktuMulai = performance.now();
    totalNodeDievaluasi = 0;
    evaluasiCache.clear(); // Bersihkan cache di setiap turn baru AI

    // === OPTIMASI MOVE ORDERING LEVEL UTAMA ===
    urutkanLangkah(gameState.board, langkahLegal, aiColor);

    const boardPencarian = cloneBoardFast(gameState.board);

    for (let i = 0; i < langkahLegal.length; i++) {
      const langkah = langkahLegal[i];

      const backupCell = boardPencarian[langkah.row][langkah.col];
      const dataYugo = jalankanLangkahInPlace(
        boardPencarian,
        langkah.row,
        langkah.col,
        aiColor,
      );

      if (dataYugo.ilegal) {
        boardPencarian[langkah.row][langkah.col] = backupCell;
        langkah.skorAkhir = -Infinity;
        continue;
      }

      let skor;
      if (gunakanAlphaBeta) {
        skor = minimaxAlphaBeta(boardPencarian, depth - 1, alpha, beta, false);
        alpha = Math.max(alpha, skor);
      } else {
        skor = minimaxMurni(boardPencarian, depth - 1, false);
      }

      langkah.skorAkhir = skor;

      kembalikanLangkahInPlace(
        boardPencarian,
        langkah.row,
        langkah.col,
        backupCell,
        dataYugo,
        aiColor,
      );

      if (skor > skorTerbaik) {
        skorTerbaik = skor;
        langkahTerbaik = langkah;
      } else if (skor === skorTerbaik && langkahTerbaik !== null) {
        if (
          nilaiKontrolTengah(langkah.row, langkah.col) >
          nilaiKontrolTengah(langkahTerbaik.row, langkahTerbaik.col)
        ) {
          langkahTerbaik = langkah;
        }
      }
    }

    const waktuSelesai = performance.now();
    const durasiBerpikir = waktuSelesai - waktuMulai;
    const namaAlgoritma = gunakanAlphaBeta ? "Alpha-Beta" : "Pure Minimax";

    // === PROSES FILTRASI & GENERASI STRING TOP 3 RANKING ===
    // Urutkan kloning langkahLegal berdasarkan skor tertinggi (descending)
    const daftarTopLangkah = [...langkahLegal]
      .filter((l) => l.skorAkhir !== undefined && l.skorAkhir !== -Infinity)
      .sort((a, b) => b.skorAkhir - a.skorAkhir);

    let stringTop3 = "";
    const limitTop = Math.min(3, daftarTopLangkah.length);

    for (let i = 0; i < limitTop; i++) {
      const l = daftarTopLangkah[i];
      const namaBaris = 8 - l.row;
      const namaKolom = indeksKeHuruf[l.col];

      stringTop3 += `Top ${i + 1}: ${namaKolom}${namaBaris} (${l.skorAkhir})`;
      if (i < limitTop - 1) stringTop3 += " | ";
    }

    console.log(
      `[${namaAlgoritma}] Depth: ${depth} | Node: ${totalNodeDievaluasi} | Waktu: ${durasiBerpikir.toFixed(2)} ms | Skor -> [ ${stringTop3} ]`,
    );

    aiSedangBerpikir = false;
    aiTimeoutId = null;

    if (langkahTerbaik) {
      handleKlikKotak(langkahTerbaik.row, langkahTerbaik.col, true);
    } else {
      handleKlikKotak(langkahLegal[0].row, langkahLegal[0].col, true); // Fallback
    }
  }, 100);
}

// ==========================================
// ALGORITMA PENCARIAN (MINIMAX)
// ==========================================

function minimaxAlphaBeta(board, depth, alpha, beta, isMaximizing) {
  totalNodeDievaluasi++;

  if (deteksiIgo(board, aiColor)) return HEURISTIC_WEIGHTS.WIN_IGO + depth;
  if (deteksiIgo(board, humanColor)) return HEURISTIC_WEIGHTS.LOSE_IGO - depth;

  if (depth === 0) {
    // CACHING LOGIC: Generate string key unik untuk posisi board saat ini
    const key = dapatkanPapanKeyString(board);
    if (evaluasiCache.has(key)) return evaluasiCache.get(key);

    const score = evaluasiBoard(board);
    evaluasiCache.set(key, score);
    return score;
  }

  const colorSekarang = isMaximizing ? aiColor : humanColor;
  const langkahLegal = ambilLangkahLegalSimulasi(board, colorSekarang);
  if (langkahLegal.length === 0) return evaluasiBoard(board);

  // Panggil fungsi Move Ordering berkinerja tinggi
  urutkanLangkah(board, langkahLegal, colorSekarang);

  if (isMaximizing) {
    let skorTerbaik = -Infinity;
    for (let i = 0; i < langkahLegal.length; i++) {
      const boardSimulasi = cloneBoard(board);
      if (
        !jalankanLangkahSimulasi(
          boardSimulasi,
          langkahLegal[i].row,
          langkahLegal[i].col,
          colorSekarang,
        )
      )
        continue;

      const skor = minimaxAlphaBeta(
        boardSimulasi,
        depth - 1,
        alpha,
        beta,
        false,
      );
      skorTerbaik = Math.max(skorTerbaik, skor);
      alpha = Math.max(alpha, skorTerbaik);
      if (beta <= alpha) break;
    }
    return skorTerbaik;
  } else {
    let skorTerbaik = Infinity;
    for (let i = 0; i < langkahLegal.length; i++) {
      const boardSimulasi = cloneBoard(board);
      if (
        !jalankanLangkahSimulasi(
          boardSimulasi,
          langkahLegal[i].row,
          langkahLegal[i].col,
          colorSekarang,
        )
      )
        continue;

      const skor = minimaxAlphaBeta(
        boardSimulasi,
        depth - 1,
        alpha,
        beta,
        true,
      );
      skorTerbaik = Math.min(skorTerbaik, skor);
      beta = Math.min(beta, skorTerbaik);
      if (beta <= alpha) break;
    }
    return skorTerbaik;
  }
}

// === ULTRAPASTE KEY GENERATOR UNTUK CACHE ===
function dapatkanPapanKeyString(board) {
  let key = "";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (cell === null) {
        key += "O";
      } else {
        key +=
          (cell.color === "white" ? "W" : "B") +
          (cell.isYugo ? cell.jumlahArahYugo : "M");
      }
    }
  }
  return key;
}

// === FUNGSI LOGIKA MEKANIK IN-PLACE MODIFICATION ===
function jalankanLangkahInPlace(board, row, col, color) {
  if (!apakahLangkahLegalUntukBoard(board, row, col, color)) {
    return { ilegal: true };
  }

  board[row][col] = {
    color: color,
    isYugo: false,
    jumlahArahYugo: 0,
    migosTerhapus: [],
  };

  const hasilYugo = cekYugoSimulasi(board, row, col, color);
  let backupMigosData = [];

  if (hasilYugo.terbentukYugo) {
    board[row][col].isYugo = true;
    board[row][col].jumlahArahYugo = hasilYugo.jumlahArahYugo;

    let jenisBentuk = "standar";
    if (hasilYugo.jumlahArahYugo === 2) jenisBentuk = "oval";
    else if (hasilYugo.jumlahArahYugo === 3) jenisBentuk = "segitiga";
    else if (hasilYugo.jumlahArahYugo === 4) jenisBentuk = "persegi";
    board[row][col].jenisYugo = jenisBentuk;

    const len = hasilYugo.migosTerhapus.length;
    for (let i = 0; i < len; i++) {
      const migo = hasilYugo.migosTerhapus[i];
      // Simpan data kepingan Migo asli sebelum dihapus (ledakan Yugo) untuk keperluan pemulihan kembali
      backupMigosData.push({
        r: migo.r,
        c: migo.c,
        data: board[migo.r][migo.c],
      });
      board[migo.r][migo.c] = null;
    }
  }

  return {
    ilegal: false,
    terbentukYugo: hasilYugo.terbentukYugo,
    migosYangDihapus: backupMigosData,
  };
}

// === FUNGSI UNDO LOGIKA IN-PLACE (RESTORASI DATA) ===
function kembalikanLangkahInPlace(
  board,
  row,
  col,
  backupCell,
  dataYugo,
  color,
) {
  if (dataYugo.terbentukYugo) {
    const len = dataYugo.migosYangDihapus.length;
    for (let i = 0; i < len; i++) {
      const item = dataYugo.migosYangDihapus[i];
      board[item.r][item.c] = item.data; // Pulihkan kembali Migo biasa yang meledak
    }
  }
  board[row][col] = backupCell; // Kosongkan/kembalikan koordinat penempatan utama
}

// === FUNGSI UTAMA MEMPERCEPAT PRUNING: HIGH-PERFORMANCE MOVE ORDERING ===
function urutkanLangkah(board, langkahLegal, colorSekarang) {
  // Hitung perkiraan bobot murah secara instan tanpa melakukan kloning penuh di dalam loop
  for (let i = 0; i < langkahLegal.length; i++) {
    const langkah = langkahLegal[i];
    let bobot = 0;

    // Prioritas Tinggi: Langkah yang langsung menghasilkan Yugo
    if (
      apakahMembentukYugoUntukBoard(
        board,
        langkah.row,
        langkah.col,
        colorSekarang,
      )
    ) {
      bobot += 5000;
    }

    bobot += nilaiKontrolTengah(langkah.row, langkah.col) * 10;

    langkah.bobotEvaluasi = bobot;
  }

  langkahLegal.sort((a, b) => b.bobotEvaluasi - a.bobotEvaluasi);
}

function minimaxMurni(board, depth, isMaximizing) {
  totalNodeDievaluasi++;

  if (deteksiIgo(board, aiColor)) return HEURISTIC_WEIGHTS.WIN_IGO + depth;
  if (deteksiIgo(board, humanColor)) return HEURISTIC_WEIGHTS.LOSE_IGO - depth;

  if (depth === 0) {
    return evaluasiBoard(board);
  }

  const colorSekarang = isMaximizing ? aiColor : humanColor;
  const langkahLegal = ambilLangkahLegalSimulasi(board, colorSekarang);

  if (langkahLegal.length === 0) {
    return evaluasiBoard(board);
  }

  if (isMaximizing) {
    let skorTerbaik = -Infinity;
    for (let i = 0; i < langkahLegal.length; i++) {
      const langkah = langkahLegal[i];
      const boardSimulasi = cloneBoard(board);
      const sukses = jalankanLangkahSimulasi(
        // shannon ubah
        boardSimulasi,
        langkah.row,
        langkah.col,
        colorSekarang,
      );

      if (!sukses) continue;
      const skor = minimaxMurni(boardSimulasi, depth - 1, false);
      skorTerbaik = Math.max(skorTerbaik, skor);
    }
    return skorTerbaik;
  } else {
    let skorTerbaik = Infinity;
    for (let i = 0; i < langkahLegal.length; i++) {
      const langkah = langkahLegal[i];
      const boardSimulasi = cloneBoard(board);
      const sukses = jalankanLangkahSimulasi(
        // shannon ubah
        boardSimulasi,
        langkah.row,
        langkah.col,
        colorSekarang,
      );

      if (!sukses) continue;

      const skor = minimaxMurni(boardSimulasi, depth - 1, true);
      skorTerbaik = Math.min(skorTerbaik, skor);
    }
    return skorTerbaik;
  }
}

function cloneBoardFast(board) {
  const newBoard = new Array(8);
  for (let r = 0; r < 8; r++) {
    newBoard[r] = new Array(8);
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (cell === null) {
        newBoard[r][c] = null;
      } else {
        newBoard[r][c] = {
          color: cell.color,
          isYugo: cell.isYugo,
          jumlahArahYugo: cell.jumlahArahYugo || 0,
          jenisYugo: cell.jenisYugo || "standar",
          migosTerhapus: cell.migosTerhapus ? [...cell.migosTerhapus] : [],
        };
      }
    }
  }
  return newBoard;
}

function cloneBoard(board) {
  return cloneBoardFast(board);
}

function jalankanLangkahSimulasi(board, row, col, color) {
  if (!apakahLangkahLegalUntukBoard(board, row, col, color)) {
    // board[row][col] = null;
    return false; // Keluar dari fungsi, simulasi langkah digagalkan
  }

  board[row][col] = {
    color: color,
    isYugo: false,
    jumlahArahYugo: 0,
    migosTerhapus: [],
  };

  // 1. Validasi aturan legalitas sebelum memproses Yugo simulasi
  // Jika langkah ini ternyata membuat Long Line (>4) tanpa membuat Yugo di arah lain,
  // maka langkah ini ilegal. Langsung hapus bidak dari board simulasi!

  const hasilYugo = cekYugoSimulasi(board, row, col, color);

  if (hasilYugo.terbentukYugo) {
    board[row][col].isYugo = true;
    board[row][col].jumlahArahYugo = hasilYugo.jumlahArahYugo;
    board[row][col].migosTerhapus = hasilYugo.migosTerhapus;

    // Update jenisYugo otomatis untuk simulasi evaluasi material yang sinkron dengan penentu pemenang
    let jenisBentuk = "standar";
    if (hasilYugo.jumlahArahYugo === 2) jenisBentuk = "oval";
    else if (hasilYugo.jumlahArahYugo === 3) jenisBentuk = "segitiga";
    else if (hasilYugo.jumlahArahYugo === 4) jenisBentuk = "persegi";
    board[row][col].jenisYugo = jenisBentuk;

    const len = hasilYugo.migosTerhapus.length;
    for (let i = 0; i < len; i++) {
      const migo = hasilYugo.migosTerhapus[i];
      board[migo.r][migo.c] = null;
    }
  }

  return true; // Langkah simulasi berhasil dijalankan
}

// fungsi tambahan
function cariLangkahIgoLangsung(board, color) {
  const langkahLegal = ambilLangkahLegalSimulasi(board, color);
  const kandidat = [];
  const totalLangkah = langkahLegal.length;

  for (let i = 0; i < totalLangkah; i++) {
    const langkah = langkahLegal[i];
    const boardSimulasi = cloneBoard(board);

    if (
      !jalankanLangkahSimulasi(boardSimulasi, langkah.row, langkah.col, color)
    ) {
      continue;
    }

    if (deteksiIgo(boardSimulasi, color)) {
      kandidat.push({
        row: langkah.row,
        col: langkah.col,
        nilaiTengah: nilaiKontrolTengah(langkah.row, langkah.col),
      });
    }
  }

  if (kandidat.length > 0) {
    kandidat.sort((a, b) => b.nilaiTengah - a.nilaiTengah);
    return kandidat[0];
  }

  return null;
}

// fungsi untuk cek apakah langkah simulasi membentuk Yugo, ini khusus untuk simulasi di minmax, jadi tidak merubah state asli, dan juga mengembalikan informasi tambahan tentang arah Yugo dan migos yang terhapus, karena nanti itu bisa dipakai untuk evaluasi board di minimax
function cekYugoSimulasi(board, row, col, color) {
  const arah = [
    [
      [0, 1],
      [0, -1],
    ],
    [
      [1, 0],
      [-1, 0],
    ],
    [
      [1, 1],
      [-1, -1],
    ],
    [
      [1, -1],
      [-1, 1],
    ],
  ];

  let terbentukYugo = false;
  let jumlahArahYugo = 0;
  let migosTerhapus = [];

  for (let i = 0; i < 4; i++) {
    const pasangArah = arah[i];
    let hitungBidak = 1;
    let koordinatMigo = [];

    for (let j = 0; j < 2; j++) {
      const dr = pasangArah[j][0];
      const dc = pasangArah[j][1];
      let r = row + dr;
      let c = col + dc;

      while (
        r >= 0 &&
        r < 8 &&
        c >= 0 &&
        c < 8 &&
        board[r][c] !== null &&
        board[r][c].color === color
      ) {
        hitungBidak++;

        if (!board[r][c].isYugo) {
          koordinatMigo.push({ r, c });
        }

        r += dr;
        c += dc;
      }
    }

    if (hitungBidak === 4) {
      terbentukYugo = true;
      jumlahArahYugo++;
      migosTerhapus = migosTerhapus.concat(koordinatMigo);
    }
  }

  return {
    terbentukYugo,
    jumlahArahYugo,
    migosTerhapus,
  };
}
