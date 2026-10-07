#!/usr/bin/env bash
# Starts the Next.js dev server using the Node.js installed by nvm,
# so it works even when the launcher's PATH does not include node.
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
cd "$(dirname "$0")/.." && exec npm run dev
