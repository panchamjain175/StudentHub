const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { isAuthenticated } = require('../middleware/auth');

// GET Admin Dashboard
// VULNERABILITY: Missing strict server-side role check!
// Accessible by directly navigating to /admin/dashboard or setting X-User-Role header
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    // Fetch system stats
    const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
    const [studentCount] = await db.query('SELECT COUNT(*) as count FROM students');
    const [notesCount] = await db.query('SELECT COUNT(*) as count FROM notes');

    // Fetch all users list with MD5 passwords exposed
    const [users] = await db.query(
      `SELECT u.id, u.username, u.email, u.role, u.password as md5_hash, u.created_at, s.student_id_num, s.full_name 
       FROM users u 
       LEFT JOIN students s ON u.id = s.user_id 
       ORDER BY u.id ASC`
    );

    res.render('admin', { 
      stats: {
        users: userCount[0].count,
        students: studentCount[0].count,
        notes: notesCount[0].count
      },
      users, 
      success: req.query.success || null, 
      error: req.query.error || null 
    });
  } catch (err) {
    res.render('error', { error: 'Admin Dashboard Error', message: err.message });
  }
});

// POST Admin Change User Role
// VULNERABILITY: Allows changing role without verification
router.post('/users/role', isAuthenticated, async (req, res) => {
  const { user_id, new_role } = req.body;

  try {
    await db.query(`UPDATE users SET role='${new_role}' WHERE id=${user_id}`);
    res.redirect('/admin/dashboard?success=User role updated successfully');
  } catch (err) {
    res.redirect(`/admin/dashboard?error=${encodeURIComponent(err.message)}`);
  }
});

// POST Delete User Account
router.post('/users/delete', isAuthenticated, async (req, res) => {
  const { user_id } = req.body;

  try {
    await db.query(`DELETE FROM users WHERE id=${user_id}`);
    res.redirect('/admin/dashboard?success=User account deleted');
  } catch (err) {
    res.redirect(`/admin/dashboard?error=${encodeURIComponent(err.message)}`);
  }
});

module.exports = router;
