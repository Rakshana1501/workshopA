const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
require('dotenv').config(); // load environment variables

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Main database connection (akasaworkshop_db)
// Main DB
const db1 = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Trash DB
const db2 = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.TRASH_DB_NAME,
});

db1.connect(err => {
  if (err) throw err;
  console.log('Main DB connected.');
});

db2.connect(err => {
  if (err) throw err;
  console.log('Trash DB connected.');
});

// CREATE new application
app.post('/workshop', (req, res) => {
  const formData = req.body;

  const sql = `INSERT INTO akasastudents (
    firstName, lastName, phone, email, gender,
    mode, areYouA, aitool, current, chooseworkshop,
    aboutas, preferredBatch
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    formData.firstName, formData.lastName, formData.phone, formData.email, formData.gender, formData.mode,
    formData.areYouA, formData.aitool, formData.current, formData.chooseworkshop, formData.aboutas,
    formData.preferredBatch
  ];

  db1.query(sql, values, (err, result) => {
    if (err) {
      console.error('MySQL Error:', err);
      return res.status(500).json({ message: 'Database error', error: err.message });
    }
    res.status(200).json({ message: 'Data saved successfully', id: result.insertId });
  });
});

// READ all applications
app.get('/workshop', (req, res) => {
  db1.query('SELECT * FROM akasastudents', (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    res.json(results);
  });
});

// READ one application by ID
app.get('/workshop/:id', (req, res) => {
  const id = req.params.id;
  db1.query('SELECT * FROM akasastudents WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Database error' });
    if (results.length === 0) return res.status(404).json({ message: 'Record not found' });
    res.json(results[0]);
  });
});

// UPDATE application by ID
app.put('/workshop/:id', (req, res) => {
  const formData = req.body;
  const id = req.params.id;

  const sql = `UPDATE akasastudents SET
    firstName = ?, lastName = ?, phone = ?, email = ?, gender = ?, mode = ?,
    areYouA = ?, aitool = ?, current = ?, chooseworkshop = ?,
    aboutas = ?, preferredBatch = ?
    WHERE id = ?`;

  const values = [
    formData.firstName, formData.lastName, formData.phone, formData.email, formData.gender, formData.mode,
    formData.areYouA, formData.aitool, formData.current, formData.chooseworkshop,
    formData.aboutas, formData.preferredBatch, id
  ];

  db1.query(sql, values, (err, result) => {
    if (err) {
      console.error("MySQL Update Error:", err);
      return res.status(500).json({ message: 'Update failed', error: err.message });
    }
    res.json({ message: 'Updated successfully' });
  });
});

// DELETE → Move to trash (transfer to trash db and delete from main db)
app.delete('/workshop/:id', (req, res) => {
  const { id } = req.params;

  // Fetch application from main DB
  db1.query('SELECT * FROM akasastudents WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Fetch error' });
    if (results.length === 0) return res.status(404).json({ message: 'Application not found' });

    const appToDelete = results[0];

    // Insert into trash DB
    const insertTrashSQL = `INSERT INTO trashed_applications (
      firstName, lastName, phone, email, gender, mode, areYouA,
      aitool, current, chooseworkshop, aboutas, preferredBatch
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const trashValues = [
      appToDelete.firstName, appToDelete.lastName, appToDelete.phone, appToDelete.email,
      appToDelete.gender, appToDelete.mode, appToDelete.areYouA,
      appToDelete.aitool, appToDelete.current, appToDelete.chooseworkshop,
      appToDelete.aboutas, appToDelete.preferredBatch
    ];

    db2.query(insertTrashSQL, trashValues, (err2) => {
      if (err2) {
        console.error('Trash insert error:', err2);
        return res.status(500).json({ message: 'Trash insert error' });
      }

      // Delete from main DB after successful insert to trash
      db1.query('DELETE FROM akasastudents WHERE id = ?', [id], (err3) => {
        if (err3) return res.status(500).json({ message: 'Delete error' });
        res.json({ message: 'Application moved to trash' });
      });
    });
  });
});

// GET all trashed applications (lowercase /trash)
app.get('/Trash', (req, res) => {
  db2.query('SELECT * FROM trashed_applications', (err, results) => {
    if (err) {
      console.error('Trash fetch error:', err);
      return res.status(500).json({ message: 'Trash fetch error' });
    }
    res.json(results);
  });
});

// RESTORE from trash → move back to main db and remove from trash db (lowercase /trash)
app.post('/AdminPanel/restore/:id', (req, res) => {
  const { id } = req.params;

  db2.query('SELECT * FROM trashed_applications WHERE id = ?', [id], (err, results) => {
    if (err) return res.status(500).json({ message: 'Restore fetch error' });
    if (results.length === 0) return res.status(404).json({ message: 'Not found in trash' });

    const item = results[0];

    const restoreSQL = `INSERT INTO akasastudents (
      firstName, lastName, phone, email, gender, mode, areYouA,
      aitool, current, chooseworkshop, aboutas, preferredBatch
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const restoreValues = [
      item.firstName, item.lastName, item.phone, item.email,
      item.gender, item.mode, item.areYouA, item.aitool,
      item.current, item.chooseworkshop, item.aboutas, item.preferredBatch
    ];

    db1.query(restoreSQL, restoreValues, (err2) => {
      if (err2) {
        console.error('Restore insert error:', err2);
        return res.status(500).json({ message: 'Restore insert error' });
      }

      db2.query('DELETE FROM trashed_applications WHERE id = ?', [id], (err3) => {
        if (err3) return res.status(500).json({ message: 'Trash delete error' });
        res.json({ message: 'Application restored' });
      });
    });
  });
});

// Permanently DELETE from trash (lowercase /trash)
app.delete('/Trash/delete/:id', (req, res) => {
  const { id } = req.params;

  db2.query('DELETE FROM trashed_applications WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('Permanent delete error:', err);
      return res.status(500).json({ message: 'Permanent delete error' });
    }
    res.json({ message: 'Permanently deleted' });
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
