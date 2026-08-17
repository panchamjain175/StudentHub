const mysql = require('mysql2');
require('dotenv').config();

// Clean dataset ready for live user registrations with 1 fixed admin account
const memoryDb = {
  users: [
    { id: 1, username: 'admin', password: '0192023a7bbd73250516f069df18b500', email: 'admin@studenthub.lab', role: 'admin', created_at: new Date() }
  ],
  students: [],
  academic_records: [],
  projects: [],
  certificates: [],
  document_vault: [],
  notes: []
};

// Create real MySQL Pool
const realPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpass',
  database: process.env.DB_NAME || 'studenthub',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  multipleStatements: true
});

const promisePool = realPool.promise();

// Fallback executor for live dev server when native MySQL daemon is absent
async function query(sql, params) {
  try {
    return await promisePool.query(sql, params);
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'PROTOCOL_CONNECTION_LOST') {
      console.warn(`[DB FALLBACK]: MySQL connection absent (${err.code}). Using live dev server in-memory database.`);
      return handleFallbackQuery(sql, params);
    }
    throw err;
  }
}

function handleFallbackQuery(sql, params) {
  const sqlStr = sql.toString();
  
  // SQLi Bypass Login check
  if (sqlStr.includes('SELECT * FROM users WHERE username=') && (sqlStr.includes("OR '1'='1'") || sqlStr.includes("OR 1=1"))) {
    return [[memoryDb.users[0]], []];
  }

  // Regular login query
  if (sqlStr.includes('FROM users WHERE username=')) {
    const userMatch = sqlStr.match(/username='([^']+)'/);
    const passMatch = sqlStr.match(/password='([^']+)'/);
    if (userMatch) {
      const uVal = userMatch[1];
      const pVal = passMatch ? passMatch[1] : null;
      const found = memoryDb.users.filter(u => u.username === uVal && (!pVal || u.password === pVal));
      return [found, []];
    }
  }

  // Count queries
  if (sqlStr.includes('COUNT(*)')) {
    if (sqlStr.includes('FROM users')) return [[{ count: memoryDb.users.length }], []];
    if (sqlStr.includes('FROM students')) return [[{ count: memoryDb.students.length }], []];
    if (sqlStr.includes('FROM notes')) return [[{ count: memoryDb.notes.length }], []];
  }

  // Join Students + Users
  if (sqlStr.includes('FROM students s JOIN users u')) {
    const combined = memoryDb.students.map(s => {
      const u = memoryDb.users.find(user => user.id === s.user_id) || {};
      return { ...s, email: u.email, role: u.role, username: u.username, md5_password: u.password, password_hash: u.password };
    });
    if (sqlStr.includes('WHERE s.id=')) {
      const idMatch = sqlStr.match(/WHERE s.id=(\d+)/);
      const targetId = idMatch ? parseInt(idMatch[1]) : 1;
      return [combined.filter(s => s.id === targetId), []];
    }
    if (sqlStr.includes('WHERE s.user_id=')) {
      const uIdMatch = sqlStr.match(/WHERE s.user_id=(\d+)/);
      const targetUId = uIdMatch ? parseInt(uIdMatch[1]) : 1;
      return [combined.filter(s => s.user_id === targetUId), []];
    }
    if (sqlStr.includes('WHERE s.full_name LIKE')) {
      return [combined, []];
    }
    return [combined, []];
  }

  // Select Users (for Admin Dashboard and user queries)
  if (sqlStr.includes('FROM users u LEFT JOIN students s') || sqlStr.includes('FROM users')) {
    const res = memoryDb.users.map(u => {
      const st = memoryDb.students.find(s => s.user_id === u.id) || {};
      return { 
        ...u, 
        md5_hash: u.password, 
        full_name: st.full_name || u.username, 
        student_id_num: st.student_id_num || (u.role === 'admin' ? 'System Admin' : 'N/A')
      };
    });
    return [res, []];
  }

  // Select Students simple
  if (sqlStr.includes('FROM students')) {
    if (sqlStr.includes('WHERE user_id=')) {
      const uIdMatch = sqlStr.match(/user_id=(\d+)/);
      const uid = uIdMatch ? parseInt(uIdMatch[1]) : 1;
      return [memoryDb.students.filter(s => s.user_id === uid), []];
    }
    if (sqlStr.includes('WHERE id=')) {
      const idMatch = sqlStr.match(/id=(\d+)/);
      const sid = idMatch ? parseInt(idMatch[1]) : 1;
      return [memoryDb.students.filter(s => s.id === sid), []];
    }
    return [memoryDb.students, []];
  }

  // Academic Records
  if (sqlStr.includes('FROM academic_records')) {
    return [memoryDb.academic_records, []];
  }

  // Certificates
  if (sqlStr.includes('FROM certificates')) {
    return [memoryDb.certificates, []];
  }

  // Document Vault
  if (sqlStr.includes('FROM document_vault')) {
    return [memoryDb.document_vault, []];
  }

  // Class Notes
  if (sqlStr.includes('FROM notes')) {
    return [memoryDb.notes, []];
  }

  // Projects
  if (sqlStr.includes('FROM projects')) {
    return [memoryDb.projects, []];
  }

  // Handle INSERT INTO users
  if (sqlStr.startsWith('INSERT INTO users')) {
    const newId = memoryDb.users.length > 0 ? Math.max(...memoryDb.users.map(u => u.id)) + 1 : 1;
    const valuesPart = sqlStr.substring(sqlStr.indexOf('VALUES') + 6).trim();
    const cleanValues = valuesPart.replace(/^\(|\)$/g, '').split(',').map(s => s.trim().replace(/^'|'$/g, ''));
    
    const newUser = {
      id: newId,
      username: cleanValues[0] || `user_${newId}`,
      password: cleanValues[1] || '',
      email: cleanValues[2] || `user_${newId}@student.lab`,
      role: cleanValues[3] || 'student',
      created_at: new Date()
    };
    memoryDb.users.push(newUser);
    return [{ insertId: newId }, []];
  }

  // Handle INSERT INTO students
  if (sqlStr.startsWith('INSERT INTO students')) {
    const newId = memoryDb.students.length > 0 ? Math.max(...memoryDb.students.map(s => s.id)) + 1 : 1;
    const valuesPart = sqlStr.substring(sqlStr.indexOf('VALUES') + 6).trim();
    const cleanValues = valuesPart.replace(/^\(|\)$/g, '').split(',').map(s => s.trim().replace(/^'|'$/g, ''));

    const newStudent = {
      id: newId,
      user_id: parseInt(cleanValues[0]) || 1,
      student_id_num: cleanValues[1] || `STU-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      full_name: cleanValues[2] || 'Student',
      course: cleanValues[3] || 'Computer Science',
      semester: 1,
      gpa: '3.50',
      avatar_url: '/uploads/avatars/default.png',
      bio: 'Registered student account.'
    };
    memoryDb.students.push(newStudent);
    return [{ insertId: newId }, []];
  }

  if (sqlStr.startsWith('INSERT INTO certificates')) {
    const newId = memoryDb.certificates.length + 1;
    return [{ insertId: newId }, []];
  }

  if (sqlStr.startsWith('INSERT INTO document_vault')) {
    const newId = memoryDb.document_vault.length + 1;
    return [{ insertId: newId }, []];
  }

  if (sqlStr.startsWith('INSERT INTO notes')) {
    const newId = memoryDb.notes.length + 1;
    return [{ insertId: newId }, []];
  }

  // Handle UPDATE users SET role=
  if (sqlStr.startsWith('UPDATE users SET role=')) {
    const roleMatch = sqlStr.match(/role='([^']+)' WHERE id=(\d+)/);
    if (roleMatch) {
      const targetRole = roleMatch[1];
      const targetId = parseInt(roleMatch[2]);
      const targetUser = memoryDb.users.find(u => u.id === targetId);
      if (targetUser) targetUser.role = targetRole;
    }
    return [{ affectedRows: 1 }, []];
  }

  // Handle UPDATE users SET password=
  if (sqlStr.startsWith('UPDATE users SET password=')) {
    const passMatch = sqlStr.match(/password='([^']+)' WHERE email='([^']+)'/);
    if (passMatch) {
      const u = memoryDb.users.find(user => user.email === passMatch[2]);
      if (u) u.password = passMatch[1];
    }
    return [{ affectedRows: 1 }, []];
  }

  // Handle DELETE FROM users
  if (sqlStr.startsWith('DELETE FROM users')) {
    const idMatch = sqlStr.match(/WHERE id=(\d+)/);
    if (idMatch) {
      const targetId = parseInt(idMatch[1]);
      const uIdx = memoryDb.users.findIndex(u => u.id === targetId);
      if (uIdx !== -1) memoryDb.users.splice(uIdx, 1);
      const sIdx = memoryDb.students.findIndex(s => s.user_id === targetId);
      if (sIdx !== -1) memoryDb.students.splice(sIdx, 1);
    }
    return [{ affectedRows: 1 }, []];
  }

  // Default fallback insert result
  if (sqlStr.startsWith('INSERT')) {
    return [{ insertId: Date.now() }, []];
  }

  return [[], []];
}

module.exports = {
  pool: realPool,
  db: {
    query: query,
    execute: query
  }
};
