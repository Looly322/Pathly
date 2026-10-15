#!/bin/zsh
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  export PATH="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
fi
if ! command -v npm >/dev/null 2>&1; then
  export PATH="$PWD/.tools/package/bin:$PATH"
fi
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo '请先安装 Node.js 22.12+ / Please install Node.js 22.12+ (includes npm).'
  exit 1
fi
if [ ! -d node_modules ]; then npm install; fi
npm run dev
