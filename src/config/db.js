const mysql = require('mysql2');
require('dotenv').config();

// Default seed dataset for standalone live dev server (when MySQL daemon is absent)
const memoryDb = {
  users: [
    { id: 1, username: 'admin', password: '0192023a7bbd73250516f069df18b500', email: 'admin@studenthub.lab', role: 'admin', created_at: new Date() },
    { id: 2, username: 'prof_smith', password: '482c811da5d5b4bc6d497ffa98491e38', email: 'smith@faculty.studenthub.lab', role: 'faculty', created_at: new Date() },
    { id: 3, username: 'alex_j', password: '482c811da5d5b4bc6d497ffa98491e38', email: 'alex.j@student.lab', role: 'student', created_at: new Date() },
    { id: 4, username: 'sarah_c', password: '482c811da5d5b4bc6d497ffa98491e38', email: 'sarah.c@student.lab', role: 'student', created_at: new Date() },
    { id: 5, username: 'michael_s', password: '482c811da5d5b4bc6d497ffa98491e38', email: 'michael.s@student.lab', role: 'student', created_at: new Date() }
  ],
  students: [
    { id: 1, user_id: 3, student_id_num: 'STU-2024-001', full_name: 'Alex Johnson', dob: '2002-04-15', phone: '+1-555-0192', address: '124 Innovation Way, Tech City, TC 90210', course: 'Computer Science', semester: 4, gpa: '3.85', avatar_url: '/uploads/avatars/default.png', github_url: 'https://github.com/alexj-dev', bio: 'Passionate about cyber defense, web development, and cloud systems.' },
    { id: 2, user_id: 4, student_id_num: 'STU-2024-002', full_name: 'Sarah Connor', dob: '2001-11-20', phone: '+1-555-0144', address: '742 Evergreen Terrace, Springfield, SP 12345', course: 'Cyber Security', semester: 6, gpa: '3.92', avatar_url: '/uploads/avatars/default.png', github_url: 'https://github.com/sconnor-sec', bio: 'Focusing on network security, penetration testing, and digital forensics.' },
    { id: 3, user_id: 5, student_id_num: 'STU-2024-003', full_name: 'Michael Scott', dob: '2003-01-08', phone: '+1-555-0188', address: '1725 Slough Avenue, Scranton, PA 18503', course: 'Information Systems', semester: 2, gpa: '3.20', avatar_url: '/uploads/avatars/default.png', github_url: 'https://github.com/mscott-is', bio: 'Interested in database systems, business analytics, and IT management.' }
  ],
  academic_records: [
    { id: 1, student_id: 1, course_code: 'CS101', course_name: 'Introduction to Computer Science', grade: 'A', credits: 4, attendance_percentage: 98.0, semester: 1 },
    { id: 2, student_id: 1, course_code: 'CS201', course_name: 'Data Structures & Algorithms', grade: 'A-', credits: 4, attendance_percentage: 95.5, semester: 2 },
    { id: 3, student_id: 1, course_code: 'CS301', course_name: 'Database Management Systems', grade: 'A', credits: 3, attendance_percentage: 97.0, semester: 3 },
    { id: 4, student_id: 1, course_code: 'CS401', course_name: 'Web Application Security', grade: 'A+', credits: 3, attendance_percentage: 100.0, semester: 4 },
    { id: 5, student_id: 2, course_code: 'SEC101', course_name: 'Principles of Information Security', grade: 'A+', credits: 4, attendance_percentage: 99.0, semester: 1 },
    { id: 6, student_id: 2, course_code: 'SEC202', course_name: 'Ethical Hacking & Pentesting', grade: 'A', credits: 4, attendance_percentage: 96.5, semester: 3 }
  ],
  projects: [
    { id: 1, student_id: 1, title: 'Cloud File Manager', description: 'Distributed file storage solution with custom encryption.', tech_stack: 'Node.js, Express, AWS S3', github_url: 'https://github.com/alexj-dev/cloud-file-mgr' },
    { id: 2, student_id: 2, title: 'Packet Sniffer Lab', description: 'Python-based raw socket packet analyzer for lab exercises.', tech_stack: 'Python, Scapy, Wireshark', github_url: 'https://github.com/sconnor-sec/packet-lab' }
  ],
  certificates: [
    { id: 1, student_id: 1, title: 'CompTIA Security+ Certification', issuer: 'CompTIA', issue_date: '2025-06-15', file_path: '/uploads/certificates/alex_security_plus.pdf' },
    { id: 2, student_id: 2, title: 'Certified Ethical Hacker (CEH)', issuer: 'EC-Council', issue_date: '2025-08-01', file_path: '/uploads/certificates/sarah_ceh.pdf' }
  ],
  document_vault: [
    { id: 1, student_id: 1, doc_type: 'ID Proof', file_name: 'alex_passport_scan.pdf', file_path: '/uploads/vault/alex_passport_scan.pdf', uploaded_at: new Date() },
    { id: 2, student_id: 1, doc_type: 'Transcript', file_name: 'alex_official_transcript.pdf', file_path: '/uploads/vault/alex_official_transcript.pdf', uploaded_at: new Date() },
    { id: 3, student_id: 2, doc_type: 'ID Proof', file_name: 'sarah_driver_license.pdf', file_path: '/uploads/vault/sarah_driver_license.pdf', uploaded_at: new Date() }
  ],
  notes: [
    { id: 1, author_id: 2, author_name: 'Prof. Smith', title: 'CS401 - Web Security Fundamentals', subject: 'CS401', content: 'Core notes regarding HTTP headers, session management, and OWASP Top 10 vulnerabilities.', file_path: '/uploads/notes/cs401_lecture1.pdf', created_at: new Date() },
    { id: 2, author_id: 3, author_name: 'Alex Johnson', title: 'SQL Injection Cheatsheet', subject: 'CS401', content: 'Quick reference guide for testing parameter injection points.<script>console.log("XSS Test Triggered!");</script>', file_path: null, created_at: new Date() }
  ]
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
