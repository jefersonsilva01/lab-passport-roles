const express = require('express');
const User = require('../models/User.model');
const Course = require('../models/Course.model');
const bcrypt = require('bcrypt');
const router = express.Router();
const ensureLogin = require('connect-ensure-login');
const passport = require('passport');

const bcryptSalt = 10;

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/login')
  }
}

function checkRoles(role) {
  return function (req, res, next) {
    if (req.isAuthenticated() && req.user.role === role) {
      return next();
    } else {
      res.redirect('/private');
    }
  }
}

const checkBoss = checkRoles('BOSS');
const checkTA = checkRoles('TA');

// add routes here
router.get('/login', (req, res, next) => res.render('auth/login'));

router.get('/private', ensureLogin.ensureLoggedIn(), (req, res) => {
  res.render('private/private', { user: req.user })
});

router.get('/users', ensureAuthenticated, (req, res) => {
  User.find()
    .then(users => {
      const newUser = [];

      users.forEach(element => {
        let el = { ...element._doc }
        if (req.user.role === 'BOSS') el['userRole'] = 'BOSS';
        newUser.push(el);
      });

      res.render('private/users', { newUser });
    })
    .catch(error => {
      res.render('private/create-user', {
        errorMessage: 'Something went wrong'
      });
    });
});

router.get('/user-details/:id', ensureAuthenticated, (req, res) => {
  const id = req.params.id;

  User.findById({ _id: id })
    .then(user => {
      let newUser = { ...user._doc }
      if (id === req.user.id) {
        newUser['userRole'] = 'BOSS';
        res.render('private/user-details', { newUser });
      } else if (req.user.role === 'BOSS') {
        newUser['userRole'] = 'BOSS';
        res.render('private/user-details', { newUser });
      } else {
        res.render('private/user-details', { newUser });
      }
    })
    .catch(error => {
      console.log(error);
    });
});

router.get('/user-edit/:id', ensureAuthenticated, (req, res) => {
  const id = req.params.id;

  User.findById({ _id: id })
    .then(user => {
      let newUser = { ...user._doc };

      if (id === req.user.id) {
        res.render('private/user-edit', { newUser });
      } else {
        if (req.user.role === 'BOSS') newUser['userRole'] = 'BOSS'
        res.render('private/user-edit', { newUser });
      }

    })
    .catch(error => {
      res.render('private/users');
    });
});

router.get('/create-user', checkBoss, (req, res) => {
  res.render('private/create-user', { user: req.user });
});

router.post('/user-edit/:id', ensureAuthenticated, (req, res) => {
  const id = req.params.id;

  let {
    username,
    name,
    password,
    profileImg,
    description,
    facebookId,
    role
  } = req.body

  User.find({ _id: id })
    .then(user => {
      let salt
      let hasPass

      if (password === '') {
        password = user.password
      } else {
        salt = bcrypt.genSaltSync(bcryptSalt);
        hasPass = bcrypt.hashSync(password, salt);
      };

      User.updateOne({ _id: id }, {
        username,
        name,
        password: hasPass,
        profileImg,
        description,
        facebookId,
        role
      })
        .then(() => {
          res.redirect(`/user-details/${id}`)
        })
        .catch(error => {
          console.log(error);
        });
    })
    .catch(error => {
      console.log(error);
    });
});

router.post('/create-user', checkBoss, (req, res) => {
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

router.post('/user/:id/delete', checkBoss, (req, res) => {
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

// Courses routes
router.get('/courses', checkTA, (req, res) => {
  Course.find()
    .then(courses => {
      res.render('private/courses', { courses });
    })
    .catch(error => console.log(error));
})

router.get('/create-course', checkTA, (req, res) => {
  User.find({ $or: [{ role: 'TA' }, { role: 'STUDENT' }] }, { name: 1, _id: 1, role: 1 })
    .then(users => {
      let students = [], TAs = [];

      users.forEach(element => {
        if (element.role === 'STUDENT') students.push(element)
        if (element.role === 'TA') TAs.push(element);
      })

      res.render('private/create-course', { students, TAs });
    })
    .catch(error => console.log(error));
});

router.get('/course-edit/:id', checkTA, (req, res) => {
  const id = req.params.id;
  let students = [], TAs = [];

  User.find(
    { $or: [{ role: 'TA' }, { role: 'STUDENT' }] },
    { name: 1, _id: 1, role: 1 }
  )
    .then(users => {
      users.forEach(element => {
        if (element.role === 'STUDENT') students.push(element)
        if (element.role === 'TA') TAs.push(element);
      })

      Course.findById({ _id: id })
        .populate('leadTeacher')
        .populate('ta')
        .populate('students')
        .then(course => {
          console.log(course);
          res.render('private/course-edit', { course, TAs, students })
        })
        .catch(error => res.redirect('/courses'));
    })
    .catch(error => res.redirect('/courses'));
});

router.post('/create-course', checkTA, (req, res) => {
  const {
    title,
    leadTeacher,
    startDate,
    endDate,
    ta,
    courseImg,
    description,
    status,
    students
  } = req.body

  if (title === '') {
    res.redirect('/create-course');
  }

  Course.findOne({ title })
    .then(course => {
      if (course !== null) {
        res.redirect('/create-course');
        return;
      }

      const newCourse = new Course({
        title,
        leadTeacher,
        startDate,
        endDate,
        ta,
        courseImg,
        description,
        status,
        students
      });

      newCourse.save();
      res.redirect('/courses');
    })
    .catch(error => {
      res.redirect('/create-course');
    });
});

router.post('/course/:id/delete', checkTA, (req, res) => {
  const id = req.params.id;

  Course.findByIdAndRemove({ _id: id })
    .then(() => {
      res.redirect('/courses');
    })
    .catch(error => {
      console.log(error)
      res.redirect('/courses');
    })
})

router.post('/course-edit/:id', checkTA, (req, res) => {
  const id = req.params.id;
  const {
    title,
    leadTeacher,
    startDate,
    endDate,
    ta,
    courseImg,
    description,
    status,
    students
  } = req.body;

  if (title === '') {
    res.redirect(`/course-edit/${id}`)
    return;
  }

  Course.updateOne({ _id: id }, {
    title,
    leadTeacher,
    startDate,
    endDate,
    ta,
    courseImg,
    description,
    status,
    students
  })
    .then(() => {
      res.redirect('/courses')
    })
    .catch(error => res.redirect('/courses'));
});

module.exports = router;
