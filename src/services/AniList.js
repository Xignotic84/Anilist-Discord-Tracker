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

        if (!watchActivity?.activities[0]) return

        let processedActivity = await this.processWatchActivity(watchActivity.activities)

        if (!processedActivity || !processedActivity[0]) return

        if (processedActivity.length > 10) {
          processedActivity = processedActivity.slice(0, 10)
        }

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

    await redis.set(config.redis.activities_key, redisData, "PX", ms("30 minutes"))
  }

  /**
   * Fetch watch activity keys from Redis
   * @returns {Promise<awaited ResultTypes<string, Context>[Context["type"]]|*[]>}
   */
  async fetchData() {
    let redisData

    redisData = await redis.get(config.redis.activiity_key)

    if (typeof redisData == "string") {
      redisData = JSON.parse(redisData)
    }

    return redisData || []
  }



  /**
   * Process watch history
   * @param activities
   */
  async processWatchActivity(activities) {
    const embedsToSend = []
    let redisData = await this.fetchData()

    const d = new Date();
    d.setSeconds(d.getSeconds() - 120);

    const activeActivities = activities.filter(a => !(new Date(a.createdAt * 1000) < d) && !redisData.includes(a.id))

    if (!activeActivities[0]) return


    return Promise.all(activeActivities.map(async activity => {
      if (!activity.id) return

      redisData.unshift(activity.id)

      const user = activity.user

      if (!user) return

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
        fields: []
      }

      const progress = (media.episodes || media.chapters) ? `/ ${media.episodes || media.chapters}` : ''

      if (activity.progress) {
        embed.fields.push({
          name: `Progress`,
          value: `${activity.progress} ${progress}`
        })
      }

      embedsToSend.push(embed)

    })).then(async () => {
      await this.cacheData(redisData)

      return embedsToSend
    })
  }
}