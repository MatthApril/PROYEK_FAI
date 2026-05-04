// Ambil modal
const modalTutorial = document.getElementById("modalTutorial");
const modalRules = document.getElementById("modalRules");

// Ambil bagian timer
const cekTimer = document.getElementById("cekTimer");
const semuaWaktu = document.querySelectorAll(".waktu");
const timerSetting = document.getElementById("timerSetting");

// Ambil semua kotak papan
const semuaKotak = document.querySelectorAll(".kotak");

// Giliran pertama adalah putih
let giliranPemain = "putih";
let gameSudahMulai = false;

// Membuka modal tutorial
function bukaTutorial() {
  modalTutorial.classList.add("aktif");
}

// Membuka modal rules
function bukaRules() {
  modalRules.classList.add("aktif");
}

// Menutup semua modal
function tutupModal() {
  modalTutorial.classList.remove("aktif");
  modalRules.classList.remove("aktif");
}

// Mengatur timer on/off
function aturTimer() {
  if (cekTimer.checked) {
    semuaWaktu.forEach(function (waktu) {
      waktu.style.display = "block";
    });

    timerSetting.style.display = "grid";
  } else {
    semuaWaktu.forEach(function (waktu) {
      waktu.style.display = "none";
    });

    timerSetting.style.display = "none";
  }
}

// Mulai game saat tombol start diklik
function startGame() {
  gameSudahMulai = true;
}

// Menaruh bidak saat kotak diklik
semuaKotak.forEach(function (kotak) {
  kotak.addEventListener("click", function () {
    if (gameSudahMulai === false) {
      return;
    }

    if (kotak.children.length > 0) {
      return;
    }

    const bidakBaru = document.createElement("div");
    bidakBaru.classList.add("migo");

    if (giliranPemain === "putih") {
      bidakBaru.classList.add("migo-putih");
      giliranPemain = "hitam";
    } else {
      bidakBaru.classList.add("migo-hitam");
      giliranPemain = "putih";
    }

    kotak.appendChild(bidakBaru);
  });
});

// Reset papan
function resetPapan() {
  semuaKotak.forEach(function (kotak) {
    kotak.innerHTML = "";
  });

  giliranPemain = "putih";
  gameSudahMulai = false;
}

// Alert custom
function tampilkanAlert(status, judul, pesan) {
  const alertCopy = document.getElementById("alertCopy");
  const ikonAlert = alertCopy.querySelector(".alert-icon");
  const judulAlert = alertCopy.querySelector(".alert-text strong");
  const pesanAlert = alertCopy.querySelector(".alert-text span");

  ikonAlert.innerText = status === "sukses" ? "✅" : "❌";
  judulAlert.innerText = judul;
  pesanAlert.innerText = pesan;

  if (status === "sukses") {
    alertCopy.style.borderLeftColor = "#27a844";
  } else {
    alertCopy.style.borderLeftColor = "#ff4b4b";
  }

  alertCopy.classList.add("muncul");

  setTimeout(function () {
    alertCopy.classList.remove("muncul");
  }, 2000);
}

// Copy rules
function copyRules() {
  const isiRules = document.querySelector(".isi-rules");
  const teksRules = isiRules.innerText;

  navigator.clipboard
    .writeText(teksRules)
    .then(function () {
      tampilkanAlert(
        "sukses",
        "Berhasil disalin!",
        "Rules sudah masuk ke clipboard.",
      );
    })
    .catch(function () {
      tampilkanAlert("gagal", "Gagal disalin", "Clipboard tidak bisa diakses.");
    });
}

// Jalankan timer saat toggle diklik
cekTimer.addEventListener("change", aturTimer);

// Jalankan saat halaman pertama kali dibuka
aturTimer();
