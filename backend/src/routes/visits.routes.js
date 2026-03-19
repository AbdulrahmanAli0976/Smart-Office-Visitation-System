import express from 'express';
import { requireAuth, requireActiveOfficer } from '../middleware/auth.js';
import { createVisitor, searchVisitors, findDuplicates } from '../services/visitorService.js';
import { createVisitAtomic, completeVisit, listActiveVisits, listVisitHistory } from '../services/visitService.js';
import { isNonEmptyString } from '../utils/validators.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

const CODE_REQUIRED_TYPES = new Set(['BD', 'MS', 'AGG']);
const NO_CODE_TYPES = new Set(['AGENT_MERCHANT']);
const VISITOR_TYPES = new Set(['BD', 'MS', 'AGG', 'AGENT_MERCHANT']);

function isValidDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validateVisitorInput(visitor) {
  if (!visitor) return 'Visitor data is required';
  const { full_name, phone_number, visitor_type, code } = visitor;

  if (!isNonEmptyString(full_name) || !isNonEmptyString(phone_number) || !isNonEmptyString(visitor_type)) {
    return 'Missing required visitor fields';
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

    let duplicates = [];
    if (!selectedVisitor) {
      const error = validateVisitorInput(visitor);
      if (error) {
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
    const { from, to, visitor_type, officer_id } = req.query || {};

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

    return ok(res, history);
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
    return ok(res, { status: 'COMPLETED' });
  } catch (err) {
    return next(err);
  }
});

export default router;
