module.exports = {
  name: 'set',
  aliases: ["s"],

  async execute(message, args, client) {

    const {channel, author} = message

    const res = await client.services.anilist.getUserIDFromUsername(args[0])

    client.services.database.createUser(res, author.id)

    channel.send(`TADA!!! Your AniList account ${args[0]} has been registered in the database, to change your account, re-run this command.`)
  }
}