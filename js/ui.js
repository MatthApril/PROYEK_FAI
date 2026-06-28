// 1. Deklarasi DOM Elements
const waktuPutih = document.querySelectorAll(".waktu-putih");
const waktuHitam = document.querySelectorAll(".waktu-hitam");
const infoPutih = document.getElementById("info-putih");
const infoHitam = document.getElementById("info-hitam");
const papanGame = document.getElementById("papanGame");
const moveHistory = document.getElementById("moveHistory");
const btnGame = document.getElementById("btnStart");
const configPanel = document.getElementById("config-panel");
const historyPanel = document.getElementById("history-panel");
const btnCopy = document.getElementById("btnCopy");
const pilihanMusuh = document.getElementById("pilihanMusuh");
const pilihanGiliran = document.getElementById("pilihanGiliran");
const panelFirstMove = document.getElementById("panelFirstMove");

// 1. Fungsi Tampilan & Render
// (Pindahkan FUNGSI-FUNGSI ini secara utuh dari script.js lama Anda)
// Fungsi untuk menampilkan/menyembunyikan panel AI Settings berdasarkan pilihan opponent
function toggleAISettings() {
  const panel = document.getElementById("aiSettingsPanel");
  if (pilihanMusuh.value === "Artificial Intelligence") {
    panel.style.display = "block";
    panelFirstMove.style.display = "block"; // Tampilkan pilihan giliran duluan
  } else {
    panel.style.display = "none";
    panelFirstMove.style.display = "none"; // Sembunyikan jika Local Play
  }
}

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
    kotak.classList.remove("last-move");
    kotak.classList.remove("igo-winner"); // Bersihkan class kotak kuning pemenang lama

    //KOTAK KUNING PEMENANG: Deteksi apakah koordinat kotak ini masuk ke dalam daftar pemenang Igo
    const apakahKotakMenang = igoWinningKotak.some(
      (cell) => cell.r === r && cell.c === c,
    );
    if (apakahKotakMenang) {
      kotak.classList.add("igo-winner");
    }

    // Cek apakah kotak ini adalah tempat Migo terakhir ditaruh
    if (
      igoWinningKotak.length === 0 &&
      lastMove &&
      lastMove.row === r &&
      lastMove.col === c
    ) {
      kotak.classList.add("last-move");
    }

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
        const bidakYugoBaru = document.createElement("div");
        bidakYugoBaru.classList.add("yugo");

        // Pasang sub-class warna sesuai warna dasar bidaknya
        if (dataCell.color === "white") {
          bidakYugoBaru.classList.add("yugo-putih");
        } else {
          bidakYugoBaru.classList.add("yugo-hitam");
        }

        const arah = parseInt(dataCell.jumlahArahYugo) || 1;
        if (arah === 1) {
          bidakYugoBaru.classList.add("yugo-dot");
        } else if (arah === 2) {
          bidakYugoBaru.classList.add("yugo-oval");
        } else if (arah === 3) {
          bidakYugoBaru.classList.add("yugo-triangle");
        } else if (arah >= 4) {
          bidakYugoBaru.classList.add("yugo-square");
        }

        bidakBaru.appendChild(bidakYugoBaru);
      }

      kotak.appendChild(bidakBaru);
    }
  });
}
// Fungsi menerjemahkan koordinat matriks array ke format catur (Contoh: baris 0, kolom 0 -> a8)
function catatRiwayatLangkah(row, col, player) {
  const namaKolom = indeksKeHuruf[col];
  const namaBaris = 8 - row; // Membalik indeks array (0-7) menjadi baris papan (8-1)
  // Ambil data cell untuk mengecek jumlah Yugo
  const cellData = gameState.board[row][col];
  const statusYugo = cellData ? cellData.isYugo : false;
  let tandaYugo = "";
  if (statusYugo) {
    // Jika statusYugo bernilai boolean true atau angka, set minimal 1. Jika angka (1, 2, dst), ulangi sebanyak angka tersebut.
    const jumlahBintang = cellData.jumlahArahYugo || 1;
    tandaYugo = "*".repeat(jumlahBintang); // Menghasilkan "*" atau "**" dst
  }

  const notasiKandat = `${namaKolom}${namaBaris}${tandaYugo}`;

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

function updateDisplayWaktu() {
  waktuPutih.forEach((w) => (w.innerHTML = formatTeksWaktu(waktuDetikPutih)));
  waktuHitam.forEach((w) => (w.innerHTML = formatTeksWaktu(waktuDetikHitam)));
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

function tampilkanAlertUndo() {
  const btnUndo = document.getElementById("btnUndo");
  if (btnUndo) {
    // Menggunakan .onclick memastikan hanya ada SATU fungsi yang terikat secara global pada tombol ini
    btnUndo.onclick = function () {
      // Jika modal sedang terbuka, cari instansinya untuk disembunyikan secara aman
      const modalElement = document.getElementById("gameOverModal");
      if (modalElement && modalElement.classList.contains("show")) {
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) {
          modalInstance.hide();
        }
      }
      // Jalankan logika inti undo
      undo();
    };
  }
}
