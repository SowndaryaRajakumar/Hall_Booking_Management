const pool = require('../config/db');
const { getPagination, makePagination } = require('../utils/pagination');

const makeDepartmentCode = async (name, excludeId = null) => {
  const base = name.split(/\s+/).map((part) => part[0]).join('').toUpperCase().slice(0, 16) || 'DEPT';
  let code = base;
  let suffix = 2;

  while (true) {
    const [rows] = await pool.query(
      `SELECT DeptID FROM Departments WHERE UPPER(DeptCode) = ? ${excludeId ? 'AND DeptID <> ?' : ''}`,
      excludeId ? [code, excludeId] : [code]
    );
    if (!rows.length) return code;
    code = `${base.slice(0, 16 - String(suffix).length)}${suffix}`;
    suffix += 1;
  }
};

exports.getAllDepartments = async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const includeInactive = req.path === '/admin';
  try {
    const term = req.query.search?.trim() ? `%${req.query.search.trim()}%` : null;
    const conditions = [];
    const params = [];
    if (!includeInactive) conditions.push('IsActive = 1');
    if (term) {
      conditions.push('(DeptName LIKE ? OR DeptCode LIKE ?)');
      params.push(term, term);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [[countRow]] = await pool.query(`SELECT COUNT(*) AS total FROM Departments ${where}`, params);
    const [rows] = await pool.query(`SELECT DeptID, DeptName, DeptCode, IsActive, CreatedAt, UpdatedAt FROM Departments ${where} ORDER BY DeptName LIMIT ? OFFSET ?`, [...params, limit, offset]);
    res.json({ data: rows, pagination: makePagination({ page, limit, total: countRow.total }) });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ message: 'Failed to fetch departments.' });
  }
};

exports.getDepartmentById = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DeptID, DeptName, DeptCode, IsActive, CreatedAt, UpdatedAt FROM Departments WHERE DeptID = ? AND IsActive = 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Department not found.' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ message: 'Failed to fetch department details.' });
  }
};

exports.createDepartment = async (req, res) => {
  const deptName = String(req.body?.deptName || req.body?.name || '').trim();
  if (!deptName) return res.status(400).json({ message: 'Department name is required.' });
  try {
    const [duplicate] = await pool.query('SELECT DeptID FROM Departments WHERE LOWER(DeptName) = LOWER(?)', [deptName]);
    if (duplicate.length) return res.status(409).json({ message: 'A department with this name already exists.' });
    const deptCode = String(req.body?.deptCode || '').trim() || await makeDepartmentCode(deptName);
    const [codeDuplicate] = await pool.query('SELECT DeptID FROM Departments WHERE UPPER(DeptCode) = UPPER(?)', [deptCode]);
    if (codeDuplicate.length) return res.status(409).json({ message: 'A department with this code already exists.' });
    const [result] = await pool.query('INSERT INTO Departments (DeptName, DeptCode, IsActive) VALUES (?, ?, 1)', [deptName, deptCode]);
    res.status(201).json({ department: { DeptID: result.insertId, DeptName: deptName, DeptCode: deptCode, IsActive: 1 } });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ message: 'Failed to create department.' });
  }
};

exports.updateDepartment = async (req, res) => {
  const deptName = String(req.body?.deptName || req.body?.name || '').trim();
  if (!deptName) return res.status(400).json({ message: 'Department name is required.' });
  try {
    const [current] = await pool.query('SELECT DeptCode, IsActive FROM Departments WHERE DeptID = ?', [req.params.id]);
    if (!current.length) return res.status(404).json({ message: 'Department not found.' });
    const [duplicate] = await pool.query('SELECT DeptID FROM Departments WHERE LOWER(DeptName) = LOWER(?) AND DeptID <> ?', [deptName, req.params.id]);
    if (duplicate.length) return res.status(409).json({ message: 'A department with this name already exists.' });
    const deptCode = String(req.body?.deptCode || '').trim() || current[0].DeptCode;
    const isActive = req.body?.isActive === undefined ? current[0].IsActive : Boolean(req.body.isActive);
    await pool.query('UPDATE Departments SET DeptName = ?, DeptCode = ?, IsActive = ? WHERE DeptID = ?', [deptName, deptCode, isActive ? 1 : 0, req.params.id]);
    res.json({ department: { DeptID: Number(req.params.id), DeptName: deptName, DeptCode: deptCode, IsActive: isActive ? 1 : 0 } });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ message: 'Failed to update department.' });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const [usage] = await pool.query('SELECT COUNT(*) AS total FROM Halls WHERE DeptID = ?', [req.params.id]);
    if (usage[0].total > 0) return res.status(409).json({ message: 'This department is currently assigned to existing venues and cannot be deleted.' });
    const [result] = await pool.query('DELETE FROM Departments WHERE DeptID = ?', [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: 'Department not found.' });
    res.json({ message: 'Department deleted successfully.' });
  } catch (error) {
    console.error('Error deleting department:', error);
    res.status(500).json({ message: 'Failed to delete department.' });
  }
};
