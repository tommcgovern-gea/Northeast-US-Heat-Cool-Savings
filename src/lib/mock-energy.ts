export interface EnergyRecord {
  id: string;
  buildingId: string;
  month: number;
  year: number;
  elecKwh: number | null;
  gasTherm: number | null;
  fuelOilGal: number | null;
  districtSteamMlb: number | null;
  totalKbtu: number;
  hdd: number | null;
  cdd: number | null;
  kbtuPerHdd: number | null;
  kbtuPerCdd: number | null;
  isBaseline: boolean;
  createdAt: string;
}

// Pre-seed with 3 years of baseline data for building "1" (2023, 2024, 2025)
export const mockEnergyRecords: EnergyRecord[] = [
  // --- 2023 Baseline ---
  { id: "e-2023-01", buildingId: "1", month: 1, year: 2023, elecKwh: 12000, gasTherm: 800, fuelOilGal: null, districtSteamMlb: null, totalKbtu: 120000, hdd: 900, cdd: 0, kbtuPerHdd: 133.3, kbtuPerCdd: null, isBaseline: true, createdAt: "2023-02-01T00:00:00Z" },
  { id: "e-2023-02", buildingId: "1", month: 2, year: 2023, elecKwh: 11500, gasTherm: 750, fuelOilGal: null, districtSteamMlb: null, totalKbtu: 115000, hdd: 850, cdd: 0, kbtuPerHdd: 135.3, kbtuPerCdd: null, isBaseline: true, createdAt: "2023-03-01T00:00:00Z" },
  { id: "e-2023-03", buildingId: "1", month: 3, year: 2023, elecKwh: 10500, gasTherm: 600, fuelOilGal: null, districtSteamMlb: null, totalKbtu: 100000, hdd: 650, cdd: 0, kbtuPerHdd: 153.8, kbtuPerCdd: null, isBaseline: true, createdAt: "2023-04-01T00:00:00Z" },
  { id: "e-2023-06", buildingId: "1", month: 6, year: 2023, elecKwh: 15000, gasTherm: 100, fuelOilGal: null, districtSteamMlb: null, totalKbtu: 60000, hdd: 0, cdd: 400, kbtuPerHdd: null, kbtuPerCdd: 150.0, isBaseline: true, createdAt: "2023-07-01T00:00:00Z" },
  { id: "e-2023-07", buildingId: "1", month: 7, year: 2023, elecKwh: 18000, gasTherm: 50, fuelOilGal: null, districtSteamMlb: null, totalKbtu: 66000, hdd: 0, cdd: 550, kbtuPerHdd: null, kbtuPerCdd: 120.0, isBaseline: true, createdAt: "2023-08-01T00:00:00Z" },
  { id: "e-2023-12", buildingId: "1", month: 12, year: 2023, elecKwh: 12500, gasTherm: 850, fuelOilGal: null, districtSteamMlb: null, totalKbtu: 125000, hdd: 950, cdd: 0, kbtuPerHdd: 131.6, kbtuPerCdd: null, isBaseline: true, createdAt: "2024-01-01T00:00:00Z" },

  // --- 2024 Baseline ---
  { id: "e-2024-01", buildingId: "1", month: 1, year: 2024, elecKwh: 11800, gasTherm: 780, fuelOilGal: null, districtSteamMlb: null, totalKbtu: 118000, hdd: 920, cdd: 0, kbtuPerHdd: 128.3, kbtuPerCdd: null, isBaseline: true, createdAt: "2024-02-01T00:00:00Z" },
  { id: "e-2024-02", buildingId: "1", month: 2, year: 2024, elecKwh: 11200, gasTherm: 720, fuelOilGal: null, districtSteamMlb: null, totalKbtu: 112000, hdd: 830, cdd: 0, kbtuPerHdd: 134.9, kbtuPerCdd: null, isBaseline: true, createdAt: "2024-03-01T00:00:00Z" },
  { id: "e-2024-03", buildingId: "1", month: 3, year: 2024, elecKwh: 10200, gasTherm: 580, fuelOilGal: null, districtSteamMlb: null, totalKbtu: 97000, hdd: 630, cdd: 0, kbtuPerHdd: 154.0, kbtuPerCdd: null, isBaseline: true, createdAt: "2024-04-01T00:00:00Z" },
  { id: "e-2024-06", buildingId: "1", month: 6, year: 2024, elecKwh: 14800, gasTherm: 90, fuelOilGal: null, districtSteamMlb: null, totalKbtu: 58000, hdd: 0, cdd: 420, kbtuPerHdd: null, kbtuPerCdd: 138.1, isBaseline: true, createdAt: "2024-07-01T00:00:00Z" },
  { id: "e-2024-07", buildingId: "1", month: 7, year: 2024, elecKwh: 17500, gasTherm: 40, fuelOilGal: null, districtSteamMlb: null, totalKbtu: 64000, hdd: 0, cdd: 530, kbtuPerHdd: null, kbtuPerCdd: 120.8, isBaseline: true, createdAt: "2024-08-01T00:00:00Z" },
  { id: "e-2024-12", buildingId: "1", month: 12, year: 2024, elecKwh: 12200, gasTherm: 830, fuelOilGal: null, districtSteamMlb: null, totalKbtu: 122000, hdd: 930, cdd: 0, kbtuPerHdd: 131.2, kbtuPerCdd: null, isBaseline: true, createdAt: "2025-01-01T00:00:00Z" },

  // --- 2025 Baseline ---
  { id: "e-2025-01", buildingId: "1", month: 1, year: 2025, elecKwh: 11600, gasTherm: 770, fuelOilGal: null, districtSteamMlb: null, totalKbtu: 116000, hdd: 910, cdd: 0, kbtuPerHdd: 127.5, kbtuPerCdd: null, isBaseline: true, createdAt: "2025-02-01T00:00:00Z" },
  { id: "e-2025-02", buildingId: "1", month: 2, year: 2025, elecKwh: 11000, gasTherm: 710, fuelOilGal: null, districtSteamMlb: null, totalKbtu: 110000, hdd: 840, cdd: 0, kbtuPerHdd: 131.0, kbtuPerCdd: null, isBaseline: true, createdAt: "2025-03-01T00:00:00Z" },
  { id: "e-2025-03", buildingId: "1", month: 3, year: 2025, elecKwh: 10000, gasTherm: 560, fuelOilGal: null, districtSteamMlb: null, totalKbtu: 95000, hdd: 640, cdd: 0, kbtuPerHdd: 148.4, kbtuPerCdd: null, isBaseline: true, createdAt: "2025-04-01T00:00:00Z" },
  { id: "e-2025-06", buildingId: "1", month: 6, year: 2025, elecKwh: 14500, gasTherm: 80, fuelOilGal: null, districtSteamMlb: null, totalKbtu: 56000, hdd: 0, cdd: 410, kbtuPerHdd: null, kbtuPerCdd: 136.6, isBaseline: true, createdAt: "2025-07-01T00:00:00Z" },
  { id: "e-2025-07", buildingId: "1", month: 7, year: 2025, elecKwh: 17000, gasTherm: 30, fuelOilGal: null, districtSteamMlb: null, totalKbtu: 62000, hdd: 0, cdd: 520, kbtuPerHdd: null, kbtuPerCdd: 119.2, isBaseline: true, createdAt: "2025-08-01T00:00:00Z" },
  { id: "e-2025-12", buildingId: "1", month: 12, year: 2025, elecKwh: 12000, gasTherm: 810, fuelOilGal: null, districtSteamMlb: null, totalKbtu: 120000, hdd: 940, cdd: 0, kbtuPerHdd: 127.7, kbtuPerCdd: null, isBaseline: true, createdAt: "2026-01-01T00:00:00Z" },
];
