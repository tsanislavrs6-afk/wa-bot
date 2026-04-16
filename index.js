require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
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

const PREFIX = '!';
const PORT = process.env.PORT || 3000;
const STORAGE_FILE = path.join(__dirname, 'storage.json');
const PROCESS_ID = `${process.pid}-${Date.now()}`;
const STARTUP_GRACE_PERIOD_MS = 20000;
const LOCK_TTL_MS = 10 * 60 * 1000;
const COMMAND_TTL_MS = 30000;

let readyAt = 0;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const app = express();
app.get('/', (_, res) => res.send('Ботът работи'));
app.listen(PORT, () => {
    console.log(`HTTP сървърът слуша на порт ${PORT}`);
});

const CONFIG_KEYS = ['logs', 'roles', 'createRoom', 'welcome', 'rules', 'announcements', 'staffChat'];
const CONFIG_LABELS = {
    logs: 'канал за логове',
    roles: 'канал за роли',
    createRoom: 'канал за създаване на стая',
    welcome: 'канал за добре дошли',
    rules: 'канал за правила',
    announcements: 'канал за съобщения',
    staffChat: 'екип чат'
};

const CONFIG_ALIASES = {
    logs: ['логове'],
    roles: ['избор-на-роли'],
    createRoom: ['направи-стая'],
    welcome: ['добре-дошли'],
    rules: ['правила'],
    announcements: ['съобщения'],
    staffChat: ['екип-чат']
};

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

const GAME_ROLE_KEYS = ['cs2', 'faceit', 'premier', 'battlefield6', 'warzone', 'dmz', 'vanguard', 'gta'];
const NOTIFICATION_ROLE_KEYS = ['lfg', 'streams', 'tournaments', 'night'];
const SELF_ASSIGNABLE_ROLE_KEYS = [...GAME_ROLE_KEYS, ...NOTIFICATION_ROLE_KEYS];

const GAME_ROLE_ROWS = [
    ['cs2', 'faceit', 'premier', 'battlefield6'],
    ['warzone', 'dmz', 'vanguard', 'gta']
];

const NOTIFICATION_ROLE_ROWS = [
    ['lfg', 'streams', 'tournaments', 'night']
];

const TEMPLATE = [
    {
        name: '📢 ИНФОРМАЦИЯ',
        visibility: 'everyone',
        readOnly: true,
        channels: [
            { name: 'добре-дошли', type: ChannelType.GuildText, configKey: 'welcome' },
            { name: 'правила', type: ChannelType.GuildText, configKey: 'rules' },
            { name: 'избор-на-роли', type: ChannelType.GuildText, configKey: 'roles' },
            { name: 'съобщения', type: ChannelType.GuildText, configKey: 'announcements', hiddenForRestricted: true },
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
            { name: 'premier', type: ChannelType.GuildText },
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
            { name: 'направи-стая', type: ChannelType.GuildVoice, configKey: 'createRoom' },
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
            { name: 'логове', type: ChannelType.GuildText, configKey: 'logs' },
            { name: 'модератори', type: ChannelType.GuildText },
            { name: 'екип-чат', type: ChannelType.GuildText, configKey: 'staffChat' },
            { name: 'сигнали', type: ChannelType.GuildText }
        ]
    }
];

function createEmptyGuildState() {
    return {
        config: { channels: {} },
        messages: {},
        tempVoiceChannels: [],
        locks: {},
        recentCommands: {}
    };
}

function loadStorage() {
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            return JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
        }
    } catch (error) {
        console.error('Грешка при зареждане на storage.json:', error);
    }
    return { guilds: {} };
}

function saveStorage(storage) {
    try {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(storage, null, 2));
    } catch (error) {
        console.error('Грешка при запис в storage.json:', error);
    }
}

function normalizeGuildState(state) {
    const normalized = createEmptyGuildState();
    const source = state && typeof state === 'object' ? state : {};

    if (source.config && typeof source.config === 'object' && !Array.isArray(source.config)) {
        normalized.config.channels = source.config.channels && typeof source.config.channels === 'object' && !Array.isArray(source.config.channels)
            ? source.config.channels
            : {};
    }

    normalized.messages = source.messages && typeof source.messages === 'object' && !Array.isArray(source.messages) ? source.messages : {};
    normalized.tempVoiceChannels = Array.isArray(source.tempVoiceChannels) ? source.tempVoiceChannels : [];
    normalized.locks = source.locks && typeof source.locks === 'object' && !Array.isArray(source.locks) ? source.locks : {};
    normalized.recentCommands = source.recentCommands && typeof source.recentCommands === 'object' && !Array.isArray(source.recentCommands)
        ? source.recentCommands
        : {};

    return normalized;
}

function cleanupExpiredState(state) {
    const now = Date.now();

    Object.keys(state.locks || {}).forEach(key => {
        if (!state.locks[key]?.timestamp || now - state.locks[key].timestamp > LOCK_TTL_MS) {
            delete state.locks[key];
        }
    });

    Object.keys(state.recentCommands || {}).forEach(key => {
        if (!state.recentCommands[key]?.timestamp || now - state.recentCommands[key].timestamp > COMMAND_TTL_MS) {
            delete state.recentCommands[key];
        }
    });
}

function mutateGuildState(guildId, mutator) {
    const storage = loadStorage();
    storage.guilds[guildId] = normalizeGuildState(storage.guilds[guildId]);
    cleanupExpiredState(storage.guilds[guildId]);
    mutator(storage.guilds[guildId]);
    saveStorage(storage);
    return storage.guilds[guildId];
}

function getGuildState(guildId) {
    const storage = loadStorage();
    const normalized = normalizeGuildState(storage.guilds[guildId]);
    cleanupExpiredState(normalized);

    if (JSON.stringify(storage.guilds[guildId] || {}) !== JSON.stringify(normalized)) {
        storage.guilds[guildId] = normalized;
        saveStorage(storage);
    }

    return normalized;
}

function clearGuildState(guildId) {
    const storage = loadStorage();
    delete storage.guilds[guildId];
    saveStorage(storage);
}

function normalizeName(value) {
    return String(value || '').toLowerCase().trim();
}

function mentionToChannelId(value) {
    return value?.match(/^<#(\d+)>$/)?.[1] || null;
}

function getRoleDefinition(roleKey) {
    return ROLE_DEFINITIONS.find(role => role.key === roleKey) || null;
}

function getRoleByKey(guild, roleKey) {
    const definition = getRoleDefinition(roleKey);
    if (!definition) return null;
    return guild.roles.cache.find(role => role.name === definition.name) || null;
}

function getStaffRoles(guild) {
    return ['owner', 'admin', 'moderator'].map(roleKey => getRoleByKey(guild, roleKey)).filter(Boolean);
}

function getAccessRoles(guild, roleKeys = []) {
    return roleKeys.map(roleKey => getRoleByKey(guild, roleKey)).filter(Boolean);
}

function getConfiguredChannel(guild, configKey) {
    const state = getGuildState(guild.id);
    const storedId = state.config.channels[configKey];
    if (storedId) {
        const channel = guild.channels.cache.get(storedId);
        if (channel) return channel;
    }

    const aliases = CONFIG_ALIASES[configKey] || [];
    return guild.channels.cache.find(channel => aliases.includes(normalizeName(channel.name))) || null;
}

function rememberChannel(guildId, configKey, channelId) {
    mutateGuildState(guildId, state => {
        state.config.channels[configKey] = channelId;
    });
}

function rememberMessage(guildId, messageKey, messageId) {
    mutateGuildState(guildId, state => {
        state.messages[messageKey] = messageId;
    });
}

function trackTempVoiceChannel(guildId, channelId) {
    mutateGuildState(guildId, state => {
        state.tempVoiceChannels = [...new Set([...(state.tempVoiceChannels || []), channelId])];
    });
}

function untrackTempVoiceChannel(guildId, channelId) {
    mutateGuildState(guildId, state => {
        state.tempVoiceChannels = (state.tempVoiceChannels || []).filter(id => id !== channelId);
    });
}

function isTrackedTempVoiceChannel(guildId, channelId) {
    return getGuildState(guildId).tempVoiceChannels.includes(channelId);
}

function acquireGuildLock(guildId, lockKey) {
    let acquired = false;

    mutateGuildState(guildId, state => {
        if (!state.locks[lockKey]) {
            state.locks[lockKey] = { owner: PROCESS_ID, timestamp: Date.now() };
            acquired = true;
        }
    });

    return acquired;
}

function releaseGuildLock(guildId, lockKey) {
    mutateGuildState(guildId, state => {
        if (state.locks[lockKey]?.owner === PROCESS_ID) {
            delete state.locks[lockKey];
        }
    });
}

function hasGuildLock(guildId, lockKey) {
    return Boolean(getGuildState(guildId).locks[lockKey]);
}

function refreshGuildLock(guildId, lockKey) {
    mutateGuildState(guildId, state => {
        if (state.locks[lockKey]?.owner === PROCESS_ID) {
            state.locks[lockKey].timestamp = Date.now();
        }
    });
}

function registerCommandExecution(guildId, messageId) {
    let accepted = false;

    mutateGuildState(guildId, state => {
        if (!state.recentCommands[messageId]) {
            state.recentCommands[messageId] = { owner: PROCESS_ID, timestamp: Date.now() };
            accepted = true;
        }
    });

    return accepted;
}

function isInGracePeriod() {
    return readyAt > 0 && Date.now() - readyAt < STARTUP_GRACE_PERIOD_MS;
}

function buildRulesEmbed() {
    return new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('TOP PLAYS BULGARIA | Правила на сървъра')
        .setDescription(
            [
                '📜 **ПРАВИЛА НА СЪРВЪРА**',
                '',
                'Добре дошли в **TOP PLAYS BULGARIA** 🎮',
                'Целта на сървъра е приятна атмосфера за игра, разговори, отборна координация и общностни активности.',
                '',
                '**1. Уважавайте всички членове.**',
                'Обиди, токсично поведение, расизъм, дискриминация и заплахи не се толерират.',
                '',
                '**2. Без spam и излишни ping-ове.**',
                'Flood, emoji spam, масови споменавания, безсмислени линкове и излишни ping-ове не са позволени.',
                '',
                '**3. Без реклама и съмнителни линкове без разрешение.**',
                'Забранена е реклама на сървъри, канали, услуги, продажба на акаунти и съмнителни линкове без одобрение.',
                '',
                '**4. Забранени са cheat / exploit / hack теми.**',
                'Разпространение или обсъждане на cheat програми, exploit-и, boosting услуги и друго нечестно съдържание е забранено.',
                '',
                '**5. Използвайте правилните канали.**',
                'Пишете по темата в съответните секции и не пренасяйте излишни драми в гейминг каналите.',
                '',
                '**6. Спазвайте ред във гласовите канали.**',
                'Без излишен шум, прекъсване, soundboard spam, ear rape и неподходящо съдържание.',
                '',
                '**7. Каналът за търсене на отбор се използва само по предназначение.**',
                'Публикувайте ясни покани за игра: игра, режим, брой места и дали търсите състезателна игра или нормална игра.',
                '',
                '**8. Клипове, медия и стриймове се публикуват само в подходящите канали.**',
                'Без NSFW, шокиращо съдържание, чужд спам или съдържание, което нарушава правилата на Discord.',
                '',
                '**9. Потребителските имена трябва да са четими и нормални.**',
                'Не използвайте обидни, подвеждащи, имитиращи други хора или нечетими имена.',
                '',
                '**10. Не злоупотребявайте с @everyone / @here.**',
                'Разрешено е само за администрация.',
                '',
                '**11. Спазвайте правилата на Discord.**',
                'Всички трябва да спазват Discord Terms of Service и Community Guidelines.',
                '',
                '**12. Турнирите и събитията се спазват коректно.**',
                'Фалшиви записвания, неверни резултати и умишлено саботиране не се приемат.',
                '',
                '**13. Наказанията се налагат по преценка на екипа.**',
                'При нарушения могат да се прилагат предупреждение, ограничен достъп, timeout, mute, изгонване или ban.',
                '',
                '**14. Ескалацията не е задължително линейна.**',
                'По-сериозните нарушения могат директно да доведат до ограничаване на достъп или ban.',
                '',
                '**Нашата Facebook група:**',
                'https://www.facebook.com/TopWarzoneBG',
                '',
                'Там публикуваме:',
                '• събития',
                '• новини',
                '• турнири',
                '• гейминг клипове',
                '• постове за общността',
                '',
                '**Най-важното:**',
                'Забавлявайте се и уважавайте останалите.'
            ].join('\n')
        )
        .setFooter({ text: 'С влизането си в сървъра приемате тези правила и решенията на екипа.' });
}

function buildWelcomeEmbed(guild) {
    const rulesChannel = getConfiguredChannel(guild, 'rules');
    const rolesChannel = getConfiguredChannel(guild, 'roles');

    return new EmbedBuilder()
        .setColor(0x00b894)
        .setTitle('Добре дошъл в TOP PLAYS BULGARIA')
        .setDescription(
            [
                'Частен гейминг сървър за играчи, отбори и общност.',
                '',
                `• Прочети правилата в ${rulesChannel ? `<#${rulesChannel.id}>` : '#правила'}`,
                `• Избери си роли в ${rolesChannel ? `<#${rolesChannel.id}>` : '#избор-на-роли'}`,
                '• Включи се в чата и гласовите канали',
                '• Игри в сървъра: CS2, Warzone, DMZ, Vanguard, Battlefield 6, GTA V и други',
                '',
                'Приятно прекарване и успех в игрите! 🎮'
            ].join('\n')
        )
        .setFooter({ text: `${guild.name} | Българска гейминг общност` });
}

function buildGameRolesEmbed() {
    return new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('Избор на игрови роли')
        .setDescription(
            [
                'Избери игровите роли, които играеш най-често.',
                '',
                'Игровите роли отключват съответните гейминг секции и гласови канали.',
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
                'Избери роли за известия, ако искаш да получаваш по-точни ping-ове и известия.',
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
    return roleRows.map(rowKeys => {
        const row = new ActionRowBuilder();

        rowKeys.forEach(roleKey => {
            const role = getRoleDefinition(roleKey);
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`role:${roleKey}`)
                    .setLabel(role.name)
                    .setStyle(NOTIFICATION_ROLE_KEYS.includes(roleKey) ? ButtonStyle.Secondary : ButtonStyle.Primary)
            );
        });

        return row;
    });
}

async function sendLog(guild, embed) {
    const logChannel = getConfiguredChannel(guild, 'logs');
    if (!logChannel || logChannel.type !== ChannelType.GuildText) return;
    await logChannel.send({ embeds: [embed] }).catch(() => {});
}

function getCategoryPermissions(guild, categoryConfig) {
    const overwrites = [];
    const everyoneId = guild.roles.everyone.id;
    const restrictedRole = getRoleByKey(guild, 'restricted');

    if (categoryConfig.visibility === 'everyone') {
        overwrites.push({ id: everyoneId, allow: [PermissionsBitField.Flags.ViewChannel] });
    } else {
        overwrites.push({ id: everyoneId, deny: [PermissionsBitField.Flags.ViewChannel] });
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
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak]
            });
        });
    }

    if (restrictedRole) {
        if (categoryConfig.name === '📢 ИНФОРМАЦИЯ') {
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

function getChannelPermissions(guild, categoryConfig, channelConfig) {
    const overwrites = getCategoryPermissions(guild, categoryConfig).map(overwrite => ({
        id: overwrite.id,
        allow: overwrite.allow || [],
        deny: overwrite.deny || []
    }));

    const everyoneOverwrite = overwrites.find(overwrite => overwrite.id === guild.roles.everyone.id);
    if (everyoneOverwrite && categoryConfig.visibility === 'everyone') {
        if (channelConfig.type === ChannelType.GuildText) {
            everyoneOverwrite.allow = [...new Set([...(everyoneOverwrite.allow || []), PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages])];
            if (categoryConfig.readOnly) {
                everyoneOverwrite.allow = everyoneOverwrite.allow.filter(permission => permission !== PermissionsBitField.Flags.SendMessages);
                everyoneOverwrite.deny = [...new Set([...(everyoneOverwrite.deny || []), PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AddReactions])];
            }
        }

        if (channelConfig.type === ChannelType.GuildVoice) {
            everyoneOverwrite.allow = [...new Set([...(everyoneOverwrite.allow || []), PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak])];
        }
    }

    const restrictedRole = getRoleByKey(guild, 'restricted');
    if (restrictedRole && channelConfig.hiddenForRestricted) {
        const overwrite = overwrites.find(entry => entry.id === restrictedRole.id);
        if (overwrite) {
            overwrite.deny = [...new Set([...(overwrite.deny || []), PermissionsBitField.Flags.ViewChannel])];
        }
    }

    return overwrites;
}

async function ensureRole(guild, roleConfig) {
    let role = guild.roles.cache.find(existing => existing.name === roleConfig.name);

    if (!role) {
        return guild.roles.create({
            name: roleConfig.name,
            color: roleConfig.color,
            hoist: Boolean(roleConfig.hoist),
            permissions: roleConfig.permissions || []
        });
    }

    const updates = {};
    if (role.color !== roleConfig.color) updates.color = roleConfig.color;
    if (role.hoist !== Boolean(roleConfig.hoist)) updates.hoist = Boolean(roleConfig.hoist);

    if (roleConfig.permissions) {
        const desired = new PermissionsBitField(roleConfig.permissions);
        if (!role.permissions.equals(desired)) {
            updates.permissions = roleConfig.permissions;
        }
    }

    if (Object.keys(updates).length > 0) {
        await role.edit(updates);
    }

    return role;
}

async function deleteChannel(channel) {
    if (!channel) return;
    await channel.delete().catch(() => {});
}

async function removeManagedDuplicates(guild) {
    for (const categoryConfig of TEMPLATE) {
        const matchingCategories = guild.channels.cache
            .filter(channel => channel.type === ChannelType.GuildCategory && channel.name === categoryConfig.name)
            .sort((left, right) => left.position - right.position);

        if (matchingCategories.size > 1) {
            for (const duplicate of [...matchingCategories.values()].slice(1)) {
                const children = duplicate.children?.cache ? [...duplicate.children.cache.values()] : [];
                for (const child of children) {
                    await deleteChannel(child);
                }
                await deleteChannel(duplicate);
            }
        }
    }
}

async function deleteChannelsInWrongParent(guild) {
    const expectedMap = new Map();
    TEMPLATE.forEach(categoryConfig => {
        categoryConfig.channels.forEach(channelConfig => {
            expectedMap.set(`${channelConfig.name}:${channelConfig.type}`, categoryConfig.name);
        });
    });

    for (const channel of guild.channels.cache.values()) {
        const expectedParent = expectedMap.get(`${channel.name}:${channel.type}`);
        if (!expectedParent) continue;
        if ((channel.parent?.name || null) !== expectedParent) {
            await deleteChannel(channel);
        }
    }
}

async function ensureCategory(guild, categoryConfig) {
    const permissions = getCategoryPermissions(guild, categoryConfig);
    let category = guild.channels.cache.find(channel => channel.type === ChannelType.GuildCategory && channel.name === categoryConfig.name);

    if (!category) {
        category = await guild.channels.create({
            name: categoryConfig.name,
            type: ChannelType.GuildCategory,
            permissionOverwrites: permissions
        });
    } else {
        await category.edit({ permissionOverwrites: permissions });
    }

    return category;
}

async function ensureChannel(guild, category, categoryConfig, channelConfig) {
    let channel = guild.channels.cache.find(existing =>
        existing.name === channelConfig.name &&
        existing.type === channelConfig.type &&
        existing.parentId === category.id
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

    await channel.permissionOverwrites.set(getChannelPermissions(guild, categoryConfig, channelConfig));
    return channel;
}

async function removeChannelDuplicatesInCategory(guild, category, channelConfig) {
    const duplicates = guild.channels.cache
        .filter(channel =>
            channel.name === channelConfig.name &&
            channel.type === channelConfig.type &&
            channel.parentId === category.id
        )
        .sort((left, right) => left.position - right.position);

    if (duplicates.size > 1) {
        for (const duplicate of [...duplicates.values()].slice(1)) {
            await deleteChannel(duplicate);
        }
    }

    return guild.channels.cache.find(channel =>
        channel.name === channelConfig.name &&
        channel.type === channelConfig.type &&
        channel.parentId === category.id
    ) || null;
}

async function ensureManagedMessage(guild, channelKey, messageKey, payload) {
    const channel = getConfiguredChannel(guild, channelKey);
    if (!channel || channel.type !== ChannelType.GuildText) return null;

    const state = getGuildState(guild.id);
    const existingId = state.messages[messageKey];

    if (existingId) {
        try {
            const existingMessage = await channel.messages.fetch(existingId);
            await existingMessage.edit(payload);
            return existingMessage;
        } catch (_) {
        }
    }

    const sentMessage = await channel.send(payload);
    rememberMessage(guild.id, messageKey, sentMessage.id);
    return sentMessage;
}

async function setupGuild(guild) {
    for (const roleConfig of ROLE_DEFINITIONS) {
        await ensureRole(guild, roleConfig);
    }

    await removeManagedDuplicates(guild);
    await deleteChannelsInWrongParent(guild);

    for (const [categoryIndex, categoryConfig] of TEMPLATE.entries()) {
        refreshGuildLock(guild.id, 'setup');
        const category = await ensureCategory(guild, categoryConfig);
        await category.setPosition(categoryIndex).catch(() => {});

        for (const [channelIndex, channelConfig] of categoryConfig.channels.entries()) {
            await ensureChannel(guild, category, categoryConfig, channelConfig);
            const channel = await removeChannelDuplicatesInCategory(guild, category, channelConfig);

            if (channel) {
                await channel.setPosition(channelIndex).catch(() => {});
                if (channelConfig.configKey) {
                    rememberChannel(guild.id, channelConfig.configKey, channel.id);
                }
            }
        }
    }

    await ensureManagedMessage(guild, 'welcome', 'welcomeEmbed', {
        embeds: [buildWelcomeEmbed(guild)]
    });

    await ensureManagedMessage(guild, 'rules', 'rulesEmbed', {
        embeds: [buildRulesEmbed()]
    });

    await ensureManagedMessage(guild, 'roles', 'gameRolesEmbed', {
        embeds: [buildGameRolesEmbed()],
        components: buildRoleButtons(GAME_ROLE_ROWS)
    });

    await ensureManagedMessage(guild, 'roles', 'notificationRolesEmbed', {
        embeds: [buildNotificationRolesEmbed()],
        components: buildRoleButtons(NOTIFICATION_ROLE_ROWS)
    });
}

async function handleSetupServer(message) {
    if (hasGuildLock(message.guild.id, 'setup')) {
        await message.reply('⏳ Setup вече се изпълнява.');
        return;
    }

    if (hasGuildLock(message.guild.id, 'reset')) {
        await message.reply('⏳ В момента тече нулиране на сървъра. Изчакай да приключи.');
        return;
    }

    if (!acquireGuildLock(message.guild.id, 'setup')) {
        await message.reply('⏳ Setup вече се изпълнява.');
        return;
    }

    const statusMessage = await message.reply('⏳ Изграждам новата гейминг структура на сървъра...');

    try {
        await setupGuild(message.guild);
        await sendLog(
            message.guild,
            new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('Настройката завърши')
                .setDescription(`Настройката на сървъра беше изпълнена от ${message.author}.`)
                .setTimestamp()
        );
        await statusMessage.edit('✅ Настройката на сървъра завърши успешно. Новата структура, ролите и автоматичните съобщения са активни.');
    } catch (error) {
        await statusMessage.edit(`❌ Настройката е неуспешна: ${error.message}`);
    } finally {
        releaseGuildLock(message.guild.id, 'setup');
    }
}

async function handleResetServer(message) {
    if (hasGuildLock(message.guild.id, 'setup') || hasGuildLock(message.guild.id, 'reset')) {
        await message.reply('⏳ В момента вече се изпълнява настройка или нулиране на този сървър.');
        return;
    }

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
        if (!acquireGuildLock(message.guild.id, 'reset')) {
            await message.channel.send('⏳ Нулирането вече се изпълнява.');
            return;
        }

        const statusMessage = await message.channel.send('⏳ Започвам изчистването за нова структура...');

        try {
            const channels = await message.guild.channels.fetch();
            for (const [, channel] of channels) {
                if (!channel || channel.id === message.channel.id) continue;
                await deleteChannel(channel);
            }

            const roles = await message.guild.roles.fetch();
            for (const [, role] of roles) {
                if (!role || role.id === message.guild.id || role.managed) continue;
                if (role.editable) {
                    await role.delete().catch(() => {});
                }
            }

            clearGuildState(message.guild.id);
            await statusMessage.edit('✅ Почистването завърши. Използвай `!setup-server`, за да изградиш новата структура.');
        } catch (error) {
            await statusMessage.edit(`❌ Нулирането е неуспешно: ${error.message}`);
        } finally {
            releaseGuildLock(message.guild.id, 'reset');
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            message.channel.send('⌛ Нулирането е отменено. Не беше получено потвърждение.').catch(() => {});
        }
    });
}

async function handleConfigCommand(message, args) {
    if (hasGuildLock(message.guild.id, 'config')) {
        await message.reply('⏳ Конфигурацията вече се обработва.');
        return;
    }

    if (!acquireGuildLock(message.guild.id, 'config')) {
        await message.reply('⏳ Конфигурацията вече се обработва.');
        return;
    }

    try {
        const subcommand = args.shift()?.toLowerCase();

        if (subcommand === 'show') {
            const lines = CONFIG_KEYS.map(key => {
                const channel = getConfiguredChannel(message.guild, key);
                return `• ${CONFIG_LABELS[key]}: ${channel ? `<#${channel.id}>` : 'няма зададен канал'}`;
            });
            await message.reply(lines.join('\n'));
            return;
        }

        if (subcommand === 'auto') {
            let count = 0;

            CONFIG_KEYS.forEach(key => {
                const aliases = CONFIG_ALIASES[key] || [];
                const channel = message.guild.channels.cache.find(existing => aliases.includes(normalizeName(existing.name)));
                if (channel) {
                    rememberChannel(message.guild.id, key, channel.id);
                    count += 1;
                }
            });

            await message.reply(`✅ Автоматичното разпознаване завърши. Запазени са ${count} връзки към канали.`);
            return;
        }

        if (subcommand === 'set') {
            const configKey = args.shift();
            const rawChannel = args.shift();

            if (!configKey || !rawChannel || !CONFIG_KEYS.includes(configKey)) {
                await message.reply('Използвай: `!config set <logs|roles|createRoom|welcome|rules|announcements|staffChat> #channel`');
                return;
            }

            const channelId = mentionToChannelId(rawChannel);
            const channel = channelId ? message.guild.channels.cache.get(channelId) : null;

            if (!channel) {
                await message.reply('❌ Моля, маркирай валиден канал.');
                return;
            }

            rememberChannel(message.guild.id, configKey, channel.id);
            await message.reply(`✅ Запазих ${CONFIG_LABELS[configKey]} -> ${channel}.`);
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
    } finally {
        releaseGuildLock(message.guild.id, 'config');
    }
}

client.once('clientReady', () => {
    readyAt = Date.now();
    console.log(`Ботът е онлайн: ${client.user.tag} | process=${PROCESS_ID}`);
});

client.on('guildMemberAdd', async member => {
    const welcomeChannel = getConfiguredChannel(member.guild, 'welcome');
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
                            `• Прегледай <#${getConfiguredChannel(member.guild, 'rules')?.id || welcomeChannel.id}>`,
                            `• Избери роли от <#${getConfiguredChannel(member.guild, 'roles')?.id || welcomeChannel.id}>`,
                            '• Влез в гласов канал и използвай `направи-стая`, ако ти трябва отделна стая'
                        ].join('\n')
                    )
                    .setThumbnail(member.user.displayAvatarURL())
                    .setTimestamp()
            ]
        }).catch(() => {});
    }

    await sendLog(
        member.guild,
        new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle('Нов член')
            .setDescription(`${member.user.tag} влезе в сървъра.`)
            .setTimestamp()
    );
});

client.on('guildMemberRemove', async member => {
    await sendLog(
        member.guild,
        new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle('Напуснал член')
            .setDescription(`${member.user.tag} напусна сървъра.`)
            .setTimestamp()
    );
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        const joinedChannel = newState.channel;
        const leftChannel = oldState.channel;

        if (joinedChannel) {
            const createRoomChannel = getConfiguredChannel(newState.guild, 'createRoom');
            const isCreateRoom = createRoomChannel && joinedChannel.id === createRoomChannel.id;

            if (isCreateRoom) {
                const restrictedRole = getRoleByKey(newState.guild, 'restricted');
                const permissionOverwrites = [
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
                    permissionOverwrites.push({
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
                    permissionOverwrites.push({
                        id: restrictedRole.id,
                        deny: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak]
                    });
                }

                const tempChannel = await newState.guild.channels.create({
                    name: `стая-${newState.member.displayName}`,
                    type: ChannelType.GuildVoice,
                    parent: joinedChannel.parentId,
                    permissionOverwrites
                });

                trackTempVoiceChannel(newState.guild.id, tempChannel.id);
                await newState.member.voice.setChannel(tempChannel).catch(() => {});

                await sendLog(
                    newState.guild,
                    new EmbedBuilder()
                        .setColor(0x3498db)
                        .setTitle('Създадена гласова стая')
                        .setDescription(`${newState.member} създаде ${tempChannel}.`)
                        .setTimestamp()
                );
            }
        }

        if (leftChannel && isTrackedTempVoiceChannel(oldState.guild.id, leftChannel.id) && leftChannel.members.size === 0) {
            await deleteChannel(leftChannel);
            untrackTempVoiceChannel(oldState.guild.id, leftChannel.id);
        }
    } catch (error) {
        console.error('Грешка при voiceStateUpdate:', error);
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
        console.error('Грешка при бутоните за роли:', error);
        await interaction.reply({ content: '❌ Ботът няма права да управлява тази роля.', ephemeral: true });
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild || !message.content.startsWith(PREFIX)) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    if (isInGracePeriod()) {
        await message.reply('⏳ Ботът току-що стартира. Изчакай няколко секунди и опитай отново.');
        return;
    }

    if (!registerCommandExecution(message.guild.id, message.id)) {
        return;
    }

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    if (command === 'setup-server') {
        await handleSetupServer(message);
        return;
    }

    if (command === 'reset-server') {
        await handleResetServer(message);
        return;
    }

    if (command === 'config') {
        await handleConfigCommand(message, args);
    }
});

client.login(process.env.DISCORD_TOKEN);
