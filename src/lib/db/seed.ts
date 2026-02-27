import { db } from './client';

export async function seedDatabase() {
  try {
    console.log('Seeding database with initial NYC configuration...');

    const nycCity = await db.createCity({
      name: 'New York',
      state: 'NY',
      nws_office: 'OKX',
      nws_grid_x: 33,
      nws_grid_y: 35,
      alert_temp_delta: 5.0,
      alert_window_hours: 6,
      is_active: true,
    });

    console.log('NYC city created:', nycCity.id);

    return { cityId: nycCity.id };
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}
