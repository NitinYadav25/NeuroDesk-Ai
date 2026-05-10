const express = require('express');
const router = express.Router();
const { authenticate } = require('../controllers/authController');
const { memoryController } = require('../controllers/memoryController');

router.use(authenticate);
router.get('/', (req, res) => memoryController.getMemoryItems(req, res));
router.post('/', (req, res) => memoryController.addMemoryItem(req, res));
router.delete('/:memoryId', (req, res) => memoryController.deleteMemoryItem(req, res));
router.get('/graph', (req, res) => memoryController.getGraphData(req, res));
router.get('/ai-status', (req, res) => memoryController.getAIStatus(req, res));

module.exports = router;
