import fs from 'fs';
import Database from 'better-sqlite3';
const db = new Database('./data/database.sqlite');
const bookings = db.prepare('SELECT id, details FROM bookings ORDER BY id DESC LIMIT 5').all();
bookings.forEach(b => {
  console.log('ID:', b.id, 'Details:', b.details);
});
