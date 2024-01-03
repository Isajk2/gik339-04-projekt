const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./travel_destinations.db');

const deleteRow = (id) => {
  db.run(`DELETE FROM destinations WHERE id = ?`, id, function (err) {
    if (err) {
      return console.error(err.message);
    }
    console.log(`Row(s) deleted ${this.changes}`);
  });
};

// Här anger du ID för de rader du vill ta bort
deleteRow(46);
deleteRow(47);

db.close();
