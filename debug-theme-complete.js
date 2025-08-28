// Comprehensive theme diagnostic
console.log('🔍 Comprehensive Theme Diagnostic');

// 1. Check localStorage
const darkMode = localStorage.getItem('darkMode');
console.log('📝 localStorage darkMode:', darkMode);

// 2. Check document classes
const hasDarkClass = document.documentElement.classList.contains('dark');
console.log('📝 Document has dark class:', hasDarkClass);
console.log('📝 Document classes:', document.documentElement.className);

// 3. Check body styles
const bodyStyles = getComputedStyle(document.body);
console.log('📝 Body background-color:', bodyStyles.backgroundColor);
console.log('📝 Body classes:', document.body.className);

// 4. Check for the gradient background element
const gradientDiv = document.querySelector('.fixed.inset-0');
if (gradientDiv) {
    const gradientStyles = getComputedStyle(gradientDiv);
    console.log('📝 Gradient element found');
    console.log('📝 Gradient background:', gradientStyles.background);
    console.log('📝 Gradient classes:', gradientDiv.className);
} else {
    console.log('❌ No gradient element found');
}

// 5. Force fix everything
console.log('🔧 Applying fixes...');

// Remove dark class completely
document.documentElement.classList.remove('dark', 'dark-scrollbars-compat');

// Set localStorage to light
localStorage.setItem('darkMode', '0');

// Force body background
document.body.style.backgroundColor = '#ffffff';
document.body.style.background = '#ffffff';

// Find and force gradient element
if (gradientDiv) {
    gradientDiv.style.background = 'linear-gradient(135deg, rgb(239 246 255) 0%, rgb(238 242 255) 50%, rgb(250 245 255) 100%)';
    gradientDiv.style.zIndex = '-10';
}

console.log('✅ Force fixes applied. Check background now.');

// 6. Check if there are conflicting CSS rules
const allStyleSheets = Array.from(document.styleSheets);
console.log('📝 Number of stylesheets:', allStyleSheets.length);

// Look for any rules that might be forcing dark backgrounds
let suspiciousRules = [];
try {
    allStyleSheets.forEach((sheet, index) => {
        try {
            const rules = Array.from(sheet.cssRules || sheet.rules || []);
            rules.forEach(rule => {
                if (rule.cssText && (rule.cssText.includes('bg-gray-8') || rule.cssText.includes('background') && rule.cssText.includes('dark'))) {
                    suspiciousRules.push(`Sheet ${index}: ${rule.cssText}`);
                }
            });
        } catch (e) {
            // Cross-origin stylesheet, skip
        }
    });
} catch (e) {
    console.log('Could not analyze stylesheets:', e);
}

if (suspiciousRules.length > 0) {
    console.log('⚠️ Suspicious CSS rules found:');
    suspiciousRules.forEach(rule => console.log(rule));
} else {
    console.log('✅ No suspicious CSS rules found');
}
