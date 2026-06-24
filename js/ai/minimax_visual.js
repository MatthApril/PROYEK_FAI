// js/ai/minimax_visual.js

// === STATE ENGINE VISUALISASI ===
let gameState = {
  board: Array(8)
    .fill(null)
    .map(() => Array(8).fill(null)),
  turn: "black", // Default Migoyugo black/ai
  isGameOver: false,
  moveHistory: [], // Format flat array notasi: ['e6', 'd5', 'c5', 'e5*']
};

let totalNodeVisual = 0;
let waktuKalkulasiVisual = 0;
const aiColor = "black";
const humanColor = "white";
let evaluasiVisual = [];
let aiPhase = 0;
let langkahAITerbaikGlobal = null;

const indeksKeHuruf = ["a", "b", "c", "d", "e", "f", "g", "h"];

// ==========================================
// DYNAMIC UI INJECTION (TIDAK PERLU UBAH HTML)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const sidebarContainer = document.querySelector(
    ".sidebar-panel > div:first-child",
  );
  if (sidebarContainer) {
    const historyDiv = document.createElement("div");
    historyDiv.className = "mt-4";
    historyDiv.innerHTML = `
      <h6 class="text-secondary fw-bold small mb-2 d-flex align-items-center"><span class="me-2">📜</span> Move History</h6>
      <div id="moveHistoryContainer" class="bg-dark rounded border border-secondary p-2 overflow-auto font-monospace small" style="max-height: 220px;">
        <div class="text-muted text-center py-3" style="font-size: 0.8rem;">Belum ada langkah</div>
      </div>
    `;
    sidebarContainer.appendChild(historyDiv);
  }

  const modalHTML = `
    <div class="modal fade" id="importModal" tabindex="-1" aria-hidden="true" data-bs-theme="dark">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" style="background-color: #1e1e1e; border-radius: 12px; border: 1px solid #333;">
          <div class="modal-header border-0 pb-0 flex-column align-items-center mt-3">
            <h4 class="modal-title fw-bold text-light">Import Move History or Position</h4>
            <p class="text-center text-secondary small mt-2">Paste either move history or a position string below. The system will automatically detect the format.</p>
          </div>
          <div class="modal-body px-4 pb-2">
            <div class="bg-dark rounded p-3 mb-3 text-start small font-monospace border border-secondary text-light" style="font-size: 0.8rem;">
              <b class="text-success">Move History Format:</b><br>
              &nbsp;&nbsp;1. a1 &nbsp;&nbsp;&nbsp;&nbsp;b2<br>
              &nbsp;&nbsp;2. c3 &nbsp;&nbsp;&nbsp;&nbsp;d4*<br>
              &nbsp;&nbsp;3. e5** &nbsp;&nbsp;b6<br><br>
              <b class="text-success">Position String Format:</b><br>
              WM:a1,b2;WY:c3;BM:d4;BY:e5;START:white
            </div>
            <textarea id="importTextarea" class="form-control font-monospace text-sm mb-2 text-light border-secondary" rows="6" style="background-color: #2a2a2a; resize: none;" placeholder="Paste move history or position string here..."></textarea>
          </div>
          <div class="modal-footer border-0 justify-content-end px-4 pb-4">
            <button type="button" class="btn btn-outline-secondary fw-bold px-4" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-success fw-bold px-4" onclick="eksekusiImport()">Import</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  const btnImport = document.getElementById("btnImportPos");
  if (btnImport) {
    btnImport.addEventListener("click", () => {
      const modal = new bootstrap.Modal(document.getElementById("importModal"));
      document.getElementById("importTextarea").value = "";
      modal.show();
    });
  }
});

// === FORMATTING & UTILS ===
function formatSkor(skor) {
  if (skor === Infinity || skor >= 900000) return "+MATE";
  if (skor === -Infinity || skor <= -900000) return "-MATE";
  let sign = skor > 0 ? "+" : skor < 0 ? "-" : "";
  let absVal = Math.abs(Math.floor(skor));
  if (absVal >= 1000000) return sign + (absVal / 1000000).toFixed(1) + "M";
  if (absVal >= 1000) return sign + (absVal / 1000).toFixed(1) + "K";
  return sign + absVal;
}

function koordinatKeNotasi(row, col, isYugo = false) {
  return `${indeksKeHuruf[col]}${8 - row}${isYugo ? "*" : ""}`;
}

function notasiKeKoordinat(notasi) {
  const clean = notasi.replace(/\*/g, "").trim().toLowerCase();
  if (clean.length < 2) return null;
  const col = clean.charCodeAt(0) - 97;
  const row = 8 - parseInt(clean[1]);
  if (row < 0 || row > 7 || col < 0 || col > 7) return null;
  return { row, col };
}

// === FUNGSI MOVE HISTORY ===
function catatMoveHistory(row, col, isYugo) {
  const notasi = koordinatKeNotasi(row, col, isYugo);
  gameState.moveHistory.push(notasi);
  renderMoveHistoryUI();
}

function renderMoveHistoryUI() {
  const historyUI = document.getElementById("moveHistoryContainer");
  if (!historyUI) return;

  if (gameState.moveHistory.length === 0) {
    historyUI.innerHTML = `<div class="text-muted text-center py-3" style="font-size: 0.8rem;">Belum ada langkah</div>`;
    return;
  }

  let html = `<table class="table table-sm table-borderless m-0 text-light" style="font-size: 0.85rem;"><tbody>`;
  for (let i = 0; i < gameState.moveHistory.length; i += 2) {
    const turnNum = Math.floor(i / 2) + 1;
    const p1Move = gameState.moveHistory[i];
    const p2Move = gameState.moveHistory[i + 1] || "";
    html += `
      <tr>
        <td class="text-secondary text-end pe-3" style="width: 30px;">${turnNum}.</td>
        <td style="width: 40%;">${p1Move}</td>
        <td style="width: 40%;">${p2Move}</td>
      </tr>
    `;
  }
  html += `</tbody></table>`;
  historyUI.innerHTML = html;
  historyUI.scrollTop = historyUI.scrollHeight;
}

// === FUNGSI IMPORT (DARI MODAL) ===
window.eksekusiImport = function () {
  const text = document.getElementById("importTextarea").value.trim();
  if (!text) return;

  const modalEl = document.getElementById("importModal");
  const modalObj = bootstrap.Modal.getInstance(modalEl);
  if (modalObj) modalObj.hide();

  document.getElementById("boardWrapper").classList.remove("d-none");
  gameState.board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
  gameState.moveHistory = [];
  gameState.isGameOver = false;
  aiPhase = 0;
  evaluasiVisual = [];

  let importedTurnColor = null;

  if (text.includes("WM:") || text.includes("START:")) {
    const parts = text.split(";");
    parts.forEach((part) => {
      const [key, val] = part.split(":");
      if (!val) return;

      if (key === "START") {
        importedTurnColor = val.toLowerCase().trim();
      } else {
        const coords = val.split(",");
        const color = key.startsWith("W") ? "white" : "black";
        const isYugo = key.endsWith("Y");

        coords.forEach((c) => {
          const pos = notasiKeKoordinat(c);
          if (pos) {
            gameState.board[pos.row][pos.col] = {
              color: color,
              isYugo: isYugo,
              jumlahArahYugo: isYugo ? 1 : 0,
              jenisYugo: "standar",
              migosTerhapus: [],
            };
          }
        });
      }
    });
  } else {
    const regex = /[a-h][1-8]\*{0,2}/gi;
    const moves = text.match(regex) || [];

    let startingPlayer = document.getElementById("firstTurn").value;
    let giliranWarna = startingPlayer === "human" ? humanColor : aiColor;

    moves.forEach((moveNotasi) => {
      const pos = notasiKeKoordinat(moveNotasi);
      if (pos) {
        jalankanLangkahInPlace(gameState.board, pos.row, pos.col, giliranWarna);
        gameState.moveHistory.push(moveNotasi.toLowerCase());
        giliranWarna = giliranWarna === "black" ? "white" : "black";
      }
    });
    importedTurnColor = giliranWarna;
  }

  if (importedTurnColor) {
    gameState.turn = importedTurnColor === humanColor ? "human" : "ai";
  } else {
    gameState.turn = document.getElementById("firstTurn").value;
  }

  renderMoveHistoryUI();
  gambarPapan();
  document.getElementById("btnContinue").classList.add("d-none");
  document.getElementById("inspectorEmpty").classList.remove("d-none");
  document.getElementById("inspectorPanel").classList.add("d-none");

  if (gameState.turn === "ai") {
    document.getElementById("turnIndicator").innerHTML =
      "🤖 AI is Calculating (Imported)...";
    document.getElementById("engineStatus").innerText = "Calculating";
    handleKalkulasiAIGlobal();
  } else {
    document.getElementById("turnIndicator").innerHTML =
      "🟢 Human's Turn (Imported)";
    document.getElementById("engineStatus").innerText = "Waiting";
  }
};

// === [BARU] GLOBAL SCANNER UNTUK ATURAN LONG LINES (WEGO) ===
function scanDeteksiWego(board) {
  const arah = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === null) continue;
      const color = board[r][c].color;
      for (let [dr, dc] of arah) {
        let count = 1;
        let nr = r + dr;
        let nc = c + dc;
        while (
          nr >= 0 &&
          nr < 8 &&
          nc >= 0 &&
          nc < 8 &&
          board[nr][nc] !== null &&
          board[nr][nc].color === color
        ) {
          count++;
          nr += dr;
          nc += dc;
        }
        if (count > 4) {
          return { terjadi: true, color: color }; // Menemukan Long Line (>4)
        }
      }
    }
  }
  return { terjadi: false };
}

// === FUNGSI CEK GAME OVER (IGO/WEGO) ===
function periksaKemenangan(color) {
  // 1. Deteksi Kemenangan Mutlak (IGO)
  if (typeof deteksiIgo === "function" && deteksiIgo(gameState.board, color)) {
    gameState.isGameOver = true;
    const winnerName = color === aiColor ? "🤖 AI" : "🧑 Human";
    document.getElementById("turnIndicator").innerHTML =
      `🏆 GAME OVER! ${winnerName} Menang (IGO)!`;
    document.getElementById("engineStatus").innerText = "Checkmate / IGO";
    const btn = document.getElementById("btnContinue");
    if (btn) btn.classList.add("d-none");
    setTimeout(
      () => alert(`SKAKMAT! ${winnerName} memenangkan pertandingan (IGO)!`),
      100,
    );
    return true;
  }

  // 2. Deteksi Pelanggaran / Kondisi Terpaksa Long Line (WEGO)
  const resWego = scanDeteksiWego(gameState.board);
  if (resWego.terjadi) {
    gameState.isGameOver = true;
    // Pihak yang memicu long line dinyatakan kalah, lawan mendapatkan kemenangan WEGO
    const pemenangWarna = resWego.color === "white" ? "black" : "white";
    const winnerName = pemenangWarna === aiColor ? "🤖 AI" : "🧑 Human";

    document.getElementById("turnIndicator").innerHTML =
      `🏆 GAME OVER! ${winnerName} Menang (WEGO)!`;
    document.getElementById("engineStatus").innerText = "Game Over / WEGO";
    const btn = document.getElementById("btnContinue");
    if (btn) btn.classList.add("d-none");
    setTimeout(
      () => alert(`WEGO! Pertandingan berakhir karena terbentuk Long Line!`),
      100,
    );
    return true;
  }

  // 3. Deteksi Papan Terkunci / Tidak Ada Petak Kosong Lagi
  const langkahLegal = ambilSemuaLangkahLegalUntukBoard(gameState.board, color);
  if (langkahLegal.length === 0) {
    gameState.isGameOver = true;
    document.getElementById("turnIndicator").innerHTML =
      `🏆 GAME OVER! Blokade / Seri (WEGO)!`;
    document.getElementById("engineStatus").innerText = "Game Over / WEGO";
    const btn = document.getElementById("btnContinue");
    if (btn) btn.classList.add("d-none");
    setTimeout(
      () =>
        alert(
          `WEGO! Game selesai karena sudah tidak ada langkah legal yang tersisa.`,
        ),
      100,
    );
    return true;
  }

  return false;
}

// =========================================================================
// LOGIKA LEGALITAS (DIPERBAIKI UNTUK RESOLUSI ENDGAME)
// =========================================================================
function apakahLangkahLegalUntukBoard(board, row, col, color) {
  if (row < 0 || row > 7 || col < 0 || col > 7) return false;
  if (board[row][col] !== null) return false;
  // Biarkan langkah di petak kosong dinilai legal agar pemain/AI bisa melangkah,
  // jika langkah tersebut memicu long-line, mesin akan menyelesaikannya di periksaKemenangan() sebagai WEGO.
  return true;
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
        if (!board[r][c].isYugo) koordinatMigo.push({ r, c });
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
  return { terbentukYugo, jumlahArahYugo, migosTerhapus };
}

function apakahMembentukYugoUntukBoard(board, row, col, color) {
  return cekYugoSimulasi(board, row, col, color).terbentukYugo;
}

function ambilSemuaLangkahLegalUntukBoard(board, color) {
  let legal = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (apakahLangkahLegalUntukBoard(board, r, c, color))
        legal.push({ row: r, col: c });
    }
  }
  return legal;
}

function cloneBoardFast(board) {
  const newBoard = new Array(8);
  for (let r = 0; r < 8; r++) {
    newBoard[r] = new Array(8);
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (cell === null) newBoard[r][c] = null;
      else {
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

function jalankanLangkahInPlace(board, row, col, color) {
  if (!apakahLangkahLegalUntukBoard(board, row, col, color))
    return { ilegal: true };
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

    for (let i = 0; i < hasilYugo.migosTerhapus.length; i++) {
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
    for (let i = 0; i < dataYugo.migosYangDihapus.length; i++) {
      const item = dataYugo.migosYangDihapus[i];
      board[item.r][item.c] = item.data;
    }
  }
  board[row][col] = backupCell;
}

function jalankanLangkahSimulasi(board, row, col, color) {
  return !jalankanLangkahInPlace(board, row, col, color).ilegal;
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
    )
      bobot += 5000;
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
      if (cell === null) key += "O";
      else
        key +=
          (cell.color === "white" ? "W" : "B") +
          (cell.isYugo ? cell.jumlahArahYugo : "M");
    }
  }
  return key;
}

// =========================================================================
// ENGINE VISUALISASI BERBASIS PATH (MINIMAX ALPHA-BETA)
// =========================================================================
function minimaxVisualAlphaBeta(board, depth, alpha, beta, isMaximizing) {
  totalNodeVisual++;

  // Evaluasi Terminal Node 1: IGO
  if (typeof deteksiIgo === "function") {
    if (deteksiIgo(board, aiColor))
      return { score: HEURISTIC_WEIGHTS.WIN_IGO + depth, path: [] };
    if (deteksiIgo(board, humanColor))
      return { score: HEURISTIC_WEIGHTS.LOSE_IGO - depth, path: [] };
  }

  // Evaluasi Terminal Node 2: WEGO via Long Line
  const cekWego = scanDeteksiWego(board);
  if (cekWego.terjadi) {
    const scoreWego =
      cekWego.color === aiColor ? -999999 + depth : 999999 - depth;
    return { score: scoreWego, path: [] };
  }

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
    if (beta <= alpha) break;
  }
  if (jalurTerbaik.length === 0 && langkahLegal.length > 0)
    jalurTerbaik = [
      {
        row: langkahLegal[0].row,
        col: langkahLegal[0].col,
        color: colorSekarang,
      },
    ];
  return { score: skorTerbaik, path: jalurTerbaik };
}

function kalkulasiHeatmapUntukWarna(color) {
  evaluasiVisual = [];
  evaluasiCache.clear();
  totalNodeVisual = 0;
  const waktuMulai = performance.now();
  const currentDepth = 4;
  const isMaximizing = color === aiColor;

  if (typeof cariLangkahIgoLangsung === "function") {
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

    if (isMaximizing) {
      if (hasil.score > skorTertinggi) {
        skorTertinggi = hasil.score;
        langkahTerbaik = langkah;
      } else if (hasil.score === skorTertinggi && langkahTerbaik !== null) {
        if (
          typeof nilaiKontrolTengah === "function" &&
          nilaiKontrolTengah(langkah.row, langkah.col) >
            nilaiKontrolTengah(langkahTerbaik.row, langkahTerbaik.col)
        )
          langkahTerbaik = langkah;
      }
      alpha = Math.max(alpha, skorTertinggi);
    } else {
      if (hasil.score < skorTertinggi) {
        skorTertinggi = hasil.score;
        langkahTerbaik = langkah;
      } else if (hasil.score === skorTertinggi && langkahTerbaik !== null) {
        if (
          typeof nilaiKontrolTengah === "function" &&
          nilaiKontrolTengah(langkah.row, langkah.col) >
            nilaiKontrolTengah(langkahTerbaik.row, langkahTerbaik.col)
        )
          langkahTerbaik = langkah;
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

  if (!langkahTerbaik && langkahLegal.length > 0)
    langkahTerbaik = langkahLegal[0];
  waktuKalkulasiVisual = performance.now() - waktuMulai;
  return langkahTerbaik;
}

function handleKalkulasiAIGlobal() {
  setTimeout(() => {
    langkahAITerbaikGlobal = kalkulasiHeatmapUntukWarna(aiColor);
    if (langkahAITerbaikGlobal) {
      gambarPapan();
      renderSkorDiPapan();
      const selTerbaik = document.getElementById(
        `cell-${langkahAITerbaikGlobal.row}-${langkahAITerbaikGlobal.col}`,
      );
      if (selTerbaik) selTerbaik.classList.add("best-move-highlight");
      tampilkanInspeksiDetail(langkahAITerbaikGlobal);

      aiPhase = 1;
      const btn = document.getElementById("btnContinue");
      if (btn) {
        btn.innerText = "Continue ➔";
        btn.classList.remove("d-none", "btn-warning");
        btn.classList.add("btn-success");
      }
      document.getElementById("turnIndicator").innerHTML =
        "⏸️ Evaluasi selesai. Silakan periksa skor, lalu klik Continue.";
      document.getElementById("engineStatus").innerText = "Waiting for User";
    }
  }, 50);
}

// === FUNGSI RENDER TAMPILAN ===
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
    if (!apakahLangkahLegalUntukBoard(gameState.board, r, c, humanColor))
      return;

    const dataYugo = jalankanLangkahInPlace(gameState.board, r, c, humanColor);
    catatMoveHistory(r, c, dataYugo.terbentukYugo);

    // Langsung cek evaluasi kemenangan/kondisi endgame WEGO
    if (periksaKemenangan(humanColor)) {
      gambarPapan();
      return;
    }

    gameState.turn = "ai";
    evaluasiVisual = [];
    gambarPapan();
    document.getElementById("turnIndicator").innerHTML =
      "🤖 AI is Calculating...";
    document.getElementById("engineStatus").innerText = "Calculating (Depth 4)";
    handleKalkulasiAIGlobal();
  }
}

document.getElementById("btnContinue")?.addEventListener("click", () => {
  if (aiPhase === 1) {
    const dataYugo = jalankanLangkahInPlace(
      gameState.board,
      langkahAITerbaikGlobal.row,
      langkahAITerbaikGlobal.col,
      aiColor,
    );
    catatMoveHistory(
      langkahAITerbaikGlobal.row,
      langkahAITerbaikGlobal.col,
      dataYugo.terbentukYugo,
    );

    if (periksaKemenangan(aiColor)) {
      aiPhase = 0;
      evaluasiVisual = [];
      gambarPapan();
      document.getElementById("btnContinue").classList.add("d-none");
      return;
    }

    aiPhase = 0;
    gameState.turn = "human";
    evaluasiVisual = [];
    gambarPapan();
    const btn = document.getElementById("btnContinue");
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
  const humanCol = aiColor === "white" ? "black" : "white";
  let material = 0,
    tengah = 0,
    konektivitas = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      let sign = cell.color === aiColor ? 1 : -1;
      material += HEURISTIC_WEIGHTS.MIGO_BASE_VALUE * sign;
      if (cell.isYugo) {
        material +=
          HEURISTIC_WEIGHTS.YUGO_AI_VALUE * (cell.jumlahArahYugo || 1) * sign;
        if (typeof nilaiKontrolTengah === "function")
          tengah +=
            nilaiKontrolTengah(r, c) *
            HEURISTIC_WEIGHTS.CENTER_YUGO_MULTIPLIER *
            sign;
      } else {
        if (typeof nilaiKontrolTengah === "function")
          tengah +=
            nilaiKontrolTengah(r, c) *
            HEURISTIC_WEIGHTS.CENTER_MIGO_MULTIPLIER *
            sign;
      }
      if (typeof evaluasiKonektivitasLinear === "function")
        konektivitas +=
          evaluasiKonektivitasLinear(board, r, c, cell.color) *
          HEURISTIC_WEIGHTS.KONEKTIVITAS_LINEAR *
          sign;
    }
  }
  let ancaman = 0;
  if (typeof deteksiAncamanIgo === "function") {
    const ancamanAI = deteksiAncamanIgo(board, aiColor);
    const ancamanHuman = deteksiAncamanIgo(board, humanCol);
    const poinAI =
      (ancamanAI.valid !== undefined ? ancamanAI.valid : ancamanAI) *
      HEURISTIC_WEIGHTS.THREAT_AI_VALID;
    const poinHuman =
      (ancamanHuman.valid !== undefined ? ancamanHuman.valid : ancamanHuman) *
      HEURISTIC_WEIGHTS.THREAT_HUMAN_VALID;
    ancaman = poinAI - poinHuman;
  }
  return { material, tengah, konektivitas, ancaman };
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
  langkah.pathPrediksi.forEach((node) =>
    jalankanLangkahInPlace(futureBoard, node.row, node.col, node.color),
  );
  const realScore = evaluasiBoard(futureBoard);
  const rincian = bedahRincianEvaluasi(futureBoard, aiColor);
  document.getElementById("totalScoreInspect").innerText =
    formatSkor(langkah.skorAkhir) + " pts";

  document.getElementById("scoreDetails").innerHTML = `
    <div class="d-flex justify-content-between mb-2"><span>🔵 Material/Yugo:</span> <span class="${rincian.material >= 0 ? "text-success" : "text-danger"} fw-bold">${rincian.material > 0 ? "+" + rincian.material : rincian.material}</span></div>
    <div class="d-flex justify-content-between mb-2"><span>🎯 Area Tengah:</span> <span class="${rincian.tengah >= 0 ? "text-success" : "text-danger"} fw-bold">${Math.floor(rincian.tengah)}</span></div>
    <div class="d-flex justify-content-between mb-2"><span>🔗 Konektivitas:</span> <span class="${rincian.konektivitas >= 0 ? "text-success" : "text-danger"} fw-bold">${rincian.konektivitas > 0 ? "+" + rincian.konektivitas : rincian.konektivitas}</span></div>
    <div class="d-flex justify-content-between mb-2"><span>⚠️ Ancaman (Threat):</span> <span class="${rincian.ancaman >= 0 ? "text-success" : "text-danger"} fw-bold">${rincian.ancaman > 0 ? "+" + formatSkor(rincian.ancaman) : formatSkor(rincian.ancaman)}</span></div>
    <div class="d-flex justify-content-between font-monospace border-top border-secondary pt-2 mt-2"><span>Real Eval Output:</span> <span class="fw-bold">${formatSkor(realScore)}</span></div>
  `;
  const elTime = document.getElementById("evalTime");
  const elNodes = document.getElementById("evalNodes");
  if (elTime)
    elTime.innerText =
      typeof waktuKalkulasiVisual !== "undefined"
        ? waktuKalkulasiVisual.toFixed(2) + " ms"
        : "0 ms";
  if (elNodes)
    elNodes.innerText =
      typeof totalNodeVisual !== "undefined"
        ? totalNodeVisual.toLocaleString() + " nodes"
        : "0 nodes";
}

document.getElementById("btnPlaySimulate").addEventListener("click", () => {
  document.getElementById("boardWrapper").classList.remove("d-none");
  gameState.board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
  gameState.isGameOver = false;
  gameState.moveHistory = [];
  renderMoveHistoryUI();
  aiPhase = 0;
  evaluasiVisual = [];

  const firstTurn = document.getElementById("firstTurn").value;
  gameState.turn = firstTurn;
  document.getElementById("btnContinue").classList.add("d-none");
  gambarPapan();

  document.getElementById("inspectorEmpty").classList.remove("d-none");
  document.getElementById("inspectorPanel").classList.add("d-none");

  if (firstTurn === "human") {
    document.getElementById("turnIndicator").innerHTML =
      "🟢 Human's Turn (Silakan jalan)";
    document.getElementById("engineStatus").innerText = "Waiting";
  } else {
    document.getElementById("turnIndicator").innerHTML =
      "🤖 AI is Calculating...";
    document.getElementById("engineStatus").innerText = "Calculating (Depth 4)";
    handleKalkulasiAIGlobal();
  }
});
