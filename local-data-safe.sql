PRAGMA defer_foreign_keys=TRUE;

INSERT OR IGNORE INTO "rooms" VALUES(1,'Ruang Rapat A','meeting_room',200000,'Kapasitas 12 orang, proyektor tersedia',200000,NULL,'[]',NULL,'12','[]','[]');
INSERT OR IGNORE INTO "rooms" VALUES(2,'Ruang Rapat B','meeting_room',150000,'Kapasitas 6 orang',0,NULL,'[]',NULL,NULL,'[]','[]');
INSERT OR IGNORE INTO "rooms" VALUES(3,'Aula Utama','hall',750000,'Kapasitas 200 orang, AC, podium',0,NULL,'[]',NULL,NULL,'[]','[]');

INSERT OR IGNORE INTO "bookings" VALUES(1,'Budi Santoso','081234567890',1,'2026-04-10','09:00','11:00','Rapat bulanan','approved','Disetujui, silakan hadir tepat waktu.',NULL);
INSERT OR IGNORE INTO "bookings" VALUES(2,'Kreatif Digital','+628787120310',1,'2026-04-06','09:30','13:30','Photoshoot','pending',NULL,'{"applicant_type":"personal","whatsapp":"8787120310","email":"email@contoh.com","keperluan":"Photoshoot","jenis_produksi":"Film","jumlah_crew":4,"jumlah_talent":2,"ruangan":["Ruang Make Up","Studio"],"date_start":"2026-04-06","date_end":"2026-04-06","time_start":"09:30","time_end":"13:30","fasilitas":["Listrik","AC"],"nama":"Kreatif Digital"}');

INSERT OR IGNORE INTO "admin_users" VALUES(1,'admin','240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9','2026-04-01 19:21:05');

INSERT OR IGNORE INTO "room_pricing" VALUES(7,1,3,1250000,0);
INSERT OR IGNORE INTO "room_pricing" VALUES(8,1,5,2100000,1);

INSERT OR REPLACE INTO "settings" VALUES('landing_bg_url','/media/landing/1775126909696-fea3992d8df138.mov','2026-04-02 10:48:33');
INSERT OR REPLACE INTO "settings" VALUES('landing_bg_type','video','2026-04-02 10:48:33');

INSERT OR IGNORE INTO "room_media" VALUES(1,1,'/media/rooms/1/1775119794245-dbe0a76c3f11d8.webp','image',1,0,'2026-04-02 08:49:55');
INSERT OR IGNORE INTO "room_media" VALUES(2,1,'/media/rooms/1/1775123435608-7b0aae7f5533e8.webp','image',0,1,'2026-04-02 09:50:37');
INSERT OR IGNORE INTO "room_media" VALUES(3,1,'/media/rooms/1/1775124011182-9922b48c8ac418.webp','image',0,2,'2026-04-02 10:00:11');
INSERT OR IGNORE INTO "room_media" VALUES(4,2,'/media/rooms/2/1775127007568-cd65a663b8e0c8.webp','image',1,0,'2026-04-02 10:50:08');
INSERT OR IGNORE INTO "room_media" VALUES(5,3,'/media/rooms/3/1775127136221-1622fe5e62076.webp','image',0,0,'2026-04-02 10:52:16');
