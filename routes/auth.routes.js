const express = require('express');
const User = require('../models/User.model');
const bcrypt = require('bcrypt');
const router = express.Router();
const ensureLogin = require('connect-ensure-login');
const passport = require('passport');

const bcryptSalt = 10;

// add routes here
router.get('/login', (req, res, next) => res.render('auth/login'));

router.get('/private', ensureLogin.ensureLoggedIn(), (req, res) => {
  res.render('private/private', { user: req.user })
});

function checkRoles(role) {
  return function (req, res, next) {
    if (req.isAuthenticated() && req.user.role === role) {
      return next();
    } else {
      res.redirect('/private');
    }
  }
}

const checkAdmin = checkRoles('BOSS');

router.get('/users', checkAdmin, (req, res) => {
  User.find()
    .then(users => {
      res.render('private/users', { users });
    })
    .catch(error => {
      res.render('private/create-user', {
        errorMessage: 'Something went wrong'
      });
    });
})

router.get('/create-user', checkAdmin, (req, res) => {
  res.render('private/create-user', { user: req.user });
});

router.post('/create-user', checkAdmin, (req, res) => {
  const {
    username,
    name,
    password,
    profileImg,
    description,
    facebookId,
    role
  } = req.body

  if (!username || !password) {
    res.render('private/create-user', {
      errorMessage: 'Indicate a username and a password to signup'
    });
    return;
  }

  User.findOne({ username })
    .then(user => {
      if (user !== null) {
        res.render('private/create-user', {
          errorMessage: 'The username already exists!'
        });
        return;
      }

      const salt = bcrypt.genSaltSync(bcryptSalt);
      const hasPass = bcrypt.hashSync(password, salt);

      const newUser = new User({
        username,
        name,
        password: hasPass,
        profileImg,
        description,
        facebookId,
        role
      });

      return newUser.save();
    })
    .then(() => {
      res.redirect('/users');
    })
    .catch(error => {
      res.render('private/create-user', {
        errorMessage: 'Something went wrong'
      });
    });
});

router.post('/user/:id/delete', checkAdmin, (req, res) => {
  const { id } = req.params;

  User.findByIdAndRemove({ _id: id })
    .then(() => {
      res.redirect('/users');
    })
    .catch(error => next(error));
});

router.post('/login',
  passport.authenticate('local', {
    successRedirect: '/private',
    failureRedirect: '/login',
    failureFlash: true,
    passReqToCallback: true
  })
);

module.exports = router;
