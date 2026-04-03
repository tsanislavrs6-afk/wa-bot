require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { 
    Client, 
    GatewayIntentBits, 
    PermissionsBitField, 
    ChannelType,
    ActivityType,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    AuditLogEvent
} = require('discord.js');
const express = require('express');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration
    ],
});

const PREFIX = '!';
const STORAGE_FILE = path.join(__dirname, 'storage.json');

// HTTP Сървър за UptimeRobot (Render Keep-Alive)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is running');
});

app.listen(PORT, () => {
    console.log(`HTTP сървърът е зареден на порт ${PORT}`);
});

// Помощни функции за съхранение
function loadData() {
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            return JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
        }
    } catch (e) { console.error('Грешка при зареждане на storage.json:', e); }
    return { guilds: {} };
}

function saveData(data) {
    try {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
    } catch (e) { console.error('Грешка при запис в storage.json:', e); }
}

// Конфигурация на Ролите
const ROLES_CONFIG = [
    { name: 'Owner', color: '#ff0000', hoist: true, permissions: [PermissionsBitField.Flags.Administrator] },
    { name: '🤖 Bot', color: '#ffffff', hoist: true, permissions: [PermissionsBitField.Flags.Administrator] },
    { name: 'Admin', color: '#ff8000', hoist: true, permissions: [PermissionsBitField.Flags.Administrator] },
    { name: 'Moderator', color: '#00ff00', hoist: true, permissions: [PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.BanMembers] },
    { name: 'Member', color: '#3498db', hoist: true },
    { name: 'Active', color: '#9b59b6', hoist: false },
    { name: 'Streaming', color: '#593695', hoist: true },
    { name: '🚫 Punished', color: '#34495e', hoist: false },
    { name: '🔫 CS2', color: '#f1c40f', hoist: false },
    { name: '🎮 Other Games', color: '#2ecc71', hoist: false },
    { name: '🎙️ Voice Notifications', color: '#e67e22', hoist: false },
    { name: '📢 Stream Notifications', color: '#e91e63', hoist: false }
];

// Помощна функция за логване
async function sendLog(guild, embed) {
    const logChannel = guild.channels.cache.find(c => c.name === 'logs' && c.type === ChannelType.GuildText);
    if (logChannel) {
        await logChannel.send({ embeds: [embed] }).catch(() => {});
    }
}

client.once('ready', () => {
    console.log(`PRO Setup Ботът е онлайн: ${client.user.tag}`);
});

// 1. Welcome Message & Onboarding (Без автоматична роля Member)
client.on('guildMemberAdd', async (member) => {
    try {
        const welcomeChannel = member.guild.channels.cache.find(c => c.name === 'welcome' && c.type === ChannelType.GuildText);
        const rulesChannel = member.guild.channels.cache.find(c => c.name === 'rules' && c.type === ChannelType.GuildText);
        const selfRolesChannel = member.guild.channels.cache.find(c => c.name === 'self-roles' && c.type === ChannelType.GuildText);

        if (welcomeChannel) {
            const rulesMention = rulesChannel ? `<#${rulesChannel.id}>` : '#rules';
            const selfRolesMention = selfRolesChannel ? `<#${selfRolesChannel.id}>` : '#self-roles';

            const welcomeEmbed = new EmbedBuilder()
                .setColor('#00ffcc')
                .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
                .setTitle(`🎮 Добре дошъл в нашия сървър!`)
                .setDescription(`Здравей, ${member}! Радваме се да те видим тук.\n\n` +
                    `📜 Прочети правилата в ${rulesMention}\n🎯 Избери роля в ${selfRolesMention}, за да отключиш останалите канали!\n\nУспех! 🚀`)
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();
            await welcomeChannel.send({ content: `${member}`, embeds: [welcomeEmbed] });
        }
        const logEmbed = new EmbedBuilder().setColor('#2ecc71').setDescription(`${member} влезе в сървъра (Guest).`).setTimestamp();
        await sendLog(member.guild, logEmbed);
    } catch (e) { console.error(e); }
});

// Member Leave Log
client.on('guildMemberRemove', async (member) => {
    const logEmbed = new EmbedBuilder().setColor('#e74c3c').setDescription(`${member.user.tag} напусна.`).setTimestamp();
    await sendLog(member.guild, logEmbed);
});

// 2. Streaming Role
client.on('presenceUpdate', (oldPresence, newPresence) => {
    if (!newPresence || !newPresence.member) return;
    const streamingRole = newPresence.guild.roles.cache.find(r => r.name === 'Streaming');
    if (!streamingRole) return;
    const isStreaming = newPresence.activities.some(activity => activity.type === ActivityType.Streaming);
    try {
        if (isStreaming) newPresence.member.roles.add(streamingRole).catch(() => {});
        else newPresence.member.roles.remove(streamingRole).catch(() => {});
    } catch (e) {}
});

// 3. Auto Private Voice Rooms
client.on('voiceStateUpdate', async (oldState, newState) => {
    const user = newState.member;
    const guild = newState.guild;
    try {
        if (newState.channel && newState.channel.name === '➕ Create Room') {
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
        if (oldState.channel && oldState.channel.name.includes("'s Room") && oldState.channel.members.size === 0) {
            await oldState.channel.delete().catch(() => {});
        }
    } catch (e) {}
});

// 4. Self-Roles Interaction (Отключва Member роля)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const roleMap = { 'role_cs2': '🔫 CS2', 'role_other': '🎮 Other Games', 'role_voice': '🎙️ Voice Notifications', 'role_stream': '📢 Stream Notifications' };
    const roleName = roleMap[interaction.customId];
    if (!roleName) return;

    const guild = interaction.guild;
    const member = interaction.member;
    const chosenRole = guild.roles.cache.find(r => r.name === roleName);
    const memberRole = guild.roles.cache.find(r => r.name === 'Member');

    if (!chosenRole || !memberRole) return interaction.reply({ content: '❌ Грешка: Ролите не са намерени!', ephemeral: true });

    try {
        let response = '';
        // Винаги даваме Member роля, ако потребителят я няма
        if (!member.roles.cache.has(memberRole.id)) {
            await member.roles.add(memberRole);
            response += `✅ Добре дошъл! Вече си официален **Member** и отключи общите чатове.\n`;
        }

        // Добавяне/Премахване на избраната роля
        if (member.roles.cache.has(chosenRole.id)) {
            await member.roles.remove(chosenRole);
            response += `➖ Ролята **${roleName}** беше премахната.`;
        } else {
            await member.roles.add(chosenRole);
            response += `➕ Ролята **${roleName}** беше добавена.`;
        }

        await interaction.reply({ content: response, ephemeral: true });
    } catch (e) { 
        console.error(e);
        await interaction.reply({ content: '❌ Липсват права за управление на ролите!', ephemeral: true }); 
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Команда: !reset-server (FULL CLEANUP)
    if (command === 'reset-server') {
        await message.reply('⚠️ **ВНИМАНИЕ: ПЪЛНО ПОЧИСТВАНЕ!**\nТази команда ще изтрие ВСИЧКИ канали и роли (освен Owner и 🤖 Bot).\nНапишете **RESET**, за да потвърдите.');
        const filter = m => m.author.id === message.author.id && m.content === 'RESET';
        const collector = message.channel.createMessageCollector({ filter, time: 15000, max: 1 });

        collector.on('collect', async m => {
            const statusMsg = await message.channel.send('⏳ Започвам пълно почистване...');
            const guild = message.guild;
            try {
                const channels = await guild.channels.fetch();
                for (const [id, chan] of channels) { if (id !== message.channel.id) await chan.delete().catch(() => {}); }
                const roles = await guild.roles.fetch();
                for (const [id, role] of roles) {
                    if (id === guild.id || role.managed || role.name === 'Owner' || role.name === '🤖 Bot') continue;
                    if (role.editable) await role.delete().catch(() => {});
                }
                const storage = loadData(); delete storage.guilds[guild.id]; saveData(storage);
                await statusMsg.edit('✅ **Server template cleanup completed successfully.**');
            } catch (error) { await message.channel.send(`❌ Грешка: ${error.message}`); }
        });
        return;
    }

    // Команда: !setup-server
    if (command === 'setup-server') {
        const guild = message.guild;
        const statusMsg = await message.reply('⏳ Започвам професионална конфигурация...');
        const storage = loadData();
        storage.guilds[guild.id] = { roles: [], channels: [] };

        try {
            // 1. Роли
            const rolesMap = {};
            for (const rConfig of ROLES_CONFIG) {
                let role = guild.roles.cache.find(r => r.name === rConfig.name);
                if (!role) role = await guild.roles.create({ name: rConfig.name, color: rConfig.color, hoist: rConfig.hoist, permissions: rConfig.permissions || [] });
                rolesMap[rConfig.name] = role;
                if (!storage.guilds[guild.id].roles.includes(role.id)) storage.guilds[guild.id].roles.push(role.id);
            }

            const botRole = rolesMap['🤖 Bot'];
            const ownerRole = rolesMap['Owner'];
            if (botRole && ownerRole) await botRole.setPosition(ownerRole.position - 1).catch(() => {});

            const staffRoles = [rolesMap['Owner'], rolesMap['Admin'], rolesMap['Moderator']];
            const memberRole = rolesMap['Member'];
            const punishedRole = rolesMap['🚫 Punished'];
            const cs2Role = rolesMap['🔫 CS2'];
            const otherGamesRole = rolesMap['🎮 Other Games'];

        // 2. Структура (Скриваме всичко от @everyone, отключваме само за Member)
        const structure = [
            { 
                name: '📢 Welcome / Info', 
                channels: [ { name: 'welcome', type: ChannelType.GuildText }, { name: 'rules', type: ChannelType.GuildText }, { name: 'announcements', type: ChannelType.GuildText }, { name: 'self-roles', type: ChannelType.GuildText } ], 
                perms: [ 
                    { id: guild.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions] },
                    { id: memberRole.id, allow: [PermissionsBitField.Flags.ViewChannel], deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions] }
                ] 
            },
            { 
                name: '💬 Chat', 
                channels: [ { name: 'general-chat', type: ChannelType.GuildText }, { name: 'gaming-chat', type: ChannelType.GuildText }, { name: 'off-topic', type: ChannelType.GuildText } ],
                perms: [ { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, { id: memberRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] } ]
            },
                { 
                    name: '🎯 CS2 Arena', 
                    channels: [ { name: 'cs2-chat', type: ChannelType.GuildText }, { name: '🎯 CS2 Voice', type: ChannelType.GuildVoice } ], 
                    perms: [ { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, { id: cs2Role.id, allow: [PermissionsBitField.Flags.ViewChannel] } ] 
                },
                { 
                    name: '🎮 Other Games Zone', 
                    channels: [ { name: 'other-games-chat', type: ChannelType.GuildText }, { name: '🎮 Other Games Voice', type: ChannelType.GuildVoice } ], 
                    perms: [ { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, { id: otherGamesRole.id, allow: [PermissionsBitField.Flags.ViewChannel] } ] 
                },
            { 
                name: '🔊 Voice Channels', 
                channels: [ { name: '🔊 General Voice', type: ChannelType.GuildVoice }, { name: '🔒 Private Voice', type: ChannelType.GuildVoice }, { name: '➕ Create Room', type: ChannelType.GuildVoice }, { name: '🌙 Late Night', type: ChannelType.GuildVoice }, { name: '💤 AFK', type: ChannelType.GuildVoice } ],
                perms: [ { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }, { id: memberRole.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak] } ]
            },
                { 
                    name: '🛡 Staff', 
                    isStaffOnly: true, 
                    channels: [ { name: 'staff-chat', type: ChannelType.GuildText }, { name: 'logs', type: ChannelType.GuildText } ] 
                }
            ];

            for (const catConfig of structure) {
                let perms = catConfig.perms || [];
                staffRoles.forEach(r => { if(r) perms.push({ id: r.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }); });
                if (catConfig.isStaffOnly) perms.push({ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] });
                if (catConfig.name !== '📢 Welcome / Info' && punishedRole) perms.push({ id: punishedRole.id, deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.Connect] });

                let cat = guild.channels.cache.find(c => c.name === catConfig.name && c.type === ChannelType.GuildCategory);
                if (!cat) cat = await guild.channels.create({ name: catConfig.name, type: ChannelType.GuildCategory, permissionOverwrites: perms });
                else await cat.permissionOverwrites.set(perms);
                if (!storage.guilds[guild.id].channels.includes(cat.id)) storage.guilds[guild.id].channels.push(cat.id);

                for (const chanData of catConfig.channels) {
                    let chan = guild.channels.cache.find(c => c.name === chanData.name && c.type === chanData.type && c.parentId === cat.id);
                    if (!chan) chan = await guild.channels.create({ name: chanData.name, type: chanData.type, parent: cat.id });
                    await chan.permissionOverwrites.set(perms);
                    if (!storage.guilds[guild.id].channels.includes(chan.id)) storage.guilds[guild.id].channels.push(chan.id);
                }
            }

            // Rules & Self-Roles Messages
            const rulesChan = guild.channels.cache.find(c => c.name === 'rules');
            if (rulesChan) {
                const messages = await rulesChan.messages.fetch({ limit: 10 });
                if (!messages.some(m => m.embeds.some(e => e.title === '📜 ПРАВИЛА'))) {
                    const rulesEmbed = new EmbedBuilder().setColor('#ff0000').setTitle('📜 ПРАВИЛА').setDescription(`1. Уважавайте се\n2. Без спам\n3. Без реклами\n4. Без обиди\n5. Спазвайте каналите\n\n**Нарушенията се наказват!**`);
                    await rulesChan.send({ embeds: [rulesEmbed] });
                }
            }

            const selfRolesChan = guild.channels.cache.find(c => c.name === 'self-roles');
            if (selfRolesChan) {
                const messages = await selfRolesChan.messages.fetch({ limit: 10 });
                if (!messages.some(m => m.embeds.some(e => e.title === '🎭 РОЛИ'))) {
                    const srEmbed = new EmbedBuilder().setColor('#0099ff').setTitle('🎭 РОЛИ').setDescription('Изберете роли по-долу, за да отключите чатовете:');
                    const row1 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('role_cs2').setLabel('🔫 CS2').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('role_other').setLabel('🎮 Other Games').setStyle(ButtonStyle.Success));
                    const row2 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('role_voice').setLabel('🎙️ Voice').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId('role_stream').setLabel('📢 Stream').setStyle(ButtonStyle.Danger));
                    await selfRolesChan.send({ embeds: [srEmbed], components: [row1, row2] });
                }
            }

            saveData(storage);
            await statusMsg.edit('✅ **Сървърът е конфигуриран с Onboarding система!**');
        } catch (error) { await statusMsg.edit(`❌ Грешка: ${error.message}`); }
    }
});

client.login(process.env.DISCORD_TOKEN);
