const mysql = require('mysql2');
require('dotenv').config();

// Clean dataset ready for live user registrations & file uploads
const memoryDb = {
  users: [],
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

  // Select Users
  if (sqlStr.includes('FROM users u LEFT JOIN students s') || sqlStr.includes('FROM users')) {
    const res = memoryDb.users.map(u => {
      const st = memoryDb.students.find(s => s.user_id === u.id) || {};
      return { ...u, md5_hash: u.password, full_name: st.full_name, student_id_num: st.student_id_num };
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

  // Handle INSERT queries and save to memoryDb arrays
  if (sqlStr.startsWith('INSERT INTO users')) {
    const usernameMatch = sqlStr.match(/VALUES \('([^']+)', '([^']+)', '([^']+)', '([^']+)'\)/);
    const newId = memoryDb.users.length + 1;
    if (usernameMatch) {
      const newUser = {
        id: newId,
        username: usernameMatch[1],
        password: usernameMatch[2],
        email: usernameMatch[3],
        role: usernameMatch[4] || 'student',
        created_at: new Date()
      };
      memoryDb.users.push(newUser);
      return [{ insertId: newId }, []];
    }
  }

  if (sqlStr.startsWith('INSERT INTO students')) {
    const studentMatch = sqlStr.match(/VALUES \((\d+), '([^']+)', '([^']+)', '([^']+)'\)/);
    const newId = memoryDb.students.length + 1;
    if (studentMatch) {
      const newStudent = {
        id: newId,
        user_id: parseInt(studentMatch[1]),
        student_id_num: studentMatch[2],
        full_name: studentMatch[3],
        course: studentMatch[4],
        semester: 1,
        gpa: '3.50',
        avatar_url: '/uploads/avatars/default.png',
        bio: 'New registered student account.'
      };
      memoryDb.students.push(newStudent);
      return [{ insertId: newId }, []];
    }
  }

  if (sqlStr.startsWith('INSERT INTO certificates')) {
    const certMatch = sqlStr.match(/VALUES \((\d+), '([^']+)', '([^']+)', '([^']+)', '([^']+)'\)/);
    const newId = memoryDb.certificates.length + 1;
    if (certMatch) {
      memoryDb.certificates.push({
        id: newId,
        student_id: parseInt(certMatch[1]),
        title: certMatch[2],
        issuer: certMatch[3],
        issue_date: certMatch[4],
        file_path: certMatch[5]
      });
      return [{ insertId: newId }, []];
    }
  }

  if (sqlStr.startsWith('INSERT INTO document_vault')) {
    const vaultMatch = sqlStr.match(/VALUES \((\d+), '([^']+)', '([^']+)', '([^']+)'\)/);
    const newId = memoryDb.document_vault.length + 1;
    if (vaultMatch) {
      memoryDb.document_vault.push({
        id: newId,
        student_id: parseInt(vaultMatch[1]),
        doc_type: vaultMatch[2],
        file_name: vaultMatch[3],
        file_path: vaultMatch[4],
        uploaded_at: new Date()
      });
      return [{ insertId: newId }, []];
    }
  }

  if (sqlStr.startsWith('INSERT INTO notes')) {
    const newId = memoryDb.notes.length + 1;
    const authorIdMatch = sqlStr.match(/VALUES \((\d+),/);
    const titleMatch = sqlStr.match(/, '([^']+)', '([^']+)', '([^']+)',/);
    memoryDb.notes.unshift({
      id: newId,
      author_id: authorIdMatch ? parseInt(authorIdMatch[1]) : 1,
      author_name: 'Author',
      title: titleMatch ? titleMatch[1] : 'Note Title',
      subject: titleMatch ? titleMatch[2] : 'General',
      content: titleMatch ? titleMatch[3] : 'Note Content',
      file_path: null,
      created_at: new Date()
    });
    return [{ insertId: newId }, []];
  }

  if (sqlStr.startsWith('UPDATE users SET password=')) {
    const passMatch = sqlStr.match(/password='([^']+)' WHERE email='([^']+)'/);
    if (passMatch) {
      const u = memoryDb.users.find(user => user.email === passMatch[2]);
      if (u) u.password = passMatch[1];
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
