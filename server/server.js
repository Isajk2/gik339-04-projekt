// sätter server med express framework för att hantera filuppladdningar

// importeringar
const express = require('express'); // webb framework för node.js
const multer = require('multer'); // 'middleware' för hantering av multipart/form-data encoding som används för filuppladdningar
const sqlite = require('sqlite3').verbose(); // node.js 'wrapper' för sqlite ('serverless database engine')
const path = require('path'); // modul för hantering och transformering av filvägar
const cors = require('cors'); // 'middleware' för enabling av CORS ('cross origin resource sharing') i express
const fs = require('fs'); // filsystem modul för filer och dictionaries
const sharp = require('sharp'); // högpresterande bildprocesserings bibliotek
sharp.cache(false);

// skapar instans för express server och sqlite databas
const server = express();
// hämtar 'travel_destinations.db'
const db = new sqlite.Database('./travel_destinations.db');

// skapar temporär mapp för uppladdningar om den inte redan existerar
const tempUploadsPath = path.join(__dirname, 'uploads/temp');
if (!fs.existsSync(tempUploadsPath)) {
  fs.mkdirSync(tempUploadsPath, { recursive: true });
}

// konfigurerar 'multer' och sätter temporär filväg för filuppladdningar
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempUploadsPath); // använder den temporära mappen
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // sätter filnamn med tidsstämpel och filens originella namn's extension
  },
});

// 'multer' setup med avändning av den konfigurerade lagringen
const upload = multer({ storage: storage });

// tillåter CORS för servern
server.use(cors());

// tolkar JSON och URL-kodad data
server.use(express.json());
server.use(express.urlencoded({ extended: false }));

// förser statiska filer från klient, css, images och uploads mapparna
server.use(express.static(path.join(__dirname, '../client')));
server.use('/css', express.static(path.join(__dirname, '../css')));
server.use('/images', express.static(path.join(__dirname, '../images')));
server.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// hanterar CORS-headers för varje inkommande förfrågan
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// hjälpfunktion för komprimering och omplacering av bilder
async function compressAndMoveImage(file, newFilename) {
  const finalPath = path.join(__dirname, 'uploads', newFilename); // skapar slutlig sökväg där den komprimerade bilden sparas
  try {
    await sharp(file.path).jpeg({ quality: 80 }).toFile(finalPath); // använder sharp för att komprimera bild 80% jpeg och spara på den slutliga sökvägen

    // raderar den temporära filen efter komprimering och omplacering
    fs.unlink(file.path, (err) => {
      // felmeddelanden konsoll
      if (err) {
        console.error('Error deleting temp file:', file.path, err);
      } else {
        console.log('Temp file deleted:', file.path);
      }
    });

    // returnerar sökvägen för den komprimerade bilden
    return path.join('uploads', newFilename);
    // felmeddelande konsoll
  } catch (err) {
    console.error('Error during image processing', err);
    throw err;
  }
}

// GET all destinations - hämtar alla destinationer från databasen
server.get('/destinations', (req, res) => {
  const sql = 'SELECT * FROM destinations';
  // SQL förfrågan
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(500).send(err.message); // skickar felstatus om fel uppstår
    } else {
      res.json(rows); // annars skicka JSON-svar med alla destinationer
    }
  });
});

// GET a single destination by id - hämtar specifik destination med ID
server.get('/destinations/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'SELECT * FROM destinations WHERE id = ?';
  // SQL förfrågan
  db.get(sql, id, (err, row) => {
    if (err) {
      res.status(500).send(err.message); // skickar felstatus om fel uppstår
    } else {
      res.json(row); // annars skicka JSON-svar med specifik destination
    }
  });
});

// POST a new destination with images - hanterar post förfrågningar för att lägga till destinationer
server.post(
  '/destinations',
  // 'multer' setup för att hantera filuppladdningar med specifierade fält
  upload.fields([
    { name: 'backgroundImage', maxCount: 1 },
    { name: 'galleryImage', maxCount: 1 },
  ]),
  // asynkron funktion för att hantera post förfrågan
  async (req, res) => {
    try {
      let backgroundImage, galleryImage; // initialiserar variabler för att lagra filnamn för komprimerade bilder

      // kontrollerar om uppladdad bakgrundbild existerar
      if (req.files['backgroundImage']) {
        // hämtar filnamn för den nya komprimerade bakgrundsbilden
        const newBackgroundFilename = req.files['backgroundImage'][0].filename;
        // komprimerar och flyttar bakgrundsbilden samt lagrar sökväg
        backgroundImage = await compressAndMoveImage(
          req.files['backgroundImage'][0],
          newBackgroundFilename
        );
      }

      // kontrollerar om uppladdad galleribild existerar
      if (req.files['galleryImage']) {
        // hämtar filnamn för den nya komprimerade galleribilden
        const newGalleryFilename = req.files['galleryImage'][0].filename;
        // komprimerar och flyttar galleribilden samt lagrar sökväg
        galleryImage = await compressAndMoveImage(
          req.files['galleryImage'][0],
          newGalleryFilename
        );
      }

      // extraherar data från request body
      const { name, location, description } = req.body;

      // SQL-förfrågan för att lägga till en ny destination till databasen
      const sql =
        'INSERT INTO destinations (name, location, description, backgroundImage, galleryImage) VALUES (?, ?, ?, ?, ?)';
      // exekverar SQL förfrågan med erhållen data
      db.run(
        sql,
        [name, location, description, backgroundImage, galleryImage],
        function (err) {
          // error - meddelar vid problem med tillägg
          if (err) {
            console.error(err.message);
            res.status(500).send('Failed to add destination to the database.');
          } else {
            // success - JSON-svar med destination ID och meddelande
            res.status(201).json({
              id: this.lastID,
              message: 'Destination added successfully.',
            });
          }
        }
      );
    } catch (err) {
      // hanterar och loggar fel eller undantag med bildprocess
      console.error('Error processing images', err);
      res.status(500).send('Error processing images');
    }
  }
);

// PUT to update a destination - hanterar förfrågan för att uppdatera existerande destinationer
server.put(
  '/destinations/:id',
  upload.fields([
    { name: 'backgroundImage', maxCount: 1 },
    { name: 'galleryImage', maxCount: 1 },
  ]),
  async (req, res) => {
    const id = req.params.id;
    const { name, location, description } = req.body;

    // hämtar existerande destination för att erhålla de tidigare bildvägarna
    try {
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

      // bearbetar och uppdaterar nya bakgrundsbilder
      if (req.files['backgroundImage']) {
        const newBackgroundFilename = req.files['backgroundImage'][0].filename;
        backgroundImage = await compressAndMoveImage(
          req.files['backgroundImage'][0],
          newBackgroundFilename
        );

        // radera tidigare bakgrundsbild om den existerar
        if (existingDestination && existingDestination.backgroundImage) {
          const oldImagePath = path.isAbsolute(
            existingDestination.backgroundImage
          )
            ? existingDestination.backgroundImage
            : path.join(__dirname, existingDestination.backgroundImage);

          // hantering av fel och meddelanden till konsoll
          fs.unlink(oldImagePath, (err) => {
            if (err) {
              // ignorerar felet om filen inte hittas
              if (err.code !== 'ENOENT') {
                console.error('Error deleting old background image:', err);
              }
              // annars skriv ut i konsoll att bild är borttagen
            } else {
              console.log('Old background image deleted:', oldImagePath);
            }
          });
        }
      }

      // bearbetar och uppdaterar nya galleribilder
      if (req.files['galleryImage']) {
        const newGalleryFilename = req.files['galleryImage'][0].filename;
        galleryImage = await compressAndMoveImage(
          req.files['galleryImage'][0],
          newGalleryFilename
        );
        // raderar tidigare galleribild om den existerar
        if (existingDestination && existingDestination.galleryImage) {
          fs.unlink(
            path.join(__dirname, existingDestination.galleryImage),
            (err) => {
              if (err) console.error('Error deleting old gallery image:', err);
            }
          );
        }
      }

      // uppdaterar databasen med ny information
      let sql = `UPDATE destinations SET name = ?, location = ?, description = ?`;
      let params = [name, location, description];

      // uppdaterar databasen med bilder
      if (backgroundImage) {
        sql += `, backgroundImage = ?`;
        params.push(backgroundImage);
      }

      if (galleryImage) {
        sql += `, galleryImage = ?`;
        params.push(galleryImage);
      }

      // uppdaterar databasen med destinationens id
      sql += ` WHERE id = ?`;
      params.push(id);

      // exekverar SQL förfrågan för att uppdatera destinationen i databasen
      db.run(sql, params, (err) => {
        // vid error skickar felmeddelanden till konsollen
        if (err) {
          console.error(err.message);
          res.status(500).send('Failed to update destination in the database.');
          // annars vid sucess skicka meddelande om lyckad uppdatering
        } else {
          res
            .status(200)
            .json({ id, message: 'Destination updated successfully.' });
        }
      });
      // felmeddelande vid error med uppladning av bilder
    } catch (err) {
      console.error('Error processing images or updating database', err);
      res.status(500).send('Error processing images or updating database');
    }
  }
);

// DELETE a destination - hanterar förfrågan att radera destination
server.delete('/destinations/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'SELECT * FROM destinations WHERE id = ?';

  // SQL förfrågan för att hämta destination och erhålla sökvägar från databas
  db.get(sql, id, (err, row) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
      // raderar bildfiler om de existerar
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

      // efter att bilder raderats, radera destinationen med id från databasen
      const deleteSql = 'DELETE FROM destinations WHERE id = ?';
      db.run(deleteSql, id, function (err) {
        if (err) {
          res.status(500).send(err.message);
        } else {
          res.json({
            // meddelande vid lyckad borttagning
            message: 'Destination successfully deleted',
            changes: this.changes,
          });
        }
      });
    }
  });
});

// startar server och lyssnar på port 3000
server.listen(3000, () => {
  console.log('Server running on http://localhost:3000'); // loggar meddelande till konsoll med serverns url när aktiv
});
