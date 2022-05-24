const mongoose = require('mongoose')
require('./../models')
const {user} = mongoose.models

/**
 * Mongo Database class
 * @type {Database}
 */
module.exports = class Database {
  constructor() {
    console.log('[DATABASE] Connecting to Database')
    mongoose.connect('mongodb://127.0.0.1:27017/discord-anilist-tracker');
  }

  /**
   * Create user in database
   * @param aniListUserID
   * @param discordUserID
   * @returns {Promise<Query<UpdateResult, any, {}, any>>}
   */
  async createUser(aniListUserID, discordUserID) {
    return user.updateOne({id: aniListUserID, discordID: discordUserID}, {id: aniListUserID, discordID: discordUserID}, {upsert: true})
  }

  /**
   * Get user from database
   * @returns {Promise<Query<Array<HydratedDocument<any, {}, {}>>, any, {}, any>>}
   */
  async getUsers() {
    return user.find()
  }
}