//META{"name":"BetterTypingUsers","source":"https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/BetterTypingUsers/BetterTypingUsers.plugin.js","website":"https://1lighty.github.io/BetterDiscordStuff/?plugin=BetterTypingUsers","authorId":"239513071272329217","invite":"NYvWdN5","donate":"https://paypal.me/lighty13"}*//
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
module.exports = (() => {
  /* Setup */
  const config = {
    main: 'index.js',
    info: {
      name: 'BetterTypingUsers',
      authors: [
        {
          name: 'Lighty',
          discord_id: '239513071272329217',
          github_username: 'LightyPon',
          twitter_username: ''
        }
      ],
      version: '1.0.3',
      description: 'Replaces "Several people are typing" with who is actually typing, plus "x others" if it can\'t fit. Number of shown people typing can be changed.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/BetterTypingUsers/BetterTypingUsers.plugin.js'
    },
    changelog: [
      {
        title: 'RIP BBD on Canary',
        type: 'fixed',
        items: ['Implemented fixes that allow patches to work properly on canary using Powercord.']
      }
    ],
    defaultConfig: [
      {
        name: 'Max visible typing users',
        id: 'maxVisible',
        type: 'slider',
        value: 5,
        min: 3,
        max: 20,
        markers: Array.from(Array(18), (_, i) => i + 3),
        stickToMarkers: true
      },
      {
        name: 'Previews',
        type: 'preview'
      }
    ],
    strings: {
      en: { AND_1_OTHER: ' and 1 other', AND_X_OTHERS: ' and ${count} others', AND: ' and ', ARE_TYPING: ' are typing...' },
      de: { AND_1_OTHER: ' und 1 andere', AND_X_OTHERS: ' und ${count} andere', AND: ' und ', ARE_TYPING: ' schreiben...' },
      da: { AND_1_OTHER: ' og 1 anden', AND_X_OTHERS: ' og ${count} andre', AND: ' og ', ARE_TYPING: ' skriver...' },
      es: { AND_1_OTHER: ' y 1 otro', AND_X_OTHERS: ' y otros ${count}', AND: ' y ', ARE_TYPING: ' están escribiendo...' },
      fr: { AND_1_OTHER: ' et 1 autre', AND_X_OTHERS: ' et ${count} autres', AND: ' et ', ARE_TYPING: ' écrivent...' },
      hr: { AND_1_OTHER: ' i 1 drugi', AND_X_OTHERS: ' i ${count} drugih', AND: ' i ', ARE_TYPING: ' pišu...' },
      it: { AND_1_OTHER: ' e 1 altro', AND_X_OTHERS: ' e altri ${count}', AND: ' e ', ARE_TYPING: ' stanno scrivendo...' },
      tr: { AND_1_OTHER: ' ve 1 kişi daha', AND_X_OTHERS: ' ve ${count} kişi daha', AND: ' ve ', ARE_TYPING: ' yazıyor...' }
    }
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { ContextMenu, EmulatedTooltip, Toasts, Settings, Popouts, Modals, Utilities, WebpackModules, Filters, DiscordModules, ColorConverter, DOMTools, DiscordClasses, DiscordSelectors, ReactTools, ReactComponents, DiscordAPI, Logger, PluginUpdater, PluginUtilities, DiscordClassModules, Structs } = Api;
    const { React, ModalStack, ContextMenuActions, ContextMenuItem, ContextMenuItemsGroup, ReactDOM, ChannelStore, GuildStore, UserStore, DiscordConstants, Dispatcher, GuildMemberStore, GuildActions, SwitchRow, EmojiUtils, RadioGroup, Permissions, TextElement, FlexChild, PopoutOpener, Textbox, RelationshipStore, UserSettingsStore } = DiscordModules;

    const rendererFunctionClass = (() => {
      try {
        const topContext = require('electron').webFrame.top.context;
        if (topContext === window) return null;
        return topContext.Function
      } catch {
        return null;
      }
    })();
    const originalFunctionClass = Function;
    function createSmartPatcher(patcher) {
      const createPatcher = patcher => {
        return (moduleToPatch, functionName, callback, options = {}) => {
          try {
            var origDef = moduleToPatch[functionName];
          } catch (_) {
            return Logger.error(`Failed to patch ${functionName}`);
          }
          if (rendererFunctionClass && origDef && !(origDef instanceof originalFunctionClass) && origDef instanceof rendererFunctionClass) window.Function = rendererFunctionClass;
          const unpatches = [];
          try {
            unpatches.push(patcher(moduleToPatch, functionName, callback, options) || DiscordConstants.NOOP);
          } catch (err) {
            throw err;
          } finally {
            if (rendererFunctionClass) window.Function = originalFunctionClass;
          }
          try {
            if (origDef && origDef.__isBDFDBpatched && moduleToPatch.BDFDBpatch && typeof moduleToPatch.BDFDBpatch[functionName].originalMethod === 'function') {
              /* do NOT patch a patch by ZLIb, that'd be bad and cause double items in context menus */
              if ((Utilities.getNestedProp(ZeresPluginLibrary, 'Patcher.patches') || []).findIndex(e => e.module === moduleToPatch) !== -1 && moduleToPatch.BDFDBpatch[functionName].originalMethod.__originalFunction) return;
              unpatches.push(patcher(moduleToPatch.BDFDBpatch[functionName], 'originalMethod', callback, options));
            }
          } catch (err) {
            Logger.stacktrace('Failed to patch BDFDB patches', err);
          }
          return function unpatch() {
            unpatches.forEach(e => e());
          };
        };
      };
      return Object.assign({}, patcher, {
        before: createPatcher(patcher.before),
        instead: createPatcher(patcher.instead),
        after: createPatcher(patcher.after)
      });
    };

    const Patcher = createSmartPatcher(Api.Patcher);

    const NameUtils = WebpackModules.getByProps('getName');

    const CUser = WebpackModules.getByPrototypes('getAvatarSource', 'isLocalBot');
    const CChannel = WebpackModules.getByPrototypes('isGroupDM', 'isMultiUserDM');
    const L337 = (() => {
      try {
        return new CChannel({ id: '1337' });
      } catch (e) {
        Logger.stacktrace('Failed to create 1337 channel', e);
      }
    })();

    let CTypingUsers = (() => {
      try {
        const WrappedTypingUsers = WebpackModules.find(m => m.displayName && m.displayName.indexOf('TypingUsers') !== -1);
        return new WrappedTypingUsers({ channel: L337 }).render().type;
      } catch (e) {
        Logger.stacktrace('Failed to get TypingUsers!', e);
        return null;
      }
    })();

    const ComponentDispatch = (() => {
      try {
        return WebpackModules.getByProps('ComponentDispatch').ComponentDispatch;
      } catch (e) {
        Logger.stacktrace('Failed to get ComponentDispatch', e);
      }
    })();

    class CTypingUsersPreview extends React.PureComponent {
      constructor(props) {
        super(props);
        this.forceUpdate = this.forceUpdate.bind(this);
        const iUsers = UserStore.getUsers();
        for (let i = 0; i < 20; i++) iUsers[(1337 + i).toString()] = new CUser({ username: `User ${i + 1}`, id: (1337 + i).toString(), discriminator: '9999' });
      }
      componentDidMount() {
        ComponentDispatch.subscribe('BTU_SETTINGS_UPDATED', this.forceUpdate);
      }
      componentWillUnmount() {
        ComponentDispatch.unsubscribe('BTU_SETTINGS_UPDATED', this.forceUpdate);
        const iUsers = UserStore.getUsers();
        for (let i = 0; i < 20; i++) delete iUsers[(1337 + i).toString()];
      }
      renderTyping(num) {
        const typingUsers = {};
        for (let i = 0; i < num; i++) typingUsers[(1337 + i).toString()] = 1;
        return React.createElement(CTypingUsers, {
          channel: L337,
          guildId: '',
          isFocused: true,
          slowmodeCooldownGuess: 0,
          theme: UserSettingsStore.theme,
          typingUsers
        });
      }
      render() {
        return React.createElement(
          'div',
          {
            className: 'BTU-preview'
          },
          this.renderTyping(4),
          this.renderTyping(6),
          this.renderTyping(20)
        );
      }
    }

    class TypingUsersPreview extends Settings.SettingField {
      constructor(name, note) {
        super(name, note, null, CTypingUsersPreview);
      }
    }

    /* since XenoLib is absent from this plugin (since it serves no real purpose),
       we can only hope the user doesn't rename the plugin..
     */
    return class BetterTypingUsers extends Plugin {
      constructor() {
        super();
        try {
          WebpackModules.getByProps('openModal', 'hasModalOpen').closeModal(`${this.name}_DEP_MODAL`);
        } catch (e) { }
      }
      onStart() {
        if (window.Lightcord && window.XenoLib) XenoLib.Notifications.warning(`[${this.getName()}] Lightcord is an unofficial and unsafe client with stolen code that is falsely advertising that it is safe, Lightcord has allowed the spread of token loggers hidden within plugins redistributed by them, and these plugins are not made to work on it. Your account is very likely compromised by malicious people redistributing other peoples plugins, especially if you didn't download this plugin from [GitHub](https://github.com/1Lighty/BetterDiscordPlugins/edit/master/Plugins/MessageLoggerV2/MessageLoggerV2.plugin.js), you should change your password immediately. Consider using a trusted client mod like [BandagedBD](https://rauenzi.github.io/BetterDiscordApp/) or [Powercord](https://powercord.dev/) to avoid losing your account.`, { timeout: 0 });
        this.promises = { state: { cancelled: false } };
        this.patchAll();
        PluginUtilities.addStyle(
          this.short + '-CSS',
          `
          .BTU-preview > .${WebpackModules.getByProps('slowModeIcon', 'typing').typing.split(' ')[0]} {
              position: unset !important;
          }
          `
        );
        DiscordConstants.MAX_TYPING_USERS = 99;
        /* theoretical max is 5 users typing at once.. welp */
      }

      onStop() {
        this.promises.state.cancelled = true;
        Patcher.unpatchAll();
        PluginUtilities.removeStyle(this.short + '-CSS');
      }

      /* zlib uses reference to defaultSettings instead of a cloned object, which sets settings as default settings, messing everything up */
      loadSettings(defaultSettings) {
        return PluginUtilities.loadSettings(this.name, Utilities.deepclone(this.defaultSettings ? this.defaultSettings : defaultSettings));
      }

      buildSetting(data) {
        if (data.type === 'preview') return new TypingUsersPreview(data.name, data.note);
        return super.buildSetting(data);
      }

      saveSettings(_, setting, value) {
        super.saveSettings(_, setting, value);
        ComponentDispatch.safeDispatch('BTU_SETTINGS_UPDATED');
      }

      filterTypingUsers(typingUsers) {
        return Object.keys(typingUsers)
          .filter(e => e != DiscordAPI.currentUser.id)
          .filter(e => !RelationshipStore.isBlocked(e))
          .map(e => UserStore.getUser(e))
          .filter(e => e != null);
      }

      /* PATCHES */

      patchAll() {
        Utilities.suppressErrors(this.patchBetterRoleColors.bind(this), 'BetterRoleColors patch')();
        Utilities.suppressErrors(this.patchTypingUsers.bind(this), 'TypingUsers patch')(this.promises.state);
      }

      patchBetterRoleColors() {
        const BetterRoleColors = BdApi.Plugins.get('BetterRoleColors');
        if (!BetterRoleColors) return;
        /*  stop errors */
        /*  modify BRCs behavior so it won't unexpectedly try to modify an entry that does not exist
            by simply limiting it to the max number of usernames visible in total
         */
        Patcher.after(BetterRoleColors, 'filterTypingUsers', (_this, __, ret) => ret.slice(0, this.settings.maxVisible));
      }

      async patchTypingUsers(promiseState) {
        const TypingUsers = await ReactComponents.getComponentByName('TypingUsers', DiscordSelectors.Typing.typing);
        if (!TypingUsers.selector) TypingUsers.selector = DiscordSelectors.Typing.typing;
        const TypingTextClassname = WebpackModules.getByProps('typing', 'text').text.split(' ')[0];
        if (promiseState.cancelled) return;
        if (!CTypingUsers) CTypingUsers = typingUsers.component; /* failsafe */
        /* use `instead` so that we modify the return before BetterRoleColors */
        /*         Patcher.after(TypingUsers.component.prototype, 'componentDidUpdate', (_this, [props, state], ret) => {
          const filtered1 = this.filterTypingUsers(_this.props.typingUsers);
          const filtered2 = this.filterTypingUsers(props.typingUsers);
          if (filtered1.length !== filtered2.length || _this.state.numLess === state.numLess) {
            _this.state.numLess = 0;
            _this.triedLess = false;
            _this.triedMore = false;
          }
        }); */
        Patcher.instead(TypingUsers.component.prototype, 'render', (_this, _, orig) => {
          /* if (!_this.state) _this.state = { numLess: 0 }; */
          const ret = orig();
          if (!ret) {
            /* _this.state.numLess = 0; */
            return ret;
          }
          const filtered = this.filterTypingUsers(_this.props.typingUsers);
          if (filtered.length <= 3) return ret;
          /*           ret.ref = e => {
            _this.__baseRef = e;
            if (!e) return;
            if (!_this.__textRef) return;
            _this.maxWidth = parseInt(getComputedStyle(_this.__baseRef.parentElement).width) - (_this.__textRef.offsetLeft + parseInt(getComputedStyle(_this.__textRef)['margin-left']) - _this.__baseRef.offsetLeft);
            if (_this.__textRef.scrollWidth > _this.maxWidth) {
              if (_this.triedMore) return;
              if (filtered.length - _this.state.numLess <= 3) return;
              _this.setState({ numLess: _this.state.numLess + 1 });
            }
          }; */
          const typingUsers = Utilities.findInReactTree(ret, e => e && e.props && typeof e.props.className === 'string' && e.props.className.indexOf(TypingTextClassname) !== -1);
          if (!typingUsers) return ret;
          /*           if (typeof _this.state.numLess !== 'number') _this.state.numLess = 0;
          typingUsers.ref = e => {
            _this.__textRef = e;
          }; */
          typingUsers.props.children = [];
          /* I don't think this method works for every language..? */
          for (let i = 0; i < filtered.length; i++) {
            if (this.settings.maxVisible /* filtered.length - _this.state.numLess */ === i) {
              const others = filtered.length - i;
              if (others === 1) typingUsers.props.children.push(this.strings.AND_1_OTHER);
              else typingUsers.props.children.push(Utilities.formatTString(this.strings.AND_X_OTHERS, { count: others }));
              break;
            } else if (i === filtered.length - 1) typingUsers.props.children.push(this.strings.AND);
            else if (i !== 0) typingUsers.props.children.push(', ');
            const name = NameUtils.getName(_this.props.guildId, _this.props.channel.id, filtered[i]);
            typingUsers.props.children.push(React.createElement('strong', {}, name));
          }
          typingUsers.props.children.push(this.strings.ARE_TYPING);
          return ret;
        });
        TypingUsers.forceUpdateAll();
      }

      /* PATCHES */

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
  try {
    const a = (c, a) => ((c = c.split('.').map(b => parseInt(b))), (a = a.split('.').map(b => parseInt(b))), !!(a[0] > c[0])) || !!(a[0] == c[0] && a[1] > c[1]) || !!(a[0] == c[0] && a[1] == c[1] && a[2] > c[2]),
      b = BdApi.Plugins.get('ZeresPluginLibrary');
    ((b, c) => b && b._config && b._config.info && b._config.info.version && a(b._config.info.version, c))(b, '1.2.27') && (ZeresPluginLibraryOutdated = !0);
  } catch (e) {
    console.error('Error checking if ZeresPluginLibrary is out of date', e);
  }

  return !global.ZeresPluginLibrary || ZeresPluginLibraryOutdated
    ? class {
      constructor() {
        this._config = config;
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
        return this.description + ' You are missing ZeresPluginLibrary for this plugin, please enable the plugin and click Download Now.';
      }
      start() { }
      stop() { }
      handleMissingLib() {
        const a = BdApi.findModuleByProps('openModal', 'hasModalOpen');
        if (a && a.hasModalOpen(`${this.name}_DEP_MODAL`)) return;
        const b = !global.ZeresPluginLibrary,
          c = ZeresPluginLibraryOutdated ? 'Outdated Library' : 'Missing Library',
          d = `The Library ZeresPluginLibrary required for ${this.name} is ${ZeresPluginLibraryOutdated ? 'outdated' : 'missing'}.`,
          e = BdApi.findModuleByDisplayName('Text'),
          f = BdApi.findModuleByDisplayName('ConfirmModal'),
          g = () => BdApi.alert(c, BdApi.React.createElement('span', {}, BdApi.React.createElement('div', {}, d), `Due to a slight mishap however, you'll have to download the libraries yourself. This is not intentional, something went wrong, errors are in console.`, b || ZeresPluginLibraryOutdated ? BdApi.React.createElement('div', {}, BdApi.React.createElement('a', { href: 'https://betterdiscord.net/ghdl?id=2252', target: '_blank' }, 'Click here to download ZeresPluginLibrary')) : null));
        if (!a || !f || !e) return console.error(`Missing components:${(a ? '' : ' ModalStack') + (f ? '' : ' ConfirmationModalComponent') + (e ? '' : 'TextElement')}`), g();
        class h extends BdApi.React.PureComponent {
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
        let i = !1,
          j = !1;
        const k = a.openModal(
          b => {
            if (j) return null;
            try {
              return BdApi.React.createElement(
                h,
                {
                  label: 'missing dependency modal',
                  onError: () => {
                    a.closeModal(k), g();
                  }
                },
                BdApi.React.createElement(
                  f,
                  Object.assign(
                    {
                      header: c,
                      children: BdApi.React.createElement(e, { size: e.Sizes.SIZE_16, children: [`${d} Please click Download Now to download it.`] }),
                      red: !1,
                      confirmText: 'Download Now',
                      cancelText: 'Cancel',
                      onCancel: b.onClose,
                      onConfirm: () => {
                        if (i) return;
                        i = !0;
                        const b = require('request'),
                          c = require('fs'),
                          d = require('path');
                        b('https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js', (b, e, f) => {
                          try {
                            if (b || 200 !== e.statusCode) return a.closeModal(k), g();
                            c.writeFile(d.join(BdApi.Plugins && BdApi.Plugins.folder ? BdApi.Plugins.folder : window.ContentManager.pluginsFolder, '0PluginLibrary.plugin.js'), f, () => { });
                          } catch (b) {
                            console.error('Fatal error downloading ZeresPluginLibrary', b), a.closeModal(k), g();
                          }
                        });
                      }
                    },
                    b,
                    { onClose: () => { } }
                  )
                )
              );
            } catch (b) {
              return console.error('There has been an error constructing the modal', b), (j = !0), a.closeModal(k), g(), null;
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
