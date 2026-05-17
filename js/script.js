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
const btnGame = document.getElementById("startGame");
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
  igoWinningKotak: [], // Menampung koordinat [ {r, c}, {r, c}, ... ] untuk kotak kuning
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
    kotak.classList.remove("last-move");
    kotak.classList.remove("igo-winner"); // Bersihkan class kotak kuning pemenang lama

    //KOTAK KUNING PEMENANG: Deteksi apakah koordinat kotak ini masuk ke dalam daftar pemenang Igo
    const apakahKotakMenang = gameState.igoWinningKotak.some(
      (cell) => cell.r === r && cell.c === c,
    );
    if (apakahKotakMenang) {
      kotak.classList.add("igo-winner");
    }

    // Cek apakah kotak ini adalah tempat Migo terakhir ditaruh
    if (
      gameState.igoWinningKotak.length === 0 &&
      gameState.lastMove &&
      gameState.lastMove.row === r &&
      gameState.lastMove.col === c
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

        bidakBaru.appendChild(bidakYugoBaru);
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

  // JALANKAN LOGIKA EVALUASI YUGO (Sekarang menyimpan angka/boolean)
  const jumlahYugo = yugo(row, col, gameState.currentPlayer);

  // AKSI HIGHLIGHT: Simpan posisi kotak terbaru ke dalam state lastMove
  gameState.lastMove = { row: row, col: col };

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
  // Ambil data cell untuk mengecek jumlah Yugo
  const statusYugo = gameState.board[row][col].isYugo;
  let tandaYugo = "";
  if (statusYugo) {
    // Jika statusYugo bernilai boolean true atau angka, set minimal 1. Jika angka (1, 2, dst), ulangi sebanyak angka tersebut.
    const jumlahBintang = typeof statusYugo === "number" ? statusYugo : 1;
    tandaYugo = " " + "*".repeat(jumlahBintang); // Menghasilkan " *" atau " **" dst
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

function undo() {
  if (gameState.igoWinningKotak.length === 0 && gameState.lastMove === null)
    return;

  // 1. Ambil koordinat langkah terakhir yang memicu Igo
  const rTerakhir = gameState.lastMove.row;
  const cTerakhir = gameState.lastMove.col;
  const warnaTerakhir = gameState.board[rTerakhir][cTerakhir].color;

  // 2. Kembalikan status permainan menjadi aktif dan hidupkan interval timer lagi
  gameState.gameStatus = "active";
  btnGame.innerText = "Resign";
  btnGame.classList.remove("btn-success");
  btnGame.classList.add("btn-dark");
  // Switch panel kembali memunculkan Move History
  switchPanels();

  if (cekTimer.checked) {
    mulaiIntervalTimer();
  }

  // 3. Hapus bidak terakhir yang baru ditaruh dari virtual board!
  const bidakTerakhir = gameState.board[rTerakhir][cTerakhir].isYugo;
  // Jika bidak terakhir yang di-undo tadi ternyata sempat bermutasi jadi Yugo, kurangi skornya
  if (bidakTerakhir) {
    const jumlahKurangSkor =
      typeof bidakTerakhir === "number" ? bidakTerakhir : 1;
    gameState.scores[warnaTerakhir] -= jumlahKurangSkor;
  }

  // 4. Hapus total bidak pemicu terakhir dari virtual board
  gameState.board[rTerakhir][cTerakhir] = null;

  // 5. Bersihkan highlight hijau langkah terakhir agar kotak kembali normal!
  gameState.lastMove = null;

  // 6. Ambil kembali Migo-Migo biasa yang sempat terhapus di virtual board
  // Berdasarkan koordinat kuning yang tersimpan di igoWinningKotak
  gameState.igoWinningKotak.forEach((kotak) => {
    // Lewati koordinat bidak terakhir karena sudah kita buat null di atas
    if (kotak.r === rTerakhir && kotak.c === cTerakhir) return;

    // Kembalikan bidak-bidak di sekitarnya menjadi Migo murni sewarna (bukan Yugo)
    gameState.board[kotak.r][kotak.c] = {
      color: warnaTerakhir,
      isYugo: false,
    };
  });

  // 7. Kembalikan giliran (turn player) ke pemain yang melakukan undo tadi
  gameState.currentPlayer = warnaTerakhir;

  // Sesuaikan indikator background giliran aktif di layar
  if (warnaTerakhir === "white") {
    infoHitam.classList.remove("bg-primary");
    infoPutih.classList.add("bg-primary");
  } else {
    infoPutih.classList.remove("bg-primary");
    infoHitam.classList.add("bg-primary");
  }

  // 8. Bersihkan riwayat langkah terakhir di Textarea Move History
  let history = moveHistory.value.trim().split("\n");

  if (warnaTerakhir === "white") {
    // Jika putih yang di-undo, hapus baris angka langkah terakhirnya secara utuh
    history.pop();
  } else {
    // Jika hitam yang di-undo, kembalikan teks ke format melangkah milik putih saja
    let barisTerakhir = history[history.length - 1];
    const polaNomorLangkah = `${nomorLangkah}. `;
    const panjangAwal =
      barisTerakhir.indexOf(polaNomorLangkah) + polaNomorLangkah.length;

    // Potong string tepat setelah 2 digit koordinat putih (misal: b7) ditambah spasi pemisah
    let putih = barisTerakhir.substring(0, panjangAwal + 5);
    history[history.length - 1] = putih;

    // Karena dibatalkan, kembalikan nomorLangkah mundur 1 tingkat!
    if (nomorLangkah > 1) {
      nomorLangkah--;
    }
  }

  // Gabungkan kembali array menjadi string teks area utuh
  if (history.length === 0 || history[0] === "") {
    moveHistory.value = "";
  } else {
    moveHistory.value =
      history.join("\n") + (warnaTerakhir === "white" ? "\n" : "");
  }

  // Auto-scroll history ke paling bawah setelah teks dimodifikasi
  moveHistory.scrollTop = moveHistory.scrollHeight;

  // 9. Bersihkan array kotak kuning pemenang dan sinkronisasi ulang teks skor di bar pemain
  gameState.igoWinningKotak = [];

  const idPanel = warnaTerakhir === "white" ? "#info-putih" : "#info-hitam";
  const span = document.querySelectorAll(`${idPanel} span`);
  if (span.length >= 2) {
    span[1].innerText = `Yugos: ${gameState.scores[warnaTerakhir]}`;
  }

  // 10. Tampilkan alert notifikasi sukses undo langkah ke layar!
  tampilkanAlert("sukses", "Sukses!", "Move undone");

  // 11. Gambar ulang seluruh papan fisik HTML & Timer
  renderBoard();
  updateDisplayWaktu();
}

function tampilkanAlertUndo() {
  const btnUndo = document.getElementById("btnUndo");
  if (btnUndo) {
    btnUndo.addEventListener("click", () => {
      undo();
    });
  }
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
        btnGame.innerText = "Start";
        btnGame.classList.remove("btn-dark");
        btnGame.classList.add("btn-success");

        let pesan = "";
        if (gameState.currentPlayer === "white") {
          pesan = "Black wins by resignation!";
        } else {
          pesan = "White wins by resignation!";
        }
        akhiriGame(pesan);

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

  btnGame.textContent = "Resign";
  btnGame.classList.remove("btn-success");
  btnGame.classList.add("btn-dark");

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

function yugo(row, col, color) {
  // 1. Horizontal (Kanan-Kiri)
  // 2. Vertikal (Atas-Bawah)
  // 3. Diagonal Utama (TopLeft - BottomRight)
  // 4. Diagonal Kedua (TopRight - BottomLeft)
  const papan = [
    {
      nama: "Horizontal",
      pasang: [
        [0, 1],
        [0, -1],
      ],
    },
    {
      nama: "Vertikal",
      pasang: [
        [1, 0],
        [-1, 0],
      ],
    },
    {
      nama: "Diagonal 1",
      pasang: [
        [1, 1],
        [-1, -1],
      ],
    },
    {
      nama: "Diagonal 2",
      pasang: [
        [1, -1],
        [-1, 1],
      ],
    },
  ];

  let yugo = 0;
  let migos = [];

  // === TAHAP 1: CEK PEMBENTUKAN YUGO DARI MIGO BIASA ===
  papan.forEach((p) => {
    let hitungBidak = 1; // Hitung bidak yang baru ditaruh saat ini
    let koordinat = [];

    p.pasang.forEach(([dr, dc]) => {
      let r = row + dr;
      let c = col + dc;

      // Terus berjalan ke arah tersebut selama warnanya sama dan masih di dalam papan
      while (
        r >= 0 &&
        r < 8 &&
        c >= 0 &&
        c < 8 &&
        gameState.board[r][c] !== null &&
        gameState.board[r][c].color === color
      ) {
        hitungBidak++;

        // JIKA BUKAN YUGO, baru masukkan ke daftar yang boleh dihapus
        if (!gameState.board[r][c].isYugo) {
          koordinat.push({ r: r, c: c });
        }

        r += dr;
        c += dc;
      }
    });

    // ATURAN GAME: Jika terbentuk minimal 4 bidak searah (sesuaikan angka 4 ini dengan mekanik aslinya)
    if (hitungBidak >= 4) {
      yugo++;

      migos = migos.concat(koordinat);
    }
  });

  if (yugo > 0) {
    // 1. Ubah bidak terakhir yang ditekan menjadi Yugo
    gameState.board[row][col].isYugo = yugo;
    gameState.scores[color] += yugo; // Tambahkan skor sesuai jumlah Yugo

    // 2. MEKANIK BARU: Hapus semua Migo yang sejajar dengannya dari virtual board
    migos.forEach((migo) => {
      gameState.board[migo.r][migo.c] = null;
    });

    // SINKRONISASI TARGET SKOR HTML: Mengincar span kedua (indeks 1) di dalam id panel aktif
    const idPanel = color === "white" ? "#info-putih" : "#info-hitam";
    const span = document.querySelectorAll(`${idPanel} span`);
    if (span.length >= 2) {
      span[1].innerText = `Yugos: ${gameState.scores[color]}`;
    }

    // === TAHAP 2: CEK KONDISI MENANG / IGO (4 YUGO SEJAJAR) ===
    // Kita cek dari posisi Yugo yang BARU SAJA meledak ini
    papan.forEach((p) => {
      let hitungYugo = 1;
      let koordinat = [{ r: row, c: col }];

      p.pasang.forEach(([dr, dc]) => {
        let r = row + dr;
        let c = col + dc;

        // Berjalan mengecek sepanjang arah mata angin, khusus mencari yang ISYUGO === TRUE
        while (
          r >= 0 &&
          r < 8 &&
          c >= 0 &&
          c < 8 &&
          gameState.board[r][c] !== null &&
          gameState.board[r][c].color === color &&
          gameState.board[r][c].isYugo
        ) {
          hitungYugo++;

          koordinat.push({ r: r, c: c });

          r += dr;
          c += dc;
        }
      });

      // KONDISI MENANG: Jika terdeteksi ada 4 Yugo sewarna yang berjejer lurus!
      if (hitungYugo >= 4) {
        gameState.igoWinningKotak = koordinat; // Simpan koordinat untuk kotak kuning

        // Pemicu Game Over sesuai gambar kustom kamu
        const winner = color === "white" ? "White" : "Black";
        setTimeout(() => {
          renderBoard();
          akhiriGame(`${winner} wins with an Igo!`);
        }, 100);
      }
    });
  } else {
    gameState.board[row][col].isYugo = false;
  }

  return yugo; // Return jumlah Yugo agar bisa dibaca langsung oleh handleKlikKotak
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
  gameState.gameStatus = "finished";

  // 1. Ganti teks deskripsi di dalam modal sesuai kondisi kemenangan
  const teksDeskripsiModal = document.querySelector(
    "#gameOverModal .modal-body p.fs-5",
  );
  if (teksDeskripsiModal) {
    teksDeskripsiModal.innerText = pesan;
  }

  // 2. Munculkan modal Game Over ke layar secara resmi
  const modalGameOverElement = document.getElementById("gameOverModal");
  const instanceModalGameOver = new bootstrap.Modal(modalGameOverElement);
  instanceModalGameOver.show();

  const btnUndoModal = document.getElementById("btnUndo");
  if (btnUndoModal) {
    btnUndoModal.onclick = function () {
      undo(); // Jalankan fungsi undo utama
      instanceModalGameOver.hide(); // Sembunyikan modal setelah di-undo
    };
  }

  // 3. Ubah tombol kontrol kanan kembali ke sedia kala
  btnGame.innerText = "Start";
  btnGame.classList.remove("btn-dark");
  btnGame.classList.add("btn-success");

  if (gameState.gameStatus !== "finished") {
    switchPanels();
  }
}

function resetPapan() {
  // Reset Game State Data
  gameState.board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
  gameState.currentPlayer = "white";
  gameState.gameStatus = "waiting";
  gameState.lastMove = null;
  gameState.scores = { white: 0, black: 0 };
  gameState.igoWinningKotak = []; // Kosongkan daftar petak kuning Igo

  clearInterval(timerIntervalId);
  timerIntervalId = null;

  const menitPilihan = parseInt(menit.value);
  waktuDetikPutih = menitPilihan * 60;
  waktuDetikHitam = menitPilihan * 60;

  infoPutih.classList.remove("bg-primary");
  infoHitam.classList.remove("bg-primary");
  moveHistory.value = "";
  nomorLangkah = 1;

  btnGame.innerText = "Start";
  btnGame.classList.remove("btn-dark");
  btnGame.classList.add("btn-success");

  const scoresPutih = document.querySelectorAll("#info-putih span");
  const scoresHitam = document.querySelectorAll("#info-hitam span");
  if (scoresPutih.length >= 2) scoresPutih[1].innerText = "Yugos: 0";
  if (scoresHitam.length >= 2) scoresHitam[1].innerText = "Yugos: 0";

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
tampilkanAlertUndo();
