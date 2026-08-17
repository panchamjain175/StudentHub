const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db } = require('../config/db');
const { isAuthenticated } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/notes');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});
const upload = multer({ storage });

// GET Class Notes & Study Materials Page
router.get('/', isAuthenticated, async (req, res) => {
  const subjectFilter = req.query.subject || '';

  try {
    let sqlQuery = 'SELECT * FROM notes';
    if (subjectFilter) {
      // VULNERABLE SQLi
      sqlQuery += ` WHERE subject='${subjectFilter}'`;
    }
    sqlQuery += ' ORDER BY created_at DESC';

    const [notesList] = await db.query(sqlQuery);

    res.render('notes', { 
      notes: notesList, 
      subjectFilter, 
      success: req.query.success || null, 
      error: req.query.error || null 
    });
  } catch (err) {
    res.render('error', { error: 'Notes Error', message: err.message });
  }
});

// POST Create New Study Note
// VULNERABILITY: Stored XSS - Accepts raw HTML/JS in content without sanitization!
router.post('/create', isAuthenticated, upload.single('attachment'), async (req, res) => {
  const { title, subject, content } = req.body;
  const authorId = req.session.user.id;
  const authorName = req.session.user.username;

  try {
    let filePath = null;
    if (req.file) {
      filePath = `/uploads/notes/${req.file.filename}`;
    }

    // VULNERABLE CODE: Insert raw content into DB (Stored XSS)
    const sql = `
      INSERT INTO notes (author_id, author_name, title, subject, content, file_path) 
      VALUES (${authorId}, '${authorName}', '${title}', '${subject}', '${content}', ${filePath ? `'${filePath}'` : 'NULL'})
    `;

    console.log(`[STORED XSS NOTE CREATION SQL]: ${sql}`);
    await db.query(sql);

    res.redirect('/notes?success=Study note shared successfully!');
  } catch (err) {
    res.redirect(`/notes?error=${encodeURIComponent(err.message)}`);
  }
});

// GET Download Note Attachment
router.get('/download/:id', isAuthenticated, async (req, res) => {
  const noteId = req.params.id;

  try {
    const [notes] = await db.query(`SELECT * FROM notes WHERE id=${noteId}`);
    if (notes.length === 0 || !notes[0].file_path) {
      return res.status(404).send('Attachment not found');
    }

    const note = notes[0];
    const absPath = path.join(__dirname, '../../', note.file_path);

    if (fs.existsSync(absPath)) {
      return res.download(absPath);
    } else {
      return res.send(`Attachment preview for: ${note.title} (Path: ${note.file_path})`);
    }
  } catch (err) {
    res.status(500).send(`Download Error: ${err.message}`);
  }
});

module.exports = router;
