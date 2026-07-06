#!/usr/bin/env bash
# Seed KeyTrain RailNet DynamoDB test data. See scripts/railnet-seed/README.md
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/scripts/railnet-seed"

if [ ! -d venv ]; then
  python3 -m venv venv
  venv/bin/pip install -q -r requirements.txt
fi

export AWS_REGION="${AWS_REGION:-us-east-2}"
exec venv/bin/python aws_railnet_seed.py "$@"
