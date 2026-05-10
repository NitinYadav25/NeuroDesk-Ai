const express = require('express');
const router = express.Router();
const { authenticate } = require('../controllers/authController');
const { notesController } = require('../controllers/notesController');

router.use(authenticate);
router.get('/', (req, res) => notesController.getNotes(req, res));
router.post('/', (req, res) => notesController.createNote(req, res));
router.put('/:noteId', (req, res) => notesController.updateNote(req, res));
router.delete('/:noteId', (req, res) => notesController.deleteNote(req, res));
router.post('/generate', (req, res) => notesController.generateAINote(req, res));

module.exports = router;
