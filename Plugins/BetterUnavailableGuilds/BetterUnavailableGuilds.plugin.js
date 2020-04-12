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
      version: '0.2.4',
      description: 'Makes unavailable guilds (servers) still show in the list, and be able to drag it around.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/BetterUnavailableGuilds/BetterUnavailableGuilds.plugin.js'
    },
    changelog: [
      {
        title: 'sad',
        type: 'added',
        items: ['Fixed plugin failing to transfer data from canary to other release channels.']
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
    // fuck ED
    const pluginConfigFile = global.DataStore && !global.ED && DataStore.getPluginFile(config.info.name);

    const loadData = (key, defaults) => {
      const cloned = XenoLib.DiscordUtils.cloneDeep(defaults);
      try {
        if (pluginConfigFile) {
          if (FsModule.existsSync(pluginConfigFile)) {
            return Object.assign(cloned, JSON.parse(FsModule.readFileSync(pluginConfigFile))[key]);
          } else {
            return cloned;
          }
        } else {
          return Object.assign(cloned, BdApi.loadData(config.info.name, key));
        }
      } catch (e) {
        return cloned;
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
            Toasts.error(`Failed to parse: ${err.message || err}`);
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
        this._guildRecord = loadData('data', { data: {} }).data;
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
          this.ensureBDGuildsPreCached();
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

      ensureBDGuildsPreCached() {
        this.guildRecord['86004744966914048'] = { id: '86004744966914048', icon: '292e7f6bfff2b71dfd13e508a859aedd', name: 'BetterDiscord', owner_id: '81388395867156480', joined_at: Date.now(), default_message_notifications: 1 };
        this.guildRecord['280806472928198656'] = { id: '280806472928198656', icon: 'cbdda04c041699d80689b99c4e5e89dc', name: 'BetterDiscord2', owner_id: '81388395867156480', joined_at: Date.now(), default_message_notifications: 1 };
      }

      ensureDataSettable() {
        if (!this._guildRecord[DiscordAPI.currentUser.id]) this._guildRecord[DiscordAPI.currentUser.id] = {};
        if (!this._guildRecord[DiscordAPI.currentUser.id][GLOBAL_ENV.RELEASE_CHANNEL]) {
          const curUserShit = this._guildRecord[DiscordAPI.currentUser.id];
          /* transfer the data */
          if (curUserShit['stable']) curUserShit[GLOBAL_ENV.RELEASE_CHANNEL] = XenoLib.DiscordUtils.cloneDeep(curUserShit['stable']);
          else if (curUserShit['ptb']) curUserShit[GLOBAL_ENV.RELEASE_CHANNEL] = XenoLib.DiscordUtils.cloneDeep(curUserShit['ptb']);
          else if (curUserShit['canary']) curUserShit[GLOBAL_ENV.RELEASE_CHANNEL] = XenoLib.DiscordUtils.cloneDeep(curUserShit['canary']);
          else curUserShit[GLOBAL_ENV.RELEASE_CHANNEL] = {};
        }
      }

      get guildRecord() {
        this.ensureDataSettable();
        const ret = this._guildRecord[DiscordAPI.currentUser.id][GLOBAL_ENV.RELEASE_CHANNEL];
        return ret;
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
