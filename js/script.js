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
const pilihanMusuh = document.getElementById("pilihanMusuh"); // Dropdown pilihan mode lawan (Local Play, AI Beginner, dst)

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
  historyStack: [], // KUNCI BARU: Menyimpan tumpukan memori setiap langkah untuk multi-undo
};

// State untuk Timer
let waktuDetikPutih;
let waktuDetikHitam;
let timerIntervalId = null;
let nilaiIncrement = 0;
let nomorLangkah = 1; // Untuk menghitung Move History (1. f2 f3, dst)

// State untuk Mode Permainan
let modeLawan = "Local Play"; // Default mode, akan diupdate saat Start Game ditekan berdasarkan pilihan dropdown
let aiColor = "black";
let humanColor = "white";
let aiSedangBerpikir = false; // Flag untuk menandai apakah AI sedang dalam proses berpikir, agar bisa dihandle dengan benar saat undo langkah di mode AI
let aiTimeoutId = null; // untuk menyimpan ID timeout AI agar bisa dibatalkan jika diperlukan

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

  // 4. AKSI HIGHLIGHT: Simpan posisi kotak terbaru ke dalam state lastMove
  gameState.lastMove = { row: row, col: col };

  // 5. CATAT MOVE HISTORY
  catatRiwayatLangkah(row, col, gameState.currentPlayer);

  // === AMBIL DATA CELL YANG SUDAH MATANG SETELAH EVALUASI YUGO ===
  const cellTerupdate = gameState.board[row][col];

  // Simpan data mekanik langkah ini ke dalam Stack sebelum turn berganti
  gameState.historyStack.push({
    row: row,
    col: col,
    player: gameState.currentPlayer,
    isYugo: cellTerupdate ? cellTerupdate.isYugo : false,
    jumlahArahYugo: cellTerupdate ? cellTerupdate.jumlahArahYugo || 0 : 0,
    migosTerhapus:
      cellTerupdate && cellTerupdate.migosTerhapus
        ? [...cellTerupdate.migosTerhapus]
        : [],
  });

  // 6. PERALIHAN TURN & TIMER INCREMENT
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

  // 7. JALANKAN LOGIKA AI SESUAI MODE BEGGINER (Random) - Posisikan di akhir handleKlikKotak agar AI berjalan setelah semua update layar selesai
  if (
    modeLawan === "AI - Beginner" &&
    gameState.gameStatus === "active" &&
    gameState.currentPlayer === aiColor &&
    !dariAI
  ) {
    jalankanAIBeginner();
  }

  // 8. JALANKAN LOGIKA AI SESUAI MODE NOVICE (Lebih "Cerdas") - Posisikan di akhir handleKlikKotak agar AI berjalan setelah semua update layar selesai
  if (
    modeLawan === "AI - Novice" &&
    gameState.gameStatus === "active" &&
    gameState.currentPlayer === aiColor &&
    !dariAI
  ) {
    jalankanAINovice();
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
  if (gameState.historyStack.length === 0) return;

  // 1. Ambil koordinat langkah terakhir yang memicu Igo
  const langkahTerakhir = gameState.historyStack.pop();
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
  gameState.igoWinningKotak = [];

  // 6. Ambil kembali Migo-Migo biasa yang sempat terhapus di virtual board
  // Berdasarkan koordinat kuning yang tersimpan di igoWinningKotak
  if (gameState.historyStack.length > 0) {
    // Intip langkah teratas saat ini di stack tanpa menghapusnya
    const langkahSebelumnya =
      gameState.historyStack[gameState.historyStack.length - 1];
    gameState.lastMove = {
      row: langkahSebelumnya.row,
      col: langkahSebelumnya.col,
    };
  } else {
    // Jika stack benar-benar habis (papan kosong), hapus highlight last-move
    gameState.lastMove = null;
  }

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

// Fungsi utama untuk menangani logika undo langkah di mode AI, dengan memperhatikan berbagai kondisi seperti apakah AI sedang berpikir, apakah langkah terakhir adalah langkah AI, dan memastikan giliran kembali ke pemain manusia setelah undo
function undoAIMode() {
  if (aiSedangBerpikir) {
    clearTimeout(aiTimeoutId);
    aiTimeoutId = null;
    aiSedangBerpikir = false;

    // Karena AI belum jalan, cukup undo langkah player terakhir
    if (gameState.historyStack.length > 0) {
      undo();
    }

    gameState.currentPlayer = humanColor;
    infoHitam.classList.remove("bg-primary");
    infoPutih.classList.add("bg-primary");

    renderBoard();
    updateDisplayWaktu();
    return;
  }

  if (gameState.historyStack.length === 0) {
    return;
  }

  if (modeLawan === "Local Play") {
    undo();
    return;
  }

  const langkahTerakhir =
    gameState.historyStack[gameState.historyStack.length - 1];

  if (langkahTerakhir.player === aiColor) {
    undo();
  }

  if (gameState.historyStack.length > 0) {
    const langkahSebelumnya =
      gameState.historyStack[gameState.historyStack.length - 1];

    if (langkahSebelumnya.player === humanColor) {
      undo();
    }
  }

  gameState.currentPlayer = humanColor;

  infoHitam.classList.remove("bg-primary");
  infoPutih.classList.add("bg-primary");

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
      undoAIMode();
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

  modeLawan = pilihanMusuh.value; // ini buat ngambil mode lawan yang dipilih di dropdown saat Start Game ditekan

  gameState.gameStatus = "active";
  switchPanels();
  moveHistory.value = "";
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

  let yugo = false;
  let migos = [];
  let longLine = false;
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
      longLine = true;
    }
  });

  // KONDISI KHUSUS BLOKIR: Jika langkah tersebut memicu Long Line DAN tidak menghasilkan Yugo sama sekali di arah lain
  if (longLine && !yugo) {
    tampilkanAlert(
      "gagal",
      "Gagal!",
      "Illegal move. You may not create a line longer than 4 of your own color",
    );
    return -1; // Kembalikan kode -1 agar handleKlikKotak membatalkan turn
  }

  if (yugo) {
    const yugoScore = jumlahMigoSejajar;

    // 1. Ubah bidak terakhir yang ditekan menjadi Yugo
    gameState.board[row][col].isYugo = true;
    gameState.board[row][col].jumlahArahYugo = jumlahMigoSejajar;
    gameState.board[row][col].migosTerhapus = migos; // KUNCI UTAMA: Simpan daftar koordinat Migo yang meledak!
    gameState.scores[color] += yugoScore; // Tambahkan skor sesuai jumlah Yugo

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

    return yugoScore; // Kembalikan nilai 1
  } else {
    gameState.board[row][col].isYugo = false;
    gameState.board[row][col].jumlahArahYugo = 0;
    gameState.board[row][col].migosTerhapus = [];

    return 0; // Kembalikan nilai 0 jika tidak terbentuk Yugo sama sekali
  }
}

function limaMigo(row, col, color) {
  const papan = [
    {
      pasang: [
        [0, 1],
        [0, -1],
      ],
    }, // Horizontal
    {
      pasang: [
        [1, 0],
        [-1, 0],
      ],
    }, // Vertikal
    {
      pasang: [
        [1, 1],
        [-1, -1],
      ],
    }, // Diagonal 1
    {
      pasang: [
        [1, -1],
        [-1, 1],
      ],
    }, // Diagonal 2
  ];

  let illegalMove = false;

  papan.forEach((p) => {
    let hitungBidak = 1; // Anggap bidak baru ditaruh di sini

    p.pasang.forEach(([dr, dc]) => {
      let r = row + dr;
      let c = col + dc;

      // Hitung semua bidak sewarna yang sudah ada di jalur ini
      while (
        r >= 0 &&
        r < 8 &&
        c >= 0 &&
        c < 8 &&
        gameState.board[r][c] !== null &&
        gameState.board[r][c].color === color
      ) {
        hitungBidak++;
        r += dr;
        c += dc;
      }
    });

    // Jika total bidak segaris melebihi 4, maka langkah ini ilegal
    if (hitungBidak > 4) {
      illegalMove = true;
    }
  });

  return illegalMove;
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
      undoAIMode(); // Jalankan fungsi undo utama
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
  gameState.historyStack = [];

  clearInterval(timerIntervalId);
  timerIntervalId = null;

  clearTimeout(aiTimeoutId);
  aiTimeoutId = null;
  aiSedangBerpikir = false;

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
