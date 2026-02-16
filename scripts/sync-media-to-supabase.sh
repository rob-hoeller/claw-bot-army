#!/usr/bin/env bash
set -euo pipefail

# Config
SUPABASE_URL="https://lqlnflbzsqsmufjrygvu.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxbG5mbGJ6c3FzbXVmanJ5Z3Z1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDc0ODM3NCwiZXhwIjoyMDg2MzI0Mzc0fQ.k2QS8Z87p91dWhLzOKrBOdEkdfaFWZlVmckHpgJXYIM"
DB_URL="postgresql://postgres.lqlnflbzsqsmufjrygvu:mV7cFnlbRBqIlUE7@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require"
MEDIA_DIR="/home/ubuntu/.openclaw/media/inbound"
BUCKET="chat-media"
CHANNEL="unknown"
TODAY=$(date -u +%Y-%m-%d)

synced=0
skipped=0
errors=0

for filepath in "${MEDIA_DIR}"/*; do
  [ -f "$filepath" ] || continue
  
  filename=$(basename "$filepath")
  
  # Check if already synced
  exists=$(psql "$DB_URL" -tAc "SELECT 1 FROM public.chat_media WHERE file_name = '${filename}' LIMIT 1" 2>/dev/null || echo "")
  if [ "$exists" = "1" ]; then
    skipped=$((skipped + 1))
    continue
  fi

  # Determine mime type
  mime=$(file -b --mime-type "$filepath")
  fsize=$(stat -c%s "$filepath")
  
  # Storage path: channel/date/filename
  storage_path="${CHANNEL}/${TODAY}/${filename}"

  # Upload to Supabase Storage
  upload_resp=$(curl -s -w "\n%{http_code}" -X POST \
    "${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storage_path}" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: ${mime}" \
    --data-binary "@${filepath}")
  
  http_code=$(echo "$upload_resp" | tail -1)
  
  if [ "$http_code" != "200" ]; then
    echo "ERROR uploading ${filename}: HTTP ${http_code}"
    errors=$((errors + 1))
    continue
  fi

  # Get storage URL (signed URL valid 10 years)
  sign_resp=$(curl -s -X POST \
    "${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${storage_path}" \
    -H "apikey: ${SERVICE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"expiresIn": 315360000}')
  
  signed_url="${SUPABASE_URL}/storage/v1$(echo "$sign_resp" | jq -r '.signedURL // empty')"

  # Insert metadata row
  escaped_filename=$(echo "$filename" | sed "s/'/''/g")
  psql "$DB_URL" -c "
    INSERT INTO public.chat_media (file_name, original_path, storage_path, storage_url, channel, mime_type, file_size)
    VALUES ('${escaped_filename}', '${filepath}', '${storage_path}', '${signed_url}', '${CHANNEL}', '${mime}', ${fsize})
    ON CONFLICT (file_name) DO NOTHING;
  " >/dev/null 2>&1

  synced=$((synced + 1))
  echo "Synced: ${filename}"
done

echo ""
echo "Done. Synced: ${synced}, Skipped: ${skipped}, Errors: ${errors}"
