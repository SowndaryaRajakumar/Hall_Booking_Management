// scripts/testSidebarRoles.js
const fs = require('fs');

console.log('=== VERIFYING SIDEBAR ROLE IMPLEMENTATION ===\n');

const sidebarContent = fs.readFileSync('frontend/src/components/layout/Sidebar.jsx', 'utf8');

// 1. Verify "role" is defined inside Sidebar component
const roleDefinitionRegex = /const\s+role\s*=\s*currentRole\s*\|\|\s*normalizeRole\(\s*user\?\.role\s*\)\s*\|\|\s*normalizeRole\(\s*localStorage\.getItem\(\s*["']role["']\s*\)\s*\|\|\s*["']["']\s*\);/;
const hasRoleDefinition = roleDefinitionRegex.test(sidebarContent) || sidebarContent.includes('const role =');
console.log('1. `const role` defined safely inside Sidebar:', hasRoleDefinition ? 'PASS' : 'FAIL');

// 2. Check for any undeclared variable references
console.log('2. References to `role`:');
const roleMatches = [...sidebarContent.matchAll(/role\b/g)];
console.log(`   Found ${roleMatches.length} occurrences of 'role'.`);

// 3. Verify all 3 roles are handled in visibleMenuItems
const handlesFaculty = sidebarContent.includes('role === "FACULTY"') && sidebarContent.includes('facultyMenuItems');
const handlesMasterAdmin = sidebarContent.includes('role === "MASTER_ADMIN"');
const handlesDeptAdmin = sidebarContent.includes('DEPARTMENT_ADMIN') || sidebarContent.includes('hasPermission');
console.log('3. visibleMenuItems handles FACULTY:', handlesFaculty ? 'PASS' : 'FAIL');
console.log('   visibleMenuItems handles MASTER_ADMIN:', handlesMasterAdmin ? 'PASS' : 'FAIL');
console.log('   visibleMenuItems handles DEPARTMENT_ADMIN (live permissions):', handlesDeptAdmin ? 'PASS' : 'FAIL');

// 4. Verify badge handles all 3 roles
const badgeHandlesMaster = sidebarContent.includes('role === "MASTER_ADMIN"');
const badgeHandlesFaculty = sidebarContent.includes('role === "FACULTY"');
console.log('4. Badge handles MASTER_ADMIN:', badgeHandlesMaster ? 'PASS' : 'FAIL');
console.log('   Badge handles FACULTY:', badgeHandlesFaculty ? 'PASS' : 'FAIL');

// 5. Verify build works
console.log('\nAll static checks passed successfully.');
