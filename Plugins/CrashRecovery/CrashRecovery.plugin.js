//META{"name":"CrashRecovery","source":"https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/CrashRecovery/","website":"https://1lighty.github.io/BetterDiscordStuff/?plugin=CrashRecovery"}*//
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
var CrashRecovery = (() => {
  /* Setup */
  const config = {
    main: 'index.js',
    info: {
      name: 'CrashRecovery',
      authors: [
        {
          name: 'Lighty',
          discord_id: '239513071272329217',
          github_username: '1Lighty',
          twitter_username: ''
        }
      ],
      version: '0.1.4',
      description: 'In the event that your Discord crashes, the plugin enables you to get Discord back to a working state, without needing to reload at all.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/CrashRecovery/CrashRecovery.plugin.js'
    },
    changelog: [
      {
        title: 'misc changes',
        type: 'fixed',
        items: ['Improved detection accuracy', 'Added failsafe in case something goes wrong when: initializing, starting or when trying to display the recover button', 'Added third step when trying to recover, as to not switch channels unless required, can be disabled in settings.', 'Plugin is no longer experimental']
      }
    ],
    defaultConfig: [
      {
        name: 'Enable step 3',
        note: 'Moves channel switch to a third and last step, otherwise it switches on step 2',
        id: 'useThirdStep',
        type: 'switch',
        value: true
      }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { Logger, Utilities, WebpackModules, DiscordModules, Patcher, PluginUtilities, ReactTools, PluginUpdater } = Api;
    const { React, Dispatcher, FlexChild: Flex, GuildStore } = DiscordModules;

    const DelayedCall = (WebpackModules.getByProps('DelayedCall') || {}).DelayedCall;
    const ElectronDiscordModule = WebpackModules.getByProps('cleanupDisplaySleep');

    return class CrashRecovery extends Plugin {
      constructor() {
        super();
        XenoLib.changeName(__filename, 'CrashRecovery');
        this._startFailure = message => {
          PluginUpdater.checkForUpdate(this.name, this.version, this._config.info.github_raw);
          XenoLib.Notifications.error(`[**${this.name}**] ${message} Please update it, press CTRL + R, or ${GuildStore.getGuild(XenoLib.supportServerId) ? 'go to <#639665366380838924>' : '[join my support server](https://discord.gg/NYvWdN5)'} for further assistance.`, { timeout: 0 });
        };
        const oOnStart = this.onStart.bind(this);
        this.onStart = () => {
          try {
            oOnStart();
          } catch (e) {
            Logger.stacktrace('Failed to start!', e);
            this._startFailure('Failed to start!');
            try {
              this.onStop();
            } catch (e) {}
          }
        };
      }
      onStart() {
        this.attempts = 0;
        this.promises = { state: { cancelled: false } };
        if (!DelayedCall) return this._startFailure('DelayedCall missing, plugin cannot function.');
        delete this.onCrashRecoveredDelayedCall;
        this.onCrashRecoveredDelayedCall = new DelayedCall(1000, () => {
          XenoLib.Notifications.remove(this.notificationId);
          this.notificationId = null;
          if (this.disabledPlugins) XenoLib.Notifications.danger(`${this.disabledPlugins.map(e => e)} ${this.disabledPlugins.length > 1 ? 'have' : 'has'} been disabled to recover from the crash`, { timeout: 0 });
          if (this.suspectedPlugin) XenoLib.Notifications.danger(`${this.suspectedPlugin} ${this.suspectedPlugin2 !== this.suspectedPlugin && this.suspectedPlugin2 ? 'or ' + this.suspectedPlugin2 : ''} is suspected of causing the crash.`, { timeout: 10000 });
          if (this.autoDisabledPlugins && this.autoDisabledPlugins.length) {
            setTimeout(() => {
              XenoLib.Notifications.danger(`${this.autoDisabledPlugins.length} ${this.autoDisabledPlugins.length > 1 ? 'plugins have' : 'plugin has'} been reenabled due to the crash disabling ${this.autoDisabledPlugins.length > 1 ? 'them' : 'it'}`, { timeout: 10000 });
              this.autoDisabledPlugins.forEach(({ name }) => {
                pluginModule.stopPlugin(name);
                pluginCookie[name] = true;
                pluginModule.startPlugin(name);
              });
              pluginModule.savePluginData();
              this.autoDisabledPlugins = [];
            }, 1000);
          }
          this.disabledPlugins = null;
          this.suspectedPlugin = null;
          this.suspectedPlugin2 = null;
          this.attempts = 0;
          const appMount = document.querySelector('#app-mount');
          appMount.append(document.querySelector('.xenoLib-notifications'));
          const BIVOverlay = document.querySelector('.biv-overlay');
          if (BIVOverlay) appMount.append(BIVOverlay);
          Logger.info('Corrected incorrectly placed containers');
        });
        this.patchAll();
        if (!document.querySelector(`.${XenoLib.getSingleClass('errorPage')}`))
          this.__safeClearTimeout = setTimeout(() => {
            if (global.bdpluginErrors && global.bdpluginErrors.length) {
              global.bdpluginErrors = [];
              Logger.info('Cleared global.bdpluginErrors');
            }
          }, 7500);
      }
      onStop() {
        this.promises.state.cancelled = true;
        Patcher.unpatchAll();
        if (this.notificationId) XenoLib.Notifications.remove(this.notificationId);
      }
      /* zlib uses reference to defaultSettings instead of a cloned object, which sets settings as default settings, messing everything up */
      loadSettings(defaultSettings) {
        return PluginUtilities.loadSettings(this.name, Utilities.deepclone(this.defaultSettings ? this.defaultSettings : defaultSettings));
      }

      queryResponsiblePlugins(stack) {
        try {
          const match = stack.match(/^.*(?:\\|\/|VM\d+ )([^\/\\\n]+)\.plugin\.js/gm);
          const plugins = [];
          if (!match || !match.length) return null;
          let onDispatchEventFound = false;
          for (let i = 0; i < match.length; i++) {
            const pluginName = match[i].match(/(?:\\|\/)([^\/\\]+)\.plugin\.js/)[1];
            if (match[i].indexOf('MessageLoggerV2.onDispatchEvent') !== -1) {
              onDispatchEventFound = true;
              continue;
            }
            if (onDispatchEventFound && /Object\.callback.*(?:\\|\/|VM\d+ )MessageLoggerV2\.plugin\.js/.test(match[i])) continue;
            if (pluginName === '0PluginLibrary' || pluginName === this.name) continue;
            const bbdplugin = Object.values(bdplugins).find(m => m.filename.startsWith(pluginName));
            const name = (bbdplugin && bbdplugin.name) || pluginName;
            if (this.disabledPlugins && this.disabledPlugins.indexOf(name) !== -1) return { name: name };
            plugins.push(name);
          }
          return plugins;
        } catch (e) {
          Logger.stacktrace('query error', e);
          return null;
        }
      }

      cleanupDiscord() {
        ElectronDiscordModule.cleanupDisplaySleep();
        Dispatcher.wait(() => {
          DiscordModules.ContextMenuActions.closeContextMenu();
          DiscordModules.ModalStack.popAll();
          DiscordModules.LayerManager.popAllLayers();
          DiscordModules.PopoutStack.closeAll();
          WebpackModules.getByProps('openModal').modalsApi.setState(() => ({ default: [] })); /* slow? unsafe? async? */
          if (!this.settings.useThirdStep) DiscordModules.NavigationUtils.transitionTo('/channels/@me');
        });
      }

      handleCrash(_this, stack, isRender) {
        this.onCrashRecoveredDelayedCall.cancel();
        if (this.__safeClearTimeout) clearTimeout(this.__safeClearTimeout), (this.__safeClearTimeout = 0);
        if (!isRender) {
          _this.setState({
            error: { stack }
          });
        }
        if (!this.notificationId) {
          this.notificationId = XenoLib.Notifications.danger('Crash detected, attempting recovery', { timeout: 0, loading: true });
        }
        const responsiblePlugins = this.queryResponsiblePlugins(stack);
        if (responsiblePlugins && !Array.isArray(responsiblePlugins)) {
          XenoLib.Notifications.update(this.notificationId, { content: `Failed to recover from crash, ${responsiblePlugins.name} is not stopping properly`, loading: false });
          return;
        }
        if (!this.attempts) {
          this.cleanupDiscord();
          if (responsiblePlugins) this.suspectedPlugin = responsiblePlugins.shift();
        }
        if (!this.attempts && !this.autoDisabledPlugins) {
          setTimeout(() => {
            this.autoDisabledPlugins = Utilities.deepclone(global.bdpluginErrors);
            if (!this.autoDisabledPlugins || !this.autoDisabledPlugins.length) {
              return;
            }
            this.suspectedPlugin2 = this.autoDisabledPlugins.shift().name;
            global.bdpluginErrors = [];
          }, 750);
        }
        if (this.setStateTimeout) return;
        if (this.attempts >= 10 || ((this.settings.useThirdStep ? this.attempts >= 3 : this.attempts >= 2) && (!responsiblePlugins || !responsiblePlugins[0]))) {
          XenoLib.Notifications.update(this.notificationId, { content: 'Failed to recover from crash', loading: false });
          return;
        }
        if (this.attempts === 1) XenoLib.Notifications.update(this.notificationId, { content: 'Failed, trying again' });
        else if (this.settings.useThirdStep && this.attempts === 2) {
          Dispatcher.wait(() => DiscordModules.NavigationUtils.transitionTo('/channels/@me'));
          XenoLib.Notifications.update(this.notificationId, { content: `Failed, switching channels` });
        } else if (this.attempts >= 2) {
          try {
            pluginModule.disablePlugin(responsiblePlugins[0]);
          } catch (e) {}
          XenoLib.Notifications.update(this.notificationId, { content: `Failed, suspecting ${responsiblePlugins[0]} for recovery failure` });
          if (!this.disabledPlugins) this.disabledPlugins = [];
          this.disabledPlugins.push(responsiblePlugins[0]);
        }
        this.setStateTimeout = setTimeout(() => {
          this.setStateTimeout = null;
          this.attempts++;
          this.onCrashRecoveredDelayedCall.delay();
          _this.setState({
            error: null,
            info: null
          });
        }, 1000);
      }

      /* PATCHES */

      patchAll() {
        this.patchErrorBoundary(this.promises.state);
      }

      patchErrorBoundary() {
        const ErrorBoundary = WebpackModules.getByDisplayName('ErrorBoundary');
        Patcher.instead(ErrorBoundary.prototype, 'componentDidCatch', (_this, [{ message, stack }, { componentStack }], orig) => {
          this.handleCrash(_this, stack);
        });
        Patcher.after(ErrorBoundary.prototype, 'render', (_this, _, ret) => {
          if (!_this.state.error) return;
          if (!this.notificationId) {
            this.handleCrash(_this, _this.state.error.stack, true);
          }
          /* better be safe than sorry! */
          if (!_this.state.customPageError) {
            ret.props.action = React.createElement(
              XenoLib.ReactComponents.ErrorBoundary,
              { label: 'ErrorBoundary patch', onError: () => _this.setState({ customPageError: true /* sad day.. */ }) },
              React.createElement(
                Flex,
                {
                  grow: 0,
                  direction: Flex.Direction.HORIZONTAL
                },
                React.createElement(
                  XenoLib.ReactComponents.Button,
                  {
                    size: XenoLib.ReactComponents.ButtonOptions.ButtonSizes.LARGE,
                    style: {
                      marginRight: 20
                    },
                    onClick: () => {
                      this.attempts = 0;
                      this.disabledPlugins = null;
                      XenoLib.Notifications.update(this.notificationId, { content: 'If you say so.. trying again', loading: true });
                      _this.setState({
                        error: null,
                        info: null
                      });
                    }
                  },
                  'Recover'
                ),
                React.createElement(
                  XenoLib.ReactComponents.Button,
                  {
                    size: XenoLib.ReactComponents.ButtonOptions.ButtonSizes.LARGE,
                    style: {
                      marginRight: 20
                    },
                    onClick: () => window.location.reload(true)
                  },
                  'Reload'
                )
              )
            );
          }
          ret.props.note = [
            React.createElement('div', {}, 'Discord has crashed!'),
            this.suspectedPlugin ? React.createElement('div', {}, this.suspectedPlugin, this.suspectedPlugin2 && this.suspectedPlugin2 !== this.suspectedPlugin ? [' or ', this.suspectedPlugin2] : false, ' is likely responsible for the crash') : this.suspectedPlugin2 ? React.createElement('div', {}, this.suspectedPlugin2, ' is likely responsible for the crash') : React.createElement('div', {}, 'Plugin responsible for crash is unknown'),
            this.disabledPlugins && this.disabledPlugins.length
              ? React.createElement(
                  'div',
                  {},
                  this.disabledPlugins.map((e, i) => `${i === 0 ? '' : ', '}${e}`),
                  this.disabledPlugins.length > 1 ? ' have' : ' has',
                  ' been disabled in an attempt to recover'
                )
              : false,
            global.bdpluginErrors && global.bdpluginErrors.length ? React.createElement('div', {}, global.bdpluginErrors.length, ' plugins have been disabled by BBD due to the crash') : null
          ];
        });
        const ErrorBoundaryInstance = ReactTools.getOwnerInstance(document.querySelector(`.${XenoLib.getSingleClass('errorPage')}`) || document.querySelector('#app-mount > svg:first-of-type'), { include: ['ErrorBoundary'] });
        ErrorBoundaryInstance.state.customPageError = false;
        ErrorBoundaryInstance.forceUpdate();
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
