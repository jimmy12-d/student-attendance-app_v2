#!/bin/bash

# Fix files where "use client" is not on line 1

files=(
  "app/dashboard/import-student/page.tsx"
  "app/dashboard/manage-excuses/page.tsx"
  "app/dashboard/page.tsx"
  "app/dashboard/permission/page.tsx"
  "app/dashboard/pos-student/page.tsx"
  "app/dashboard/record/page.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing: $file"
    
    # Extract the first line (should be a comment like // app/dashboard/...)
    first_line=$(head -1 "$file")
    
    # Create a temp file with proper order
    {
      # If first line is a comment, keep it and add "use client" next
      if [[ "$first_line" == "//"* ]]; then
        echo "$first_line"
        echo '"use client";'
        echo ""
        # Skip the first line and all lines until after the use client and exports
        tail -n +2 "$file" | grep -v '^"use client"' | grep -v '^export const dynamic' | grep -v '^export const fetchCache' | grep -v '^// Force dynamic rendering' | sed '/^$/d' | sed '1i\
// Force dynamic rendering\
export const dynamic = '"'force-dynamic'"';\
export const fetchCache = '"'force-no-store'"';\

'
      else
        # If no comment, just start with use client
        echo '"use client";'
        echo ""
        # Process all lines, removing duplicates
        cat "$file" | grep -v '^"use client"' | grep -v '^export const dynamic' | grep -v '^export const fetchCache' | grep -v '^// Force dynamic rendering' | sed '/^$/d' | sed '1i\
// Force dynamic rendering\
export const dynamic = '"'force-dynamic'"';\
export const fetchCache = '"'force-no-store'"';\

'
      fi
    } > "${file}.tmp"
    
    mv "${file}.tmp" "$file"
    echo "✓ Fixed: $file"
  fi
done

echo "Done!"
