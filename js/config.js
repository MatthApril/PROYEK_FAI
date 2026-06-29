// 1. Array Pembantu
const indeksKeHuruf = ["a", "b", "c", "d", "e", "f", "g", "h"];

// 2. State Utama Permainan
let gameState = {
  board: Array(8)
    .fill(null)
    .map(() => Array(8).fill(null)),
  currentPlayer: "white",
  scores: { white: 0, black: 0 },
  yugo: { white: 0, black: 0 },
  gameStatus: "waiting", // 'waiting' | 'active' | 'finished'
};

// 3. State History & Papan
let nomorLangkah = 1;
let lastMove = null;
let igoWinningKotak = [];
let historyStack = [];

// 4. State Mode Lawan (AI)
let modeLawan = "Local Play";
let aiColor = "black";
let humanColor = "white";
let aiSedangBerpikir = false;
let aiTimeoutId = null;
