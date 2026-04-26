#!/bin/bash
set -e
cd "$(dirname "$0")/.."

npm run build

if [ -f dist/index.html ]; then
  mv dist/index.html dist/admin.html
fi

cp dist/admin.html ../backend/ライセンス管理/admin.html
echo "Copied dist/admin.html → backend/ライセンス管理/admin.html"
echo "Run 'cd backend/ライセンス管理 && clasp push' to deploy"
