const express = require('express');
const multer = require('multer');
const sqlite = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const sharp = require('sharp');
sharp.cache(false);

const server = express();
const db = new sqlite.Database('./travel_destinations.db');

// Skapa en temporär mapp för uppladdningar om den inte redan finns
const tempUploadsPath = path.join(__dirname, 'uploads/temp');
if (!fs.existsSync(tempUploadsPath)) {
  fs.mkdirSync(tempUploadsPath, { recursive: true });
}

// Konfigurera multer för filuppladdning
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadsPath); // Använd den temporära mappen
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Tidsstämpel och original filnamn
  },
});

const upload = multer({ storage: storage });

// Tillåt CORS för alla domäner
server.use(cors());

// Tolka JSON och URL-kodade data
server.use(express.json());
server.use(express.urlencoded({ extended: false }));

// Middleware för att servera statiska filer
server.use(express.static(path.join(__dirname, '../client')));
server.use('/css', express.static(path.join(__dirname, '../css')));
server.use('/images', express.static(path.join(__dirname, '../images')));
server.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Lägg till headers för att tillåta CORS och HTTP-metoder
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Hjälpfunktion för att komprimera och flytta bilder
async function compressAndMoveImage(file, newFilename) {
  const finalPath = path.join(__dirname, 'uploads', newFilename);
  try {
    await sharp(file.path).jpeg({ quality: 80 }).toFile(finalPath);

    // Radera den temporära filen
    fs.unlink(file.path, (err) => {
      if (err) {
        console.error('Error deleting temp file:', file.path, err);
      } else {
        console.log('Temp file deleted:', file.path);
      }
    });

    // Returnera endast den relativa sökvägen
    return path.join('uploads', newFilename);
  } catch (err) {
    console.error('Error during image processing', err);
    throw err;
  }
}

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
  async (req, res) => {
    try {
      let backgroundImage, galleryImage;

      // Bearbeta bakgrundsbilden om den finns
      if (req.files['backgroundImage']) {
        const newBackgroundFilename = req.files['backgroundImage'][0].filename;
        backgroundImage = await compressAndMoveImage(
          req.files['backgroundImage'][0],
          newBackgroundFilename
        );
      }

      // Bearbeta galleribilden om den finns
      if (req.files['galleryImage']) {
        const newGalleryFilename = req.files['galleryImage'][0].filename;
        galleryImage = await compressAndMoveImage(
          req.files['galleryImage'][0],
          newGalleryFilename
        );
      }

      const { name, location, description } = req.body;

      // Skapa SQL-fråga för att lägga till en ny destination
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
    } catch (err) {
      console.error('Error processing images', err);
      res.status(500).send('Error processing images');
    }
  }
);

// PUT to update a destination
server.put(
  '/destinations/:id',
  upload.fields([
    { name: 'backgroundImage', maxCount: 1 },
    { name: 'galleryImage', maxCount: 1 },
  ]),
  async (req, res) => {
    const id = req.params.id;
    const { name, location, description } = req.body;

    try {
      // Hämta den befintliga destinationen för att få de gamla bildvägarna
      const existingSql = 'SELECT * FROM destinations WHERE id = ?';
      const existingDestination = await new Promise((resolve, reject) => {
        db.get(existingSql, [id], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });

      let backgroundImage, galleryImage;

      // Bearbeta och uppdatera nya bilder
      if (req.files['backgroundImage']) {
        const newBackgroundFilename = req.files['backgroundImage'][0].filename;
        backgroundImage = await compressAndMoveImage(
          req.files['backgroundImage'][0],
          newBackgroundFilename
        );

        // Radera den gamla bilden om den finns
        if (existingDestination && existingDestination.backgroundImage) {
          const oldImagePath = path.isAbsolute(
            existingDestination.backgroundImage
          )
            ? existingDestination.backgroundImage
            : path.join(__dirname, existingDestination.backgroundImage);

          fs.unlink(oldImagePath, (err) => {
            if (err) {
              // Om felet är att filen inte hittades, ignorera det
              if (err.code !== 'ENOENT') {
                console.error('Error deleting old background image:', err);
              }
            } else {
              console.log('Old background image deleted:', oldImagePath);
            }
          });
        }
      }

      if (req.files['galleryImage']) {
        const newGalleryFilename = req.files['galleryImage'][0].filename;
        galleryImage = await compressAndMoveImage(
          req.files['galleryImage'][0],
          newGalleryFilename
        );
        // Radera den gamla bilden om den finns
        if (existingDestination && existingDestination.galleryImage) {
          fs.unlink(
            path.join(__dirname, existingDestination.galleryImage),
            (err) => {
              if (err) console.error('Error deleting old gallery image:', err);
            }
          );
        }
      }

      // Uppdatera databasen med ny information
      let sql = `UPDATE destinations SET name = ?, location = ?, description = ?`;
      let params = [name, location, description];

      if (backgroundImage) {
        sql += `, backgroundImage = ?`;
        params.push(backgroundImage);
      }

      if (galleryImage) {
        sql += `, galleryImage = ?`;
        params.push(galleryImage);
      }

      sql += ` WHERE id = ?`;
      params.push(id);

      db.run(sql, params, (err) => {
        if (err) {
          console.error(err.message);
          res.status(500).send('Failed to update destination in the database.');
        } else {
          res
            .status(200)
            .json({ id, message: 'Destination updated successfully.' });
        }
      });
    } catch (err) {
      console.error('Error processing images or updating database', err);
      res.status(500).send('Error processing images or updating database');
    }
  }
);

// DELETE a destination
server.delete('/destinations/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'SELECT * FROM destinations WHERE id = ?';

  // Först hämta posten för att få sökvägarna till bildfilerna
  db.get(sql, id, (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
      // Ta bort bildfiler om de finns
      if (row.backgroundImage) {
        fs.unlink(path.join(__dirname, row.backgroundImage), (err) => {
          if (err) console.error(err);
        });
      }
      if (row.galleryImage) {
        fs.unlink(path.join(__dirname, row.galleryImage), (err) => {
          if (err) console.error(err);
        });
      }

      // Efter att bilderna tagits bort, ta bort posten från databasen
      const deleteSql = 'DELETE FROM destinations WHERE id = ?';
      db.run(deleteSql, id, function (err) {
        if (err) {
          res.status(500).send(err.message);
        } else {
          res.json({
            message: 'Destination successfully deleted',
            changes: this.changes,
          });
        }
      });
    }
  });
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
