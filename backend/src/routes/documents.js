const express = require('express');
const router = express.Router();
const { authenticate } = require('../controllers/authController');
const { documentController } = require('../controllers/documentController');

router.use(authenticate);
router.get('/', (req, res) => documentController.getDocuments(req, res));
router.post('/upload', documentController.getUploadMiddleware(), (req, res) => documentController.uploadDocument(req, res));
router.delete('/:documentId', (req, res) => documentController.deleteDocument(req, res));
router.get('/:documentId/status', (req, res) => documentController.getDocumentStatus(req, res));

module.exports = router;
