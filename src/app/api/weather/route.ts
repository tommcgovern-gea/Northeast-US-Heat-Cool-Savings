import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Mock data generator for fallback
const getMockWeather = (city: string) => ({
  city: city.charAt(0).toUpperCase() + city.slice(1),
  temperature: Math.floor(Math.random() * (30 - 15 + 1)) + 15,
  condition: 'Cloudy',
  icon: '03d',
  humidity: 65,
  wind: 12,
  forecast: [
    { date: 'Mon', min: 14, max: 22, condition: 'Sunny', icon: '01d' },
    { date: 'Tue', min: 12, max: 18, condition: 'Rain', icon: '10d' },
    { date: 'Wed', min: 15, max: 25, condition: 'Clear', icon: '01d' },
    { date: 'Thu', min: 13, max: 20, condition: 'Cloudy', icon: '02d' },
    { date: 'Fri', min: 11, max: 19, condition: 'Partly Cloudy', icon: '03d' },
  ],
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');

  if (!city) {
    return NextResponse.json({ message: 'City is required' }, { status: 400 });
  }

  // If no API key is set, return mock data for development
  if (!API_KEY || API_KEY === 'your_api_key_here') {
    console.warn('OPENWEATHER_API_KEY not found. Returning mock data.');
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network latency
    return NextResponse.json(getMockWeather(city));
  }

  try {
    // Fetch Current Weather
    const weatherRes = await fetch(
      `${BASE_URL}/weather?q=${city}&units=metric&appid=${API_KEY}`
    );

    if (!weatherRes.ok) {
      const errorData = await weatherRes.json();
      return NextResponse.json(
        { message: errorData.message || 'Failed to fetch weather data' },
        { status: weatherRes.status }
      );
    }

    const weatherData = await weatherRes.json();

    // Fetch Forecast
    const forecastRes = await fetch(
      `${BASE_URL}/forecast?q=${city}&units=metric&appid=${API_KEY}`
    );

    if (!forecastRes.ok) {
      throw new Error('Failed to fetch forecast data');
    }

    const forecastData = await forecastRes.json();

    // Process Forecast
    const dailyForecast = forecastData.list
      .filter((_: any, index: number) => index % 8 === 0)
      .slice(0, 5)
      .map((item: any) => ({
        date: new Date(item.dt * 1000).toLocaleDateString('en-US', { weekday: 'short' }),
        min: Math.round(item.main.temp_min),
        max: Math.round(item.main.temp_max),
        condition: item.weather[0].main,
        icon: item.weather[0].icon,
      }));

    const response = {
      city: weatherData.name,
      temperature: Math.round(weatherData.main.temp),
      condition: weatherData.weather[0].main,
      icon: weatherData.weather[0].icon,
      humidity: weatherData.main.humidity,
      wind: weatherData.wind.speed,
      forecast: dailyForecast,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Weather API Error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
