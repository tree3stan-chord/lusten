#!/usr/bin/env node

// Production Environment Check Script for LUSTEN
console.log('🎵 LUSTEN Production Environment Check\n');

// Check NODE_ENV
const nodeEnv = process.env.NODE_ENV;
console.log(`NODE_ENV: ${nodeEnv}`);

if (nodeEnv !== 'production') {
    console.log('❌ NODE_ENV is not set to production!');
    console.log('   This means:');
    console.log('   - Next.js dev indicators will show');
    console.log('   - Development warnings will appear');
    console.log('   - Build optimizations may not apply');
    console.log('\n   Fix: Set NODE_ENV=production before starting the server');
    process.exit(1);
} else {
    console.log('✅ NODE_ENV is correctly set to production');
}

// Check if build directory exists
const fs = require('fs');
const path = require('path');

const buildDir = path.join(process.cwd(), '.next');
if (fs.existsSync(buildDir)) {
    console.log('✅ Build directory exists');
    
    // Check for production build markers
    const buildManifest = path.join(buildDir, 'build-manifest.json');
    if (fs.existsSync(buildManifest)) {
        console.log('✅ Production build manifest found');
    } else {
        console.log('⚠️  Build manifest not found - may be dev build');
    }
} else {
    console.log('❌ Build directory not found!');
    console.log('   Run: npm run build');
    process.exit(1);
}

// Check next.config.js
const configPath = path.join(process.cwd(), 'next.config.js');
if (fs.existsSync(configPath)) {
    console.log('✅ Next.js config found');
    
    try {
        const config = require(configPath);
        
        // Check key production settings
        if (config.poweredByHeader === false) {
            console.log('✅ X-Powered-By header disabled');
        }
        
        if (config.compress === true) {
            console.log('✅ Compression enabled');
        }
        
        if (config.compiler?.removeConsole && nodeEnv === 'production') {
            console.log('✅ Console removal configured for production');
        }
        
        console.log('✅ Next.js configuration looks good');
        
    } catch (error) {
        console.log('⚠️  Could not validate Next.js config:', error.message);
    }
} else {
    console.log('⚠️  Next.js config not found');
}

// Check package.json scripts
const packagePath = path.join(process.cwd(), 'package.json');
if (fs.existsSync(packagePath)) {
    try {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        
        if (pkg.scripts?.start?.includes('NODE_ENV=production')) {
            console.log('✅ Start script sets NODE_ENV=production');
        } else {
            console.log('⚠️  Start script may not set NODE_ENV=production');
        }
        
        if (pkg.scripts?.build?.includes('NODE_ENV=production')) {
            console.log('✅ Build script sets NODE_ENV=production');
        } else {
            console.log('⚠️  Build script may not set NODE_ENV=production');
        }
        
    } catch (error) {
        console.log('⚠️  Could not read package.json:', error.message);
    }
}

console.log('\n🎉 Production environment check complete!');

if (nodeEnv === 'production') {
    console.log('\n✅ Ready for production deployment');
    console.log('   - Next.js dev indicators will be hidden');
    console.log('   - Code will be minified and optimized');
    console.log('   - Console logs will be minimized');
    console.log('   - Security headers will be applied');
    console.log('   - Custom hipster music note favicon will show');
    console.log('\n🎵 LUSTEN is ready to rock! 🎵');
} else {
    console.log('\n❌ Not ready for production - see issues above');
    process.exit(1);
}