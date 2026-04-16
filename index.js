require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    ChannelType,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const express = require('express');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const PREFIX = '!';
const STORAGE_FILE = path.join(__dirname, 'storage.json');
const PORT = process.env.PORT || 3000;

const CONFIG_CHANNEL_KEYS = ['logs', 'roles', 'createRoom', 'welcome', 'rules', 'announcements', 'modChat'];
const CREATE_ROOM_FALLBACK_NAMES = ['направи-стая', 'Направи стая'];
const ROLE_DEFINITIONS = [
    { key: 'owner', name: 'Собственик', color: 0xe74c3c, hoist: true, permissions: [PermissionsBitField.Flags.Administrator] },
    { key: 'admin', name: 'Администратор', color: 0xe67e22, hoist: true, permissions: [PermissionsBitField.Flags.Administrator] },
    { key: 'moderator', name: 'Модератор', color: 0xf1c40f, hoist: true, permissions: [PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.BanMembers, PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ManageChannels] },
    { key: 'cs2', name: 'CS2 играч', color: 0xf39c12 },
    { key: 'faceit', name: 'Faceit играч', color: 0xff5500 },
    { key: 'premier', name: 'Premier играч', color: 0x3498db },
    { key: 'battlefield6', name: 'Battlefield играч', color: 0x2980b9 },
    { key: 'warzone', name: 'Warzone играч', color: 0x16a085 },
    { key: 'dmz', name: 'DMZ играч', color: 0x27ae60 },
    { key: 'vanguard', name: 'Vanguard играч', color: 0x2ecc71 },
    { key: 'gta', name: 'GTA играч', color: 0x9b59b6 },
    { key: 'lfg', name: 'Покана за игра', color: 0x1abc9c },
    { key: 'streams', name: 'Стрийм известия', color: 0xe91e63 },
    { key: 'tournaments', name: 'Турнир известия', color: 0x2980b9 },
    { key: 'night', name: 'Нощна група', color: 0x34495e },
    { key: 'active', name: 'Активен играч', color: 0x95a5a6 },
    { key: 'regular', name: 'Редовен', color: 0x16a085 },
    { key: 'veteran', name: 'Ветеран', color: 0x8e44ad },
    { key: 'restricted', name: 'Ограничен достъп', color: 0x7f8c8d }
];

const SELF_ASSIGNABLE_ROLE_KEYS = ['cs2', 'faceit', 'premier', 'battlefield6', 'warzone', 'dmz', 'vanguard', 'gta', 'lfg', 'streams', 'tournaments', 'night'];

const CATEGORY_DEFINITIONS = [
    {
        name: '📢 ИНФОРМАЦИЯ',
        visibility: 'everyone',
        readOnly: true,
        channels: [
            { name: 'добре-дошли', type: ChannelType.GuildText },
            { name: 'правила', type: ChannelType.GuildText },
            { name: 'избор-на-роли', type: ChannelType.GuildText },
            { name: 'съобщения', type: ChannelType.GuildText, hiddenForRestricted: true },
            { name: 'новини', type: ChannelType.GuildText, hiddenForRestricted: true }
        ]
    },
    {
        name: '💬 ОБЩНОСТ',
        visibility: 'everyone',
        channels: [
            { name: 'общ-чат', type: ChannelType.GuildText },
            { name: 'търся-отбор', type: ChannelType.GuildText },
            { name: 'клипове', type: ChannelType.GuildText },
            { name: 'мемета', type: ChannelType.GuildText },
            { name: 'извън-темата', type: ChannelType.GuildText }
        ]
    },
    {
        name: '🔫 COUNTER-STRIKE 2',
        visibility: 'roles',
        roleKeys: ['cs2', 'faceit', 'premier'],
        channels: [
            { name: 'cs2-чат', type: ChannelType.GuildText },
            { name: 'faceit', type: ChannelType.GuildText },
            { name: 'premier', type: ChannelType.GuildText }
            ,
            { name: 'cs2-клипове', type: ChannelType.GuildText },
            { name: 'cs2-отбор-1', type: ChannelType.GuildVoice },
            { name: 'cs2-отбор-2', type: ChannelType.GuildVoice },
            { name: 'cs2-отбор-3', type: ChannelType.GuildVoice }
        ]
    },
    {
        name: '🎯 CALL OF DUTY',
        visibility: 'roles',
        roleKeys: ['warzone', 'dmz', 'vanguard'],
        channels: [
            { name: 'warzone', type: ChannelType.GuildText },
            { name: 'dmz', type: ChannelType.GuildText },
            { name: 'multiplayer', type: ChannelType.GuildText },
            { name: 'vanguard', type: ChannelType.GuildText },
            { name: 'warzone-отбор', type: ChannelType.GuildVoice },
            { name: 'dmz-отбор', type: ChannelType.GuildVoice },
            { name: 'cod-отбор', type: ChannelType.GuildVoice }
        ]
    },
    {
        name: '💥 BATTLEFIELD 6',
        visibility: 'roles',
        roleKeys: ['battlefield6'],
        channels: [
            { name: 'bf6-чат', type: ChannelType.GuildText },
            { name: 'отряд-за-bf6', type: ChannelType.GuildText },
            { name: 'bf6-клипове', type: ChannelType.GuildText },
            { name: 'bf6-отряд-1', type: ChannelType.GuildVoice },
            { name: 'bf6-отряд-2', type: ChannelType.GuildVoice }
        ]
    },
    {
        name: '🚓 GTA V',
        visibility: 'roles',
        roleKeys: ['gta'],
        channels: [
            { name: 'gta-чат', type: ChannelType.GuildText },
            { name: 'heists', type: ChannelType.GuildText },
            { name: 'rp', type: ChannelType.GuildText },
            { name: 'gta-отбор', type: ChannelType.GuildVoice },
            { name: 'heist-room', type: ChannelType.GuildVoice }
        ]
    },
    {
        name: '🔊 ГЛАСОВИ КАНАЛИ',
        visibility: 'everyone',
        channels: [
            { name: 'направи-стая', type: ChannelType.GuildVoice },
            { name: 'chill', type: ChannelType.GuildVoice },
            { name: 'late-night', type: ChannelType.GuildVoice },
            { name: 'музика', type: ChannelType.GuildVoice }
        ]
    },
    {
        name: '🏆 СЪБИТИЯ И ИГРИ',
        visibility: 'everyone',
        channels: [
            { name: 'турнири', type: ChannelType.GuildText },
            { name: 'събития', type: ChannelType.GuildText },
            { name: 'записване', type: ChannelType.GuildText },
            { name: 'резултати', type: ChannelType.GuildText }
        ]
    },
    {
        name: '🛡 ЕКИП',
        visibility: 'staff',
        channels: [
            { name: 'логове', type: ChannelType.GuildText },
            { name: 'модератори', type: ChannelType.GuildText },
            { name: 'екип-чат', type: ChannelType.GuildText },
            { name: 'сигнали', type: ChannelType.GuildText }
        ]
    }
];

const CONFIG_ALIASES = {
    logs: ['логове', 'logs'],
    roles: ['избор-на-роли', 'roles', 'self-roles'],
    createRoom: ['направи-стая', 'create-room', 'create room'],
    welcome: ['добре-дошли', 'welcome'],
    rules: ['правила', 'rules'],
    announcements: ['съобщения', 'announcements'],
    modChat: ['екип-чат', 'mod-chat', 'staff-chat']
};

const GAME_ROLE_BUTTON_ROWS = [
    ['cs2', 'faceit', 'premier', 'battlefield6'],
    ['warzone', 'dmz', 'vanguard', 'gta']
];

const NOTIFICATION_ROLE_BUTTON_ROWS = [
    ['lfg', 'streams', 'tournaments', 'night']
];

const app = express();

app.get('/', (_, res) => {
    res.send('Bot is running');
});

app.listen(PORT, () => {
    console.log(`HTTP server listening on port ${PORT}`);
});

function loadData() {
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            return JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Failed to load storage.json:', error);
    }
    return { guilds: {} };
}

function saveData(data) {
    try {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Failed to save storage.json:', error);
    }
}

function normalizeGuildState(state = {}) {
    return {
        ...state,
        channels: state.channels && typeof state.channels === 'object' && !Array.isArray(state.channels) ? state.channels : {},
        messages: state.messages && typeof state.messages === 'object' && !Array.isArray(state.messages) ? state.messages : {},
        tempVoiceChannels: Array.isArray(state.tempVoiceChannels) ? state.tempVoiceChannels : []
    };
}

function getGuildState(guildId) {
    const data = loadData();
    const normalizedState = normalizeGuildState(data.guilds[guildId]);
    if (JSON.stringify(data.guilds[guildId] || {}) !== JSON.stringify(normalizedState)) {
        data.guilds[guildId] = normalizedState;
        saveData(data);
    }
    return normalizedState;
}

function updateGuildState(guildId, updater) {
    const data = loadData();
    data.guilds[guildId] = normalizeGuildState(data.guilds[guildId]);
    updater(data.guilds[guildId]);
    saveData(data);
    return data.guilds[guildId];
}

function normalizeName(value) {
    return value.toLowerCase().trim();
}

function getChannelFromMention(raw) {
    const match = raw?.match(/^<#(\d+)>$/);
    return match ? match[1] : null;
}

function getRoleDefinitionByKey(key) {
    return ROLE_DEFINITIONS.find(role => role.key === key);
}

function getRoleByKey(guild, roleKey) {
    const definition = getRoleDefinitionByKey(roleKey);
    if (!definition) return null;
    return guild.roles.cache.find(role => role.name === definition.name) || null;
}

function getStaffRoles(guild) {
    return ['owner', 'admin', 'moderator']
        .map(roleKey => getRoleByKey(guild, roleKey))
        .filter(Boolean);
}

function getAccessRoles(guild, roleKeys = []) {
    return roleKeys
        .map(roleKey => getRoleByKey(guild, roleKey))
        .filter(Boolean);
}

function getConfiguredChannelId(guildId, channelKey) {
    const state = getGuildState(guildId);
    return state.channels?.[channelKey] || null;
}

function rememberChannel(guildId, channelKey, channelId) {
    updateGuildState(guildId, state => {
        state.channels[channelKey] = channelId;
    });
}

function rememberMessage(guildId, messageKey, messageId) {
    updateGuildState(guildId, state => {
        state.messages[messageKey] = messageId;
    });
}

function clearGuildState(guildId) {
    const data = loadData();
    delete data.guilds[guildId];
    saveData(data);
}

function trackTempVoiceChannel(guildId, channelId) {
    updateGuildState(guildId, state => {
        state.tempVoiceChannels = [...new Set([...(state.tempVoiceChannels || []), channelId])];
    });
}

function untrackTempVoiceChannel(guildId, channelId) {
    updateGuildState(guildId, state => {
        state.tempVoiceChannels = (state.tempVoiceChannels || []).filter(id => id !== channelId);
    });
}

function isTrackedTempVoiceChannel(guildId, channelId) {
    const state = getGuildState(guildId);
    return (state.tempVoiceChannels || []).includes(channelId);
}

function resolveConfiguredChannel(guild, channelKey) {
    const configuredId = getConfiguredChannelId(guild.id, channelKey);
    if (configuredId) {
        const configuredChannel = guild.channels.cache.get(configuredId);
        if (configuredChannel) return configuredChannel;
    }

    const aliases = CONFIG_ALIASES[channelKey] || [channelKey];
    return guild.channels.cache.find(channel => aliases.includes(normalizeName(channel.name))) || null;
}

function buildRulesEmbed() {
    return new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('TOP PLAYS BULGARIA | Правила на сървъра')
        .setDescription(
            [
                '📜 **ПРАВИЛА НА СЪРВЪРА / SERVER RULES**',
                '',
                'Добре дошли в **TOP PLAYS BULGARIA** 🎮',
                'Целта на сървъра е приятна атмосфера за игра, разговори, отборна координация и community активности за CS2, Call of Duty, Battlefield 6, GTA V и други gaming вечери.',
                '',
                '**1. Уважавайте всички членове.**',
                'Обиди, токсично поведение, расизъм, дискриминация и заплахи не се толерират.',
                '',
                '**2. Без spam и излишни ping-ове.**',
                'Flood, emoji spam, mass mention-и, безсмислени линкове и излишни ping-ове не са позволени.',
                '',
                '**3. Без реклама и съмнителни линкове без разрешение.**',
                'Забранена е реклама на сървъри, канали, услуги, продажба на акаунти, referral spam и съмнителни линкове без одобрение.',
                '',
                '**4. Забранени са cheat / exploit / hack теми.**',
                'Разпространение или обсъждане на cheat програми, exploit-и, boosting услуги и друго unfair съдържание е забранено.',
                '',
                '**5. Използвайте правилните канали.**',
                'Пишете по темата в съответните секции и не пренасяйте drama или спорни теми в gaming каналите.',
                '',
                '**6. Спазвайте ред във voice каналите.**',
                'Без излишен шум, прекъсване, soundboard spam, ear rape, обидни реплики и неподходящо съдържание.',
                '',
                '**7. LFG каналът се използва само по предназначение.**',
                'Публикувайте ясни покани за игра: игра, режим, брой места и дали търсите ranked/casual/voice.',
                '',
                '**8. Клипове, медия и стриймове се публикуват само в подходящите канали.**',
                'Без NSFW, шокиращо съдържание, clickbait, чужд спам или съдържание, което нарушава правилата на Discord.',
                '',
                '**9. Nickname-ите трябва да са четими и нормални.**',
                'Не използвайте обидни, подвеждащи, impersonation или unreadable nickname-и.',
                '',
                '**10. Не злоупотребявайте с @everyone / @here.**',
                'Разрешено е само за администрация.',
                '',
                '**11. Спазвайте Discord правилата.**',
                'Всички трябва да спазват Discord Terms of Service и Community Guidelines.',
                '',
                '**12. Турнирите и събитията се спазват коректно.**',
                'Записвания, резултати и участие се правят честно. Troll signup-и, fake резултати и умишлено саботиране не се приемат.',
                '',
                '**13. Наказанията се налагат по преценка на екипа.**',
                'При нарушения могат да се прилагат предупреждение, ограничен достъп, timeout/mute, kick или ban според тежестта и повторяемостта.',
                '',
                '**14. Ескалацията е стандартна, но не е задължително линейна.**',
                'По-леките нарушения обикновено минават през warning, а по-сериозните могат директно да доведат до ограничаване на достъп или ban.',
                '',
                '**15. Правилата могат да бъдат обновявани при нужда.**',
                '',
                '**Нашата Facebook група:**',
                'https://www.facebook.com/TopWarzoneBG',
                '',
                'Там публикуваме:',
                '• събития',
                '• новини',
                '• турнири',
                '• gaming клипове',
                '• community постове',
                '',
                '**16. Най-важното:**',
                'Забавлявайте се и уважавайте останалите.'
            ].join('\n')
        )
        .setFooter({ text: 'С влизането си в сървъра приемате тези правила и решенията на екипа.' });
}

function buildWelcomeEmbed(guild) {
    const rulesChannel = resolveConfiguredChannel(guild, 'rules');
    const rolesChannel = resolveConfiguredChannel(guild, 'roles');

    const rulesMention = rulesChannel ? `<#${rulesChannel.id}>` : '#правила';
    const rolesMention = rolesChannel ? `<#${rolesChannel.id}>` : '#избор-на-роли';

    return new EmbedBuilder()
        .setColor(0x00b894)
        .setTitle('Добре дошъл в TOP PLAYS BULGARIA')
        .setDescription(
            [
                'Частен gaming сървър за играчи, отбори и общност.',
                '',
                `• Прочети правилата в ${rulesMention}`,
                `• Избери си роли в ${rolesMention}`,
                '• Включи се в чата и гласовите канали',
                '• Игри в сървъра: CS2, Warzone, DMZ, Vanguard, Battlefield 6, GTA V и други',
                '',
                'Приятно прекарване и успех в игрите! 🎮'
            ].join('\n')
        )
        .setFooter({ text: `${guild.name} | Българска gaming общност` });
}

function buildGameRolesEmbed() {
    return new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('Избор на игрови роли')
        .setDescription(
            [
                'Избери игровите роли, които играеш най-често.',
                '',
                '**Игровите роли** отключват съответните gaming секции и voice канали.',
                '',
                'Игри в сървъра:',
                '• CS2',
                '• Warzone',
                '• DMZ',
                '• Vanguard',
                '• Battlefield 6',
                '• GTA V',
                '',
                'Натисни отново бутона, за да премахнеш роля.'
            ].join('\n')
        );
}

function buildNotificationRolesEmbed() {
    return new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('Избор на роли за известия')
        .setDescription(
            [
                'Избери роли за известия, ако искаш да получаваш по-точни ping-ове и update-и.',
                '',
                '• Покана за игра',
                '• Стрийм известия',
                '• Турнир известия',
                '• Нощна група',
                '',
                'Натисни отново бутона, за да премахнеш роля.'
            ].join('\n')
        );
}

function buildRoleButtons(roleRows) {
    return roleRows.map(roleKeys => {
        const row = new ActionRowBuilder();
        roleKeys.forEach(roleKey => {
            const role = getRoleDefinitionByKey(roleKey);
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`role:${roleKey}`)
                    .setLabel(role.name)
                    .setStyle(roleKey === 'lfg' || roleKey === 'streams' || roleKey === 'tournaments' || roleKey === 'night' ? ButtonStyle.Secondary : ButtonStyle.Primary)
            );
        });
        return row;
    });
}

async function ensureManagedMessage(guild, channelKey, messageKey, payload) {
    const channel = resolveConfiguredChannel(guild, channelKey);
    if (!channel || channel.type !== ChannelType.GuildText) return null;

    const state = getGuildState(guild.id);
    const existingMessageId = state.messages?.[messageKey];

    if (existingMessageId) {
        try {
            const existingMessage = await channel.messages.fetch(existingMessageId);
            await existingMessage.edit(payload);
            return existingMessage;
        } catch (_) {
        }
    }

    const sentMessage = await channel.send(payload);
    rememberMessage(guild.id, messageKey, sentMessage.id);
    return sentMessage;
}

async function sendLog(guild, payload) {
    const logChannel = resolveConfiguredChannel(guild, 'logs');
    if (!logChannel || logChannel.type !== ChannelType.GuildText) return;

    await logChannel.send(payload).catch(() => {});
}

function getBasePermissionsForType(channelType) {
    if (channelType === ChannelType.GuildVoice) {
        return {
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak],
            deny: []
        };
    }

    return {
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
        deny: []
    };
}

function getReadOnlyDenyForType(channelType) {
    if (channelType === ChannelType.GuildVoice) {
        return [];
    }

    return [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions];
}

function buildCategoryPermissions(guild, categoryConfig) {
    const overwrites = [];
    const everyoneId = guild.roles.everyone.id;

    if (categoryConfig.visibility === 'staff' || categoryConfig.visibility === 'roles') {
        overwrites.push({ id: everyoneId, deny: [PermissionsBitField.Flags.ViewChannel] });
    } else {
        overwrites.push({ id: everyoneId, allow: [PermissionsBitField.Flags.ViewChannel] });
    }

    getStaffRoles(guild).forEach(role => {
        overwrites.push({
            id: role.id,
            allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.Connect,
                PermissionsBitField.Flags.Speak,
                PermissionsBitField.Flags.ManageMessages
            ]
        });
    });

    if (categoryConfig.visibility === 'roles') {
        getAccessRoles(guild, categoryConfig.roleKeys).forEach(role => {
            overwrites.push({
                id: role.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            });
        });
    }

    const restrictedRole = getRoleByKey(guild, 'restricted');
    if (restrictedRole) {
        if (categoryConfig.name === 'INFO') {
            overwrites.push({
                id: restrictedRole.id,
                allow: [PermissionsBitField.Flags.ViewChannel],
                deny: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions]
            });
        } else {
            overwrites.push({
                id: restrictedRole.id,
                deny: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.AddReactions,
                    PermissionsBitField.Flags.Connect,
                    PermissionsBitField.Flags.Speak
                ]
            });
        }
    }

    return overwrites;
}

function buildChannelPermissions(guild, categoryConfig, channelConfig) {
    const overwrites = buildCategoryPermissions(guild, categoryConfig).map(overwrite => ({
        id: overwrite.id,
        allow: overwrite.allow || [],
        deny: overwrite.deny || []
    }));

    const everyoneOverwrite = overwrites.find(overwrite => overwrite.id === guild.roles.everyone.id);
    if (everyoneOverwrite && categoryConfig.visibility === 'everyone') {
        const base = getBasePermissionsForType(channelConfig.type);
        everyoneOverwrite.allow = [...new Set([...(everyoneOverwrite.allow || []), ...base.allow])];
        everyoneOverwrite.deny = [...new Set([...(everyoneOverwrite.deny || []), ...base.deny])];

        if (categoryConfig.readOnly || channelConfig.readOnly) {
            everyoneOverwrite.allow = everyoneOverwrite.allow.filter(permission => !getReadOnlyDenyForType(channelConfig.type).includes(permission));
            everyoneOverwrite.deny = [...new Set([...(everyoneOverwrite.deny || []), ...getReadOnlyDenyForType(channelConfig.type)])];
        }
    }

    if (channelConfig.type === ChannelType.GuildVoice) {
        if (categoryConfig.visibility === 'roles') {
            getAccessRoles(guild, categoryConfig.roleKeys).forEach(role => {
                const overwrite = overwrites.find(entry => entry.id === role.id);
                if (overwrite) {
                    overwrite.allow = [
                        ...new Set([
                            ...(overwrite.allow || []),
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.Connect,
                            PermissionsBitField.Flags.Speak
                        ])
                    ];
                }
            });
        }

        getStaffRoles(guild).forEach(role => {
            const overwrite = overwrites.find(entry => entry.id === role.id);
            if (overwrite) {
                overwrite.allow = [...new Set([...(overwrite.allow || []), PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak])];
            }
        });
    }

    const restrictedRole = getRoleByKey(guild, 'restricted');
    if (restrictedRole && channelConfig.hiddenForRestricted) {
        const existingRestricted = overwrites.find(overwrite => overwrite.id === restrictedRole.id);
        if (existingRestricted) {
            existingRestricted.deny = [...new Set([...(existingRestricted.deny || []), PermissionsBitField.Flags.ViewChannel])];
        } else {
            overwrites.push({
                id: restrictedRole.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            });
        }
    }

    return overwrites;
}

async function ensureRole(guild, roleConfig) {
    let role = guild.roles.cache.find(existing => existing.name === roleConfig.name);
    if (!role) {
        role = await guild.roles.create({
            name: roleConfig.name,
            color: roleConfig.color,
            hoist: roleConfig.hoist || false,
            permissions: roleConfig.permissions || []
        });
    } else {
        const updates = {};
        if (role.color !== roleConfig.color) updates.color = roleConfig.color;
        if (role.hoist !== Boolean(roleConfig.hoist)) updates.hoist = Boolean(roleConfig.hoist);
        if (roleConfig.permissions) {
            const targetPermissions = new PermissionsBitField(roleConfig.permissions);
            if (!role.permissions.equals(targetPermissions)) {
                updates.permissions = roleConfig.permissions;
            }
        }
        if (Object.keys(updates).length > 0) {
            await role.edit(updates);
        }
    }
    return role;
}

function getManagedCategoryNames() {
    return CATEGORY_DEFINITIONS.map(category => category.name);
}

function getManagedChannelDefinitions() {
    return CATEGORY_DEFINITIONS.flatMap(category =>
        category.channels.map(channel => ({
            categoryName: category.name,
            name: channel.name,
            type: channel.type
        }))
    );
}

async function deleteChannelTree(channel) {
    if (!channel) return;

    if (channel.type === ChannelType.GuildCategory) {
        const children = channel.children?.cache ? [...channel.children.cache.values()] : [];
        for (const child of children) {
            await child.delete().catch(() => {});
        }
    }

    await channel.delete().catch(() => {});
}

async function dedupeManagedCategories(guild) {
    for (const categoryName of getManagedCategoryNames()) {
        const categories = guild.channels.cache
            .filter(channel => channel.type === ChannelType.GuildCategory && channel.name === categoryName)
            .sort((left, right) => left.position - right.position);

        const duplicates = categories.size > 1 ? [...categories.values()].slice(1) : [];
        for (const duplicate of duplicates) {
            await deleteChannelTree(duplicate);
        }
    }
}

async function dedupeManagedChannels(guild, category, channelConfig) {
    const duplicates = guild.channels.cache
        .filter(channel =>
            channel.name === channelConfig.name &&
            channel.type === channelConfig.type &&
            channel.parentId === category.id
        )
        .sort((left, right) => left.position - right.position);

    if (duplicates.size > 1) {
        for (const duplicate of [...duplicates.values()].slice(1)) {
            await duplicate.delete().catch(() => {});
        }
    }

    return guild.channels.cache.find(
        channel =>
            channel.name === channelConfig.name &&
            channel.type === channelConfig.type &&
            channel.parentId === category.id
    ) || null;
}

async function deleteManagedChannelsOutsideExpectedCategories(guild) {
    const expectedMap = new Map(
        getManagedChannelDefinitions().map(definition => [`${definition.name}:${definition.type}`, definition.categoryName])
    );

    for (const channel of guild.channels.cache.values()) {
        const expectedCategoryName = expectedMap.get(`${channel.name}:${channel.type}`);
        if (!expectedCategoryName) continue;

        const parentName = channel.parent?.name || null;
        if (parentName !== expectedCategoryName) {
            await channel.delete().catch(() => {});
        }
    }
}

async function ensureCategory(guild, categoryConfig) {
    let category = guild.channels.cache.find(
        channel => channel.type === ChannelType.GuildCategory && channel.name === categoryConfig.name
    );

    const permissionOverwrites = buildCategoryPermissions(guild, categoryConfig);

    if (!category) {
        category = await guild.channels.create({
            name: categoryConfig.name,
            type: ChannelType.GuildCategory,
            permissionOverwrites
        });
    } else {
        await category.edit({ permissionOverwrites });
    }

    return category;
}

async function ensureChannel(guild, category, categoryConfig, channelConfig) {
    let channel = guild.channels.cache.find(
        existing => existing.name === channelConfig.name && existing.type === channelConfig.type
    );

    if (!channel) {
        channel = await guild.channels.create({
            name: channelConfig.name,
            type: channelConfig.type,
            parent: category.id
        });
    } else if (channel.parentId !== category.id) {
        await channel.setParent(category.id);
    }

    await channel.permissionOverwrites.set(buildChannelPermissions(guild, categoryConfig, channelConfig));

    return channel;
}

async function setupGamingTemplate(guild) {
    const roleMap = {};
    for (const roleConfig of ROLE_DEFINITIONS) {
        roleMap[roleConfig.key] = await ensureRole(guild, roleConfig);
    }

    const ownerRole = roleMap.owner;
    const adminRole = roleMap.admin;
    const moderatorRole = roleMap.moderator;
    if (ownerRole && adminRole && ownerRole.position <= adminRole.position) {
        await ownerRole.setPosition(adminRole.position + 1).catch(() => {});
    }
    if (adminRole && moderatorRole && adminRole.position <= moderatorRole.position) {
        await adminRole.setPosition(moderatorRole.position + 1).catch(() => {});
    }

    await dedupeManagedCategories(guild);
    await deleteManagedChannelsOutsideExpectedCategories(guild);

    for (const [categoryIndex, categoryConfig] of CATEGORY_DEFINITIONS.entries()) {
        const category = await ensureCategory(guild, categoryConfig);
        await category.setPosition(categoryIndex).catch(() => {});

        for (const [channelIndex, channelConfig] of categoryConfig.channels.entries()) {
            await ensureChannel(guild, category, categoryConfig, channelConfig);
            const channel = await dedupeManagedChannels(guild, category, channelConfig);
            if (channel) {
                await channel.setPosition(channelIndex).catch(() => {});
            }

            const configKey = CONFIG_CHANNEL_KEYS.find(key => {
                const aliases = CONFIG_ALIASES[key] || [key];
                return aliases.includes(normalizeName(channelConfig.name));
            });
            if (configKey && channel) rememberChannel(guild.id, configKey, channel.id);
        }
    }

    await ensureManagedMessage(guild, 'rules', 'rulesMessageId', {
        embeds: [buildRulesEmbed()]
    });

    await ensureManagedMessage(guild, 'welcome', 'welcomeMessageId', {
        embeds: [buildWelcomeEmbed(guild)]
    });

    await ensureManagedMessage(guild, 'roles', 'rolesMessageId', {
        embeds: [buildGameRolesEmbed()],
        components: buildRoleButtons(GAME_ROLE_BUTTON_ROWS)
    });

    await ensureManagedMessage(guild, 'roles', 'notificationRolesMessageId', {
        embeds: [buildNotificationRolesEmbed()],
        components: buildRoleButtons(NOTIFICATION_ROLE_BUTTON_ROWS)
    });
}

async function handleResetServer(message) {
    await message.reply(
        [
            '⚠️ **ПЪЛЕН RESET РЕЖИМ**',
            'Това ще премахне почти всички канали и роли, за да може ботът да изгради сървъра отначало.',
            'Напиши **RESET** до 15 секунди, за да потвърдиш.'
        ].join('\n')
    );

    const filter = incoming => incoming.author.id === message.author.id && incoming.content === 'RESET';
    const collector = message.channel.createMessageCollector({ filter, time: 15000, max: 1 });

    collector.on('collect', async () => {
        const statusMessage = await message.channel.send('⏳ Започвам изчистването за нов rebuild...');
        try {
            const guild = message.guild;
            const channels = await guild.channels.fetch();
            for (const [, channel] of channels) {
                if (!channel || channel.id === message.channel.id) continue;
                await channel.delete().catch(() => {});
            }

            const roles = await guild.roles.fetch();
            for (const [, role] of roles) {
                if (!role || role.id === guild.id || role.managed) continue;
                if (message.member.roles.highest.position <= role.position) continue;
                if (role.editable) {
                    await role.delete().catch(() => {});
                }
            }

            clearGuildState(guild.id);
            await statusMessage.edit('✅ Почистването завърши. Използвай `!setup-server`, за да изградиш новата структура.');
        } catch (error) {
            await statusMessage.edit(`❌ Reset неуспешен: ${error.message}`);
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            message.channel.send('⌛ Reset отменен. Не беше получено потвърждение.').catch(() => {});
        }
    });
}

async function handleSetupServer(message) {
    const statusMessage = await message.reply('⏳ Изграждам финалната българска gaming структура...');

    try {
        await setupGamingTemplate(message.guild);
        await sendLog(message.guild, {
            embeds: [
                new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('Setup завършен')
                    .setDescription(`Финалният setup беше изпълнен от ${message.author}.`)
                    .setTimestamp()
            ]
        });
        await statusMessage.edit('✅ Setup завърши. Новата българска gaming структура, ролите и utility съобщенията са активни.');
    } catch (error) {
        await statusMessage.edit(`❌ Setup неуспешен: ${error.message}`);
    }
}

async function handleConfigCommand(message, args) {
    const subcommand = args.shift()?.toLowerCase();

    if (subcommand === 'show') {
        const lines = CONFIG_CHANNEL_KEYS.map(key => {
            const channel = resolveConfiguredChannel(message.guild, key);
            return `• ${key}: ${channel ? `<#${channel.id}>` : 'няма зададен канал'}`;
        });
        await message.reply(lines.join('\n'));
        return;
    }

    if (subcommand === 'auto') {
        let updatedCount = 0;
        CONFIG_CHANNEL_KEYS.forEach(key => {
            const channel = resolveConfiguredChannel(message.guild, key);
            if (channel) {
                rememberChannel(message.guild.id, key, channel.id);
                updatedCount += 1;
            }
        });
        await message.reply(`✅ Автоматичното разпознаване завърши. Запазени са ${updatedCount} channel връзки.`);
        return;
    }

    if (subcommand === 'set') {
        const channelKey = args.shift();
        const rawChannel = args.shift();
        if (!channelKey || !rawChannel || !CONFIG_CHANNEL_KEYS.includes(channelKey)) {
            await message.reply('Използвай: `!config set <logs|roles|createRoom|welcome|rules|announcements|modChat> #channel`');
            return;
        }

        const channelId = getChannelFromMention(rawChannel);
        const channel = channelId ? message.guild.channels.cache.get(channelId) : null;
        if (!channel) {
            await message.reply('❌ Моля, маркирай валиден канал.');
            return;
        }

        rememberChannel(message.guild.id, channelKey, channel.id);
        await message.reply(`✅ Запазих ${channelKey} -> ${channel}.`);
        return;
    }

    await message.reply(
        [
            '`!config show`',
            '`!config auto`',
            '`!config set logs #логове`',
            '`!config set roles #избор-на-роли`',
            '`!config set createRoom #направи-стая`'
        ].join('\n')
    );
}

client.once('ready', () => {
    console.log(`Gaming setup bot online: ${client.user.tag}`);
});

client.on('guildMemberAdd', async member => {
    const welcomeChannel = resolveConfiguredChannel(member.guild, 'welcome');
    if (welcomeChannel && welcomeChannel.type === ChannelType.GuildText) {
        await welcomeChannel.send({
            content: `${member}`,
            embeds: [
                new EmbedBuilder()
                    .setColor(0x00cec9)
                    .setTitle(`Добре дошъл, ${member.displayName}!`)
                    .setDescription(
                        [
                            'Радваме се, че си тук.',
                            '',
                            `• Прегледай <#${resolveConfiguredChannel(member.guild, 'rules')?.id || welcomeChannel.id}>`,
                            `• Избери роли от <#${resolveConfiguredChannel(member.guild, 'roles')?.id || welcomeChannel.id}>`,
                            '• Влез в гласов канал и използвай `направи-стая`, ако ти трябва отделен room'
                        ].join('\n')
                    )
                    .setThumbnail(member.user.displayAvatarURL())
                    .setTimestamp()
            ]
        }).catch(() => {});
    }

    await sendLog(member.guild, {
        embeds: [
            new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('Нов член')
                .setDescription(`${member.user.tag} влезе в сървъра.`)
                .setTimestamp()
        ]
    });
});

client.on('guildMemberRemove', async member => {
    await sendLog(member.guild, {
        embeds: [
                new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('Напуснал член')
                    .setDescription(`${member.user.tag} напусна сървъра.`)
                    .setTimestamp()
        ]
    });
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        const joinedChannel = newState.channel;
        const leftChannel = oldState.channel;

        if (joinedChannel) {
            const configuredCreateRoom = resolveConfiguredChannel(newState.guild, 'createRoom');
            const isCreateRoom =
                (configuredCreateRoom && joinedChannel.id === configuredCreateRoom.id) ||
                CREATE_ROOM_FALLBACK_NAMES.includes(joinedChannel.name);

            if (isCreateRoom) {
                const category = joinedChannel.parent;
                const restrictedRole = getRoleByKey(newState.guild, 'restricted');
                const tempPermissions = [
                    {
                        id: newState.guild.roles.everyone.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak]
                    },
                    {
                        id: newState.member.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.Connect,
                            PermissionsBitField.Flags.Speak,
                            PermissionsBitField.Flags.ManageChannels,
                            PermissionsBitField.Flags.MoveMembers
                        ]
                    }
                ];

                getStaffRoles(newState.guild).forEach(role => {
                    tempPermissions.push({
                        id: role.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.Connect,
                            PermissionsBitField.Flags.Speak,
                            PermissionsBitField.Flags.MoveMembers
                        ]
                    });
                });

                if (restrictedRole) {
                    tempPermissions.push({
                        id: restrictedRole.id,
                        deny: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.Connect,
                            PermissionsBitField.Flags.Speak
                        ]
                    });
                }

                const tempChannel = await newState.guild.channels.create({
                    name: `стая-${newState.member.displayName}`,
                    type: ChannelType.GuildVoice,
                    parent: category?.id,
                    permissionOverwrites: tempPermissions
                });

                trackTempVoiceChannel(newState.guild.id, tempChannel.id);
                await newState.member.voice.setChannel(tempChannel).catch(() => {});

                await sendLog(newState.guild, {
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x3498db)
                            .setTitle('Създадена voice стая')
                            .setDescription(`${newState.member} създаде ${tempChannel}.`)
                            .setTimestamp()
                    ]
                });
            }
        }

        if (leftChannel && isTrackedTempVoiceChannel(oldState.guild.id, leftChannel.id) && leftChannel.members.size === 0) {
            await leftChannel.delete().catch(() => {});
            untrackTempVoiceChannel(oldState.guild.id, leftChannel.id);
        }
    } catch (error) {
        console.error('voiceStateUpdate error:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('role:')) return;

    const roleKey = interaction.customId.split(':')[1];
    if (!SELF_ASSIGNABLE_ROLE_KEYS.includes(roleKey)) {
        await interaction.reply({ content: '❌ Тази роля не е за самостоятелен избор.', ephemeral: true });
        return;
    }

    const role = getRoleByKey(interaction.guild, roleKey);
    if (!role) {
        await interaction.reply({ content: '❌ Ролята не е намерена. Пусни `!setup-server` отново.', ephemeral: true });
        return;
    }

    try {
        if (interaction.member.roles.cache.has(role.id)) {
            await interaction.member.roles.remove(role);
            await interaction.reply({ content: `➖ Премахната роля: **${role.name}**`, ephemeral: true });
        } else {
            await interaction.member.roles.add(role);
            await interaction.reply({ content: `➕ Добавена роля: **${role.name}**`, ephemeral: true });
        }
    } catch (error) {
        console.error('role button error:', error);
        await interaction.reply({ content: '❌ Ботът няма права да управлява тази роля.', ephemeral: true });
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild || !message.content.startsWith(PREFIX)) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    if (command === 'reset-server') {
        await handleResetServer(message);
        return;
    }

    if (command === 'setup-server') {
        await handleSetupServer(message);
        return;
    }

    if (command === 'config') {
        await handleConfigCommand(message, args);
    }
});

client.login(process.env.DISCORD_TOKEN);
