import { db, AlertLog } from '@/lib/db/client';
import { fetchNWSHourlyForecast } from '@/lib/controllers/weatherController';

export interface AlertCheckResult {
  shouldAlert: boolean;
  temperatureChange: number;
  timeWindow: number;
  currentTemp: number;
  previousTemp: number;
  timestamp: string;
}

export interface CityAlertConfig {
  id: string;
  alertTempDelta: number;
  alertWindowHours: number;
  nwsOffice: string;
  nwsGridX: number;
  nwsGridY: number;
}

export class AlertService {
  async checkSuddenFluctuation(cityId: string): Promise<AlertCheckResult | null> {
    const city = await db.getCityById(cityId);
    if (!city || !city.is_active) {
      return null;
    }

    const config: CityAlertConfig = {
      id: city.id,
      alertTempDelta: Number(city.alert_temp_delta),
      alertWindowHours: city.alert_window_hours,
      nwsOffice: city.nws_office,
      nwsGridX: city.nws_grid_x,
      nwsGridY: city.nws_grid_y,
    };

    const forecast = await fetchNWSHourlyForecast(
      config.nwsOffice,
      config.nwsGridX,
      config.nwsGridY
    );

    if (forecast.length < config.alertWindowHours + 1) {
      return null;
    }

    const currentTemp = forecast[0].tempF;
    const windowEndIndex = Math.min(config.alertWindowHours, forecast.length - 1);
    const futureTemp = forecast[windowEndIndex].tempF;
    const temperatureChange = Math.abs(futureTemp - currentTemp);

    if (temperatureChange >= config.alertTempDelta) {
      const previousTemp = forecast[0].tempF;
      const futureTime = new Date(forecast[windowEndIndex].time);

      return {
        shouldAlert: true,
        temperatureChange,
        timeWindow: config.alertWindowHours,
        currentTemp: previousTemp,
        previousTemp: currentTemp,
        timestamp: futureTime.toISOString(),
      };
    }

    return {
      shouldAlert: false,
      temperatureChange,
      timeWindow: config.alertWindowHours,
      currentTemp,
      previousTemp: currentTemp,
      timestamp: new Date().toISOString(),
    };
  }

  async calculateDailySummary(cityId: string): Promise<{
    averageTemp: number;
    minTemp: number;
    maxTemp: number;
    temperatureChange: number;
  } | null> {
    const city = await db.getCityById(cityId);
    if (!city || !city.is_active) {
      return null;
    }

    const forecast = await fetchNWSHourlyForecast(
      city.nws_office,
      city.nws_grid_x,
      city.nws_grid_y
    );

    if (forecast.length < 24) {
      return null;
    }

    const todayTemps = forecast.slice(0, 24).map(f => f.tempF);
    const averageTemp = todayTemps.reduce((a, b) => a + b, 0) / todayTemps.length;
    const minTemp = Math.min(...todayTemps);
    const maxTemp = Math.max(...todayTemps);

    const yesterdaySnapshots = await db.getRecentTemperatureSnapshots(cityId, 48);
    const yesterdayAvg = yesterdaySnapshots.length > 0
      ? yesterdaySnapshots.slice(0, 24).reduce((sum, s) => sum + Number(s.temperature_f), 0) / Math.min(24, yesterdaySnapshots.length)
      : averageTemp;

    const temperatureChange = averageTemp - yesterdayAvg;

    return {
      averageTemp: Math.round(averageTemp * 10) / 10,
      minTemp: Math.round(minTemp),
      maxTemp: Math.round(maxTemp),
      temperatureChange: Math.round(temperatureChange * 10) / 10,
    };
  }

  async processCityAlerts(cityId: string): Promise<AlertLog | null> {
    const result = await this.checkSuddenFluctuation(cityId);
    
    if (result && result.shouldAlert) {
      const city = await db.getCityById(cityId);
      if (!city) return null;

      return await db.createAlertLog({
        city_id: cityId,
        alert_type: 'sudden_fluctuation',
        temperature_data: {
          currentTemp: result.currentTemp,
          futureTemp: result.previousTemp,
          change: result.temperatureChange,
          timeWindow: result.timeWindow,
        },
        threshold_used: {
          tempDelta: city.alert_temp_delta,
          windowHours: city.alert_window_hours,
        },
        processed: false,
      });
    }
    return null;
  }

  async saveTemperatureSnapshot(cityId: string): Promise<void> {
    const city = await db.getCityById(cityId);
    if (!city || !city.is_active) return;

    const forecast = await fetchNWSHourlyForecast(
      city.nws_office,
      city.nws_grid_x,
      city.nws_grid_y
    );

    if (forecast.length === 0) return;

    const currentTemp = forecast[0].tempF;
    const now = new Date();

    await db.saveTemperatureSnapshot({
      city_id: cityId,
      recorded_at: now.toISOString(),
      temperature_f: currentTemp,
      forecast_data: forecast,
    });
  }
}

export const alertService = new AlertService();
