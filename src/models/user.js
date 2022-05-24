const { Schema, model } = require('mongoose');

const defType = {type: String, required: true, unique: true}

const schema = new Schema({
  id: defType, // AniList user ID
  discordID: defType, // Discord user ID
  creationDate: {type: Date, default: new Date()}
});

module.exports = model('user', schema);