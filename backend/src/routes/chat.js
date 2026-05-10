const express = require('express');
const router = express.Router();
const { authenticate } = require('../controllers/authController');
const { chatController } = require('../controllers/chatController');

router.use(authenticate);
router.get('/conversations', (req, res) => chatController.getConversations(req, res));
router.post('/conversations', (req, res) => chatController.createConversation(req, res));
router.get('/conversations/:conversationId/messages', (req, res) => chatController.getMessages(req, res));
router.post('/conversations/:conversationId/stream', (req, res) => chatController.streamChat(req, res));
router.delete('/conversations/:conversationId', (req, res) => chatController.deleteConversation(req, res));

module.exports = router;
