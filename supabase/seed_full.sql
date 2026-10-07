-- Seed tambahan (data dummy). Jalankan SEKALI setelah migration 1-3.
insert into projects (project_code,project_name,description,status,priority,start_date,target_end_date) values
('LAB-004','Integrasi LIS Laboratorium','Pertukaran order dan hasil lab','In Progress','High',current_date-15,current_date+14),
('BIL-005','Billing dan Klaim BPJS','Tagihan, klaim, dan rekonsiliasi','On Hold','Medium',current_date-30,current_date+5);

-- Task T-005 .. T-020 (disebar ke 5 project)
insert into tasks (project_id,task_code,task_name,task_type,priority,status,start_date,target_end_date,progress_percentage,estimated_hours,actual_hours)
select (select id from (select id, row_number() over (order by project_code) rn from projects) x where rn = 1 + s.g % 5),
  'T-' || lpad((4 + s.g)::text, 3, '0'),
  (array['Functional Pendaftaran','Regression Billing','API LIS Order','UI Portal Pasien','Integrasi Farmasi','Retest Antrian','Dokumentasi UAT','Performance Booking','System Rekam Medis','Mobile Jadwal Dokter','API Klaim','UAT Rawat Inap','Regression Resep','Persiapan Test Lab','Automation Smoke','Verifikasi Billing'])[s.g],
  (array['Functional Testing','Regression Testing','API Testing','UI Testing','Integration Testing','Bug Verification','Test Documentation','Performance Testing','System Testing','Mobile Testing','API Testing','UAT Support','Regression Testing','Test Preparation','Automation Testing','Bug Verification'])[s.g],
  (array['Low','Medium','High','Critical'])[1 + s.g % 4], s.st, current_date - (s.g % 9), current_date + (s.g % 12) - 3,
  case s.st when 'Completed' then 100 when 'Not Started' then 0 else (s.g * 17) % 90 + 5 end, 8 + s.g % 5 * 4, 2 + s.g % 7 * 2
from (select g, (array['Not Started','In Progress','Blocked','Completed','In Progress'])[1 + g % 5] as st from generate_series(1,16) g) s;

-- Stakeholder
insert into project_users (project_id,name,email,department,role)
select p.id, v.n, v.e, v.d, v.r from (values
 ('LAB-004','dr. Sari (dummy)','sari@example.com','Laboratorium','Hospital User'),
 ('LAB-004','Andi (dummy)','andi@example.com','IT','Developer'),
 ('BIL-005','Maya (dummy)','maya@example.com','Keuangan','Business User'),
 ('MOB-003','Dewi (dummy)','dewi@example.com','Digital','Product Owner')) v(code,n,e,d,r)
join projects p on p.project_code = v.code;

-- Milestone
insert into project_milestones (project_id,milestone_name,start_date,target_date,status)
select p.id, v.n, current_date - 7, current_date + v.d, v.s from (values
 ('LAB-004','Uji integrasi order lab',10,'In Progress'),('BIL-005','Rekonsiliasi klaim bulanan',5,'Delayed'),('CRM-002','Validasi event schema',14,'In Progress')) v(code,n,d,s)
join projects p on p.project_code = v.code;

-- Aktivitas: 2 per task (40 baris)
insert into task_activities (task_id,activity_date,activity_type,description,hours_spent,created_by)
select t.id, current_date - (n % 5),
  (array['Requirement Review','Test Case Preparation','Test Data Preparation','Functional Testing','Regression Testing','API Testing','Bug Reporting','Bug Retest','Automation','Documentation','Meeting','Other'])[1 + (row_number() over ())::int % 12],
  'Aktivitas dummy untuk ' || t.task_name, 1 + (n + length(t.task_code)) % 4, null
from tasks t cross join generate_series(1,2) n;

-- Bug (8 tambahan)
insert into bugs (project_id,task_id,bug_number,title,severity,status,reported_date,resolved_date)
select t.project_id, t.id, 'BUG-' || (103 + g),
  (array['Validasi NIK tidak muncul','Slot ganda pada jam yang sama','Payload event tanpa timestamp','Hasil lab tidak sinkron','Tagihan tidak sesuai tarif','Tombol batal tidak berfungsi','Timeout saat booking','Format tanggal salah di laporan'])[g],
  (array['Low','Medium','High','Critical'])[1 + g % 4], st, current_date - (g % 7),
  case when st in ('Verified','Closed') then current_date - (g % 3) end
from generate_series(1,8) g
cross join lateral (select (array['Open','In Progress','Fixed','Ready for Retest','Verified','Closed','Open','Rejected'])[g] st) s
cross join lateral (select id, project_id from tasks order by task_code offset g + 1 limit 1) t;

-- Blocker (9 tambahan)
insert into blockers (project_id,task_id,title,severity,status,identified_date,resolved_date,blocked_by)
select t.project_id, t.id,
  (array['Environment UAT tidak stabil','Data master dokter belum lengkap','Akses API LIS belum diberikan','Kredensial sandbox kedaluwarsa','Spesifikasi tarif belum final','Build terbaru belum di-deploy','User belum konfirmasi skenario','Konfigurasi payer salah','Server staging down'])[g],
  (array['Low','Medium','High','Critical'])[1 + g % 4], st, current_date - (g % 6),
  case when st in ('Resolved','Closed') then current_date end,
  (array['Developer','Infra','Business User','Vendor'])[1 + g % 4]
from generate_series(1,9) g
cross join lateral (select (array['Open','In Progress','Resolved','Open','Closed','In Progress','Open','Resolved','Open'])[g] st) s
cross join lateral (select id, project_id from tasks order by task_code offset g + 2 limit 1) t;

-- Test execution
insert into test_execution (task_id,test_case_name,test_type,environment,total_cases,passed_cases,failed_cases,blocked_cases)
select t.id, 'Suite ' || t.task_name, 'Functional', 'UAT', 30 + g, 20 + g, 4, 2
from generate_series(1,3) g cross join lateral (select id, task_name from tasks order by task_code offset g + 4 limit 1) t;

-- Daily update (10 baris) hanya jika sudah ada minimal 1 user/profile
insert into daily_updates (profile_id,project_id,update_date,summary,progress,tomorrow_plan,blocker_summary)
select pr.id, (select id from projects order by project_code offset g % 5 limit 1), current_date - (g % 5),
  'Testing dan dokumentasi hasil (dummy) #' || g, (g * 9) % 100, 'Retest dan lanjut skenario berikutnya',
  case when g % 3 = 0 then 'Menunggu perbaikan dari developer' end
from generate_series(1,10) g cross join lateral (select id from profiles order by created_at limit 1) pr;
