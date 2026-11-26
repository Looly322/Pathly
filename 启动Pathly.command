#!/bin/zsh
cd "${0:A:h}" || exit 1
PATH="/Users/conths/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH"
if ! command -v node >/dev/null; then
  echo '需要 Node.js 22.12 或更新版本。'; read '?按回车关闭'; exit 1
fi
printf 'Pathly 恢复版：http://localhost:5173/\n请保留此窗口；按 Ctrl+C 停止。\n'
node scripts/dev.mjs
