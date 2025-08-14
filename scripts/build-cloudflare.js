#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔧 Starting Cloudflare build process...');

try {
  // Step 1: Clean install with force and no optional dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm install --force --no-optional', { stdio: 'inherit' });
  
  // Step 1.5: Install missing Rollup dependencies for Linux (Cloudflare environment)
  console.log('🔧 Installing missing Rollup dependencies...');
  try {
    execSync('npm install @rollup/rollup-linux-x64-gnu --force', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️  Rollup dependency install failed, trying alternative...');
    try {
      execSync('npm install @rollup/rollup-linux-x64-musl --force', { stdio: 'inherit' });
    } catch (error2) {
      console.log('⚠️  Alternative Rollup dependency install failed, continuing...');
    }
  }
  
  // Step 2: Apply TypeScript fixes
  console.log('🔧 Applying TypeScript fixes...');
  execSync('node scripts/fix-typescript-errors.js', { stdio: 'inherit' });
  
  // Step 3: TypeScript compilation
  console.log('📝 Compiling TypeScript...');
  execSync('tsc -b', { stdio: 'inherit' });
  
  // Step 4: Vite build with specific environment
  console.log('🚀 Building with Vite...');
  process.env.NODE_ENV = 'production';
  execSync('npx vite build', { stdio: 'inherit' });
  
  console.log('✅ Cloudflare build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
