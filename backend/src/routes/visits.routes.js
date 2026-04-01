import express from 'express';
import { requireAuth, requireActiveOfficer } from '../middleware/auth.js';
import { createVisitor, searchVisitors, findDuplicates, findVisitorByPhone } from '../services/visitorService.js';
import { bulkCheckIn, bulkCheckOut, createVisitAtomic, completeVisit, listActiveVisits, listVisitHistory, listVisitHistoryPaged } from '../services/visitService.js';
import { normalizePhone } from '../utils/normalizePhone.js';
import { isNonEmptyString, sanitizeText, isSafeString } from '../utils/validators.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// All visit routes require an active officer or admin
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

const VISIT_STATUS = new Set(['ACTIVE', 'COMPLETED']);

function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(query.limit, 10) || 10, 50);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function isValidDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeVisitorType(value) {
  if (value === null || value === undefined) return '';
  const key = String(value).trim().toUpperCase().replace(/\s+/g, '_');
  return VISITOR_TYPE_ALIASES[key] || '';
}

function validateVisitorInput(visitor) {
  if (!visitor) return 'Visitor data is required';
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
    return 'Valid code is required for this visitor type';
  }

  if (NO_CODE_TYPES.has(visitorType) && isNonEmptyString(code)) {
    return 'Code must be empty for Agent/Merchant';
  }

  // Update object with sanitized values
  visitor.full_name = fullName;
  visitor.phone_number = phoneNumber;
  visitor.visitor_type = visitorType;
  visitor.code = code || null;

  return null;
}

router.post('/checkin', async (req, res, next) => {
  const userId = req.user?.id;
  try {
    const body = req.body || {};
    const { query, visitor, purpose, person_to_see } = body;

    const sanitizedPurpose = sanitizeText(purpose);
    const sanitizedPerson = sanitizeText(person_to_see);

    if (!isSafeString(sanitizedPurpose, 255) || !isSafeString(sanitizedPerson, 120)) {
      return fail(res, 'Purpose and person to see are required and must be within limits', 400);
    }

    let selectedVisitor = null;
    if (isNonEmptyString(query)) {
      const results = await searchVisitors(sanitizeText(query), 5);
      if (results.length > 0) {
        selectedVisitor = results[0];
      }
    }

    if (!selectedVisitor && visitor) {
      const error = validateVisitorInput(visitor);
      if (error) {
        logger.warn('visits.checkin_invalid_payload', { operation: 'CHECKIN', userId, error, visitor });
        return fail(res, error, 400);
      }
      
      const phone = visitor.phone_number;
      const existing = await findVisitorByPhone(phone);
      if (existing) {
        selectedVisitor = existing;
        logger.info('visits.checkin_reuse_visitor', { operation: 'CHECKIN', userId, visitorId: existing.id, phone });
      }
    }

    let duplicates = [];
    if (!selectedVisitor) {
      // validateVisitorInput already called above if !selectedVisitor && visitor
      duplicates = await findDuplicates({
        fullName: visitor.full_name,
        phoneNumber: visitor.phone_number
      });

      try {
        const visitorId = await createVisitor({
          fullName: visitor.full_name,
          phoneNumber: visitor.phone_number,
          visitorType: visitor.visitor_type,
          code: visitor.code
        });
        selectedVisitor = { id: visitorId };
        logger.info('visits.checkin_new_visitor', { operation: 'CHECKIN', userId, visitorId, fullName: visitor.full_name });
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          selectedVisitor = await findVisitorByPhone(visitor.phone_number);
          logger.info('visits.checkin_concurrent_visitor_recovery', { operation: 'CHECKIN', userId, visitorId: selectedVisitor?.id });
        } else { throw err; }
      }
    }

    const visitorId = parseInt(selectedVisitor?.id, 10);
    if (!Number.isInteger(visitorId)) {
      logger.warn('visits.checkin_invalid_visitor', { operation: 'CHECKIN', userId, visitorId: selectedVisitor?.id });
      return fail(res, 'Invalid visitor id', 400);
    }

    const officerId = parseInt(userId, 10);
    const result = await createVisitAtomic({
      visitorId,
      officerId,
      purpose: sanitizedPurpose,
      personToSee: sanitizedPerson
    });

    if (result.error) {
      return fail(res, result.error, 400);
    }

    if (result.conflict) {
      logger.info('visits.checkin_conflict', { operation: 'CHECKIN', userId, visitorId, visitId: result.visitId });
      return fail(res, 'Visitor already checked in', 409);
    }

    logger.info('visits.checkin_success', { operation: 'CHECKIN', userId, visitId: result.visitId, visitorId });

    return ok(res, {
      visit_id: result.visitId,
      visitor_id: visitorId,
      duplicates
    }, 201);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return fail(res, 'Visitor code must be unique', 409);
    }
    logger.error('visits.checkin_failed', { operation: 'CHECKIN', userId, error: err.message });
    return next(err);
  }
});


router.post('/bulk-checkin', async (req, res, next) => {
  const userId = req.user?.id;
  try {
    const body = req.body || {};
    const visitors = Array.isArray(body.visitors) ? body.visitors : null;
    if (!visitors || visitors.length === 0) {
      logger.warn('visits.bulk_checkin_invalid_payload', { operation: 'BULK_CHECKIN', userId, reason: 'empty_visitors' });
      return fail(res, 'Visitors array is required', 400);
    }
    if (visitors.length > 150) {
      logger.warn('visits.bulk_checkin_invalid_payload', { operation: 'BULK_CHECKIN', userId, reason: 'too_many_visitors', count: visitors.length });
      return fail(res, 'Maximum 150 visitors per request', 400);
    }

    const officerId = parseInt(userId, 10);
    const purpose = sanitizeText(body.purpose || 'Bulk check-in');
    const personToSee = sanitizeText(body.person_to_see || 'Bulk check-in');

    const normalized = [];
    let invalidCount = 0;

    visitors.forEach((entry, index) => {
      const visitor = {
        full_name: entry?.full_name ?? entry?.fullName,
        phone_number: entry?.phone ?? entry?.phone_number,
        visitor_type: entry?.type ?? entry?.visitor_type,
        code: entry?.code ?? ''
      };

      const error = validateVisitorInput(visitor);
      if (error) {
        invalidCount += 1;
        logger.warn('visits.bulk_checkin_invalid_row', { operation: 'BULK_CHECKIN', userId, index, reason: error });
        return;
      }

      normalized.push(visitor);
    });

    if (!normalized.length) {
      logger.warn('visits.bulk_checkin_invalid_payload', { operation: 'BULK_CHECKIN', userId, reason: 'no_valid_visitors' });
      return fail(res, 'No valid visitors to process', 400);
    }

    logger.info('visits.bulk_checkin_request', {
      operation: 'BULK_CHECKIN',
      userId,
      count: visitors.length,
      valid: normalized.length,
      invalid: invalidCount
    });

    const summary = await bulkCheckIn({
      officerId,
      visitors: normalized,
      purpose,
      personToSee
    });

    if (summary.conflict) {
      return fail(res, 'Visitor already checked in', 409);
    }

    const failed = summary.failed + invalidCount;

    logger.info('visits.bulk_checkin_success', {
      operation: 'BULK_CHECKIN',
      userId,
      created: summary.created,
      reused: summary.reused,
      failed
    });

    return res.json({
      success: true,
      created: summary.created,
      reused: summary.reused,
      failed
    });
  } catch (err) {
    logger.error('visits.bulk_checkin_failed', { operation: 'BULK_CHECKIN', userId, error: err.message });
    return next(err);
  }
});

router.post('/bulk-checkout', async (req, res, next) => {
  const userId = req.user?.id;
  try {
    const visitIds = Array.isArray(req.body?.visitIds) ? req.body.visitIds : null;
    if (!visitIds || visitIds.length === 0) {
      logger.warn('visits.bulk_checkout_invalid_payload', { operation: 'BULK_CHECKOUT', userId, reason: 'empty_visitIds' });
      return fail(res, 'visitIds array is required', 400);
    }
    if (visitIds.length > 150) {
      logger.warn('visits.bulk_checkout_invalid_payload', { operation: 'BULK_CHECKOUT', userId, reason: 'too_many_visitIds', count: visitIds.length });
      return fail(res, 'Maximum 150 visits per request', 400);
    }

    const parsed = visitIds.map((id) => parseInt(id, 10));
    if (parsed.some((id) => !Number.isInteger(id))) {
      logger.warn('visits.bulk_checkout_invalid_ids', { operation: 'BULK_CHECKOUT', userId, visitIds });
      return fail(res, 'All visit IDs must be integers', 400);
    }

    const unique = Array.from(new Set(parsed));

    logger.info('visits.bulk_checkout_request', { operation: 'BULK_CHECKOUT', userId, count: unique.length });

    const updated = await bulkCheckOut({ visitIds: unique });
    const failed = unique.length - updated;

    logger.info('visits.bulk_checkout_success', { operation: 'BULK_CHECKOUT', userId, updated, failed });

    return res.json({
      success: true,
      updated,
      failed,
      total: unique.length
    });
  } catch (err) {
    logger.error('visits.bulk_checkout_failed', { operation: 'BULK_CHECKOUT', userId, error: err.message });
    return next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { officer_id } = req.query || {};
    const from = req.query?.date_from || req.query?.from;
    const to = req.query?.date_to || req.query?.to;
    const search = req.query?.search || '';
    const status = req.query?.status || '';
    const typeRaw = req.query?.type || req.query?.visitor_type;
    const visitorType = normalizeVisitorType(typeRaw);

    if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
      return fail(res, 'Invalid date format. Use YYYY-MM-DD.', 400);
    }

    if (typeRaw && !visitorType) {
      return fail(res, 'Invalid visitor type', 400);
    }

    const normalizedStatus = String(status || '').trim().toUpperCase();
    if (normalizedStatus && !VISIT_STATUS.has(normalizedStatus)) {
      return fail(res, 'Invalid status', 400);
    }

    let officerId = null;
    if (officer_id) {
      officerId = parseInt(officer_id, 10);
      if (!Number.isInteger(officerId)) {
        return fail(res, 'Invalid officer id', 400);
      }
    }

    const { page, limit, offset } = parsePagination(req.query || {});
    const { rows, total } = await listVisitHistoryPaged({
      from,
      to,
      visitorType: visitorType || null,
      officerId,
      status: normalizedStatus || null,
      search: sanitizeText(search),
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
      },
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    return next(err);
  }
});


router.get('/active', async (req, res, next) => {
  try {
    const visits = await listActiveVisits();
    return ok(res, visits);
  } catch (err) {
    return next(err);
  }
});

router.get('/history', async (req, res, next) => {
  try {
    const { officer_id } = req.query || {};
    const from = req.query?.date_from || req.query?.from;
    const to = req.query?.date_to || req.query?.to;
    const search = req.query?.search || '';
    const status = req.query?.status || '';
    const typeRaw = req.query?.type || req.query?.visitor_type;
    const visitorType = normalizeVisitorType(typeRaw);

    if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
      return fail(res, 'Invalid date format. Use YYYY-MM-DD.', 400);
    }

    if (typeRaw && !visitorType) {
      return fail(res, 'Invalid visitor type', 400);
    }

    const normalizedStatus = String(status || '').trim().toUpperCase();
    if (normalizedStatus && !VISIT_STATUS.has(normalizedStatus)) {
      return fail(res, 'Invalid status', 400);
    }

    let officerId = null;
    if (officer_id) {
      officerId = parseInt(officer_id, 10);
      if (!Number.isInteger(officerId)) {
        return fail(res, 'Invalid officer id', 400);
      }
    }

    const { page, limit, offset } = parsePagination(req.query || {});
    const { rows, total } = await listVisitHistoryPaged({
      from,
      to,
      visitorType: visitorType || null,
      officerId,
      status: normalizedStatus || null,
      search: sanitizeText(search),
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
      },
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/export', async (req, res, next) => {
  try {
    const { from, to, visitor_type, officer_id, format } = req.query || {};

    if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
      return fail(res, 'Invalid date format. Use YYYY-MM-DD.', 400);
    }

    if (visitor_type && !VISITOR_TYPES.has(visitor_type)) {
      return fail(res, 'Invalid visitor type', 400);
    }

    let officerId = null;
    if (officer_id) {
      officerId = parseInt(officer_id, 10);
      if (!Number.isInteger(officerId)) {
        return fail(res, 'Invalid officer id', 400);
      }
    }

    const history = await listVisitHistory({
      from,
      to,
      visitorType: visitor_type || null,
      officerId
    });

    const columns = [
      'visit_id',
      'status',
      'time_in',
      'time_out',
      'purpose',
      'person_to_see',
      'visitor_id',
      'visitor_name',
      'visitor_phone',
      'visitor_type',
      'visitor_code',
      'officer_id',
      'officer_name'
    ];

    const escapeCsv = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = history.map((row) => [
      row.visit_id,
      row.status,
      row.time_in,
      row.time_out,
      row.purpose,
      row.person_to_see,
      row.visitor_id,
      row.full_name,
      row.phone_number,
      row.visitor_type,
      row.code,
      row.officer_id,
      row.officer_name
    ]);

    const csv = [columns.join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\n');

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="visits_export.csv"');
      return res.status(200).send(csv);
    }

    return ok(res, { csv });
  } catch (err) {
    return next(err);
  }
});

router.put('/:id/checkout', async (req, res, next) => {
  const userId = req.user?.id;
  try {
    const rawId = req.params?.id;
    logger.info('visits.checkout_request', { operation: 'CHECKOUT', userId, id: rawId });

    const visitId = parseInt(rawId, 10);
    if (!Number.isInteger(visitId)) {
      logger.warn('visits.checkout_invalid_id', { operation: 'CHECKOUT', userId, id: rawId });
      return fail(res, 'Invalid visit id', 400);
    }

    const updated = await completeVisit(visitId);
    if (!updated) {
      logger.warn('visits.checkout_not_found', { operation: 'CHECKOUT', userId, visitId });
      return fail(res, 'Active visit not found', 404);
    }

    logger.info('visits.checkout_success', { operation: 'CHECKOUT', userId, visitId });
    return ok(res, { status: 'COMPLETED' });
  } catch (err) {
    logger.error('visits.checkout_failed', { operation: 'CHECKOUT', userId, error: err.message, id: req.params?.id });
    return next(err);
  }
});

export default router;



