#!/bin/bash
# Run from ~/smart-quiz-institute, after flip-theme.sh, before another commit
# Requires perl: pkg install perl -y   (skip if already installed)

perl -i -pe 's/text-white/text-slate-900/g unless /bg-indigo-600|bg-indigo-500|bg-violet-600|bg-violet-500|bg-red-600|bg-red-500|bg-emerald-600|bg-emerald-500|bg-amber-600|bg-amber-500|gradient/' $(find src -name "*.tsx")

echo "Done. This converted every bare text-white to text-slate-900,"
echo "and left text-white alone anywhere it sits on a solid colored button or a gradient."
echo "Re-check hover states on Navbar.tsx, AuthModal.tsx, and FeatureChatWidget.tsx by eye."
