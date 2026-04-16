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
const CREATE_ROOM_FALLBACK_NAMES = ['create-room', 'Create Room'];
const ROLE_DEFINITIONS = [
    { key: 'owner', name: 'Собственик', color: 0xe74c3c, hoist: true, permissions: [PermissionsBitField.Flags.Administrator] },
    { key: 'admin', name: 'Администратор', color: 0xe67e22, hoist: true, permissions: [PermissionsBitField.Flags.Administrator] },
    { key: 'moderator', name: 'Модератор', color: 0xf1c40f, hoist: true, permissions: [PermissionsBitField.Flags.ManageMessages, PermissionsBitField.Flags.KickMembers, PermissionsBitField.Flags.BanMembers, PermissionsBitField.Flags.ModerateMembers, PermissionsBitField.Flags.ManageChannels] },
    { key: 'cs2', name: 'CS2 играч', color: 0xf39c12 },
    { key: 'faceit', name: 'Faceit играч', color: 0xff5500 },
    { key: 'premier', name: 'Premier играч', color: 0x3498db },
    { key: 'warzone', name: 'Warzone играч', color: 0x16a085 },
    { key: 'dmz', name: 'DMZ играч', color: 0x27ae60 },
    { key: 'vanguard', name: 'Vanguard играч', color: 0x2ecc71 },
    { key: 'gta', name: 'GTA играч', color: 0x9b59b6 },
    { key: 'lfg', name: 'Покана за игра', color: 0x1abc9c },
    { key: 'streams', name: 'Стрийм известия', color: 0xe91e63 },
    { key: 'night', name: 'Нощна група', color: 0x34495e },
    { key: 'active', name: 'Активен играч', color: 0x95a5a6 },
    { key: 'restricted', name: 'Ограничен достъп', color: 0x7f8c8d }
];

const SELF_ASSIGNABLE_ROLE_KEYS = ['cs2', 'faceit', 'premier', 'warzone', 'dmz', 'vanguard', 'gta', 'lfg', 'streams', 'night'];

const CATEGORY_DEFINITIONS = [
    {
        name: 'INFO',
        visibility: 'everyone',
        readOnly: true,
        channels: [
            { name: 'welcome', type: ChannelType.GuildText },
            { name: 'rules', type: ChannelType.GuildText },
            { name: 'roles', type: ChannelType.GuildText },
            { name: 'announcements', type: ChannelType.GuildText, hiddenForRestricted: true }
        ]
    },
    {
        name: 'GENERAL',
        visibility: 'everyone',
        channels: [
            { name: 'general-chat', type: ChannelType.GuildText },
            { name: 'lfg', type: ChannelType.GuildText },
            { name: 'media', type: ChannelType.GuildText },
            { name: 'memes', type: ChannelType.GuildText }
        ]
    },
    {
        name: 'COUNTER-STRIKE 2',
        visibility: 'roles',
        roleKeys: ['cs2', 'faceit', 'premier'],
        channels: [
            { name: 'cs2-lobby', type: ChannelType.GuildText },
            { name: 'faceit', type: ChannelType.GuildText },
            { name: 'premier', type: ChannelType.GuildText }
        ]
    },
    {
        name: 'CALL OF DUTY',
        visibility: 'roles',
        roleKeys: ['warzone', 'dmz', 'vanguard'],
        channels: [
            { name: 'warzone', type: ChannelType.GuildText },
            { name: 'dmz', type: ChannelType.GuildText },
            { name: 'multiplayer', type: ChannelType.GuildText },
            { name: 'vanguard', type: ChannelType.GuildText }
        ]
    },
    {
        name: 'GTA V',
        visibility: 'roles',
        roleKeys: ['gta'],
        channels: [
            { name: 'gta-online', type: ChannelType.GuildText },
            { name: 'heists', type: ChannelType.GuildText },
            { name: 'rp', type: ChannelType.GuildText }
        ]
    },
    {
        name: 'VOICE',
        visibility: 'everyone',
        channels: [
            { name: 'create-room', type: ChannelType.GuildVoice },
            { name: 'chill-room', type: ChannelType.GuildVoice },
            { name: 'late-night', type: ChannelType.GuildVoice }
        ]
    },
    {
        name: 'STAFF',
        visibility: 'staff',
        channels: [
            { name: 'logs', type: ChannelType.GuildText },
            { name: 'mod-chat', type: ChannelType.GuildText }
        ]
    }
];

const CONFIG_ALIASES = {
    logs: ['logs'],
    roles: ['roles', 'self-roles'],
    createRoom: ['create-room', 'create room'],
    welcome: ['welcome'],
    rules: ['rules'],
    announcements: ['announcements'],
    modChat: ['mod-chat', 'staff-chat']
};

const ROLE_BUTTON_ROWS = [
    ['cs2', 'faceit', 'premier', 'warzone', 'dmz'],
    ['vanguard', 'gta', 'lfg', 'streams', 'night']
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
        .setTitle('TOP PLAYS BULGARIA | Server Rules')
        .setDescription(
            [
                '📜 **ПРАВИЛА НА СЪРВЪРА / SERVER RULES**',
                '',
                'Добре дошли в **TOP PLAYS BULGARIA** 🎮',
                'Целта на сървъра е приятна атмосфера за игра, разговори и отборна координация.',
                '',
                '**1. Уважавайте всички членове.**',
                'Обиди, токсично поведение, расизъм, дискриминация и заплахи не се толерират.',
                '',
                '**2. Без реклама без разрешение.**',
                'Забранена е реклама на сървъри, канали, услуги, продажба на акаунти или cheat/hack съдържание без одобрение.',
                '',
                '**3. Забранени са cheat / hack теми.**',
                'Разпространение или обсъждане на cheat програми, exploit-и и boosting услуги е забранено.',
                '',
                '**4. Използвайте правилните канали.**',
                'Пишете по темата в съответните канали.',
                '',
                '**5. Без spam.**',
                'Flood, emoji spam, безсмислени линкове и излишни ping-ове не са позволени.',
                '',
                '**6. Не злоупотребявайте с @everyone / @here.**',
                'Разрешено е само за администрация.',
                '',
                '**7. Спазвайте Discord правилата.**',
                'Всички трябва да спазват Discord Terms of Service и Community Guidelines.',
                '',
                '**8. Спазвайте ред във voice каналите.**',
                'Без излишен шум, прекъсване и неподходящо съдържание.',
                '',
                '**9. Стриймове и съдържание се споделят само в подходящите канали.**',
                '',
                '**10. Администрацията има право да предприема действия при нарушение.**',
                'Наказанията могат да бъдат предупреждение, ограничаване на достъп, kick или ban.',
                '',
                '**11. Правилата могат да бъдат обновявани при нужда.**',
                '',
                '**12. Най-важното:**',
                'Забавлявайте се и уважавайте останалите.'
            ].join('\n')
        )
        .setFooter({ text: 'С влизането си в сървъра приемате тези правила.' });
}

function buildWelcomeEmbed(guild) {
    const rulesChannel = resolveConfiguredChannel(guild, 'rules');
    const rolesChannel = resolveConfiguredChannel(guild, 'roles');

    const rulesMention = rulesChannel ? `<#${rulesChannel.id}>` : '#rules';
    const rolesMention = rolesChannel ? `<#${rolesChannel.id}>` : '#roles';

    return new EmbedBuilder()
        .setColor(0x00b894)
        .setTitle('Welcome to TOP PLAYS BULGARIA')
        .setDescription(
            [
                'Private gaming hub for friends, squads and late-night sessions.',
                '',
                `• Read the rules in ${rulesMention}`,
                `• Pick your game roles in ${rolesMention}`,
                '• Jump into voice and spin up your own room when needed',
                '',
                'Games in rotation: CS2, Warzone, DMZ, Vanguard, GTA V and more.'
            ].join('\n')
        )
        .setFooter({ text: `${guild.name} setup by the gaming utility bot` });
}

function buildRolesEmbed() {
    return new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('Role Selection')
        .setDescription(
            [
                'Избери роли с бутоните по-долу.',
                '',
                '**Game roles**: достъпни за тагване и по-добра организация.',
                '**Utility roles**: известия за LFG, стриймове и late-night сесии.',
                '',
                'Натисни отново бутона, за да премахнеш роля.'
            ].join('\n')
        );
}

function buildRoleButtons() {
    return ROLE_BUTTON_ROWS.map(roleKeys => {
        const row = new ActionRowBuilder();
        roleKeys.forEach(roleKey => {
            const role = getRoleDefinitionByKey(roleKey);
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`role:${roleKey}`)
                    .setLabel(role.name)
                    .setStyle(roleKey === 'lfg' || roleKey === 'streams' || roleKey === 'night' ? ButtonStyle.Secondary : ButtonStyle.Primary)
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
        embeds: [buildRolesEmbed()],
        components: buildRoleButtons()
    });
}

async function handleResetServer(message) {
    await message.reply(
        [
            '⚠️ **FULL RESET MODE**',
            'This will remove almost all channels and roles so the bot can build the server again from scratch.',
            'Type **RESET** within 15 seconds to confirm.'
        ].join('\n')
    );

    const filter = incoming => incoming.author.id === message.author.id && incoming.content === 'RESET';
    const collector = message.channel.createMessageCollector({ filter, time: 15000, max: 1 });

    collector.on('collect', async () => {
        const statusMessage = await message.channel.send('⏳ Rebuilding cleanup started...');
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
            await statusMessage.edit('✅ Cleanup finished. Use `!setup-server` to build the new gaming template.');
        } catch (error) {
            await statusMessage.edit(`❌ Reset failed: ${error.message}`);
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            message.channel.send('⌛ Reset cancelled. No confirmation received.').catch(() => {});
        }
    });
}

async function handleSetupServer(message) {
    const statusMessage = await message.reply('⏳ Building the clean gaming server template...');

    try {
        await setupGamingTemplate(message.guild);
        await sendLog(message.guild, {
            embeds: [
                new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('Server Setup Completed')
                    .setDescription(`Template rebuild executed by ${message.author}.`)
                    .setTimestamp()
            ]
        });
        await statusMessage.edit('✅ Server setup complete. The new gaming structure, roles and utility messages are now in place.');
    } catch (error) {
        await statusMessage.edit(`❌ Setup failed: ${error.message}`);
    }
}

async function handleConfigCommand(message, args) {
    const subcommand = args.shift()?.toLowerCase();

    if (subcommand === 'show') {
        const lines = CONFIG_CHANNEL_KEYS.map(key => {
            const channel = resolveConfiguredChannel(message.guild, key);
            return `• ${key}: ${channel ? `<#${channel.id}>` : 'not set'}`;
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
        await message.reply(`✅ Auto-detection finished. Saved ${updatedCount} channel mappings.`);
        return;
    }

    if (subcommand === 'set') {
        const channelKey = args.shift();
        const rawChannel = args.shift();
        if (!channelKey || !rawChannel || !CONFIG_CHANNEL_KEYS.includes(channelKey)) {
            await message.reply('Usage: `!config set <logs|roles|createRoom|welcome|rules|announcements|modChat> #channel`');
            return;
        }

        const channelId = getChannelFromMention(rawChannel);
        const channel = channelId ? message.guild.channels.cache.get(channelId) : null;
        if (!channel) {
            await message.reply('❌ Please mention a valid channel.');
            return;
        }

        rememberChannel(message.guild.id, channelKey, channel.id);
        await message.reply(`✅ Saved ${channelKey} -> ${channel}.`);
        return;
    }

    await message.reply(
        [
            '`!config show`',
            '`!config auto`',
            '`!config set logs #logs`',
            '`!config set roles #roles`',
            '`!config set createRoom #create-room`'
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
                    .setTitle(`Welcome, ${member.displayName}!`)
                    .setDescription(
                        [
                            'Радваме се, че си тук.',
                            '',
                            `• Прегледай <#${resolveConfiguredChannel(member.guild, 'rules')?.id || welcomeChannel.id}>`,
                            `• Избери роли от <#${resolveConfiguredChannel(member.guild, 'roles')?.id || welcomeChannel.id}>`,
                            '• Влез във voice и използвай `create-room`, ако ти трябва отделен канал'
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
                .setTitle('Member Joined')
                .setDescription(`${member.user.tag} joined the server.`)
                .setTimestamp()
        ]
    });
});

client.on('guildMemberRemove', async member => {
    await sendLog(member.guild, {
        embeds: [
            new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('Member Left')
                .setDescription(`${member.user.tag} left the server.`)
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
                    name: `${newState.member.displayName}'s room`,
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
                            .setTitle('Voice Room Created')
                            .setDescription(`${newState.member} created ${tempChannel}.`)
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
        await interaction.reply({ content: '❌ This role is not self-assignable.', ephemeral: true });
        return;
    }

    const role = getRoleByKey(interaction.guild, roleKey);
    if (!role) {
        await interaction.reply({ content: '❌ Role not found. Run `!setup-server` again.', ephemeral: true });
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
        await interaction.reply({ content: '❌ Botът няма права да управлява тази роля.', ephemeral: true });
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
