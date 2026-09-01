const pool = require('../config/db');

const listVenueTypes = async (req, res) => {
  try {
    const includeInactive = req.path === '/admin';
    const [rows] = await pool.query(
      `SELECT id, name, IsActive, created_at, updated_at
       FROM venue_types ${includeInactive ? '' : 'WHERE IsActive = 1'}
       ORDER BY name`
    );
    res.json({ data: rows });
  } catch (error) {
    console.error('Error fetching venue types:', error);
    res.status(500).json({ message: 'Failed to fetch venue types.' });
  }
};

const createVenueType = async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Venue type name is required.' });

  try {
    const [existing] = await pool.query('SELECT id FROM venue_types WHERE LOWER(name) = LOWER(?)', [name]);
    if (existing.length) return res.status(409).json({ message: 'A venue type with this name already exists.' });

    const [result] = await pool.query('INSERT INTO venue_types (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.insertId, name, IsActive: 1 });
  } catch (error) {
    console.error('Error creating venue type:', error);
    res.status(500).json({ message: 'Failed to create venue type.' });
  }
};

const updateVenueType = async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const isActive = req.body?.isActive;
  if (!name) return res.status(400).json({ message: 'Venue type name is required.' });

  try {
    const [duplicate] = await pool.query('SELECT id FROM venue_types WHERE LOWER(name) = LOWER(?) AND id <> ?', [name, req.params.id]);
    if (duplicate.length) return res.status(409).json({ message: 'A venue type with this name already exists.' });

    const [currentRows] = await pool.query('SELECT name, IsActive FROM venue_types WHERE id = ?', [req.params.id]);
    if (!currentRows.length) return res.status(404).json({ message: 'Venue type not found.' });

    const active = isActive === undefined ? currentRows[0].IsActive : Boolean(isActive);
    await pool.query('UPDATE venue_types SET name = ?, IsActive = ? WHERE id = ?', [name, active ? 1 : 0, req.params.id]);
    res.json({ id: Number(req.params.id), name, IsActive: active ? 1 : 0 });
  } catch (error) {
    console.error('Error updating venue type:', error);
    res.status(500).json({ message: 'Failed to update venue type.' });
  }
};

const deleteVenueType = async (req, res) => {
  try {
    const [typeRows] = await pool.query('SELECT name FROM venue_types WHERE id = ?', [req.params.id]);
    if (!typeRows.length) return res.status(404).json({ message: 'Venue type not found.' });

    const [usage] = await pool.query('SELECT COUNT(*) AS total FROM Halls WHERE VenueType = ?', [typeRows[0].name]);
    if (usage[0].total > 0) {
      return res.status(409).json({ message: 'This venue type is currently assigned to existing venues and cannot be deleted.' });
    }

    await pool.query('DELETE FROM venue_types WHERE id = ?', [req.params.id]);
    res.json({ message: 'Venue type deleted successfully.' });
  } catch (error) {
    console.error('Error deleting venue type:', error);
    res.status(500).json({ message: 'Failed to delete venue type.' });
  }
};

module.exports = { listVenueTypes, createVenueType, updateVenueType, deleteVenueType };
