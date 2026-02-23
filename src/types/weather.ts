export interface WeatherData {
  city: string;
  temperature: number;
  condition: string;
  icon: string;
  humidity: number;
  wind: number;
  forecast: ForecastDay[];
}

export interface ForecastDay {
  date: string;
  min: number;
  max: number;
  condition: string;
  icon: string;
}

export interface WeatherError {
  message: string;
}
