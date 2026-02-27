import dotenv from 'dotenv';
dotenv.config();

async function testAlertLogic() {
  try {
    const { alertService } = await import('../src/lib/services/alertService');
    const { db } = await import('../src/lib/db/client');

    const cityName = process.argv[2] || 'New York';
    console.log(`\n--- Testing Alert Logic for: ${cityName} ---`);

    // 1. Get city from DB
    const cities = await db.getCities();
    const city = cities.find(c => c.name.toLowerCase() === cityName.toLowerCase());

    if (!city) {
      console.error(`Error: City "${cityName}" not found in database.`);
      return;
    }

    console.log(`Config: Delta=${city.alert_temp_delta}°F, Window=${city.alert_window_hours}h`);
    console.log(`NWS: Office=${city.nws_office}, Grid=${city.nws_grid_x},${city.nws_grid_y}`);

    // 2. Run the fluctuation check
    console.log('\nFetching NWS data and checking for fluctuations...');
    const result = await alertService.checkSuddenFluctuation(city.id);

    if (!result) {
      console.log('Result: No data or city inactive.');
      return;
    }

    console.log('\nCHECK RESULT:');
    console.log(`- Current Temp: ${result.currentTemp}°F`);
    console.log(`- Future Temp:  ${result.futureTemp}°F (at window end)`);
    console.log(`- Change:       ${result.temperatureChange.toFixed(1)}°F`);
    console.log(`- Threshold:    ${city.alert_temp_delta}°F`);

    if (result.shouldAlert) {
      console.log('\n🚨  ALERT STATUS: TRIGGERED!');
      console.log('The system WOULD send alerts to recipients now.');
    } else {
      console.log('\n✅ ALERT STATUS: Normal');
      console.log('Temperature change is within safe limits.');
    }

    // 3. Daily Summary Test
    console.log('\n--- Daily Summary Preview ---');
    const summary = await alertService.calculateDailySummary(city.id);
    if (summary) {
      console.log(`- Avg Temp:  ${summary.averageTemp}°F`);
      console.log(`- Min Temp:  ${summary.minTemp}°F`);
      console.log(`- Max Temp:  ${summary.maxTemp}°F`);
      console.log(`- Daily Δ:   ${summary.temperatureChange}°F`);
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  }
}

testAlertLogic();
