const express = require('express');
const multer = require('multer');
const sqlite = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite.Database('./travel_destinations.db');
const server = express();

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // make sure this directory exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // prepend the timestamp to the original file name
  },
});
// Konfigurera servern att tjäna statiska filer från 'uploads'-mappen
server.use('/uploads', express.static('uploads'));

const cors = require('cors');
server.use(cors());

const upload = multer({ storage: storage });

server.use(express.json());
server.use(express.urlencoded({ extended: false }));
server.use('/uploads', express.static('uploads')); // Serve static files from uploads directory

server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', '*');
  next();
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

// GET all destinations
server.get('/destinations', (req, res) => {
  const sql = 'SELECT * FROM destinations';
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
      res.json(rows);
    }
  });
});

// GET a single destination by id
server.get('/destinations/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'SELECT * FROM destinations WHERE id = ?';
  db.get(sql, id, (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
      res.json(row);
    }
  });
});

// POST a new destination with images
server.post(
  '/destinations',
  upload.fields([
    { name: 'backgroundImage', maxCount: 1 },
    { name: 'galleryImage', maxCount: 1 },
  ]),
  (req, res) => {
    const { name, location, description } = req.body;
    const backgroundImage = req.files['backgroundImage']
      ? req.files['backgroundImage'][0].path
      : null;
    const galleryImage = req.files['galleryImage']
      ? req.files['galleryImage'][0].path
      : null;

    const sql =
      'INSERT INTO destinations (name, location, description, backgroundImage, galleryImage) VALUES (?, ?, ?, ?, ?)';
    db.run(
      sql,
      [name, location, description, backgroundImage, galleryImage],
      function (err) {
        if (err) {
          console.error(err.message);
          res.status(500).send('Failed to add destination to the database.');
        } else {
          res.status(201).json({
            id: this.lastID,
            message: 'Destination added successfully.',
          });
        }
      }
    );
  }
);

// PUT to update a destination
server.put('/destinations/:id', (req, res) => {
  const id = req.params.id;
  const updates = req.body;
  const sql =
    'UPDATE destinations SET name = ?, location = ?, description = ?, image = ? WHERE id = ?';
  db.run(
    sql,
    [updates.name, updates.location, updates.description, updates.image, id],
    function (err) {
      if (err) {
        res.status(500).send(err.message);
      } else {
        res.json({ changes: this.changes });
      }
    }
  );
});

// DELETE a destination
server.delete('/destinations/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'DELETE FROM destinations WHERE id = ?';
  db.run(sql, id, function (err) {
    if (err) {
      res.status(500).send(err.message);
    } else {
      res.json({ changes: this.changes });
    }
  });
});
