#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Common TypeScript error fixes
const fixes = [
  {
    file: 'src/features/registrations/pages/RegistrationsList.tsx',
    patterns: [
      {
        search: /const \[userEmail, setUserEmail\] = React\.useState<string \| null>\(auth\.currentUser\?\.email \|\| null\)/,
        replace: 'const [_userEmail, setUserEmail] = React.useState<string | null>(auth.currentUser?.email || null)'
      }
    ]
  },
  {
    file: 'src/features/reports/pages/RegistrationsReportPage.tsx',
    patterns: [
      {
        search: /import \{[\s\S]*?Stack,[\s\S]*?\} from '@mui\/material'/,
        replace: (match) => match.replace(/,?\s*Stack/, '')
      }
    ]
  }
];

function applyFixes() {
  console.log('🔧 Applying TypeScript error fixes...');
  
  fixes.forEach(({ file, patterns }) => {
    const filePath = path.join(process.cwd(), file);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${file}`);
      return;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    patterns.forEach(({ search, replace }) => {
      if (search.test(content)) {
        content = content.replace(search, replace);
        modified = true;
        console.log(`✅ Fixed: ${file}`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
    }
  });
  
  console.log('✨ TypeScript fixes applied!');
}

// Run fixes
applyFixes();
