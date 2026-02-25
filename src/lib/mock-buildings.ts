import { City, mockCities } from "./mock-cities";

export interface MockBuilding {
  id: string;
  name: string;
  address: string;
  cityId: string;
  cityName: string;
  isActive: boolean;
  isPaused: boolean;
  recipientCount: number;
  complianceRate: number;
  createdAt: string;
  updatedAt?: string;
  recipients?: any[];
  recentMessages?: any[];
  recentUploads?: any[];
  city?: City;
}

export const mockBuildings: MockBuilding[] = [
  {
    id: "1",
    name: "Downtown HQ",
    address: "123 Main St",
    cityId: "1",
    cityName: "New York", // updating to match mock-cities
    isActive: true,
    isPaused: false,
    recipientCount: 50,
    complianceRate: 98.5,
    createdAt: new Date().toISOString(),
    recipients: [
      {
        id: "recipient-1",
        name: "John Doe",
        email: "john@example.com",
        phone: "+1234567890",
        preferEmail: true,
        preferSms: false,
        isActive: true,
      },
      {
        id: "recipient-2",
        name: "Jane Smith",
        email: "jane@example.com",
        phone: "+0987654321",
        preferEmail: true,
        preferSms: true,
        isActive: true,
      },
    ],
    recentMessages: [],
    recentUploads: [],
    city: mockCities.find(c => c.id === "1"),
  },
  {
    id: "2",
    name: "Uptown Annex",
    address: "456 High St",
    cityId: "1",
    cityName: "New York",
    isActive: true,
    isPaused: true,
    recipientCount: 20,
    complianceRate: 85.0,
    createdAt: new Date().toISOString(),
    recipients: [],
    recentMessages: [],
    recentUploads: [],
    city: mockCities.find(c => c.id === "1"),
  },
];
