//META{"name":"UnreadBadgesRedux","source":"https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/UnreadBadgesRedux/","website":"https://1lighty.github.io/BetterDiscordStuff/?plugin=UnreadBadgesRedux"}*//
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
      version: '1.0.0',
      description: 'Adds a number badge to server icons and channels.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/UnreadBadgesRedux/UnreadBadgesRedux.plugin.js'
    },
    changelog: [
      {
        title: 'Redux has been released!',
        type: 'added',
        items: ["That is all. I don't think much else needs to be said here, does it? It Just Works(tm).", 'Oh yeah, I added a ton of options so have fun with that.']
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
    const { Settings, Utilities, WebpackModules, DiscordModules, ColorConverter, ReactComponents, Patcher, PluginUtilities } = Api;
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

    const getUnreadCount = (guildId, includeMuted) => {
      const channels = ChannelStore.getChannels();
      const guildChannels = [];
      for (const channelId in channels) {
        const channel = channels[channelId];
        if (channel.guild_id === guildId) guildChannels.push(channel);
      }
      let count = 0;
      for (let i = 0; i < guildChannels.length; i++) {
        const channel = guildChannels[i];
        if ((!MuteModule.isChannelMuted(channel.guild_id, channel.id) && (!channel.parent_id || !MuteModule.isChannelMuted(channel.guild_id, channel.parent_id))) || includeMuted) count += UnreadStore.getUnreadCount(channel.id);
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

      /* zlib uses reference to defaultSettings instead of a cloned object, which sets settings as default settings, messing everything up */
      loadSettings(defaultSettings) {
        return PluginUtilities.loadSettings(this.name, Utilities.deepclone(this.defaultSettings ? this.defaultSettings : defaultSettings));
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
        const ChannelItem = await ReactComponents.getComponentByName('ChannelItem', `.${XenoLib.getSingleClass('modeUnread wrapper')}`);
        if (promiseState.cancelled) return;
        const settings = this.settings;
        const MentionsBadgeClassname = XenoLib.getClass('iconVisibility mentionsBadge');
        const IconsChildren = XenoLib.getClass('modeMuted children');
        function UnreadBadge(e) {
          const unreadCount = StoresModule.useStateFromStores([UnreadStore], () => ((e.muted && !settings.misc.mutedChannels) || !settings.misc.channels ? 0 : UnreadStore.getUnreadCount(e.channelId)));
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
        const GuildFolder = await ReactComponents.getComponentByName('GuildFolder', `.${XenoLib.getSingleClass('folder wrapper')}`);
        if (promiseState.cancelled) return;
        const settings = this.settings;
        function BlobMaskWrapper(e) {
          e.__UBR_unread_count = StoresModule.useStateFromStores([UnreadStore, MuteModule], () => {
            if ((e.__UBR_folder_expanded && settings.misc.expandedFolders) || !settings.misc.folders) return 0;
            let count = 0;
            for (let i = 0; i < e.__UBR_guildIds.length; i++) {
              const guildId = e.__UBR_guildIds[i];
              if (!settings.misc.noMutedGuildsInFolderCount || (settings.misc.noMutedGuildsInFolderCount && !MuteModule.isMuted(guildId))) count += getUnreadCount(guildId, !settings.misc.noMutedChannelsInGuildsInFolderCount);
            }
            return count;
          });
          return React.createElement(e.__UBR_old_type, e);
        }
        BlobMaskWrapper.displayName = 'BlobMask';
        Patcher.after(GuildFolder.component.prototype, 'render', (_this, args, ret) => {
          const mask = Utilities.getNestedProp(ret, 'props.children.1.props.children.props.children.1.props.children.props.children');
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
        const ConnectedGuild = await ReactComponents.getComponentByName('DragSource(ConnectedGuild)', `.${XenoLib.getSingleClass('listItem')}`);
        if (promiseState.cancelled) return;
        const settings = this.settings;
        function PatchedConnectedGuild(e) {
          /* get on my level scrublords */
          e.__UBR_unread_count = StoresModule.useStateFromStores([UnreadStore, MuteModule], () => (!settings.misc.guilds || (!settings.misc.mutedGuilds && MuteModule.isMuted(e.guildId)) ? 0 : getUnreadCount(e.guildId, !settings.misc.noMutedInGuildCount)));
          return e.__UBR_old_type(e);
        }
        PatchedConnectedGuild.displayName = 'ConnectedGuild';
        Patcher.after(ConnectedGuild.component.prototype, 'render', (_this, args, ret) => {
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
        const Guild = await ReactComponents.getComponentByName('Guild', `.${XenoLib.getSingleClass('listItem')}`);
        if (promiseState.cancelled) return;
        Patcher.after(Guild.component.prototype, 'render', (_this, args, ret) => {
          const props = Utilities.getNestedProp(ret, 'props.children.props.children.1.props.children.props.children.props');
          if (!props) return;
          props.__UBR_unread_count = _this.props.__UBR_unread_count;
          props.guildId = _this.props.guildId;
        });
        Guild.forceUpdateAll();
      }

      async patchBlobMask(promiseState) {
        const BlobMask = await ReactComponents.getComponentByName('BlobMask', `.${XenoLib.getSingleClass('lowerBadge wrapper')}`);
        if (promiseState.cancelled) return;
        const ensureUnreadBadgeMask = _this => {
          if (_this.state.unreadBadgeMask) return;
          _this.state.unreadBadgeMask = new ReactSpring.Controller({
            spring: 0
          });
        };
        Patcher.after(BlobMask.component.prototype, 'componentDidMount', (_this, args, ret) => {
          if (typeof _this.props.__UBR_unread_count !== 'number') return;
          ensureUnreadBadgeMask(_this);
          _this.state.unreadBadgeMask
            .update({
              spring: !!_this.props.__UBR_unread_count,
              immediate: true
            })
            .start();
        });
        Patcher.after(BlobMask.component.prototype, 'componentWillUnmount', (_this, args, ret) => {
          if (typeof _this.props.__UBR_unread_count !== 'number') return;
          if (!_this.state.unreadBadgeMask) return;
          _this.state.unreadBadgeMask.destroy();
        });
        Patcher.after(BlobMask.component.prototype, 'componentDidUpdate', (_this, args, ret) => {
          if (typeof _this.props.__UBR_unread_count !== 'number') return;
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
        Patcher.after(BlobMask.component.prototype, 'render', (_this, args, ret) => {
          if (typeof _this.props.__UBR_unread_count !== 'number') return;
          const badges = Utilities.getNestedProp(ret, 'props.children.1.props.children');
          const masks = Utilities.getNestedProp(ret, 'props.children.0.props.children.0.props.children');
          if (!badges || !masks) return;
          ensureUnreadBadgeMask(_this);
          /* if count is 0, we're animating out, and as such, it's better to at least still display the old
             count while animating out
           */
          const counter = _this.props.__UBR_unread_count || _this.state.__UBR_old_unread_count;
          if (_this.props.__UBR_unread_count) _this.state.__UBR_old_unread_count = _this.props.__UBR_unread_count;
          const width = BadgesModule.getBadgeWidthForValue(counter);
          const unreadCountMaskSpring = _this.state.unreadBadgeMask.animated.spring;
          masks.push(
            React.createElement(ReactSpring.animated.rect, {
              x: -4,
              y: 28,
              width: width + 8,
              height: 24,
              rx: 12,
              ry: 12,
              transform: unreadCountMaskSpring.to([0, 1], [-20, 0]).to(e => `translate(${e} ${-e})`),
              fill: 'black'
            })
          );
          badges.unshift(
            React.createElement(
              BadgeContainer,
              {
                className: LowerBadgeClassname,
                animatedStyle: {
                  opacity: unreadCountMaskSpring.to([0, 0.5, 1], [0, 0, 1]),
                  transform: unreadCountMaskSpring.to(e => `translate(${-20 + 20 * e} ${-20 + 20 * e})`)
                }
              },
              BadgesModule.NumberBadge({ count: counter, color: this.settings.misc.backgroundColor, style: { color: this.settings.misc.textColor } })
            )
          );
        });
        BlobMask.forceUpdateAll();
      }

      /* PATCHES */

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

  return !global.ZeresPluginLibrary || !global.XenoLib
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
          const XenoLibMissing = !global.XenoLib;
          const zlibMissing = !global.ZeresPluginLibrary;
          const bothLibsMissing = XenoLibMissing && zlibMissing;
          const header = `Missing ${(bothLibsMissing && 'Libraries') || 'Library'}`;
          const content = `The ${(bothLibsMissing && 'Libraries') || 'Library'} ${(zlibMissing && 'ZeresPluginLibrary') || ''} ${(XenoLibMissing && (zlibMissing ? 'and XenoLib' : 'XenoLib')) || ''} required for ${this.name} ${(bothLibsMissing && 'are') || 'is'} missing.`;
          const ModalStack = BdApi.findModuleByProps('push', 'update', 'pop', 'popWithKey');
          const TextElement = BdApi.findModuleByProps('Sizes', 'Weights');
          const ConfirmationModal = BdApi.findModule(m => m.defaultProps && m.key && m.key() === 'confirm-modal');
          const onFail = () => BdApi.getCore().alert(header, `${content}<br/>Due to a slight mishap however, you'll have to download the libraries yourself. After opening the links, do CTRL + S to download the library.<br/>${(zlibMissing && '<br/><a href="https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js"target="_blank">Click here to download ZeresPluginLibrary</a>') || ''}${(zlibMissing && '<br/><a href="http://localhost:7474/XenoLib.js"target="_blank">Click here to download XenoLib</a>') || ''}`);
          if (!ModalStack || !ConfirmationModal || !TextElement) return onFail();
          ModalStack.push(props => {
            return BdApi.React.createElement(
              ConfirmationModal,
              Object.assign(
                {
                  header,
                  children: [TextElement({ color: TextElement.Colors.PRIMARY, children: [`${content} Please click Download Now to install ${(bothLibsMissing && 'them') || 'it'}.`] })],
                  red: false,
                  confirmText: 'Download Now',
                  cancelText: 'Cancel',
                  onConfirm: () => {
                    const request = require('request');
                    const fs = require('fs');
                    const path = require('path');
                    const waitForLibLoad = callback => {
                      if (!global.BDEvents) return callback();
                      const onLoaded = e => {
                        if (e !== 'ZeresPluginLibrary') return;
                        BDEvents.off('plugin-loaded', onLoaded);
                        callback();
                      };
                      BDEvents.on('plugin-loaded', onLoaded);
                    };
                    const onDone = () => {
                      if (!global.pluginModule || (!global.BDEvents && !global.XenoLib)) return;
                      if (!global.BDEvents || global.XenoLib) pluginModule.reloadPlugin(this.name);
                      else {
                        const listener = () => {
                          pluginModule.reloadPlugin(this.name);
                          BDEvents.off('xenolib-loaded', listener);
                        };
                        BDEvents.on('xenolib-loaded', listener);
                      }
                    };
                    const downloadXenoLib = () => {
                      if (global.XenoLib) return onDone();
                      request('https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/1XenoLib.plugin.js', (error, response, body) => {
                        if (error) return onFail();
                        onDone();
                        fs.writeFile(path.join(window.ContentManager.pluginsFolder, '1XenoLib.plugin.js'), body, () => {});
                      });
                    };
                    if (!global.ZeresPluginLibrary) {
                      request('https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js', (error, response, body) => {
                        if (error) return onFail();
                        waitForLibLoad(downloadXenoLib);
                        fs.writeFile(path.join(window.ContentManager.pluginsFolder, '0PluginLibrary.plugin.js'), body, () => {});
                      });
                    } else downloadXenoLib();
                  }
                },
                props
              )
            );
          });
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
