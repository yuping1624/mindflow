SELECT 
  attname AS 欄位名稱, 
  format_type(atttypid, atttypmod) AS 真實型別定義
FROM pg_attribute 
WHERE attrelid = 'public.embeddings'::regclass 
AND attname = 'embedding';