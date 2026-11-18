#!/usr/bin/env bash
# One-command launcher (Linux / macOS)
set -e
cd "$(dirname "$0")"
[ -d .venv ] || python3 -m venv .venv
source .venv/bin/activate
pip install -q -r requirements.txt
python app.py
