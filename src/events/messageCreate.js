const config = require('./../../config.json')
exports.run = async (client, message) => {
  const {channel, author} = message
  if (channel.type !== 'GUILD_TEXT') return

  if (author.bot) return;

  const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|${config.discord.prefix.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(\\s)*`, 'i');

  if (!prefixRegex.test(message.content.toLowerCase())) return;

  const [, matchedPrefix] = message.content.match(prefixRegex);

  const args = message.content.slice(matchedPrefix.length).trim().split(/ +/g);

  const command = args.shift().toLowerCase();

  const foundCommand = client.commands.get(command) || client.commands.find(c => c.aliases && c.aliases.includes(command));

  try {
    foundCommand.execute(message, args, client);
  } catch (error) {
    console.error(error);
  }
}