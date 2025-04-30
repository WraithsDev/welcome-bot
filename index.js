const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const path = require('path');
const config = require('./config.json');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

let voiceConnection;
const player = createAudioPlayer();
let isLooping = false;
let currentLoop = '';

client.once('ready', async () => {
  console.log(`${client.user.tag} botu hazır!`);

  try {
    const guild = await client.guilds.fetch(config.GUILD_ID);
    const channel = guild.channels.cache.get(config.VOICE_CHANNEL_ID);

    if (!channel) {
      console.error("Ses kanalı bulunamadı.");
      return;
    }

    joinVoice(channel);
  } catch (error) {
    console.error("Sunucuya erişilirken hata oluştu:", error);
  }
});

function joinVoice(voiceChannel) {
  voiceConnection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
  });

  const silencePath = path.join(__dirname, 'silence.mp3');

  if (!fs.existsSync(silencePath)) {
    console.error('Silence.mp3 dosyası bulunamadı.');
    return;
  }

  const silence = createAudioResource(silencePath);
  player.play(silence);
  voiceConnection.subscribe(player);

  console.log('Bot ses kanalında sessizde bekliyor.');
}

function playAudioLoop(type) {
  if (!isLooping || currentLoop !== type) return;

  const audioPath = path.join(__dirname, `${type}.mp3`);
  if (!fs.existsSync(audioPath)) {
    console.error(`${type}.mp3 dosyası bulunamadı.`);
    return;
  }

  const audio = createAudioResource(audioPath);
  player.play(audio);

  player.once(AudioPlayerStatus.Idle, () => {
    if (isLooping && currentLoop === type) {
      setTimeout(() => playAudioLoop(type), 1000);
    } else {
      const silence = createAudioResource(path.join(__dirname, 'silence.mp3'));
      player.play(silence);
    }
  });
}

function checkChannelAndUpdateAudio(channel) {
  const membersInChannel = channel.members.filter(m => !m.user.bot);
  const hasYetkili = membersInChannel.some(member => 
    member.roles.cache.has(config.YETKILI_ROLE_ID)
  );

  if (hasYetkili) {
    if (currentLoop !== 'yetkili') {
      isLooping = true;
      currentLoop = 'yetkili';
      console.log('Yetkili var, yetkili.mp3 döngüsü başlatılıyor.');
      playAudioLoop('yetkili');
    }
  } else if (membersInChannel.size > 0) {
    if (currentLoop !== 'hosgeldin') {
      isLooping = true;
      currentLoop = 'hosgeldin';
      console.log('Yetkili yok, hosgeldin.mp3 döngüsü başlatılıyor.');
      playAudioLoop('hosgeldin');
    }
  } else {
    isLooping = false;
    currentLoop = '';
    const silence = createAudioResource(path.join(__dirname, 'silence.mp3'));
    player.play(silence);
  }
}

client.on('voiceStateUpdate', (oldState, newState) => {
  if (newState.guild.id !== config.GUILD_ID) return;

  const targetChannelId = config.VOICE_CHANNEL_ID;
  const channel = newState.guild.channels.cache.get(targetChannelId);
  
  if (!channel) return;

  const botsInChannel = channel.members.filter(m => 
    m.user.bot && m.user.id !== client.user.id
  );

  if (botsInChannel.size > 0) {
    console.log('Aynı kanalda başka bir bot var, işlem durduruldu.');
    return;
  }

  if (newState.channelId === targetChannelId || oldState.channelId === targetChannelId) {
    setTimeout(() => {
      checkChannelAndUpdateAudio(channel);
    }, 2000);
  }
});

player.on('error', error => {
  console.error('Ses oynatma sırasında hata:', error);
});

player.on('stateChange', (oldState, newState) => {
  console.log(`Player state değişti: ${oldState.status} -> ${newState.status}`);
});

client.login(config.TOKEN);