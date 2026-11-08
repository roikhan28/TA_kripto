# GYMVAULT V2.0 — Smart Gym Management & Security System

> **Tugas Akhir Mata Kuliah Kriptografi — Program Studi Informatika**  
> Desktop Application (Electron + React + Node.js + MySQL XAMPP)

---

## 🛡️ Gambaran Proyek

**GYMVAULT V2.0** adalah sistem manajemen pusat kebugaran cerdas (*smart gym*) berbasis aplikasi desktop Windows yang menerapkan prinsip *defense-in-depth* dan 7 pilar kriptografi modern & klasik secara nyata (bukan simulasi).

---

## 🚀 Status Implementasi Modul

| No | Modul / Fitur | Algoritma / Teknologi | Status |
|:--:|---|---|:---:|
| 1 | **Database & Schema Foundation** | MySQL InnoDB (22 Tabel) + Transaction Manager | ✅ Phase 1 Selesai |
| 2 | **Secure Desktop Architecture** | Electron (Context Isolation, Sandbox, Whitelisted IPC, Zod) | ✅ Phase 1 Selesai |
| 3 | **Authentication & Password Security** | Argon2id ($m=64\text{MB}, t=3, p=4$) + Rate Limiter | ✅ Phase 1 / Siap Phase 2 |
| 4 | **Super Encryption (Secure Messaging)** | Extended Vigenere (256 ASCII/Unicode) + AES-256-GCM | 🔜 Phase 4 |
| 5 | **File Vault Protection** | ChaCha20-Poly1305 Chunked Stream | 🔜 Phase 5 |
| 6 | **Database Encryption & Blind Index** | AES-256-GCM + HMAC-SHA256 Blind Indexing | 🔜 Phase 5 |
| 7 | **Biometric Authentication** | Face Recognition (ONNX MobileFaceNet 512-d) | 🔜 Phase 2 |
| 8 | **Hardware Security Dongle** | USB Challenge-Response HMAC-SHA256 | 🔜 Phase 2 |
| 9 | **Steganografi Citra** | Least Significant Bit (LSB) PNG + GVST Header Framing | 🔜 Phase 6 |
| 10 | **Tamper-Evident Ledger** | Blockchain SHA-256 Hash Chaining + External Checkpoint | 🔜 Phase 7 |

---

## 🛠️ Prasyarat Lingkungan

- **Node.js**: $\ge 18.x$ (Teruji pada Node.js v26)
- **Database**: MySQL $\ge 8.0$ (via XAMPP aktif pada port 3306)
- **OS**: Windows 10/11 64-bit

---

## ⚡ Panduan Menjalankan Aplikasi

### 1. Inisialisasi Database
Pastikan MySQL XAMPP aktif, lalu periksa koneksi atau import file SQL:
- Skema tabel: `database/schema.sql` (22 tabel)
- Data awal: `database/seed.sql` (Roles, permissions, admin, paket, genesis block)

### 2. Jalankan Pengujian Fondasi
```bash
npm test
```

### 3. Mode Pengembangan (Development)
```bash
npm run dev
```

### 4. Build Aplikasi Desktop
```bash
npm run build
```

---

## 👥 Distribusi Peran Anggota Tim

- **Anggota 1**: Authentication (Argon2id), Biometrics & USB Dongle, Member & Trainer Management, RBAC.
- **Anggota 2**: Kriptografi Teks (Vigenere + AES-256-GCM), File Encryption (ChaCha20-Poly1305), Database Encryption & Key Management.
- **Anggota 3**: LSB Steganography, SHA-256 Blockchain Ledger, Dashboard Metrik, Pembayaran & Integrasi UI.
