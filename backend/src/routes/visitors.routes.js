import express from 'express';
import { requireAuth, requireActiveOfficer } from '../middleware/auth.js';
import {
  createVisitor,
  updateVisitor,
  findVisitorById,
  searchVisitors,
  listVisitorsPaged,
  findDuplicates
} from '../services/visitorService.js';
import { listVisitorHistory } from '../services/visitService.js';
import { normalizePhone } from '../utils/normalizePhone.js';
import { isNonEmptyString, sanitizeText, isSafeString } from '../utils/validators.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// All visitor data access requires an active officer or admin
router.use(requireAuth, requireActiveOfficer);

const CODE_REQUIRED_TYPES = new Set(['BD', 'MS', 'AGG']);
const NO_CODE_TYPES = new Set(['AGENT_MERCHANT']);
const VISITOR_TYPE_ALIASES = {
  BD: 'BD',
  MS: 'MS',
  MSS: 'MS',
  AGG: 'AGG',
  AGENT_MERCHANT: 'AGENT_MERCHANT',
  AGENTMERCHANT: 'AGENT_MERCHANT',
  MERCHANT: 'AGENT_MERCHANT',
  OTHER: 'AGENT_MERCHANT'
};
const VISITOR_TYPES = new Set(Object.values(VISITOR_TYPE_ALIASES));
const VISITOR_STATUS = new Set(['ACTIVE', 'DELETED', 'ALL']);

function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(query.limit, 10) || 10, 50);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function normalizeVisitorType(value) {
  if (value === null || value === undefined) return '';
  const key = String(value).trim().toUpperCase().replace(/\s+/g, '_');
  return VISITOR_TYPE_ALIASES[key] || '';
}

function validateVisitor(visitor) {
  const fullName = sanitizeText(visitor.full_name);
  const phoneNumber = normalizePhone(visitor.phone_number);
  const visitorType = normalizeVisitorType(visitor.visitor_type);
  const code = sanitizeText(visitor.code);

  if (!isSafeString(fullName, 120) || !phoneNumber || !visitorType) {
    return 'Missing or invalid required visitor fields';
  }

  if (!VISITOR_TYPES.has(visitorType)) {
    return 'Invalid visitor type';
  }

  if (CODE_REQUIRED_TYPES.has(visitorType) && !isSafeString(code, 50)) {
    return 'Code is required for this visitor type';
  }

  if (NO_CODE_TYPES.has(visitorType) && isNonEmptyString(code)) {
    return 'Code must be empty for Agent/Merchant';
  }

  visitor.full_name = fullName;
  visitor.phone_number = phoneNumber;
  visitor.visitor_type = visitorType;
  visitor.code = code || null;

  return null;
}

router.get('/', async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query || {});
    const search = req.query?.search || '';
    const status = req.query?.status || '';
    const typeRaw = req.query?.type || req.query?.visitor_type;
    const visitorType = normalizeVisitorType(typeRaw);

    if (typeRaw && !visitorType) {
      return fail(res, 'Invalid visitor type', 400);
    }

    const normalizedStatus = String(status || '').trim().toUpperCase();
    if (normalizedStatus && !VISITOR_STATUS.has(normalizedStatus)) {
      return fail(res, 'Invalid status', 400);
    }

    const { rows, total } = await listVisitorsPaged({
      search: sanitizeText(search),
      status: normalizedStatus || 'ACTIVE',
      visitorType: visitorType || null,
      limit,
      offset
    });

    return res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const { q } = req.query;
    const results = await searchVisitors(sanitizeText(q), 20);
    return ok(res, results);
  } catch (err) {
    return next(err);
  }
});

router.post('/', async (req, res, next) => {
  const userId = req.user?.id;
  try {
    const visitorData = { ...req.body };
    const error = validateVisitor(visitorData);
    if (error) {
      return fail(res, error, 400);
    }

    const id = await createVisitor({
      fullName: visitorData.full_name,
      phoneNumber: visitorData.phone_number,
      visitorType: visitorData.visitor_type,
      code: visitorData.code
    });

    logger.info('visitors.create_success', { operation: 'CREATE_VISITOR', userId, visitorId: id });
    const visitor = await findVisitorById(id);
    return ok(res, visitor, 201);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return fail(res, 'Visitor code must be unique', 409);
    }
    logger.error('visitors.create_failed', { operation: 'CREATE_VISITOR', userId, error: err.message });
    return next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const userId = req.user?.id;
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return fail(res, 'Invalid visitor id', 400);
    }

    const visitorData = { ...req.body };
    const error = validateVisitor(visitorData);
    if (error) {
      return fail(res, error, 400);
    }

    const updated = await updateVisitor(id, {
      fullName: visitorData.full_name,
      phoneNumber: visitorData.phone_number,
      visitorType: visitorData.visitor_type,
      code: visitorData.code
    });

    if (!updated) {
      return fail(res, 'Visitor not found', 404);
    }

    logger.info('visitors.update_success', { operation: 'UPDATE_VISITOR', userId, visitorId: id });
    const visitor = await findVisitorById(id);
    return ok(res, visitor);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return fail(res, 'Visitor code must be unique', 409);
    }
    logger.error('visitors.update_failed', { operation: 'UPDATE_VISITOR', userId, error: err.message, visitorId: req.params.id });
    return next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const visitor = await findVisitorById(req.params.id);
    if (!visitor) {
      return fail(res, 'Visitor not found', 404);
    }
    return ok(res, visitor);
  } catch (err) {
    return next(err);
  }
});

router.get('/:id/history', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return fail(res, 'Invalid visitor id', 400);
    }

    const history = await listVisitorHistory(id);
    return ok(res, history);
  } catch (err) {
    return next(err);
  }
});

export default router;
