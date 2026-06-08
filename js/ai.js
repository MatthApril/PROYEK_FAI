function jalankanAI() {
  aiSedangBerpikir = true;

  const elemenToggle = document.getElementById("toggleAlphaBeta");
  const elemenDepth = document.getElementById("inputDepth");

  // Jika elemen UI ada, ambil nilainya. Jika tidak ada (saat debugging awal), pakai default (true dan 2)
  const gunakanAlphaBeta = elemenToggle ? elemenToggle.checked : true;
  let depth = elemenDepth ? parseInt(elemenDepth.value) : 2;

  aiTimeoutId = setTimeout(() => {
    const langkahLegal = ambilSemuaLangkahLegalUntukBoard(
      gameState.board,
      aiColor,
    );

    if (langkahLegal.length === 0) {
      akhiriGame("AI tidak memiliki langkah legal. White wins!");
      aiSedangBerpikir = false;
      aiTimeoutId = null;
      return;
    }

    let langkahTerbaik = null;
    let skorTerbaik = -Infinity;

    // ==========================================
    // TOGGLE ALGORITMA: Menggunakan nilai dari UI toggle
    // ==========================================

    // Inisialisasi Alpha dan Beta untuk level Root
    let alpha = -Infinity;
    let beta = Infinity;

    // ==========================================
    // 1. MULAI CATAT WAKTU & RESET NODE DI SINI
    // ==========================================
    const waktuMulai = performance.now();
    totalNodeDievaluasi = 0;

    langkahLegal.forEach((langkah) => {
      const boardSimulasi = cloneBoard(gameState.board);
      jalankanLangkahSimulasi(boardSimulasi, langkah.row, langkah.col, aiColor);

      let skor;

      // Percabangan Algoritma Berdasarkan Toggle
      if (gunakanAlphaBeta) {
        skor = minimaxAlphaBeta(boardSimulasi, depth - 1, alpha, beta, false);
        // Update nilai alpha di level root agar pemangkasan semakin efektif
        alpha = Math.max(alpha, skor);
      } else {
        skor = minimaxMurni(boardSimulasi, depth - 1, false);
      }

      if (skor > skorTerbaik) {
        skorTerbaik = skor;
        langkahTerbaik = langkah;
      }
    });

    // ==========================================
    // 2. HENTIKAN WAKTU & CETAK LOG DI SINI
    // ==========================================
    const waktuSelesai = performance.now();
    const durasiBerpikir = waktuSelesai - waktuMulai;
    const namaAlgoritma = gunakanAlphaBeta ? "Alpha-Beta" : "Pure Minimax";

    console.log(
      `[${namaAlgoritma}] Depth: ${depth} | Node: ${totalNodeDievaluasi} | Waktu: ${durasiBerpikir.toFixed(2)} ms`,
    );

    aiSedangBerpikir = false;
    aiTimeoutId = null;

    handleKlikKotak(langkahTerbaik.row, langkahTerbaik.col, true);
  }, 500);
}

let totalNodeDievaluasi = 0;

// Fungsi baru: Minimax dengan Alpha-Beta Pruning
function minimaxAlphaBeta(board, depth, alpha, beta, isMaximizing) {
  totalNodeDievaluasi++; // Tetap hitung node untuk perbandingan nanti

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
      jalankanLangkahSimulasi(
        boardSimulasi,
        langkah.row,
        langkah.col,
        colorSekarang,
      );

      const skor = minimaxAlphaBeta(
        boardSimulasi,
        depth - 1,
        alpha,
        beta,
        false,
      );
      skorTerbaik = Math.max(skorTerbaik, skor);
      alpha = Math.max(alpha, skorTerbaik);

      // ALPHA-BETA PRUNING: Potong cabang jika tidak berguna
      if (beta <= alpha) {
        break;
      }
    }
    return skorTerbaik;
  } else {
    let skorTerbaik = Infinity;
    for (let i = 0; i < langkahLegal.length; i++) {
      const langkah = langkahLegal[i];
      const boardSimulasi = cloneBoard(board);
      jalankanLangkahSimulasi(
        boardSimulasi,
        langkah.row,
        langkah.col,
        colorSekarang,
      );

      const skor = minimaxAlphaBeta(
        boardSimulasi,
        depth - 1,
        alpha,
        beta,
        true,
      );
      skorTerbaik = Math.min(skorTerbaik, skor);
      beta = Math.min(beta, skorTerbaik);

      // ALPHA-BETA PRUNING: Potong cabang jika tidak berguna
      if (beta <= alpha) {
        break;
      }
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
      jalankanLangkahSimulasi(
        boardSimulasi,
        langkah.row,
        langkah.col,
        colorSekarang,
      );

      const skor = minimaxMurni(boardSimulasi, depth - 1, false);
      skorTerbaik = Math.max(skorTerbaik, skor);
    }
    return skorTerbaik;
  } else {
    let skorTerbaik = Infinity;
    for (let i = 0; i < langkahLegal.length; i++) {
      const langkah = langkahLegal[i];
      const boardSimulasi = cloneBoard(board);
      jalankanLangkahSimulasi(
        boardSimulasi,
        langkah.row,
        langkah.col,
        colorSekarang,
      );

      const skor = minimaxMurni(boardSimulasi, depth - 1, true);
      skorTerbaik = Math.min(skorTerbaik, skor);
    }
    return skorTerbaik;
  }
}

// Helper: Menghitung total bidak untuk menentukan fase Opening
function hitungTotalBidak(board) {
  let count = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] !== null) count++;
    }
  }
  return count;
}

// Helper: Ring System Evaluation (Dari evaluation.txt)
function evaluasiFaseOpening(row, col) {
  const centerRow = 3.5;
  const centerCol = 3.5;
  const jarakDariTengah = Math.sqrt(
    Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2),
  );

  if (jarakDariTengah > 3.5) return -50; // Outer ring (Pinggir/Pojok) -> SANGAT BURUK
  if (jarakDariTengah > 2.5) return -10; // Middle ring -> BURUK
  if (jarakDariTengah > 1.5) return -5; // Center ring -> Netral
  return 40; // Ring di sekitar center -> SANGAT BAIK
}

function evaluasiBoard(board) {
  // ========================================================
  // PRIORITAS MUTLAK 0: CEK KEMENANGAN IGO TERLEBIH DAHULU
  // ========================================================
  if (deteksiIgo(board, aiColor)) {
    return 1000000; // AI Menang Mutlak -> Skor Tertinggi
  }
  if (deteksiIgo(board, humanColor)) {
    return -1000000; // Musuh Menang Mutlak -> Skor Terendah
  }

  let skor = 0;
  const inOpening = hitungTotalBidak(board) < 30;

  let aiYugos = 0;
  let humanYugos = 0;

  // ========================================================
  // PILAR 1 & 2: DETEKSI ANCAMAN, DPA (GARPU), & TRAPDOOR
  // ========================================================
  const ancamanAI = deteksiAncamanIgo(board, aiColor);
  const ancamanHuman = deteksiAncamanIgo(board, humanColor);

  // Jika AI punya 3 Yugo sebaris (Must-Win)
  if (ancamanAI === 1) skor += 50000;
  // Jika AI punya 2 atau lebih jalur 3-Yugo sekaligus (DPA / Serangan Garpu!)
  if (ancamanAI >= 2) skor += 100000;

  // Jika Human punya ancaman (Must-Block)
  if (ancamanHuman === 1) skor -= 40000;
  // Jika Human berhasil melakukan Garpu ke AI
  if (ancamanHuman >= 2) skor -= 90000;

  // ========================================================
  // PILAR 3: MATERIAL, POSISI, & KONEKTIVITAS
  // ========================================================
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (cell === null) continue;

      if (cell.color === aiColor) {
        skor += 5;

        if (cell.isYugo) {
          aiYugos++;
          skor += 200;
          const jarakTengah = Math.abs(r - 3.5) + Math.abs(c - 3.5);
          skor += (7 - jarakTengah) * 15;
        } else {
          if (inOpening) skor += evaluasiFaseOpening(r, c);
          else {
            const jarakTengah = Math.abs(r - 3.5) + Math.abs(c - 3.5);
            skor += (7 - jarakTengah) * 3;
          }
        }

        // Panggil helper konektivitas linear yang baru (Menggantikan hitungTetangga biasa)
        skor += evaluasiKonektivitasLinear(board, r, c, aiColor) * 20;
      } else {
        skor -= 5;
        if (cell.isYugo) {
          humanYugos++;
          skor -= 250;
          const jarakTengah = Math.abs(r - 3.5) + Math.abs(c - 3.5);
          skor -= (7 - jarakTengah) * 15;
        } else {
          if (inOpening) skor -= evaluasiFaseOpening(r, c);
          else {
            const jarakTengah = Math.abs(r - 3.5) + Math.abs(c - 3.5);
            skor -= (7 - jarakTengah) * 3;
          }
        }

        skor -= evaluasiKonektivitasLinear(board, r, c, humanColor) * 20;
      }
    }
  }

  skor += (aiYugos - humanYugos) * 500;

  // ========================================================
  // PILAR 4: MOBILITAS (MENCEGAH WEGO LOSS)
  // ========================================================
  const langkahLegalAI = ambilSemuaLangkahLegalUntukBoard(
    board,
    aiColor,
  ).length;
  const langkahLegalHuman = ambilSemuaLangkahLegalUntukBoard(
    board,
    humanColor,
  ).length;
  skor += (langkahLegalAI - langkahLegalHuman) * 10;

  return skor;
}

// HELPER 1: DETEKSI ANCAMAN IGO & DPA (Mencari 3 Yugo + 1 Kosong)
function deteksiAncamanIgo(board, color) {
  let jumlahAncaman = 0;
  // 4 Arah: Horizontal, Vertikal, Diagonal Kanan Bawah, Diagonal Kiri Bawah
  const arah = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      for (let [dr, dc] of arah) {
        let yugoCount = 0;
        let emptyCount = 0;
        let validWindow = true;

        // Mengecek "jendela" ukuran 4 petak
        for (let i = 0; i < 4; i++) {
          let nr = r + i * dr;
          let nc = c + i * dc;

          // Jika keluar papan, lewati
          if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) {
            validWindow = false;
            break;
          }

          let cell = board[nr][nc];
          if (cell === null) {
            emptyCount++;
          } else if (cell.color === color && cell.isYugo) {
            yugoCount++;
          } else {
            // Jika ada bidak musuh atau Migo sendiri di jalur ini, berarti tidak jadi ancaman instan
            validWindow = false;
            break;
          }
        }

        // Jika dalam 4 petak ada persis 3 Yugo dan 1 Kosong = ANCAMAN FATAL!
        if (validWindow && yugoCount === 3 && emptyCount === 1) {
          jumlahAncaman++;
        }
      }
    }
  }
  return jumlahAncaman;
}

// HELPER 2: KONEKTIVITAS LINEAR (Membangun formasi)
// Memberi bonus jika ada bidak sewarna di garis yang sama tanpa terhalang Yugo Musuh
function evaluasiKonektivitasLinear(board, r, c, color) {
  const musuh = color === "white" ? "black" : "white";
  let koneksi = 0;
  const arah = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (let [dr, dc] of arah) {
    let nr = r + dr;
    let nc = c + dc;

    // Cek 2 petak ke arah tersebut
    for (let i = 0; i < 2; i++) {
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        let cell = board[nr][nc];
        if (cell !== null) {
          if (cell.color === color) {
            koneksi++; // Terhubung dengan teman
          } else if (cell.isYugo) {
            break; // Koneksi terputus total oleh Yugo musuh
          }
          // Jika cell adalah Migo musuh, loop tetap lanjut (karena Migo bisa tembus/hilang)
        }
      }
      nr += dr;
      nc += dc;
    }
  }
  return koneksi;
}

// HELPER 3: DETEKSI KEMENANGAN INSTAN (4 YUGO SEBARIS)
function deteksiIgo(board, color) {
  const arah = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]; // Horizontal, Vertikal, 2 Diagonal

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      for (let [dr, dc] of arah) {
        let yugoCount = 0;

        // Cek 4 petak ke depan
        for (let i = 0; i < 4; i++) {
          let nr = r + i * dr;
          let nc = c + i * dc;

          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            let cell = board[nr][nc];
            if (cell !== null && cell.color === color && cell.isYugo) {
              yugoCount++;
            } else {
              break; // Terputus, bukan Igo
            }
          }
        }

        if (yugoCount === 4) {
          // console.log(`Deteksi Igo: ${color} memiliki 4 Yugo sebaris di (${r}, ${c}) ke arah (${dr}, ${dc})`);
          return true; // Ditemukan 4 Yugo sebaris!
        }
      }
    }
  }
  return false;
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
  board[row][col] = {
    color: color,
    isYugo: false,
    jumlahArahYugo: 0,
    migosTerhapus: [],
  };

  const hasilYugo = cekYugoSimulasi(board, row, col, color);

  if (hasilYugo.terbentukYugo) {
    board[row][col].isYugo = true;
    board[row][col].jumlahArahYugo = hasilYugo.jumlahArahYugo;
    board[row][col].migosTerhapus = hasilYugo.migosTerhapus;

    hasilYugo.migosTerhapus.forEach((migo) => {
      board[migo.r][migo.c] = null;
    });
  }
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

// fungsi untuk ambil semua langkah legal untuk warna tertentu, ini akan dipakai di kedua mode AI, karena baik Beginner maupun Novice sama-sama butuh cek langkah legal, cuma Novice yang lebih rumit karena butuh cek langkah legal untuk board simulasi di minmax, jadi fungsi ini dibuat supaya bisa dipakai ulang
function ambilSemuaLangkahLegal(color) {
  return ambilSemuaLangkahLegalUntukBoard(gameState.board, color);
}
// cek legal apa ngga langkah nya
function apakahLangkahLegal(row, col, color) {
  return apakahLangkahLegalUntukBoard(gameState.board, row, col, color);
}

// ambil semua langkah legal yang di board
function ambilSemuaLangkahLegalUntukBoard(board, color) {
  const langkah = [];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === null) {
        if (apakahLangkahLegalUntukBoard(board, r, c, color)) {
          langkah.push({ row: r, col: c });
        }
      }
    }
  }

  return langkah;
}
// cek legal apa ngga langkah nya di board tertentu, ini untuk simulasi di minmax, jadi tidak merubah state asli, dan juga untuk cek langkah legal di board simulasi
function apakahLangkahLegalUntukBoard(board, row, col, color) {
  if (board[row][col] !== null) {
    return false;
  }

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

  let adaYugoSah = false;
  let adaLongLine = false;

  arah.forEach((pasangArah) => {
    let hitungBidak = 1;

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
        r += dr;
        c += dc;
      }
    });

    if (hitungBidak === 4) {
      adaYugoSah = true;
    }

    if (hitungBidak > 4) {
      adaLongLine = true;
    }
  });

  if (adaLongLine && !adaYugoSah) {
    return false;
  }

  return true;
}

// fungsi untuk cek apakah langkah membentuk Yugo, ini untuk mode Beginner yang cuma cek langsung tanpa simulasi, jadi cukup cek di board asli, dan juga untuk cek langkah legal di board simulasi, karena kalau langsung Yugo kan pasti bagus banget buat AI
function apakahMembentukYugo(row, col, color) {
  return apakahMembentukYugoUntukBoard(gameState.board, row, col, color);
}

// fungsi untuk cek apakah langkah membentuk Yugo, ini untuk mode Beginner yang cuma cek langsung tanpa simulasi, jadi cukup cek di board asli, dan juga untuk cek langkah legal di board simulasi, karena kalau langsung Yugo kan pasti bagus banget buat AI
function apakahMembentukYugoUntukBoard(board, row, col, color) {
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

  for (const pasangArah of arah) {
    let hitungBidak = 1;

    for (const [dr, dc] of pasangArah) {
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
        r += dr;
        c += dc;
      }
    }

    if (hitungBidak === 4) {
      return true;
    }
  }

  return false;
}

// fungsi untuk nilai kontrol tengah, ini untuk evaluasi board di mode Novice, jadi semakin dekat ke tengah semakin tinggi nilainya, karena menguasai tengah itu strategi yang bagus di Yugo
function nilaiKontrolTengah(row, col) {
  const centerRow = 3.5;
  const centerCol = 3.5;

  const jarak = Math.abs(row - centerRow) + Math.abs(col - centerCol);

  return 14 - jarak * 2;
}

// fungsi untuk hitung jumlah bidak tetangga (baik yang sewarna maupun lawan) di sekitar kotak tertentu, untuk membantu evaluasi langkah AI Novice, karena kalau banyak tetangga itu bisa jadi bagus buat AI kalau sewarna, tapi bisa bahaya juga kalau lawan, jadi ini membantu AI untuk menilai posisi bidak di board simulasi
function hitungTetanggaBoard(board, row, col, color) {
  const arah = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  let jumlah = 0;

  arah.forEach(([dr, dc]) => {
    const r = row + dr;
    const c = col + dc;

    if (
      r >= 0 &&
      r < 8 &&
      c >= 0 &&
      c < 8 &&
      board[r][c] !== null &&
      board[r][c].color === color
    ) {
      jumlah++;
    }
  });

  return jumlah;
}
