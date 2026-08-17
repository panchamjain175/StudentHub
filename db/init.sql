-- ============================================================
-- StudentHub Security Training Lab Database Schema & Seed Data
-- ============================================================

CREATE DATABASE IF NOT EXISTS studenthub;
USE studenthub;

-- Drop existing tables
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS document_vault;
DROP TABLE IF EXISTS certificates;
DROP TABLE IF EXISTS academic_records;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS users;

-- 1. Users Table
-- VULNERABILITY: Passwords stored as unsalted MD5 hashes
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(32) NOT NULL, -- MD5 hash string (32 hex chars)
    email VARCHAR(100) NOT NULL UNIQUE,
    role ENUM('student', 'faculty', 'admin') DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Students Profile Table
CREATE TABLE students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    student_id_num VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    dob DATE,
    phone VARCHAR(20),
    address TEXT,
    course VARCHAR(100),
    semester INT DEFAULT 1,
    gpa DECIMAL(3,2) DEFAULT 3.50,
    avatar_url VARCHAR(255) DEFAULT '/uploads/avatars/default.png',
    github_url VARCHAR(255),
    bio TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Academic Records Table
CREATE TABLE academic_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_code VARCHAR(20) NOT NULL,
    course_name VARCHAR(100) NOT NULL,
    grade VARCHAR(5) NOT NULL,
    credits INT NOT NULL DEFAULT 3,
    attendance_percentage DECIMAL(5,2) DEFAULT 95.0,
    semester INT NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 4. Projects & Repository Links Table
CREATE TABLE projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    tech_stack VARCHAR(100),
    github_url VARCHAR(255),
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 5. Certificates Table
CREATE TABLE certificates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    issuer VARCHAR(100) NOT NULL,
    issue_date DATE,
    file_path VARCHAR(255) NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 6. Document Vault Table
CREATE TABLE document_vault (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    doc_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 7. Class Notes & Study Materials Table
-- VULNERABILITY: Content field renders unsanitized HTML (Stored XSS)
CREATE TABLE notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    author_id INT NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    title VARCHAR(150) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    file_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Password Resets Table
-- VULNERABILITY: Reset token is deterministic base64(email)
CREATE TABLE password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used TINYINT(1) DEFAULT 0
);

-- ============================================================
-- SEED DATA (MD5 Hashes: admin123 -> 0192023a7bbd73250516f069df18b500, password123 -> 482c811da5d5b4bc6d497ffa98491e38)
-- ============================================================

-- Seed Users
INSERT INTO users (id, username, password, email, role) VALUES
(1, 'admin', '0192023a7bbd73250516f069df18b500', 'admin@studenthub.lab', 'admin'),
(2, 'prof_smith', '482c811da5d5b4bc6d497ffa98491e38', 'smith@faculty.studenthub.lab', 'faculty'),
(3, 'alex_j', '482c811da5d5b4bc6d497ffa98491e38', 'alex.j@student.lab', 'student'),
(4, 'sarah_c', '482c811da5d5b4bc6d497ffa98491e38', 'sarah.c@student.lab', 'student'),
(5, 'michael_s', '482c811da5d5b4bc6d497ffa98491e38', 'michael.s@student.lab', 'student');

-- Seed Students
INSERT INTO students (id, user_id, student_id_num, full_name, dob, phone, address, course, semester, gpa, avatar_url, github_url, bio) VALUES
(1, 3, 'STU-2024-001', 'Alex Johnson', '2002-04-15', '+1-555-0192', '124 Innovation Way, Tech City, TC 90210', 'Computer Science', 4, 3.85, '/uploads/avatars/alex.jpg', 'https://github.com/alexj-dev', 'Passionate about cyber defense, web development, and cloud systems.'),
(2, 4, 'STU-2024-002', 'Sarah Connor', '2001-11-20', '+1-555-0144', '742 Evergreen Terrace, Springfield, SP 12345', 'Cyber Security', 6, 3.92, '/uploads/avatars/sarah.jpg', 'https://github.com/sconnor-sec', 'Focusing on network security, penetration testing, and digital forensics.'),
(3, 5, 'STU-2024-003', 'Michael Scott', '2003-01-08', '+1-555-0188', '1725 Slough Avenue, Scranton, PA 18503', 'Information Systems', 2, 3.20, '/uploads/avatars/michael.jpg', 'https://github.com/mscott-is', 'Interested in database systems, business analytics, and IT management.');

-- Seed Academic Records
INSERT INTO academic_records (student_id, course_code, course_name, grade, credits, attendance_percentage, semester) VALUES
(1, 'CS101', 'Introduction to Computer Science', 'A', 4, 98.0, 1),
(1, 'CS201', 'Data Structures & Algorithms', 'A-', 4, 95.5, 2),
(1, 'CS301', 'Database Management Systems', 'A', 3, 97.0, 3),
(1, 'CS401', 'Web Application Security', 'A+', 3, 100.0, 4),
(2, 'SEC101', 'Principles of Information Security', 'A+', 4, 99.0, 1),
(2, 'SEC202', 'Ethical Hacking & Pentesting', 'A', 4, 96.5, 3),
(2, 'SEC303', 'Network & Wireless Security', 'A', 3, 98.2, 5),
(3, 'IS101', 'Fundamentals of Management Info Systems', 'B+', 3, 91.0, 1),
(3, 'IS201', 'Business Data Analytics', 'B', 3, 89.5, 2);

-- Seed Projects
INSERT INTO projects (student_id, title, description, tech_stack, github_url) VALUES
(1, 'Cloud File Manager', 'A distributed file storage solution with custom encryption.', 'Node.js, Express, AWS S3', 'https://github.com/alexj-dev/cloud-file-mgr'),
(1, 'Algorithmic Visualizer', 'Interactive React application demonstrating sorting algorithms.', 'React, TypeScript, Canvas API', 'https://github.com/alexj-dev/algo-viz'),
(2, 'Packet Sniffer Lab', 'Python-based raw socket packet analyzer for lab exercises.', 'Python, Scapy, Wireshark', 'https://github.com/sconnor-sec/packet-lab');

-- Seed Certificates
INSERT INTO certificates (student_id, title, issuer, issue_date, file_path) VALUES
(1, 'CompTIA Security+ Certification', 'CompTIA', '2025-06-15', '/uploads/certificates/alex_security_plus.pdf'),
(1, 'AWS Certified Solutions Architect', 'Amazon Web Services', '2025-09-10', '/uploads/certificates/alex_aws_sa.pdf'),
(2, 'Certified Ethical Hacker (CEH)', 'EC-Council', '2025-08-01', '/uploads/certificates/sarah_ceh.pdf');

-- Seed Document Vault
INSERT INTO document_vault (student_id, doc_type, file_name, file_path) VALUES
(1, 'ID Proof', 'alex_passport_scan.pdf', '/uploads/vault/alex_passport_scan.pdf'),
(1, 'Transcript', 'alex_official_transcript.pdf', '/uploads/vault/alex_official_transcript.pdf'),
(1, 'Resume', 'alex_johnson_resume.pdf', '/uploads/vault/alex_johnson_resume.pdf'),
(2, 'ID Proof', 'sarah_driver_license.pdf', '/uploads/vault/sarah_driver_license.pdf'),
(2, 'Resume', 'sarah_connor_resume.pdf', '/uploads/vault/sarah_connor_resume.pdf');

-- Seed Class Notes
-- Notice note 2 contains a stored XSS trigger payload for testing!
INSERT INTO notes (author_id, author_name, title, subject, content, file_path) VALUES
(2, 'Prof. Smith', 'CS401 - Web Security Fundamentals Lecture Notes', 'CS401', 'Here are the core notes regarding HTTP headers, session management, and OWASP Top 10 vulnerabilities.', '/uploads/notes/cs401_lecture1.pdf'),
(3, 'Alex Johnson', 'SQL Injection Cheatsheet & Test Notes', 'CS401', 'Quick reference guide for testing parameter injection points.<script>console.log("XSS Test Triggered from Note!");</script>', NULL),
(4, 'Sarah Connor', 'Network Security Lab Setup Guide', 'SEC303', 'Step-by-step instructions to configure GNS3 and Wireshark for packet analysis.', '/uploads/notes/sec303_lab_guide.pdf');
