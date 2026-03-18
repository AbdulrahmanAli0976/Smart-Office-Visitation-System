import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createVisitor, searchVisitors, findDuplicates } from '../services/visitorService.js';
import { createVisit, completeVisit, listActiveVisits, findActiveVisitByVisitor } from '../services/visitService.js';
import { isNonEmptyString } from '../utils/validators.js';

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

router.post('/checkin', requireAuth, async (req, res, next) => {
  try {
    const { query, visitor, purpose, person_to_see } = req.body || {};

    if (!isNonEmptyString(purpose) || !isNonEmptyString(person_to_see)) {
      return res.status(400).json({ error: 'Purpose and person to see are required' });
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
        return res.status(400).json({ error });
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
      return res.status(409).json({ error: 'Visitor is already checked in', visit_id: active.id });
    }

    const visitId = await createVisit({
      visitorId: selectedVisitor.id,
      officerId: req.user.id,
      purpose: purpose.trim(),
      personToSee: person_to_see.trim()
    });

    return res.status(201).json({
      visit_id: visitId,
      visitor_id: selectedVisitor.id,
      duplicates
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Visitor code must be unique' });
    }
    return next(err);
  }
});

router.get('/active', requireAuth, async (req, res, next) => {
  try {
    const visits = await listActiveVisits();
    return res.json(visits);
  } catch (err) {
    return next(err);
  }
});

router.put('/:id/checkout', requireAuth, async (req, res, next) => {
  try {
    const updated = await completeVisit(req.params.id);
    if (!updated) {
      return res.status(404).json({ error: 'Active visit not found' });
    }
    return res.json({ status: 'COMPLETED' });
  } catch (err) {
    return next(err);
  }
});

export default router;
