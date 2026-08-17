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

-- 1 Fixed System Administrator Account (admin / admin123)
INSERT INTO users (id, username, password, email, role) VALUES
(1, 'admin', '0192023a7bbd73250516f069df18b500', 'admin@studenthub.lab', 'admin');

