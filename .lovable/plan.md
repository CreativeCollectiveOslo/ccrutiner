

# Billedvedhæftning til rutiner, opdateringer og logbog

## Oversigt

Tilføj mulighed for at vedhæfte billeder tre steder i appen:
1. **Rutiner** (admin opretter/redigerer rutiner)
2. **Opdateringer/Announcements** (admin opretter opdateringer)
3. **Logbog/Bulletin Board** (alle brugere opretter indlæg)

---

## Teknisk tilgang

### 1. Storage bucket

Opret en public storage bucket `attachments` med mapper for hver type:
- `routines/` - billeder til rutiner
- `announcements/` - billeder til opdateringer
- `bulletin/` - billeder til logbog-indlæg

RLS-policies:
- Alle autentificerede brugere kan **se** filer
- Autentificerede brugere kan **uploade** filer
- Brugere kan **slette** egne filer, admins kan slette alle

### 2. Database-ændringer

| Tabel | Ændring |
|-------|---------|
| `routines` | Har allerede `multimedia_url` - ingen ændring nødvendig |
| `announcements` | Tilføj `image_url TEXT` kolonne |
| `bulletin_posts` | Tilføj `image_url TEXT` kolonne |

### 3. UI-ændringer

**Fælles: Genbrugelig ImageUpload-komponent**
- Ny komponent `src/components/ImageUpload.tsx`
- Viser en "Vedhæft billede"-knap med ikon
- Preview af valgt billede før upload
- Uploader til storage bucket og returnerer URL
- Mulighed for at fjerne vedhæftet billede

**SectionManager.tsx (rutiner)**
- Tilføj ImageUpload i opret- og rediger-dialogen for rutiner
- Brug den eksisterende `multimedia_url` kolonne
- Vis billede i rutinelisten

**AnnouncementManager.tsx (opdateringer)**
- Tilføj ImageUpload i opret-formularen
- Vis billede i opdateringslisten

**BulletinBoard.tsx (logbog)**
- Tilføj ImageUpload i opret- og rediger-formularen
- Vis billede i logbog-indlæg

**EmployeeDashboard.tsx**
- Vis `multimedia_url` billeder ved rutiner
- Vis `image_url` billeder ved opdateringer og logbog-indlæg

---

## Filer der oprettes/ændres

| Fil | Type |
|-----|------|
| Database migration | Ny: storage bucket + kolonner |
| `src/components/ImageUpload.tsx` | Ny komponent |
| `src/components/SectionManager.tsx` | Tilføj billedupload til rutiner |
| `src/components/AnnouncementManager.tsx` | Tilføj billedupload til opdateringer |
| `src/components/BulletinBoard.tsx` | Tilføj billedupload til logbog |
| `src/pages/EmployeeDashboard.tsx` | Vis billeder i medarbejdervisning |
| `src/components/NotificationsTab.tsx` | Vis billeder ved opdateringer |

---

## Billedvisning

Billeder vises under teksten i hvert indlæg/rutine med:
- Responsiv størrelse (max-width: 100%, afrundede hjørner)
- Klik for at åbne i fuld størrelse (lightbox-lignende dialog)

