const fs = require('fs');
const filePath = 'd:/hall booking/Hall_booking-main/frontend/src/pages/FacultyManagement/FacultyManagement.jsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /\{faculty\.role === "admin" \? \([\s\S]*?\)\} \)/g,
  '<span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">Faculty</span>'
);

// Also handle the exact match if above regex didn't catch the paren
if (content.includes('faculty.role === "admin"')) {
  content = content.replace(
    /\{faculty\.role === "admin"[\s\S]*?Faculty\s*<\/span>\s*\)\}/g,
    '<span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">Faculty</span>'
  );
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('FacultyManagement.jsx updated successfully. Included check:', !content.includes('faculty.role === "admin"'));
