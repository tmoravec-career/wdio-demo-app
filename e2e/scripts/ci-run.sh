#!/usr/bin/env bash
# Runs the suite in CI and applies the job's expectation.
#
#   EXPECT=pass   normal run: the job fails if any test fails
#   EXPECT=fail   seeded-bug run: the job fails if the suite does NOT catch the bug
#
#   SUITE=<name>  optional wdio suite (smoke | lifecycle | sleep); empty = everything
set -uo pipefail
cd "$(dirname "$0")/.."

args=()
[[ -n "${SUITE:-}" ]] && args+=(--suite "$SUITE")

# ${args[@]+...}: macOS ships bash 3.2, where an empty array under `set -u` is "unbound".
npx wdio run ./wdio.conf.ts ${args[@]+"${args[@]}"}
code=$?

# Device log while the device still exists (the emulator action tears it down after this script).
mkdir -p reports
if [[ "${PLATFORM:-}" == "android" ]]; then
  adb logcat -d > reports/logcat.txt 2>/dev/null || true
  adb logcat -d -b crash > reports/crashes.txt 2>/dev/null || true
fi

summary="${GITHUB_STEP_SUMMARY:-/dev/null}"
label="variant=${APP_VARIANT:-release} bug=${SEEDED_BUG:-none} suite=${SUITE:-all}"

if [[ "${EXPECT:-pass}" == "fail" ]]; then
  if [[ $code -eq 0 ]]; then
    echo "❌ $label: suite PASSED but the seeded bug should have been caught" | tee -a "$summary"
    exit 1
  fi
  echo "✅ $label: seeded bug caught (suite failed as expected)" | tee -a "$summary"
  exit 0
fi

[[ $code -eq 0 ]] && echo "✅ $label: passed" | tee -a "$summary" || echo "❌ $label: failed" | tee -a "$summary"
exit $code
