if (process.version.slice(1).split(".")[0] < 8)
  throw new Error("Node 8.0.0 or higher is required.");

const Discord = require("discord.js");
const { promisify } = require("util");
const readdir = promisify(require("fs").readdir);
const fs = require("fs");
const Enmap = require("enmap");
const EnmapLevel = require("enmap-level");

const client = new Discord.Client();
const config = require("./config.js");
client.config = config;

if (client.config.debug === "true") {
  console.warn(
    "RUNNING IN DEBUG MODE. SOME PRIVATE INFORMATION (SUCH AS THE TOKEN) MAY BE LOGGED TO CONSOLE"
  );
  client.on("error", e => console.log(e));
  client.on("warn", e => console.log(e));
  client.on("debug", e => console.log(e));
}

var allowedStatuses = ["online", "idle", "invisible", "dnd"];

if (!allowedStatuses.includes(client.config.status)) {
  console.error(
    'Bot status must be either "online", "idle", "invisible", or "dnd".'
  );
  process.exit(1);
}

require("./modules/functions.js")(client);

client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
client.settings = new Enmap({ provider: new EnmapLevel({ name: "settings" }) });
client.tags = new Enmap({ provider: new EnmapLevel({ name: "tags" }) });
client.points = new Enmap({ provider: new EnmapLevel({ name: "points" }) });
//client.warnings = new Enmap({ provider: new EnmapLevel({ name: "warnings" }) }); // Coming soon (format: `${guild.id}-${user.id}`)

client.talkedRecently = new Set();

const init = async () => {
  const cmdFiles = await readdir("./commands/");
  client.commandsNumber = cmdFiles.length;
  client.log(
    "log",
    `Loading a total of ${client.commandsNumber} commands.`,
    "LOAD"
  );
  cmdFiles.forEach(f => {
    try {
      const props = require(`./commands/${f}`);
      if (f.split(".").slice(-1)[0] !== "js") return;
      client.log("log", `Loading Command: ${props.help.name}.`, "LOAD");
      client.commands.set(props.help.name, props);
      props.conf.aliases.forEach(alias => {
        client.aliases.set(alias, props.help.name);
      });
    } catch (e) {
      client.log("ERROR", `Unable to load command ${f}: ${e}`);
    }
  });

  const evtFiles = await readdir("./events/");
  client.log("log", `Loading a total of ${evtFiles.length} events.`, "LOAD");
  evtFiles.forEach(file => {
    const eventName = file.split(".")[0];
    client.log("log", `Loading Event: ${eventName}.`, "LOAD");
    const event = require(`./events/${file}`);
    client.on(eventName, event.bind(null, client));
    delete require.cache[require.resolve(`./events/${file}`)];
  });

  var token = client.config.token;

  if (client.config.musicEnabled === "true") {
    // START MUSIC YEA BOI
    client.music = require("./modules/music.js");
    client.music.start(client, {
      youtubeKey: client.config.googleAPIToken,
      botPrefix: ".",
      anyoneCanSkip: true,
      ownerOverMember: true,
      ownerID: client.config.ownerID,
      cooldown: {
        enabled: false
      }
    });
  }

  process.on("unhandledRejection", err => {
    if (
      err.code === "ENOTFOUND" ||
      err.code === "ECONNRESET" ||
      err.code === "ETIMEDOUT"
    ) {
      client.log("ERROR", `Bot connection error: ${err.code}`);
    } else {
      client.log("ERROR", `Uncaught Promise Error: \n${err.stack}`);
    }
  });

  client.login(token);
};

init();
