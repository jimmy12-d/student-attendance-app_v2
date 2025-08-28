// Diagnostic script for theme debugging
console.log('🔍 Theme Diagnostic');
console.log('📝 Document has dark class:', document.documentElement.classList.contains('dark'));
console.log('📝 Body classes:', document.body.className);
console.log('📝 localStorage darkMode:', localStorage.getItem('darkMode'));

// Force light mode
console.log('🌟 Forcing light mode...');
localStorage.setItem('darkMode', '0');
document.documentElement.classList.remove('dark', 'dark-scrollbars-compat');

// Check computed styles
const body = document.body;
const computedStyles = getComputedStyle(body);
console.log('📝 Body background-color:', computedStyles.backgroundColor);

// Find all elements with background styles
const elementsWithBg = document.querySelectorAll('[class*="bg-"]');
console.log('📝 Elements with bg classes:', elementsWithBg.length);

// Check student layout background
const studentLayout = document.querySelector('[class*="fixed"][class*="inset-0"]');
if (studentLayout) {
    console.log('📝 Found background element:', studentLayout.className);
    const bgStyles = getComputedStyle(studentLayout);
    console.log('📝 Background element styles:', {
        background: bgStyles.background,
        backgroundColor: bgStyles.backgroundColor,
        zIndex: bgStyles.zIndex
    });
}

console.log('✅ Diagnostic complete - check if background changes now');
