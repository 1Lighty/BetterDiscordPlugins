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
      version: '0.1.0',
      description: 'THIS IS AN EXPERIMENTAL PLUGIN! In the event that your Discord crashes, the plugin enables you to get Discord back to a working state, without needing to reload at all.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/CrashRecovery/CrashRecovery.plugin.js'
    },
    changelog: [
      {
        title: 'Initial release',
        type: 'added',
        items: ['Initial release', 'Should handle most crashes on its own.']
      }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { Logger, DiscordAPI, Settings, Utilities, WebpackModules, DiscordModules, ColorConverter, ReactComponents, Patcher, PluginUtilities } = Api;
    const { React, ChannelStore, Dispatcher, MessageActions, APIModule, FlexChild: Flex } = DiscordModules;

    const DelayedCall = WebpackModules.getByProps('DelayedCall').DelayedCall;

    const ElectronDiscordModule = WebpackModules.getByProps('cleanupDisplaySleep');

    class ErrorCatcher extends React.PureComponent {
      constructor(props) {
        super(props);
        this.state = { hasError: false };
      }
      componentDidCatch(err, inf) {
        Logger.err(`Error in ${this.props.label}, screenshot or copy paste the error above to Lighty for help.`);
        this.setState({ hasError: true });
        if (typeof this.props.onError === 'function') this.props.onError(err);
      }
      render() {
        if (this.state.hasError) return null;
        return this.props.children;
      }
    }

    return class CrashRecovery extends Plugin {
      constructor() {
        super();
        XenoLib.changeName(__filename, 'CrashRecovery');
      }
      onStart() {
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
        });
        this.attempts = 0;
        this.promises = { state: { cancelled: false } };
        this.patchAll();
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
          const match = stack.match(/(?:\\|\/)([^\/\\]+)\.plugin.js/g);
          const plugins = [];
          if (!match || !match.length) return null;
          for (let i = 0; i < match.length; i++) {
            const pluginName = match[i].match(/(?:\\|\/)([^\/\\]+)\.plugin.js/)[1];
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
          DiscordModules.NavigationUtils.transitionTo('/channels/@me');
        });
      }

      handleCrash(_this, stack, isRender) {
        this.onCrashRecoveredDelayedCall.cancel();
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
        if (!isRender) {
          _this.setState({
            error: { stack }
          });
        }
        if (this.setStateTimeout) return;
        if (this.attempts >= 10 || (this.attempts >= 2 && (!responsiblePlugins || !responsiblePlugins[0]))) {
          XenoLib.Notifications.update(this.notificationId, { content: 'Failed to recover from crash', loading: false });
          return;
        }
        if (this.attempts === 1) XenoLib.Notifications.update(this.notificationId, { content: 'Failed, trying again' });
        else if (this.attempts >= 2) {
          try {
            pluginModule.disablePlugin(responsiblePlugins[0]);
          } catch (e) {}
          XenoLib.Notifications.update(this.notificationId, { content: `Failed, suspecting ${responsiblePlugins[0]} for recovery failure` });
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
          ret.props.action = React.createElement(
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
          );
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
        ZLibrary.ReactTools.getOwnerInstance(document.querySelector('.errorPage-u8SYh4') || document.querySelector('#app-mount > svg:first-of-type'), { include: ['ErrorBoundary'] }).forceUpdate();
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
