const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db } = require('../config/db');
const { isAuthenticated } = require('../middleware/auth');

// Storage for vault documents
const vaultStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/vault');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Unsanitized filename (VULNERABILITY)
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

// Storage for avatars
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const uploadVault = multer({ storage: vaultStorage });
const uploadAvatar = multer({ storage: avatarStorage });

// GET Document Vault Page
router.get('/', isAuthenticated, async (req, res) => {
  const studentId = req.query.student_id;

  try {
    let currentStudent;
    if (studentId) {
      // IDOR flaw
      const [students] = await db.query(`SELECT * FROM students WHERE id=${studentId}`);
      currentStudent = students[0];
    } else {
      const [students] = await db.query(`SELECT * FROM students WHERE user_id=${req.session.user.id}`);
      currentStudent = students[0];
    }

    if (!currentStudent) {
      return res.status(404).render('error', { error: 'Student Profile Not Found', message: 'No student record found for document vault.' });
    }

    const [docs] = await db.query(`SELECT * FROM document_vault WHERE student_id=${currentStudent.id}`);

    res.render('vault', { 
      student: currentStudent, 
      docs, 
      success: req.query.success || null, 
      error: req.query.error || null 
    });
  } catch (err) {
    res.render('error', { error: 'Vault Error', message: err.message });
  }
});

// POST Upload Vault Document
router.post('/upload', isAuthenticated, uploadVault.single('document'), async (req, res) => {
  const { student_id, doc_type } = req.body;

  if (!req.file) {
    return res.redirect(`/vault?student_id=${student_id}&error=Please select a file to upload.`);
  }

  try {
    const filePath = `/uploads/vault/${req.file.filename}`;
    await db.query(
      `INSERT INTO document_vault (student_id, doc_type, file_name, file_path) 
       VALUES (${student_id}, '${doc_type}', '${req.file.originalname}', '${filePath}')`
    );

    res.redirect(`/vault?student_id=${student_id}&success=Document uploaded to vault.`);
  } catch (err) {
    res.redirect(`/vault?student_id=${student_id}&error=${encodeURIComponent(err.message)}`);
  }
});

// POST Upload Profile Picture
router.post('/avatar', isAuthenticated, uploadAvatar.single('avatar'), async (req, res) => {
  const { student_id } = req.body;

  if (!req.file) {
    return res.redirect(`/students/profile?id=${student_id}&error=Please select an image file.`);
  }

  try {
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await db.query(`UPDATE students SET avatar_url='${avatarUrl}' WHERE id=${student_id}`);

    res.redirect(`/students/profile?id=${student_id}&success=Profile picture updated.`);
  } catch (err) {
    res.redirect(`/students/profile?id=${student_id}&error=${encodeURIComponent(err.message)}`);
  }
});

// GET Download Vault Document
// VULNERABILITY: IDOR / Sensitive Data Exposure - downloads file without verifying user authorization!
router.get('/download/:id', isAuthenticated, async (req, res) => {
  const docId = req.params.id;

  try {
    const [docs] = await db.query(`SELECT * FROM document_vault WHERE id=${docId}`);
    if (docs.length === 0) {
      return res.status(404).send('Document not found in vault.');
    }

    const doc = docs[0];
    const absPath = path.join(__dirname, '../../', doc.file_path);

    if (fs.existsSync(absPath)) {
      return res.download(absPath);
    } else {
      return res.send(`Vault file preview for ${doc.file_name} (Type: ${doc.doc_type}). Path: ${doc.file_path}`);
    }
  } catch (err) {
    res.status(500).send(`Vault Error: ${err.message}`);
  }
});

module.exports = router;
