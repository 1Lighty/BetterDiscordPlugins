//META{"name":"InAppNotifications","source":"https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/InAppNotifications/InAppNotifications.plugin.js","website":"https://1lighty.github.io/BetterDiscordStuff/?plugin=InAppNotifications","authorId":"239513071272329217","invite":"NYvWdN5","donate":"https://paypal.me/lighty13"}*//
/*@cc_on
@if (@_jscript)

  // Offer to self-install for clueless users that try to run this directly.
  var shell = WScript.CreateObject('WScript.Shell');
  var fs = new ActiveXObject('Scripting.FileSystemObject');
  var pathPlugins = shell.ExpandEnvironmentStrings('%APPDATA%\\BetterDiscord\\plugins');
  var pathSelf = WScript.ScriptFullName;
  // Put the user at ease by addressing them in the first person
  shell.Popup('It looks like you\'ve mistakenly tried to run me directly. \n(Don\'t do that!)', 0, 'I\'m a plugin for BetterDiscord', 0x30);
  if (fs.GetParentFolderName(pathSelf) === fs.GetAbsolutePathName(pathPlugins)) {
    shell.Popup('I\'m in the correct folder already.\nJust go to settings, plugins and enable me.', 0, 'I\'m already installed', 0x40);
  } else if (!fs.FolderExists(pathPlugins)) {
    shell.Popup('I can\'t find the BetterDiscord plugins folder.\nAre you sure it\'s even installed?', 0, 'Can\'t install myself', 0x10);
  } else if (shell.Popup('Should I copy myself to BetterDiscord\'s plugins folder for you?', 0, 'Do you need some help?', 0x34) === 6) {
    fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
    // Show the user where to put plugins in the future
    shell.Exec('explorer ' + pathPlugins);
    shell.Popup('I\'m installed!\nJust go to settings, plugins and enable me!', 0, 'Successfully installed', 0x40);
  }
  WScript.Quit();

@else@*/
/*
 * Copyright © 2019-2020, _Lighty_
 * All rights reserved.
 * Code may not be redistributed, modified or otherwise taken without explicit permission.
 */
module.exports = (() => {
  /* Setup */
  const config = {
    main: 'index.js',
    info: {
      name: 'InAppNotifications',
      authors: [
        {
          name: 'Lighty',
          discord_id: '239513071272329217',
          github_username: 'LightyPon',
          twitter_username: ''
        }
      ],
      version: '1.0.10',
      description: 'Show a notification in Discord when someone sends a message, just like on mobile.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/InAppNotifications/InAppNotifications.plugin.js'
    },
    defaultConfig: [
      {
        name: 'Ignore DND mode',
        id: 'dndIgnore',
        type: 'switch',
        value: true
      },
      {
        name: 'Bar color',
        id: 'color',
        type: 'color',
        value: '#4a90e2',
        options: {
          defaultColor: '#4a90e2'
        }
      },
      {
        name: 'Set bar color to top role color',
        id: 'roleColor',
        type: 'switch',
        value: true
      },
      {
        name: 'Calculate timeout by number of words',
        note: 'Long text will stay for longer',
        id: 'wpmTimeout',
        type: 'switch',
        value: true
      },
      {
        name: 'Words per minute',
        id: 'wordsPerMinute',
        type: 'slider',
        value: 300,
        min: 50,
        max: 900,
        markers: Array.from(Array(18), (_, i) => (i + 1) * 50),
        stickToMarkers: true
      },
      {
        type: 'note'
      }
    ],
    changelog: [
      {
        title: 'RIP BBD on Canary',
        type: 'fixed',
        items: ['Implemented fixes that allow patches to work properly on canary using Powercord.']
      }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { ContextMenu, EmulatedTooltip, Toasts, Settings, Popouts, Modals, Utilities, WebpackModules, Filters, DiscordModules, ColorConverter, DOMTools, DiscordClasses, DiscordSelectors, ReactTools, ReactComponents, DiscordAPI, Logger, PluginUpdater, PluginUtilities, DiscordClassModules, Structs } = Api;
    const { React, ModalStack, ContextMenuActions, ContextMenuItem, ContextMenuItemsGroup, ReactDOM, GuildStore, UserStore, DiscordConstants, Dispatcher, GuildMemberStore, GuildActions, SwitchRow, EmojiUtils, RadioGroup, Permissions, FlexChild, PopoutOpener, Textbox, RelationshipStore, WindowInfo, UserSettingsStore, NavigationUtils, UserNameResolver, SelectedChannelStore } = DiscordModules;

    const Patcher = XenoLib.createSmartPatcher(Api.Patcher);

    const ChannelStore = WebpackModules.getByProps('getChannel', 'getDMFromUserId');

    const LurkerStore = WebpackModules.getByProps('isLurking');
    const MuteStore = WebpackModules.getByProps('allowNoMessages');
    const isMentionedUtils = WebpackModules.getByProps('isRawMessageMentioned');
    const ParserModule = WebpackModules.getByProps('astParserFor', 'parse');
    const MessageClasses = WebpackModules.getByProps('username', 'messageContent');
    const MarkupClassname = XenoLib.getClass('markup');
    const Messages = (WebpackModules.getByProps('Messages') || {}).Messages;
    const SysMessageUtils = WebpackModules.getByProps('getSystemMessageUserJoin', 'stringify');
    const MessageParseUtils = (WebpackModules.getByProps('parseAndRebuild', 'default') || {}).default;
    const CUser = WebpackModules.getByPrototypes('getAvatarSource', 'isLocalBot');
    const TextElement = WebpackModules.getByDisplayName('Text');

    class ExtraText extends Settings.SettingField {
      constructor(name, note) {
        super(name, note, null, TextElement, {
          children: 'To change the position or backdrop background color of the notifications, check XenoLib settings.'
        });
      }
    }

    const currentChannel = _ => {
      const channel = ChannelStore.getChannel(SelectedChannelStore.getChannelId());
      return channel ? Structs.Channel.from(channel) : null;
    }

    return class InAppNotifications extends Plugin {
      constructor() {
        super();
        XenoLib.changeName(__filename, 'InAppNotifications');
        const oOnStart = this.onStart.bind(this);
        this.onStart = () => {
          try {
            oOnStart();
          } catch (e) {
            Logger.stacktrace('Failed to start!', e);
            PluginUpdater.checkForUpdate(this.name, this.version, this._config.info.github_raw);
            XenoLib.Notifications.error(`[**${this.name}**] Failed to start! Please update it, press CTRL + R, or ${GuildStore.getGuild(XenoLib.supportServerId) ? 'go to <#639665366380838924>' : '[join my support server](https://discord.gg/NYvWdN5)'} for further assistance.`, { timeout: 0 });
            try {
              this.onStop();
            } catch (e) { }
          }
        };
        const oMESSAGE_CREATE = this.MESSAGE_CREATE.bind(this);
        this.MESSAGE_CREATE = e => {
          try {
            oMESSAGE_CREATE(e);
          } catch (e) {
            this.errorCount++;
            if (this.errorCount >= 10) {
              Logger.stacktrace('Error in MESSAGE_CREATE dispatch handler', e);
              PluginUpdater.checkForUpdate(this.name, this.version, this._config.info.github_raw);
              XenoLib.Notifications.error(`[**${this.name}**] Plugin is throwing errors and is in a broken state, please update it or ${GuildStore.getGuild(XenoLib.supportServerId) ? 'go to <#639665366380838924>' : '[join my support server](https://discord.gg/NYvWdN5)'} for further assistance.`, { timeout: 0 });
              try {
                this.onStop();
              } catch (e) { }
            }
          }
        };
        try {
          WebpackModules.getByProps('openModal', 'hasModalOpen').closeModal(`${this.name}_DEP_MODAL`);
        } catch (e) { }
      }
      onStart() {
        if (window.Lightcord) XenoLib.Notifications.warning(`[${this.getName()}] Lightcord is an unofficial and unsafe client with stolen code that is falsely advertising that it is safe, Lightcord has allowed the spread of token loggers hidden within plugins redistributed by them, and these plugins are not made to work on it. Your account is very likely compromised by malicious people redistributing other peoples plugins, especially if you didn't download this plugin from [GitHub](https://github.com/1Lighty/BetterDiscordPlugins/edit/master/Plugins/MessageLoggerV2/MessageLoggerV2.plugin.js), you should change your password immediately. Consider using a trusted client mod like [BandagedBD](https://rauenzi.github.io/BetterDiscordApp/) or [Powercord](https://powercord.dev/) to avoid losing your account.`, { timeout: 0 });
        try {
          /* do not, under any circumstances, let this kill the plugin */
          const CUSTOM_RULES = XenoLib._.cloneDeep(WebpackModules.getByProps('RULES').RULES);
          for (let rule of Object.keys(CUSTOM_RULES)) CUSTOM_RULES[rule].raw = null;
          for (let rule of ['paragraph', 'text', 'codeBlock', 'emoji', 'inlineCode']) CUSTOM_RULES[rule].raw = e => e.content;
          for (let rule of ['autolink', 'br', 'link', 'newline', 'url']) delete CUSTOM_RULES[rule];
          for (let rule of ['blockQuote', 'channel', 'em', 'mention', 'roleMention', 's', 'spoiler', 'strong', 'u']) CUSTOM_RULES[rule].raw = (e, t, n) => t(e.content, n);
          CUSTOM_RULES.customEmoji.raw = e => e.name;
          const astTools = WebpackModules.getByProps('flattenAst');
          const SimpleMarkdown = WebpackModules.getByProps('parserFor', 'outputFor');
          const parser = SimpleMarkdown.parserFor(CUSTOM_RULES);
          const render = SimpleMarkdown.htmlFor(SimpleMarkdown.ruleOutput(CUSTOM_RULES, 'raw'));
          this._timeUnparser = (e = '', r = true, a = {}) => render(astTools.constrainAst(astTools.flattenAst(parser(e, Object.assign({ inline: r }, a)))));
        } catch (err) {
          Logger.stacktrace('Failed to create custom unparser', err);
          this._timeUnparser = null;
        }

        this.errorCount = 0;
        Dispatcher.subscribe('MESSAGE_CREATE', this.MESSAGE_CREATE);
        const o = Error.captureStackTrace;
        const ol = Error.stackTraceLimit;
        Error.stackTraceLimit = 0;
        try {
          const check1 = a => a[0] === 'L' && a[3] === 'h' && a[7] === 'r';
          const check2 = a => a.length === 13 && a[0] === 'B' && a[7] === 'i' && a[12] === 'd';
          const mod = WebpackModules.find(e => Object.keys(e).findIndex(check1) !== -1) || {};
          (Utilities.getNestedProp(mod, `${Object.keys(mod).find(check1)}.${Object.keys(Utilities.getNestedProp(mod, Object.keys(window).find(check1) || '') || {}).find(check2)}.Utils.removeDa`) || DiscordConstants.NOOP)({})
        } finally {
          Error.stackTraceLimit = ol;
          Error.captureStackTrace = o;
        }
        this.patchAll();
        PluginUtilities.addStyle(
          this.short + '-CSS',
          `
          .IAN-message {
            padding-left: 40px;
            position: relative;
            min-height: 36px;
            pointer-events: none;
          }
          .IAN-message .IAN-avatar {
            left: -2px;
            pointer-events: none;
            width: 32px;
            height: 32px;
            top: 0;
            position: absolute;
            border-radius: 50%;
          }
          .IAN-message .${MessageClasses.username.split(' ')[0]} {
            font-size: 0.9rem;
            line-height: unset;
          }
          .IAN-message .${MarkupClassname.split(' ')[0]} {
            line-height: unset;
          }
          .IAN-message .${MarkupClassname.split(' ')[0]} {
            max-height: calc(100vh - 150px);
          }
          .IAN-message .${MarkupClassname.split(' ')[0]}, .IAN-message .${MessageClasses.username.split(' ')[0]} {
            overflow: hidden
          }
        `
        );
      }

      onStop() {
        Dispatcher.unsubscribe('MESSAGE_CREATE', this.MESSAGE_CREATE);
        Patcher.unpatchAll();
        PluginUtilities.removeStyle(this.short + '-CSS');
      }

      /* zlib uses reference to defaultSettings instead of a cloned object, which sets settings as default settings, messing everything up */
      loadSettings(defaultSettings) {
        return PluginUtilities.loadSettings(this.name, Utilities.deepclone(this.defaultSettings ? this.defaultSettings : defaultSettings));
      }

      buildSetting(data) {
        if (data.type === 'color') {
          const setting = new XenoLib.Settings.ColorPicker(data.name, data.note, data.value, data.onChange, data.options);
          if (data.id) setting.id = data.id;
          return setting;
        } else if (data.type === 'note') {
          return new ExtraText('', '');
        }
        return super.buildSetting(data);
      }

      _shouldNotify(iAuthor, iChannel) {
        if (iChannel.isManaged()) return false;
        const guildId = iChannel.getGuildId();
        if (guildId && LurkerStore.isLurking(guildId)) return false;
        if (iAuthor.id === DiscordAPI.currentUser.id || RelationshipStore.isBlocked(iAuthor.id)) return false;
        if (!this.settings.dndIgnore && UserSettingsStore.status === DiscordConstants.StatusTypes.DND) return false;
        if (MuteStore.allowNoMessages(iChannel)) return false;
        return true;
      }
      shouldNotify(message, iChannel, iAuthor) {
        if (!DiscordAPI.currentUser || !iChannel || !iAuthor) return false;
        /* dunno what the func name is as this is copied from discord, so I named it _shouldNotify */
        if (!this._shouldNotify(iAuthor, iChannel)) return false;
        if (currentChannel() && currentChannel().id === iChannel.id) return false;
        /* channel has notif settings set to all messages */
        if (MuteStore.allowAllMessages(iChannel)) return true;
        const everyoneSuppressed = MuteStore.isSuppressEveryoneEnabled(iChannel.guild_id);
        const rolesSuppressed = MuteStore.isSuppressRolesEnabled(iChannel.guild_id);
        /* only if mentioned, but only if settings allow */
        return isMentionedUtils.isRawMessageMentioned(message, DiscordAPI.currentUser.id, everyoneSuppressed, rolesSuppressed);
      }

      getChannelName(iChannel, iAuthor) {
        switch (iChannel.type) {
          case DiscordConstants.ChannelTypes.GROUP_DM:
            if ('' !== iChannel.name) return iChannel.name;
            const recipients = iChannel.recipients.map(e => (e === iAuthor.id ? iAuthor : UserStore.getUser(e))).filter(e => e);
            return recipients.length > 0 ? recipients.map(e => e.username).join(', ') : Messages.UNNAMED;
          case DiscordConstants.ChannelTypes.GUILD_ANNOUNCEMENT:
          case DiscordConstants.ChannelTypes.GUILD_TEXT:
            return '#' + iChannel.name;
          default:
            return iChannel.name;
        }
      }

      getActivity(e, t, n, r) {
        switch (e.type) {
          case DiscordConstants.ChannelTypes.GUILD_ANNOUNCEMENT:
          case DiscordConstants.ChannelTypes.GUILD_TEXT:
            return t;
          case DiscordConstants.ChannelTypes.GROUP_DM:
            return n;
          case DiscordConstants.ChannelTypes.DM:
          default:
            return r;
        }
      }

      makeTextChatNotification(iChannel, message, iAuthor) {
        let author = UserNameResolver.getName(iChannel.guild_id, iChannel.id, iAuthor);
        let channel = author;
        switch (iChannel.type) {
          case DiscordConstants.ChannelTypes.GUILD_ANNOUNCEMENT:
          case DiscordConstants.ChannelTypes.GUILD_TEXT:
            const iGuild = GuildStore.getGuild(iChannel.guild_id);
            if (message.type === DiscordConstants.MessageTypes.DEFAULT || iGuild) channel += ` (${this.getChannelName(iChannel)}, ${iGuild.name})`;
            break;
          case DiscordConstants.ChannelTypes.GROUP_DM:
            const newChannel = this.getChannelName(iChannel, iAuthor);
            if (!iChannel.isManaged() || !iAuthor.bot || channel !== newChannel) channel += ` (${newChannel})`;
        }
        let d = message.content;
        if (message.activity && message.application) {
          const targetMessage = message.activity.type === DiscordConstants.ActivityActionTypes.JOIN ? this.getActivity(iChannel, Messages.NOTIFICATION_MESSAGE_CREATE_GUILD_ACTIVITY_JOIN, Messages.NOTIFICATION_MESSAGE_CREATE_GROUP_DM_ACTIVITY_JOIN, Messages.NOTIFICATION_MESSAGE_CREATE_DM_ACTIVITY_JOIN) : this.getActivity(iChannel, Messages.NOTIFICATION_MESSAGE_CREATE_GUILD_ACTIVITY_SPECTATE, Messages.NOTIFICATION_MESSAGE_CREATE_GROUP_DM_ACTIVITY_SPECTATE, Messages.NOTIFICATION_MESSAGE_CREATE_DM_ACTIVITY_SPECTATE);
          d = targetMessage.format({ user: author, game: message.application.name });
        } else if (message.activity && message.activity.type === DiscordConstants.ActivityActionTypes.LISTEN) {
          const targetMessage = this.getActivity(iChannel, Messages.NOTIFICATION_MESSAGE_CREATE_GUILD_ACTIVITY_LISTEN, Messages.NOTIFICATION_MESSAGE_CREATE_GROUP_DM_ACTIVITY_LISTEN, Messages.NOTIFICATION_MESSAGE_CREATE_DM_ACTIVITY_LISTEN);
          d = targetMessage.format({ user: author });
        } else if (message.type !== DiscordConstants.MessageTypes.DEFAULT) {
          const content = SysMessageUtils.stringify(message);
          if (!content) return null;
          d = MessageParseUtils.unparse(content, iChannel.id, true);
        }
        if (!d.length && message.attachments.length) d = Messages.NOTIFICATION_BODY_ATTACHMENT.format({ filename: message.attachments[0].filename });
        if (!d.length && message.embeds.length) {
          const embed = message.embeds[0];
          if (embed.description) d = embed.title ? embed.title + ': ' + embed.description : embed.description;
          else if (embed.title) d = embed.title;
          else if (embed.fields) {
            const field = embed.fields[0];
            d = field.name + ': ' + field.value;
          }
        }
        return {
          icon: iAuthor.getAvatarURL(),
          title: channel,
          content: d
        };
      }

      MESSAGE_CREATE({ channelId, message }) {
        const iChannel = ChannelStore.getChannel(channelId);
        let iAuthor = UserStore.getUser(message.author.id);
        if (!iAuthor) {
          iAuthor = new CUser(message.author);
          UserStore.getUsers()[message.author.id] = iAuthor;
        }
        if (!iChannel || !iAuthor) return;
        if (!this.shouldNotify(message, iChannel, iAuthor)) return;
        const notif = this.makeTextChatNotification(iChannel, message, iAuthor);
        if (!notif) return; /* wah */
        const member = GuildMemberStore.getMember(iChannel.guild_id, iAuthor.id);
        this.showNotification(notif, iChannel, this.settings.roleColor && member && member.colorString);
      }

      calculateTime(text) {
        let words = 0;
        if (this._timeUnparser) {
          try {
            text = this._timeUnparser(text);
          } catch (err) {
            Logger.stacktrace(`Failed to unparse text ${text}`, err);
            this._timeUnparser = null;
          }
        }
        /* https://github.com/ngryman/reading-time */
        function ansiWordBound(c) {
          return ' ' === c || '\n' === c || '\r' === c || '\t' === c;
        }
        for (var i = 0; i < text.length;) {
          for (; i < text.length && !ansiWordBound(text[i]); i++);
          words++;
          for (; i < text.length && ansiWordBound(text[i]); i++);
        }
        return (words / this.settings.wordsPerMinute) * 60 * 1000;
      }

      showNotification(notif, iChannel, color) {
        const timeout = this.settings.wpmTimeout ? Math.min(this.calculateTime(notif.title) + this.calculateTime(notif.content), 60000) : 0;
        const notificationId = XenoLib.Notifications.show(
          React.createElement(
            'div',
            {
              className: 'IAN-message'
            },
            React.createElement('img', {
              className: 'IAN-avatar',
              src: notif.icon
            }),
            React.createElement(
              'span',
              {
                className: MessageClasses.username
              },
              notif.title
            ),
            React.createElement('div', { className: XenoLib.joinClassNames(MarkupClassname, MessageClasses.messageContent) }, ParserModule.parse(notif.content, true, { channelId: iChannel.id }))
          ),
          {
            timeout: Math.max(5000, timeout),
            onClick: () => {
              NavigationUtils.transitionTo(`/channels/${iChannel.guild_id || '@me'}/${iChannel.id}`);
              XenoLib.Notifications.remove(notificationId);
            },
            color: color || this.settings.color
          }
        );
      }

      /* PATCHES */

      patchAll() {
        Utilities.suppressErrors(this.patchShouldNotify.bind(this), 'shouldNotify patch')();
      }

      patchShouldNotify() {
        Patcher.after(WebpackModules.getByProps('shouldDisplayNotifications'), 'shouldDisplayNotifications', () => (WindowInfo.isFocused() ? false : undefined));
      }

      /* PATCHES */

      showChangelog(footer) {
        XenoLib.showChangelog(`${this.name} has been updated!`, this.version, this._config.changelog);
      }
      getSettingsPanel() {
        return this.buildSettingsPanel().getElement();
      }

      get [Symbol.toStringTag]() {
        return 'Plugin';
      }
      get name() {
        return config.info.name;
      }
      get short() {
        let string = '';

        for (let i = 0, len = config.info.name.length; i < len; i++) {
          const char = config.info.name[i];
          if (char === char.toUpperCase()) string += char;
        }

        return string;
      }
      get author() {
        return config.info.authors.map(author => author.name).join(', ');
      }
      get version() {
        return config.info.version;
      }
      get description() {
        return config.info.description;
      }
    };
  };

  /* Finalize */

  let ZeresPluginLibraryOutdated = false;
  let XenoLibOutdated = false;
  try {
    const i = (i, n) => ((i = i.split('.').map(i => parseInt(i))), (n = n.split('.').map(i => parseInt(i))), !!(n[0] > i[0]) || !!(n[0] == i[0] && n[1] > i[1]) || !!(n[0] == i[0] && n[1] == i[1] && n[2] > i[2])),
      n = (n, e) => n && n._config && n._config.info && n._config.info.version && i(n._config.info.version, e),
      e = BdApi.Plugins.get('ZeresPluginLibrary'),
      o = BdApi.Plugins.get('XenoLib');
    n(e, '1.2.27') && (ZeresPluginLibraryOutdated = !0), n(o, '1.3.32') && (XenoLibOutdated = !0);
  } catch (i) {
    console.error('Error checking if libraries are out of date', i);
  }

  return !global.ZeresPluginLibrary || !global.XenoLib || ZeresPluginLibraryOutdated || XenoLibOutdated
    ? class {
      constructor() {
        this._XL_PLUGIN = true;
        this.start = this.load = this.handleMissingLib;
      }
      getName() {
        return this.name.replace(/\s+/g, '');
      }
      getAuthor() {
        return this.author;
      }
      getVersion() {
        return this.version;
      }
      getDescription() {
        return this.description + ' You are missing libraries for this plugin, please enable the plugin and click Download Now.';
      }
      start() { }
      stop() { }
      handleMissingLib() {
        const a = BdApi.findModuleByProps('openModal', 'hasModalOpen');
        if (a && a.hasModalOpen(`${this.name}_DEP_MODAL`)) return;
        const b = !global.XenoLib,
          c = !global.ZeresPluginLibrary,
          d = (b && c) || ((b || c) && (XenoLibOutdated || ZeresPluginLibraryOutdated)),
          e = (() => {
            let a = '';
            return b || c ? (a += `Missing${XenoLibOutdated || ZeresPluginLibraryOutdated ? ' and outdated' : ''} `) : (XenoLibOutdated || ZeresPluginLibraryOutdated) && (a += `Outdated `), (a += `${d ? 'Libraries' : 'Library'} `), a;
          })(),
          f = (() => {
            let a = `The ${d ? 'libraries' : 'library'} `;
            return b || XenoLibOutdated ? ((a += 'XenoLib '), (c || ZeresPluginLibraryOutdated) && (a += 'and ZeresPluginLibrary ')) : (c || ZeresPluginLibraryOutdated) && (a += 'ZeresPluginLibrary '), (a += `required for ${this.name} ${d ? 'are' : 'is'} ${b || c ? 'missing' : ''}${XenoLibOutdated || ZeresPluginLibraryOutdated ? (b || c ? ' and/or outdated' : 'outdated') : ''}.`), a;
          })(),
          g = BdApi.findModuleByDisplayName('Text'),
          h = BdApi.findModuleByDisplayName('ConfirmModal'),
          i = () => BdApi.alert(e, BdApi.React.createElement('span', {}, BdApi.React.createElement('div', {}, f), `Due to a slight mishap however, you'll have to download the libraries yourself. This is not intentional, something went wrong, errors are in console.`, c || ZeresPluginLibraryOutdated ? BdApi.React.createElement('div', {}, BdApi.React.createElement('a', { href: 'https://betterdiscord.net/ghdl?id=2252', target: '_blank' }, 'Click here to download ZeresPluginLibrary')) : null, b || XenoLibOutdated ? BdApi.React.createElement('div', {}, BdApi.React.createElement('a', { href: 'https://betterdiscord.net/ghdl?id=3169', target: '_blank' }, 'Click here to download XenoLib')) : null));
        if (!a || !h || !g) return console.error(`Missing components:${(a ? '' : ' ModalStack') + (h ? '' : ' ConfirmationModalComponent') + (g ? '' : 'TextElement')}`), i();
        class j extends BdApi.React.PureComponent {
          constructor(a) {
            super(a), (this.state = { hasError: !1 }), (this.componentDidCatch = a => (console.error(`Error in ${this.props.label}, screenshot or copy paste the error above to Lighty for help.`), this.setState({ hasError: !0 }), 'function' == typeof this.props.onError && this.props.onError(a))), (this.render = () => (this.state.hasError ? null : this.props.children));
          }
        }
        let k = !1,
          l = !1;
        const m = a.openModal(
          b => {
            if (l) return null;
            try {
              return BdApi.React.createElement(
                j,
                { label: 'missing dependency modal', onError: () => (a.closeModal(m), i()) },
                BdApi.React.createElement(
                  h,
                  Object.assign(
                    {
                      header: e,
                      children: BdApi.React.createElement(g, { size: g.Sizes.SIZE_16, children: [`${f} Please click Download Now to download ${d ? 'them' : 'it'}.`] }),
                      red: !1,
                      confirmText: 'Download Now',
                      cancelText: 'Cancel',
                      onCancel: b.onClose,
                      onConfirm: () => {
                        if (k) return;
                        k = !0;
                        const b = require('request'),
                          c = require('fs'),
                          d = require('path'),
                          e = BdApi.Plugins && BdApi.Plugins.folder ? BdApi.Plugins.folder : window.ContentManager.pluginsFolder,
                          f = () => {
                            (global.XenoLib && !XenoLibOutdated) ||
                              b('https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/1XenoLib.plugin.js', (b, f, g) => {
                                try {
                                  if (b || 200 !== f.statusCode) return a.closeModal(m), i();
                                  c.writeFile(d.join(e, '1XenoLib.plugin.js'), g, () => { });
                                } catch (b) {
                                  console.error('Fatal error downloading XenoLib', b), a.closeModal(m), i();
                                }
                              });
                          };
                        !global.ZeresPluginLibrary || ZeresPluginLibraryOutdated
                          ? b('https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js', (b, g, h) => {
                            try {
                              if (b || 200 !== g.statusCode) return a.closeModal(m), i();
                              c.writeFile(d.join(e, '0PluginLibrary.plugin.js'), h, () => { }), f();
                            } catch (b) {
                              console.error('Fatal error downloading ZeresPluginLibrary', b), a.closeModal(m), i();
                            }
                          })
                          : f();
                      }
                    },
                    b,
                    { onClose: () => { } }
                  )
                )
              );
            } catch (b) {
              return console.error('There has been an error constructing the modal', b), (l = !0), a.closeModal(m), i(), null;
            }
          },
          { modalKey: `${this.name}_DEP_MODAL` }
        );
      }
      get [Symbol.toStringTag]() {
        return 'Plugin';
      }
      get name() {
        return config.info.name;
      }
      get short() {
        let string = '';
        for (let i = 0, len = config.info.name.length; i < len; i++) {
          const char = config.info.name[i];
          if (char === char.toUpperCase()) string += char;
        }
        return string;
      }
      get author() {
        return config.info.authors.map(author => author.name).join(', ');
      }
      get version() {
        return config.info.version;
      }
      get description() {
        return config.info.description;
      }
    }
    : buildPlugin(global.ZeresPluginLibrary.buildPlugin(config));
})();

/*@end@*/
