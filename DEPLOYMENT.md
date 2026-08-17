# 🎓 StudentHub Lab — Isolated Docker Deployment Guide

```
===================================================================================
⚠️ STUDENTHUB LAB — ISOLATED TRAINING USE ONLY
   This application is intentionally vulnerable.
   DO NOT deploy on any public network interface, cloud provider, or
   internet-facing host. Localhost / private lab VM ONLY.
===================================================================================
```

---

## Quick Reference

| Item | Value |
|---|---|
| **Web Portal URL** | `http://127.0.0.1:3000` |
| **MySQL Port** | `127.0.0.1:3306` |
| **Docker Network** | `studenthub_isolated_net` (dedicated bridge) |
| **Port Binding** | `127.0.0.1` only — unreachable from LAN |

### Default Credentials (Intentionally Weak)

| Role | Username | Password |
|---|---|---|
| **Administrator** | `admin` | `admin123` |
| **Faculty** | `prof_smith` | `password123` |
| **Student** | `alex_j` | `password123` |
| **Student** | `sarah_c` | `password123` |
| **Student** | `michael_s` | `password123` |

---

## Start the Lab

```bash
cd Ethone
docker compose up -d --build
```

### Alternative: Standalone Launch (No Docker Required)

If Docker is not installed on your system, you can run the app directly using Node.js. It automatically falls back to an embedded in-memory database seeded with identical sample data:

```bash
cd Ethone
npm start
```

First boot takes ~60s while MySQL initializes and runs the seed script (when using Docker).
Watch logs to confirm both services are healthy:

```bash
docker compose logs -f
```

You should see:

```
STUDENTHUB LAB — ISOLATED TRAINING USE ONLY
[!] StudentHub Security Lab Server active on port 3000
```

## Stop the Lab

```bash
docker compose down
```

This stops containers but **preserves the database volume** so your data
persists across restarts.

## Full Reset (Clean Slate)

```bash
docker compose down -v
docker compose up -d --build
```

The `-v` flag destroys the named MySQL volume. On next boot, `init.sql`
re-seeds the entire database from scratch.

---

## Verification Checklist

After `docker compose up -d`, run these checks:

```bash
# 1. Containers running?
docker compose ps

# 2. App reachable on localhost?
curl -s http://127.0.0.1:3000/auth/login | findstr "StudentHub"

# 3. App NOT reachable from LAN IP? (should fail/timeout)
# Replace 192.168.x.x with your machine's LAN IP:
curl -s --connect-timeout 3 http://192.168.x.x:3000 || echo "PASS: Not reachable from LAN"

# 4. Database seeded?
docker exec studenthub_db mysql -uroot -prootpass studenthub -e "SELECT id,username,role FROM users;"
```

---

## Accessing from a Kali Attack VM (Optional)

By default, ports are bound to `127.0.0.1` and are **not reachable** from
any other machine, including a VM on the same network.

If you need to reach StudentHub from a specific Kali VM (e.g. `192.168.56.101`),
modify `docker-compose.yml` port bindings:

```yaml
# Change from localhost-only:
ports:
  - "127.0.0.1:3000:3000"

# To your host's lab-only interface IP:
ports:
  - "192.168.56.1:3000:3000"
```

Where `192.168.56.1` is your **host-only adapter** IP (VirtualBox/VMware).
This makes the app reachable only from VMs on that host-only network segment,
not from the broader LAN or internet.

Alternatively, use an iptables/Windows Firewall rule to restrict source IPs.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Docker Bridge Network              │
│           studenthub_isolated_net               │
│                                                 │
│  ┌─────────────────┐    ┌────────────────────┐  │
│  │  studenthub_app │    │  studenthub_db     │  │
│  │  Node.js:3000   │───▶│  MySQL 8.0:3306    │  │
│  │  (Express + EJS)│    │  (init.sql seeded) │  │
│  └────────┬────────┘    └────────┬───────────┘  │
│           │                      │              │
└───────────┼──────────────────────┼──────────────┘
            │                      │
     127.0.0.1:3000         127.0.0.1:3306
     (localhost only)       (localhost only)
```

---

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Express HTTP listen port |
| `NODE_ENV` | `development` | Keeps verbose error output (intentional) |
| `DB_HOST` | `db` | Docker service name for MySQL container |
| `DB_USER` | `root` | MySQL user |
| `DB_PASSWORD` | `rootpass` | MySQL password (intentionally weak) |
| `DB_NAME` | `studenthub` | Database name |
| `DB_PORT` | `3306` | MySQL port |
| `SESSION_SECRET` | `supersecret_studenthub_key_2026` | Express session secret (intentionally weak) |

---

> **⚠️ FINAL REMINDER**: This application contains intentional security
> vulnerabilities across all OWASP Top 10 categories. It must **never** be
> deployed on any public-facing network. Keep all port bindings on `127.0.0.1`
> or a host-only VM adapter. After your pentesting session, tear down with
> `docker compose down -v`.
