const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { isAuthenticated } = require('../middleware/auth');

// GET Student Search Page & API
// VULNERABILITY 1: SQL Injection in search filter
// VULNERABILITY 2: Reflected XSS when rendering searchQuery
router.get('/search', isAuthenticated, async (req, res) => {
  const query = req.query.q || '';

  try {
    let sqlQuery = 'SELECT s.*, u.email, u.role FROM students s JOIN users u ON s.user_id = u.id';
    
    if (query) {
      // VULNERABLE SQL: Concatenates user input directly into WHERE clause
      sqlQuery += ` WHERE s.full_name LIKE '%${query}%' OR s.student_id_num='${query}' OR s.course LIKE '%${query}%'`;
    }

    console.log(`[SEARCH SQL EXEC]: ${sqlQuery}`);
    const [students] = await db.query(sqlQuery);

    res.render('search', { 
      students, 
      searchQuery: query, 
      error: null 
    });
  } catch (err) {
    res.render('search', { 
      students: [], 
      searchQuery: query, 
      error: `Search SQL Error: ${err.message}` 
    });
  }
});

// GET Student Profile View
// VULNERABILITY: IDOR (Insecure Direct Object Reference)
// Allows viewing any student profile by changing ?id= parameter
router.get('/profile', isAuthenticated, async (req, res) => {
  // If id is provided in query, use it (IDOR vulnerability), otherwise default to logged in student
  let targetStudentId = req.query.id;

  try {
    let studentRow;
    
    if (targetStudentId) {
      // Fetch by specified student ID without ownership check!
      const [rows] = await db.query(
        `SELECT s.*, u.username, u.email, u.role, u.password AS md5_password 
         FROM students s 
         JOIN users u ON s.user_id = u.id 
         WHERE s.id=${targetStudentId}`
      );
      studentRow = rows[0];
    } else {
      // Default to logged-in user's student profile
      const [rows] = await db.query(
        `SELECT s.*, u.username, u.email, u.role, u.password AS md5_password 
         FROM students s 
         JOIN users u ON s.user_id = u.id 
         WHERE s.user_id=${req.session.user.id}`
      );
      studentRow = rows[0];
    }

    if (!studentRow) {
      return res.status(404).render('error', { error: 'Student Profile Not Found', message: 'The requested student record does not exist.' });
    }

    // Fetch related projects
    const [projects] = await db.query(`SELECT * FROM projects WHERE student_id=${studentRow.id}`);
    
    // Fetch academic summary
    const [records] = await db.query(`SELECT * FROM academic_records WHERE student_id=${studentRow.id}`);

    res.render('profile', { 
      student: studentRow, 
      projects, 
      records, 
      success: req.query.success || null, 
      error: null 
    });
  } catch (err) {
    res.render('error', { error: 'Profile Loading Error', message: err.message });
  }
});

// POST Update Student Profile
// VULNERABILITY 1: IDOR in update target (student_id in body)
// VULNERABILITY 2: Privilege Escalation (accepts and updates 'role' parameter in POST body)
router.post('/profile/update', isAuthenticated, async (req, res) => {
  const { student_id, full_name, phone, address, course, github_url, bio, role } = req.body;

  try {
    // VULNERABILITY: Updates student record based on student_id passed in form body, regardless of logged-in user ID
    const updateSql = `
      UPDATE students 
      SET full_name='${full_name}', phone='${phone}', address='${address}', course='${course}', github_url='${github_url}', bio='${bio}' 
      WHERE id=${student_id}
    `;
    await db.query(updateSql);

    // VULNERABILITY: Mass assignment / Privilege Escalation
    // If role field is supplied, updates user role in users table!
    if (role) {
      const [student] = await db.query(`SELECT user_id FROM students WHERE id=${student_id}`);
      if (student.length > 0) {
        await db.query(`UPDATE users SET role='${role}' WHERE id=${student[0].user_id}`);
        // If updating self, update session role
        if (req.session.user && req.session.user.id === student[0].user_id) {
          req.session.user.role = role;
        }
      }
    }

    res.redirect(`/students/profile?id=${student_id}&success=Profile updated successfully`);
  } catch (err) {
    res.redirect(`/students/profile?id=${student_id}&error=${encodeURIComponent(err.message)}`);
  }
});

// GET JSON API for Student Record
// VULNERABILITY: Sensitive Data Exposure - returns password MD5 hash in JSON payload
router.get('/api/:id', isAuthenticated, async (req, res) => {
  try {
    const studentId = req.params.id;
    const [rows] = await db.query(
      `SELECT s.*, u.username, u.email, u.role, u.password AS password_hash 
       FROM students s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.id=${studentId}`
    );
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Returns full object including password_hash!
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

module.exports = router;
