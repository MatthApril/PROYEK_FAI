// js/ai/minimax_visual.js

// === DEFAULT HEURISTIC WEIGHTS ===
window.HEURISTIC_WEIGHTS = {
  WIN_IGO: 100000,
  LOSE_IGO: 100000,
  OPENING_THRESHOLD: 12,
  THREAT_AI_VALID: 40000,
  THREAT_HUMAN_VALID: 40000,
  MIGO_BASE_VALUE: 100,
  YUGO_AI_VALUE: 500,
  YUGO_HUMAN_VALUE: 500,
  CENTER_YUGO_MULTIPLIER: 5,
  CENTER_MIGO_MULTIPLIER: 2,
  KONEKTIVITAS_LINEAR: 15,
  YUGO_DIFFERENCE_MULTIPLIER: 1000,
  RING_OUTER: 5,
  RING_MIDDLE: 10,
  RING_CENTER: 20,
  RING_INNER: 30,
};

// === STATE ENGINE VISUALISASI ===
let gameState = {
  board: Array(8)
    .fill(null)
    .map(() => Array(8).fill(null)),
  turn: "human",
  isGameOver: false,
};

const aiColor = "black";
const humanColor = "white";
let evaluasiVisual = [];
let aiPhase = 0; // 0: Human Turn, 1: Menunggu Place Piece, 2: Menunggu Pass Turn
let langkahAITerbaikGlobal = null;

const indeksKeHuruf = ["a", "b", "c", "d", "e", "f", "g", "h"];
const evaluasiCache = new Map();

// === FORMATTING & UTILS ===
function formatSkor(skor) {
  if (skor === Infinity || skor >= 90000) return "+MATE";
  if (skor === -Infinity || skor <= -90000) return "-MATE";
  let sign = skor > 0 ? "+" : skor < 0 ? "-" : "";
  let absVal = Math.abs(Math.floor(skor));
  if (absVal >= 1000000) return sign + (absVal / 1000000).toFixed(1) + "M";
  if (absVal >= 1000) return sign + (absVal / 1000).toFixed(1) + "K";
  return sign + absVal;
}

function koordinatKeNotasi(row, col) {
  return `${indeksKeHuruf[col]}${8 - row}`;
}

// =========================================================================
// 100% CLONE DARI MINIMAX.JS (FUNGSI IDENTIK TANPA MODIFIKASI)
// =========================================================================

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

function ambilSemuaLangkahLegalUntukBoard(board, color) {
  let legal = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === null) {
        legal.push({ row: r, col: c });
      }
    }
  }
  return legal;
}

function apakahLangkahLegalUntukBoard(board, row, col, color) {
  if (row < 0 || row > 7 || col < 0 || col > 7) return false;
  return board[row][col] === null;
}

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
      // HARUS TEPAT 4
      terbentukYugo = true;
      jumlahArahYugo++;
      migosTerhapus = migosTerhapus.concat(koordinatMigo);
    }
  }

  return { terbentukYugo, jumlahArahYugo, migosTerhapus };
}

function apakahMembentukYugoUntukBoard(board, row, col, color) {
  return cekYugoSimulasi(board, row, col, color).terbentukYugo;
}

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

function kembalikanLangkahInPlace(
  board,
  row,
  col,
  backupCell,
  dataYugo,
  color,
) {
  if (dataYugo && dataYugo.terbentukYugo) {
    const len = dataYugo.migosYangDihapus.length;
    for (let i = 0; i < len; i++) {
      const item = dataYugo.migosYangDihapus[i];
      board[item.r][item.c] = item.data;
    }
  }
  board[row][col] = backupCell;
}

function jalankanLangkahSimulasi(board, row, col, color) {
  if (!apakahLangkahLegalUntukBoard(board, row, col, color)) return false;

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
  return true;
}

function cariLangkahIgoLangsung(board, color) {
  const langkahLegal = ambilSemuaLangkahLegalUntukBoard(board, color);
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

    // deteksiIgo harus ada dari file evaluate.js
    if (typeof deteksiIgo === "function" && deteksiIgo(boardSimulasi, color)) {
      kandidat.push({
        row: langkah.row,
        col: langkah.col,
        nilaiTengah:
          typeof nilaiKontrolTengah === "function"
            ? nilaiKontrolTengah(langkah.row, langkah.col)
            : 0,
      });
    }
  }

  if (kandidat.length > 0) {
    kandidat.sort((a, b) => b.nilaiTengah - a.nilaiTengah);
    return kandidat[0];
  }

  return null;
}

function urutkanLangkah(board, langkahLegal, colorSekarang) {
  for (let i = 0; i < langkahLegal.length; i++) {
    const langkah = langkahLegal[i];
    let bobot = 0;
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
    bobot +=
      (typeof nilaiKontrolTengah === "function"
        ? nilaiKontrolTengah(langkah.row, langkah.col)
        : 0) * 10;
    langkah.bobotEvaluasi = bobot;
  }
  langkahLegal.sort((a, b) => b.bobotEvaluasi - a.bobotEvaluasi);
}

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

// =========================================================================
// ENGINE VISUALISASI BERBASIS PATH
// =========================================================================

function minimaxVisualAlphaBeta(board, depth, alpha, beta, isMaximizing) {
  // CACHING LOGIC identik dengan minimax.js (hanya depth == 0)
  if (depth === 0) {
    const key = dapatkanPapanKeyString(board);
    if (evaluasiCache.has(key))
      return { score: evaluasiCache.get(key), path: [] };
    const score = evaluasiBoard(board);
    evaluasiCache.set(key, score);
    return { score: score, path: [] };
  }

  const colorSekarang = isMaximizing ? aiColor : humanColor;
  const langkahLegal = ambilSemuaLangkahLegalUntukBoard(board, colorSekarang);

  if (langkahLegal.length === 0)
    return { score: evaluasiBoard(board), path: [] };

  urutkanLangkah(board, langkahLegal, colorSekarang);

  let skorTerbaik = isMaximizing ? -Infinity : Infinity;
  let jalurTerbaik = [];

  for (let i = 0; i < langkahLegal.length; i++) {
    const langkah = langkahLegal[i];
    const boardSimulasi = cloneBoard(board);

    if (
      !jalankanLangkahSimulasi(
        boardSimulasi,
        langkah.row,
        langkah.col,
        colorSekarang,
      )
    )
      continue;

    const hasil = minimaxVisualAlphaBeta(
      boardSimulasi,
      depth - 1,
      alpha,
      beta,
      !isMaximizing,
    );

    if (isMaximizing) {
      if (hasil.score > skorTerbaik) {
        skorTerbaik = hasil.score;
        jalurTerbaik = [
          { row: langkah.row, col: langkah.col, color: colorSekarang },
          ...hasil.path,
        ];
      }
      alpha = Math.max(alpha, skorTerbaik);
    } else {
      if (hasil.score < skorTerbaik) {
        skorTerbaik = hasil.score;
        jalurTerbaik = [
          { row: langkah.row, col: langkah.col, color: colorSekarang },
          ...hasil.path,
        ];
      }
      beta = Math.min(beta, skorTerbaik);
    }

    if (beta <= alpha) break; // Pruning
  }

  if (jalurTerbaik.length === 0 && langkahLegal.length > 0) {
    jalurTerbaik = [
      {
        row: langkahLegal[0].row,
        col: langkahLegal[0].col,
        color: colorSekarang,
      },
    ];
  }

  return { score: skorTerbaik, path: jalurTerbaik };
}

// === ROOT HEATMAP (MENGGANTIKAN JALANKANAI) ===
function kalkulasiHeatmapUntukWarna(color) {
  evaluasiVisual = [];
  evaluasiCache.clear();

  // TERCETAK DI BATU: TARGET DEPTH 4 SESUAI PERMINTAAN USER
  const currentDepth = 4;
  const isMaximizing = color === aiColor;

  // PRIORITAS 1 & 2: Identik dengan minimax.js
  const igoLangsungAI = cariLangkahIgoLangsung(gameState.board, color);
  if (igoLangsungAI) {
    igoLangsungAI.skorAkhir = Infinity;
    igoLangsungAI.pathPrediksi = [
      { row: igoLangsungAI.row, col: igoLangsungAI.col, color: color },
    ];
    evaluasiVisual.push(igoLangsungAI);
    return igoLangsungAI;
  }

  const musuh = color === aiColor ? humanColor : aiColor;
  const igoLangsungHuman = cariLangkahIgoLangsung(gameState.board, musuh);
  if (
    igoLangsungHuman &&
    apakahLangkahLegalUntukBoard(
      gameState.board,
      igoLangsungHuman.row,
      igoLangsungHuman.col,
      color,
    )
  ) {
    igoLangsungHuman.skorAkhir = Infinity;
    igoLangsungHuman.pathPrediksi = [
      { row: igoLangsungHuman.row, col: igoLangsungHuman.col, color: color },
    ];
    evaluasiVisual.push(igoLangsungHuman);
    return igoLangsungHuman;
  }

  const langkahLegal = ambilSemuaLangkahLegalUntukBoard(gameState.board, color);
  const boardPencarian = cloneBoardFast(gameState.board);

  let skorTertinggi = isMaximizing ? -Infinity : Infinity;
  let langkahTerbaik = null;
  let alpha = -Infinity;
  let beta = Infinity;

  urutkanLangkah(boardPencarian, langkahLegal, color);

  for (let i = 0; i < langkahLegal.length; i++) {
    const langkah = langkahLegal[i];
    const backupCell = boardPencarian[langkah.row][langkah.col];

    const dataYugo = jalankanLangkahInPlace(
      boardPencarian,
      langkah.row,
      langkah.col,
      color,
    );

    // Identik dengan fallback minimax.js
    if (dataYugo.ilegal) {
      boardPencarian[langkah.row][langkah.col] = backupCell;
      langkah.skorAkhir = isMaximizing ? -Infinity : Infinity;
      continue;
    }

    const hasil = minimaxVisualAlphaBeta(
      boardPencarian,
      currentDepth - 1,
      alpha,
      beta,
      !isMaximizing,
    );

    langkah.skorAkhir = hasil.score;
    langkah.pathPrediksi = [
      { row: langkah.row, col: langkah.col, color: color },
      ...hasil.path,
    ];
    evaluasiVisual.push(langkah);

    // Identik dengan Tie-Breaker dari minimax.js
    if (isMaximizing) {
      if (hasil.score > skorTertinggi) {
        skorTertinggi = hasil.score;
        langkahTerbaik = langkah;
      } else if (hasil.score === skorTertinggi && langkahTerbaik !== null) {
        if (
          typeof nilaiKontrolTengah === "function" &&
          nilaiKontrolTengah(langkah.row, langkah.col) >
            nilaiKontrolTengah(langkahTerbaik.row, langkahTerbaik.col)
        ) {
          langkahTerbaik = langkah;
        }
      }
      alpha = Math.max(alpha, skorTertinggi);
    } else {
      if (hasil.score < skorTertinggi) {
        skorTertinggi = hasil.score;
        langkahTerbaik = langkah;
      } else if (hasil.score === skorTertinggi && langkahTerbaik !== null) {
        // Fallback tie-breaker untuk meminimalisasi (Human heatmap)
        if (
          typeof nilaiKontrolTengah === "function" &&
          nilaiKontrolTengah(langkah.row, langkah.col) >
            nilaiKontrolTengah(langkahTerbaik.row, langkahTerbaik.col)
        ) {
          langkahTerbaik = langkah;
        }
      }
      beta = Math.min(beta, skorTertinggi);
    }

    kembalikanLangkahInPlace(
      boardPencarian,
      langkah.row,
      langkah.col,
      backupCell,
      dataYugo,
      color,
    );
  }

  // Jika tidak ada langkah terbaik (misal karena pruning parah), fallback ke langkahLegal[0]
  if (!langkahTerbaik && langkahLegal.length > 0) {
    langkahTerbaik = langkahLegal[0];
  }

  return langkahTerbaik;
}

// === FUNGSI RENDER (TETAP SAMA SEPERTI SEBELUMNYA) ===
function renderSkorDiPapan() {
  evaluasiVisual.forEach((l) => {
    const cellEl = document.getElementById(`cell-${l.row}-${l.col}`);
    if (cellEl) {
      const oldScore = document.getElementById(`score-${l.row}-${l.col}`);
      if (oldScore) oldScore.remove();

      const scoreSpan = document.createElement("span");
      scoreSpan.id = `score-${l.row}-${l.col}`;
      scoreSpan.innerText = formatSkor(l.skorAkhir);

      const isOccupied = gameState.board[l.row][l.col] !== null;
      let extraClass = isOccupied ? " bg-dark bg-opacity-75 px-1 rounded" : "";

      if (l.skorAkhir > 0)
        scoreSpan.className = "score-overlay score-plus" + extraClass;
      else if (l.skorAkhir < 0)
        scoreSpan.className = "score-overlay score-minus" + extraClass;
      else scoreSpan.className = "score-overlay score-zero" + extraClass;

      cellEl.appendChild(scoreSpan);
    }
  });
}

function handleKlikKotak(r, c) {
  if (gameState.isGameOver) return;

  const evaluasiLangkah = evaluasiVisual.find(
    (l) => l.row === r && l.col === c,
  );
  if (evaluasiLangkah) tampilkanInspeksiDetail(evaluasiLangkah);

  if (
    gameState.turn === "human" &&
    aiPhase === 0 &&
    gameState.board[r][c] === null
  ) {
    jalankanLangkahInPlace(gameState.board, r, c, humanColor);
    gameState.turn = "ai";
    evaluasiVisual = [];
    gambarPapan();

    document.getElementById("turnIndicator").innerHTML =
      "🤖 AI is Calculating...";
    document.getElementById("engineStatus").innerText = "Calculating (Depth 4)";

    setTimeout(() => {
      langkahAITerbaikGlobal = kalkulasiHeatmapUntukWarna(aiColor);

      if (langkahAITerbaikGlobal) {
        gambarPapan();
        renderSkorDiPapan();
        tampilkanInspeksiDetail(langkahAITerbaikGlobal);

        aiPhase = 1;
        const btn = document.getElementById("btnContinue");
        btn.innerText = "Place AI Piece ➔";
        btn.classList.remove("d-none");
        btn.classList.remove("btn-success");
        btn.classList.add("btn-warning");

        document.getElementById("turnIndicator").innerHTML =
          "⏸️ Silakan periksa skor, lalu klik tombol untuk meletakkan bidak.";
        document.getElementById("engineStatus").innerText =
          "Waiting for Placement";
      }
    }, 50);
  }
}

document.getElementById("btnContinue")?.addEventListener("click", () => {
  const btn = document.getElementById("btnContinue");
  if (aiPhase === 1) {
    jalankanLangkahInPlace(
      gameState.board,
      langkahAITerbaikGlobal.row,
      langkahAITerbaikGlobal.col,
      aiColor,
    );
    gambarPapan();
    renderSkorDiPapan();

    aiPhase = 2;
    btn.innerText = "Start Human Turn ➔";
    btn.classList.remove("btn-warning");
    btn.classList.add("btn-success");

    document.getElementById("turnIndicator").innerHTML =
      "⏸️ Bidak AI telah diletakkan. Klik tombol untuk memulai giliranmu.";
    document.getElementById("engineStatus").innerText = "Waiting for Turn Pass";
  } else if (aiPhase === 2) {
    aiPhase = 0;
    gameState.turn = "human";
    evaluasiVisual = [];
    gambarPapan();
    btn.classList.add("d-none");
    document.getElementById("turnIndicator").innerHTML =
      "🟢 Human's Turn (Silakan jalan)";
    document.getElementById("engineStatus").innerText = "Waiting";
    document.getElementById("inspectorEmpty").classList.remove("d-none");
    document.getElementById("inspectorPanel").classList.add("d-none");
  }
});

function gambarPapan() {
  const container = document.getElementById("boardArena");
  container.innerHTML = "";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cellDiv = document.createElement("div");
      cellDiv.className = `cell ${(r + c) % 2 === 0 ? "" : "cell-dark"}`;
      cellDiv.id = `cell-${r}-${c}`;
      if (gameState.board[r][c] !== null) {
        const piece = document.createElement("div");
        let yugoClass = gameState.board[r][c].isYugo ? " yugo" : "";
        piece.className = `piece ${gameState.board[r][c].color}${yugoClass}`;
        cellDiv.appendChild(piece);
      }
      cellDiv.addEventListener("click", () => handleKlikKotak(r, c));
      container.appendChild(cellDiv);
    }
  }
}

function bedahRincianEvaluasi(board, aiColor) {
  let material = 0,
    tengah = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      let sign = cell.color === aiColor ? 1 : -1;
      material += HEURISTIC_WEIGHTS.MIGO_BASE_VALUE * sign;
      if (cell.isYugo)
        material +=
          HEURISTIC_WEIGHTS.YUGO_AI_VALUE * (cell.jumlahArahYugo || 1) * sign;
      if (typeof nilaiKontrolTengah === "function") {
        tengah +=
          nilaiKontrolTengah(r, c) *
          sign *
          (cell.isYugo ? HEURISTIC_WEIGHTS.CENTER_YUGO_MULTIPLIER : 1);
      }
    }
  }
  return { material, tengah };
}

function tampilkanInspeksiDetail(langkah) {
  document.getElementById("inspectorEmpty").classList.add("d-none");
  document.getElementById("inspectorPanel").classList.remove("d-none");

  const ulPath = document.getElementById("pvList");
  ulPath.innerHTML = "";
  langkah.pathPrediksi.forEach((node, idx) => {
    const pelaku = node.color === aiColor ? "AI" : "Human";
    const li = document.createElement("li");
    li.innerHTML = `<span class="text-success fw-bold">${idx + 1}.</span> ${pelaku} ➔ <span class="text-white">${koordinatKeNotasi(node.row, node.col)}</span>`;
    ulPath.appendChild(li);
  });

  let futureBoard = cloneBoardFast(gameState.board);
  langkah.pathPrediksi.forEach((node) => {
    jalankanLangkahInPlace(futureBoard, node.row, node.col, node.color);
  });

  const realScore = evaluasiBoard(futureBoard);
  const rincian = bedahRincianEvaluasi(futureBoard, aiColor);

  document.getElementById("totalScoreInspect").innerText =
    formatSkor(langkah.skorAkhir) + " pts";
  document.getElementById("scoreDetails").innerHTML = `
    <div class="d-flex justify-content-between mb-2"><span>🔵 Material/Yugo:</span> <span class="${rincian.material >= 0 ? "text-success" : "text-danger"} fw-bold">${rincian.material > 0 ? "+" + rincian.material : rincian.material}</span></div>
    <div class="d-flex justify-content-between mb-2"><span>🎯 Area Tengah:</span> <span class="${rincian.tengah >= 0 ? "text-success" : "text-danger"} fw-bold">${Math.floor(rincian.tengah)}</span></div>
    <div class="d-flex justify-content-between font-monospace border-top border-secondary pt-2 mt-2"><span>Real Eval Output:</span> <span class="fw-bold">${formatSkor(realScore)}</span></div>
  `;
}

document.getElementById("btnPlaySimulate").addEventListener("click", () => {
  document.getElementById("boardWrapper").classList.remove("d-none");
  gameState.board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
  gameState.isGameOver = false;
  aiPhase = 0;
  evaluasiVisual = [];

  const firstTurn = document.getElementById("firstTurn").value;
  gameState.turn = firstTurn;
  document.getElementById("btnContinue").classList.add("d-none");

  gambarPapan();

  if (firstTurn === "human") {
    document.getElementById("turnIndicator").innerHTML =
      "🟢 Human's Turn (Silakan jalan)";
    document.getElementById("engineStatus").innerText = "Waiting";
  } else {
    document.getElementById("turnIndicator").innerHTML =
      "🤖 AI is Calculating...";
    document.getElementById("engineStatus").innerText = "Calculating (Depth 4)";
    setTimeout(() => {
      langkahAITerbaikGlobal = kalkulasiHeatmapUntukWarna(aiColor);
      if (langkahAITerbaikGlobal) {
        gambarPapan();
        renderSkorDiPapan();
        tampilkanInspeksiDetail(langkahAITerbaikGlobal);

        aiPhase = 1;
        const btn = document.getElementById("btnContinue");
        btn.innerText = "Place AI Piece ➔";
        btn.classList.remove("d-none");
        btn.classList.remove("btn-success");
        btn.classList.add("btn-warning");
        document.getElementById("turnIndicator").innerHTML =
          "⏸️ Silakan periksa skor, lalu klik tombol untuk meletakkan bidak.";
        document.getElementById("engineStatus").innerText =
          "Waiting for Placement";
      }
    }, 100);
  }
});