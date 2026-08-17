# 🛡️ StudentHub Pentesting Answer Key & Instructor Guide

```
===================================================================================
CONFIDENTIAL INSTRUCTOR / PENTESTING ANSWER KEY
DO NOT DISPLAY IN PUBLIC APP USER INTERFACE
===================================================================================
```

This document details all intentionally planted security flaws within the **StudentHub** application. It serves as an instructor reference guide, grading benchmark, and remediation manual.

---

## 📌 Vulnerability Matrix Overview

| Category | Vulnerability Type | Primary Target File | OWASP Mapping |
|---|---|---|---|
| **1. SQL Injection** | Authentication Bypass & Blind SQLi | [src/routes/auth.js](file:///c:/Users/User/Ethone/src/routes/auth.js) | A03:2021-Injection |
| **1. SQL Injection** | Search Filter String Concatenation | [src/routes/students.js](file:///c:/Users/User/Ethone/src/routes/students.js) | A03:2021-Injection |
| **2. Broken Auth** | Unsalted MD5 Hashing & Predictable Session | [db/init.sql](file:///c:/Users/User/Ethone/db/init.sql), [src/routes/auth.js](file:///c:/Users/User/Ethone/src/routes/auth.js) | A07:2021-Identification & Auth Failures |
| **2. Broken Auth** | Leaked Password Reset Token | [src/routes/auth.js](file:///c:/Users/User/Ethone/src/routes/auth.js) | A07:2021-Identification & Auth Failures |
| **3. Sensitive Data Exposure** | Password Hash Leakage in API & UI | [src/routes/students.js](file:///c:/Users/User/Ethone/src/routes/students.js) | A02:2021-Cryptographic Failures |
| **3. Sensitive Data Exposure** | Unauthenticated Static Upload Access | [src/app.js](file:///c:/Users/User/Ethone/src/app.js) | A01:2021-Broken Access Control |
| **4. XXE Injection** | XML External Entity File Disclosure | [src/routes/import.js](file:///c:/Users/User/Ethone/src/routes/import.js) | A05:2021-Security Misconfiguration |
| **5. Broken Access Control** | IDOR Profile & Document Access | [src/routes/students.js](file:///c:/Users/User/Ethone/src/routes/students.js) | A01:2021-Broken Access Control |
| **5. Broken Access Control** | Privilege Escalation in Profile Update | [src/routes/students.js](file:///c:/Users/User/Ethone/src/routes/students.js) | A01:2021-Broken Access Control |
| **5. Broken Access Control** | Unrestricted Admin Dashboard Route | [src/routes/admin.js](file:///c:/Users/User/Ethone/src/routes/admin.js) | A01:2021-Broken Access Control |
| **6. Misconfiguration** | CORS `*`, Verbose 500 Error Traces | [src/app.js](file:///c:/Users/User/Ethone/src/app.js) | A05:2021-Security Misconfiguration |
| **7. Cross-Site Scripting** | Stored XSS in Class Notes | [src/views/notes.ejs](file:///c:/Users/User/Ethone/src/views/notes.ejs) | A03:2021-Injection |
| **7. Cross-Site Scripting** | Reflected XSS in Search Query | [src/views/search.ejs](file:///c:/Users/User/Ethone/src/views/search.ejs) | A03:2021-Injection |
| **7. Cross-Site Scripting** | DOM XSS via URL Hash/Param | [src/public/js/main.js](file:///c:/Users/User/Ethone/src/public/js/main.js) | A03:2021-Injection |

---

## 1. SQL INJECTION (SQLi)

### Flaw 1.1: Authentication Bypass (Login Query)
- **File**: [src/routes/auth.js](file:///c:/Users/User/Ethone/src/routes/auth.js#L20-L28)
- **Root Cause**: SQL query constructed using string interpolation with unsanitized user inputs.
- **Vulnerable Code**:
  ```javascript
  const sqlQuery = `SELECT * FROM users WHERE username='${username}' AND password='${passwordHash}'`;
  ```
- **Exploitation POC Payload**:
  - Username: `' OR '1'='1' -- `
  - Password: `any`
  - Result: Logged in as `admin` (the first user in the database table).

### Flaw 1.2: Student Directory Search Filter Injection
- **File**: [src/routes/students.js](file:///c:/Users/User/Ethone/src/routes/students.js#L11-L22)
- **Root Cause**: `LIKE` query string concatenation.
- **Exploitation POC Payload**:
  - Search query: `' UNION SELECT 1,id,username,password,email,role,NULL,NULL,NULL,NULL,NULL,NULL,NULL FROM users -- `
  - Result: Extracts all user credentials including password hashes into the search table UI.

### 🔐 Secure Remediation:
Use parameterized queries (prepared statements) provided by `mysql2`:
```javascript
const [rows] = await db.execute(
  'SELECT * FROM users WHERE username = ? AND password = ?',
  [username, passwordHash]
);
```

---

## 2. BROKEN AUTHENTICATION

### Flaw 2.1: Weak Password Hashing & Predictable Session Tokens
- **File**: [db/init.sql](file:///c:/Users/User/Ethone/db/init.sql#L15), [src/routes/auth.js](file:///c:/Users/User/Ethone/src/routes/auth.js#L35-L42)
- **Root Cause**:
  1. Passwords hashed with unsalted MD5, vulnerable to rainbow table lookups.
  2. Session cookie `auth_token` uses predictable base64 string `base64(id:role:username)`.
- **Exploitation POC Payload**:
  - Forge cookie: `auth_token=MTphZG1pbjphZG1pbg==` (`1:admin:admin` in base64).
  - Gives instant admin access without logging in.

### Flaw 2.2: Leaked & Predictable Password Reset Token
- **File**: [src/routes/auth.js](file:///c:/Users/User/Ethone/src/routes/auth.js#L115-L135)
- **Root Cause**: Reset token is `base64(email)` and is returned directly in the response page UI.
- **Exploitation POC**:
  - Request reset for victim `alex.j@student.lab`.
  - Token is `YWxleC5qQHN0dWRlbnQubGFi`.
  - Access `/auth/reset-password?token=YWxleC5qQHN0dWRlbnQubGFi&email=alex.j@student.lab` to take over account.

### 🔐 Secure Remediation:
1. Hash passwords using `bcrypt` or `argon2id` with high cost factor and unique salts.
2. Generate cryptographically strong random tokens using `crypto.randomBytes(32).toString('hex')`.
3. Use signed, encrypted server-side session stores or hardened JWTs.

---

## 3. SENSITIVE DATA EXPOSURE

### Flaw 3.1: Password Hash Exposure in API & UI
- **File**: [src/routes/students.js](file:///c:/Users/User/Ethone/src/routes/students.js#L112-L125), [src/views/profile.ejs](file:///c:/Users/User/Ethone/src/views/profile.ejs#L27)
- **Root Cause**: Queries select `password` column and return it in JSON responses (`/students/api/:id`) and render it on profile cards.
- **Exploitation POC**:
  - Send GET request to `/students/api/1`.
  - Response JSON includes `"password_hash": "0192023a7bbd73250516f069df18b500"`.

### Flaw 3.2: Direct Static Upload Access
- **File**: [src/app.js](file:///c:/Users/User/Ethone/src/app.js#L68)
- **Root Cause**: `express.static` maps `/uploads` directly without verifying session permissions.
- **Exploitation POC**:
  - Access `http://localhost:3000/uploads/vault/alex_passport_scan.pdf` directly without authentication.

### 🔐 Secure Remediation:
1. Omit password fields from database `SELECT` statements (`SELECT id, username, email FROM users`).
2. Serve sensitive vault files through an authenticated route handler that verifies ownership before streaming file content.

---

## 4. XML EXTERNAL ENTITIES (XXE)

### Flaw 4.1: Arbitrary File Disclosure via Bulk XML Import
- **File**: [src/routes/import.js](file:///c:/Users/User/Ethone/src/routes/import.js#L23-L40)
- **Root Cause**: XML parser (`libxmljs2`) configured with `{ noent: true }`, enabling external entity resolution.
- **Exploitation POC Payload**:
  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE student [
    <!ENTITY xxe SYSTEM "file:///etc/passwd">
  ]>
  <students>
    <student>
      <name>&xxe;</name>
      <course>Cyber Security</course>
    </student>
  </students>
  ```
- **Result**: The output renders the contents of `/etc/passwd` inside the response UI.

### 🔐 Secure Remediation:
Disable external DTD and entity parsing:
```javascript
const xmlDoc = libxmljs.parseXml(xmlContent, { 
  noent: false, 
  dtdload: false, 
  dtdvalid: false 
});
```

---

## 5. BROKEN ACCESS CONTROL & IDOR

### Flaw 5.1: Insecure Direct Object Reference (IDOR) on Student Profile
- **File**: [src/routes/students.js](file:///c:/Users/User/Ethone/src/routes/students.js#L35-L55)
- **Root Cause**: Reads `id` parameter from query parameter `?id=` without verifying if it matches `req.session.user.id`.
- **Exploitation POC**:
  - Logged in as student ID `1` (`alex_j`).
  - Change URL to `http://localhost:3000/students/profile?id=2`.
  - View and edit Sarah Connor's profile details.

### Flaw 5.2: Privilege Escalation via Mass Assignment
- **File**: [src/routes/students.js](file:///c:/Users/User/Ethone/src/routes/students.js#L85-L102)
- **Root Cause**: Profile update endpoint accepts `role` form parameter and updates the database user role.
- **Exploitation POC**:
  - Submit POST request to `/students/profile/update` with `role=admin`.
  - Student account gains full administrative rights.

### Flaw 5.3: Unrestricted Admin Dashboard Access
- **File**: [src/routes/admin.js](file:///c:/Users/User/Ethone/src/routes/admin.js#L9-L20)
- **Root Cause**: Server-side route relies on `isAuthenticated` instead of `isAdmin` middleware.
- **Exploitation POC**:
  - Navigate directly to `http://localhost:3000/admin/dashboard` while logged in as any basic student.

### 🔐 Secure Remediation:
1. Enforce ownership validation: `if (student.user_id !== req.session.user.id && req.session.user.role !== 'admin') return res.status(403).send('Forbidden');`
2. Remove role input field from client-facing profile forms.
3. Protect admin routes using strict `isAdmin` middleware.

---

## 6. SECURITY MISCONFIGURATION

### Flaw 6.1: Permissive CORS & Missing Security Headers
- **File**: [src/app.js](file:///c:/Users/User/Ethone/src/app.js#L17-L22)
- **Root Cause**: `cors({ origin: '*' })` and missing Helmet headers (CSP, X-Frame-Options, HSTS).
- **Exploitation POC**:
  - Malicious third-party website can send cross-origin AJAX requests to read session response.

### Flaw 6.2: Stack Trace Error Dump
- **File**: [src/app.js](file:///c:/Users/User/Ethone/src/app.js#L110-L118)
- **Root Cause**: Error handler outputs `err.stack` and SQL exception details to client.

### 🔐 Secure Remediation:
1. Configure explicit CORS origin whitelists.
2. Use `helmet()` middleware to enforce CSP and security headers.
3. Hide internal stack traces in production error views.

---

## 7. CROSS-SITE SCRIPTING (XSS)

### Flaw 7.1: Stored XSS in Class Notes
- **File**: [src/views/notes.ejs](file:///c:/Users/User/Ethone/src/views/notes.ejs#L68)
- **Root Cause**: Note content rendered using unescaped raw HTML tag `<%- note.content %>`.
- **Exploitation POC Payload**:
  - Post note with content: `<script>alert('Stored XSS Triggered! Session Token: ' + document.cookie);</script>`
  - Triggers payload for every user loading the notes page.

### Flaw 7.2: Reflected XSS in Search Directory
- **File**: [src/views/search.ejs](file:///c:/Users/User/Ethone/src/views/search.ejs#L17)
- **Root Cause**: Rendered with `<%- searchQuery %>`.
- **Exploitation POC Payload**:
  - URL: `http://localhost:3000/students/search?q=<script>alert("Reflected XSS")</script>`

### Flaw 7.3: DOM-Based XSS in Client Script
- **File**: [src/public/js/main.js](file:///c:/Users/User/Ethone/src/public/js/main.js#L13-L20)
- **Root Cause**: URL parameter `notice` assigned directly to `innerHTML` sink.
- **Exploitation POC Payload**:
  - URL: `http://localhost:3000/dashboard?notice=<img src=x onerror=alert('DOM-XSS')>`

### 🔐 Secure Remediation:
1. Always use HTML-escaped output tags in EJS: `<%= note.content %>`.
2. Use `textContent` or `innerText` instead of `innerHTML` in client-side JavaScript.
