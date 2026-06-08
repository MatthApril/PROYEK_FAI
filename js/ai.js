let aiSedangBerpikir = false;
let aiTimeoutId = null;

const aiColor = "black";
const humanColor = "white";

function jalankanAIBeginner() {
  aiSedangBerpikir = true; // ai sedang mikir

  aiTimeoutId = setTimeout(() => {
    const langkahLegal = ambilSemuaLangkahLegal(aiColor); // ambil semua langkah legal untuk board asli, karena Beginner cuma lihat langkah legal tanpa simulasi

    if (langkahLegal.length === 0) {
      akhiriGame("AI tidak memiliki langkah legal. White wins!"); // ini semisal sudah tidak ada langkah legal, player menang
      aiSedangBerpikir = false; // pastikan untuk set AI tidak sedang berpikir lagi
      aiTimeoutId = null; // reset timeout ID
      return;
    }

    const langkahYugo = langkahLegal.filter(
      (langkah) => apakahMembentukYugo(langkah.row, langkah.col, aiColor), // ai check adakah langkah yang bisa bikin yugo
    );

    let langkahDipilih;

    // Beginner: kalau ada peluang Yugo, 70% ambil. Sisanya random.
    if (langkahYugo.length > 0 && Math.random() < 0.7) {
      const indexRandom = Math.floor(Math.random() * langkahYugo.length);
      langkahDipilih = langkahYugo[indexRandom];
    } else {
      const indexRandom = Math.floor(Math.random() * langkahLegal.length);
      langkahDipilih = langkahLegal[indexRandom];
    }

    aiSedangBerpikir = false;
    aiTimeoutId = null;

    handleKlikKotak(langkahDipilih.row, langkahDipilih.col, true);
  }, 500);
}

function jalankanAINovice() {
  // novice lebih tinggi karena sudah pakai minmax
  aiSedangBerpikir = true;

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

    const langkahYugoLangsung = langkahLegal.filter(
      (
        langkah, // ini berfungsi untuk mencari langkah yang bisa langsung membentuk Yugo tanpa simulasi, karena kalau langsung Yugo kan pasti bagus banget buat AI
      ) =>
        apakahMembentukYugoUntukBoard(
          gameState.board,
          langkah.row,
          langkah.col,
          aiColor,
        ),
    );

    if (langkahYugoLangsung.length > 0) {
      const indexRandom = Math.floor(
        Math.random() * langkahYugoLangsung.length,
      );
      const langkahDipilih = langkahYugoLangsung[indexRandom];

      aiSedangBerpikir = false;
      aiTimeoutId = null;

      handleKlikKotak(langkahDipilih.row, langkahDipilih.col, true);
      return;
    }

    let langkahTerbaik = null;
    let skorTerbaik = -Infinity;

    langkahLegal.forEach((langkah) => {
      const boardSimulasi = cloneBoard(gameState.board);

      jalankanLangkahSimulasi(boardSimulasi, langkah.row, langkah.col, aiColor);

      const skor = minimaxNovice(boardSimulasi, 1, false); // ini bagian minmaxnya

      if (skor > skorTerbaik) {
        skorTerbaik = skor;
        langkahTerbaik = langkah;
      }
    });

    if (Math.random() < 0.15) {
      // random nya 15%
      const indexRandom = Math.floor(Math.random() * langkahLegal.length);
      langkahTerbaik = langkahLegal[indexRandom];
    }

    aiSedangBerpikir = false;
    aiTimeoutId = null;

    handleKlikKotak(langkahTerbaik.row, langkahTerbaik.col, true);
  }, 500);
}

function minimaxNovice(board, depth, isMaximizing) {
  if (depth === 0) {
    return evaluasiBoardNovice(board);
  }

  const colorSekarang = isMaximizing ? aiColor : humanColor;
  const langkahLegal = ambilSemuaLangkahLegalUntukBoard(board, colorSekarang);

  if (langkahLegal.length === 0) {
    return evaluasiBoardNovice(board);
  }

  if (isMaximizing) {
    // Giliran AI: cari skor terbesar
    let skorTerbaik = -Infinity; // ini artinya AI mau cari skor terbesar, jadi mulai dari -Infinity supaya semua skor yang muncul nanti pasti lebih besar

    langkahLegal.forEach((langkah) => {
      const boardSimulasi = cloneBoard(board);

      jalankanLangkahSimulasi(
        boardSimulasi,
        langkah.row,
        langkah.col,
        colorSekarang,
      );

      const skor = minimaxNovice(boardSimulasi, depth - 1, false);
      skorTerbaik = Math.max(skorTerbaik, skor);
    });

    return skorTerbaik;
  } else {
    // Giliran human: diasumsikan human memilih langkah yang merugikan AI
    let skorTerbaik = Infinity;

    langkahLegal.forEach((langkah) => {
      const boardSimulasi = cloneBoard(board);

      jalankanLangkahSimulasi(
        boardSimulasi,
        langkah.row,
        langkah.col,
        colorSekarang,
      );

      const skor = minimaxNovice(boardSimulasi, depth - 1, true);
      skorTerbaik = Math.min(skorTerbaik, skor);
    });

    return skorTerbaik;
  }
}

function evaluasiBoardNovice(board) {
  // ini menggunakan heuristik buat evaluasi gerakan board nya
  let skor = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c]; // ini ukuran board nya 8x8, jadi r dan c itu buat iterasi semua kotak di board, terus cek isinya buat nilai skor

      if (cell === null) continue;

      if (cell.color === aiColor) {
        // Bidak AI bernilai positif
        skor += 5;

        // Yugo AI lebih berharga
        if (cell.isYugo) {
          skor += 40;
        }

        // Posisi tengah lebih bagus
        skor += nilaiKontrolTengah(r, c);

        // Bidak yang dekat dengan teman sendiri lebih bagus
        skor += hitungTetanggaBoard(board, r, c, aiColor) * 4;
      } else {
        // Bidak human bernilai negatif untuk AI
        skor -= 5;

        // Yugo human berbahaya untuk AI
        if (cell.isYugo) {
          skor -= 45;
        }

        // Kalau human menguasai tengah, kurangi skor AI
        skor -= nilaiKontrolTengah(r, c);

        // Human yang saling berdekatan juga berbahaya
        skor -= hitungTetanggaBoard(board, r, c, humanColor) * 4;
      }
    }
  }

  return skor;
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
