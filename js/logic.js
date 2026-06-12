// === js/logic.js ===

// (Pindahkan FUNGSI-FUNGSI ini secara utuh dari script.js lama Anda)
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
    jenisYugo: null,
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

  // Jika koordinat pemenang Igo terisi, artinya game SEHARUSNYA SELESAI.
  // Jangan lanjutkan turn, jangan picu AI, langsung keluar dari fungsi saat ini juga!
  if (igoWinningKotak.length >= 4) {
    return;
  }

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
    // Menentukan jenisYugo berdasarkan total jumlah arah garis yang terbentuk (1 sampai 4)
    let jenisBentuk = "standar";
    if (jumlahMigoSejajar === 2) {
      jenisBentuk = "oval";
    } else if (jumlahMigoSejajar === 3) {
      jenisBentuk = "segitiga";
    } else if (jumlahMigoSejajar === 4) {
      jenisBentuk = "persegi";
    }
    gameState.board[row][col].jenisYugo = jenisBentuk; // Simpan tipe ke cell board

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
    gameState.board[row][col].jenisYugo = null;
    gameState.board[row][col].jumlahArahYugo = 0;
    gameState.board[row][col].migosTerhapus = [];

    return 0; // Kembalikan nilai 0 jika tidak terbentuk Yugo sama sekali
  }
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
    let skorYugoPutih = 0;
    let skorYugoHitam = 0;

    // Hitung bobot nilai Yugo dari papan langsung
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const bidak = gameState.board[r][c];

        if (bidak && bidak.isYugo) {
          // Ambil jenisYugo dari properti bidak (pastikan saat yugo terbentuk, properti jenisYugo diisi string: "standar"/"oval"/"segitiga"/"persegi")
          // Default ke "standar" jika properti belum terdefinisi
          const jenis =
            bidak.jenisYugo ||
            dapatkanTipeYugoBerdasarkanArah(bidak.jumlahArahYugo);
          const bobotSkor = HEURISTIC_WEIGHTS.YUGO_TIERS[jenis] || 1;

          if (bidak.color === "white") {
            skorYugoPutih += bobotSkor;
          } else if (bidak.color === "black") {
            skorYugoHitam += bobotSkor;
          }
        }
      }
    }

    let pesanWego = "";

    // Penentuan pemenang berdasarkan total akumulasi bobot jenis Yugo
    if (skorYugoPutih > skorYugoHitam) {
      pesanWego = "White wins a Wego!";
    } else if (skorYugoHitam > skorYugoPutih) {
      pesanWego = "Black wins a Wego!";
    } else {
      if (yugoPutih > yugoHitam) {
        pesanWego = "White wins a Wego!";
      } else if (yugoHitam > yugoPutih) {
        pesanWego = "Black wins a Wego!";
      } else {
        pesanWego = "The game is drawn!";
      }
    }

    // Picu kemunculan modal akhir game dengan pesan penentu skor akhir
    setTimeout(() => {
      akhiriGame(pesanWego);
    }, 2000);

    return true;
  }
  return false;
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
        jenisYugo: null,
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

  if (modeLawan === "Artificial Intelligence") {
    if (pilihanGiliran.value === "ai") {
      aiColor = "white"; // AI jalan duluan (White)
    } else {
      aiColor = "black"; // User jalan duluan (White), AI menjadi Black
    }
  }

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

  if (modeLawan === "Artificial Intelligence" && aiColor === "white") {
    setTimeout(() => {
      jalankanAI();
    }, 500); // Beri sedikit delay agar UI render awal selesai
  }
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

  infoHitam.classList.remove("bg-success");
  infoPutih.classList.remove("bg-success");

  switchPanels();

  // Render ulang papan yang kosong
  renderBoard();
  updateDisplayWaktu();
}
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
              jenisYugo: dapatkanTipeYugoBerdasarkanArah(jumlahArah),
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
              jenisYugo: dapatkanTipeYugoBerdasarkanArah(jumlahArah),
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
            gameState.board[pos.row][pos.col].jenisYugo =
              dapatkanTipeYugoBerdasarkanArah(jumlahBintang);

            // Tambahkan ke statistik fisik dan skor background
            gameState.yugo[gameState.currentPlayer] += 1;
            gameState.scores[gameState.currentPlayer] += jumlahBintang;
          } else {
            // Jika secara alami sudah terdeteksi Yugo, pastikan jumlah arahnya sinkron dengan jumlah bintang
            const selisihSkor =
              jumlahBintang - gameState.board[pos.row][pos.col].jumlahArahYugo;
            gameState.scores[gameState.currentPlayer] += selisihSkor;
            gameState.board[pos.row][pos.col].jumlahArahYugo = jumlahBintang;
            gameState.board[pos.row][pos.col].jenisYugo =
              dapatkanTipeYugoBerdasarkanArah(jumlahBintang);
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

// ==========================================
// ATURAN LEGALITAS & PENGECEKAN LANGKAH (Masukkan ke js/logic.js)
// ==========================================

function ambilSemuaLangkahLegal(color) {
  return ambilSemuaLangkahLegalUntukBoard(gameState.board, color);
}

function apakahLangkahLegal(row, col, color) {
  return apakahLangkahLegalUntukBoard(gameState.board, row, col, color);
}

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

  for (const pasangArah of arah) {
    let hitungBidak = 1;
    let hitungYugoLama = 0;

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

        // Hitung jumlah Yugo fisik yang sudah berdiri di jalur ini
        if (board[r][c].isYugo) {
          hitungYugoLama++;
        }

        r += dr;
        c += dc;
      }
    });

    if (hitungBidak === 4) {
      adaYugoSah = true;
    }

    // Rule: No Long Lines
    if (hitungBidak > 4 || hitungYugoLama >= 4) {
      return false;
    }
  }

  if (adaLongLine && !adaYugoSah) {
    return false;
  }

  return true;
}
function apakahMembentukYugo(row, col, color) {
  return apakahMembentukYugoUntukBoard(gameState.board, row, col, color);
}

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
function dapatkanTipeYugoBerdasarkanArah(jumlahArah) {
  const arah = parseInt(jumlahArah) || 1;
  if (arah === 2) return "oval";
  if (arah === 3) return "segitiga";
  if (arah === 4) return "persegi";
  return "standar";
}
