import { Router, Response } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import Material from '../db/Material';

const router = Router();

// GET all saved materials for the logged-in user
router.get('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const materials = await Material.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
});

// POST a new material (after upload + text extraction)
router.post('/', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    const { title, extractedText, fileUrl, fileType } = req.body;
    if (!title || !extractedText) {
      return res.status(400).json({ error: 'title and extractedText are required' });
    }
    const material = await Material.create({
      userId: req.userId,
      title,
      extractedText,
      fileUrl,
      fileType,
    });
    res.json(material);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save material' });
  }
});

// DELETE a saved material
router.delete('/:id', requireAuth, async (req: AuthedRequest, res: Response) => {
  try {
    await Material.deleteOne({ _id: req.params.id, userId: req.userId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete material' });
  }
});

export default router;
