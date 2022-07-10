const fetch = require('node-fetch')
const config = require('./../../config.json')
const ms = require('ms')
const apiQueries = require('./../apiQueries')
const redis = require('./Redis')


/**
 * AniList API service
 * @type {AniList}
 */
module.exports = class AniList {
  constructor(client, database) {
    setInterval(async () => {
      const users = await database.getUsers()

      users.map(async user => {
        const watchActivity = await this.getUserWatchActivity(user.id)

        const processedActivity = await this.processWatchActivity(user.id, watchActivity.activities)

        if (!processedActivity[0]) return

        client.channels.cache.get(config.discord.activity_channel_id).send({embeds: processedActivity})
      })

    }, ms(config.anilist.activityFetchInterval))
  }


  /**
   * Send post request to anilist API
   * @param body
   * @returns {Promise<*|Promise<Response>>}
   */
  async makeRequest(body) {
    return fetch(config.anilist.api_url, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: body
    })
  }

  /**
   * Get userID from AniList IP with AniList username
   * @param username
   * @returns {Promise<* | Promise<Response>>}
   */
  getUserIDFromUsername(username) {
    return this.makeRequest(JSON.stringify({
      query: apiQueries.getUserIDFromUsername(username),
    })).then(async res => {
      if (res.ok) {
        const d = await res.json()
        return d.data.User.id
      } else {
        console.error(res)
        console.error('Failed to fetch ID from username')
        return false
      }
    })
  }

  /**
   * Get AniList user's watch activity
   * @param userID
   * @returns {Promise<* | Promise<Response>>}
   */
  async getUserWatchActivity(userID) {
    return this.makeRequest(JSON.stringify({
      query: apiQueries.getUserWatchHistory(userID),
    })).then(async res => {
      if (res.ok) {
        const d = await res.json()
        return d.data.Page
      } else {
        console.error(res)
        console.error("Failed to fetch user activity history")
        return false
      }
    })
  }

  /**
   * Cache data into redis
   * @param redisData
   * @returns {Promise<void>}
   */
  async cacheData(redisData) {
    redisData = redisData.slice(0, 9)

    redisData = JSON.stringify(redisData)

    await redis.set(config.redis.activities_key, redisData, "PX", ms("1 hour"))
  }

  /**
   * Process watch history
   * @param userID
   * @param activities
   */
  async processWatchActivity(userID, activities) {
    const embedsToSend = []
    let redisData = await redis.get(config.redis.activities_key)

    if (typeof redisData == "string") {
      redisData = JSON.parse(redisData)
    }
    else redisData = []

    const d = new Date();
    d.setSeconds(d.getSeconds() - 120);

    return Promise.all(activities.map(async activity => {
      if (new Date(activity.createdAt * 1000) < d) return;

      if (redisData.includes(activity.id)) return;

      const user = activity.user

      const media = activity.media

      const embed = {
        color: config.anilist.colors[user?.options?.profileColor] || user?.options?.profileColor || config.anilist.colors.default_blue,
        author: {
          name: `${user.name} ${activity.status}`,
          icon_url: user.avatar.large
        },
        title: `${media.title.english}`,
        description: ` ${media.title.romaji}`,
        thumbnail: {
          url: media.coverImage.large
        },
        footer: {
          text: activity.id
        },
        fields: []
      }

      if (activity.progress) {
        embed.fields.push({
          name: `Progress`,
          value: `${activity.progress} / ${media.episodes || media.chapters || "Unknown"}`
        })
      }

      embedsToSend.push(embed)

      redisData.unshift(activity.id)

    })).then(async () => {
      await this.cacheData(redisData)

      return embedsToSend
    })
  }
}