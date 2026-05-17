// ==========================================
// 1. INITIAL SETUP & STATE MANAGEMENT
// ==========================================

const cekTimer = document.getElementById("cekTimer");
const waktuPutih = document.querySelectorAll(".waktu-putih");
const waktuHitam = document.querySelectorAll(".waktu-hitam");
const timerSetting = document.getElementById("timerSetting");
const menit = document.getElementById("menit");
const increment = document.getElementById("increment");
const infoPutih = document.getElementById("info-putih");
const infoHitam = document.getElementById("info-hitam");
const papanGame = document.getElementById("papanGame");
const moveHistory = document.getElementById("moveHistory"); // Textarea Move History
const tombolGame = document.getElementById("start");
const configPanel = document.getElementById("config-panel");
const historyPanel = document.getElementById("history-panel");

// State Utama Permainan (Sesuai struktur GameState)
let gameState = {
  board: Array(8)
    .fill(null)
    .map(() => Array(8).fill(null)), // Array 2D [baris][kolom]
  currentPlayer: "white",
  scores: { white: 0, black: 0 },
  gameStatus: "waiting", // 'waiting' | 'active' | 'finished'
  lastMove: null,
};

// State untuk Timer
let waktuDetikPutih;
let waktuDetikHitam;
let timerIntervalId = null;
let nilaiIncrement = 0;
let nomorLangkah = 1; // Untuk menghitung Move History (1. f2 f3, dst)

// Array konversi index kolom ke Huruf Notasi Catur
const indeksKeHuruf = ["a", "b", "c", "d", "e", "f", "g", "h"];

// ==========================================
// 2. LOGIKA GENERATE & RENDER BOARD
// ==========================================

// Fungsi untuk membuat elemen kotak HTML secara dinamis berdasarkan susunan matriks
function inisialisasiPapanFisik() {
  // Bersihkan kotak lama jika ada (tanpa menghapus angka/huruf overlay)
  const kotakLama = papanGame.querySelectorAll(".kotak");
  kotakLama.forEach((k) => k.remove());

  // Di Migoyugo / Catur, baris di render dari atas (Baris 8) ke bawah (Baris 1)
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const kotak = document.createElement("div");
      kotak.classList.add("kotak");

      // Simpan koordinat matriks di dalam dataset HTML elemen
      kotak.dataset.row = r;
      kotak.dataset.col = c;

      // Event listener saat petak diklik
      kotak.addEventListener("click", () => handleKlikKotak(r, c));

      papanGame.appendChild(kotak);
    }
  }
}

// Fungsi RE-RENDER: Menggambar ulang isi papan HTML berdasarkan data di gameState.board
function renderBoard() {
  const semuaKotak = papanGame.querySelectorAll(".kotak");

  semuaKotak.forEach((kotak) => {
    const r = parseInt(kotak.dataset.row);
    const c = parseInt(kotak.dataset.col);
    const dataCell = gameState.board[r][c];

    // Bersihkan isi kotak terlebih dahulu
    kotak.innerHTML = "";

    // Jika di virtual board ada bidak, gambar ke HTML
    if (dataCell !== null) {
      const bidakBaru = document.createElement("div");
      bidakBaru.classList.add("migo");

      if (dataCell.color === "white") {
        bidakBaru.classList.add("migo-putih");
      } else {
        bidakBaru.classList.add("migo-hitam");
      }

      // Jika statusnya sudah menjadi Yugo, tambahkan dot merah/hitam di tengahnya
      if (dataCell.isYugo) {
        bidakBaru.classList.add("yugo"); // Pastikan Anda menghandle class .yugo di CSS nanti
      }

      kotak.appendChild(bidakBaru);
    }
  });
}

// ==========================================
// 3. GAMEPLAY & LOGIKA KLIK
// ==========================================

function handleKlikKotak(row, col) {
  if (gameState.gameStatus !== "active") {
    tampilkanAlert("gagal", "Gagal!", "Silahkan mulai game terlebih dahulu!");
    return;
  }

  // 1. VALIDASI: Cek melalui Virtual Board, bukan HTML lagi
  if (gameState.board[row][col] !== null) {
    tampilkanAlert("gagal", "Gagal!", "Kotak sudah terisi!");
    return;
  }

  // TODO KEDEPANNYA: Taruh validasi aturan "No Long Lines" di sini sebelum bidak ditaruh!

  // 2. UPDATE VIRTUAL BOARD
  gameState.board[row][col] = {
    color: gameState.currentPlayer,
    isYugo: false, // Default taruh pertama kali selalu Migo biasa
  };

  // 3. CATAT MOVE HISTORY
  catatRiwayatLangkah(row, col, gameState.currentPlayer);

  // TODO KEDEPANNYA: Taruh fungsi cek formasi 4 Migo -> Transformasi ke Yugo di sini!

  // 4. PERALIHAN TURN & TIMER INCREMENT
  if (gameState.currentPlayer === "white") {
    if (cekTimer.checked) waktuDetikPutih += nilaiIncrement;
    gameState.currentPlayer = "black";
    infoPutih.classList.remove("bg-primary");
    infoHitam.classList.add("bg-primary");
  } else {
    if (cekTimer.checked) waktuDetikHitam += nilaiIncrement;
    gameState.currentPlayer = "white";
    infoHitam.classList.remove("bg-primary");
    infoPutih.classList.add("bg-primary");
  }

  // 5. UPDATE TAMPILAN LAYAR
  updateDisplayWaktu();
  renderBoard();
}

// Fungsi menerjemahkan koordinat matriks array ke format catur (Contoh: baris 0, kolom 0 -> a8)
function catatRiwayatLangkah(row, col, player) {
  const namaKolom = indeksKeHuruf[col];
  const namaBaris = 8 - row; // Membalik indeks array (0-7) menjadi baris papan (8-1)
  const notasiKandat = `${namaKolom}${namaBaris}`;

  if (player === "white") {
    // Putih melangkah -> Buat baris langkah baru di textarea
    moveHistory.value += `${nomorLangkah}. ${notasiKandat}   `;
  } else {
    // Hitam melangkah -> Lengkapi baris langkah putih, lalu pindah baris baru
    moveHistory.value += `${notasiKandat}\n`;
    nomorLangkah++;
  }

  // Auto scroll textarea ke paling bawah saat history penuh
  moveHistory.scrollTop = moveHistory.scrollHeight;
}

// ==========================================
// 4. LOGIKA TIMER & CONTROL BUTTONS
// ==========================================

function aturTimer() {
  if (cekTimer.checked) {
    waktuPutih.forEach((w) => (w.style.display = "block"));
    waktuHitam.forEach((w) => (w.style.display = "block"));
    timerSetting.style.display = "grid";
  } else {
    waktuPutih.forEach((w) => (w.style.display = "none"));
    waktuHitam.forEach((w) => (w.style.display = "none"));
    timerSetting.style.display = "none";
  }
}

function formatTeksWaktu(detik) {
  const m = Math.floor(detik / 60);
  const s = detik % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function updateDisplayWaktu() {
  waktuPutih.forEach((w) => (w.innerHTML = formatTeksWaktu(waktuDetikPutih)));
  waktuHitam.forEach((w) => (w.innerHTML = formatTeksWaktu(waktuDetikHitam)));
}

function startGame() {
  if (gameState.gameStatus === "active") {
    const myModal = new bootstrap.Modal(document.getElementById("resignModal"));
    myModal.show();

    document
      .getElementById("btnConfirmResign")
      .addEventListener("click", function () {
        // Kembalikan tampilan tombol utama ke posisi "Start"
        tombolGame.innerText = "Start";
        tombolGame.classList.remove("btn-dark");
        tombolGame.classList.add("btn-success");

        akhiriGame("Black wins by resignation!");

        // 3. Hentikan timer permainanmu di sini (misal: clearInterval, dll.)
        // hentikanTimer();

        // 4. Tutup modal secara otomatis setelah menyerah
        const modalElement = document.getElementById("resignModal");
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        modalInstance.hide();
      });
    return;
  }

  resetPapan();
  gameState.gameStatus = "active";
  switchPanels();
  moveHistory.value = ""; // Reset papan history teks
  nomorLangkah = 1;

  const btnStart = document.getElementById("start");
  btnStart.textContent = "Resign";
  btnStart.classList.remove("btn-success");
  btnStart.classList.add("btn-dark");

  if (cekTimer.checked) {
    const menitPilihan = parseInt(menit.value);
    nilaiIncrement = parseInt(increment.value);

    waktuDetikPutih = menitPilihan * 60;
    waktuDetikHitam = menitPilihan * 60;

    infoPutih.classList.add("bg-primary");
    updateDisplayWaktu();
    mulaiIntervalTimer();
  }
}

function switchPanels() {
  if (gameState.gameStatus === "active") {
    configPanel.classList.add("d-none");
    configPanel.classList.remove("d-block");
    historyPanel.classList.add("d-block");
    historyPanel.classList.remove("d-none");
  } else if (gameState.gameStatus === "waiting") {
    configPanel.classList.add("d-block");
    configPanel.classList.remove("d-none");
    historyPanel.classList.add("d-none");
    historyPanel.classList.remove("d-block");
  } else if (gameState.gameStatus === "finished") {
    configPanel.classList.add("d-block");
    configPanel.classList.remove("d-none");
    historyPanel.classList.add("d-none");
    historyPanel.classList.remove("d-block");
  }
}

function mulaiIntervalTimer() {
  clearInterval(timerIntervalId);
  timerIntervalId = setInterval(function () {
    if (gameState.currentPlayer === "white") {
      waktuDetikPutih--;
      if (waktuDetikPutih <= 0) {
        akhiriGame("Waktu Putih habis! Hitam Menang.");
        resetPapan();
      }
    } else {
      waktuDetikHitam--;
      if (waktuDetikHitam <= 0) {
        akhiriGame("Waktu Hitam habis! Putih Menang.");
        resetPapan();
      }
    }
    updateDisplayWaktu();
  }, 1000);
}

function akhiriGame(pesan) {
  clearInterval(timerIntervalId);
  tampilkanAlert("gagal", "Game Over!", pesan);
  gameState.gameStatus = "finished";
}

function resetPapan() {
  // Reset Game State Data
  gameState.board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
  gameState.currentPlayer = "white";
  gameState.gameStatus = "waiting";
  gameState.lastMove = null;

  clearInterval(timerIntervalId);
  timerIntervalId = null;

  const menitPilihan = parseInt(menit.value);
  waktuDetikPutih = menitPilihan * 60;
  waktuDetikHitam = menitPilihan * 60;

  infoPutih.classList.remove("bg-primary");
  infoHitam.classList.remove("bg-primary");
  moveHistory.value = "";
  nomorLangkah = 1;

  tombolGame.innerText = "Start";
  tombolGame.classList.remove("btn-dark");
  tombolGame.classList.add("btn-success");

  switchPanels();

  // Render ulang papan yang kosong
  renderBoard();
  updateDisplayWaktu();
}

function tampilkanAlert(status, judul, pesan) {
  const alertCopy = document.getElementById("alertCopy");
  const ikonAlert = alertCopy.querySelector(".alert-icon");
  const judulAlert = document.getElementById("alertJudul");
  const pesanAlert = document.getElementById("alertPesan");

  ikonAlert.innerText = status === "sukses" ? "✅" : "❌";
  judulAlert.innerText = judul;
  pesanAlert.innerText = pesan;

  alertCopy.style.borderLeftColor = status === "sukses" ? "#27a844" : "#ff4b4b";
  alertCopy.classList.add("muncul");

  setTimeout(() => alertCopy.classList.remove("muncul"), 2000);
}

// Event Listeners
cekTimer.addEventListener("change", aturTimer);
menit.addEventListener("change", function () {
  if (gameState.gameStatus === "waiting") {
    waktuDetikPutih = parseInt(menit.value) * 60;
    waktuDetikHitam = parseInt(menit.value) * 60;
    updateDisplayWaktu();
  }
});

// Jalankan Fungsi Inisialisasi Papan Pertama Kali Saat Website Dibuka
inisialisasiPapanFisik();
aturTimer();
