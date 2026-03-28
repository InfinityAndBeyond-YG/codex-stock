#!/bin/zsh

set -euo pipefail

export PATH="/Applications/Codex.app/Contents/Resources:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

REPO_DIR="/Users/yeginkim/Desktop/stockflow"
COMMAND_FILE="/Users/yeginkim/Library/CloudStorage/GoogleDrive-rladpwls159@gmail.com/내 드라이브/codex-commands/command.txt"
STATE_DIR="$HOME/.stockflow-automation"
LAST_SUCCESS_FILE="$STATE_DIR/last_successful_command.txt"
RUN_LOG="$STATE_DIR/runner.log"
CODEX_BIN="/Applications/Codex.app/Contents/Resources/codex"

mkdir -p "$STATE_DIR"
touch "$RUN_LOG"
exec >>"$RUN_LOG" 2>&1

timestamp() {
  TZ=Asia/Seoul date "+%Y-%m-%d %H:%M:%S KST"
}

echo "[$(timestamp)] LaunchAgent tick"
echo "[$(timestamp)] HOME=$HOME"

weekday="$(TZ=Asia/Seoul date +%u)"
if (( weekday > 5 )); then
  echo "[$(timestamp)] Skip: weekend"
  exit 0
fi

current_hhmm="$(TZ=Asia/Seoul date +%H%M)"
if (( current_hhmm < 900 || current_hhmm > 1905 )); then
  echo "[$(timestamp)] Skip: outside 09:00-19:05 window"
  exit 0
fi

if [[ ! -f "$COMMAND_FILE" ]]; then
  echo "[$(timestamp)] Skip: command file not found"
  exit 0
fi

if [[ ! -x "$CODEX_BIN" ]]; then
  echo "[$(timestamp)] Failure: Codex binary not executable at $CODEX_BIN"
  exit 1
fi

if [[ ! -d "$REPO_DIR" ]]; then
  echo "[$(timestamp)] Failure: repo directory not found at $REPO_DIR"
  exit 1
fi

if ! grep -q '[^[:space:]]' "$COMMAND_FILE"; then
  echo "[$(timestamp)] Skip: command file empty"
  exit 0
fi

command_text="$(cat "$COMMAND_FILE")"
if [[ -f "$LAST_SUCCESS_FILE" ]]; then
  last_success_text="$(cat "$LAST_SUCCESS_FILE")"
  if [[ "$command_text" == "$last_success_text" ]]; then
    echo "[$(timestamp)] Skip: command identical to last successful run"
    exit 0
  fi
fi

prompt_file="$(mktemp "$STATE_DIR/prompt.XXXXXX.txt")"
result_file="$(mktemp "$STATE_DIR/result.XXXXXX.txt")"

cleanup() {
  rm -f "$prompt_file" "$result_file"
}
trap cleanup EXIT

cat <<EOF > "$prompt_file"
You are running non-interactively for the stockflow project at $REPO_DIR.

Read the user's command below and carry it out in the repository.

Requirements:
- Work only inside the stockflow project.
- Ignore unrelated local changes such as .DS_Store.
- If changes are needed, run git add, git commit, and git push origin main.
- Treat a successful push to origin/main as required for completion.
- If push fails, stop and exit with failure so the same command can retry later.
- If the request is already satisfied and no code change is needed, report that briefly and exit successfully.
- Do not modify or clear the Google Drive command file.

User command:
<<<COMMAND
$command_text
COMMAND
EOF

echo "[$(timestamp)] Processing new command"

if "$CODEX_BIN" exec \
  --dangerously-bypass-approvals-and-sandbox \
  -C "$REPO_DIR" \
  -o "$result_file" \
  - < "$prompt_file"; then
  printf "%s" "$command_text" > "$LAST_SUCCESS_FILE"
  echo "[$(timestamp)] Success: command processed"
  if [[ -s "$result_file" ]]; then
    echo "[$(timestamp)] Codex summary:"
    cat "$result_file"
  fi
  exit 0
fi

echo "[$(timestamp)] Failure: Codex exec exited non-zero"
if [[ -s "$result_file" ]]; then
  echo "[$(timestamp)] Codex summary:"
  cat "$result_file"
fi
exit 1
