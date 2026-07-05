// js/ai/evaluate.js

// Helper: Ring System Evaluation (Menggunakan Constants)
function evaluasiFaseOpening(row, col) {
  const centerRow = 3.5;
  const centerCol = 3.5;
  const jarak = Math.sqrt(
    Math.pow(row - centerRow, 2) + Math.pow(col - centerCol, 2),
  );

  if (jarak > 3.5) return HEURISTIC_WEIGHTS.RING_OUTER;
  if (jarak > 2.5) return HEURISTIC_WEIGHTS.RING_MIDDLE;
  if (jarak > 1.5) return HEURISTIC_WEIGHTS.RING_CENTER;
  return HEURISTIC_WEIGHTS.RING_INNER;
}

function evaluasiBoard(board) {
  // 0. CEK KEMENANGAN MUTLAK
  if (deteksiIgo(board, aiColor)) return HEURISTIC_WEIGHTS.WIN_IGO;
  if (deteksiIgo(board, humanColor)) return HEURISTIC_WEIGHTS.LOSE_IGO;

  let skor = 0;
  const inOpening =
    hitungTotalBidak(board) < HEURISTIC_WEIGHTS.OPENING_THRESHOLD;
  let aiYugos = 0;
  let humanYugos = 0;

  // 1. DETEKSI ANCAMAN
  const ancamanAI = deteksiAncamanIgo(board, aiColor);
  const ancamanHuman = deteksiAncamanIgo(board, humanColor);

  skor += ancamanAI * HEURISTIC_WEIGHTS.THREAT_AI_VALID;
  skor -=
    unconAncamanHuman(ancamanHuman) * HEURISTIC_WEIGHTS.THREAT_HUMAN_VALID;

  // 2. MATERIAL, POSISI, & KONEKTIVITAS
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (cell === null) continue;

      if (cell.color === aiColor) {
        skor += HEURISTIC_WEIGHTS.MIGO_BASE_VALUE;

        if (cell.isYugo) {
          const bobot = parseInt(cell.jumlahArahYugo) || 1;
          aiYugos += bobot;
          skor += HEURISTIC_WEIGHTS.YUGO_AI_VALUE * bobot;
          skor +=
            nilaiKontrolTengah(r, c) * HEURISTIC_WEIGHTS.CENTER_YUGO_MULTIPLIER;
        } else {
          if (inOpening) skor += evaluasiFaseOpening(r, c);
          else
            skor +=
              nilaiKontrolTengah(r, c) *
              HEURISTIC_WEIGHTS.CENTER_MIGO_MULTIPLIER;
        }
        skor +=
          evaluasiKonektivitasLinear(board, r, c, aiColor) *
          HEURISTIC_WEIGHTS.KONEKTIVITAS_LINEAR;
      } else {
        // Evaluasi Musuh (Dibalik menjadi Minus)
        skor -= HEURISTIC_WEIGHTS.MIGO_BASE_VALUE;

        if (cell.isYugo) {
          const bobot = parseInt(cell.jumlahArahYugo) || 1;
          humanYugos += bobot;
          skor -= HEURISTIC_WEIGHTS.YUGO_HUMAN_VALUE * bobot;
          skor -=
            nilaiKontrolTengah(r, c) * HEURISTIC_WEIGHTS.CENTER_YUGO_MULTIPLIER;
        } else {
          if (inOpening) skor -= evaluasiFaseOpening(r, c);
          else
            skor -=
              nilaiKontrolTengah(r, c) *
              HEURISTIC_WEIGHTS.CENTER_MIGO_MULTIPLIER;
        }
        skor -=
          evaluasiKonektivitasLinear(board, r, c, humanColor) *
          HEURISTIC_WEIGHTS.KONEKTIVITAS_LINEAR;
      }
    }
  }

  // 3. SELISIH YUGO
  skor += (aiYugos - humanYugos) * HEURISTIC_WEIGHTS.YUGO_DIFFERENCE_MULTIPLIER;

  return skor;
}
// HELPER 1: DETEKSI ANCAMAN IGO & DPA (Mencari 3 Yugo + 1 Kosong)
function deteksiAncamanIgo(board, color) {
  let jumlahAncaman = 0;
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
        let empty = null;
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
            empty = { row: nr, col: nc };
          } else if (cell.color === color && cell.isYugo) {
            yugoCount++;
          } else {
            // Jika ada bidak musuh atau Migo sendiri di jalur ini, berarti tidak jadi ancaman instan
            validWindow = false;
            break;
          }
        }

        // Jika dalam 4 petak ada persis 3 Yugo dan 1 Kosong = ANCAMAN FATAL!
        if (validWindow && yugoCount === 3 && empty !== null) {
          // Validasi tambahan: Pastikan jika diisi di petak kosong tersebut, ia benar-benar memicu Yugo/Igo
          if (
            apakahLangkahLegalUntukBoard(board, empty.row, empty.col, color)
          ) {
            jumlahAncaman++;
          }
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
            if (
              cell !== null &&
              cell.color === color &&
              (cell.isYugo || cell.jumlahArahYugo > 0)
            ) {
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

function nilaiKontrolTengah(row, col) {
  const centerRow = 3.5;
  const centerCol = 3.5;

  const jarak = Math.abs(row - centerRow) + Math.abs(col - centerCol);

  return 14 - jarak * 2;
}

function unconAncamanHuman(nilai) {
  return parseInt(nilai) || 0;
}
