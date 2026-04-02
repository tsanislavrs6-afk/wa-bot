require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    PermissionsBitField, 
    ChannelType,
    ActivityType,
    EmbedBuilder
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates
    ],
});

const PREFIX = '!';

// Конфигурация на Ролите
const ROLES_CONFIG = [
    { name: 'Owner', color: '#ff0000', hoist: true, permissions: [PermissionsBitField.Flags.Administrator] },
    { name: 'Admin', color: '#ff8000', hoist: true, permissions: [PermissionsBitField.Flags.Administrator] },
    { name: 'Moderator', color: '#00ff00', hoist: true, permissions: [PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.BanMembers] },
    { name: 'Member', color: '#3498db', hoist: true },
    { name: 'Active', color: '#9b59b6', hoist: false },
    { name: 'Streaming', color: '#593695', hoist: true },
    { name: 'Muted / Punished', color: '#34495e', hoist: false },
    { name: 'CS2', color: '#f1c40f', hoist: false },
    { name: 'GTA', color: '#2ecc71', hoist: false }
];

client.once('ready', () => {
    console.log(`PRO-Setup Ботът е готов за хостинг! Онлайн като: ${client.user.tag}`);
});

// 1. Auto Role при влизане
client.on('guildMemberAdd', async (member) => {
    try {
        const role = member.guild.roles.cache.find(r => r.name === 'Member');
        if (role) await member.roles.add(role);
    } catch (error) {
        console.error('Грешка при Auto Role:', error.message);
    }
});

// 2. Streaming Role при Live статус
client.on('presenceUpdate', (oldPresence, newPresence) => {
    if (!newPresence || !newPresence.member) return;
    
    const streamingRole = newPresence.guild.roles.cache.find(r => r.name === 'Streaming');
    if (!streamingRole) return;

    const isStreaming = newPresence.activities.some(activity => activity.type === ActivityType.Streaming);
    
    try {
        if (isStreaming) {
            newPresence.member.roles.add(streamingRole).catch(() => {});
        } else {
            newPresence.member.roles.remove(streamingRole).catch(() => {});
        }
    } catch (error) {
        console.error('Грешка при Streaming Role:', error.message);
    }
});

// 3. Auto Private Voice Rooms
client.on('voiceStateUpdate', async (oldState, newState) => {
    const user = newState.member;
    const guild = newState.guild;
    
    try {
        // Влизане в Create Room
        if (newState.channel && newState.channel.name === 'Create Room') {
            const category = newState.channel.parent;
            const newChannel = await guild.channels.create({
                name: `🔊 ${user.user.username}'s Room`,
                type: ChannelType.GuildVoice,
                parent: category,
                permissionOverwrites: [
                    { id: user.id, allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.MoveMembers, PermissionsBitField.Flags.Connect] },
                    { id: guild.id, allow: [PermissionsBitField.Flags.Connect] }
                ]
            });
            await user.voice.setChannel(newChannel);
        }

        // Изтриване на празна временна стая
        if (oldState.channel && oldState.channel.name.includes("'s Room") && oldState.channel.members.size === 0) {
            await oldState.channel.delete();
        }
    } catch (error) {
        console.error('Грешка при Voice Rooms:', error.message);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Проверка за Администратор за ВСИЧКИ команди
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        if (['setup-server', 'reset-rooms', 'setup-help'].includes(command)) {
            return message.reply('❌ Тази команда е достъпна само за Администратори!');
        }
    }

    // Команда: !setup-help
    if (command === 'setup-help') {
        const helpEmbed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🛠️ Помощ за Настройка на Сървъра')
            .setDescription('Ето списък с наличните команди на бота:')
            .addFields(
                { name: '`!setup-server`', value: 'Автоматично създава всички категории, канали и роли (без дублиране).' },
                { name: '`!reset-rooms`', value: 'Изтрива всички останали празни временни voice стаи.' },
                { name: '`!setup-help`', value: 'Показва това съобщение.' }
            )
            .setFooter({ text: 'PRO Gaming Setup Bot' });

        return message.reply({ embeds: [helpEmbed] });
    }

    // Команда: !reset-rooms
    if (command === 'reset-rooms') {
        try {
            const rooms = message.guild.channels.cache.filter(c => c.name.includes("'s Room") && c.type === ChannelType.GuildVoice);
            let deletedCount = 0;
            
            for (const [id, room] of rooms) {
                if (room.members.size === 0) {
                    await room.delete();
                    deletedCount++;
                }
            }
            return message.reply(`✅ Изтрити са ${deletedCount} празни временни стаи.`);
        } catch (error) {
            console.error(error);
            return message.reply('❌ Липсват права за изтриване на канали!');
        }
    }

    // Команда: !setup-server
    if (command === 'setup-server') {
        const guild = message.guild;
        const statusMsg = await message.reply('⏳ Започвам PRO конфигурация... Проверявам за съществуващи елементи.');

        try {
            // 1. Създаване на роли (без дублиране)
            const rolesMap = {};
            for (const rConfig of ROLES_CONFIG) {
                let role = guild.roles.cache.find(r => r.name === rConfig.name);
                if (!role) {
                    role = await guild.roles.create({
                        name: rConfig.name,
                        color: rConfig.color,
                        hoist: rConfig.hoist,
                        permissions: rConfig.permissions || []
                    });
                }
                rolesMap[rConfig.name] = role;
            }

            const staffRoles = [rolesMap['Owner'], rolesMap['Admin'], rolesMap['Moderator']];

            // 2. Дефиниция на структурата
            const structure = [
                {
                    name: '📢 Welcome / Info',
                    channels: ['welcome', 'rules', 'announcements', 'self-roles']
                },
                {
                    name: '💬 Chat',
                    channels: ['general-chat', 'gaming-chat', 'кой-играе']
                },
                {
                    name: '🎮 Gaming',
                    channels: ['events', 'suggestions', 'polls']
                },
                {
                    name: '📸 Media',
                    channels: ['clips', 'memes', 'screenshots', 'media']
                },
                {
                    name: '🔊 Voice Channels',
                    channels: [
                        { name: 'General Voice', type: ChannelType.GuildVoice },
                        { name: 'CS2 Voice', type: ChannelType.GuildVoice },
                        { name: 'GTA Voice', type: ChannelType.GuildVoice },
                        { name: 'Private Voice', type: ChannelType.GuildVoice },
                        { name: 'Create Room', type: ChannelType.GuildVoice },
                        { name: 'AFK', type: ChannelType.GuildVoice },
                        { name: 'Late Night', type: ChannelType.GuildVoice }
                    ]
                },
                {
                    name: '🤖 Bots',
                    channels: ['bot-commands', 'counting']
                },
                {
                    name: '🛡️ Staff',
                    isStaffOnly: true,
                    channels: ['logs', 'staff-chat']
                }
            ];

            // 3. Създаване на Категории и Канали (без дублиране)
            for (const catConfig of structure) {
                let category = guild.channels.cache.find(c => c.name === catConfig.name && c.type === ChannelType.GuildCategory);
                
                // Права за Staff секцията
                let categoryPerms = [
                    { id: guild.id, allow: [PermissionsBitField.Flags.ViewChannel] } // По подразбиране
                ];
                
                if (catConfig.isStaffOnly) {
                    categoryPerms = [
                        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }
                    ];
                    staffRoles.forEach(role => {
                        if (role) categoryPerms.push({ id: role.id, allow: [PermissionsBitField.Flags.ViewChannel] });
                    });
                }

                if (!category) {
                    category = await guild.channels.create({
                        name: catConfig.name,
                        type: ChannelType.GuildCategory,
                        permissionOverwrites: categoryPerms
                    });
                } else if (catConfig.isStaffOnly) {
                    await category.permissionOverwrites.set(categoryPerms);
                }

                for (const chanData of catConfig.channels) {
                    const chanName = typeof chanData === 'string' ? chanData : chanData.name;
                    const chanType = typeof chanData === 'string' ? ChannelType.GuildText : chanData.type;

                    let channel = guild.channels.cache.find(c => c.name === chanName && c.type === chanType && c.parentId === category.id);
                    if (!channel) {
                        await guild.channels.create({
                            name: chanName,
                            type: chanType,
                            parent: category.id
                        });
                    }
                }
            }

            await statusMsg.edit('✅ **Setup-ът е завършен успешно!** Ролите и каналите са готови без дублиране. Staff секцията е защитена.');
        } catch (error) {
            console.error('Грешка при Setup:', error.message);
            if (error.code === 50013) {
                return statusMsg.edit('❌ **ГРЕШКА: Липсват права!** Моля, уверете се, че ролята на бота е най-отгоре в настройките на сървъра и има права за "Administrator".');
            }
            await statusMsg.edit(`❌ **Възникна грешка:** ${error.message}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
