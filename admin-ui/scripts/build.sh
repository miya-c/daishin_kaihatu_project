#!/bin/bash
set -e
cd "$(dirname "$0")/.."

npm run build

if [ -f dist/index.html ]; then
  mv dist/index.html dist/admin.html
fi

cp dist/admin.html ../backend/水道検針ライブラリ/admin.html
echo "Copied dist/admin.html → backend/水道検針ライブラリ/admin.html"
echo "Run 'cd backend/水道検針ライブラリ && clasp push' to deploy"
