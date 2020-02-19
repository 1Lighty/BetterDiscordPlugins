//META{"name":"BetterTypingUsers","source":"https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/BetterTypingUsers/BetterTypingUsers.plugin.js","website":"https://1lighty.github.io/BetterDiscordStuff/?plugin=BetterTypingUsers"}*//
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
var BetterTypingUsers = (() => {
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
      version: '1.0.0',
      description: 'Replaces "Several people are typing" with who is actually typing, plus "x others" if it can\'t fit. Number of shown people typing can be changed.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/BetterTypingUsers/BetterTypingUsers.plugin.js'
    },
    changelog: [
      {
        title: 'Initial release!',
        type: 'added',
        items: ['Max users typing changed to 5, with showing and "x others" if more people than that are typing.']
      },
      {
        title: 'future plans',
        type: 'progress',
        items: ['Auto fit max number of people typing, until there is no space left.']
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
    const { ContextMenu, EmulatedTooltip, Toasts, Settings, Popouts, Modals, Utilities, WebpackModules, Filters, DiscordModules, ColorConverter, DOMTools, DiscordClasses, DiscordSelectors, ReactTools, ReactComponents, DiscordAPI, Logger, Patcher, PluginUpdater, PluginUtilities, DiscordClassModules, Structs } = Api;
    const { React, ModalStack, ContextMenuActions, ContextMenuItem, ContextMenuItemsGroup, ReactDOM, ChannelStore, GuildStore, UserStore, DiscordConstants, Dispatcher, GuildMemberStore, GuildActions, SwitchRow, EmojiUtils, RadioGroup, Permissions, TextElement, FlexChild, PopoutOpener, Textbox, RelationshipStore, UserSettingsStore } = DiscordModules;

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
      onStart() {
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
        const BetterRoleColors = BdApi.getPlugin('BetterRoleColors');
        if (!BetterRoleColors) return;
        /*  stop errors */
        /*  modify BRCs behavior so it won't unexpectedly try to modify an entry that does not exist
            by simply limiting it to the max number of usernames visible in total
         */
        Patcher.after(BetterRoleColors, 'filterTypingUsers', (_, __, ret) => ret.slice(0, this.settings.maxVisible));
      }

      async patchTypingUsers(promiseState) {
        const TypingUsers = await ReactComponents.getComponentByName('TypingUsers', DiscordSelectors.Typing.typing);
        const TypingTextClassname = WebpackModules.getByProps('typing', 'text').text.split(' ')[0];
        if (promiseState.cancelled) return;
        if (!CTypingUsers) CTypingUsers = typingUsers.component; /* failsafe */
        /* use `instead` so that we modify the return before BetterRoleColors */
        Patcher.instead(TypingUsers.component.prototype, 'render', (_this, _, orig) => {
          const ret = orig();
          const filtered = this.filterTypingUsers(_this.props.typingUsers);
          if (filtered.length <= 3) return ret;
          const typingUsers = Utilities.findInReactTree(ret, e => e && e.props && typeof e.props.className === 'string' && e.props.className.indexOf(TypingTextClassname) !== -1);
          if (!typingUsers) return ret;
          typingUsers.props.children = [];
          /* I don't think this method works for every language..? */
          for (let i = 0; i < filtered.length; i++) {
            if (this.settings.maxVisible === i) {
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
    if (global.BdApi && typeof BdApi.getPlugin === 'function' /* you never know with those retarded client mods */) {
      const versionChecker = (a, b) => ((a = a.split('.').map(a => parseInt(a))), (b = b.split('.').map(a => parseInt(a))), !!(b[0] > a[0])) || !!(b[0] == a[0] && b[1] > a[1]) || !!(b[0] == a[0] && b[1] == a[1] && b[2] > a[2]);
      const isOutOfDate = (lib, minVersion) => lib && lib._config && lib._config.info && lib._config.info.version && versionChecker(lib._config.info.version, minVersion);
      const iZeresPluginLibrary = BdApi.getPlugin('ZeresPluginLibrary');
      if (isOutOfDate(iZeresPluginLibrary, '1.2.10')) ZeresPluginLibraryOutdated = true;
    }
  } catch (e) {
    console.error('Error checking if ZeresPluginLibrary is out of date', e);
  }

  return !global.ZeresPluginLibrary || ZeresPluginLibraryOutdated
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
          const header = ZeresPluginLibraryOutdated ? 'Outdated Library' : 'Missing Library';
          const content = `The Library ZeresPluginLibrary required for ${this.name} is ${ZeresPluginLibraryOutdated ? 'outdated' : 'missing'}.`;
          const ModalStack = BdApi.findModuleByProps('push', 'update', 'pop', 'popWithKey');
          const TextElement = BdApi.findModuleByProps('Sizes', 'Weights');
          const ConfirmationModal = BdApi.findModule(m => m.defaultProps && m.key && m.key() === 'confirm-modal');
          const onFail = () => BdApi.getCore().alert(header, `${content}<br/>Due to a slight mishap however, you'll have to download the library yourself.<br/><br/><a href="http://betterdiscord.net/ghdl/?url=https://github.com/rauenzi/BDPluginLibrary/blob/master/release/0PluginLibrary.plugin.js"target="_blank">Click here to download ZeresPluginLibrary</a>`);
          if (!ModalStack || !ConfirmationModal || !TextElement) return onFail();
          class TempErrorBoundary extends BdApi.React.PureComponent {
            constructor(props) {
              super(props);
              this.state = { hasError: false };
            }
            componentDidCatch(err, inf) {
              console.error(`Error in ${this.props.label}, screenshot or copy paste the error above to Lighty for help.`);
              this.setState({ hasError: true });
              if (typeof this.props.onError === 'function') this.props.onError(err);
            }
            render() {
              if (this.state.hasError) return null;
              return this.props.children;
            }
          }
          let modalId;
          const onHeckWouldYouLookAtThat = (() => {
            if (!global.pluginModule || !global.BDEvents) return () => {}; /* other client mods */
            const onLibLoaded = e => {
              if (e !== 'ZeresPluginLibrary') return;
              BDEvents.off('plugin-loaded', onLibLoaded);
              BDEvents.off('plugin-reloaded', onLibLoaded);
              ModalStack.popWithKey(modalId); /* make it easier on the user */
              pluginModule.reloadPlugin(this.getName());
            };
            BDEvents.on('plugin-loaded', onLibLoaded);
            BDEvents.on('plugin-reloaded', onLibLoaded);
            return () => (BDEvents.off('plugin-loaded', onLibLoaded), BDEvents.off('plugin-reloaded', onLibLoaded));
          })();
          modalId = ModalStack.push(props => {
            return BdApi.React.createElement(
              TempErrorBoundary,
              {
                label: 'missing/outdated dependency modal',
                onError: () => {
                  ModalStack.popWithKey(modalId); /* smh... */
                  onFail();
                }
              },
              BdApi.React.createElement(
                ConfirmationModal,
                Object.assign(
                  {
                    header,
                    children: [
                      BdApi.React.createElement(TextElement, {
                        color: TextElement.Colors.PRIMARY,
                        children: [`${content} Please click Download Now to download it.`]
                      })
                    ],
                    red: false,
                    confirmText: 'Download Now',
                    cancelText: 'Cancel',
                    onConfirm: () => {
                      onHeckWouldYouLookAtThat();
                      const request = require('request');
                      const fs = require('fs');
                      const path = require('path');
                      const onDone = () => {
                        if (!global.pluginModule || !global.BDEvents) return;
                        const onLoaded = e => {
                          if (e !== 'ZeresPluginLibrary') return;
                          BDEvents.off('plugin-loaded', onLoaded);
                          BDEvents.off('plugin-reloaded', onLoaded);
                          pluginModule.reloadPlugin(this.name);
                        };
                        BDEvents.on('plugin-loaded', onLoaded);
                        BDEvents.on('plugin-reloaded', onLoaded);
                      };
                      request('https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js', (error, response, body) => {
                        if (error) return onFail();
                        onDone();
                        fs.writeFile(path.join(window.ContentManager.pluginsFolder, '0PluginLibrary.plugin.js'), body, () => {});
                      });
                    }
                  },
                  props
                )
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
