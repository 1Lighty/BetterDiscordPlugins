//META{"name":"CrashRecovery","source":"https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/CrashRecovery/","website":"https://1lighty.github.io/BetterDiscordStuff/?plugin=CrashRecovery","authorId":"239513071272329217","invite":"NYvWdN5","donate":"https://paypal.me/lighty13"}*//
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
      version: '0.1.6',
      description: 'In the event that your Discord crashes, the plugin enables you to get Discord back to a working state, without needing to reload at all.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/CrashRecovery/CrashRecovery.plugin.js'
    },
    changelog: [
      {
        title: 'misc changes',
        type: 'fixed',
        items: ['Removed usage of soon to be deprecated globals.']
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
    const ElectronDiscordModule = WebpackModules.getByProps('cleanupDisplaySleep') || { cleanupDisplaySleep: DiscordModules.DiscordConstants.NOOP };

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
        try {
          WebpackModules.getByProps('openModal', 'hasModalOpen').closeModal(`${this.name}_DEP_MODAL`);
        } catch (e) {}
      }
      onStart() {
        this.attempts = 0;
        this.promises = { state: { cancelled: false } };
        if (!DelayedCall) return this._startFailure('DelayedCall missing, plugin cannot function.');
        if (ElectronDiscordModule.cleanupDisplaySleep === DiscordModules.DiscordConstants.NOOP) XenoLib.Notifications.error(`[**${this.name}**] cleanupDisplaySleep is missing.`);
        delete this.onCrashRecoveredDelayedCall;
        this.onCrashRecoveredDelayedCall = new DelayedCall(1000, () => {
          XenoLib.Notifications.remove(this.notificationId);
          this.notificationId = null;
          if (this.disabledPlugins) XenoLib.Notifications.danger(`${this.disabledPlugins.map(e => e)} ${this.disabledPlugins.length > 1 ? 'have' : 'has'} been disabled to recover from the crash`, { timeout: 0 });
          if (this.suspectedPlugin) XenoLib.Notifications.danger(`${this.suspectedPlugin} ${this.suspectedPlugin2 !== this.suspectedPlugin && this.suspectedPlugin2 ? 'or ' + this.suspectedPlugin2 : ''} is suspected of causing the crash.`, { timeout: 10000 });
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
      }
      onStop() {
        this.promises.state.cancelled = true;
        Patcher.unpatchAll();
        if (this.notificationId) XenoLib.Notifications.remove(this.notificationId);
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

            let bbdplugin = null;
            if (!BdApi.Plugins.get(pluginName)) {
              /*
               * go away Zack
               */
              for (const path in require.cache) {
                const module = require.cache[path];
                if (!module || !module.exports || !module.exports.plugin || module.exports.filename.indexOf(pluginName) !== 0) continue;
                bbdplugin = module.exports;
              }
            }
            const name = (bbdplugin && bbdplugin.name) || pluginName;
            bbdplugin = null;
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
            BdApi.Plugins.disable(responsiblePlugins[0]);
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
              : false
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
          const a = BdApi.findModuleByProps('openModal', 'hasModalOpen');
          if (a && a.hasModalOpen(`${this.name}_DEP_MODAL`)) return;
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
            g = BdApi.findModuleByDisplayName('Text'),
            h = BdApi.findModuleByDisplayName('ConfirmModal'),
            i = () => BdApi.alert(e, BdApi.React.createElement('span', {}, BdApi.React.createElement('div', {}, f), `Due to a slight mishap however, you'll have to download the libraries yourself. This is not intentional, something went wrong, errors are in console.`, c || ZeresPluginLibraryOutdated ? BdApi.React.createElement('div', {}, BdApi.React.createElement('a', { href: 'https://betterdiscord.net/ghdl?id=2252', target: '_blank' }, 'Click here to download ZeresPluginLibrary')) : null, b || XenoLibOutdated ? BdApi.React.createElement('div', {}, BdApi.React.createElement('a', { href: 'https://betterdiscord.net/ghdl?id=3169', target: '_blank' }, 'Click here to download XenoLib')) : null));
          if (!a || !h || !g) return console.error(`Missing components:${(a ? '' : ' ModalStack') + (h ? '' : ' ConfirmationModalComponent') + (g ? '' : 'TextElement')}`), i();
          class j extends BdApi.React.PureComponent {
            constructor(a) {
              super(a), (this.state = { hasError: !1 }), (this.componentDidCatch = a => (console.error(`Error in ${this.props.label}, screenshot or copy paste the error above to Lighty for help.`), this.setState({ hasError: !0 }), 'function' == typeof this.props.onError && this.props.onError(a))), (this.render = () => (this.state.hasError ? null : this.props.children));
            }
          }
          let k = !1,
            l = !1;
          const m = a.openModal(
            b => {
              if (l) return null;
              try {
                return BdApi.React.createElement(
                  j,
                  { label: 'missing dependency modal', onError: () => (a.closeModal(m), i()) },
                  BdApi.React.createElement(
                    h,
                    Object.assign(
                      {
                        header: e,
                        children: BdApi.React.createElement(g, { size: g.Sizes.SIZE_16, children: [`${f} Please click Download Now to download ${d ? 'them' : 'it'}.`] }),
                        red: !1,
                        confirmText: 'Download Now',
                        cancelText: 'Cancel',
                        onCancel: b.onClose,
                        onConfirm: () => {
                          if (k) return;
                          k = !0;
                          const b = require('request'),
                            c = require('fs'),
                            d = require('path'),
                            e = BdApi.Plugins && BdApi.Plugins.folder ? BdApi.Plugins.folder : window.ContentManager.pluginsFolder,
                            f = () => {
                              (global.XenoLib && !XenoLibOutdated) ||
                                b('https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/1XenoLib.plugin.js', (b, f, g) => {
                                  try {
                                    if (b || 200 !== f.statusCode) return a.closeModal(m), i();
                                    c.writeFile(d.join(e, '1XenoLib.plugin.js'), g, () => {});
                                  } catch (b) {
                                    console.error('Fatal error downloading XenoLib', b), a.closeModal(m), i();
                                  }
                                });
                            };
                          !global.ZeresPluginLibrary || ZeresPluginLibraryOutdated
                            ? b('https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js', (b, g, h) => {
                                try {
                                  if (b || 200 !== g.statusCode) return a.closeModal(m), i();
                                  c.writeFile(d.join(e, '0PluginLibrary.plugin.js'), h, () => {}), f();
                                } catch (b) {
                                  console.error('Fatal error downloading ZeresPluginLibrary', b), a.closeModal(m), i();
                                }
                              })
                            : f();
                        }
                      },
                      b,
                      { onClose: () => {} }
                    )
                  )
                );
              } catch (b) {
                return console.error('There has been an error constructing the modal', b), (l = !0), a.closeModal(m), i(), null;
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
