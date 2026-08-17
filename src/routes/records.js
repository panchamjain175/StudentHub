const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db } = require('../config/db');
const { isAuthenticated } = require('../middleware/auth');

// Multer storage for certificates
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/certificates');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Preserve original filename (VULNERABILITY: path traversal or file overwrite potential)
    cb(null, Date.now() + '_' + file.originalname);
  }
});
const upload = multer({ storage });

// GET Academic Records & Grades Page
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
      return res.status(404).render('error', { error: 'Student Record Not Found', message: 'No student record associated with this account.' });
    }

    // Fetch Academic Grades & Attendance
    const [records] = await db.query(`SELECT * FROM academic_records WHERE student_id=${currentStudent.id} ORDER BY semester ASC`);
    
    // Fetch Certificates
    const [certificates] = await db.query(`SELECT * FROM certificates WHERE student_id=${currentStudent.id}`);

    res.render('records', { 
      student: currentStudent, 
      records, 
      certificates, 
      success: req.query.success || null, 
      error: req.query.error || null 
    });
  } catch (err) {
    res.render('error', { error: 'Error Loading Academic Records', message: err.message });
  }
});

// POST Upload Certificate
router.post('/certificates/upload', isAuthenticated, upload.single('certificate'), async (req, res) => {
  const { student_id, title, issuer, issue_date } = req.body;

  if (!req.file) {
    return res.redirect(`/records?student_id=${student_id}&error=Please select a file to upload.`);
  }

  try {
    const filePath = `/uploads/certificates/${req.file.filename}`;
    await db.query(
      `INSERT INTO certificates (student_id, title, issuer, issue_date, file_path) 
       VALUES (${student_id}, '${title}', '${issuer}', '${issue_date}', '${filePath}')`
    );

    res.redirect(`/records?student_id=${student_id}&success=Certificate uploaded successfully.`);
  } catch (err) {
    res.redirect(`/records?student_id=${student_id}&error=${encodeURIComponent(err.message)}`);
  }
});

// GET Download Certificate Endpoint
// VULNERABILITY: Broken Access Control - No ownership verification when downloading certificates!
router.get('/certificates/download/:id', isAuthenticated, async (req, res) => {
  const certId = req.params.id;

  try {
    const [certs] = await db.query(`SELECT * FROM certificates WHERE id=${certId}`);
    if (certs.length === 0) {
      return res.status(404).send('Certificate not found');
    }

    const cert = certs[0];
    const absolutePath = path.join(__dirname, '../../', cert.file_path);

    if (fs.existsSync(absolutePath)) {
      return res.download(absolutePath);
    } else {
      // Fallback response for demo environment
      return res.send(`Simulated certificate download for: ${cert.title} (File: ${cert.file_path})`);
    }
  } catch (err) {
    res.status(500).send(`Download Error: ${err.message}`);
  }
});

module.exports = router;
