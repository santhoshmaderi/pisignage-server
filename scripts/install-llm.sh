#!/usr/bin/env bash
#
# install-llm.sh — set up the local LLM that powers the piSignage Assistant.
#
# The assistant talks to a local Ollama runtime (no cloud, nothing leaves your
# network). This script installs Ollama, starts it as a service, pulls the
# model the server is configured to use, and verifies the whole path end-to-end.
#
# Run it ONCE on the machine that runs pisignage-server, after enabling the
# assistant in Settings → piSignage Assistant:
#
#     sudo bash scripts/install-llm.sh
#
# Override the model / endpoint to match your server config (config/env/all.js):
#
#     OLLAMA_MODEL=qwen2.5:3b OLLAMA_URL=http://localhost:11434 sudo -E bash scripts/install-llm.sh
#
# Notes on sizing: qwen2.5:3b needs ~2 GB RAM and ~2 GB disk and runs on CPU.
# On a low-RAM box you can pick a smaller model (e.g. qwen2.5:1.5b) via
# OLLAMA_MODEL, but also set OLLAMA_MODEL in the server's environment so the two
# agree.

set -euo pipefail

# ── Config (kept in sync with config/env/all.js defaults) ──────────────────
OLLAMA_MODEL="${OLLAMA_MODEL:-qwen2.5:3b}"
OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"

# ── Pretty output ──────────────────────────────────────────────────────────
c_green="\033[0;32m"; c_yellow="\033[0;33m"; c_red="\033[0;31m"; c_reset="\033[0m"
info()  { echo -e "${c_green}==>${c_reset} $*"; }
warn()  { echo -e "${c_yellow}!! ${c_reset} $*"; }
fail()  { echo -e "${c_red}xx ${c_reset} $*" >&2; exit 1; }

# ── Sanity checks ────────────────────────────────────────────────────────────
[ "$(uname -s)" = "Linux" ] || fail "This installer targets Linux. On macOS, download the app from https://ollama.com/download"

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
    warn "Not running as root — installation may prompt for sudo."
fi

info "piSignage Assistant — local LLM setup"
echo "    Model:    ${OLLAMA_MODEL}"
echo "    Endpoint: ${OLLAMA_URL}"
echo

# ── 1. Install Ollama (if missing) ───────────────────────────────────────────
if command -v ollama >/dev/null 2>&1; then
    info "Ollama already installed ($(ollama --version 2>/dev/null | head -n1))"
else
    info "Installing Ollama…"
    if ! command -v curl >/dev/null 2>&1; then
        fail "curl is required. Install it first (e.g. 'sudo apt-get install -y curl')."
    fi
    # Official one-line installer; sets up a systemd service where available.
    curl -fsSL https://ollama.com/install.sh | sh
    command -v ollama >/dev/null 2>&1 || fail "Ollama install did not complete — see output above."
    info "Ollama installed."
fi

# ── 2. Make sure the Ollama service is running ───────────────────────────────
start_ollama() {
    if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q '^ollama\.service'; then
        info "Enabling and starting the ollama systemd service…"
        systemctl enable --now ollama >/dev/null 2>&1 || sudo systemctl enable --now ollama
    else
        # No systemd (containers, minimal images) — start a background daemon.
        if ! pgrep -x ollama >/dev/null 2>&1; then
            warn "systemd unit not found — starting 'ollama serve' in the background."
            nohup ollama serve >/tmp/ollama.log 2>&1 &
        fi
    fi
}
start_ollama

# ── 3. Wait for the API to answer ────────────────────────────────────────────
info "Waiting for Ollama to accept connections at ${OLLAMA_URL}…"
ready=false
for _ in $(seq 1 30); do
    if curl -fsS "${OLLAMA_URL}/api/tags" >/dev/null 2>&1; then
        ready=true; break
    fi
    sleep 1
done
[ "$ready" = true ] || fail "Ollama did not become reachable at ${OLLAMA_URL}. Check 'systemctl status ollama' or /tmp/ollama.log."
info "Ollama is up."

# ── 4. Pull the model ────────────────────────────────────────────────────────
if ollama list 2>/dev/null | awk '{print $1}' | grep -qx "${OLLAMA_MODEL}"; then
    info "Model '${OLLAMA_MODEL}' already present — skipping download."
else
    info "Pulling model '${OLLAMA_MODEL}' (this can take a few minutes on first run)…"
    ollama pull "${OLLAMA_MODEL}"
fi

# ── 5. Verify the model responds ─────────────────────────────────────────────
info "Verifying the model responds…"
if curl -fsS "${OLLAMA_URL}/api/generate" \
        -d "{\"model\":\"${OLLAMA_MODEL}\",\"prompt\":\"Reply with the single word: ready\",\"stream\":false}" \
        >/dev/null 2>&1; then
    info "Model responded successfully."
else
    warn "Could not get a test response from the model — the assistant may still work; check server logs."
fi

# ── Done ─────────────────────────────────────────────────────────────────────
echo
info "Local LLM is ready for the piSignage Assistant."
cat <<EOF

Next steps:
  1. Make sure the assistant is enabled in Settings → piSignage Assistant.
  2. If your server runs on a DIFFERENT host than this one, or you changed the
     model above, set these in the server's environment so they match:
         OLLAMA_URL=${OLLAMA_URL}
         OLLAMA_MODEL=${OLLAMA_MODEL}
  3. Reload the piSignage console — the Assistant button (bottom-right) is now live.

Nothing you ask the assistant leaves this machine — inference is 100% local.
EOF
