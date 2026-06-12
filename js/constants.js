const HEURISTIC_WEIGHTS = {
  // 1. PRIORITAS KEMENANGAN MUTLAK (Infinity Limits)
  WIN_IGO: 1000000,
  LOSE_IGO: -1000000,

  // 2. DETEKSI ANCAMAN (Threats & Double Play Attacks)
  THREAT_AI_VALID: 400000,       // Bonus jika AI punya 3 Yugo sebaris
  THREAT_HUMAN_VALID: 350000,   // Penalti (pengurangan) jika musuh punya 3 Yugo

  // 3. EVALUASI MATERIAL (Bidak)
  MIGO_BASE_VALUE: 10,          // Nilai dasar 1 keping Migo
  YUGO_AI_VALUE: 500,           // Nilai dasar 1 Yugo milik AI
  YUGO_HUMAN_VALUE: 350,        // Penalti jika musuh punya Yugo (Dibuat lebih besar agar AI agresif memblokir)
  YUGO_DIFFERENCE_MULTIPLIER: 1000, // Pengali dari selisih total Yugo di papan

  // 4. POSITIONAL & CENTER CONTROL
  CENTER_MIGO_MULTIPLIER: 2,    // Pengali posisi tengah untuk Migo sementara
  CENTER_YUGO_MULTIPLIER: 5,    // Pengali posisi tengah untuk Yugo permanen
  KONEKTIVITAS_LINEAR: 15,      // Bonus untuk bidak yang saling terhubung dalam satu garis

  // 5. OPENING PHASE (Ring System)
  OPENING_THRESHOLD: 30,        // Fase Opening berlaku jika total bidak di papan di bawah angka ini
  RING_OUTER: -50,              // Sangat buruk (Pojok/Pinggir luar)
  RING_MIDDLE: -10,             // Buruk
  RING_CENTER: -5,              // Netral (Hindari pusat persis di awal game)
  RING_INNER: 40                // Sangat baik (Cincin yang mengelilingi titik pusat)
};