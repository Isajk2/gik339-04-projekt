const sqlite3 = require('sqlite3').verbose();

// Open the database
let db = new sqlite3.Database(
  './travel_destinations.db',
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      console.error(err.message);
      throw err;
    } else {
      console.log('Connected to the SQLite database.');
    }
  }
);
db.run(
  `CREATE TABLE IF NOT EXISTS destinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  location TEXT,
  description TEXT,
  backgroundImage TEXT,
  galleryImage TEXT
)`,
  (err) => {
    if (err) {
      // Log any errors
      console.error(err.message);
    } else {
      // Log success message
      console.log("Table 'destinations' created successfully.");
    }
  }
);
// Close the database connection
db.close((err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Closed the database connection.');
});
