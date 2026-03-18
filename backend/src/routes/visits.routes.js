import express from 'express';
import { requireAuth, requireActiveOfficer } from '../middleware/auth.js';
import { createVisitor, searchVisitors, findDuplicates } from '../services/visitorService.js';
import { createVisit, completeVisit, listActiveVisits, findActiveVisitByVisitor } from '../services/visitService.js';
import { isNonEmptyString } from '../utils/validators.js';
import { ok, fail } from '../utils/response.js';

const router = express.Router();

const CODE_REQUIRED_TYPES = new Set(['BD', 'MS', 'AGG']);
const NO_CODE_TYPES = new Set(['AGENT_MERCHANT']);

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
    const { query, visitor, purpose, person_to_see } = req.body || {};

    if (!isNonEmptyString(purpose) || !isNonEmptyString(person_to_see)) {
      return fail(res, 'Purpose and person to see are required', 400);
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

    const active = await findActiveVisitByVisitor(selectedVisitor.id);
    if (active) {
      return fail(res, 'Visitor is already checked in', 409);
    }

    const visitId = await createVisit({
      visitorId: selectedVisitor.id,
      officerId: req.user.id,
      purpose: purpose.trim(),
      personToSee: person_to_see.trim()
    });

    return ok(res, {
      visit_id: visitId,
      visitor_id: selectedVisitor.id,
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

router.put('/:id/checkout', requireAuth, requireActiveOfficer, async (req, res, next) => {
  try {
    const updated = await completeVisit(req.params.id);
    if (!updated) {
      return fail(res, 'Active visit not found', 404);
    }
    return ok(res, { status: 'COMPLETED' });
  } catch (err) {
    return next(err);
  }
});

export default router;
