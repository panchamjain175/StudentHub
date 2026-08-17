const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { db } = require('../config/db');

// Helper for MD5 hashing
function md5(string) {
  return crypto.createHash('md5').update(string).digest('hex');
}

// GET Login Page
router.get('/login', (req, res) => {
  res.render('login', { error: null, success: null });
});

// POST Login Endpoint
// VULNERABILITY 1: SQL Injection via string concatenation
// VULNERABILITY 2: Weak MD5 Password Verification
// VULNERABILITY 3: No account lockout on brute-force attempts
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const passwordHash = md5(password || '');

    // VULNERABLE CODE: Direct string concatenation into SQL query!
    const sqlQuery = `SELECT * FROM users WHERE username='${username}' AND password='${passwordHash}'`;
    console.log(`[SQL EXEC]: ${sqlQuery}`);

    const [rows] = await db.query(sqlQuery);

    if (rows.length > 0) {
      const user = rows[0];

      // VULNERABLE SESSION TOKEN: Base64 string of user metadata
      const sessionToken = Buffer.from(`${user.id}:${user.role}:${user.username}`).toString('base64');

      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      };

      // Set vulnerable auth_token cookie
      res.cookie('auth_token', sessionToken, { httpOnly: false }); // httpOnly disabled!

      return res.redirect('/dashboard');
    } else {
      return res.render('login', { 
        error: 'Invalid username or password credentials.', 
        success: null 
      });
    }
  } catch (err) {
    // VULNERABILITY: Verbose error message leaks DB error stack trace to client
    console.error('Login SQL Error:', err);
    return res.render('login', { 
      error: `Database Query Error: ${err.message} (SQL: ${err.sql})`, 
      success: null 
    });
  }
});

// GET Register Page
router.get('/register', (req, res) => {
  res.render('register', { error: null, success: null });
});

// POST Register Endpoint
// VULNERABILITY: Allows mass assignment / privilege escalation by specifying role field directly
router.post('/register', async (req, res) => {
  const { username, email, password, role, full_name, course } = req.body;

  try {
    const passwordHash = md5(password);
    const userRole = 'student'; // Restrict self-registration strictly to student role

    // Insert into users
    const [userResult] = await db.query(
      `INSERT INTO users (username, password, email, role) VALUES ('${username}', '${passwordHash}', '${email}', '${userRole}')`
    );

    const userId = userResult.insertId;

    // If student, create student profile
    if (userRole === 'student') {
      const studentIdNum = `STU-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      await db.query(
        `INSERT INTO students (user_id, student_id_num, full_name, course) VALUES (${userId}, '${studentIdNum}', '${full_name || username}', '${course || 'Computer Science'}')`
      );
    }

    return res.render('login', { 
      error: null, 
      success: 'Registration successful! You can now log in.' 
    });
  } catch (err) {
    return res.render('register', { 
      error: `Registration Error: ${err.message}`, 
      success: null 
    });
  }
});

// GET Forgot Password Page
router.get('/forgot-password', (req, res) => {
  res.render('forgot_password', { error: null, success: null, resetUrl: null });
});

// POST Forgot Password Request
// VULNERABILITY: Reset token is predictable base64(email) AND leaked in response/URL!
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const [users] = await db.query(`SELECT * FROM users WHERE email='${email}'`);
    if (users.length === 0) {
      return res.render('forgot_password', { 
        error: 'No user account found with that email address.', 
        success: null, 
        resetUrl: null 
      });
    }

    // Predictable token: base64(email)
    const token = Buffer.from(email).toString('base64');
    
    // Store in DB
    await db.query(`INSERT INTO password_resets (email, token) VALUES ('${email}', '${token}')`);

    const resetUrl = `/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    // VULNERABILITY: Leaks reset token and URL directly in UI response!
    return res.render('forgot_password', {
      error: null,
      success: 'Password reset request generated successfully!',
      resetUrl: resetUrl
    });
  } catch (err) {
    return res.render('forgot_password', { 
      error: `Error generating reset link: ${err.message}`, 
      success: null, 
      resetUrl: null 
    });
  }
});

// GET Reset Password Page
router.get('/reset-password', (req, res) => {
  const { token, email } = req.query;
  res.render('reset_password', { token, email, error: null, success: null });
});

// POST Reset Password Submit
router.post('/reset-password', async (req, res) => {
  const { token, email, new_password } = req.body;

  try {
    // Weak validation of token
    const newHash = md5(new_password);
    await db.query(`UPDATE users SET password='${newHash}' WHERE email='${email}'`);
    await db.query(`UPDATE password_resets SET used=1 WHERE token='${token}'`);

    return res.render('login', { 
      error: null, 
      success: 'Password successfully updated! Please log in with your new password.' 
    });
  } catch (err) {
    return res.render('reset_password', { 
      token, 
      email, 
      error: `Failed to reset password: ${err.message}`, 
      success: null 
    });
  }
});

// Logout Endpoint
// VULNERABILITY: No server-side session invalidation (cookie cleared only)
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('auth_token');
    res.clearCookie('connect.sid');
    res.redirect('/auth/login');
  });
});

module.exports = router;
