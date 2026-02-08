const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/', verifyToken, requireRole(['Admin']), userController.getUsers);
router.post('/', verifyToken, requireRole(['Admin']), userController.createUser);
router.delete('/:id', verifyToken, requireRole(['Admin']), userController.deleteUser);
router.get('/roles', verifyToken, requireRole(['Admin']), userController.getRoles);

module.exports = router;
