const pool = require('../config/db');

const validId = (id) => Number.isInteger(Number(id)) && Number(id) > 0;

const listVenueFacilities = async (req, res) => {
  try {
    const includeInactive = req.baseUrl.includes('/admin/venue-facilities');
    const [rows] = await pool.query(`SELECT id, name, IsActive, created_at, updated_at FROM venue_facilities ${includeInactive ? '' : 'WHERE IsActive = 1'} ORDER BY name`);
    res.json({ data: rows });
  } catch (error) { console.error('Error fetching venue facilities:', error); res.status(500).json({ message: 'Failed to fetch venue facilities.' }); }
};

const createVenueFacility = async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Facility name is required.' });
  try {
    const [existing] = await pool.query('SELECT id FROM venue_facilities WHERE LOWER(name) = LOWER(?)', [name]);
    if (existing.length) return res.status(409).json({ message: 'A facility with this name already exists.' });
    const [result] = await pool.query('INSERT INTO venue_facilities (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.insertId, name, IsActive: 1 });
  } catch (error) { console.error('Error creating venue facility:', error); res.status(500).json({ message: 'Failed to create venue facility.' }); }
};

const updateVenueFacility = async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid facility ID.' });
  if (!name) return res.status(400).json({ message: 'Facility name is required.' });
  try {
    const [current] = await pool.query('SELECT IsActive FROM venue_facilities WHERE id = ?', [req.params.id]);
    if (!current.length) return res.status(404).json({ message: 'Facility not found.' });
    const [duplicate] = await pool.query('SELECT id FROM venue_facilities WHERE LOWER(name) = LOWER(?) AND id <> ?', [name, req.params.id]);
    if (duplicate.length) return res.status(409).json({ message: 'A facility with this name already exists.' });
    const active = req.body?.isActive === undefined ? current[0].IsActive : Boolean(req.body.isActive);
    await pool.query('UPDATE venue_facilities SET name = ?, IsActive = ? WHERE id = ?', [name, active ? 1 : 0, req.params.id]);
    res.json({ id: Number(req.params.id), name, IsActive: active ? 1 : 0 });
  } catch (error) { console.error('Error updating venue facility:', error); res.status(500).json({ message: 'Failed to update venue facility.' }); }
};

const deleteVenueFacility = async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Invalid facility ID.' });
  try {
    const [facility] = await pool.query('SELECT id FROM venue_facilities WHERE id = ?', [req.params.id]);
    if (!facility.length) return res.status(404).json({ message: 'Facility not found.' });
    const [[usage]] = await pool.query('SELECT COUNT(*) AS total FROM venue_facility_mapping WHERE facility_id = ?', [req.params.id]);
    if (usage.total) {
      await pool.query('UPDATE venue_facilities SET IsActive = 0 WHERE id = ?', [req.params.id]);
      return res.json({ message: 'Facility is assigned to existing venues and has been deactivated.' });
    }
    await pool.query('DELETE FROM venue_facilities WHERE id = ?', [req.params.id]);
    res.json({ message: 'Facility deleted successfully.' });
  } catch (error) { console.error('Error deleting venue facility:', error); res.status(500).json({ message: 'Failed to delete venue facility.' }); }
};

module.exports = { listVenueFacilities, createVenueFacility, updateVenueFacility, deleteVenueFacility };
