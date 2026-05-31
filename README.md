# Warung OS

App Warung OS dibangun dengan Next.js App Router, Tailwind CSS, shadcn/ui, route handlers, Drizzle ORM, dan Better Auth.

## Fitur

- Kasir visual tablet-first dengan cart interaktif dan checkout mock
- Inventaris barang jadi dengan tambah, edit, dan restok produk
- Buku hutang pelanggan dengan pengingat WhatsApp dummy
- Laporan harian, mingguan, dan bulanan dengan preview PDF placeholder
- Pengaturan warung, notifikasi stok menipis, dan metode pembayaran

## Jalankan lokal

```bash
npm install
cp .env.example .env
npm run dev
```

App akan terbuka di [http://localhost:3000](http://localhost:3000) dan langsung diarahkan ke halaman `Kasir`.

## Backend

- Backend memakai Next.js API route handlers di `src/app/api`
- ORM memakai Drizzle dengan schema di `src/db/schema.ts`
- Auth memakai Better Auth dengan route handler di `src/app/api/auth/[...all]/route.ts`
- `.env.example` sudah disiapkan untuk Postgres Docker lokal di port `5439`
- Untuk menyalakan Postgres Docker lokal:

```bash
docker run -d --name warungos-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=warungos \
  -p 5439:5432 \
  postgres:16-alpine
```

- Untuk menyiapkan schema aplikasi dan auth:

```bash
npm run db:generate
npm run db:migrate
npm run auth:migrate
npm run db:seed
```

- Untuk membuka Drizzle Studio:

```bash
npm run db:studio
```

## Verifikasi 

```bash
npm run lint
npm run build
```
