#!/bin/bash

# Script to add dynamic exports to all "use client" pages

files=(
  "app/dashboard/forms/[formId]/responses/page.tsx"
  "app/dashboard/forms/[formId]/page.tsx"
  "app/dashboard/stars/page.tsx"
  "app/dashboard/attendance-score/page.tsx"
  "app/dashboard/mock-results/page.tsx"
  "app/dashboard/payment-summary/page.tsx"
  "app/dashboard/face-enrollment/page.tsx"
  "app/dashboard/students/page.tsx"
  "app/dashboard/mock-exams/page.tsx"
  "app/dashboard/scan-qr/page.tsx"
  "app/dashboard/class-management/page.tsx"
  "app/dashboard/pos-student/page.tsx"
  "app/dashboard/approvals/page.tsx"
  "app/dashboard/backup/page.tsx"
  "app/dashboard/permission/page.tsx"
  "app/dashboard/page.tsx"
  "app/dashboard/check/page.tsx"
  "app/dashboard/import-student/page.tsx"
  "app/dashboard/manage-excuses/page.tsx"
  "app/dashboard/cloud-backup/page.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    
    # Check if file starts with "use client" and doesn't have dynamic export
    if head -5 "$file" | grep -q '"use client"' && ! head -10 "$file" | grep -q 'export const dynamic'; then
      # Create temp file with the fix
      {
        # Print first line ("use client")
        head -1 "$file"
        
        # Add empty line and exports
        echo ""
        echo "// Force dynamic rendering"
        echo "export const dynamic = 'force-dynamic';"
        echo "export const fetchCache = 'force-no-store';"
        
        # Print rest of file (skip first line)
        tail -n +2 "$file"
      } > "${file}.tmp"
      
      # Replace original with temp
      mv "${file}.tmp" "$file"
      echo "✓ Fixed: $file"
    else
      echo "⊘ Skipped: $file (already has dynamic export or not use client)"
    fi
  else
    echo "✗ Not found: $file"
  fi
done

echo ""
echo "Done! All files processed."
