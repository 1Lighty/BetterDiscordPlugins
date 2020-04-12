//META{"name":"UnreadBadgesRedux","source":"https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/UnreadBadgesRedux/","website":"https://1lighty.github.io/BetterDiscordStuff/?plugin=UnreadBadgesRedux","authorId":"239513071272329217","invite":"NYvWdN5","donate":"https://paypal.me/lighty13"}*//
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
 * Copyright© 2019-2020, _Lighty_
 * All rights reserved.
 * Code may not be redistributed, modified or otherwise taken without explicit permission.
 */
var UnreadBadgesRedux = (() => {
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
      version: '1.0.4',
      description: 'Adds a number badge to server icons and channels.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/UnreadBadgesRedux/UnreadBadgesRedux.plugin.js'
    },
    changelog: [
      {
        title: 'fixed',
        type: 'fixed',
        items: ['Fixed badge not showing on folders on Discord canary']
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
  const buildPlugin = ([Plugin, Api]) => {
    const { Settings, Utilities, WebpackModules, DiscordModules, ColorConverter, ReactComponents, Patcher, PluginUtilities, Logger, ReactTools, ModalStack } = Api;
    const { React, ChannelStore } = DiscordModules;

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
    const MuteModule = WebpackModules.getByProps('isMuted');
    const AltChannelStore = WebpackModules.find(m => m.getChannels && m.getChannels.length === 1);

    const getUnreadCount = (guildId, includeMuted) => {
      const channels = AltChannelStore.getChannels(guildId);
      let count = 0;
      for (const { channel } of channels.SELECTABLE) {
        /* isChannelMuted is SLOW! */
        if (includeMuted || (!MuteModule.isChannelMuted(channel.guild_id, channel.id) && (!channel.parent_id || !MuteModule.isChannelMuted(channel.guild_id, channel.parent_id)))) count += UnreadStore.getUnreadCount(channel.id);
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

    return class UnreadBadgesRedux extends Plugin {
      constructor() {
        super();
        XenoLib.changeName(__filename, 'UnreadBadgesRedux');
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
        try {
          ModalStack.popWithKey(`${this.name}_DEP_MODAL`);
        } catch (e) {}
      }
      onStart() {
        this.promises = { state: { cancelled: false } };
        this.patchedModules = [];
        this.patchAll();
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
      }

      /* PATCHES */

      patchAll() {
        Utilities.suppressErrors(this.patchBlobMask.bind(this), 'BlobMask patch')(this.promises.state);
        Utilities.suppressErrors(this.patchGuildIcon.bind(this), 'GuildIcon patch')(this.promises.state);
        Utilities.suppressErrors(this.patchChannelItem.bind(this), 'ChannelItem patch')(this.promises.state);
        Utilities.suppressErrors(this.patchConnectedGuild.bind(this), 'ConnectedGuild patch')(this.promises.state);
        Utilities.suppressErrors(this.patchGuildFolder.bind(this), 'GuildFolder patch')(this.promises.state);
      }

      async patchChannelItem(promiseState) {
        const selector = `.${XenoLib.getSingleClass('modeUnread wrapper', true)}`;
        const ChannelItem = await ReactComponents.getComponentByName('ChannelItem', selector);
        if (!ChannelItem.selector) ChannelItem.selector = selector;
        if (promiseState.cancelled) return;
        const settings = this.settings;
        const MentionsBadgeClassname = XenoLib.getClass('iconVisibility mentionsBadge');
        const IconsChildren = XenoLib.getClass('modeMuted children');
        function UnreadBadge(e) {
          const unreadCount = StoresModule.useStateFromStores([UnreadStore], () => {
            if ((e.muted && !settings.misc.mutedChannels) || !settings.misc.channels) return 0;
            const count = UnreadStore.getUnreadCount(e.channelId);
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
        Patcher.after(ChannelItem.component.prototype, 'renderIcons', (_this, args, ret) => {
          const badge = React.createElement(UnreadBadge, { channelId: _this.props.channel.id, muted: _this.props.muted && !_this.props.selected });
          if (!ret) {
            return React.createElement(
              'div',
              {
                onClick: e => e.stopPropagation(),
                className: IconsChildren
              },
              badge
            );
          }
          /* children is a refernce to the children prop within the component, which is bad
             so appending it without slicing first would append it to the components props
             children array
           */
          const buttons = ret.props.children.slice(0);
          if (!buttons) return;
          buttons.splice(this.settings.misc.channelsDisplayOnLeft ? 0 : 2, 0, badge);
          ret.props.children = buttons;
        });
        ChannelItem.forceUpdateAll();
      }

      async patchGuildFolder(promiseState) {
        const settings = this.settings;
        const FolderStore = WebpackModules.getByProps('isFolderExpanded');
        function BlobMaskWrapper(e) {
          e.__UBR_unread_count = StoresModule.useStateFromStores([UnreadStore, MuteModule], () => {
            if ((e.__UBR_folder_expanded && settings.misc.expandedFolders) || !settings.misc.folders) return 0;
            let count = 0;
            for (let i = 0; i < e.__UBR_guildIds.length; i++) {
              const guildId = e.__UBR_guildIds[i];
              if (!settings.misc.noMutedGuildsInFolderCount || (settings.misc.noMutedGuildsInFolderCount && !MuteModule.isMuted(guildId))) count += getUnreadCount(guildId, !settings.misc.noMutedChannelsInGuildsInFolderCount);
            }
            if (count > 1000) return Math.floor(count / 1000) * 1000; /* only trigger rerender if it changes in thousands */
            return count;
          });
          return React.createElement(e.__UBR_old_type, e);
        }
        BlobMaskWrapper.displayName = 'BlobMask';
        const GuildFolderMemo = WebpackModules.find(m => m.type && m.type.toString().indexOf('.ContextMenuTypes.GUILD_ICON_FOLDER') !== -1);
        if (GuildFolderMemo) {
          Patcher.after(GuildFolderMemo, 'type', (_, [props], ret) => {
            const mask = Utilities.findInReactTree(ret, e => e && e.type && e.type.displayName === 'BlobMask');
            if (!mask) return;
            mask.props.__UBR_old_type = mask.type;
            mask.props.__UBR_guildIds = props.guildIds;
            mask.props.__UBR_folder_expanded = FolderStore.isFolderExpanded(props.folderId);
            mask.type = BlobMaskWrapper;
          });
          const instance = ReactTools.getOwnerInstance(document.querySelector('.wrapper-21YSNc'));
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
          return;
        }
        const selector = `.${XenoLib.getSingleClass('folder wrapper', true)}`;
        const GuildFolder = await ReactComponents.getComponentByName('GuildFolder', selector);
        if (!GuildFolder.selector) GuildFolder.selector = selector;
        if (promiseState.cancelled) return;
        Patcher.after(GuildFolder.component.prototype, 'render', (_this, _, ret) => {
          const mask = Utilities.findInTree(ret, e => e && e.type && e.type.displayName === 'BlobMask', { walkable: ['props', 'children'] });
          if (!mask) return;
          mask.props.__UBR_old_type = mask.type;
          mask.props.__UBR_guildIds = _this.props.guildIds;
          mask.props.__UBR_folder_expanded = _this.props.expanded;
          mask.type = BlobMaskWrapper;
        });
        GuildFolder.forceUpdateAll();
        this.patchedModules.push(GuildFolder.forceUpdateAll.bind(GuildFolder));
      }

      async patchConnectedGuild(promiseState) {
        const selector = `.${XenoLib.getSingleClass('listItem', true)}`;
        const ConnectedGuild = await ReactComponents.getComponentByName('DragSource(ConnectedGuild)', selector);
        if (!ConnectedGuild.selector) ConnectedGuild.selector = selector;
        if (promiseState.cancelled) return;
        const settings = this.settings;
        function PatchedConnectedGuild(e) {
          /* get on my level scrublords */
          e.__UBR_unread_count = StoresModule.useStateFromStores([UnreadStore, MuteModule], () => (!settings.misc.guilds || (!settings.misc.mutedGuilds && MuteModule.isMuted(e.guildId)) ? 0 : getUnreadCount(e.guildId, !settings.misc.noMutedInGuildCount)));
          return e.__UBR_old_type(e);
        }
        PatchedConnectedGuild.displayName = 'ConnectedGuild';
        Patcher.after(ConnectedGuild.component.prototype, 'render', (_this, _, ret) => {
          const old = ret.props.children;
          ret.props.children = e => {
            const ret2 = old(e);
            ret2.props.__UBR_old_type = ret2.type;
            ret2.type = PatchedConnectedGuild;
            return ret2;
          };
        });
        ConnectedGuild.forceUpdateAll();
        this.patchedModules.push(ConnectedGuild.forceUpdateAll.bind(ConnectedGuild));
      }

      async patchGuildIcon(promiseState) {
        const selector = `.${XenoLib.getSingleClass('listItem', true)}`;
        const Guild = await ReactComponents.getComponentByName('Guild', selector);
        if (!Guild.selector) Guild.selector = selector;
        if (promiseState.cancelled) return;
        Patcher.after(Guild.component.prototype, 'render', (_this, _, ret) => {
          const mask = Utilities.findInTree(ret, e => e && e.type && e.type.displayName === 'BlobMask', { walkable: ['props', 'children'] });
          if (!mask) return;
          mask.props.__UBR_unread_count = _this.props.__UBR_unread_count;
          mask.props.guildId = _this.props.guildId;
        });
        Guild.forceUpdateAll();
      }

      async patchBlobMask(promiseState) {
        const selector = `.${XenoLib.getSingleClass('lowerBadge wrapper')}`;
        const BlobMask = await ReactComponents.getComponentByName('BlobMask', selector);
        if (!BlobMask.selector) BlobMask.selector = selector;
        if (promiseState.cancelled) return;
        const ensureUnreadBadgeMask = _this => {
          if (_this.state.unreadBadgeMask) return;
          _this.state.unreadBadgeMask = new ReactSpring.Controller({
            spring: 0
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
          _this.state.unreadBadgeMask.destroy();
          _this.state.unreadBadgeMask = null;
        });
        Patcher.after(BlobMask.component.prototype, 'componentDidUpdate', (_this, [{ __UBR_unread_count }]) => {
          if (typeof _this.props.__UBR_unread_count !== 'number' || _this.props.__UBR_unread_count === __UBR_unread_count) return;
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
        });
        const LowerBadgeClassname = XenoLib.joinClassNames(XenoLib.getClass('wrapper lowerBadge'), 'unread-badge');
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
          const unreadCountMaskSpring = _this.state.unreadBadgeMask.animated.spring;
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
      get css() {
        return this._css;
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
      n(e, '1.2.14') && (ZeresPluginLibraryOutdated = !0), n(o, '1.3.17') && (XenoLibOutdated = !0);
    }
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
        stop() {}
        handleMissingLib() {
          const a = BdApi.findModuleByProps('isModalOpenWithKey');
          if (a && a.isModalOpenWithKey(`${this.name}_DEP_MODAL`)) return;
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
            h = BdApi.findModuleByDisplayName('Text'),
            i = BdApi.findModule(a => a.defaultProps && a.key && 'confirm-modal' === a.key()),
            j = () => BdApi.alert(e, BdApi.React.createElement('span', {}, BdApi.React.createElement('div', {}, f), `Due to a slight mishap however, you'll have to download the libraries yourself.`, c || ZeresPluginLibraryOutdated ? BdApi.React.createElement('div', {}, BdApi.React.createElement('a', { href: 'https://betterdiscord.net/ghdl?id=2252', target: '_blank' }, 'Click here to download ZeresPluginLibrary')) : null, b || XenoLibOutdated ? BdApi.React.createElement('div', {}, BdApi.React.createElement('a', { href: 'https://betterdiscord.net/ghdl?id=3169', target: '_blank' }, 'Click here to download XenoLib')) : null));
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
                      children: [BdApi.React.createElement(h, { size: h.Sizes.SIZE_16, children: [`${f} Please click Download Now to download ${d ? 'them' : 'it'}.`] })],
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
                            (global.XenoLib && !XenoLibOutdated) || a('https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/1XenoLib.plugin.js', (a, d, e) => (a || 200 !== d.statusCode ? (g.popWithKey(n), j()) : void b.writeFile(c.join(BdApi.Plugins.folder, '1XenoLib.plugin.js'), e, () => {})));
                          };
                        !global.ZeresPluginLibrary || ZeresPluginLibraryOutdated ? a('https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js', (a, e, f) => (a || 200 !== e.statusCode ? (g.popWithKey(n), j()) : void (b.writeFile(c.join(BdApi.Plugins.folder, '0PluginLibrary.plugin.js'), f, () => {}), d()))) : d();
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
