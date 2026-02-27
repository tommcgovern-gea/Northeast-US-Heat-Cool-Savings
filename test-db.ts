import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const { db } = await import('./src/lib/db/client');
  try {
    console.log('Testing createCity...');
    const city = await db.createCity({
      name: 'Test City ' + Date.now(),
      state: 'TC',
      nws_office: 'OKX',
      nws_grid_x: 33,
      nws_grid_y: 35,
      alert_temp_delta: 5,
      alert_window_hours: 6,
      is_active: true
    });
    console.log('Success:', city);
  } catch (e) {
    console.error('FAILED:', e);
  }
}

run();
