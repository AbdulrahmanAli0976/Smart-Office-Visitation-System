import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createVisitor,
  updateVisitor,
  findVisitorById,
  searchVisitors,
  findDuplicates
} from '../services/visitorService.js';
import { isNonEmptyString } from '../utils/validators.js';

const router = express.Router();

const CODE_REQUIRED_TYPES = new Set(['BD', 'MS', 'AGG']);
const NO_CODE_TYPES = new Set(['AGENT_MERCHANT']);

function validateVisitor({ full_name, phone_number, visitor_type, code }) {
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

router.get('/search', requireAuth, async (req, res, next) => {
  try {
    const { q } = req.query;
    const results = await searchVisitors(q, 20);
    return res.json(results);
  } catch (err) {
    return next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { full_name, phone_number, visitor_type, code } = req.body || {};
    const error = validateVisitor({ full_name, phone_number, visitor_type, code });
    if (error) {
      return res.status(400).json({ error });
    }

    const duplicates = await findDuplicates({
      fullName: full_name.trim(),
      phoneNumber: phone_number
    });

    const id = await createVisitor({
      fullName: full_name.trim(),
      phoneNumber: phone_number,
      visitorType: visitor_type,
      code: code
    });

    const visitor = await findVisitorById(id);
    return res.status(201).json({ visitor, duplicates });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Visitor code must be unique' });
    }
    return next(err);
  }
});

router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid visitor id' });
    }

    const { full_name, phone_number, visitor_type, code } = req.body || {};
    const error = validateVisitor({ full_name, phone_number, visitor_type, code });
    if (error) {
      return res.status(400).json({ error });
    }

    const duplicates = await findDuplicates({
      fullName: full_name.trim(),
      phoneNumber: phone_number,
      excludeId: id
    });

    const updated = await updateVisitor(id, {
      fullName: full_name.trim(),
      phoneNumber: phone_number,
      visitorType: visitor_type,
      code: code
    });

    if (!updated) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    const visitor = await findVisitorById(id);
    return res.json({ visitor, duplicates });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Visitor code must be unique' });
    }
    return next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const visitor = await findVisitorById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }
    return res.json(visitor);
  } catch (err) {
    return next(err);
  }
});

export default router;
