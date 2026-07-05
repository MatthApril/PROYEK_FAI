// === js/main.js ===

// 1. Eksekusi Pertama Saat Website Dibuka
inisialisasiPapanFisik();
tampilkanAlertUndo();

// 2. Event Listener untuk Tombol Copy History
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

// 3. Event Listener Document Ready (Import Modal)
document.addEventListener("DOMContentLoaded", () => {
  const btnImport = document.getElementById("btnImport");
  const teksInputImport = document.getElementById("teksInputImport");
  
  // Ambil elemen UI yang menentukan siapa yang jalan duluan
  const elemenGiliran = document.getElementById("pilihanGiliran"); 

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

      // === LOGIKA PENENTUAN WARNA SEBELUM IMPORT ===
      // Cek ID 'pilihanGiliran' untuk menentukan siapa White
      let playerPertama = elemenGiliran ? elemenGiliran.value : "user";

      if (playerPertama === "ai") {
        aiColor = "white";
        humanColor = "black";
      } else {
        // Jika value "user" (atau fallback)
        aiColor = "black";
        humanColor = "white";
      }
      // =============================================

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
        gameState.currentPlayer === window.aiColor
      ) {
        jalankanAI();
      }
    });
  }
});