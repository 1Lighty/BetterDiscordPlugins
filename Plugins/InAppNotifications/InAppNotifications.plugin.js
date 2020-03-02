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
      version: '1.0.0',
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
        title: 'I now exist!',
        type: 'added',
        items: ['In-app notifications will show when someone sends a message!', "It's tied to your notification settings of Discord, which can be accessed by right clicking a server, channel, or muting a DM."]
      },
      { type: 'description', content: 'Preview:' },
      { type: 'video', src: 'https://cdn.discordapp.com/attachments/389049952732446733/684075783890927714/F2nifRZ0ZWp6.mp4', thumbnail: 'https://media.discordapp.net/attachments/389049952732446733/684075783890927714/F2nifRZ0ZWp6.mp4?format=jpeg&width=360&height=89', height: 112 }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { ContextMenu, EmulatedTooltip, Toasts, Settings, Popouts, Modals, Utilities, WebpackModules, Filters, DiscordModules, ColorConverter, DOMTools, DiscordClasses, DiscordSelectors, ReactTools, ReactComponents, DiscordAPI, Logger, Patcher, PluginUpdater, PluginUtilities, DiscordClassModules, Structs } = Api;
    const { React, ModalStack, ContextMenuActions, ContextMenuItem, ContextMenuItemsGroup, ReactDOM, ChannelStore, GuildStore, UserStore, DiscordConstants, Dispatcher, GuildMemberStore, GuildActions, SwitchRow, EmojiUtils, RadioGroup, Permissions, TextElement, FlexChild, PopoutOpener, Textbox, RelationshipStore, WindowInfo, UserSettingsStore, NavigationUtils } = DiscordModules;

    const LurkerStore = WebpackModules.getByProps('isLurking');
    const MuteStore = WebpackModules.getByProps('allowNoMessages');
    const isMentionedUtils = WebpackModules.getByProps('isRawMessageMentioned');
    const NotificationUtils = WebpackModules.getByProps('makeTextChatNotification');
    const ParserModule = WebpackModules.getByProps('parseAllowLinks', 'parse');
    const MessageClasses = WebpackModules.getByProps('username', 'messageContent');
    const MarkupClassname = XenoLib.getClass('markup');

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
      }
      onStart() {
        this.errorCount = 0;
        Dispatcher.subscribe('MESSAGE_CREATE', this.MESSAGE_CREATE);
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
        if (!this._shouldNotify(iAuthor, iChannel)) return false;
        if (DiscordAPI.currentChannel && DiscordAPI.currentChannel.id === iChannel.id) return false;
        if (MuteStore.allowAllMessages(iChannel)) return true;
        const everyoneSuppressed = MuteStore.isSuppressEveryoneEnabled(iChannel.guild_id);
        const rolesSuppressed = MuteStore.isSuppressRolesEnabled(iChannel.guild_id);
        return isMentionedUtils.isRawMessageMentioned(message, DiscordAPI.currentUser.id, everyoneSuppressed, rolesSuppressed);
      }

      MESSAGE_CREATE({ channelId, message }) {
        const iChannel = ChannelStore.getChannel(channelId);
        const iAuthor = UserStore.getUser(message.author.id);
        if (!iChannel || !iAuthor) return;
        if (!this.shouldNotify(message, iChannel, iAuthor)) return;
        if (DiscordAPI.currentChannel && WindowInfo.isFocused() && channelId === DiscordAPI.currentChannel.id) return;
        const notif = NotificationUtils.makeTextChatNotification(iChannel, message, iAuthor);
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
            React.createElement('div', { className: XenoLib.joinClassNames(MarkupClassname, MessageClasses.messageContent) }, ParserModule.parse(notif.body))
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
        o = BdApi.getPlugin('XenoLib');
      n(e, '1.2.10') && (ZeresPluginLibraryOutdated = !0), n(o, '1.3.11') && (XenoLibOutdated = !0);
    }
  } catch (i) {
    console.error('Error checking if libraries are out of date', i);
  }

  return !global.ZeresPluginLibrary || !global.XenoLib || ZeresPluginLibraryOutdated || XenoLibOutdated
    ? class {
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
          const a = !global.XenoLib,
            b = !global.ZeresPluginLibrary,
            c = (a && b) || ((a || b) && (XenoLibOutdated || ZeresPluginLibraryOutdated)) || XenoLibOutdated || ZeresPluginLibraryOutdated,
            d = (() => {
              let d = '';
              return a || b ? (d += `Missing${XenoLibOutdated || ZeresPluginLibraryOutdated ? ' and outdated' : ''} `) : (XenoLibOutdated || ZeresPluginLibraryOutdated) && (d += `Outdated `), (d += `${c ? 'Libraries' : 'Library'} `), d;
            })(),
            e = (() => {
              let d = `The ${c ? 'libraries' : 'library'} `;
              return a || XenoLibOutdated ? ((d += 'XenoLib '), (b || ZeresPluginLibraryOutdated) && (d += 'and ZeresPluginLibrary ')) : (b || ZeresPluginLibraryOutdated) && (d += 'ZeresPluginLibrary '), (d += `required for ${this.name} ${c ? 'are' : 'is'} ${a || b ? 'missing' : ''}${XenoLibOutdated || ZeresPluginLibraryOutdated ? (a || b ? ' and/or outdated' : 'outdated') : ''}.`), d;
            })(),
            f = BdApi.findModuleByProps('push', 'update', 'pop', 'popWithKey'),
            g = BdApi.findModuleByProps('Sizes', 'Weights'),
            h = BdApi.findModule(a => a.defaultProps && a.key && 'confirm-modal' === a.key()),
            i = () => BdApi.getCore().alert(d, `${e}<br/>Due to a slight mishap however, you'll have to download the libraries yourself. After opening the links, do CTRL + S to download the library.<br/>${b || ZeresPluginLibraryOutdated ? '<br/><a href="http://betterdiscord.net/ghdl/?url=https://github.com/rauenzi/BDPluginLibrary/blob/master/release/0PluginLibrary.plugin.js"target="_blank">Click here to download ZeresPluginLibrary</a>' : ''}${a || XenoLibOutdated ? '<br/><a href="http://betterdiscord.net/ghdl/?url=https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/1XenoLib.plugin.js"target="_blank">Click here to download XenoLib</a>' : ''}`);
          if (!f || !h || !g) return i();
          let j;
          const k = (() => {
            if (!global.pluginModule || !global.BDEvents) return;
            if (a || XenoLibOutdated) {
              const a = () => {
                BDEvents.off('xenolib-loaded', a), f.popWithKey(j), pluginModule.reloadPlugin(this.name);
              };
              return BDEvents.on('xenolib-loaded', a), () => BDEvents.off('xenolib-loaded', a);
            }
            const b = a => {
              'ZeresPluginLibrary' !== a || (BDEvents.off('plugin-loaded', b), BDEvents.off('plugin-reloaded', b), f.popWithKey(j), pluginModule.reloadPlugin(this.name));
            };
            return BDEvents.on('plugin-loaded', b), BDEvents.on('plugin-reloaded', b), () => (BDEvents.off('plugin-loaded', b), BDEvents.off('plugin-reloaded', b));
          })();
          class l extends BdApi.React.PureComponent {
            constructor(a) {
              super(a), (this.state = { hasError: !1 });
            }
            componentDidCatch(a, b) {
              console.error(`Error in ${this.props.label}, screenshot or copy paste the error above to Lighty for help.`), this.setState({ hasError: !0 }), 'function' == typeof this.props.onError && this.props.onError(a);
            }
            render() {
              return this.state.hasError ? null : this.props.children;
            }
          }
          j = f.push(a =>
            BdApi.React.createElement(
              l,
              {
                label: 'missing dependency modal',
                onError: () => {
                  f.popWithKey(j), i();
                }
              },
              BdApi.React.createElement(
                h,
                Object.assign(
                  {
                    header: d,
                    children: [BdApi.React.createElement(g, { color: g.Colors.PRIMARY, children: [`${e} Please click Download Now to download ${c ? 'them' : 'it'}.`] })],
                    red: !1,
                    confirmText: 'Download Now',
                    cancelText: 'Cancel',
                    onConfirm: () => {
                      k();
                      const a = require('request'),
                        b = require('fs'),
                        c = require('path'),
                        d = a => {
                          if (!global.BDEvents) return a();
                          const b = c => {
                            'ZeresPluginLibrary' !== c || (BDEvents.off('plugin-loaded', b), BDEvents.off('plugin-reloaded', b), a());
                          };
                          BDEvents.on('plugin-loaded', b), BDEvents.on('plugin-reloaded', b);
                        },
                        e = () => {
                          if (!global.pluginModule || (!global.BDEvents && !global.XenoLib)) return;
                          if ((global.XenoLib && !XenoLibOutdated) || !global.BDEvents) return pluginModule.reloadPlugin(this.name);
                          const a = () => {
                            BDEvents.off('xenolib-loaded', a), pluginModule.reloadPlugin(this.name);
                          };
                          BDEvents.on('xenolib-loaded', a);
                        },
                        f = () => (global.XenoLib && !XenoLibOutdated ? e() : void a('https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/1XenoLib.plugin.js', (a, d, f) => (a ? i() : void (e(), b.writeFile(c.join(window.ContentManager.pluginsFolder, '1XenoLib.plugin.js'), f, () => {})))));
                      !global.ZeresPluginLibrary || ZeresPluginLibraryOutdated ? a('https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js', (a, e, g) => (a ? i() : void (d(f), b.writeFile(c.join(window.ContentManager.pluginsFolder, '0PluginLibrary.plugin.js'), g, () => {})))) : f();
                    }
                  },
                  a
                )
              )
            )
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
