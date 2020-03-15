//META{"name":"InAppNotifications","source":"https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/InAppNotifications/InAppNotifications.plugin.js","website":"https://1lighty.github.io/BetterDiscordStuff/?plugin=InAppNotifications"}*//
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
		shell.Popup('I\'m in the correct folder already.\nJust reload Discord with Ctrl+R.', 0, 'I\'m already installed', 0x40);
	} else if (!fs.FolderExists(pathPlugins)) {
		shell.Popup('I can\'t find the BetterDiscord plugins folder.\nAre you sure it\'s even installed?', 0, 'Can\'t install myself', 0x10);
	} else if (shell.Popup('Should I copy myself to BetterDiscord\'s plugins folder for you?', 0, 'Do you need some help?', 0x34) === 6) {
		fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
		// Show the user where to put plugins in the future
		shell.Exec('explorer ' + pathPlugins);
		shell.Popup('I\'m installed!\nJust reload Discord with Ctrl+R.', 0, 'Successfully installed', 0x40);
	}
	WScript.Quit();

@else@*/
/*
 * Copyright © 2019-2020, _Lighty_
 * All rights reserved.
 * Code may not be redistributed, modified or otherwise taken without explicit permission.
 */
var InAppNotifications = (() => {
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
      version: '1.0.2',
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
      }
    ],
    changelog: [
      {
        title: 'was requested',
        type: 'added',
        items: ["Desktop notifications now don't show if Discord is focused, while in-app ones do."]
      }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { ContextMenu, EmulatedTooltip, Toasts, Settings, Popouts, Modals, Utilities, WebpackModules, Filters, DiscordModules, ColorConverter, DOMTools, DiscordClasses, DiscordSelectors, ReactTools, ReactComponents, DiscordAPI, Logger, Patcher, PluginUpdater, PluginUtilities, DiscordClassModules, Structs } = Api;
    const { React, ModalStack, ContextMenuActions, ContextMenuItem, ContextMenuItemsGroup, ReactDOM, ChannelStore, GuildStore, UserStore, DiscordConstants, Dispatcher, GuildMemberStore, GuildActions, SwitchRow, EmojiUtils, RadioGroup, Permissions, TextElement, FlexChild, PopoutOpener, Textbox, RelationshipStore, WindowInfo, UserSettingsStore, NavigationUtils, UserNameResolver } = DiscordModules;

    const LurkerStore = WebpackModules.getByProps('isLurking');
    const MuteStore = WebpackModules.getByProps('allowNoMessages');
    const isMentionedUtils = WebpackModules.getByProps('isRawMessageMentioned');
    const ParserModule = WebpackModules.getByProps('parseAllowLinks', 'parse');
    const MessageClasses = WebpackModules.getByProps('username', 'messageContent');
    const MarkupClassname = XenoLib.getClass('markup');
    const Messages = (WebpackModules.getByProps('Messages') || {}).Messages;
    const SysMessageUtils = WebpackModules.getByProps('getSystemMessageUserJoin', 'stringify');
    const MessageParseUtils = (WebpackModules.getByProps('parseAndRebuild', 'default') || {}).default;
    const CUser = WebpackModules.getByPrototypes('getAvatarSource', 'isLocalBot');

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
            } catch (e) {}
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
              } catch (e) {}
            }
          }
        };
        try {
          ModalStack.popWithKey(`${this.name}_DEP_MODAL`);
        } catch (e) {}
      }
      onStart() {
        this.errorCount = 0;
        Dispatcher.subscribe('MESSAGE_CREATE', this.MESSAGE_CREATE);
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
        if (DiscordAPI.currentChannel && DiscordAPI.currentChannel.id === iChannel.id) return false;
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
        this.showNotification(notif, iChannel);
      }

      showNotification(notif, iChannel) {
        const notificationId = XenoLib.Notifications.info(
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
            timeout: 5000,
            onClick: () => {
              NavigationUtils.transitionTo(`/channels/${iChannel.guild_id || '@me'}/${iChannel.id}`);
              XenoLib.Notifications.remove(notificationId);
            }
          }
        );
      }

      /* PATCHES */

      patchAll() {
        Utilities.suppressErrors(this.patchShouldNotify.bind(this), 'shouldNotify patch')();
      }

      patchShouldNotify() {
        Patcher.after(WebpackModules.getByProps('shouldNotify'), 'shouldNotify', () => (WindowInfo.isFocused() ? false : undefined));
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
    if (global.BdApi && 'function' == typeof BdApi.getPlugin) {
      const i = (i, n) => ((i = i.split('.').map(i => parseInt(i))), (n = n.split('.').map(i => parseInt(i))), !!(n[0] > i[0]) || !!(n[0] == i[0] && n[1] > i[1]) || !!(n[0] == i[0] && n[1] == i[1] && n[2] > i[2])),
        n = (n, e) => n && n._config && n._config.info && n._config.info.version && i(n._config.info.version, e),
        e = BdApi.getPlugin('ZeresPluginLibrary'),
        author = BdApi.getPlugin('XenoLib');
      n(e, '1.2.11') && (ZeresPluginLibraryOutdated = !0), n(author, '1.3.14') && (XenoLibOutdated = !0);
    }
  } catch (i) {
    console.error('Error checking if libraries are out of date', i);
  }

  return !global.ZeresPluginLibrary || !global.XenoLib || ZeresPluginLibraryOutdated || XenoLibOutdated
    ? class {
        constructor() {
          this._XL_PLUGIN = true;
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
          return this.description;
        }
        stop() {}
        load() {
          const a = BdApi.findModuleByProps('isModalOpen');
          if (a && a.isModalOpen(`${this.name}_DEP_MODAL`)) return;
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
            g = BdApi.findModuleByProps('push', 'update', 'pop', 'popWithKey'),
            h = BdApi.findModuleByProps('Sizes', 'Weights'),
            i = BdApi.findModule(a => a.defaultProps && a.key && 'confirm-modal' === a.key()),
            j = () => BdApi.getCore().alert(e, `${f}<br/>Due to a slight mishap however, you'll have to download the libraries yourself. After opening the links, do CTRL + S to download the library.<br/>${c || ZeresPluginLibraryOutdated ? '<br/><a href="http://betterdiscord.net/ghdl/?url=https://github.com/rauenzi/BDPluginLibrary/blob/master/release/0PluginLibrary.plugin.js"target="_blank">Click here to download ZeresPluginLibrary</a>' : ''}${b || XenoLibOutdated ? '<br/><a href="http://betterdiscord.net/ghdl/?url=https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/1XenoLib.plugin.js"target="_blank">Click here to download XenoLib</a>' : ''}`);
          if (!g || !i || !h) return j();
          class k extends BdApi.React.PureComponent {
            constructor(a) {
              super(a), (this.state = { hasError: !1 });
            }
            componentDidCatch(a) {
              console.error(`Error in ${this.props.label}, screenshot or copy paste the error above to Lighty for help.`), this.setState({ hasError: !0 }), 'function' == typeof this.props.onError && this.props.onError(a);
            }
            render() {
              return this.state.hasError ? null : this.props.children;
            }
          }
          class l extends i {
            submitModal() {
              this.props.onConfirm();
            }
          }
          let m = !1;
          const n = g.push(
            a =>
              BdApi.React.createElement(
                k,
                {
                  label: 'missing dependency modal',
                  onError: () => {
                    g.popWithKey(n), j();
                  }
                },
                BdApi.React.createElement(
                  l,
                  Object.assign(
                    {
                      header: e,
                      children: [BdApi.React.createElement(h, { color: h.Colors.PRIMARY, children: [`${f} Please click Download Now to download ${d ? 'them' : 'it'}.`] })],
                      red: !1,
                      confirmText: 'Download Now',
                      cancelText: 'Cancel',
                      onConfirm: () => {
                        if (m) return;
                        m = !0;
                        const a = require('request'),
                          b = require('fs'),
                          c = require('path'),
                          d = () => {
                            (global.XenoLib && !XenoLibOutdated) || a('https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/1XenoLib.plugin.js', (a, d, e) => (a ? j() : void b.writeFile(c.join(window.ContentManager.pluginsFolder, '1XenoLib.plugin.js'), e, () => {})));
                          };
                        !global.ZeresPluginLibrary || ZeresPluginLibraryOutdated ? a('https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js', (a, e, f) => (a ? j() : void (b.writeFile(c.join(window.ContentManager.pluginsFolder, '0PluginLibrary.plugin.js'), f, () => {}), d()))) : d();
                      }
                    },
                    a
                  )
                )
              ),
            void 0,
            `${this.name}_DEP_MODAL`
          );
        }
        start() {}
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
