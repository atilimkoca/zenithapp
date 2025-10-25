# UI Visual Guide - Package Management System

## 📱 Screen Layouts

### 1. User Management Screen - Overview

```
╔════════════════════════════════════════════╗
║  ← Üye Yönetimi                    🔔      ║
║     150 kullanıcı                          ║
║  ┌──────────────────────────────────────┐  ║
║  │  45 Bekleyen    105 Onaylı          │  ║
║  └──────────────────────────────────────┘  ║
╠════════════════════════════════════════════╣
║  🔍 Kullanıcı ara...                   ✕  ║
║  ┌────────────────────────────────────┐   ║
║  │ [Tümü] [Bekleyen] [Onaylı] [Red]  │   ║
║  └────────────────────────────────────┘   ║
╠════════════════════════════════════════════╣
║  User Cards (scroll area)                  ║
╚════════════════════════════════════════════╝
```

---

### 2. User Card - PENDING Status

```
┌────────────────────────────────────────────┐
│ ┌──┐  Ahmet Yılmaz                         │
│ │AY│  ahmet@email.com                      │
│ └──┘  +90 555 123 45 67                    │
│       Kayıt: 05.01.2025                    │
│                                             │
│ [Bekliyor]              [✓] [✗]           │
└────────────────────────────────────────────┘
```

**Actions:**
- ✓ Approve (opens package selection)
- ✗ Reject (opens rejection modal)

---

### 3. User Card - APPROVED Status (Active Package)

```
┌────────────────────────────────────────────┐
│ ┌──┐  Mehmet Demir                         │
│ │MD│  mehmet@email.com                     │
│ └──┘  +90 555 987 65 43                    │
│       🎫 Kalan Ders: 8                     │
│       📅 Bitiş: 07.02.2025 (30 gün)       │
│                                             │
│ [Onaylandı]                    [↻]        │
└────────────────────────────────────────────┘
```

**Features:**
- 🎫 Shows remaining lessons
- 📅 Shows expiry date and days remaining
- 🟢 Green text (more than 7 days left)
- [↻] Renew button

---

### 4. User Card - APPROVED Status (Expiring Soon - ⚠️ Warning)

```
┌────────────────────────────────────────────┐
│ ┌──┐  Ayşe Kaya                            │
│ │AK│  ayse@email.com                       │
│ └──┘  +90 555 444 33 22                    │
│       🎫 Kalan Ders: 3                     │
│       ⚠️ Bitiş: 12.01.2025 (4 gün)        │
│                                             │
│ [Onaylandı]                    [↻]        │
└────────────────────────────────────────────┘
```

**Features:**
- 🟡 Orange/Yellow text (7 days or less)
- ⚠️ Warning icon
- Urgent renewal needed

---

### 5. User Card - APPROVED Status (EXPIRED - 🔴 Critical)

```
┌────────────────────────────────────────────┐
│ ┌──┐  Can Öztürk                           │
│ │CÖ│  can@email.com                        │
│ └──┘  +90 555 111 22 33                    │
│       🎫 Kalan Ders: 2                     │
│       🔴 Paket Süresi Doldu                │
│                                             │
│ [Onaylandı]                    [↻]        │
└────────────────────────────────────────────┘
```

**Features:**
- 🔴 Red text (expired)
- Shows expired message
- Immediate renewal required

---

### 6. User Card - REJECTED Status

```
┌────────────────────────────────────────────┐
│ ┌──┐  Zeynep Şahin                         │
│ │ZŞ│  zeynep@email.com                     │
│ └──┘  +90 555 888 99 00                    │
│       Kayıt: 03.01.2025                    │
│                                             │
│ [Reddedildi]                   [↻]        │
└────────────────────────────────────────────┘
```

**Actions:**
- [↻] Re-approve button

---

## 📋 Modal Screens

### 7. Approval/Rejection Modal (First Step)

```
╔════════════════════════════════════════════╗
║            Kullanıcı İşlemi                ║
╠════════════════════════════════════════════╣
║  ┌──────────────────────────────────────┐  ║
║  │        Ahmet Yılmaz                  │  ║
║  │      ahmet@email.com                 │  ║
║  └──────────────────────────────────────┘  ║
║                                             ║
║  ┌──────────────┐  ┌──────────────┐       ║
║  │ ✓  Onayla   │  │ ✗  Reddet    │       ║
║  └──────────────┘  └──────────────┘       ║
║                                             ║
║  ┌──────────────────────────────────────┐  ║
║  │ Reddetme sebebi (isteğe bağlı)      │  ║
║  │                                      │  ║
║  └──────────────────────────────────────┘  ║
║                                             ║
║            [İptal]                          ║
╚════════════════════════════════════════════╝
```

**Actions:**
- ✓ Onayla → Opens Package Selection Modal
- ✗ Reddet → Rejects user with optional reason
- İptal → Close modal

---

### 8. Package Selection Modal (After Approve Click)

```
╔════════════════════════════════════════════╗
║              Paket Seç                     ║
╠════════════════════════════════════════════╣
║  ┌──────────────────────────────────────┐  ║
║  │        Ahmet Yılmaz                  │  ║
║  │  Onaylanıyor - Paket seçimi yapılıyor│  ║
║  └──────────────────────────────────────┘  ║
║                                             ║
║  ┌──────────────────────────────────────┐  ║
║  │ 4 Ders Paketi              ✓        │  ║ ← Selected
║  │ 4 Ders                              │  ║
║  │ 800 ₺                               │  ║
║  │ Aylık başlangıç paketi              │  ║
║  └──────────────────────────────────────┘  ║
║  ┌──────────────────────────────────────┐  ║
║  │ 8 Ders Paketi                       │  ║
║  │ 8 Ders                              │  ║
║  │ 1400 ₺                              │  ║
║  │ Popüler paket                       │  ║
║  └──────────────────────────────────────┘  ║
║  ┌──────────────────────────────────────┐  ║
║  │ 12 Ders Paketi                      │  ║
║  │ 12 Ders                             │  ║
║  │ 2000 ₺                              │  ║
║  │ En avantajlı paket                  │  ║
║  └──────────────────────────────────────┘  ║
║                                             ║
║  ┌──────────────────────────────────────┐  ║
║  │      ✓  Paket ile Onayla            │  ║
║  └──────────────────────────────────────┘  ║
║            [İptal]                          ║
╚════════════════════════════════════════════╝
```

**Features:**
- Scrollable package list
- Selected package highlighted with checkmark
- Shows: Name, Lesson Count, Price, Description
- Can approve without package (button text changes to "Paketsiz Onayla")

---

### 9. Renew Package Modal

```
╔════════════════════════════════════════════╗
║             Paket Yenile                   ║
╠════════════════════════════════════════════╣
║  ┌──────────────────────────────────────┐  ║
║  │        Mehmet Demir                  │  ║
║  │      Mevcut: 2 Ders                  │  ║
║  └──────────────────────────────────────┘  ║
║                                             ║
║  ┌──────────────────────────────────────┐  ║
║  │ 8 Ders Paketi              ✓        │  ║ ← Selected
║  │ 8 Ders                              │  ║
║  │ 1400 ₺                              │  ║
║  │ Popüler paket                       │  ║
║  └──────────────────────────────────────┘  ║
║  ┌──────────────────────────────────────┐  ║
║  │ 12 Ders Paketi                      │  ║
║  │ 12 Ders                             │  ║
║  │ 2000 ₺                              │  ║
║  │ En avantajlı paket                  │  ║
║  └──────────────────────────────────────┘  ║
║                                             ║
║  ┌──────────────────────────────────────┐  ║
║  │      ↻  Paketi Yenile               │  ║
║  └──────────────────────────────────────┘  ║
║            [İptal]                          ║
╚════════════════════════════════════════════╝
```

**Features:**
- Shows current remaining lessons
- Must select a package (button disabled if none selected)
- Old credits will be replaced with new package

---

## 🎨 Color Coding Reference

### Package Status Colors

| Status | Days Remaining | Icon | Text Color | Meaning |
|--------|---------------|------|------------|---------|
| **Active** | > 7 days | 📅 | 🟢 Green | Package healthy |
| **Warning** | ≤ 7 days | ⚠️ | 🟡 Yellow/Orange | Expiring soon |
| **Expired** | 0 days | 🔴 | 🔴 Red | Package expired |

### User Status Badge Colors

| Status | Background | Text | Badge Text |
|--------|-----------|------|------------|
| **Pending** | 🟡 Yellow+20% | 🟡 Yellow | Bekliyor |
| **Approved** | 🟢 Green+20% | 🟢 Green | Onaylandı |
| **Rejected** | 🔴 Red+20% | 🔴 Red | Reddedildi |

---

## 🔄 User Journey Flowchart

```
┌─────────────────┐
│  Pending User   │
│   Registers     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Admin Clicks   │
│  Approve (✓)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Package Modal   │
│ Opens (Select)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Admin Selects   │
│    Package      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Click Approve  │
│  with Package   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  User Approved  │
│  Package Starts │
│   30-Day Timer  │
└────────┬────────┘
         │
         ├──────────────────────┐
         │                      │
         ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│  User Uses      │    │  Package Gets   │
│  Lessons        │    │  Close to Expiry│
└─────────────────┘    └────────┬────────┘
                                │
         ┌──────────────────────┘
         │
         ▼
┌─────────────────┐
│  Admin Sees     │
│  Warning (⚠️)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Admin Clicks   │
│  Renew (↻)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Renew Package   │
│  Modal Opens    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Select New      │
│   Package       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Package Renewed │
│ New 30-Day Timer│
│ Credits Reset   │
└─────────────────┘
```

---

## 📐 Layout Specifications

### User Card Dimensions
- **Height**: Dynamic (auto)
- **Padding**: 12px all sides
- **Margin Bottom**: 8px
- **Border Radius**: 12px
- **Shadow**: Small elevation

### Modal Dimensions
- **Width**: 90% of screen width (max 400px)
- **Max Height**: 80% of screen height
- **Border Radius**: 16px
- **Padding**: 24px

### Package Card in Modal
- **Padding**: 16px
- **Margin Bottom**: 12px
- **Border Width**: 2px
- **Border Radius**: 12px
- **Selected Border Color**: Primary color

### Icons Size
- **Status Icons**: 14px
- **Action Buttons**: 20px
- **Modal Checkmark**: 24px

---

## 🎯 Interaction States

### Buttons
1. **Normal**: Primary color background
2. **Pressed**: Slightly darker
3. **Disabled**: 50% opacity

### Package Cards
1. **Unselected**: Border color (light gray)
2. **Selected**: Primary color border + light background
3. **Hover/Press**: Slightly scaled

### Color Transitions
- Smooth color change as expiry approaches
- Instant update on package renewal

---

**This UI guide provides a complete visual reference for the package management system.**
