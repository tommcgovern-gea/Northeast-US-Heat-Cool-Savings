import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city');

  if (!city) {
    return NextResponse.json({ message: 'City is required' }, { status: 400 });
  }

  try {
    // 1. Geocode the city using Nominatim (OpenStreetMap)
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': '(myweatherapp.com, contact@myweatherapp.com)'
        }
      }
    );

    if (!geoRes.ok) {
      throw new Error('Failed to fetch geocoding data');
    }

    const geoData = await geoRes.json();

    if (!geoData || geoData.length === 0) {
      return NextResponse.json({ message: 'City not found' }, { status: 404 });
    }

    const lat = geoData[0].lat;
    const lon = geoData[0].lon;
    const formattedCity = geoData[0].name;

    // 2. Get the local forecast office endpoint from coordinates
    const pointsRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`, {
      headers: {
        'User-Agent': '(myweatherapp.com, contact@myweatherapp.com)'
      }
    });

    if (!pointsRes.ok) {
      if (pointsRes.status === 404) {
        return NextResponse.json(
          { message: 'Weather.gov only supports US locations. Please try a US city.' },
          { status: 400 }
        );
      }
      throw new Error('Failed to fetch grid point data from weather.gov');
    }

    const pointsData = await pointsRes.json();
    const forecastUrl = pointsData.properties.forecast;

    // 3. Fetch the actual forecast using the URL provided by the first request
    const forecastRes = await fetch(forecastUrl, {
      headers: {
         'User-Agent': '(myweatherapp.com, contact@myweatherapp.com)'
      }
    });

    if (!forecastRes.ok) {
      throw new Error('Failed to fetch forecast data');
    }

    const forecastData = await forecastRes.json();
    
    // The periods array contains the forecast
    const periods = forecastData.properties.periods;
    const currentForecast = periods[0]; // The current timeframe

    // 4. Format it to match your frontend structure
    const response = {
      city: formattedCity,
      temperature: currentForecast.temperature, // Usually in Fahrenheit
      condition: currentForecast.shortForecast,
      icon: currentForecast.icon,
      // NWS provides wind speed as a string like "5 to 10 mph"
      wind: currentForecast.windSpeed, 
      humidity: 0, // Not provided directly in standard forecast
      forecast: periods.slice(1, 6).map((period: any) => ({
        date: period.name, // e.g. "Wednesday" or "Wednesday Night"
        min: period.isDaytime ? null : period.temperature,
        max: period.isDaytime ? period.temperature : null,
        condition: period.shortForecast,
        icon: period.icon,
      })),
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
