#!/usr/bin/env bash
# Meridian image install checker — run from your project root:
#   bash check-setup.sh
# Prints PASS/FAIL for each piece and the exact fix for anything red.

pass() { printf "  \033[32m✓\033[0m %s\n" "$1"; }
fail() { printf "  \033[31m✗\033[0m %s\n" "$1"; FAILED=1; }
warn() { printf "  \033[33m!\033[0m %s\n" "$1"; }
FAILED=0

echo
echo "Meridian image install check"
echo "project: $(pwd)"
echo

# ── 1. right folder? ────────────────────────────────────────────────
echo "1. Project root"
if [ -f package.json ] && [ -f src/app/page.tsx ]; then
  pass "package.json + src/app/page.tsx found here"
else
  fail "this isn't the project root (no package.json or src/app/page.tsx)"
  echo "     cd into the folder that has package.json, then re-run."
  exit 1
fi

nested=$(find . -maxdepth 3 -name "meridian-bank-v2-with-images" -not -path "./node_modules/*" 2>/dev/null | head -3)
if [ -n "$nested" ]; then
  fail "a copy of the zip is nested inside your project:"
  echo "$nested" | sed 's/^/       /'
  echo "     that folder is doing nothing — delete it and re-copy from it first:"
  echo "       cp -r meridian-bank-v2-with-images/public/images public/"
  echo "       cp meridian-bank-v2-with-images/src/app/page.tsx src/app/page.tsx"
  echo "       cp meridian-bank-v2-with-images/src/app/layout.tsx src/app/layout.tsx"
else
  pass "no nested copy of the zip"
fi

pt=$(find src -name "page.tsx" 2>/dev/null | grep -cx "src/app/page.tsx")
[ "$pt" = "1" ] && pass "exactly one src/app/page.tsx" || warn "$pt files named src/app/page.tsx — check you edited the right one"

# ── 2. images on disk ───────────────────────────────────────────────
echo
echo "2. Images"
need="hero-meridian insight-overview cards-payments mortgage-home business-loan car-loan investments community careers hero-lifestyle og-meridian"
missing=""
for f in $need; do
  [ -f "public/images/$f.jpg" ] || missing="$missing $f"
done
count=$(ls public/images/*.jpg 2>/dev/null | wc -l | tr -d ' ')
if [ -z "$missing" ] && [ "$count" -ge 11 ]; then
  pass "all 11 JPEGs in public/images ($(du -sh public/images | cut -f1))"
else
  fail "$count/11 present; missing:$missing"
  echo "     fix: cp -r <unzipped>/public/images public/"
fi
[ -d public ] || fail "no public/ folder at all"

# ── 3. page.tsx edits ───────────────────────────────────────────────
echo
echo "3. src/app/page.tsx"
for pair in "hero-meridian:Hero background" "insight-overview:Insight slot" "cards-payments:Cards slot"; do
  f="${pair%%:*}"; label="${pair#*:}"
  if grep -q "/images/$f.jpg" src/app/page.tsx; then pass "$label wired"; else fail "$label NOT wired (/images/$f.jpg missing)"; fi
done
if grep -q "Illustration" src/app/page.tsx; then
  fail "old SVG illustration refs still present — file is partly updated"
else
  pass "no leftover Illustration refs"
fi
grep -q 'import Image from "next/image"' src/app/page.tsx && pass "next/image imported" || fail "next/image not imported"

# ── 4. layout.tsx metadata ──────────────────────────────────────────
echo
echo "4. src/app/layout.tsx"
grep -q "openGraph" src/app/layout.tsx && pass "openGraph metadata" || fail "openGraph missing"
grep -q "metadataBase" src/app/layout.tsx && pass "metadataBase set" || warn "metadataBase missing (OG URLs will be relative)"

# ── 5. stale build cache ────────────────────────────────────────────
echo
echo "5. Build cache"
if [ -d .next ]; then
  newest_src=$(find src -newer .next/BUILD_ID -name "*.tsx" 2>/dev/null | head -1)
  if [ -n "$newest_src" ]; then
    fail ".next is older than your edited source ($newest_src)"
    echo "     fix: rm -rf .next && npm run dev"
  else
    warn ".next exists — if the page looks stale: rm -rf .next && npm run dev"
  fi
else
  pass "no .next cache to go stale"
fi

# ── 6. what the dev server actually serves ──────────────────────────
echo
echo "6. Dev server (http://localhost:3000)"
code=$(curl -s -o /tmp/_meridian.html -w "%{http_code}" --max-time 4 http://localhost:3000/ 2>/dev/null)
[ -z "$code" ] && code=000
if [ "$code" = "000" ]; then
  warn "nothing answering on :3000 — start it with: npm run dev"
else
  pass "responds (HTTP $code)"
  for f in hero-meridian insight-overview cards-payments; do
    if grep -q "$f" /tmp/_meridian.html; then
      pass "served HTML references $f"
    else
      fail "served HTML does NOT reference $f — running code is stale"
    fi
  done
  grep -q "og:image" /tmp/_meridian.html && pass "og:image tag present" || warn "no og:image in served HTML"
fi

echo
if [ "$FAILED" = "0" ]; then
  printf "\033[32mAll good.\033[0m If the page still looks old, hard-refresh the browser (Ctrl/Cmd+Shift+R).\n\n"
else
  printf "\033[31mSomething above is red\033[0m — the fix is printed next to it. Re-run after fixing.\n\n"
fi
