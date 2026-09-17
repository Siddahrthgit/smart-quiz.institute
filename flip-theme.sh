#!/bin/bash
# Run from ~/smart-quiz-institute
# Commit first: git add -A && git commit -m "pre-theme-flip checkpoint"

# Step A: protect the deliberately-dim decorative text-slate-600 instances
# (they need text-slate-400 in the end, the opposite end of the scale from
# what the bulk 400 rule below produces, so they'd collide if untouched)
sed -i 's/text-slate-600/PRESERVEDIM/g' src/components/Dashboard.tsx
sed -i 's/text-slate-600/PRESERVEDIM/g' src/components/FriendsModal.tsx

FILES=$(find src -type f \( -name "*.tsx" -o -name "*.css" \))

# Step B: bulk conversion via unique placeholders, avoids cascading matches
sed -i \
  -e 's/bg-slate-950/TEMPLIGHT__bg-white/g' \
  -e 's/bg-slate-900/TEMPLIGHT__bg-slate-50/g' \
  -e 's/bg-slate-800/TEMPLIGHT__bg-slate-100/g' \
  -e 's/bg-slate-700/TEMPLIGHT__bg-slate-200/g' \
  -e 's/border-slate-800/TEMPLIGHT__border-slate-200/g' \
  -e 's/border-slate-700/TEMPLIGHT__border-slate-300/g' \
  -e 's/border-slate-600/TEMPLIGHT__border-slate-400/g' \
  -e 's/text-slate-100/TEMPLIGHT__text-slate-900/g' \
  -e 's/text-slate-200/TEMPLIGHT__text-slate-800/g' \
  -e 's/text-slate-300/TEMPLIGHT__text-slate-700/g' \
  -e 's/text-slate-400/TEMPLIGHT__text-slate-600/g' \
  $FILES

sed -i 's/TEMPLIGHT__//g' $FILES

# Step C: release the protected instances to their correct final value
sed -i 's/PRESERVEDIM/text-slate-400/g' src/components/Dashboard.tsx
sed -i 's/PRESERVEDIM/text-slate-400/g' src/components/FriendsModal.tsx

echo "Done. Still needs manual attention:"
echo "1. FriendsModal.tsx - border-slate-950 status ring: check its parent container's new background class, match this border to it"
echo "2. index.css - hardcoded background-color: #020617 is not a class, change it by hand"
echo "3. npx vite build to catch errors before pushing"
echo "4. Visually check Login, Upload and Exam, Performance pages, and the toggle switch in QuizGenerator.tsx"
