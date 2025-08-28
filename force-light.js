// Force light mode script
console.log('🔧 Forcing light mode - run this in browser console');

// 1. Clear localStorage and set to light
localStorage.setItem('darkMode', '0');

// 2. Remove dark classes
document.documentElement.classList.remove('dark', 'dark-scrollbars-compat');

// 3. Force body to be white
document.body.style.backgroundColor = '#ffffff';
document.body.style.color = '#000000';

// 4. Remove any dark classes from body
document.body.classList.remove('dark');

// 5. Check and log what's happening
console.log('✅ Applied changes:');
console.log('- localStorage darkMode:', localStorage.getItem('darkMode'));
console.log('- Document has dark class:', document.documentElement.classList.contains('dark'));
console.log('- Body background:', document.body.style.backgroundColor);

// 6. Find and update any conflicting backgrounds
const fixedDiv = document.querySelector('.fixed.inset-0');
if (fixedDiv) {
    console.log('- Found gradient background element');
    // Force the light gradient
    fixedDiv.style.background = 'linear-gradient(to bottom right, rgb(239 246 255), rgb(238 242 255), rgb(250 245 255))';
} else {
    console.log('- No gradient background element found');
}

console.log('🎯 If still dark, there may be other CSS overrides. Check Elements tab.');
