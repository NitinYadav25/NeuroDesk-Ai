const express = require('express');
const router = express.Router();
const { authController, authenticate } = require('../controllers/authController');

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/google', (req, res) => authController.googleLogin(req, res));
router.get('/profile', authenticate, (req, res) => authController.getProfile(req, res));

module.exports = router;
