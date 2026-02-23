export interface City {
  id: string;
  name: string;
  state: string;
  nwsOffice: string;
  nwsGridX: number;
  nwsGridY: number;
  alertTempDelta: number;
  alertWindowHours: number;
  isActive: boolean;
  buildingCount: number;
  createdAt: string;
}

export const mockCities: City[] = [
  {
    id: "1",
    name: "New York",
    state: "NY",
    nwsOffice: "OKX",
    nwsGridX: 33,
    nwsGridY: 35,
    alertTempDelta: 5,
    alertWindowHours: 6,
    isActive: true,
    buildingCount: 4,
    createdAt: new Date().toISOString(),
  },
];