const mongoose = require('mongoose');
const User = require('../models/User.model');
const bcrypt = require('bcrypt');

mongoose
  .connect('mongodb://localhost/passport-roles')
  .then(x => console.log(`Connected to Mongo! Database name: "${x.connections[0].name}"`))
  .catch(err => console.error('Error connecting to mongo', err));

const bcryptSalt = 10;
const password = '1234';

const salt = bcrypt.genSaltSync(bcryptSalt);
const hasPass = bcrypt.hashSync(password, salt);

const user = {
  username: 'Jef2',
  name: 'Jef2',
  password: hasPass,
  profileImg: 'avatar',
  description: 'boos',
  facebookId: 'idAvatar',
  role: 'BOSS'
}

const newUser = new User(user);

newUser.save();
