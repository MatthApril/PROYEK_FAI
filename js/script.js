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
const btnGame = document.getElementById("btnStart");
const configPanel = document.getElementById("config-panel");
const historyPanel = document.getElementById("history-panel");
const btnCopy = document.getElementById("btnCopy");

// State Utama Permainan (Sesuai struktur GameState)
let gameState = {
  board: Array(8)
    .fill(null)
    .map(() => Array(8).fill(null)), // Array 2D [baris][kolom]
  currentPlayer: "white",
  scores: { white: 0, black: 0 },
  yugo: { white: 0, black: 0 },
  gameStatus: "waiting", // 'waiting' | 'active' | 'finished'
};

// State untuk Timer
let waktuDetikPutih;
let waktuDetikHitam;
let timerIntervalId = null;
let nilaiIncrement = 0;
let nomorLangkah = 1; // Untuk menghitung Move History (1. f2 f3, dst)
let lastMove = null;
let igoWinningKotak = []; // Menampung koordinat [ {r, c}, {r, c}, ... ] untuk kotak kuning
let historyStack = []; // Menyimpan tumpukan memori setiap langkah untuk multi-undo

// Array konversi index kolom ke Huruf Notasi Catur
const indeksKeHuruf = ["a", "b", "c", "d", "e", "f", "g", "h"];

// State untuk Mode Permainan (AI)
const pilihanMusuh = document.getElementById("pilihanMusuh"); // Dropdown pilihan mode lawan (Local Play, AI Beginner, dst)
let modeLawan = "Local Play"; // Default mode, akan diupdate saat Start Game ditekan berdasarkan pilihan dropdown
let aiColor = "black";
let humanColor = "white";
let aiSedangBerpikir = false; // Flag untuk menandai apakah AI sedang dalam proses berpikir
let aiTimeoutId = null; // untuk menyimpan ID timeout AI agar bisa dibatalkan jika diperlukan

// Fungsi untuk menampilkan/menyembunyikan panel AI Settings berdasarkan pilihan opponent
function toggleAISettings() {
  const panel = document.getElementById("aiSettingsPanel");
  if (pilihanMusuh.value === "Artificial Intelligence") {
    panel.style.display = "block";
  } else {
    panel.style.display = "none";
  }
}

// Fungsi untuk update label angka depth saat slider digeser
function updateDepthLabel(value) {
  document.getElementById("depthLabel").textContent = value;
}

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

// ==========================================
// 3. GAMEPLAY & LOGIKA KLIK
// ==========================================

function handleKlikKotak(row, col, dariAI = false) {
  // tambahan parameter dariAI untuk membedakan klik manual vs AI
  if (gameState.gameStatus !== "active") {
    tampilkanAlert("gagal", "Gagal!", "Silahkan mulai game terlebih dahulu!");
    return;
  }

  // Jika mode lawan adalah AI, pastikan hanya giliran manusia yang bisa melakukan klik manual
  if (
    modeLawan !== "Local Play" &&
    gameState.currentPlayer === aiColor &&
    !dariAI
  ) {
    tampilkanAlert("gagal", "Gagal!", "Sekarang giliran AI!");
    return;
  }

  // 1. VALIDASI: Cek melalui Virtual Board, bukan HTML lagi
  if (gameState.board[row][col] !== null) {
    tampilkanAlert("gagal", "Gagal!", "Kotak sudah terisi!");
    return;
  }

  // 2. UPDATE VIRTUAL BOARD
  gameState.board[row][col] = {
    color: gameState.currentPlayer,
    isYugo: false, // Default taruh pertama kali selalu Migo biasa
    jumlahArahYugo: 0,
    migosTerhapus: [],
  };

  // 3. JALANKAN LOGIKA EVALUASI YUGO (Sekarang menyimpan angka/boolean)
  const totalYugoLangkahIni = yugo(row, col, gameState.currentPlayer);
  // Jika langkah tersebut murni Long Line (>4) tanpa menghasilkan Yugo sah di arah lain sama sekali
  if (totalYugoLangkahIni === -1) {
    // Batalkan penempatan bidak di virtual board
    gameState.board[row][col] = null;

    // Beri efek flash merah pada petak HTML
    const kotakIllegal = papanGame.querySelector(
      `[data-row="${row}"][data-col="${col}"]`,
    );
    if (kotakIllegal) {
      kotakIllegal.classList.add("illegal-move");
      setTimeout(() => {
        kotakIllegal.classList.remove("illegal-move");
      }, 1000);
    }
    return; // STOP! Langkah dibatalkan total, turn tidak berganti
  }

  // 4. AKSI HIGHLIGHT: Simpan posisi kotak terbaru ke dalam lastMove
  lastMove = { row: row, col: col };

  // 5. CATAT MOVE HISTORY
  catatRiwayatLangkah(row, col, gameState.currentPlayer);

  // === AMBIL DATA CELL YANG SUDAH MATANG SETELAH EVALUASI YUGO ===
  const cellTerupdate = gameState.board[row][col];

  // Simpan data mekanik langkah ini ke dalam Stack sebelum turn berganti
  historyStack.push({
    row: row,
    col: col,
    player: gameState.currentPlayer,
    isYugo: cellTerupdate ? cellTerupdate.isYugo : false,
    jumlahArahYugo:
      cellTerupdate && cellTerupdate.isYugo ? totalYugoLangkahIni : 0,
    migosTerhapus:
      cellTerupdate && cellTerupdate.migosTerhapus
        ? [...cellTerupdate.migosTerhapus]
        : [],
  });

  // 6. PERALIHAN TURN & TIMER INCREMENT

  if (gameState.currentPlayer === "white") {
    if (cekTimer.checked) waktuDetikPutih += nilaiIncrement;
    gameState.currentPlayer = "black";
    infoPutih.classList.remove("bg-success");
    infoHitam.classList.add("bg-success");
  } else {
    if (cekTimer.checked) waktuDetikHitam += nilaiIncrement;
    gameState.currentPlayer = "white";
    infoHitam.classList.remove("bg-success");
    infoPutih.classList.add("bg-success");
  }

  // 5. UPDATE TAMPILAN LAYAR
  updateDisplayWaktu();
  renderBoard();

  // === Evaluasi kondisi Wego Papan Penuh sebelum AI berjalan ===
  if (cekWegoPenuh()) {
    return; // Stop eksekusi jika game sudah berakhir secara Wego
  }

  // 7. JALANKAN LOGIKA AI - Posisikan di akhir handleKlikKotak agar AI berjalan setelah semua update layar selesai
  if (
    modeLawan !== "Local Play" &&
    gameState.gameStatus === "active" &&
    gameState.currentPlayer === aiColor &&
    !dariAI
  ) {
    jalankanAI();
  }
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

function undo() {
  if (historyStack.length === 0) return;

  // 1. Ambil koordinat langkah terakhir yang memicu Igo
  const langkahTerakhir = historyStack.pop();
  const rTerakhir = langkahTerakhir.row;
  const cTerakhir = langkahTerakhir.col;
  const warnaTerakhir = langkahTerakhir.player;

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

  // 3. Jika langkah yang di-undo menghasilkan Yugo, kurangi skor dan kembalikan Migo yang meledak
  if (langkahTerakhir.isYugo) {
    gameState.scores[warnaTerakhir] -= langkahTerakhir.jumlahArahYugo;

    // Kembalikan jumlah fisik Yugo (dikurangi 1)
    gameState.yugo[warnaTerakhir] -= 1;

    // Kembalikan Migo-Migo biasa yang sempat terhapus akibat ledakan Yugo ini
    langkahTerakhir.migosTerhapus.forEach((migo) => {
      gameState.board[migo.r][migo.c] = {
        color: warnaTerakhir,
        isYugo: false,
        jumlahArahYugo: 0,
        migosTerhapus: [],
      };
    });
  }

  // 4. Hapus total bidak pemicu terakhir dari virtual board
  gameState.board[rTerakhir][cTerakhir] = null;

  // 5. Bersihkan highlight hijau langkah terakhir agar kotak kembali normal!
  igoWinningKotak = [];

  // 6. Ambil kembali Migo-Migo biasa yang sempat terhapus di virtual board
  // Berdasarkan koordinat kuning yang tersimpan di igoWinningKotak
  if (historyStack.length > 0) {
    // Intip langkah teratas saat ini di stack tanpa menghapusnya
    const langkahSebelumnya = historyStack[historyStack.length - 1];
    lastMove = {
      row: langkahSebelumnya.row,
      col: langkahSebelumnya.col,
    };
  } else {
    // Jika stack benar-benar habis (papan kosong), hapus highlight last-move
    lastMove = null;
  }

  // 7. Kembalikan giliran (turn player) ke pemain yang melakukan undo tadi
  gameState.currentPlayer = warnaTerakhir;

  // Sesuaikan indikator background giliran aktif di layar
  if (warnaTerakhir === "white") {
    infoHitam.classList.remove("bg-success");
    infoPutih.classList.add("bg-success");
  } else {
    infoPutih.classList.remove("bg-success");
    infoHitam.classList.add("bg-success");
  }

  // 8. Bersihkan riwayat langkah terakhir di Textarea Move History
  let history = moveHistory.value.trim().split("\n");

  if (warnaTerakhir === "white") {
    // Jika putih yang di-undo, hapus baris angka langkah terakhirnya secara utuh
    history.pop();
  } else {
    // Karena dibatalkan, kembalikan nomorLangkah mundur 1 tingkat!
    if (nomorLangkah > 1) {
      nomorLangkah--;
    }

    if (history.length > 0) {
      let barisTerakhir = history[history.length - 1];

      // Cari posisi teks penanda nomor langkah saat ini (misal: "3. ")
      const polaNomorLangkah = `${nomorLangkah}. `;
      const indexNomor = barisTerakhir.indexOf(polaNomorLangkah);

      if (indexNomor !== -1) {
        // Ambil string dari awal baris sampai tepat setelah koordinat milik putih (5 karakter setelah nomor langkah, misal "3. e4   ")
        let panjangPutih = indexNomor + polaNomorLangkah.length + 5;
        let teksPutihSaja = barisTerakhir.substring(0, panjangPutih);

        // Ganti baris terakhir dengan milik putih saja tanpa notasi langkah hitam
        history[history.length - 1] = teksPutihSaja;
      }
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
  igoWinningKotak = [];

  const idPanel = warnaTerakhir === "white" ? "#info-putih" : "#info-hitam";
  const span = document.querySelectorAll(`${idPanel} span`);
  if (span.length >= 2) {
    span[1].innerText = `Yugos: ${gameState.yugo[warnaTerakhir]}`;
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
    const resignModalEl = document.getElementById("resignModal");
    const myModal = bootstrap.Modal.getOrCreateInstance(resignModalEl);
    myModal.show();

    // Use .onclick to ensure only ONE handler is ever bound (no stacking)
    document.getElementById("btnConfirmResign").onclick = function () {
      btnGame.innerText = "Start";
      btnGame.classList.remove("btn-dark");
      btnGame.classList.add("btn-success");

      let pesan = "";
      if (gameState.currentPlayer === "white") {
        pesan = "Black wins by resignation!";
      } else {
        pesan = "White wins by resignation!";
      }

      // Hide resign modal first, then show game over after it's fully hidden
      myModal.hide();

      resignModalEl.addEventListener("hidden.bs.modal", function onHidden() {
        resignModalEl.removeEventListener("hidden.bs.modal", onHidden);
        akhiriGame(pesan);
      });
    };
    return;
  }

  resetPapan();

  modeLawan = pilihanMusuh.value; // Ambil mode lawan yang dipilih di dropdown saat Start Game ditekan

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

    infoPutih.classList.add("bg-success");
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
      pasang: [
        [0, 1],
        [0, -1],
      ],
    },
    {
      pasang: [
        [1, 0],
        [-1, 0],
      ],
    },
    {
      pasang: [
        [1, 1],
        [-1, -1],
      ],
    },
    {
      pasang: [
        [1, -1],
        [-1, 1],
      ],
    },
  ];

  let yugo = false;
  let migos = [];
  let longLines = false;
  let jumlahMigoSejajar = 0;

  // === TAHAP 1: CEK PEMBENTUKAN YUGO DARI MIGO BIASA ===
  papan.forEach((p) => {
    let hitungBidak = 1; // Hitung bidak yang baru ditaruh saat ini
    let koordinatMigo = [];

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

        if (!gameState.board[r][c].isYugo) {
          koordinatMigo.push({ r: r, c: c });
        }

        r += dr;
        c += dc;
      }
    });

    // ATURAN GAME: Jika terbentuk minimal 4 bidak searah (sesuaikan angka 4 ini dengan mekanik aslinya)
    if (hitungBidak === 4) {
      yugo = true;
      jumlahMigoSejajar++;

      migos = migos.concat(koordinatMigo);
    } else if (hitungBidak > 4) {
      // LEBIH DARI 4 BIDAK SEJAJAR -> Menandai adanya Long Line ilegal di jalur ini
      longLines = true;
    }
  });

  // KONDISI KHUSUS BLOKIR: Jika langkah tersebut memicu Long Line DAN tidak menghasilkan Yugo sama sekali di arah lain
  if (longLines && !yugo) {
    tampilkanAlert(
      "gagal",
      "Gagal!",
      "Illegal move. You may not create a line longer than 4 of your own color",
    );
    return -1; // Kembalikan kode -1 agar handleKlikKotak membatalkan turn
  }

  if (yugo) {
    // 1. Ubah bidak terakhir yang ditekan menjadi Yugo
    gameState.board[row][col].isYugo = true;
    gameState.board[row][col].jumlahArahYugo = jumlahMigoSejajar;
    gameState.board[row][col].migosTerhapus = migos; // KUNCI UTAMA: Simpan daftar koordinat Migo yang meledak!
    gameState.scores[color] += jumlahMigoSejajar; // Tambahkan skor sesuai jumlah Yugo
    // Fisik Bidak Yugo HANYA bertambah 1, apa pun bentuk simbolnya
    gameState.yugo[color] += 1;

    // 2. MEKANIK BARU: Hapus semua Migo yang sejajar dengannya dari virtual board
    migos.forEach((migo) => {
      gameState.board[migo.r][migo.c] = null;
    });

    // SINKRONISASI TARGET SKOR HTML: Mengincar span kedua (indeks 1) di dalam id panel aktif
    const idPanel = color === "white" ? "#info-putih" : "#info-hitam";
    const span = document.querySelectorAll(`${idPanel} span`);
    if (span.length >= 2) {
      span[1].innerText = `Yugos: ${gameState.yugo[color]}`;
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
        igoWinningKotak = koordinat; // Simpan koordinat untuk kotak kuning

        // Pemicu Game Over sesuai gambar kustom kamu
        const winner = color === "white" ? "White" : "Black";
        setTimeout(() => {
          renderBoard();
          akhiriGame(`${winner} wins with an Igo!`);
        }, 100);
      }
    });

    return jumlahMigoSejajar; // Kembalikan nilai 1
  } else {
    gameState.board[row][col].isYugo = false;
    gameState.board[row][col].jumlahArahYugo = 0;
    gameState.board[row][col].migosTerhapus = [];

    return 0; // Kembalikan nilai 0 jika tidak terbentuk Yugo sama sekali
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
  gameState.gameStatus = "finished";

  // 1. Ganti teks deskripsi di dalam modal sesuai kondisi kemenangan
  const teksDeskripsiModal = document.querySelector(
    "#gameOverModal .modal-body p.fs-5",
  );

  if (teksDeskripsiModal) {
    teksDeskripsiModal.innerText = pesan;
  }

  // 2. Munculkan modal Game Over
  const modalGameOverElement = document.getElementById("gameOverModal");
  const instanceModalGameOver =
    bootstrap.Modal.getOrCreateInstance(modalGameOverElement);

  instanceModalGameOver.show();

  // 3. Tombol Review Game
  const btnReviewGame = document.getElementById("btnReviewGame");

  if (btnReviewGame) {
    btnReviewGame.onclick = function () {
      // Tutup modal Game Over
      instanceModalGameOver.hide();

      // Tampilkan panel Move History, bukan config panel
      configPanel.classList.add("d-none");
      configPanel.classList.remove("d-block");

      historyPanel.classList.add("d-block");
      historyPanel.classList.remove("d-none");

      // Pastikan papan tetap menampilkan posisi terakhir
      renderBoard();

      // Alert optional
      tampilkanAlert(
        "sukses",
        "Review Mode",
        "You can review the move history.",
      );
    };
  }

  // 4. Tombol Start kembali normal
  btnGame.innerText = "Start";
  btnGame.classList.remove("btn-dark");
  btnGame.classList.add("btn-success");

  // 5. Saat game selesai, default-nya tampilkan config panel
  // switchPanels();
}

function resetPapan() {
  // Reset Game State Data
  gameState.board = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
  gameState.currentPlayer = "white";
  gameState.gameStatus = "waiting";
  gameState.scores = { white: 0, black: 0 };
  gameState.yugo = { white: 0, black: 0 };

  lastMove = null;
  igoWinningKotak = []; // Kosongkan daftar petak kuning Igo
  historyStack = [];

  clearInterval(timerIntervalId);
  timerIntervalId = null;

  clearTimeout(aiTimeoutId);
  aiTimeoutId = null;
  aiSedangBerpikir = false;

  const menitPilihan = parseInt(menit.value);
  waktuDetikPutih = menitPilihan * 60;
  waktuDetikHitam = menitPilihan * 60;

  infoPutih.classList.remove("bg-success");
  infoHitam.classList.remove("bg-success");
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

document.addEventListener("DOMContentLoaded", () => {
  const btnImport = document.getElementById("btnImport");
  const teksInputImport = document.getElementById("teksInputImport");

  if (btnImport) {
    btnImport.addEventListener("click", () => {
      const input = teksInputImport.value.trim();

      if (!input) {
        tampilkanAlert(
          "gagal",
          "Gagal!",
          "Please paste move history or position string first",
        );
        return;
      }

      // Bersihkan papan terlebih dahulu sebelum melakukan rekonstruksi data
      resetPapan();

      // Ambil mode lawan dari dropdown agar import mempertimbangkan pemilihan opponent
      modeLawan = pilihanMusuh.value;

      // DETEKSI FORMAT: Jika mengandung tanda kunci titik dua (:), maka dibaca sebagai Position String
      if (input.includes("WM:") || input.includes("START:")) {
        eksekusiImportPositionString(input);
      } else {
        // Jika tidak, diasumsikan sebagai urutan baris Move History (Notasi Catur)
        eksekusiImportMoveHistory(input);
      }

      cekTimer.checked = false;
      aturTimer();

      // Update tombol Start menjadi Resign karena game sekarang aktif
      btnGame.textContent = "Resign";
      btnGame.classList.remove("btn-success");
      btnGame.classList.add("btn-dark");

      // Tutup modal bootstrap secara terprogram setelah berhasil diproses
      const modalImport = document.getElementById("importModal");
      const instanceModal = bootstrap.Modal.getInstance(modalImport);
      if (instanceModal) {
        instanceModal.hide();
      }

      // Bersihkan form input untuk penggunaan berikutnya
      teksInputImport.value = "";

      // Jika mode lawan AI dan giliran sekarang adalah AI, langsung jalankan AI
      if (
        modeLawan !== "Local Play" &&
        gameState.gameStatus === "active" &&
        gameState.currentPlayer === aiColor
      ) {
        jalankanAI();
      }
    });
  }
});

// Pembantu konversi dari kode notasi catur (a1-h8) ke koordinat indeks matriks array [0-7][0-7]
function konversiNotasiKeMatriks(notasi) {
  if (notasi.length < 2) return null;
  const kolomHuruf = notasi[0].toLowerCase();
  const barisAngka = parseInt(notasi[1]);

  const col = indeksKeHuruf.indexOf(kolomHuruf);
  const row = 8 - barisAngka; // Konversi baris catur ke indeks baris array top-down

  if (col === -1 || row < 0 || row > 7) return null;
  return { row, col };
}

// FORMAT 1: Eksekusi Pemuatan Menggunakan Struktur Posisi Instan (Position String)
function eksekusiImportPositionString(str) {
  try {
    const bagian = str.split(";");

    bagian.forEach((b) => {
      const [key, val] = b.split(":");
      if (!key || !val) return;

      const koordinatArray = val.split(",").filter((v) => v.trim() !== "");

      koordinatArray.forEach((notasi) => {
        // Bersihkan tanda bintang notasi bawaan jika ada
        const notasiBersih = notasi.replace(/\*/g, "");
        const pos = konversiNotasiKeMatriks(notasiBersih);

        if (pos) {
          if (key === "WM") {
            gameState.board[pos.row][pos.col] = {
              color: "white",
              isYugo: false,
              jumlahArahYugo: 0,
              migosTerhapus: [],
            };
          } else if (key === "WY") {
            gameState.board[pos.row][pos.col] = {
              color: "white",
              isYugo: true,
              jumlahArahYugo: (notasi.match(/\*/g) || []).length || 1,
              migosTerhapus: [],
            };
            gameState.yugo.white++;
          } else if (key === "BM") {
            gameState.board[pos.row][pos.col] = {
              color: "black",
              isYugo: false,
              jumlahArahYugo: 0,
              migosTerhapus: [],
            };
          } else if (key === "BY") {
            gameState.board[pos.row][pos.col] = {
              color: "black",
              isYugo: true,
              jumlahArahYugo: (notasi.match(/\*/g) || []).length || 1,
              migosTerhapus: [],
            };
            gameState.yugo.black++;
          }
        }
      });

      if (key === "START") {
        gameState.currentPlayer =
          val.toLowerCase() === "black" ? "black" : "white";
      }
    });

    // Sesuaikan panel indikator giliran aktif sesuai data START
    if (gameState.currentPlayer === "white") {
      infoHitam.classList.remove("bg-success");
      infoPutih.classList.add("bg-success");
    } else {
      infoPutih.classList.remove("bg-success");
      infoHitam.classList.add("bg-success");
    }

    gameState.gameStatus = "active";
    switchPanels();

    // Tarik nilai fisik ke bar info UI pemain
    document.querySelectorAll("#info-putih span")[1].innerText =
      `Yugos: ${gameState.yugo.white}`;
    document.querySelectorAll("#info-hitam span")[1].innerText =
      `Yugos: ${gameState.yugo.black}`;

    renderBoard();

    if (gameState.currentPlayer === "white") {
      tampilkanAlert(
        "sukses",
        "Sukses!",
        "Imported Position. Starting player: White",
      );
    } else {
      tampilkanAlert(
        "sukses",
        "Sukses!",
        "Imported Position. Starting player: Black",
      );
    }
  } catch (err) {
    tampilkanAlert(
      "gagal",
      "Gagal!",
      "Invalid move history format. Please paste the copied move history.",
    );
  }
}

// FORMAT 2: Eksekusi Pemuatan Langkah demi Langkah Menggunakan Tumpukan Riwayat (Move History)
function eksekusiImportMoveHistory(str) {
  try {
    gameState.gameStatus = "active";

    // Memisahkan teks input berdasarkan baris atau spasi kosong
    const token = str.split(/\s+/);
    let barisLangkahTeks = "";
    let jumlahLangkahSukses = 0;

    for (let i = 0; i < token.length; i++) {
      const item = token[i].trim();
      if (!item || item.match(/^\d+\.$/)) continue; // Lewati token penunjuk angka (misal: "1.", "2.")

      // 1. Hitung jumlah bintang sebelum karakternya dibersihkan
      const jumlahBintang = (item.match(/\*/g) || []).length;
      const apakahHarusYugo = jumlahBintang > 0;

      // Bersihkan karakter notasi bintang untuk mendapatkan murni koordinat petak tujuan
      const petakNotasi = item.replace(/\*/g, "");
      const pos = konversiNotasiKeMatriks(petakNotasi);

      if (pos) {
        // Simulasikan penempatan bidak asli ke atas papan virtual game
        gameState.board[pos.row][pos.col] = {
          color: gameState.currentPlayer,
          isYugo: false,
          jumlahArahYugo: 0,
          migosTerhapus: [],
        };

        // Evaluasi apakah penempatan memicu ledakan Yugo
        const totalArah = yugo(pos.row, pos.col, gameState.currentPlayer);

        if (totalArah === -1) {
          gameState.board[pos.row][pos.col] = null;
          continue; // Lewati jika langkah terdeteksi ilegal (long lines)
        }

        // === OVERRIDE FORCE STATE JIKA NOTASI MENGANDUNG BINTANG (*) ===
        if (apakahHarusYugo) {
          // Jika di langkah alami belum menjadi Yugo atau jumlah arahnya berbeda, paksa sesuai data Impor
          if (!gameState.board[pos.row][pos.col].isYugo) {
            gameState.board[pos.row][pos.col].isYugo = true;
            gameState.board[pos.row][pos.col].jumlahArahYugo = jumlahBintang;

            // Tambahkan ke statistik fisik dan skor background
            gameState.yugo[gameState.currentPlayer] += 1;
            gameState.scores[gameState.currentPlayer] += jumlahBintang;
          } else {
            // Jika secara alami sudah terdeteksi Yugo, pastikan jumlah arahnya sinkron dengan jumlah bintang
            const selisihSkor =
              jumlahBintang - gameState.board[pos.row][pos.col].jumlahArahYugo;
            gameState.scores[gameState.currentPlayer] += selisihSkor;
            gameState.board[pos.row][pos.col].jumlahArahYugo = jumlahBintang;
          }
        }

        lastMove = { row: pos.row, col: pos.col };
        jumlahLangkahSukses++;

        // Simpan data state langkah ke dalam historyStack pendukung Undo/Review
        const cellSelesai = gameState.board[pos.row][pos.col];
        historyStack.push({
          row: pos.row,
          col: pos.col,
          player: gameState.currentPlayer,
          isYugo: cellSelesai ? cellSelesai.isYugo : false,
          jumlahArahYugo: cellSelesai && cellSelesai.isYugo ? totalArah : 0,
          migosTerhapus:
            cellSelesai && cellSelesai.migosTerhapus
              ? [...cellSelesai.migosTerhapus]
              : [],
        });

        // Rekonstruksi string tulisan di Textarea Move History Panel Kanan
        if (gameState.currentPlayer === "white") {
          barisLangkahTeks += `${nomorLangkah}. ${item}   `;
          gameState.currentPlayer = "black";
        } else {
          barisLangkahTeks += `${item}\n`;
          nomorLangkah++;
          gameState.currentPlayer = "white";
        }
      }
    }

    // Masukkan rentetan notasi langkah yang sukses divalidasi ke panel history samping
    moveHistory.value = barisLangkahTeks;
    moveHistory.scrollTop = moveHistory.scrollHeight;

    // Set latar belakang indikator turn saat ini
    if (gameState.currentPlayer === "white") {
      infoHitam.classList.remove("bg-success");
      infoPutih.classList.add("bg-success");
    } else {
      infoPutih.classList.remove("bg-success");
      infoHitam.classList.add("bg-success");
    }

    // Sinkronisasi ulang tampilan angka fisik Yugo ke panel info HTML
    document.querySelectorAll("#info-putih span")[1].innerText =
      `Yugos: ${gameState.yugo.white}`;
    document.querySelectorAll("#info-hitam span")[1].innerText =
      `Yugos: ${gameState.yugo.black}`;

    switchPanels();
    renderBoard();

    tampilkanAlert(
      "sukses",
      "Sukses!",
      `Imported ${jumlahLangkahSukses} moves. You can play, undo, or review from here.`,
    );
  } catch (err) {
    tampilkanAlert(
      "gagal",
      "Gagal!",
      "Invalid move history format. Please paste the copied move history.",
    );
  }
}

if (btnCopy) {
  btnCopy.addEventListener("click", () => {
    const teksHistory = moveHistory.value.trim();

    // Validasi jika riwayat langkah masih kosong murni
    if (!teksHistory) {
      return;
    }

    tampilkanAlert("sukses", "Sukses!", "Move history copied to clipboard.");
    // Menggunakan Navigator Clipboard API modern untuk menyalin string teks
    navigator.clipboard.writeText(teksHistory).catch((err) => {
      // Fallback jika browser memblokir akses clipboard API karena masalah izin/HTTPS
      const areaTeksSementara = document.createElement("textarea");
      areaTeksSementara.value = teksHistory;
      document.body.appendChild(areaTeksSementara);
      areaTeksSementara.select();

      try {
        document.execCommand("copy");
      } catch (error) {}
      document.body.removeChild(areaTeksSementara);
    });
  });
}

// === TAMBAHAN FUNGSI BARU UNTUK DETEKSI WEGO (64 KOTAK PENUH) ===
function cekWegoPenuh() {
  let kotakTerisi = 0;

  // Hitung jumlah bidak yang ada di atas virtual board
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (gameState.board[r][c] !== null) {
        kotakTerisi++;
      }
    }
  }

  // Jika seluruh 64 petak sudah terisi penuh, jalankan evaluasi pemenang Wego
  if (kotakTerisi === 64) {
    const yugoPutih = gameState.yugo.white;
    const yugoHitam = gameState.yugo.black;

    let pesanWego = "";

    if (yugoPutih > yugoHitam) {
      pesanWego = "White wins a Wego!";
    } else if (yugoHitam > yugoPutih) {
      pesanWego = "Black wins a Wego!";
    } else {
      pesanWego = "The game is drawn!";
    }

    // Picu kemunculan modal akhir game dengan pesan penentu skor akhir
    setTimeout(() => {
      akhiriGame(pesanWego);
    }, 2000);

    return true;
  }
  return false;
}
