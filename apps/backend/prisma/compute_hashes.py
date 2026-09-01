import hashlib
iocs = [
  ('ioc-001','ip','45.83.64.1','org-banka',1706779200),
  ('ioc-002','domain','c2-server.ru','org-banka',1706865600),
  ('ioc-003','url','http://phishing-portal.net/secure/login','org-bankb',1706952000),
  ('ioc-004','file_hash','a3c4e5f6b7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4','org-banka',1707038400),
  ('ioc-005','ip','185.220.101.45','org-bankb',1707124800),
  ('ioc-006','domain','update-security-center.click','org-banka',1707211200),
  ('ioc-007','url','https://malware-download.io/payload?id=42&type=ransomware','org-certc',1707297600),
  ('ioc-008','ip','91.121.87.46','org-bankb',1707384000),
  ('ioc-009','file_hash','5f4dcc3b5aa765d61d8327deb882cf99','org-certc',1707470400),
  ('ioc-010','domain','botnet-c2.onion','org-bankb',1707556800),
  ('ioc-011','ip','192.42.116.16','org-certc',1707643200),
  ('ioc-012','url','http://dropper.xyz/stage2/payload.bin','org-certc',1707729600),
  ('ioc-013','domain','fake-banklogin.com','org-banka',1707816000),
  ('ioc-014','file_hash','3a7f8b9c1d2e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a','org-bankb',1707902400),
  ('ioc-015','ip','203.0.113.42','org-banka',1709164800),
  ('ioc-016','url','http://phishing.example.com/banklogin?session=true','org-bankb',1709251200),
  ('ioc-017','domain','ransomware-payment.onion','org-certc',1709337600),
]
for (ioc_id,ioc_type,val,org,ts) in iocs:
  s = f'{ioc_id}|{ioc_type}|{val}|{org}|{ts}'
  h = hashlib.sha256(s.encode('utf-8')).hexdigest()
  print(f"  '{ioc_id}': '{h}',")
