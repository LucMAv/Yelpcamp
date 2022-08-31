const express = require('express');
const router = express.Router();
const passport = require('passport')
const catchAsync = require('../utils/catchAsync')
const User = require('../models/user');
const users = require('../controllers/users')

// Register new user
router.route('/register')
    .get(users.renderRegister)
    .post(catchAsync(users.register));

//Login
router.route('/login')
    .get(users.renderLogin)

// Logout
router.get('/logout', users.logout)

module.exports = router;