// js/ai/minimax.js

let totalNodeDievaluasi = 0;

function jalankanAI() {
  aiSedangBerpikir = true;

  const elemenToggle = document.getElementById("toggleAlphaBeta");
  const elemenDepth = document.getElementById("inputDepth");
  const gunakanAlphaBeta = elemenToggle ? elemenToggle.checked : true;
  let depth = elemenDepth ? parseInt(elemenDepth.value) : 2;

  aiTimeoutId = setTimeout(() => {
    const langkahLegal = ambilSemuaLangkahLegalUntukBoard(gameState.board, aiColor);

    if (langkahLegal.length === 0) {
      akhiriGame("AI tidak memiliki langkah legal. White wins!");
      aiSedangBerpikir = false;
      aiTimeoutId = null;
      return;
    }

    // PRIORITAS 1 & 2: Short-circuiting untuk Igo Langsung (Sudah Benar)
    const igoLangsungAI = cariLangkahIgoLangsung(gameState.board, aiColor);
    if (igoLangsungAI) {
      aiSedangBerpikir = false;
      handleKlikKotak(igoLangsungAI.row, igoLangsungAI.col, true);
      return;
    }

    const igoLangsungHuman = cariLangkahIgoLangsung(gameState.board, humanColor);
    if (igoLangsungHuman && apakahLangkahLegalUntukBoard(gameState.board, igoLangsungHuman.row, igoLangsungHuman.col, aiColor)) {
      aiSedangBerpikir = false;
      handleKlikKotak(igoLangsungHuman.row, igoLangsungHuman.col, true);
      return;
    }

    let langkahTerbaik = null;
    let skorTerbaik = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;

    const waktuMulai = performance.now();
    totalNodeDievaluasi = 0;

    langkahLegal.forEach((langkah) => {
      const boardSimulasi = cloneBoard(gameState.board);
      const sukses = jalankanLangkahSimulasi(boardSimulasi, langkah.row, langkah.col, aiColor);

      if (!sukses) return;

      let skor;
      if (gunakanAlphaBeta) {
        skor = minimaxAlphaBeta(boardSimulasi, depth - 1, alpha, beta, false);
        alpha = Math.max(alpha, skor);
      } else {
        skor = minimaxMurni(boardSimulasi, depth - 1, false);
      }

      // Tie-breaker: Jika skor sama, pilih yang paling menguasai tengah
      if (skor > skorTerbaik) {
        skorTerbaik = skor;
        langkahTerbaik = langkah;
      } else if (skor === skorTerbaik && langkahTerbaik !== null) {
        if (nilaiKontrolTengah(langkah.row, langkah.col) > nilaiKontrolTengah(langkahTerbaik.row, langkahTerbaik.col)) {
          langkahTerbaik = langkah;
        }
      }
    });

    const waktuSelesai = performance.now();
    const durasiBerpikir = waktuSelesai - waktuMulai;
    const namaAlgoritma = gunakanAlphaBeta ? "Alpha-Beta" : "Pure Minimax";

    console.log(`[${namaAlgoritma}] Depth: ${depth} | Node: ${totalNodeDievaluasi} | Waktu: ${durasiBerpikir.toFixed(2)} ms`);

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
  if (depth === 0) return evaluasiBoard(board);

  const colorSekarang = isMaximizing ? aiColor : humanColor;
  const langkahLegal = ambilSemuaLangkahLegalUntukBoard(board, colorSekarang);
  if (langkahLegal.length === 0) return evaluasiBoard(board);

  // ==========================================
  // MOVE ORDERING: Kunci Kecepatan Alpha-Beta
  // ==========================================
  langkahLegal.sort((a, b) => {
    let skorA = 0;
    let skorB = 0;

    // 1. Tebakan Murah: Prioritaskan langkah yang membentuk Yugo Langsung
    if (apakahMembentukYugoUntukBoard(board, a.row, a.col, colorSekarang)) skorA += 1000;
    if (apakahMembentukYugoUntukBoard(board, b.row, b.col, colorSekarang)) skorB += 1000;

    // 2. Tebakan Murah: Prioritaskan penguasaan area ring/tengah
    skorA += nilaiKontrolTengah(a.row, a.col);
    skorB += nilaiKontrolTengah(b.row, b.col);

    // Sort descending (terbesar ke terkecil)
    return skorB - skorA;
  });

  if (isMaximizing) {
    let skorTerbaik = -Infinity;
    for (let i = 0; i < langkahLegal.length; i++) {
      const boardSimulasi = cloneBoard(board);
      if (!jalankanLangkahSimulasi(boardSimulasi, langkahLegal[i].row, langkahLegal[i].col, colorSekarang)) continue;
      
      const skor = minimaxAlphaBeta(boardSimulasi, depth - 1, alpha, beta, false);
      skorTerbaik = Math.max(skorTerbaik, skor);
      alpha = Math.max(alpha, skorTerbaik);
      if (beta <= alpha) break;
    }
    return skorTerbaik;
  } else {
    let skorTerbaik = Infinity;
    for (let i = 0; i < langkahLegal.length; i++) {
      const boardSimulasi = cloneBoard(board);
      if (!jalankanLangkahSimulasi(boardSimulasi, langkahLegal[i].row, langkahLegal[i].col, colorSekarang)) continue;

      const skor = minimaxAlphaBeta(boardSimulasi, depth - 1, alpha, beta, true);
      skorTerbaik = Math.min(skorTerbaik, skor);
      beta = Math.min(beta, skorTerbaik);
      if (beta <= alpha) break;
    }
    return skorTerbaik;
  }
}

function minimaxMurni(board, depth, isMaximizing) {
  totalNodeDievaluasi++; // Menghitung setiap node yang dikunjungi

  if (depth === 0) {
    return evaluasiBoard(board);
  }

  const colorSekarang = isMaximizing ? aiColor : humanColor;
  const langkahLegal = ambilSemuaLangkahLegalUntukBoard(board, colorSekarang);

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

// fungsi untuk clone board agar simulasi tidak merusak board asli , jadi di rencanaain dlu pake cloneboard
function cloneBoard(board) {
  return board.map((row) =>
    row.map((cell) => {
      if (cell === null) return null;

      return {
        color: cell.color,
        isYugo: cell.isYugo,
        jumlahArahYugo: cell.jumlahArahYugo || 0,
        migosTerhapus: cell.migosTerhapus ? [...cell.migosTerhapus] : [],
      };
    }),
  );
}

// fungsi untuk menjalankan langkah simulasi di board clone, jadi setiap langkah yang dicek di minmax itu dijalankan dulu di board clone, baru dicek hasilnya, jadi tidak merusak board asli
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

    hasilYugo.migosTerhapus.forEach((migo) => {
      board[migo.r][migo.c] = null;
    });
  }

  return true; // Langkah simulasi berhasil dijalankan
}

// fungsi tambahan
function cariLangkahIgoLangsung(board, color) {
  const langkahLegal = ambilSemuaLangkahLegalUntukBoard(board, color);
  const kandidat = [];

  langkahLegal.forEach((langkah) => {
    const boardSimulasi = cloneBoard(board);

    const sukses = jalankanLangkahSimulasi(
      boardSimulasi,
      langkah.row,
      langkah.col,
      color,
    );

    if (!sukses) return;

    if (deteksiIgo(boardSimulasi, color)) {
      kandidat.push({
        row: langkah.row,
        col: langkah.col,
        notasi: indeksKeHuruf[langkah.col] + (8 - langkah.row),
        nilaiTengah: nilaiKontrolTengah(langkah.row, langkah.col),
      });
    }
  });

  kandidat.sort((a, b) => {
    return b.nilaiTengah - a.nilaiTengah;
  });

  // console.log("KANDIDAT IGO LANGSUNG", color, kandidat);

  return kandidat[0] || null;
}

// fungsi untuk cek apakah langkah simulasi membentuk Yugo, ini mirip dengan cekYugo di script.js tapi ini khusus untuk simulasi di minmax, jadi tidak merubah state asli, dan juga mengembalikan informasi tambahan tentang arah Yugo dan migos yang terhapus, karena nanti itu bisa dipakai untuk evaluasi board di minimax
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

  arah.forEach((pasangArah) => {
    let hitungBidak = 1;
    let koordinatMigo = [];

    pasangArah.forEach(([dr, dc]) => {
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
    });

    if (hitungBidak === 4) {
      terbentukYugo = true;
      jumlahArahYugo++;
      migosTerhapus = migosTerhapus.concat(koordinatMigo);
    }
  });

  return {
    terbentukYugo,
    jumlahArahYugo,
    migosTerhapus,
  };
}
