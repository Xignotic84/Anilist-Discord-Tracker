const Discord = require('discord.js')
const config = require('./../config.json')
const AniList = require('./services/AniList')
const Database = require('./services/Database')
const fs = require('fs');

const client = new Discord.Client({intents: ["GUILD_MESSAGES", "GUILD_MEMBERS", "GUILDS"]})
client.login(config.discord.client_token)

const database = new Database()
const anilist = new AniList(client, database)

client.services = {database, anilist}

client.commands = new Discord.Collection();
client.events = new Discord.Collection();


const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

fs.readdir("./events/", (err, files) => {
  if (err) return console.error(err);
  files.forEach(file => {
    let event = require(`./events/${file}`);
    let eventStart = event.run.bind(client);
    let eventName = file.split(".")[0];
    client.events.set(eventName, eventStart);
    client.on(eventName, (...args) => event.run(client, ...args));
  });
});
