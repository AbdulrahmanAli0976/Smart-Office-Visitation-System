import express from 'express';
import { requireAuth, requireActiveOfficer } from '../middleware/auth.js';
import { createVisitor, searchVisitors, findDuplicates } from '../services/visitorService.js';
import { bulkCheckIn, bulkCheckOut, createVisitAtomic, completeVisit, listActiveVisits, listVisitHistory, listVisitHistoryPaged } from '../services/visitService.js';
import { isNonEmptyString } from '../utils/validators.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

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
  const { full_name, phone_number, visitor_type, code } = visitor;

  if (!isNonEmptyString(full_name) || !isNonEmptyString(phone_number) || !isNonEmptyString(visitor_type)) {
    return 'Missing required visitor fields';
  }

  if (!VISITOR_TYPES.has(visitor_type)) {
    return 'Invalid visitor type';
  }

  if (CODE_REQUIRED_TYPES.has(visitor_type) && !isNonEmptyString(code)) {
    return 'Code is required for this visitor type';
  }

  if (NO_CODE_TYPES.has(visitor_type) && isNonEmptyString(code)) {
    return 'Code must be empty for Agent/Merchant';
  }

  return null;
}

router.post('/checkin', requireAuth, requireActiveOfficer, async (req, res, next) => {
  try {
    const body = req.body || {};
    const { query, visitor, purpose, person_to_see } = body;

    if (!isNonEmptyString(purpose) || !isNonEmptyString(person_to_see)) {
      return fail(res, 'Purpose and person to see are required', 400);
    }

    const hasQuery = Object.prototype.hasOwnProperty.call(body, 'query');
    if (hasQuery && (query === null || query === undefined)) {
      logger.warn('visits.checkin_invalid_query', { query });
      return fail(res, 'Query cannot be null', 400);
    }
    if (hasQuery && query !== null && query !== undefined && typeof query !== 'string') {
      logger.warn('visits.checkin_invalid_query', { query });
      return fail(res, 'Query must be a string', 400);
    }

    let selectedVisitor = null;
    if (isNonEmptyString(query)) {
      const results = await searchVisitors(query, 5);
      if (results.length > 0) {
        selectedVisitor = results[0];
      }
    }

    if (!selectedVisitor && visitor) {
      const phone = normalizePhone(visitor.phone_number);
      const results = await searchVisitors(phone, 1);
      if (results.length > 0) {
        selectedVisitor = results[0];
        logger.info('visits.checkin_reuse_visitor', { visitorId: selectedVisitor.id, phone });
      }
    }

    let duplicates = [];
    if (!selectedVisitor) {
      const error = validateVisitorInput(visitor);
      if (error) {
        logger.warn('visits.checkin_invalid_payload', { error, visitor });
        return fail(res, error, 400);
      }

      duplicates = await findDuplicates({
        fullName: visitor.full_name.trim(),
        phoneNumber: visitor.phone_number
      });

      const visitorId = await createVisitor({
        fullName: visitor.full_name.trim(),
        phoneNumber: visitor.phone_number,
        visitorType: visitor.visitor_type,
        code: visitor.code
      });

      selectedVisitor = { id: visitorId };
      logger.info('visits.checkin_new_visitor', { visitorId, fullName: visitor.full_name });
    }

    const visitorId = parseInt(selectedVisitor?.id, 10);
    if (!Number.isInteger(visitorId)) {
      logger.warn('visits.checkin_invalid_visitor', { visitorId: selectedVisitor?.id });
      return fail(res, 'Invalid visitor id', 400);
    }

    const officerId = parseInt(req.user?.id, 10);
    if (!Number.isInteger(officerId)) {
      logger.warn('visits.checkin_invalid_officer', { officerId: req.user?.id });
      return fail(res, 'Invalid officer id', 400);
    }

    const result = await createVisitAtomic({
      visitorId,
      officerId,
      purpose: purpose.trim(),
      personToSee: person_to_see.trim()
    });

    if (result.conflict) {
      return fail(res, 'Visitor is already checked in', 409);
    }

    logger.info('visits.checkin_success', { visitId: result.visitId, visitorId, officerId });

    return ok(res, {
      visit_id: result.visitId,
      visitor_id: visitorId,
      duplicates
    }, 201);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return fail(res, 'Visitor code must be unique', 409);
    }
    return next(err);
  }
});


router.post('/bulk-checkin', requireAuth, requireActiveOfficer, async (req, res, next) => {
  try {
    const body = req.body || {};
    const visitors = Array.isArray(body.visitors) ? body.visitors : null;
    if (!visitors || visitors.length === 0) {
      logger.warn('visits.bulk_checkin_invalid_payload', { reason: 'empty_visitors' });
      return fail(res, 'Visitors array is required', 400);
    }
    if (visitors.length > 150) {
      logger.warn('visits.bulk_checkin_invalid_payload', { reason: 'too_many_visitors', count: visitors.length });
      return fail(res, 'Maximum 150 visitors per request', 400);
    }

    const officerId = parseInt(req.user?.id, 10);
    if (!Number.isInteger(officerId)) {
      logger.warn('visits.bulk_checkin_invalid_officer', { officerId: req.user?.id });
      return fail(res, 'Invalid officer id', 400);
    }

    const purpose = isNonEmptyString(body.purpose) ? body.purpose.trim() : 'Bulk check-in';
    const personToSee = isNonEmptyString(body.person_to_see) ? body.person_to_see.trim() : 'Bulk check-in';

    const normalized = [];
    let invalidCount = 0;

    visitors.forEach((entry, index) => {
      const fullName = entry?.full_name ?? entry?.fullName;
      const phone = entry?.phone ?? entry?.phone_number;
      const typeRaw = entry?.type ?? entry?.visitor_type;
      const visitorType = normalizeVisitorType(typeRaw);
      const code = entry?.code ?? '';

      if (!isNonEmptyString(fullName) || !isNonEmptyString(phone) || !visitorType) {
        invalidCount += 1;
        logger.warn('visits.bulk_checkin_invalid_row', { index, reason: 'missing_fields', full_name: fullName, phone, type: typeRaw });
        return;
      }

      if (CODE_REQUIRED_TYPES.has(visitorType) && !isNonEmptyString(code)) {
        invalidCount += 1;
        logger.warn('visits.bulk_checkin_invalid_row', { index, reason: 'code_required', full_name: fullName, phone, type: visitorType });
        return;
      }

      if (NO_CODE_TYPES.has(visitorType) && isNonEmptyString(code)) {
        invalidCount += 1;
        logger.warn('visits.bulk_checkin_invalid_row', { index, reason: 'code_not_allowed', full_name: fullName, phone, type: visitorType });
        return;
      }

      normalized.push({
        full_name: fullName.trim(),
        phone_number: String(phone).trim(),
        visitor_type: visitorType,
        code: isNonEmptyString(code) ? String(code).trim() : null
      });
    });

    if (!normalized.length) {
      logger.warn('visits.bulk_checkin_invalid_payload', { reason: 'no_valid_visitors' });
      return fail(res, 'No valid visitors to process', 400);
    }

    logger.info('visits.bulk_checkin_request', {
      userId: officerId,
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

    const failed = summary.failed + invalidCount;

    logger.info('visits.bulk_checkin_success', {
      userId: officerId,
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
    logger.error('visits.bulk_checkin_failed', { error: err.message, userId: req.user?.id });
    return next(err);
  }
});

router.post('/bulk-checkout', requireAuth, requireActiveOfficer, async (req, res, next) => {
  try {
    const visitIds = Array.isArray(req.body?.visitIds) ? req.body.visitIds : null;
    if (!visitIds || visitIds.length === 0) {
      logger.warn('visits.bulk_checkout_invalid_payload', { reason: 'empty_visitIds' });
      return fail(res, 'visitIds array is required', 400);
    }
    if (visitIds.length > 150) {
      logger.warn('visits.bulk_checkout_invalid_payload', { reason: 'too_many_visitIds', count: visitIds.length });
      return fail(res, 'Maximum 150 visits per request', 400);
    }

    const parsed = visitIds.map((id) => parseInt(id, 10));
    if (parsed.some((id) => !Number.isInteger(id))) {
      logger.warn('visits.bulk_checkout_invalid_ids', { visitIds });
      return fail(res, 'All visit IDs must be integers', 400);
    }

    const unique = Array.from(new Set(parsed));

    logger.info('visits.bulk_checkout_request', { userId: req.user?.id, count: unique.length });

    const updated = await bulkCheckOut({ visitIds: unique });
    const failed = unique.length - updated;

    logger.info('visits.bulk_checkout_success', { userId: req.user?.id, updated, failed });

    return res.json({
      success: true,
      updated,
      failed,
      total: unique.length
    });
  } catch (err) {
    logger.error('visits.bulk_checkout_failed', { error: err.message, userId: req.user?.id });
    return next(err);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
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
      search,
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


router.get('/active', requireAuth, async (req, res, next) => {
  try {
    const visits = await listActiveVisits();
    return ok(res, visits);
  } catch (err) {
    return next(err);
  }
});

router.get('/history', requireAuth, async (req, res, next) => {
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
      search,
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

router.get('/export', requireAuth, async (req, res, next) => {
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

router.put('/:id/checkout', requireAuth, requireActiveOfficer, async (req, res, next) => {
  try {
    const rawId = req.params?.id;
    logger.info('visits.checkout_request', { id: rawId, userId: req.user?.id });

    const visitId = parseInt(rawId, 10);
    if (!Number.isInteger(visitId)) {
      logger.warn('visits.checkout_invalid_id', { id: rawId });
      return fail(res, 'Invalid visit id', 400);
    }

    const updated = await completeVisit(visitId);
    if (!updated) {
      return fail(res, 'Active visit not found', 404);
    }

    logger.info('visits.checkout_success', { visitId, userId: req.user?.id });
    return ok(res, { status: 'COMPLETED' });
  } catch (err) {
    logger.error('visits.checkout_failed', { error: err.message, id: req.params?.id });
    return next(err);
  }
});

export default router;
