//META{"name":"BetterUnavailableGuilds","source":"https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/BetterUnavailableGuilds/","website":"https://1lighty.github.io/BetterDiscordStuff/?plugin=BetterUnavailableGuilds"}*//
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
 * Copyright © 2020, _Lighty_
 * All rights reserved.
 * Code may not be redistributed, modified or otherwise taken without explicit permission.
 */
var BetterUnavailableGuilds = (() => {
  /* Setup */
  const config = {
    main: 'index.js',
    info: {
      name: 'BetterUnavailableGuilds',
      authors: [
        {
          name: 'Lighty',
          discord_id: '239513071272329217',
          github_username: '1Lighty',
          twitter_username: ''
        }
      ],
      version: '0.2.0',
      description: 'Makes unavailable guilds (servers) still show in the list, and be able to drag it around.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/BetterUnavailableGuilds/BetterUnavailableGuilds.plugin.js'
    },
    changelog: [
      {
        title: 'QOL changes',
        type: 'added',
        items: ['Now supports multiple users at once, and multiple clients at once, also multiple release channels at once', 'Reinserts missing servers even when logging out or when websocket dies', 'Added a method of adding missing servers and a way to share them to others that need it', 'Added BetterDiscord and BetterDiscord2 servers as pre cached servers for convenience sake']
      }
    ],
    defaultConfig: [
      {
        type: 'category',
        id: 'guilds',
        name: 'Guilds',
        collapsible: true,
        shown: true,
        settings: [
          {
            type: 'textbox',
            name: 'Add guild using data',
            note: 'Press enter to add'
          },
          {
            type: 'guildslist',
            name: 'Click to copy guild data to share to people'
          }
        ]
      }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { Utilities, WebpackModules, DiscordModules, Patcher, PluginUtilities, DiscordAPI, Settings, Toasts } = Api;
    const { Dispatcher, GuildStore, React } = DiscordModules;
    const GuildAvailabilityStore = WebpackModules.getByProps('unavailableGuilds');

    const FsModule = require('fs');
    const pluginConfigFile = DataStore.getPluginFile(config.info.name);

    const loadData = (key, defaults) => {
      try {
        if (FsModule.existsSync(pluginConfigFile)) {
          return JSON.parse(FsModule.readFileSync(pluginConfigFile))[key];
        } else {
          return XenoLib.DiscordUtils.cloneDeep(defaults);
        }
      } catch (e) {
        return XenoLib.DiscordUtils.cloneDeep(defaults);
      }
    };

    const copyToClipboard = WebpackModules.getByProps('copy').copy;
    const GuildIconWrapper = WebpackModules.getByDisplayName('GuildIconWrapper');
    const ListClassModule = WebpackModules.getByProps('listRowContent', 'listAvatar');
    const ListScrollerClassname = WebpackModules.getByProps('listScroller').listScroller;
    const VerticalScroller = WebpackModules.getByDisplayName('VerticalScroller');
    const Clickable = WebpackModules.getByDisplayName('Clickable');

    class GL extends React.PureComponent {
      onClickGuild(checked, guild) {
        const idx = this.state.checkedGuilds.indexOf(guild.id);
        const isChecked = idx !== -1;
        if (typeof checked !== 'undefined') {
          if (checked && !isChecked) this.state.checkedGuilds.push(guild.id);
          else if (!checked && isChecked) this.state.checkedGuilds.splice(idx, 1);
        } else {
          if (isChecked) this.state.checkedGuilds.splice(idx, 1);
          else this.state.checkedGuilds.push(guild.id);
        }
        this.forceUpdate();
      }
      renderGuild(guild) {
        if (!guild) return null;
        return React.createElement(
          Clickable,
          {
            onClick: () => {
              copyToClipboard(JSON.stringify({ id: guild.id, icon: guild.icon || undefined, name: guild.name, owner_id: guild.ownerId, joined_at: guild.joinedAt.valueOf(), default_message_notifications: guild.defaultMessageNotifications }));
              Toasts.success(`Copied ${guild.name}!`);
            },
            className: 'BUG-guild-icon'
          },
          React.createElement(GuildIconWrapper, {
            guild,
            showBadge: !0,
            className: !guild.icon ? ListClassModule.guildAvatarWithoutIcon : '',
            size: GuildIconWrapper.Sizes.LARGE
          })
        );
      }
      render() {
        return React.createElement(
          VerticalScroller,
          {
            fade: true,
            className: ListScrollerClassname,
            style: {
              display: 'flex',
              flexDirection: 'row',
              flexWrap: 'wrap'
            }
          },
          Object.values(GuildStore.getGuilds()).map(this.renderGuild)
        );
      }
    }

    class TB extends DiscordModules.Textbox {
      render() {
        const ret = super.render();
        const props = ret.props.children[1].props;
        props.onKeyDown = e => {
          if (e.keyCode !== 13) return;
          try {
            const parsed = JSON.parse(this.props.value);
            ['id', 'name', 'owner_id', 'joined_at', 'default_message_notifications'].forEach(prop => {
              if (!parsed.hasOwnProperty(prop) || typeof parsed[prop] === 'undefined') throw `Malformed guild data (${prop})`;
            });
            if (typeof parsed.name !== 'string' || typeof parsed.owner_id !== 'string' || /\\d+$/.test(parsed.owner_id)) throw 'Malformed guild data';
            this.props.onEnterPressed(parsed);
            this.props.onChange('');
          } catch (err) {
            (global.fuck = err), Toasts.error(`Failed to parse: ${err.message || err}`);
          }
        };
        return ret;
      }
    }

    class Textbox extends Settings.SettingField {
      constructor(name, note, onChange, options = {}) {
        super(name, note, () => {}, TB, {
          onChange: textbox => value => {
            textbox.props.value = value;
            textbox.forceUpdate();
          },
          value: '',
          placeholder: options.placeholder ? options.placeholder : '',
          onEnterPressed: onChange
        });
      }
    }

    class GuildDataCopier extends Settings.SettingField {
      constructor(name, note) {
        super(name, note, () => {}, GL, {});
      }
    }

    return class BetterUnavailableGuilds extends Plugin {
      constructor() {
        super();
        XenoLib.changeName(__filename, 'BetterUnavailableGuilds');
        this._dispatches = ['CONNECTION_OPEN'];
        XenoLib.DiscordUtils.bindAll(this, ['handleGuildStoreChange', 'verifyAllServersCachedInClient', ...this._dispatches]);
        this.handleGuildStoreChange = XenoLib.DiscordUtils.throttle(this.handleGuildStoreChange, 15000 + (GLOBAL_ENV.RELEASE_CHANNEL === 'ptb' ? 2500 : GLOBAL_ENV.RELEASE_CHANNEL === 'canary' ? 5000 : 0));
      }
      onStart() {
        this._guildRecord = loadData('data', {
          data: {}
        }).data;
        const ids = Object.keys(this._guildRecord);
        if (ids.length) {
          /* old config, transfer it */
          if (this._guildRecord[ids[0]] && this._guildRecord[ids[0]].owner_id) {
            const guilds = XenoLib.DiscordUtils.cloneDeep(this._guildRecord);
            this._guildRecord = {};
            this.guildRecord = guilds;
          }
        }
        this.guildRecord['86004744966914048'] = { id: '86004744966914048', icon: '292e7f6bfff2b71dfd13e508a859aedd', name: 'BetterDiscord', owner_id: '81388395867156480', joined_at: Date.now(), default_message_notifications: 1 };
        this.guildRecord['280806472928198656'] = { id: '280806472928198656', icon: 'cbdda04c041699d80689b99c4e5e89dc', name: 'BetterDiscord2', owner_id: '81388395867156480', joined_at: Date.now(), default_message_notifications: 1 };
        this.verifyAllServersCachedInClient();
        GuildStore.addChangeListener(this.handleGuildStoreChange);
        this.handleGuildStoreChange();
        this.patchAll();
        for (const dispatch of this._dispatches) Dispatcher.subscribe(dispatch, this[dispatch]);
        PluginUtilities.addStyle(
          this.short + '-CSS',
          `
          .BUG-guild-icon {
              padding: 5px;
          }
          .BUG-guild-icon:hover {
              background-color: var(--background-modifier-hover);
          }
          `
        );
      }
      onStop() {
        GuildStore.removeChangeListener(this.handleGuildStoreChange);
        Patcher.unpatchAll();
        for (const dispatch of this._dispatches) Dispatcher.unsubscribe(dispatch, this[dispatch]);
        PluginUtilities.removeStyle(this.short + '-CSS');
      }
      /* zlib uses reference to defaultSettings instead of a cloned object, which sets settings as default settings, messing everything up */
      loadSettings(defaultSettings) {
        return PluginUtilities.loadSettings(this.name, Utilities.deepclone(this.defaultSettings ? this.defaultSettings : defaultSettings));
      }

      buildSetting(data) {
        if (data.type === 'textbox') {
          const { name, note, type, value, onChange, id } = data;
          const setting = new Textbox(
            name,
            note,
            guild => {
              if (this.guildRecord[guild.id]) throw 'Guild already exists';
              if (GuildAvailabilityStore.unavailableGuilds.indexOf(guild.id)) throw 'You are not a member of ' + guild.name;
              this.guildRecord[guild.id] = { id: guild.id, icon: guild.icon || undefined, name: guild.name, owner_id: guild.owner_id, joined_at: guild.joined_at, default_message_notifications: guild.default_message_notifications };
              this.verifyAllServersCachedInClient();
              Toasts.success('Added!');
            },
            { placeholder: data.placeholder || '' }
          );
          return setting;
        } else if (data.type === 'guildslist') {
          return new GuildDataCopier(data.name, data.note);
        }
        return super.buildSetting(data);
      }

      verifyAllServersCachedInClient() {
        if (!DiscordAPI.currentUser) return; /* hhhhhhhh */
        Dispatcher.wait(() => {
          this._verifying = true;
          const unavailable = XenoLib.DiscordUtils.cloneDeep(GuildAvailabilityStore.unavailableGuilds);
          unavailable.forEach(guildId => {
            if (!this.guildRecord[guildId] || GuildStore.getGuild(guildId)) return;
            Dispatcher.dispatch({
              type: 'GUILD_CREATE',
              guild: Object.assign(
                {
                  icon: null,
                  presences: [],
                  channels: [],
                  members: [],
                  roles: {},
                  unavailable: true
                },
                this.guildRecord[guildId]
              )
            });
            /* they're still unavailable, remember? */
            Dispatcher.dispatch({
              type: 'GUILD_UNAVAILABLE',
              guildId: guildId
            });
          });
          this._verifying = false;
        });
      }

      CONNECTION_OPEN(e) {
        /* websocket died, user logged in, user logged into another account etc */
        this.verifyAllServersCachedInClient();
      }

      ensureDataSettable() {
        if (!this._guildRecord[DiscordAPI.currentUser.id]) this._guildRecord[DiscordAPI.currentUser.id] = {};
        if (!this._guildRecord[DiscordAPI.currentUser.id][GLOBAL_ENV.RELEASE_CHANNEL]) {
          const curUserShit = this._guildRecord[DiscordAPI.currentUser.id];
          /* transfer the data */
          if (curUserShit['stable']) curUserShit[GLOBAL_ENV.RELEASE_CHANNEL] = XenoLib.DiscordUtils.cloneDeep(curUserShit['stable']);
          else if (curUserShit['ptb']) curUserShit[GLOBAL_ENV.RELEASE_CHANNEL] = XenoLib.DiscordUtils.cloneDeep(curUserShit['ptb']);
          else if (curUserShit['canary']) curUserShit[GLOBAL_ENV.RELEASE_CHANNEL] = XenoLib.DiscordUtils.cloneDeep(curUserShit['ptb']);
          else curUserShit[GLOBAL_ENV.RELEASE_CHANNEL] = {};
        }
      }

      get guildRecord() {
        this.ensureDataSettable();
        return this._guildRecord[DiscordAPI.currentUser.id][GLOBAL_ENV.RELEASE_CHANNEL];
      }
      set guildRecord(val) {
        this.ensureDataSettable();
        return (this._guildRecord[DiscordAPI.currentUser.id][GLOBAL_ENV.RELEASE_CHANNEL] = val);
      }

      handleGuildStoreChange() {
        if (!DiscordAPI.currentUser) return; /* hhhhhhhh */
        this._guildRecord = loadData('data', { data: {} }).data;
        this.verifyAllServersCachedInClient();
        const availableGuilds = Object.values(GuildStore.getGuilds()).map(guild => ({
          id: guild.id,
          icon: guild.icon || undefined,
          name: guild.name,
          owner_id: guild.ownerId,
          joined_at: guild.joinedAt.valueOf() /* int value is fine too */,
          /* useless info? */
          default_message_notifications: guild.defaultMessageNotifications
        }));
        let guilds = {};
        GuildAvailabilityStore.unavailableGuilds.forEach(id => this.guildRecord[id] && (guilds[id] = this.guildRecord[id]));
        availableGuilds.forEach(guild => (guilds[guild.id] = guild));
        for (const guildId in guilds) guilds[guildId] = XenoLib.DiscordUtils.pickBy(guilds[guildId], e => !XenoLib.DiscordUtils.isUndefined(e));
        if (!XenoLib.DiscordUtils.isEqual(this.guildRecord, guilds)) {
          this.guildRecord = guilds;
          PluginUtilities.saveData(this.name, 'data', { data: this._guildRecord });
        }
      }

      /* PATCHES */

      patchAll() {
        Utilities.suppressErrors(this.patchGuildDelete.bind(this), 'GUILD_DELETE dispatch patch')();
      }

      async patchGuildDelete() {
        const GUILD_DELETE = Dispatcher._computeOrderedActionHandlers('GUILD_DELETE');
        GUILD_DELETE.forEach(handler => {
          Patcher.instead(handler, 'actionHandler', (_, [dispatch], orig) => {
            if (!dispatch.guild.unavailable) return orig(dispatch);
          });
        });
      }

      /* PATCHES */

      getSettingsPanel() {
        const panel = this.buildSettingsPanel();
        panel.addListener(() => ReactTools.getOwnerInstance(document.getElementById('TooltipPreview')).forceUpdate());
        return panel.getElement();
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
