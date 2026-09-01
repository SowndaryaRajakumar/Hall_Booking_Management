const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const getPagination = (query = {}) => {
  const requestedPage = Number.parseInt(query.page, 10);
  const requestedLimit = Number.parseInt(query.limit, 10);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT) : DEFAULT_LIMIT;
  const page = Number.isFinite(requestedPage) ? Math.max(requestedPage, 1) : 1;
  return { page, limit, offset: (page - 1) * limit };
};

const makePagination = ({ page, limit, total }) => ({
  page,
  limit,
  total: Number(total || 0),
  totalPages: Math.ceil(Number(total || 0) / limit),
});

module.exports = { DEFAULT_LIMIT, MAX_LIMIT, getPagination, makePagination };
