# 🎓 StudentHub — Vulnerable Student Records Management Portal

```
===================================================================================
⚠️ FOR AUTHORIZED SECURITY TRAINING IN ISOLATED LAB ENVIRONMENTS ONLY
DO NOT DEPLOY PUBLICLY OR ON PRODUCTION SERVERS EXPOSED TO THE INTERNET
===================================================================================
```

StudentHub is a full-stack student records management portal built for **educational penetration testing labs**, **OWASP vulnerability research**, and **hands-on cybersecurity training**. It mimics a real enterprise academic web platform while incorporating 7 distinct OWASP Top 10 security vulnerabilities.

---

## 🚀 Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL 8.0 (Raw `mysql2` queries, no ORM)
- **Frontend**: EJS Templates, Custom HSL Glassmorphism CSS Design System
- **File Storage**: Local Disk (`uploads/`)
- **Authentication**: Custom session token handling & MD5 password hashing
- **Lab Containers**: Docker & Docker Compose

---

## 🛠️ Quick Start (Docker Compose)

The easiest way to launch StudentHub in an isolated environment is using Docker Compose:

```bash
# 1. Clone or navigate to project directory
cd Ethone

# 2. Build and start containers in detached mode
docker-compose up -d --build

# 3. Access the web portal
http://localhost:3000
```

To view application and database logs:
```bash
docker-compose logs -f
```

To tear down the environment:
```bash
docker-compose down -v
```

---

## 💻 Manual Setup (Local Node.js & MySQL)

If running without Docker:

1. **Install Node.js Dependencies**:
   ```bash
   npm install
   ```

2. **Setup MySQL Database**:
   - Create a database named `studenthub`.
   - Execute the SQL initialization script:
     ```bash
     mysql -u root -p studenthub < db/init.sql
     ```

3. **Configure Environment Variables**:
   - Copy `.env.example` to `.env` and update DB credentials:
     ```bash
     cp .env.example .env
     ```

4. **Start Application**:
   ```bash
   npm start
   ```

---

## 🔑 Default Test Credentials

For initial exploratory testing:

| Role | Username | Password | Email |
|---|---|---|---|
| **Administrator** | `admin` | `admin123` | `admin@studenthub.lab` |
| **Faculty** | `prof_smith` | `password123` | `smith@faculty.studenthub.lab` |
| **Student** | `alex_j` | `password123` | `alex.j@student.lab` |
| **Student** | `sarah_c` | `password123` | `sarah.c@student.lab` |

---

## 🎯 Security Pentesting Lab Objectives

Pentesters and students practicing on StudentHub should attempt to discover:

1. Bypass authentication via SQL Injection on the login form.
2. Extract database tables using SQL Injection in the student search directory.
3. Access administrative controls and unauthenticated student records (IDOR / Broken Access Control).
4. Escalate user privilege from `student` to `admin` during profile update.
5. Read sensitive local system files (`/etc/passwd` or system logs) via XXE XML import.
6. Execute arbitrary JavaScript via Stored, Reflected, and DOM-based XSS vectors.
7. Access private vault documents via direct static directory URL access.

> [!NOTE]
> The instructor answer key and complete list of planted vulnerabilities with file locations and secure fixes can be found in [VULNERABILITIES.md](file:///c:/Users/User/Ethone/VULNERABILITIES.md).
