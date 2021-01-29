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
module.exports = (() => {
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
      version: '1.0.3',
      description: 'In the event that your Discord crashes, the plugin enables you to get Discord back to a working state, without needing to reload at all.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/CrashRecovery/CrashRecovery.plugin.js'
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
        name: 'Enable step 3',
        note: 'Moves channel switch to a third and last step, otherwise it switches on step 2',
        id: 'useThirdStep',
        type: 'switch',
        value: true
      }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api], BasePlugin) => {
    const { Logger, Utilities, WebpackModules, DiscordModules, PluginUtilities, ReactTools, PluginUpdater } = Api;
    const { React, Dispatcher, FlexChild: Flex, GuildStore } = DiscordModules;

    const Patcher = XenoLib.createSmartPatcher(Api.Patcher);

    const DelayedCall = (WebpackModules.getByProps('DelayedCall') || {}).DelayedCall;
    const ElectronDiscordModule = WebpackModules.getByProps('cleanupDisplaySleep') || { cleanupDisplaySleep: DiscordModules.DiscordConstants.NOOP };

    const ModalStack = WebpackModules.getByProps('openModal');

    const isPowercord = !!window.powercord;
    const BLACKLISTED_BUILTIN_PC_PLUGINS = ['Updater', 'Commands Manager', 'I18n', 'Module Manager', 'Settings']
    const RE_PC_PLUGIN_NAME_FROM_PATH = /[\\\/]plugins[\\\/]([^\\\/]+)/;

    const RE_INVARIANT = /error-decoder.html\?invariant=(\d+)([^\s]*)/;
    const INVARIANTS_URL = 'https://raw.githubusercontent.com/facebook/react/master/scripts/error-codes/codes.json';
    const ROOT_FOLDER = isPowercord ? window.powercord.basePath : BdApi.Plugins.folder;

    const path = require('path');

    return class CrashRecovery extends BasePlugin(Plugin) {
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
            } catch (e) { }
          }
        };
        try {
          WebpackModules.getByProps('openModal', 'hasModalOpen').closeModal(`${this.name}_DEP_MODAL`);
        } catch (e) { }
      }
      onStart() {
        if (window.Lightcord) XenoLib.Notifications.warning(`[${this.getName()}] Lightcord is an unofficial and unsafe client with stolen code that is falsely advertising that it is safe, Lightcord has allowed the spread of token loggers hidden within plugins redistributed by them, and these plugins are not made to work on it. Your account is very likely compromised by malicious people redistributing other peoples plugins, especially if you didn't download this plugin from [GitHub](https://github.com/1Lighty/BetterDiscordPlugins/edit/master/Plugins/MessageLoggerV2/MessageLoggerV2.plugin.js), you should change your password immediately. Consider using a trusted client mod like [BandagedBD](https://rauenzi.github.io/BetterDiscordApp/) or [Powercord](https://powercord.dev/) to avoid losing your account.`, { timeout: 0 });
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
          XenoLib.Notifications.info('Successfully recovered, more info can be found in the console (CTRL + SHIFT + I > console on top). Pass this information to support for further help.', { timeout: 10000 });
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
        Error.prepareStackTrace = (error, frames) => {
          this._lastStackFrames = frames;
          return error.stack
        }
        Utilities.suppressErrors(this.patchErrorBoundary.bind(this))(this.promises.state);
        if (!this.settings.lastErrorMapUpdate || Date.now() - this.settings.lastErrorMapUpdate > 2.628e+9) {
          const https = require('https');
          const req = https.request(INVARIANTS_URL, { headers: { 'origin': 'discord.com' } }, res => {
            let body = '';
            res.on('data', chunk => { body += chunk; });
            res.on('end', () => {
              if (res.statusCode !== 200) return;
              try {
                this.settings.errorMap = JSON.parse(body);
                this.settings.lastErrorMapUpdate = Date.now();
                this.saveSettings();
              } catch { }
            });
          });
          req.end();
        }
      }
      onStop() {
        this.promises.state.cancelled = true;
        Patcher.unpatchAll();
        if (this.notificationId) XenoLib.Notifications.remove(this.notificationId);
        delete Error.prepareStackTrace;
      }


      // Copyright (c) Facebook, Inc. and its affiliates
      // https://github.com/facebook/react/blob/master/scripts/jest/setupTests.js#L171
      decodeErrorMessage(message) {
        if (!message) return message;

        const [, invariant, argS] = message.match(RE_INVARIANT);
        const code = parseInt(invariant, 10);
        const args = argS
          .split('&')
          .filter(s => s.indexOf('args[]=') !== -1)
          .map(s => s.substr('args[]='.length))
          .map(decodeURIComponent);
        const format = this.settings.errorMap[code];
        if (!format) return message; // ouch
        let argIndex = 0;
        return format.replace(/%s/g, () => args[argIndex++]);
      }

      decodeStacks(stack, componentStack, baseComponentName = 'ErrorBoundary') {
        if (!this.settings.errorMap) return { stack, componentStack };
        if (RE_INVARIANT.test(stack)) stack = this.decodeErrorMessage(stack);
        // Strip out Discord (and React) only functions
        else stack = stack.split('\n')
          .filter(l => l.indexOf('discordapp.com/assets') === -1 && l.indexOf('discord.com/assets') === -1)
          .join('\n')
          .split(ROOT_FOLDER) // transform paths to relative
          .join('');

        // Only show up to the error boundary
        const splitComponentStack = componentStack.split('\n').filter(e => e);
        const stackEnd = splitComponentStack.findIndex(l => l.indexOf(`in ${baseComponentName}`) !== -1);
        if (stackEnd !== -1 && baseComponentName) splitComponentStack.splice(stackEnd + 1, splitComponentStack.length);
        componentStack = splitComponentStack.join('\n');
        return { stack, componentStack };
      }

      /*
        MUST return either an array with the plugin name
        or a string of the plugin name
       */
      queryResponsiblePlugins() {
        try {
          const stack = this._bLastStackFrames
            // filter out blank functions (like from console or whatever)
            .filter(e => e.getFileName() && (e.getFunctionName() || e.getMethodName()))
            // filter out discord functions
            .filter(e => e.getFileName().indexOf(ROOT_FOLDER) !== -1)
            // convert CallSites to only useful info
            .map(e => ({ filename: e.getFileName(), functionName: e.getFunctionName() || e.getMethodName() }))
            // filter out ZeresPluginLibrary and ourselves
            .filter(({ filename }) => filename.lastIndexOf('0PluginLibrary.plugin.js') !== filename.length - 24 && filename.lastIndexOf(`${this.name}.plugin.js`) !== filename.length - (this.name.length + 10));
          // Filter out MessageLoggerV2 dispatch patch, is a 2 part step
          for (let i = 0, len = stack.length; i < len; i++) {
            const { filename, functionName } = stack[i];
            if (filename.lastIndexOf('MessageLoggerV2.plugin.js') !== filename.length - 25) continue;
            if (functionName !== 'onDispatchEvent') continue;
            if (stack[i + 1].functionName !== 'callback') break;
            stack.splice(i, 2);
            break;
          }
          const plugins = stack.map(({ filename }) => {
            try {
              const bdname = path.basename(filename);
              if (bdname.indexOf('.plugin.js') === bdname.length - 10) {
                const [pluginName] = bdname.split('.plugin.js');
                if (BdApi.Plugins.get(pluginName)) return pluginName;
                /*
                 * go away Zack
                 */
                for (const path in require.cache) {
                  const module = require.cache[path];
                  if (!module || !module.exports || !module.exports.plugin || module.exports.filename.indexOf(bdname) !== 0) continue;
                  return module.exports.id;
                }
                return null;
              }
              else if (isPowercord) {
                const [, pcname] = RE_PC_PLUGIN_NAME_FROM_PATH.exec(filename);
                const { pluginManager } = window.powercord;
                const plugin = pluginManager.get(pcname);
                if (!plugin) return null;
                const { name } = plugin.manifest;
                if (BLACKLISTED_BUILTIN_PC_PLUGINS.indexOf(name) !== -1) return null;
                return pcname;
              }
            } catch (err) {
              Logger.stacktrace('Error fetching plugin')
            }
          }).filter((name, idx, self) => name && self.indexOf(name) === idx);
          const ret = [];
          for (let i = 0, len = plugins.length; i < len; i++) {
            const name = plugins[i];
            if (this.disabledPlugins && this.disabledPlugins.indexOf(name) !== -1) return name;
            ret.push(name);
          }
          return ret;
        } catch (e) {
          Logger.stacktrace('query error', e);
          return null;
        }
      }

      cleanupDiscord() {
        ElectronDiscordModule.cleanupDisplaySleep();
        Dispatcher.wait(() => {
          try {
            DiscordModules.ContextMenuActions.closeContextMenu();
          } catch (err) {
            Logger.stacktrace('Failed to close all context menus', err);
          }
          try {
            DiscordModules.ModalStack.popAll();
          } catch (err) {
            Logger.stacktrace('Failed to pop old modalstack', err);
          }
          try {
            DiscordModules.LayerManager.popAllLayers();
          } catch (err) {
            Logger.stacktrace('Failed to pop all layers', err);
          }
          try {
            DiscordModules.PopoutStack.closeAll();
          } catch (err) {
            Logger.stacktrace('Failed to close all popouts', err);
          }
          try {
            (ModalStack.modalsApi || ModalStack.useModalsStore).setState(() => ({ default: [] })); /* slow? unsafe? async? */
          } catch (err) {
            Logger.stacktrace('Failed to pop new modalstack');
          }
          try {
            if (!this.settings.useThirdStep) DiscordModules.NavigationUtils.transitionTo('/channels/@me');
          } catch (err) {
            Logger.stacktrace('Failed to transition to home');
          }
        });
      }

      handleCrash(_this, stack, componentStack, isRender = false) {
        this._bLastStackFrames = this._lastStackFrames;
        try {
          const decoded = this.decodeStacks(stack, componentStack);
          Logger.error('HEY OVER HERE! Show this to the plugin developer or in the support server!\nPrettified stacktraces, stack:\n', decoded.stack, '\nComponent stack:\n', decoded.componentStack);
        } catch (err) {
          Logger.stacktrace('Failed decoding stack!', err);
        }
        this.onCrashRecoveredDelayedCall.cancel();
        if (!isRender) {
          _this.setState({
            error: { stack }
          });
        }
        if (!this.notificationId) {
          this.notificationId = XenoLib.Notifications.danger('Crash detected, attempting recovery', { timeout: 0, loading: true });
        }
        const responsiblePlugins = this.queryResponsiblePlugins();
        if (responsiblePlugins && !Array.isArray(responsiblePlugins)) {
          XenoLib.Notifications.update(this.notificationId, { content: `Failed to recover from crash, ${responsiblePlugins} is not stopping properly`, loading: false });
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
          const [name] = responsiblePlugins;
          try {
            if (BdApi.Plugins.get(name)) BdApi.Plugins.disable(name);
            else if (isPowercord) window.powercord.pluginManager.disable(name);
          } catch (e) { }
          XenoLib.Notifications.update(this.notificationId, { content: `Failed, suspecting ${name} for recovery failure` });
          if (!this.disabledPlugins) this.disabledPlugins = [];
          this.disabledPlugins.push(name);
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

      patchErrorBoundary() {
        const ErrorBoundary = WebpackModules.getByDisplayName('ErrorBoundary');
        Patcher.instead(ErrorBoundary.prototype, 'componentDidCatch', (_this, [{ stack }, { componentStack }], orig) => {
          this.handleCrash(_this, stack, componentStack);
        });
        Patcher.after(ErrorBoundary.prototype, 'render', (_this, _, ret) => {
          if (!_this.state.error) return;
          if (!this.notificationId) {
            this.handleCrash(_this, _this.state.error.stack, _this.state.info.componentStack, true);
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
      b = (b, c) => ((b && b._config && b._config.info && b._config.info.version && a(b._config.info.version, c)) || typeof global.isTab !== 'undefined'),
      c = BdApi.Plugins.get('ZeresPluginLibrary'),
      d = BdApi.Plugins.get('XenoLib');
    b(c, '1.2.27') && (ZeresPluginLibraryOutdated = !0), b(d, '1.3.35') && (XenoLibOutdated = !0);
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
        this.getDescription = () => this.description + global.BetterDiscordConfig ? '' : ' You are missing libraries for this plugin, please enable the plugin and click Download Now.';
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
