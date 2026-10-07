# QA Tracker
React + TypeScript + Vite + Tailwind + Supabase.
1. `npm install`
2. Buat project Supabase, jalankan `supabase/migration.sql` di SQL Editor.
3. Salin `.env.example` ke `.env`, isi URL dan anon key (jangan pernah service_role).
4. Buat user di Supabase Auth > Users, lalu ubah role di tabel `profiles` (admin / qa_lead / qa_engineer / viewer).
5. `npm run dev`

## Migration
Jalankan `supabase/migration.sql` lalu `supabase/migration2.sql`.
Lalu jalankan `supabase/migration3.sql` (kolom detail bug).
Opsional: jalankan `supabase/seed_full.sql` sekali untuk data demo lengkap (daily_updates terisi jika sudah ada user).
