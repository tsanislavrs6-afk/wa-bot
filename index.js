require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    PermissionsBitField, 
    ChannelType,
    ActivityType,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
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
    { name: '🚫 Punished', color: '#34495e', hoist: false },
    { name: '🔫 CS2', color: '#f1c40f', hoist: false },
    { name: '🎮 Other Games', color: '#2ecc71', hoist: false },
    { name: '🎙️ Voice Notifications', color: '#e67e22', hoist: false },
    { name: '📢 Stream Notifications', color: '#e91e63', hoist: false }
];

client.once('ready', () => {
    console.log(`PRO Gaming Setup Ботът е готов! Онлайн като: ${client.user.tag}`);
});

// 1. Welcome Message & Auto Role
client.on('guildMemberAdd', async (member) => {
    try {
        // Auto Role Member
        const memberRole = member.guild.roles.cache.find(r => r.name === 'Member');
        if (memberRole) await member.roles.add(memberRole);

        // Welcome Message
        const welcomeChannel = member.guild.channels.cache.find(c => c.name === 'welcome' && c.type === ChannelType.GuildText);
        if (welcomeChannel) {
            const rulesChannel = member.guild.channels.cache.find(c => c.name === 'rules');
            const selfRolesChannel = member.guild.channels.cache.find(c => c.name === 'self-roles');
            
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#00ffcc')
                .setTitle(`🎮 Добре дошъл, ${member.user.username}!`)
                .setDescription(`Тук се събираме за игри, разговори и добро настроение.\n\n` +
                    `📜 Провери правилата в ${rulesChannel ? rulesChannel : '#rules'}\n` +
                    `🎯 Избери какво играеш в ${selfRolesChannel ? selfRolesChannel : '#self-roles'}\n` +
                    `🔊 Включи се във voice каналите\n\n` +
                    `Успех и приятно играене! 🚀`)
                .setThumbnail(member.user.displayAvatarURL());

            await welcomeChannel.send({ content: `${member}`, embeds: [welcomeEmbed] });
        }
    } catch (error) {
        console.error('Грешка при guildMemberAdd:', error.message);
    }
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
        if (oldState.channel && oldState.channel.name.includes("'s Room") && oldState.channel.members.size === 0) {
            await oldState.channel.delete().catch(() => {});
        }
    } catch (e) {}
});

// 4. Self-Roles Interaction
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    const roleMap = {
        'role_cs2': '🔫 CS2',
        'role_other': '🎮 Other Games',
        'role_voice': '🎙️ Voice Notifications',
        'role_stream': '📢 Stream Notifications'
    };

    const roleName = roleMap[interaction.customId];
    if (!roleName) return;

    const role = interaction.guild.roles.cache.find(r => r.name === roleName);
    if (!role) return interaction.reply({ content: '❌ Ролята не е намерена!', ephemeral: true });

    try {
        if (interaction.member.roles.cache.has(role.id)) {
            await interaction.member.roles.remove(role);
            await interaction.reply({ content: `✅ Ролята **${roleName}** беше премахната.`, ephemeral: true });
        } else {
            await interaction.member.roles.add(role);
            await interaction.reply({ content: `✅ Ролята **${roleName}** беше добавена.`, ephemeral: true });
        }
    } catch (error) {
        await interaction.reply({ content: '❌ Липсват права за управление на ролите!', ephemeral: true });
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'setup-server') {
        const guild = message.guild;
        const statusMsg = await message.reply('⏳ Започвам пълна конфигурация на Gaming сървъра...');

        try {
            // 1. Създаване на роли
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
            const punishedRole = rolesMap['🚫 Punished'];
            const cs2Role = rolesMap['🔫 CS2'];
            const otherGamesRole = rolesMap['🎮 Other Games'];

            // 2. Структура
            const structure = [
                {
                    name: '📢 Welcome / Info',
                    channels: [
                        { name: 'welcome', type: ChannelType.GuildText },
                        { name: 'rules', type: ChannelType.GuildText },
                        { name: 'announcements', type: ChannelType.GuildText },
                        { name: 'self-roles', type: ChannelType.GuildText }
                    ],
                    perms: [
                        { id: guild.id, deny: [PermissionsBitField.Flags.SendMessages] }
                    ]
                },
                {
                    name: '💬 Chat',
                    channels: [
                        { name: 'general-chat', type: ChannelType.GuildText },
                        { name: 'gaming-chat', type: ChannelType.GuildText },
                        { name: 'off-topic', type: ChannelType.GuildText }
                    ]
                },
                {
                    name: '🎯 CS2 Arena',
                    channels: [
                        { name: 'cs2-chat', type: ChannelType.GuildText },
                        { name: 'CS2 Voice', type: ChannelType.GuildVoice }
                    ],
                    perms: [
                        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: cs2Role.id, allow: [PermissionsBitField.Flags.ViewChannel] }
                    ]
                },
                {
                    name: '🎮 Other Games Zone',
                    channels: [
                        { name: 'other-games-chat', type: ChannelType.GuildText },
                        { name: 'Other Games Voice', type: ChannelType.GuildVoice }
                    ],
                    perms: [
                        { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        { id: otherGamesRole.id, allow: [PermissionsBitField.Flags.ViewChannel] }
                    ]
                },
                {
                    name: '🔊 Voice Channels',
                    channels: [
                        { name: 'General Voice', type: ChannelType.GuildVoice },
                        { name: '🔒 Private Voice', type: ChannelType.GuildVoice },
                        { name: '➕ Create Room', type: ChannelType.GuildVoice },
                        { name: '🌙 Late Night', type: ChannelType.GuildVoice },
                        { name: '💤 AFK', type: ChannelType.GuildVoice }
                    ]
                },
                {
                    name: '📸 Media',
                    channels: ['clips', 'memes', 'screenshots']
                },
                {
                    name: '🎮 Gaming Tools',
                    channels: ['events', 'suggestions', 'polls']
                },
                {
                    name: '🤖 Bots',
                    channels: ['bot-commands', 'logs']
                },
                {
                    name: '🛡️ Staff Area',
                    isStaffOnly: true,
                    channels: ['staff-chat', 'logs']
                }
            ];

            // 3. Създаване на Категории и Канали
            for (const catConfig of structure) {
                let categoryPerms = catConfig.perms || [];
                
                if (catConfig.isStaffOnly) {
                    categoryPerms = [{ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] }];
                    staffRoles.forEach(r => { if(r) categoryPerms.push({ id: r.id, allow: [PermissionsBitField.Flags.ViewChannel] }); });
                }

                // Punished Role Overwrites (за всички категории освен Welcome)
                if (catConfig.name !== '📢 Welcome / Info' && punishedRole) {
                    categoryPerms.push({ id: punishedRole.id, deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.Connect] });
                }

                let category = guild.channels.cache.find(c => c.name === catConfig.name && c.type === ChannelType.GuildCategory);
                if (!category) {
                    category = await guild.channels.create({ name: catConfig.name, type: ChannelType.GuildCategory, permissionOverwrites: categoryPerms });
                } else {
                    await category.permissionOverwrites.set(categoryPerms);
                }

                for (const chanData of catConfig.channels) {
                    const chanName = typeof chanData === 'string' ? chanData : chanData.name;
                    const chanType = typeof chanData === 'string' ? ChannelType.GuildText : chanData.type;
                    let channel = guild.channels.cache.find(c => c.name === chanName && c.type === chanType && c.parentId === category.id);
                    if (!channel) await guild.channels.create({ name: chanName, type: chanType, parent: category.id });
                }
            }

            // 4. Пращане на Rules
            const rulesChan = guild.channels.cache.find(c => c.name === 'rules');
            if (rulesChan) {
                const rulesEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('📜 ПРАВИЛА НА СЪРВЪРА')
                    .setDescription(
                        `1. Уважавайте останалите членове\n` +
                        `2. Без спам\n` +
                        `3. Без реклами без разрешение\n` +
                        `4. Използвайте правилните канали\n` +
                        `5. Забранени са обиди и дискриминация\n` +
                        `6. Не злоупотребявайте с @everyone\n` +
                        `7. Спазвайте правилата във voice каналите\n` +
                        `8. Решенията на staff се уважават\n\n` +
                        `**Нарушаването на правилата води до наказание!**`
                    );
                await rulesChan.send({ embeds: [rulesEmbed] });
            }

            // 5. Пращане на Self-Roles
            const selfRolesChan = guild.channels.cache.find(c => c.name === 'self-roles');
            if (selfRolesChan) {
                const selfRolesEmbed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('🎭 Избор на Роли')
                    .setDescription('Изберете вашите роли чрез бутоните по-долу, за да отключите канали и известия:');

                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('role_cs2').setLabel('🔫 CS2').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('role_other').setLabel('🎮 Other Games').setStyle(ButtonStyle.Success)
                );
                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('role_voice').setLabel('🎙️ Voice Notifications').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('role_stream').setLabel('📢 Stream Notifications').setStyle(ButtonStyle.Danger)
                );

                await selfRolesChan.send({ embeds: [selfRolesEmbed], components: [row1, row2] });
            }

            await statusMsg.edit('✅ **Сървърът е конфигуриран успешно!**\nИзберете си роли в #self-roles.');
        } catch (error) {
            console.error(error);
            await statusMsg.edit(`❌ Грешка: ${error.message}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
