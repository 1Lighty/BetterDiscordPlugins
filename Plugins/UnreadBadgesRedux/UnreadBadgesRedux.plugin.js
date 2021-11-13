/**
 * @name UnreadBadgesRedux
 * @version 1.0.19
 * @invite NYvWdN5
 * @donate https://paypal.me/lighty13
 * @website https://1lighty.github.io/BetterDiscordStuff/?plugin=UnreadBadgesRedux
 * @source https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/UnreadBadgesRedux/UnreadBadgesRedux.plugin.js
 */
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
      name: 'UnreadBadgesRedux',
      authors: [
        {
          name: 'Lighty',
          discord_id: '239513071272329217',
          github_username: 'LightyPon',
          twitter_username: ''
        }
      ],
      version: '1.0.19',
      description: 'Adds a number badge to server icons and channels.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/UnreadBadgesRedux/UnreadBadgesRedux.plugin.js'
    },
    changelog: [
      {
        title: 'fixed',
        type: 'fixed',
        items: ['Hit it with a hammer a few times \'till it works.']
      }
    ],
    defaultConfig: [
      {
        type: 'category',
        id: 'misc',
        name: 'Display settings',
        collapsible: true,
        shown: true,
        settings: [
          {
            name: 'Display badge on folders',
            id: 'folders',
            type: 'switch',
            value: true
          },
          {
            name: 'Ignore muted servers in folders unread badge count',
            id: 'noMutedGuildsInFolderCount',
            type: 'switch',
            value: true
          },
          {
            name: 'Ignore muted channels in servers in folders unread badge count',
            id: 'noMutedChannelsInGuildsInFolderCount',
            type: 'switch',
            value: true
          },
          {
            name: "Don't display badge on expanded folders",
            id: 'expandedFolders',
            type: 'switch',
            value: true
          },
          {
            name: 'Display badge on servers',
            id: 'guilds',
            type: 'switch',
            value: true
          },
          {
            name: 'Display badge on muted servers',
            id: 'mutedGuilds',
            type: 'switch',
            value: true
          },
          {
            name: 'Ignore muted channels in server unread badge count',
            id: 'noMutedInGuildCount',
            type: 'switch',
            value: true
          },
          {
            name: 'Display badge on channels',
            id: 'channels',
            type: 'switch',
            value: true
          },
          {
            name: 'Display badge on muted channels',
            id: 'mutedChannels',
            type: 'switch',
            value: true
          },
          {
            name: 'Display badge on threads',
            id: 'threads',
            type: 'switch',
            value: true
          },
          {
            name: 'Display badge on left side on channels',
            note: "In case you want the settings button to stay where it always is. This however doesn't move it before the NSFW tag if you use the BetterNsfwTag plugin",
            id: 'channelsDisplayOnLeft',
            type: 'switch',
            value: false
          },
          {
            name: 'Background color',
            id: 'backgroundColor',
            type: 'color',
            value: '#7289da',
            options: {
              defaultColor: '#7289da'
            }
          },
          {
            name: 'Text color',
            id: 'textColor',
            type: 'color',
            value: '#ffffff',
            options: {
              defaultColor: '#ffffff'
            }
          },
          {
            name: 'Muted channel badge darkness',
            id: 'mutedChannelBadgeDarkness',
            type: 'slider',
            value: 0.25,
            min: 0,
            max: 1,
            equidistant: true,
            options: {
              equidistant: true
            }
          }
        ]
      }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api], BasePlugin) => {
    const { Settings, Utilities, WebpackModules, DiscordModules, ColorConverter, ReactComponents, PluginUtilities, Logger, ReactTools, ModalStack } = Api;
    const { React, ChannelStore } = DiscordModules;

    const Patcher = XenoLib.createSmartPatcher(Api.Patcher);

    const ReactSpring = WebpackModules.getByProps('useTransition');
    const BadgesModule = WebpackModules.getByProps('NumberBadge');
    const StoresModule = WebpackModules.getByProps('useStateFromStores');

    /* discord won't let me access it, so I remade it :( */
    class BadgeContainer extends React.PureComponent {
      componentDidMount() {
        this.forceUpdate();
      }
      componentWillAppear(e) {
        e();
      }
      componentWillEnter(e) {
        e();
      }
      componentWillLeave(e) {
        this.timeoutId = setTimeout(e, 300);
      }
      componentWillUnmount() {
        clearTimeout(this.timeoutId);
      }
      render() {
        return React.createElement(
          ReactSpring.animated.div,
          {
            className: this.props.className,
            style: this.props.animatedStyle
          },
          this.props.children
        );
      }
    }

    const UnreadStore = WebpackModules.getByProps('getUnreadCount');
    const MuteModule = WebpackModules.getByProps('isChannelMuted');
    const AltChannelStore = WebpackModules.find(m => m.getChannels && m.getDefaultChannel);
    const ThreadsStore = WebpackModules.getByProps('getActiveJoinedUnreadThreadsForGuild');

    const getUnreadCount = (guildId, includeMuted) => {
      const channels = AltChannelStore.getChannels(guildId);
      if (!channels) return 0;
      let count = 0;
      for (const { channel } of channels.SELECTABLE) {
        /* isChannelMuted is SLOW! */
        if (includeMuted || (!MuteModule.isChannelMuted(channel.guild_id, channel.id) && (!channel.parent_id || !MuteModule.isChannelMuted(channel.guild_id, channel.parent_id)))) count += UnreadStore.hasUnread(channel.id) ? UnreadStore.getUnreadCount(channel.id) : 0;
      }
      const unreadThreads = ThreadsStore.getActiveJoinedUnreadThreadsForGuild(guildId);
      for (const channelId in unreadThreads) {
        const threads = unreadThreads[channelId];
        for (const threadId in threads) {
          count += UnreadStore.hasUnread(threadId) ? UnreadStore.getUnreadCount(threadId) : 0
        }
      }
      return count;
    };

    class Slider extends Settings.SettingField {
      /* ripped out of ZeresPluginLibrary, because it does thingsin a way I DISLIKE!
         but otherwise full credits to Zerebos
         https://github.com/rauenzi/BDPluginLibrary/blob/master/src/ui/settings/types/slider.js
       */
      constructor(name, note, min, max, value, onChange, options = {}) {
        const props = {
          onChange: _ => _,
          defaultValue: value,
          disabled: options.disabled ? true : false,
          minValue: min,
          maxValue: max,
          handleSize: 10,
          initialValue: value /* added this */
        };
        if (options.fillStyles) props.fillStyles = options.fillStyles;
        if (options.markers) props.markers = options.markers;
        if (options.stickToMarkers) props.stickToMarkers = options.stickToMarkers;
        if (typeof options.equidistant != 'undefined') props.equidistant = options.equidistant;
        super(name, note, onChange, DiscordModules.Slider, Object.assign(props, { onValueChange: v => this.onChange(v) }));
      }
    }

    return class UnreadBadgesRedux extends BasePlugin(Plugin) {
      constructor() {
        super();
        /*
         * why are we letting Zere, the braindead American let control BD when he can't even
         * fucking read clearly documented and well known standards, such as __filename being
         * the files full fucking path and not just the filename itself, IS IT REALLY SO HARD
         * TO FUCKING READ?! https://nodejs.org/api/modules.html#modules_filename
         */
        const _zerecantcode_path = require('path');
        const theActualFileNameZere = _zerecantcode_path.join(__dirname, _zerecantcode_path.basename(__filename));
        XenoLib.changeName(theActualFileNameZere, 'UnreadBadgesRedux');
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
        try {
          WebpackModules.getByProps('openModal', 'hasModalOpen').closeModal(`${this.name}_DEP_MODAL`);
        } catch (e) { }
      }
      onStart() {
        const shouldPass = e => e && e.constructor && typeof e.constructor.name === 'string' && e.constructor.name.indexOf('HTML');
        if (shouldPass(window.Lightcord)) XenoLib.Notifications.warning(`[${this.getName()}] Lightcord is an unofficial and unsafe client with stolen code that is falsely advertising that it is safe, Lightcord has allowed the spread of token loggers hidden within plugins redistributed by them, and these plugins are not made to work on it. Your account is very likely compromised by malicious people redistributing other peoples plugins, especially if you didn't download this plugin from [GitHub](https://github.com/1Lighty/BetterDiscordPlugins/edit/master/Plugins/MessageLoggerV2/MessageLoggerV2.plugin.js), you should change your password immediately. Consider using a trusted client mod like [BandagedBD](https://rauenzi.github.io/BetterDiscordApp/) or [Powercord](https://powercord.dev/) to avoid losing your account.`, { timeout: 0 });
        this.promises = { state: { cancelled: false } };
        this.patchedModules = [];
        this.patchAll();
        this.forceUpdateGuildSidebars();
        PluginUtilities.addStyle(
          this.short + '-CSS',
          `
        .unread-badge {
            right: unset;
        }
        `
        );
      }

      onStop() {
        this.promises.state.cancelled = true;
        Patcher.unpatchAll();
        PluginUtilities.removeStyle(this.short + '-CSS');
        this.forceUpdateAll();
      }

      buildSetting(data) {
        if (data.type === 'color') {
          const setting = new XenoLib.Settings.ColorPicker(data.name, data.note, data.value, data.onChange, data.options);
          if (data.id) setting.id = data.id;
          return setting;
        } else if (data.type === 'slider') {
          const options = {};
          const { name, note, value, onChange, min, max } = data;
          if (typeof data.markers !== 'undefined') options.markers = data.markers;
          if (typeof data.stickToMarkers !== 'undefined') options.stickToMarkers = data.stickToMarkers;
          const setting = new Slider(name, note, min, max, value, onChange, options);
          if (data.id) setting.id = data.id;
          return setting;
        }
        return super.buildSetting(data);
      }

      saveSettings(_, setting, value) {
        super.saveSettings(_, setting, value);
        this.forceUpdateAll();
      }

      forceUpdateAll() {
        this.patchedModules.forEach(e => e());
        this.forceUpdateGuildSidebars();
      }

      forceUpdateGuildSidebars() {
        const guildSidebars = [...document.querySelectorAll(`.${XenoLib.getSingleClass('sidebar guilds')}`)];
        for (const guild of guildSidebars) {
          const instance = ReactTools.getReactInstance(guild);
          if (!instance) {
            Logger.warn('Found guild sidebar but no instance');
            continue;
          }
          const guildInstance = Utilities.findInTree(instance, e => e && e.type && e.type.displayName === 'Guilds', { walkable: ['return'] });
          if (!guildInstance) {
            Logger.warn('Found instance but no guild instance');
            continue;
          }
          if (guildInstance.stateNode && guildInstance.stateNode.forceUpdate) guildInstance.stateNode.forceUpdate();
        }
      }

      /* PATCHES */

      patchAll() {
        Utilities.suppressErrors(this.patchBlobMask.bind(this), 'BlobMask patch')(this.promises.state);
        Utilities.suppressErrors(this.patchChannelItem.bind(this), 'ChannelItem patch')(this.promises.state);
        Utilities.suppressErrors(this.patchThreadItem.bind(this), 'Thread item patch')(this.promises.state);
        Utilities.suppressErrors(this.patchConnectedGuild.bind(this), 'ConnectedGuild patch')(this.promises.state);
        Utilities.suppressErrors(this.patchGuildFolder.bind(this), 'GuildFolder patch')(this.promises.state);
      }

      async patchChannelItem(promiseState) {
        const TextChannel = await ReactComponents.getComponentByName('TextChannel', `.${XenoLib.getSingleClass('mentionsBadge containerDefault')}`);
        if (promiseState.cancelled) return;
        const settings = this.settings;
        const MentionsBadgeClassname = XenoLib.getClass('iconVisibility mentionsBadge');
        function UnreadBadge(e) {
          const unreadCount = StoresModule.useStateFromStores([UnreadStore], () => {
            if ((e.muted && !settings.misc.mutedChannels) || !settings.misc.channels) return 0;
            const count = UnreadStore.hasUnread(e.channelId) ? UnreadStore.getUnreadCount(e.channelId) : 0;
            if (count > 1000) return Math.floor(count / 1000) * 1000; /* only trigger rerender if it changes in thousands */
            return count;
          });
          if (!unreadCount) return null;
          return React.createElement(
            'div',
            {
              className: MentionsBadgeClassname
            },
            BadgesModule.NumberBadge({ count: unreadCount, color: e.muted ? ColorConverter.darkenColor(settings.misc.backgroundColor, settings.misc.mutedChannelBadgeDarkness * 100) : settings.misc.backgroundColor, style: { color: e.muted ? ColorConverter.darkenColor(settings.misc.textColor, settings.misc.mutedChannelBadgeDarkness * 100) : settings.misc.textColor } })
          );
        }
        Patcher.after(TextChannel.component.prototype, 'render', (_this, _, ret) => {
          const popout = Utilities.findInReactTree(ret, e => e && e.type && e.type.displayName === 'Popout');
          if (!popout || typeof popout.props.children !== 'function') return;
          const oChildren = popout.props.children;
          popout.props.children = () => {
            try {
              const ret = oChildren();
              const props = Utilities.findInReactTree(ret, e => e && Array.isArray(e.children) && e.children.find(e => e && e.type && e.type.displayName === 'ChannelItemEditButton'));
              if (!props || !props.children) return ret;
              const badge = React.createElement(UnreadBadge, { channelId: _this.props.channel.id, muted: _this.props.muted && !_this.props.selected });
              props.children.splice(this.settings.misc.channelsDisplayOnLeft ? 0 : 2, 0, badge);
              return ret;
            } catch (err) {
              Logger.stacktrace('Failed modifying return of original children in TextChannel!', err);
              try {
                return oChildren();
              } catch (err) {
                Logger.stacktrace('Failed returning return of original children in TextChannel!', err);
                return null;
              }
            }
          }
        });
        TextChannel.forceUpdateAll();
      }

      async patchThreadItem(promiseState) {
        const GuildSidebarThreadListEntry = WebpackModules.find(e => e.type && e.type.displayName === 'GuildSidebarThreadListEntry');
        const settings = this.settings;
        const MentionsBadgeClassname = XenoLib.getClass('iconVisibility mentionsBadge');
        function UnreadBadge(e) {
          const unreadCount = StoresModule.useStateFromStores([UnreadStore], () => {
            if (!settings.misc.threads) return 0;
            const count = UnreadStore.hasUnread(e.channelId) ? UnreadStore.getUnreadCount(e.channelId) : 0;
            if (count > 1000) return Math.floor(count / 1000) * 1000; /* only trigger rerender if it changes in thousands */
            return count;
          });
          if (!unreadCount) return null;
          return React.createElement(
            'div',
            {
              className: MentionsBadgeClassname
            },
            BadgesModule.NumberBadge({ count: unreadCount, color: settings.misc.backgroundColor, style: { color: settings.misc.textColor } })
          );
        }
        Patcher.after(GuildSidebarThreadListEntry, 'type', (_this, [props], ret) => {
          const content = Utilities.findInReactTree(ret, e => e && typeof e.className === 'string' && ~e.className.indexOf('mainContent-u_9PKf'));
          if (!content) return;
          const childProps = Utilities.findInReactTree(content, e => e && typeof e.className === 'string' && ~e.className.indexOf("children-3rEycc"));
          if (!childProps) return;
          const olChildren = childProps.children;
          childProps.children = [React.createElement(UnreadBadge, { channelId: props.thread.id })];
          if (this.settings.misc.channelsDisplayOnLeft) childProps.children.unshift(olChildren);
          else childProps.children.push(olChildren);
        });
      }

      async patchGuildFolder(promiseState) {
        const settings = this.settings;
        const FolderStore = WebpackModules.getByProps('isFolderExpanded');
        function BlobMaskWrapper(e) {
          e.__UBR_unread_count = StoresModule.useStateFromStores([UnreadStore, MuteModule], () => {
            try {
              if ((e.__UBR_folder_expanded && settings.misc.expandedFolders) || !settings.misc.folders) return 0;
              let count = 0;
              for (let i = 0; i < e.__UBR_guildIds.length; i++) {
                const guildId = e.__UBR_guildIds[i];
                if (!settings.misc.noMutedGuildsInFolderCount || (settings.misc.noMutedGuildsInFolderCount && !MuteModule.isMuted(guildId))) count += getUnreadCount(guildId, !settings.misc.noMutedChannelsInGuildsInFolderCount);
              }
              if (count > 1000) return Math.floor(count / 1000) * 1000; /* only trigger rerender if it changes in thousands */
              return count;
            } catch (err) {
              Logger.stacktrace('Error in guild folder blobk mask wrapper', err);
              return 0;
            }
          });
          return React.createElement(e.__UBR_old_type, e);
        }
        BlobMaskWrapper.displayName = 'BlobMask';
        const FolderHeader = WebpackModules.find(e => e.default && e.default.displayName === 'FolderHeader');
        Patcher.after(FolderHeader, 'default', (_, [props], ret) => {
          const mask = Utilities.findInReactTree(ret, e => e && e.type && e.type.displayName === 'BlobMask');
          if (!mask) return;
          mask.props.__UBR_old_type = mask.type;
          mask.props.__UBR_guildIds = props.folderNode.children.map(e => e.id);
          mask.props.__UBR_folder_expanded = FolderStore.isFolderExpanded(props.folderNode.id);
          mask.type = BlobMaskWrapper;
        });
        const folders = [...document.querySelectorAll('.wrapper-21YSNc')].map(e => ReactTools.getOwnerInstance(e));
        folders.forEach(instance => {
          if (!instance) return;
          const unpatch = Patcher.after(instance, 'render', (_, __, ret) => {
            unpatch();
            if (!ret) return;
            ret.key = `GETGOOD${Math.random()}`;
            const oRef = ret.props.setFolderRef;
            ret.props.setFolderRef = (e, n) => {
              _.forceUpdate();
              return oRef(e, n);
            };
          });
          instance.forceUpdate();
        });
      }

      patchConnectedGuild() {
        const GuildIconNode = WebpackModules.find(e => e.default && ~e.default.toString().indexOf('.renderUnavailableBadge'));

        const settings = this.settings;
        function PatchedGuildTooltip(e) {
          if (!e) return null;
          try {
            const ret = e.__UBR_old_type(e);
            const guildId = e.guild.id;
            const unreadCount = StoresModule.useStateFromStores([UnreadStore, MuteModule], () => {
              try {
                return (!settings.misc.guilds || (!settings.misc.mutedGuilds && MuteModule.isMuted(guildId)) ? 0 : getUnreadCount(guildId, !settings.misc.noMutedInGuildCount));
              } catch (err) {
                Logger.stacktrace('Error in conneced guild patch', err);
                return 0;
              }
            });
            const blobMarkRef = React.useRef(null);
            React.useLayoutEffect(() => {
              try {
                const bmi = blobMarkRef.current;
                if (!bmi) return;
                if (bmi.state.__UBR_unread_count === unreadCount) return;
                bmi.props = unreadCount;
                bmi.forceUpdate();
              } catch (err) {
                Logger.stacktrace('Error in guild hack');
              }
            }, [unreadCount]);
            if (ret.type.displayName === 'Tooltip') {
            ret.props.__UBR_unread_count = unreadCount;
            const oChildren = ret.props.children;
            ret.props.children = e => {
              try {
                const ret2 = oChildren(e);
                const mask = Utilities.findInTree(ret2, e => e && e.type && e.type.displayName === 'BlobMask', { walkable: ['props', 'children'] });
                if (!mask) return ret2;
                mask.props.__UBR_unread_count = unreadCount;
                mask.props.guildId = guildId;
                mask.ref = blobMarkRef;
                return ret2;
              } catch (err) {
                Logger.stacktrace('Failed running old of children in PatchedGuildTooltip!', err);
                try {
                  return oChildren(e);
                } catch (err) {
                  Logger.stacktrace('Failed running only old of children in PatchedGuildTooltip', err);
                  return null;
                }
              }
            };
            }
            return ret;
          } catch (err) {
            Logger.stacktrace('Failed running old of PatchedGuildTooltip', err);
            try {
              return e.__UBR_old_type(e);
            } catch (err) {
              Logger.stacktrace('Failed running only old of PatchedGuildTooltip', err);
              return null;
            }
          }
        }
        Patcher.after(GuildIconNode, 'default', (_, __, ret) => {
          const tooltip = Utilities.findInReactTree(ret, e => e && e.type && e.type.displayName === 'GuildTooltip');
          if (!tooltip) return;
          tooltip.props.__UBR_old_type = tooltip.type;
          tooltip.type = PatchedGuildTooltip;
        });
      }

      async patchBlobMask(promiseState) {
        const selector = `.${XenoLib.getSingleClass('lowerBadge wrapper')}`;
        const BlobMask = await ReactComponents.getComponentByName('BlobMask', selector);
        if (!BlobMask.selector) BlobMask.selector = selector;
        if (promiseState.cancelled) return;
        const ensureUnreadBadgeMask = _this => {
          if (_this.state.unreadBadgeMask) return;
          _this.state.unreadBadgeMask = new ReactSpring.Controller({
            spring: !!_this.props.__UBR_unread_count
          });
        };
        Patcher.after(BlobMask.component.prototype, 'componentDidMount', _this => {
          if (typeof _this.props.__UBR_unread_count !== 'number') return;
          ensureUnreadBadgeMask(_this);
          _this.state.unreadBadgeMask
            .update({
              spring: !!_this.props.__UBR_unread_count,
              immediate: true
            })
            .start();
        });
        Patcher.after(BlobMask.component.prototype, 'componentWillUnmount', _this => {
          if (typeof _this.props.__UBR_unread_count !== 'number') return;
          if (!_this.state.unreadBadgeMask) return;
          if (typeof _this.state.unreadBadgeMask.destroy === 'function') _this.state.unreadBadgeMask.destroy();
          else _this.state.unreadBadgeMask.dispose();
          _this.state.unreadBadgeMask = null;
        });
        Patcher.after(BlobMask.component.prototype, 'componentDidUpdate', (_this) => {
          if (typeof _this.props.__UBR_unread_count !== 'number' || _this.props.__UBR_unread_count === _this.state.__UBR_unread_count) return;
          _this.state.__UBR_unread_count = _this.props.__UBR_unread_count;
          ensureUnreadBadgeMask(_this);
          _this.state.unreadBadgeMask
            .update({
              spring: !!_this.props.__UBR_unread_count,
              immediate: !document.hasFocus(),
              config: {
                friction: 40,
                tension: 900,
                mass: 1
              }
            })
            .start();
          setImmediate(() => {
            _this.state.unreadBadgeMask.start();
          })
        });
        const LowerBadgeClassname = XenoLib.joinClassNames(XenoLib.getClass('wrapper lowerBadge'), 'unread-badge');
        Patcher.before(BlobMask.component, 'getDerivedStateFromProps', (_this, args, ret) => {
          const [props] = args;
          if (typeof props.__UBR_unread_count !== 'number' || !props.__UBR_unread_count) return;
          args[0] = { ...props, selected: true };
        });
        Patcher.after(BlobMask.component.prototype, 'render', (_this, _, ret) => {
          if (typeof _this.props.__UBR_unread_count !== 'number') return;
          const badges = Utilities.findInTree(ret, e => e && e.type && e.type.displayName === 'TransitionGroup', { walkable: ['props', 'children'] });
          const masks = Utilities.findInTree(ret, e => e && e.type === 'mask', { walkable: ['props', 'children'] });
          if (!badges || !masks) return;
          ensureUnreadBadgeMask(_this);
          /* if count is 0, we're animating out, and as such, it's better to at least still display the old
             count while animating out
           */
          const counter = _this.props.__UBR_unread_count || _this.state.__UBR_old_unread_count;
          if (_this.props.__UBR_unread_count) _this.state.__UBR_old_unread_count = _this.props.__UBR_unread_count;
          const width = BadgesModule.getBadgeWidthForValue(counter);
          const unreadCountMaskSpring = (_this.state.unreadBadgeMask.animated || _this.state.unreadBadgeMask.springs).spring;
          masks.props.children.push(
            React.createElement(ReactSpring.animated.rect, {
              x: -4,
              y: 28,
              width: width + 8,
              height: 24,
              rx: 12,
              ry: 12,
              opacity: unreadCountMaskSpring.to([0, 0.5, 1], [0, 0, 1]),
              transform: unreadCountMaskSpring.to([0, 1], [-16, 0]).to(e => `translate(${e} ${-e})`),
              fill: 'black'
            })
          );
          badges.props.children.unshift(
            React.createElement(
              BadgeContainer,
              {
                className: LowerBadgeClassname,
                animatedStyle: {
                  opacity: unreadCountMaskSpring.to([0, 0.5, 1], [0, 0, 1]),
                  transform: unreadCountMaskSpring.to(e => `translate(${-20 + 20 * e} ${-1 * (16 - 16 * e)})`)
                }
              },
              React.createElement(BadgesModule.NumberBadge, { count: counter, color: this.settings.misc.backgroundColor, style: { color: this.settings.misc.textColor } })
            )
          );
        });
        BlobMask.forceUpdateAll();
      }
      showChangelog = () => XenoLib.showChangelog(`${this.name} has been updated!`, this.version, this._config.changelog);
      getSettingsPanel = () =>
        this.buildSettingsPanel()
          .append(new XenoLib.Settings.PluginFooter(() => this.showChangelog()))
          .getElement();
    };
  };

  /* Finalize */

  /* shared getters */
  const BasePlugin = cl =>
    class extends cl {
      constructor() {
        super();
        Object.defineProperties(this, {
          name: { get: () => config.info.name },
          short: { get: () => config.info.name.split('').reduce((acc, char) => acc + (char === char.toUpperCase() ? char : '')) },
          author: { get: () => config.info.authors.map(author => author.name).join(', ') },
          version: { get: () => config.info.version },
          description: { get: () => config.info.description }
        });
      }
    };

  /* this new lib loader is lit */
  let ZeresPluginLibraryOutdated = false;
  let XenoLibOutdated = false;
  try {
    const a = (c, a) => ((c = c.split('.').map(b => parseInt(b))), (a = a.split('.').map(b => parseInt(b))), !!(a[0] > c[0])) || !!(a[0] == c[0] && a[1] > c[1]) || !!(a[0] == c[0] && a[1] == c[1] && a[2] > c[2]),
      b = (b, c) => ((b && b._config && b._config.info && b._config.info.version && a(b._config.info.version, c)) || typeof global.isTab !== 'undefined');
    let c = BdApi.Plugins.get('ZeresPluginLibrary'),
      d = BdApi.Plugins.get('XenoLib');
    if (c && c.exports && c.instance) c = c.instance; // BD specific fixes
    if (d && d.exports && d.instance) d = d.instance; // BD specific fixes
    b(c, '1.2.33') && (ZeresPluginLibraryOutdated = !0), b(d, '1.3.43') && (XenoLibOutdated = !0);
  } catch (a) {
    console.error('Error checking if libraries are out of date', a);
  }

  /* to anyone asking "why are you checking if x is out of date", well you see, sometimes, for whatever reason
     the libraries are sometimes not updating for people. Either it doesn't check for an update, or the request
     for some odd reason just fails. Yet, plugins update just fine with the same domain.
   */
  return !global.ZeresPluginLibrary || !global.XenoLib || global.DiscordJS || ZeresPluginLibraryOutdated || XenoLibOutdated
    ? class extends BasePlugin(class { }) {
      constructor() {
        super();
        this._XL_PLUGIN = true;
        this.getName = () => this.name.replace(/\s+/g, '');
        this.getAuthor = () => this.author;
        this.getVersion = () => this.version;
        this.getDescription = () => this.description + (global.BetterDiscordConfig ? '' : ' You are missing libraries for this plugin, please enable the plugin and click Download Now.');
        this.start = this.load = this.handleMissingLib;
      }
      start() { }
      stop() { }
      handleMissingLib() {
        if ("undefined" != typeof global.isTab) return;
        const a = !!window.powercord && -1 !== (window.bdConfig && window.bdConfig.dataPath || "").indexOf("bdCompat") && "function" == typeof BdApi.__getPluginConfigPath, b = BdApi.findModuleByProps("openModal", "hasModalOpen");
        if (b && b.hasModalOpen(`${this.name}_DEP_MODAL`)) return;
        const c = !global.XenoLib, d = !global.ZeresPluginLibrary, e = c && d || (c || d) && (XenoLibOutdated || ZeresPluginLibraryOutdated),
          f = (() => { let a = ""; return c || d ? a += `Missing${XenoLibOutdated || ZeresPluginLibraryOutdated ? " and outdated" : ""} ` : (XenoLibOutdated || ZeresPluginLibraryOutdated) && (a += `Outdated `), a += `${e ? "Libraries" : "Library"} `, a })(),
          g = (() => {
            let a = `The ${e ? "libraries" : "library"} `; return c || XenoLibOutdated ? (a += "XenoLib ", (d || ZeresPluginLibraryOutdated) && (a += "and ZeresPluginLibrary ")) : (d || ZeresPluginLibraryOutdated) && (a += "ZeresPluginLibrary "),
              a += `required for ${this.name} ${e ? "are" : "is"} ${c || d ? "missing" : ""}${XenoLibOutdated || ZeresPluginLibraryOutdated ? c || d ? " and/or outdated" : "outdated" : ""}.`, a
          })(), h = BdApi.findModuleByDisplayName("Text"), i = BdApi.findModuleByDisplayName("ConfirmModal"),
          j = () => BdApi.alert(f, BdApi.React.createElement("span", { style: { color: "white" } }, BdApi.React.createElement("div", {}, g), `Due to a slight mishap however, you'll have to download the libraries yourself. This is not intentional, something went wrong, errors are in console.`,
            d || ZeresPluginLibraryOutdated ? BdApi.React.createElement("div", {}, BdApi.React.createElement("a", { href: "https://betterdiscord.net/ghdl?id=2252", target: "_blank" }, "Click here to download ZeresPluginLibrary")) : null, c || XenoLibOutdated ? BdApi.React.createElement("div", {},
              BdApi.React.createElement("a", { href: "https://betterdiscord.net/ghdl?id=3169", target: "_blank" }, "Click here to download XenoLib")) : null)); if (global.ohgodohfuck) return; if (!b || !i || !h) return console.error(`Missing components:${(b ? "" : " ModalStack") + (i ? "" : " ConfirmationModalComponent") + (h ? "" : "TextElement")}`),
                j(); class k extends BdApi.React.PureComponent {
          constructor(a) {
            super(a), this.state = { hasError: !1 }, this.componentDidCatch = a => (console.error(`Error in ${this.props.label}, screenshot or copy paste the error above to Lighty for help.`), this.setState({ hasError: !0 }), "function" == typeof this.props.onError && this.props.onError(a)),
              this.render = () => this.state.hasError ? null : this.props.children
          }
        } let l = !!global.DiscordJS, m = !1; const n = b.openModal(c => {
          if (m) return null; try {
            return BdApi.React.createElement(k, { label: "missing dependency modal", onError: () => (b.closeModal(n), j()) }, BdApi.React.createElement(i,
              Object.assign({
                header: f, children: BdApi.React.createElement(h, { size: h.Sizes.SIZE_16, children: [`${g} Please click Download Now to download ${e ? "them" : "it"}.`] }), red: !1, confirmText: "Download Now", cancelText: "Cancel", onCancel: c.onClose, onConfirm: () => {
                  if (l) return; l = !0; const c = require("request"), d = require("fs"),
                    e = require("path"), f = BdApi.Plugins && BdApi.Plugins.folder ? BdApi.Plugins.folder : window.ContentManager.pluginsFolder, g = () => {
                      global.XenoLib && !XenoLibOutdated || c("https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/1XenoLib.plugin.js", (c, g, h) => {
                        try {
                          if (c || 200 !== g.statusCode) return b.closeModal(n),
                            j(); d.writeFile(e.join(f, "1XenoLib.plugin.js"), h, () => { BdApi.isSettingEnabled("fork-ps-5") && !a || BdApi.Plugins.reload(this.getName()) })
                        } catch (a) { console.error("Fatal error downloading XenoLib", a), b.closeModal(n), j() }
                      })
                    }; !global.ZeresPluginLibrary || ZeresPluginLibraryOutdated ? c("https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js",
                      (a, c, h) => { try { if (a || 200 !== c.statusCode) return b.closeModal(n), j(); d.writeFile(e.join(f, "0PluginLibrary.plugin.js"), h, () => { }), g() } catch (a) { console.error("Fatal error downloading ZeresPluginLibrary", a), b.closeModal(n), j() } }) : g()
                }
              }, c, { onClose: () => { } })))
          } catch (a) { return console.error("There has been an error constructing the modal", a), m = !0, b.closeModal(n), j(), null }
        }, { modalKey: `${this.name}_DEP_MODAL` });
      }
    }
    : buildPlugin(global.ZeresPluginLibrary.buildPlugin(config), BasePlugin);
})();

/*@end@*/
