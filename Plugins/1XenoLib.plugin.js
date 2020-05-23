//META{"name":"XenoLib","source":"https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/1XenoLib.plugin.js/","authorId":"239513071272329217","invite":"NYvWdN5","donate":"https://paypal.me/lighty13"}*//
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
		shell.Popup('I\'m in the correct folder already.', 0, 'I\'m already installed', 0x40);
	} else if (!fs.FolderExists(pathPlugins)) {
		shell.Popup('I can\'t find the BetterDiscord plugins folder.\nAre you sure it\'s even installed?', 0, 'Can\'t install myself', 0x10);
	} else if (shell.Popup('Should I copy myself to BetterDiscord\'s plugins folder for you?', 0, 'Do you need some help?', 0x34) === 6) {
		fs.CopyFile(pathSelf, fs.BuildPath(pathPlugins, fs.GetFileName(pathSelf)), true);
		// Show the user where to put plugins in the future
		shell.Exec('explorer ' + pathPlugins);
		shell.Popup('I\'m installed!', 0, 'Successfully installed', 0x40);
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
      name: 'XenoLib',
      authors: [
        {
          name: 'Lighty',
          discord_id: '239513071272329217',
          github_username: 'LightyPon',
          twitter_username: ''
        }
      ],
      version: '1.3.21',
      description: 'Simple library to complement plugins with shared code without lowering performance. Also adds needed buttons to some plugins.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/1XenoLib.plugin.js'
    },
    changelog: [
      {
        title: 'Boring changes',
        type: 'fixed',
        items: ['Change to module.exports', 'Extra plugin buttons on plugin cards are now opt-in (such as these ![image](https://i.imgur.com/rVdKi94.png)). They can be re-enabled in settings\n![image2](https://i.imgur.com/6BtqrmY.png)\notherwise the buttons are now in plugin settings (most of the time at least)']
      }
    ],
    defaultConfig: [
      {
        type: 'category',
        id: 'notifications',
        name: 'Notification settings',
        collapsible: true,
        shown: true,
        settings: [
          {
            name: 'Notification position',
            id: 'position',
            type: 'position',
            value: 'topRight'
          },
          {
            name: 'Notifications use backdrop-filter',
            id: 'backdrop',
            type: 'switch',
            value: true
          },
          {
            name: 'Background color',
            id: 'backdropColor',
            type: 'color',
            value: '#3e4346',
            options: {
              defaultColor: '#3e4346'
            }
          },
          {
            name: 'Timeout resets to 0 when hovered',
            id: 'timeoutReset',
            type: 'switch',
            value: true
          }
        ]
      },
      {
        type: 'category',
        id: 'addons',
        name: 'AddonCard settings',
        collapsible: true,
        shown: false,
        settings: [
          {
            name: 'Add extra buttons to specific plugins',
            note: 'Disabling this will move the buttons to the bottom of plugin settings (if available)',
            id: 'extra',
            type: 'switch',
            value: false
          }
        ]
      }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { ContextMenu, EmulatedTooltip, Toasts, Settings, Popouts, Modals, Utilities, WebpackModules, Filters, DiscordModules, ColorConverter, DOMTools, DiscordClasses, DiscordSelectors, ReactTools, ReactComponents, DiscordAPI, Logger, PluginUpdater, PluginUtilities, DiscordClassModules, Structs } = Api;
    const { React, ModalStack, ContextMenuActions, ContextMenuItem, ContextMenuItemsGroup, ReactDOM, ChannelStore, GuildStore, UserStore, DiscordConstants, Dispatcher, GuildMemberStore, GuildActions, PrivateChannelActions, LayerManager, InviteActions, FlexChild, Titles, Changelog: ChangelogModal } = DiscordModules;

    let CancelledAsync = false;
    const DefaultLibrarySettings = {};

    for (let s = 0; s < config.defaultConfig.length; s++) {
      const current = config.defaultConfig[s];
      if (current.type != 'category') {
        DefaultLibrarySettings[current.id] = current.value;
      } else {
        DefaultLibrarySettings[current.id] = {};
        for (let s = 0; s < current.settings.length; s++) {
          const subCurrent = current.settings[s];
          DefaultLibrarySettings[current.id][subCurrent.id] = subCurrent.value;
        }
      }
    }

    if (global.XenoLib) {
      try {
        global.XenoLib.shutdown();
      } catch (e) {}
    }
    const XenoLib = {};
    XenoLib.shutdown = () => {
      try {
        Patcher.unpatchAll();
      } catch (e) {
        Logger.stacktrace('Failed to unpatch all', e);
      }
      CancelledAsync = true;
      PluginUtilities.removeStyle('XenoLib-CSS');
      try {
        const notifWrapper = document.querySelector('.xenoLib-notifications');
        if (notifWrapper) {
          ReactDOM.unmountComponentAtNode(notifWrapper);
          notifWrapper.remove();
        }
      } catch (e) {
        Logger.stacktrace('Failed to unmount Notifications component', e);
      }
    };

    XenoLib._ = XenoLib.DiscordUtils = WebpackModules.getByProps('bindAll', 'debounce');

    XenoLib.loadData = (name, key, defaultData, returnNull) => {
      try {
        return XenoLib._.mergeWith(defaultData ? Utilities.deepclone(defaultData) : {}, BdApi.getData(name, key), (_, b) => {
          if (XenoLib._.isArray(b)) return b;
        });
      } catch (err) {
        Logger.err(name, 'Unable to load data: ', err);
        if (returnNull) return null;
        return Utilities.deepclone(defaultData);
      }
    };

    XenoLib.getClass = (arg, thrw) => {
      try {
        const args = arg.split(' ');
        return WebpackModules.getByProps(...args)[args[args.length - 1]];
      } catch (e) {
        if (thrw) throw e;
        if (!XenoLib.getClass.__warns[arg] || Date.now() - XenoLib.getClass.__warns[arg] > 1000 * 60) {
          Logger.stacktrace(`Failed to get class with props ${arg}`, e);
          XenoLib.getClass.__warns[arg] = Date.now();
        }
        return '';
      }
    };
    XenoLib.getSingleClass = (arg, thrw) => {
      try {
        return XenoLib.getClass(arg, thrw).split(' ')[0];
      } catch (e) {
        if (thrw) throw e;
        if (!XenoLib.getSingleClass.__warns[arg] || Date.now() - XenoLib.getSingleClass.__warns[arg] > 1000 * 60) {
          Logger.stacktrace(`Failed to get class with props ${arg}`, e);
          XenoLib.getSingleClass.__warns[arg] = Date.now();
        }
        return '';
      }
    };
    XenoLib.getClass.__warns = {};
    XenoLib.getSingleClass.__warns = {};

    XenoLib.createSmartPatcher = patcher => {
      const createPatcher = patcher => {
        return (moduleToPatch, functionName, callback, options = {}) => {
          const origDef = moduleToPatch[functionName];
          patcher(moduleToPatch, functionName, callback, options);
          if (origDef.isBDFDBpatched && moduleToPatch.BDFDBpatch && typeof moduleToPatch.BDFDBpatch[functionName].originalMethod === 'function') {
            patcher(moduleToPatch.BDFDBpatch[functionName], 'originalMethod', callback, options);
          }
        };
      };
      return Object.assign({}, patcher, {
        before: createPatcher(patcher.before),
        instead: createPatcher(patcher.instead),
        after: createPatcher(patcher.after)
      });
    };

    const Patcher = XenoLib.createSmartPatcher(Api.Patcher);

    const LibrarySettings = XenoLib.loadData(config.info.name, 'settings', DefaultLibrarySettings);

    PluginUtilities.addStyle(
      'XenoLib-CSS',
      `
      .xenoLib-color-picker .xenoLib-button {
        width: 34px;
        min-height: 38px;
      }
      .xenoLib-color-picker .xenoLib-button:hover {
        width: 128px;
      }
      .xenoLib-color-picker .xenoLib-button .${XenoLib.getSingleClass('recording text')} {
        opacity: 0;
        transform: translate3d(200%,0,0);
      }
      .xenoLib-color-picker .xenoLib-button:hover .${XenoLib.getSingleClass('recording text')} {
        opacity: 1;
        transform: translateZ(0);
      }
      .xenoLib-button-icon {
        left: 50%;
        top: 50%;
        position: absolute;
        margin-left: -12px;
        margin-top: -8px;
        width: 24px;
        height: 24px;
        opacity: 1;
        transform: translateZ(0);
        transition: opacity .2s ease-in-out,transform .2s ease-in-out,-webkit-transform .2s ease-in-out;
      }
      .xenoLib-button-icon.xenoLib-revert > svg {
        width: 24px;
        height: 24px;
      }
      .xenoLib-button-icon.xenoLib-revert {
        margin-top: -12px;
      }
      .xenoLib-button:hover .xenoLib-button-icon {
        opacity: 0;
        transform: translate3d(-200%,0,0);
      }
      .xenoLib-notifications {
        position: absolute;
        color: white;
        width: 100%;
        min-height: 100%;
        display: flex;
        flex-direction: column;
        z-index: 1000;
        pointer-events: none;
        font-size: 14px;
      }
      .xenoLib-notification {
        min-width: 200px;
        overflow: hidden;
      }
      .xenoLib-notification-content-wrapper {
        padding: 22px 20px 0 20px;
      }
      .xenoLib-centering-bottomLeft .xenoLib-notification-content-wrapper:first-of-type, .xenoLib-centering-bottomMiddle .xenoLib-notification-content-wrapper:first-of-type, .xenoLib-centering-bottomRight .xenoLib-notification-content-wrapper:first-of-type {
        padding: 0 20px 20px 20px;
      }
      .xenoLib-notification-content {
        padding: 12px;
        overflow: hidden;
        background: #474747;
        pointer-events: all;
        position: relative;
        width: 20vw;
        white-space: break-spaces;
        min-width: 330px;
      }
      .xenoLib-notification-loadbar {
        position: absolute;
        bottom: 0;
        left: 0px;
        width: auto;
        background-image: linear-gradient(130deg,var(--grad-one),var(--grad-two));
        height: 5px;
      }
      .xenoLib-notification-loadbar-user {
        animation: fade-loadbar-animation 1.5s ease-in-out infinite;
      }
      @keyframes fade-loadbar-animation {
        0% {
            filter: brightness(75%)
        }
        50% {
            filter: brightness(100%)
        }
        to {
            filter: brightness(75%)
        }
      }
      .xenoLib-notification-loadbar-striped:before {
        content: "";
        position: absolute;
        width: 100%;
        height: 100%;
        border-radius: 5px;
        background: linear-gradient(
          -20deg,
          transparent 35%,
          var(--bar-color) 35%,
          var(--bar-color) 70%,
          transparent 70%
        );
        animation: shift 1s linear infinite;
        background-size: 60px 100%;
        box-shadow: inset 0 0px 1px rgba(0, 0, 0, 0.2),
          inset 0 -2px 1px rgba(0, 0, 0, 0.2);
      }
      @keyframes shift {
        to {
          background-position: 60px 100%;
        }
      }
      .xenoLib-notification-close {
        float: right;
        padding: 0;
        height: unset;
        opacity: .7;
      }
      .xenLib-notification-counter {
        float: right;
        margin-top: 2px;
      }
      .topMiddle-xenoLib {
        top: 0;
        left: 0;
        right: 0;
        margin-left: auto;
        margin-right: auto;
      }
      .bottomMiddle-xenoLib {
        bottom: 0;
        left: 0;
        right: 0;
        margin-left: auto;
        margin-right: auto;
      }
      .xenoLib-centering-topLeft, .xenoLib-centering-bottomLeft {
        align-items: flex-start;
      }
      .xenoLib-centering-topMiddle, .xenoLib-centering-bottomMiddle {
        align-items: center;
      }
      .xenoLib-centering-topRight, .xenoLib-centering-bottomRight {
        align-items: flex-end;
      }
      .xenoLib-centering-bottomLeft, .xenoLib-centering-bottomMiddle, .xenoLib-centering-bottomRight {
        flex-direction: column-reverse;
        bottom: 0;
      }
      .XL-chl-p img{
        width: unset !important;
      }
      .xenoLib-error-text {
        padding-top: 5px;
      }
      `
    );

    XenoLib.joinClassNames = WebpackModules.getModule(e => e.default && e.default.default);
    XenoLib.authorId = '239513071272329217';
    XenoLib.supportServerId = '389049952732446731';

    try {
      const getUserAsync = WebpackModules.getByProps('getUser', 'acceptAgreements').getUser;
      const requestUser = () =>
        getUserAsync(XenoLib.authorId)
          .then(user => (XenoLib.author = user))
          .catch(() => setTimeout(requestUser, 1 * 60 * 1000));
      if (UserStore.getUser(XenoLib.authorId)) XenoLib.author = UserStore.getUser(XenoLib.authorId);
      else requestUser();
    } catch (e) {
      Logger.stacktrace('Failed to grab author object', e);
    }

    XenoLib.ReactComponents = {};

    XenoLib.ReactComponents.ErrorBoundary = class XLErrorBoundary extends React.PureComponent {
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
    };

    const deprecateFunction = (name, advice, ret = undefined) => () => (Logger.warn(`XenoLib.${name} is deprecated! ${advice}`), ret);

    XenoLib.patchContext = deprecateFunction('patchContext', 'Do manual patching of context menus instead.');

    const CTXMenu = WebpackModules.getByProps('default', 'MenuStyle');

    class ContextMenuWrapper extends React.PureComponent {
      constructor(props) {
        super(props);
        this.handleOnClose = this.handleOnClose.bind(this);
      }
      handleOnClose() {
        ContextMenuActions.closeContextMenu();
        if (this.props.target instanceof HTMLElement) this.props.target.focus();
      }
      render() {
        return React.createElement(CTXMenu.default, { onClose: this.handleOnClose, id: 'xenolib-context' }, this.props.menu);
      }
    }
    XenoLib.createSharedContext = (element, menuCreation) => {
      if (element.__XenoLib_ContextMenus) {
        element.__XenoLib_ContextMenus.push(menuCreation);
      } else {
        element.__XenoLib_ContextMenus = [menuCreation];
        const oOnContextMenu = element.props.onContextMenu;
        element.props.onContextMenu = e => (typeof oOnContextMenu === 'function' && oOnContextMenu(e), ContextMenuActions.openContextMenu(e, _ => React.createElement(XenoLib.ReactComponents.ErrorBoundary, { label: 'CTX Menu' }, React.createElement(ContextMenuWrapper, { menu: element.__XenoLib_ContextMenus.map(m => m()), ..._ }))));
      }
    };

    const contextMenuItems = WebpackModules.find(m => m.MenuRadioItem && !m.default);
    XenoLib.unpatchContext = deprecateFunction('unpatchContext', 'Manual patching needs manual unpatching');
    XenoLib.createContextMenuItem = (label, action, id, options = {}) => (!contextMenuItems ? null : React.createElement(contextMenuItems.MenuItem, { label, id, action: () => (!options.noClose && ContextMenuActions.closeContextMenu(), action()), ...options }));
    XenoLib.createContextMenuSubMenu = (label, children, id, options = {}) => (!contextMenuItems ? null : React.createElement(contextMenuItems.MenuItem, { label, children, id, ...options }));
    XenoLib.createContextMenuGroup = (children, options) => (!contextMenuItems ? null : React.createElement(contextMenuItems.MenuGroup, { children, ...options }));

    try {
      XenoLib.ReactComponents.ButtonOptions = WebpackModules.getByProps('ButtonLink');
      XenoLib.ReactComponents.Button = XenoLib.ReactComponents.ButtonOptions.default;
    } catch (e) {
      Logger.stacktrace('Error getting Button component', e);
    }

    function patchAddonCardAnyway(manualPatch) {
      try {
        if (patchAddonCardAnyway.patched) return;
        patchAddonCardAnyway.patched = true;
        const LinkClassname = XenoLib.joinClassNames(XenoLib.getClass('anchorUnderlineOnHover anchor'), XenoLib.getClass('anchor anchorUnderlineOnHover'), 'bda-author');
        const handlePatch = (_this, _, ret) => {
          if (!_this.props.addon || !_this.props.addon.plugin || typeof _this.props.addon.plugin.getAuthor().indexOf('Lighty') === -1) return;
          const author = Utilities.findInReactTree(ret, e => e && e.props && typeof e.props.className === 'string' && e.props.className.indexOf('bda-author') !== -1);
          if (!author || typeof author.props.children !== 'string' || author.props.children.indexOf('Lighty') === -1) return;
          const onClick = () => {
            if (DiscordAPI.currentUser.id === XenoLib.authorId) return;
            PrivateChannelActions.ensurePrivateChannel(DiscordAPI.currentUser.id, XenoLib.authorId).then(() => {
              PrivateChannelActions.openPrivateChannel(DiscordAPI.currentUser.id, XenoLib.authorId);
              LayerManager.popLayer();
            });
          };
          if (author.props.children === 'Lighty') {
            author.type = 'a';
            author.props.className = LinkClassname;
            author.props.onClick = onClick;
          } else {
            const idx = author.props.children.indexOf('Lighty');
            const pre = author.props.children.slice(0, idx);
            const post = author.props.children.slice(idx + 6);
            author.props.children = [
              pre,
              React.createElement(
                'a',
                {
                  className: LinkClassname,
                  onClick
                },
                'Lighty'
              ),
              post
            ];
            delete author.props.onClick;
            author.props.className = 'bda-author';
            author.type = 'span';
          }
          let footerProps = Utilities.findInReactTree(ret, e => e && e.props && typeof e.props.className === 'string' && e.props.className.indexOf('bda-links') !== -1);
          if (!footerProps) return;
          footerProps = footerProps.props;
          if (!Array.isArray(footerProps.children)) footerProps.children = [footerProps.children];
          const findLink = name => Utilities.findInReactTree(footerProps.children, e => e && e.props && e.props.children === name);
          const websiteLink = findLink('Website');
          const sourceLink = findLink('Source');
          const supportServerLink = findLink('Support Server');
          footerProps.children = [];
          if (websiteLink) footerProps.children.push(websiteLink);
          if (sourceLink) footerProps.children.push(websiteLink ? ' | ' : null, sourceLink);
          footerProps.children.push(websiteLink || sourceLink ? ' | ' : null, React.createElement('a', { className: 'bda-link', onClick: e => ContextMenuActions.openContextMenu(e, e => React.createElement(XenoLib.ReactComponents.ErrorBoundary, { label: 'Donate button CTX menu' }, React.createElement(ContextMenuWrapper, { menu: XenoLib.createContextMenuGroup([XenoLib.createContextMenuItem('Paypal', () => window.open('https://paypal.me/lighty13'), 'paypal'), XenoLib.createContextMenuItem('Ko-fi', () => window.open('https://ko-fi.com/lighty_'), 'kofi'), XenoLib.createContextMenuItem('Patreon', () => window.open('https://www.patreon.com/lightyp'), 'patreon')]), ...e }))) }, 'Donate'));
          footerProps.children.push(' | ', supportServerLink || React.createElement('a', { className: 'bda-link', onClick: () => (LayerManager.popLayer(), InviteActions.acceptInviteAndTransitionToInviteChannel('NYvWdN5')) }, 'Support Server'));
          footerProps.children.push(' | ', React.createElement('a', { className: 'bda-link', onClick: () => (_this.props.addon.plugin.showChangelog ? _this.props.addon.plugin.showChangelog() : Modals.showChangelogModal(_this.props.addon.plugin.getName() + ' Changelog', _this.props.addon.plugin.getVersion(), _this.props.addon.plugin.getChanges())) }, 'Changelog'));
          footerProps = null;
        };
        async function patchRewriteCard() {
          const component = [...ReactComponents.components.entries()].find(([_, e]) => e.component && e.component.prototype && e.component.prototype.reload && e.component.prototype.showSettings);
          const AddonCard = component ? component[1] : await ReactComponents.getComponent('AddonCard', '.bda-slist > .ui-switch-item', e => e.prototype && e.prototype.reload && e.prototype.showSettings);
          if (CancelledAsync) return;
          const BDErrorBoundary = await ReactComponents.getComponent('BDErrorBoundary', '.bda-slist > .ui-switch-item', e => {
            try {
              return e.prototype && e.prototype.render && e.prototype.render.toString().indexOf('},"Component Error"):') !== -1;
            } catch (err) {
              return false;
            }
          });
          if (CancelledAsync) return;
          class PatchedAddonCard extends AddonCard.component {
            render() {
              const ret = super.render();
              try {
                /* did I mention I am Lighty? */
                handlePatch(this, undefined, ret);
              } catch (err) {
                Logger.stacktrace('AddonCard patch', err);
              }
              return ret;
            }
          }
          Patcher.after(BDErrorBoundary.component.prototype, 'render', (_, __, ret) => {
            if (!LibrarySettings.addons.extra || ret.type !== AddonCard.component) return;
            ret.type = PatchedAddonCard;
          });
          if (manualPatch) return;
          AddonCard.forceUpdateAll();
        }
        patchRewriteCard();
      } catch (e) {
        Logger.stacktrace('Failed to patch V2C_*Card or AddonCard (BBD rewrite)', e);
      }
    }
    if (LibrarySettings.addons.extra) patchAddonCardAnyway();

    try {
      XenoLib.ReactComponents.PluginFooter = class XLPluginFooter extends React.PureComponent {
        render() {
          if (LibrarySettings.addons.extra) return null;
          return React.createElement(
            'div',
            {
              style: {
                display: 'flex'
              }
            },
            React.createElement(
              XenoLib.ReactComponents.Button,
              {
                style: {
                  flex: '2 1 auto'
                },
                onClick: this.props.showChangelog
              },
              'Changelog'
            ),
            React.createElement(
              XenoLib.ReactComponents.Button,
              {
                style: {
                  flex: '2 1 auto'
                },
                onClick: e => ContextMenuActions.openContextMenu(e, e => React.createElement(XenoLib.ReactComponents.ErrorBoundary, { label: 'Donate button CTX menu' }, React.createElement(ContextMenuWrapper, { menu: XenoLib.createContextMenuGroup([XenoLib.createContextMenuItem('Paypal', () => window.open('https://paypal.me/lighty13'), 'paypal'), XenoLib.createContextMenuItem('Ko-fi', () => window.open('https://ko-fi.com/lighty_'), 'kofi'), XenoLib.createContextMenuItem('Patreon', () => window.open('https://www.patreon.com/lightyp'), 'patreon')]), ...e })))
              },
              'Donate'
            ),
            React.createElement(
              XenoLib.ReactComponents.Button,
              {
                style: {
                  flex: '2 1 auto'
                },
                onClick: () => (LayerManager.popLayer(), InviteActions.acceptInviteAndTransitionToInviteChannel('NYvWdN5'))
              },
              'Support server'
            )
          );
        }
      };
    } catch (err) {
      Logger.stacktrace('Error creating plugin footer');
      XenoLib.ReactComponents.PluginFooter = DiscordConstants.NOOP_NULL;
    }

    const TextElement = WebpackModules.getByDisplayName('Text');

    /* shared between FilePicker and ColorPicker */
    const MultiInputClassname = XenoLib.joinClassNames(Utilities.getNestedProp(DiscordClasses, 'BasicInputs.input.value'), XenoLib.getClass('multiInput'));
    const MultiInputFirstClassname = XenoLib.getClass('multiInputFirst');
    const MultiInputFieldClassname = XenoLib.getClass('multiInputField');
    const ErrorMessageClassname = XenoLib.joinClassNames('xenoLib-error-text', XenoLib.getClass('errorMessage'), Utilities.getNestedProp(TextElement, 'Colors.ERROR'));
    const ErrorClassname = XenoLib.getClass('input error');

    try {
      const dialog = require('electron').remote.dialog;
      const DelayedCall = WebpackModules.getByProps('DelayedCall').DelayedCall;
      const FsModule = require('fs');
      /**
       * @interface
       * @name module:FilePicker
       * @property {string} path
       * @property {string} placeholder
       * @property {Function} onChange
       * @property {object} properties
       * @property {bool} nullOnInvalid
       * @property {bool} saveOnEnter
       */
      XenoLib.ReactComponents.FilePicker = class FilePicker extends React.PureComponent {
        constructor(props) {
          super(props);
          this.state = {
            multiInputFocused: false,
            path: props.path,
            error: null
          };
          XenoLib._.bindAll(this, ['handleOnBrowse', 'handleChange', 'checkInvalidDir']);
          this.handleKeyDown = XenoLib._.throttle(this.handleKeyDown.bind(this), 500);
          this.delayedCallVerifyPath = new DelayedCall(500, () => this.checkInvalidDir());
        }
        checkInvalidDir(doSave) {
          FsModule.access(this.state.path, FsModule.constants.W_OK, error => {
            const invalid = (error && error.message.match(/.*: (.*), access '/)[1]) || null;
            this.setState({ error: invalid });
            if (this.props.saveOnEnter && !doSave) return;
            if (invalid) this.props.onChange(this.props.nullOnInvalid ? null : '');
            else this.props.onChange(this.state.path);
          });
        }
        handleOnBrowse() {
          dialog.showOpenDialog({ title: this.props.title, properties: this.props.properties }).then(({ filePaths: [path] }) => {
            if (path) this.handleChange(path);
          });
        }
        handleChange(path) {
          this.setState({ path });
          this.delayedCallVerifyPath.delay();
        }
        handleKeyDown(e) {
          if (!this.props.saveOnEnter || e.which !== DiscordConstants.KeyboardKeys.ENTER) return;
          this.checkInvalidDir(true);
        }
        render() {
          const n = {};
          n[DiscordClasses.BasicInputs.focused] = this.state.multiInputFocused;
          n[ErrorClassname] = !!this.state.error;
          return React.createElement(
            'div',
            { className: DiscordClasses.BasicInputs.inputWrapper, style: { width: '100%' } },
            React.createElement(
              'div',
              { className: XenoLib.joinClassNames(MultiInputClassname, n) },
              React.createElement(DiscordModules.Textbox, {
                value: this.state.path,
                placeholder: this.props.placeholder,
                onChange: this.handleChange,
                onFocus: () => this.setState({ multiInputFocused: true }),
                onBlur: () => this.setState({ multiInputFocused: false }),
                onKeyDown: this.handleKeyDown,
                autoFocus: false,
                className: MultiInputFirstClassname,
                inputClassName: MultiInputFieldClassname
              }),
              React.createElement(XenoLib.ReactComponents.Button, { onClick: this.handleOnBrowse, color: (!!this.state.error && XenoLib.ReactComponents.ButtonOptions.ButtonColors.RED) || XenoLib.ReactComponents.ButtonOptions.ButtonColors.GREY, look: XenoLib.ReactComponents.ButtonOptions.ButtonLooks.GHOST, size: XenoLib.ReactComponents.Button.Sizes.MEDIUM }, 'Browse')
            ),
            !!this.state.error && React.createElement('div', { className: ErrorMessageClassname }, 'Error: ', this.state.error)
          );
        }
      };
    } catch (e) {
      Logger.stacktrace('Failed to create FilePicker component', e);
    }

    /**
     * @param {string} name - name label of the setting
     * @param {string} note - help/note to show underneath or above the setting
     * @param {string} value - current hex color
     * @param {callable} onChange - callback to perform on setting change, callback receives hex string
     * @param {object} [options] - object of options to give to the setting
     * @param {boolean} [options.disabled=false] - should the setting be disabled
     * @param {Array<number>} [options.colors=presetColors] - preset list of colors
     * @author Zerebos, from his library ZLibrary
     */
    const FormItem = WebpackModules.getByDisplayName('FormItem');
    const DeprecatedModal = WebpackModules.getByDisplayName('DeprecatedModal');
    const ModalContainerClassname = XenoLib.getClass('mobile container');
    const ModalContentClassname = XenoLib.getClass('mobile container content');

    const ColorPickerComponent = WebpackModules.getByDisplayName('ColorPicker');

    class ColorPickerModal extends React.PureComponent {
      constructor(props) {
        super(props);
        this.state = { value: props.value };
        XenoLib._.bindAll(this, ['handleChange']);
      }
      handleChange(value) {
        this.setState({ value });
        this.props.onChange(ColorConverter.int2hex(value));
      }
      render() {
        return React.createElement(
          DeprecatedModal,
          { className: ModalContainerClassname, tag: 'form', onSubmit: this.handleSubmit, size: '' },
          React.createElement(
            DeprecatedModal.Content,
            { className: ModalContentClassname },
            React.createElement(
              FormItem,
              { className: DiscordClasses.Margins.marginTop20 },
              React.createElement(ColorPickerComponent, {
                defaultColor: this.props.defaultColor,
                colors: [16711680, 16746496, 16763904, 13434624, 65314, 65484, 61183, 43775, 26367, 8913151, 16711918, 16711782, 11730944, 11755264, 11767552, 9417472, 45848, 45967, 42931, 30643, 18355, 6226099, 11731111, 11731015],
                value: this.state.value,
                onChange: this.handleChange
              })
            )
          )
        );
      }
    }

    const ExtraButtonClassname = XenoLib.joinClassNames('xenoLib-button', XenoLib.getClass('recording button'));
    const TextClassname = XenoLib.getClass('recording text');
    const DropperIcon = React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16' }, React.createElement('path', { d: 'M14.994 1.006C13.858-.257 11.904-.3 10.72.89L8.637 2.975l-.696-.697-1.387 1.388 5.557 5.557 1.387-1.388-.697-.697 1.964-1.964c1.13-1.13 1.3-2.985.23-4.168zm-13.25 10.25c-.225.224-.408.48-.55.764L.02 14.37l1.39 1.39 2.35-1.174c.283-.14.54-.33.765-.55l4.808-4.808-2.776-2.776-4.813 4.803z', fill: 'currentColor' }));
    const ClockReverseIcon = React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24' }, React.createElement('path', { d: 'M13,3 C8.03,3 4,7.03 4,12 L1,12 L4.89,15.89 L4.96,16.03 L9,12 L6,12 C6,8.13 9.13,5 13,5 C16.87,5 20,8.13 20,12 C20,15.87 16.87,19 13,19 C11.07,19 9.32,18.21 8.06,16.94 L6.64,18.36 C8.27,19.99 10.51,21 13,21 C17.97,21 22,16.97 22,12 C22,7.03 17.97,3 13,3 L13,3 Z M12,8 L12,13 L16.28,15.54 L17,14.33 L13.5,12.25 L13.5,8 L12,8 L12,8 Z', fill: 'currentColor' }));
    class ColorPicker extends React.PureComponent {
      constructor(props) {
        super(props);
        this.state = {
          error: null,
          value: props.value,
          multiInputFocused: false
        };
        XenoLib._.bindAll(this, ['handleChange', 'handleColorPicker', 'handleReset']);
      }
      handleChange(value) {
        if (!value.length) {
          this.state.error = 'You must input a hex string';
        } else if (!ColorConverter.isValidHex(value)) {
          this.state.error = 'Invalid hex string';
        } else {
          this.state.error = null;
        }
        this.setState({ value });
        this.props.onChange(!value.length || !ColorConverter.isValidHex(value) ? this.props.defaultColor : value);
      }
      handleColorPicker() {
        const modalId = ModalStack.push(e => React.createElement(XenoLib.ReactComponents.ErrorBoundary, { label: 'color picker modal', onError: () => ModalStack.popWithKey(modalId) }, React.createElement(ColorPickerModal, { ...e, defaultColor: ColorConverter.hex2int(this.props.defaultColor), value: ColorConverter.hex2int(this.props.value), onChange: this.handleChange })));
      }
      handleReset() {
        this.handleChange(this.props.defaultColor);
      }
      render() {
        const n = {};
        n[DiscordClasses.BasicInputs.focused] = this.state.multiInputFocused;
        n[ErrorClassname] = !!this.state.error;
        return React.createElement(
          'div',
          { className: XenoLib.joinClassNames(DiscordClasses.BasicInputs.inputWrapper.value, 'xenoLib-color-picker'), style: { width: '100%' } },
          React.createElement(
            'div',
            { className: XenoLib.joinClassNames(MultiInputClassname, n) },
            React.createElement('div', {
              className: XenoLib.ReactComponents.Button.Sizes.SMALL,
              style: {
                backgroundColor: this.state.value,
                height: 38
              }
            }),
            React.createElement(DiscordModules.Textbox, {
              value: this.state.value,
              placeholder: 'Hex color',
              onChange: this.handleChange,
              onFocus: () => this.setState({ multiInputFocused: true }),
              onBlur: () => this.setState({ multiInputFocused: false }),
              autoFocus: false,
              className: MultiInputFirstClassname,
              inputClassName: MultiInputFieldClassname
            }),
            React.createElement(
              XenoLib.ReactComponents.Button,
              {
                onClick: this.handleColorPicker,
                color: (!!this.state.error && XenoLib.ReactComponents.ButtonOptions.ButtonColors.RED) || XenoLib.ReactComponents.ButtonOptions.ButtonColors.GREY,
                look: XenoLib.ReactComponents.ButtonOptions.ButtonLooks.GHOST,
                size: XenoLib.ReactComponents.Button.Sizes.MIN,
                className: ExtraButtonClassname
              },
              React.createElement('span', { className: TextClassname }, 'Color picker'),
              React.createElement(
                'span',
                {
                  className: 'xenoLib-button-icon'
                },
                DropperIcon
              )
            ),
            React.createElement(
              XenoLib.ReactComponents.Button,
              {
                onClick: this.handleReset,
                color: (!!this.state.error && XenoLib.ReactComponents.ButtonOptions.ButtonColors.RED) || XenoLib.ReactComponents.ButtonOptions.ButtonColors.GREY,
                look: XenoLib.ReactComponents.ButtonOptions.ButtonLooks.GHOST,
                size: XenoLib.ReactComponents.Button.Sizes.MIN,
                className: ExtraButtonClassname
              },
              React.createElement('span', { className: TextClassname }, 'Reset'),
              React.createElement(
                'span',
                {
                  className: 'xenoLib-button-icon xenoLib-revert'
                },
                ClockReverseIcon
              )
            )
          ),
          !!this.state.error && React.createElement('div', { className: ErrorMessageClassname }, 'Error: ', this.state.error)
        );
      }
    }
    XenoLib.Settings = {};
    XenoLib.Settings.FilePicker = class FilePickerSettingField extends Settings.SettingField {
      constructor(name, note, value, onChange, options = { properties: ['openDirectory', 'createDirectory'], placeholder: 'Path to folder', defaultPath: '' }) {
        super(name, note, onChange, XenoLib.ReactComponents.FilePicker || class b {}, {
          onChange: reactElement => path => {
            this.onChange(path ? path : options.defaultPath);
          },
          path: value,
          nullOnInvalid: true,
          ...options
        });
      }
    };
    XenoLib.Settings.ColorPicker = class ColorPickerSettingField extends Settings.SettingField {
      constructor(name, note, value, onChange, options = {}) {
        super(name, note, onChange, ColorPicker, {
          disabled: options.disabled ? true : false,
          onChange: reactElement => color => {
            this.onChange(color);
          },
          defaultColor: typeof options.defaultColor !== 'undefined' ? options.defaultColor : ColorConverter.int2hex(DiscordConstants.DEFAULT_ROLE_COLOR),
          value
        });
      }
    };

    XenoLib.Settings.PluginFooter = class PluginFooterField extends Settings.SettingField {
      constructor(showChangelog) {
        super('', '', DiscordConstants.NOOP, XenoLib.ReactComponents.PluginFooter, {
          showChangelog
        });
      }
    };

    XenoLib.changeName = (currentName, newName) => {
      try {
        const path = require('path');
        const fs = require('fs');
        const pluginsFolder = path.dirname(currentName);
        const pluginName = path.basename(currentName).match(/^[^\.]+/)[0];
        if (pluginName === newName) return true;
        const wasEnabled = BdApi.Plugins && BdApi.Plugins.isEnabled ? BdApi.Plugins.isEnabled(pluginName) : global.pluginCookie && pluginCookie[pluginName];
        fs.accessSync(currentName, fs.constants.W_OK | fs.constants.R_OK);
        const files = fs.readdirSync(pluginsFolder);
        files.forEach(file => {
          if (!file.startsWith(pluginName) || file.startsWith(newName) || file.indexOf('.plugin.js') !== -1) return;
          fs.renameSync(path.resolve(pluginsFolder, file), path.resolve(pluginsFolder, `${newName}${file.match(new RegExp(`^${pluginName}(.*)`))[1]}`));
        });
        fs.renameSync(currentName, path.resolve(pluginsFolder, `${newName}.plugin.js`));
        XenoLib.Notifications.success(`[**XenoLib**] \`${pluginName}\` file has been renamed to \`${newName}\``);
        if ((!BdApi.Plugins || !BdApi.Plugins.isEnabled || !BdApi.Plugins.enable) && (!global.pluginCookie || !global.pluginModule)) Modals.showAlertModal('Plugin has been renamed', 'Plugin has been renamed, but your client mod has a missing feature, as such, the plugin could not be enabled (if it even was enabled).');
        else {
          if (!wasEnabled) return;
          setTimeout(() => (BdApi.Plugins && BdApi.Plugins.enable ? BdApi.Plugins.enable(newName) : pluginModule.enablePlugin(newName)), 1000); /* /shrug */
        }
      } catch (e) {
        Logger.stacktrace('There has been an issue renaming a plugin', e);
      }
    };

    const FancyParser = (() => {
      const ParsersModule = WebpackModules.getByProps('parseAllowLinks', 'parse');
      try {
        const DeepClone = WebpackModules.getByString('/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(');
        const ReactParserRules = WebpackModules.find(m => m.default && m.default.toString().search(/function\(\){return \w}$/) !== -1).default; /* thanks Zere for not fixing the bug ._. */
        const FANCY_PANTS_PARSER_RULES = DeepClone([WebpackModules.getByProps('RULES', 'ALLOW_LINKS_RULES').ALLOW_LINKS_RULES, ReactParserRules()]);
        FANCY_PANTS_PARSER_RULES.image = WebpackModules.getByProps('defaultParse').defaultRules.image;
        return ParsersModule.reactParserFor(FANCY_PANTS_PARSER_RULES);
      } catch (e) {
        Logger.stacktrace('Failed to create special parser', e);
        return ParsersModule.parseAllowLinks;
      }
    })();
    const AnchorClasses = WebpackModules.getByProps('anchor', 'anchorUnderlineOnHover') || {};
    const EmbedVideo = (() => {
      try {
        return WebpackModules.getByProps('EmbedVideo').EmbedVideo;
      } catch (e) {
        Logger.stacktrace('Failed to get EmbedVideo!', e);
        return DiscordConstants.NOOP_NULL;
      }
    })();
    const VideoComponent = (() => {
      try {
        const ret = new (WebpackModules.getByDisplayName('MediaPlayer'))({}).render();
        const vc = Utilities.findInReactTree(ret, e => e && e.props && typeof e.props.className === 'string' && e.props.className.indexOf('video-8eMOth') !== -1);
        return vc.type;
      } catch (e) {
        Logger.stacktrace('Failed to get the video component', e);
        return DiscordConstants.NOOP_NULL;
      }
    })();
    const ComponentRenderers = WebpackModules.getByProps('renderVideoComponent') || {};
    /* MY CHANGELOG >:C */
    XenoLib.showChangelog = (title, version, changelog, footer) => {
      const ChangelogClasses = DiscordClasses.Changelog;
      const items = [];
      let isFistType = true;
      for (let i = 0; i < changelog.length; i++) {
        const item = changelog[i];
        switch (item.type) {
          case 'image':
            items.push(React.createElement('img', { alt: '', src: item.src, width: item.width || 451, height: item.height || 254 }));
            continue;
          case 'video':
            items.push(React.createElement(VideoComponent, { src: item.src, poster: item.thumbnail, width: item.width || 451, height: item.height || 254, loop: !0, muted: !0, autoPlay: !0, className: ChangelogClasses.video }));
            continue;
          case 'youtube':
            items.push(React.createElement(EmbedVideo, { className: ChangelogClasses.video, allowFullScreen: !1, href: `https://youtu.be/${item.youtube_id}`, thumbnail: { url: `https://i.ytimg.com/vi/${item.youtube_id}/maxresdefault.jpg`, width: item.width || 451, height: item.height || 254 }, video: { url: `https://www.youtube.com/embed/${item.youtube_id}?vq=large&rel=0&controls=0&showinfo=0`, width: item.width || 451, height: item.height || 254 }, width: item.width || 451, height: item.height || 254, renderVideoComponent: ComponentRenderers.renderVideoComponent || DiscordConstants.NOOP_NULL, renderImageComponent: ComponentRenderers.renderImageComponent || DiscordConstants.NOOP_NULL, renderLinkComponent: ComponentRenderers.renderMaskedLinkComponent || DiscordConstants.NOOP_NULL }));
            continue;
          case 'description':
            items.push(React.createElement('p', {}, FancyParser(item.content)));
            continue;
          default:
            const logType = ChangelogClasses[item.type] || ChangelogClasses.added;
            items.push(React.createElement('h1', { className: XenoLib.joinClassNames(logType.value, { [ChangelogClasses.marginTop.value]: item.marginTop || isFistType }) }, item.title));
            items.push(
              React.createElement(
                'ul',
                { className: 'XL-chl-p' },
                item.items.map(e =>
                  React.createElement(
                    'li',
                    {},
                    React.createElement(
                      'p',
                      {},
                      Array.isArray(e)
                        ? e.map(e =>
                            Array.isArray(e)
                              ? React.createElement(
                                  'ul',
                                  {},
                                  e.map(e => React.createElement('li', {}, FancyParser(e)))
                                )
                              : FancyParser(e)
                          )
                        : FancyParser(e)
                    )
                  )
                )
              )
            );
            isFistType = false;
        }
      }
      const renderFooter = () => ['Need support? ', React.createElement('a', { className: XenoLib.joinClassNames(AnchorClasses.anchor, AnchorClasses.anchorUnderlineOnHover), onClick: () => (LayerManager.popLayer(), ModalStack.pop(), InviteActions.acceptInviteAndTransitionToInviteChannel('NYvWdN5')) }, 'Join my support server'), FancyParser('! Or consider donating via [Paypal](https://paypal.me/lighty13), [Ko-fi](https://ko-fi.com/lighty_) or [Patreon](https://www.patreon.com/lightyp)!')];
      ModalStack.push(props => React.createElement(XenoLib.ReactComponents.ErrorBoundary, { label: 'Changelog', onError: () => props.onClose() }, React.createElement(ChangelogModal, { className: ChangelogClasses.container, selectable: true, onScroll: _ => _, onClose: _ => _, renderHeader: () => React.createElement(FlexChild.Child, { grow: 1, shrink: 1 }, React.createElement(Titles.default, { tag: Titles.Tags.H4 }, title), React.createElement(TextElement, { size: TextElement.Sizes.SIZE_12, className: ChangelogClasses.date }, `Version ${version}`)), renderFooter: () => React.createElement(FlexChild.Child, { gro: 1, shrink: 1 }, React.createElement(TextElement, { size: TextElement.Sizes.SIZE_12 }, footer ? (typeof footer === 'string' ? FancyParser(footer) : footer) : renderFooter())), children: items, ...props })));
    };

    /* https://github.com/react-spring/zustand
     * MIT License
     *
     * Copyright (c) 2019 Paul Henschel
     *
     * Permission is hereby granted, free of charge, to any person obtaining a copy
     * of this software and associated documentation files (the "Software"), to deal
     * in the Software without restriction, including without limitation the rights
     * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
     * copies of the Software, and to permit persons to whom the Software is
     * furnished to do so, subject to the following conditions:
     *
     * The above copyright notice and this permission notice shall be included in all
     * copies or substantial portions of the Software.
     *
     * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
     * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
     * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
     * SOFTWARE.
     */
    XenoLib.zustand = createState => {
      var state;
      var listeners = new Set();
      const setState = partial => {
        var partialState = typeof partial === 'function' ? partial(state) : partial;
        if (partialState !== state) {
          state = Object.assign({}, state, partialState);
          listeners.forEach(function (listener) {
            return listener();
          });
        }
      };
      const getState = () => state;
      const getSubscriber = (listener, selector, equalityFn) => {
        if (selector === void 0) selector = getState;
        if (equalityFn === void 0) equalityFn = Object.is;
        return { currentSlice: selector(state), equalityFn: equalityFn, errored: false, listener: listener, selector: selector, unsubscribe: function unsubscribe() {} };
      };
      var subscribe = function subscribe(subscriber) {
        function listener() {
          // Selector or equality function could throw but we don't want to stop
          // the listener from being called.
          // https://github.com/react-spring/zustand/pull/37
          try {
            var newStateSlice = subscriber.selector(state);
            if (!subscriber.equalityFn(subscriber.currentSlice, newStateSlice)) subscriber.listener((subscriber.currentSlice = newStateSlice));
          } catch (error) {
            subscriber.errored = true;
            subscriber.listener(null, error);
          }
        }

        listeners.add(listener);
        return () => listeners.delete(listener);
      };
      const apiSubscribe = (listener, selector, equalityFn) => subscribe(getSubscriber(listener, selector, equalityFn));
      const destroy = () => listeners.clear();
      const useStore = (selector, equalityFn) => {
        if (selector === void 0) selector = getState;
        if (equalityFn === void 0) equalityFn = Object.is;
        var forceUpdate = React.useReducer(c => c + 1, 0)[1];
        var subscriberRef = React.useRef();
        if (!subscriberRef.current) {
          subscriberRef.current = getSubscriber(forceUpdate, selector, equalityFn);
          subscriberRef.current.unsubscribe = subscribe(subscriberRef.current);
        }
        var subscriber = subscriberRef.current;
        var newStateSlice;
        var hasNewStateSlice = false; // The selector or equalityFn need to be called during the render phase if
        // they change. We also want legitimate errors to be visible so we re-run
        // them if they errored in the subscriber.
        if (subscriber.selector !== selector || subscriber.equalityFn !== equalityFn || subscriber.errored) {
          // Using local variables to avoid mutations in the render phase.
          newStateSlice = selector(state);
          hasNewStateSlice = !equalityFn(subscriber.currentSlice, newStateSlice);
        } // Syncing changes in useEffect.
        React.useLayoutEffect(function () {
          if (hasNewStateSlice) subscriber.currentSlice = newStateSlice;
          subscriber.selector = selector;
          subscriber.equalityFn = equalityFn;
          subscriber.errored = false;
        });
        React.useLayoutEffect(() => subscriber.unsubscribe, []);
        return hasNewStateSlice ? newStateSlice : subscriber.currentSlice;
      };
      const api = { setState: setState, getState: getState, subscribe: apiSubscribe, destroy: destroy };
      state = createState(setState, getState, api);
      return [useStore, api];
    };

    /* NOTIFICATIONS START */
    let UPDATEKEY = {};
    try {
      const DeepEqualityCheck = (content1, content2) => {
        if (typeof content1 !== typeof content2) return false;
        const isCNT1HTML = content1 instanceof HTMLElement;
        const isCNT2HTML = content2 instanceof HTMLElement;
        if (isCNT1HTML !== isCNT2HTML) return false;
        else if (isCNT1HTML) return content1.isEqualNode(content2);
        if (content1 !== content2) {
          if (Array.isArray(content1)) {
            if (content1.length !== content2.length) return false;
            for (const [index, item] of content1.entries()) {
              if (!DeepEqualityCheck(item, content2[index])) return false;
            }
          } else if (typeof content1 === 'object') {
            if (content1.type) {
              if (typeof content1.type !== typeof content2.type) return false;
              if (content1.type !== content2.type) return false;
            }
            if (typeof content1.props !== typeof content2.props) return false;
            if (content1.props) {
              if (Object.keys(content1.props).length !== Object.keys(content2.props).length) return false;
              for (const prop in content1.props) {
                if (!DeepEqualityCheck(content1.props[prop], content2.props[prop])) return false;
              }
            }
          } else return false;
        }
        return true;
      };
      const [useStore, api] = XenoLib.zustand(e => ({ data: [] }));
      const defaultOptions = {
        loading: false,
        progress: -1,
        channelId: undefined,
        timeout: 3500,
        color: '#2196f3',
        onLeave: DiscordConstants.NOOP
      };
      const utils = {
        success(content, options = {}) {
          return this.show(content, Object.assign({ color: '#43b581' }, options));
        },
        info(content, options = {}) {
          return this.show(content, Object.assign({ color: '#4a90e2' }, options));
        },
        warning(content, options = {}) {
          return this.show(content, Object.assign({ color: '#ffa600' }, options));
        },
        danger(content, options = {}) {
          return this.show(content, Object.assign({ color: '#f04747' }, options));
        },
        error(content, options = {}) {
          return this.danger(content, options);
        },
        /**
         * @param {string|HTMLElement|React} content - Content to display. If it's a string, it'll be formatted with markdown, including URL support [like this](https://google.com/)
         * @param {object} options
         * @param {string} [options.channelId] Channel ID if content is a string which gets formatted, and you want to mention a role for example.
         * @param {Number} [options.timeout] Set to 0 to keep it permanently until user closes it, or if you want a progress bar
         * @param {Boolean} [options.loading] Makes the bar animate differently instead of fading in and out slowly
         * @param {Number} [options.progress] 0-100, -1 sets it to 100%, setting it to 100% closes the notification automatically
         * @param {string} [options.color] Bar color
         * @param {string} [options.allowDuplicates] By default, notifications that are similar get grouped together, use true to disable that
         * @param {function} [options.onLeave] Callback when notification is leaving
         * @return {Number} - Notification ID. Store this if you plan on force closing it, changing its content or want to set the progress
         */
        show(content, options = {}) {
          let id = null;
          options = Object.assign(Utilities.deepclone(defaultOptions), options);
          api.setState(state => {
            if (!options.allowDuplicates) {
              const notif = state.data.find(n => DeepEqualityCheck(n.content, content) && n.timeout === options.timeout && !n.leaving);
              if (notif) {
                id = notif.id;
                Dispatcher.dirtyDispatch({ type: 'XL_NOTIFS_DUPLICATE', id: notif.id });
                return state;
              }
            }
            if (state.data.length >= 100) return state;
            do {
              id = Math.floor(4294967296 * Math.random());
            } while (state.data.findIndex(n => n.id === id) !== -1);
            return { data: [].concat(state.data, [{ content, ...options, id }]) };
          });
          return id;
        },
        remove(id) {
          Dispatcher.dirtyDispatch({ type: 'XL_NOTIFS_REMOVE', id });
        },
        /**
         * @param {Number} id Notification ID
         * @param {object} options
         * @param {string} [options.channelId] Channel ID if content is a string which gets formatted, and you want to mention a role for example.
         * @param {Boolean} [options.loading] Makes the bar animate differently instead of fading in and out slowly
         * @param {Number} [options.progress] 0-100, -1 sets it to 100%, setting it to 100% closes the notification automatically
         * @param {string} [options.color] Bar color
         * @param {function} [options.onLeave] Callback when notification is leaving
         */
        update(id, options) {
          delete options.id;
          api.setState(state => {
            const idx = state.data.findIndex(n => n.id === id);
            if (idx === -1) return state;
            state.data[idx] = Object.assign(state.data[idx], options);
            return state;
          });
          Dispatcher.dirtyDispatch({ type: 'XL_NOTIFS_UPDATE', id, ...options });
        },
        exists(id) {
          return api.getState().data.findIndex(e => e.id === id && !e.leaving) !== -1;
        }
      };
      XenoLib.Notifications = utils;
      const ReactSpring = WebpackModules.getByProps('useTransition');
      const BadgesModule = WebpackModules.getByProps('NumberBadge');
      const CloseButton = React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24' }, React.createElement('path', { d: 'M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z', fill: 'currentColor' }));
      class Notification extends React.PureComponent {
        constructor(props) {
          super(props);
          this.state = {
            closeFast: false /* close button pressed, XL_NOTIFS_REMOVE dispatch */,
            offscreen: false /* don't do anything special if offscreen, not timeout */,
            counter: 1 /* how many times this notification was shown */,
            resetBar: false /* reset bar to 0 in the event counter goes up */,
            hovered: false,
            leaving: true /* prevent hover events from messing up things */,
            loading: props.loading /* loading animation, enable progress */,
            progress: props.progress /* -1 means undetermined */,
            content: props.content,
            contentParsed: this.parseContent(props.content, props.channelId),
            color: props.color
          };
          this._contentRef = null;
          this._ref = null;
          this._animationCancel = DiscordConstants.NOOP;
          this._oldOffsetHeight = 0;
          this._initialProgress = !this.props.timeout ? (this.state.loading && this.state.progress !== -1 ? this.state.progress : 100) : 0;
          XenoLib._.bindAll(this, ['closeNow', 'handleDispatch', '_setContentRef']);
          this.handleResizeEvent = XenoLib._.throttle(this.handleResizeEvent.bind(this), 100);
          this.resizeObserver = new ResizeObserver(this.handleResizeEvent);
          this._timeout = props.timeout;
        }
        componentDidMount() {
          this._unsubscribe = api.subscribe(_ => this.checkOffScreen());
          window.addEventListener('resize', this.handleResizeEvent);
          Dispatcher.subscribe('XL_NOTIFS_DUPLICATE', this.handleDispatch);
          Dispatcher.subscribe('XL_NOTIFS_REMOVE', this.handleDispatch);
          Dispatcher.subscribe('XL_NOTIFS_UPDATE', this.handleDispatch);
          Dispatcher.subscribe('XL_NOTIFS_ANIMATED', this.handleDispatch);
          Dispatcher.subscribe('XL_NOTIFS_SETTINGS_UPDATE', this.handleDispatch);
        }
        componentWillUnmount() {
          this._unsubscribe();
          window.window.removeEventListener('resize', this.handleResizeEvent);
          Dispatcher.unsubscribe('XL_NOTIFS_DUPLICATE', this.handleDispatch);
          Dispatcher.unsubscribe('XL_NOTIFS_REMOVE', this.handleDispatch);
          Dispatcher.unsubscribe('XL_NOTIFS_UPDATE', this.handleDispatch);
          Dispatcher.unsubscribe('XL_NOTIFS_ANIMATED', this.handleDispatch);
          Dispatcher.unsubscribe('XL_NOTIFS_SETTINGS_UPDATE', this.handleDispatch);
          this.resizeObserver.disconnect();
          this.resizeObserver = null; /* no mem leaks plz */
          this._ref = null;
          this._contentRef = null;
        }
        handleDispatch(e) {
          if (this.state.leaving || this.state.closeFast) return;
          if (e.type === 'XL_NOTIFS_SETTINGS_UPDATE') {
            if (e.key !== UPDATEKEY) return;
            this._animationCancel();
            this.forceUpdate();
            return;
          }
          if (e.type === 'XL_NOTIFS_ANIMATED') this.checkOffScreen();
          if (e.id !== this.props.id) return;
          const { content, channelId, loading, progress, color } = e;
          const { content: curContent, channelId: curChannelId, loading: curLoading, progress: curProgress, color: curColor } = this.state;
          switch (e.type) {
            case 'XL_NOTIFS_REMOVE':
              this.closeNow();
              break;
            case 'XL_NOTIFS_DUPLICATE':
              this._animationCancel();
              this.setState({ counter: this.state.counter + 1, resetBar: !!this.props.timeout, closeFast: false });
              break;
            case 'XL_NOTIFS_UPDATE':
              if (!this.state.initialAnimDone) {
                this.state.content = content || curContent;
                this.state.channelId = channelId || curChannelId;
                this.state.contentParsed = this.parseContent(content || curContent, channelId || curChannelId);
                if (typeof loading !== 'undefined') this.state.loading = loading;
                if (typeof progress !== 'undefined') this.state.progress = progress;
                this.state.color = color || curColor;
                return;
              }
              this._animationCancel();
              this.setState({
                content: content || curContent,
                channelId: channelId || curChannelId,
                contentParsed: this.parseContent(content || curContent, channelId || curChannelId),
                loading: typeof loading !== 'undefined' ? loading : curLoading,
                progress: typeof progress !== 'undefined' ? progress : curProgress,
                color: color || curColor
              });
              break;
          }
        }
        parseContent(content, channelId) {
          if (typeof content === 'string') return FancyParser(content, true, { channelId });
          else if (content instanceof Element) return ReactTools.createWrappedElement(content);
          else return content;
        }
        checkOffScreen() {
          if (this.state.leaving || !this._contentRef) return;
          const bcr = this._contentRef.getBoundingClientRect();
          if (bcr.bottom > Structs.Screen.height || bcr.top < 0) {
            if (!this.state.offscreen) {
              this._animationCancel();
              this.setState({ offscreen: true });
            }
          } else if (this.state.offscreen) {
            this._animationCancel();
            this.setState({ offscreen: false });
          }
        }
        closeNow() {
          if (this.state.closeFast) return;
          this.resizeObserver.disconnect();
          this._animationCancel();
          api.setState(state => {
            const dt = state.data.find(m => m.id === this.props.id);
            if (dt) dt.leaving = true;
            return { data: state.data };
          });
          this.setState({ closeFast: true });
        }
        handleResizeEvent() {
          if (this._oldOffsetHeight !== this._contentRef.offsetHeight) {
            this._animationCancel();
            this.forceUpdate();
          }
        }
        _setContentRef(ref) {
          if (!ref) return;
          this._contentRef = ref;
          this.resizeObserver.observe(ref);
        }
        render() {
          const config = { duration: 200 };
          if (this._contentRef) this._oldOffsetHeight = this._contentRef.offsetHeight;
          return React.createElement(
            ReactSpring.Spring,
            {
              native: true,
              from: { opacity: 0, height: 0, progress: this._initialProgress, loadbrightness: 1 },
              to: async (next, cancel) => {
                this.state.leaving = false;
                this._animationCancel = cancel;
                if (this.state.offscreen) {
                  if (this.state.closeFast) {
                    this.state.leaving = true;
                    await next({ opacity: 0, height: 0 });
                    api.setState(state => ({ data: state.data.filter(n => n.id !== this.props.id) }));
                    return;
                  }
                  await next({ opacity: 1, height: this._contentRef.offsetHeight, loadbrightness: 1 });
                  if (this.props.timeout) {
                    await next({ progress: 0 });
                  } else {
                    if (this.state.loading && this.state.progress !== -1) {
                      await next({ progress: 0 });
                    } else {
                      await next({ progress: 100 });
                    }
                  }
                  return;
                }
                const isSettingHeight = this._ref.offsetHeight !== this._contentRef.offsetHeight;
                await next({ opacity: 1, height: this._contentRef.offsetHeight });
                if (isSettingHeight) Dispatcher.dirtyDispatch({ type: 'XL_NOTIFS_ANIMATED' });
                this.state.initialAnimDone = true;
                if (this.state.resetBar || (this.state.hovered && LibrarySettings.notifications.timeoutReset)) {
                  await next({ progress: 0 }); /* shit gets reset */
                  this.state.resetBar = false;
                }

                if (!this.props.timeout && !this.state.closeFast) {
                  if (!this.state.loading) {
                    await next({ progress: 100 });
                  } else {
                    await next({ loadbrightness: 1 });
                    if (this.state.progress === -1) await next({ progress: 100 });
                    else await next({ progress: this.state.progress });
                  }
                  if (this.state.progress < 100 || !this.state.loading) return;
                }
                if (this.state.hovered && !this.state.closeFast) return;
                if (!this.state.closeFast && !LibrarySettings.notifications.timeoutReset) this._startProgressing = Date.now();
                await next({ progress: 100 });
                if (this.state.hovered && !this.state.closeFast) return; /* race condition: notif is hovered, but it continues and closes! */
                this.state.leaving = true;
                if (!this.state.closeFast) {
                  api.setState(state => {
                    const dt = state.data.find(m => m.id === this.props.id);
                    if (dt) dt.leaving = true;
                    return { data: state.data };
                  });
                }
                this.props.onLeave();
                await next({ opacity: 0, height: 0 });
                api.setState(state => ({ data: state.data.filter(n => n.id !== this.props.id) }));
              },
              config: key => {
                if (key === 'progress') {
                  let duration = this._timeout;
                  if (this.state.closeFast || !this.props.timeout || this.state.resetBar || this.state.hovered) duration = 150;
                  if (this.state.offscreen) duration = 0; /* don't animate at all */
                  return { duration };
                }
                if (key === 'loadbrightness') return { duration: 750 };
                return config;
              }
            },
            e => {
              return React.createElement(
                ReactSpring.animated.div,
                {
                  style: {
                    height: e.height,
                    opacity: e.opacity
                  },
                  className: 'xenoLib-notification',
                  ref: e => e && (this._ref = e)
                },
                React.createElement(
                  'div',
                  {
                    className: 'xenoLib-notification-content-wrapper',
                    ref: this._setContentRef,
                    onMouseEnter: e => {
                      if (this.state.leaving || !this.props.timeout || this.state.closeFast) return;
                      this._animationCancel();
                      if (this._startProgressing) {
                        this._timeout -= Date.now() - this._startProgressing;
                      }
                      this.state.hovered = true;
                      this.forceUpdate();
                    },
                    onMouseLeave: e => {
                      if (this.state.leaving || !this.props.timeout || this.state.closeFast) return;
                      this._animationCancel();
                      this.setState({ hovered: false });
                    },
                    style: {
                      '--grad-one': this.state.color,
                      '--grad-two': ColorConverter.lightenColor(this.state.color, 20),
                      '--bar-color': ColorConverter.darkenColor(this.state.color, 30)
                    },
                    onClick: e => {
                      if (!this.props.onClick) return;
                      if (e.target && e.target.getAttribute('role') === 'button') return;
                      this.props.onClick();
                      this.closeNow();
                    },
                    onContextMenu: e => {
                      if (!this.props.onContext) return;
                      this.props.onContext();
                      this.closeNow();
                    }
                  },
                  React.createElement(
                    'div',
                    {
                      className: 'xenoLib-notification-content',
                      style: {
                        backdropFilter: LibrarySettings.notifications.backdrop ? 'blur(5px)' : undefined,
                        background: ColorConverter.int2rgba(ColorConverter.hex2int(LibrarySettings.notifications.backdropColor), LibrarySettings.notifications.backdrop ? 0.3 : 1.0),
                        border: LibrarySettings.notifications.backdrop ? 'none' : undefined
                      },
                      ref: e => {
                        if (!LibrarySettings.notifications.backdrop || !e) return;
                        e.style.setProperty('backdrop-filter', e.style.backdropFilter, 'important');
                        e.style.setProperty('background', e.style.background, 'important');
                        e.style.setProperty('border', e.style.border, 'important');
                      }
                    },
                    React.createElement(ReactSpring.animated.div, {
                      className: XenoLib.joinClassNames('xenoLib-notification-loadbar', { 'xenoLib-notification-loadbar-striped': !this.props.timeout && this.state.loading, 'xenoLib-notification-loadbar-user': !this.props.timeout && !this.state.loading }),
                      style: { right: e.progress.to(e => 100 - e + '%'), filter: e.loadbrightness.to(e => `brightness(${e * 100}%)`) }
                    }),
                    React.createElement(
                      XenoLib.ReactComponents.Button,
                      {
                        look: XenoLib.ReactComponents.Button.Looks.BLANK,
                        size: XenoLib.ReactComponents.Button.Sizes.NONE,
                        onClick: e => {
                          e.preventDefault();
                          e.stopPropagation();
                          this.closeNow();
                        },
                        onContextMenu: e => {
                          const state = api.getState();
                          state.data.forEach(notif => utils.remove(notif.id));
                        },
                        className: 'xenoLib-notification-close'
                      },
                      CloseButton
                    ),
                    this.state.counter > 1 && BadgesModule.NumberBadge({ count: this.state.counter, className: 'xenLib-notification-counter', color: '#2196f3' }),
                    this.state.contentParsed
                  )
                )
              );
            }
          );
        }
      }
      function NotificationsWrapper(e) {
        const notifications = useStore(e => {
          return e.data;
        });
        return notifications.map(item => React.createElement(XenoLib.ReactComponents.ErrorBoundary, { label: `Notification ${item.id}`, onError: () => api.setState(state => ({ data: state.data.filter(n => n.id !== item.id) })), key: item.id.toString() }, React.createElement(Notification, { ...item, leaving: false }))).reverse();
      }
      NotificationsWrapper.displayName = 'XenoLibNotifications';
      const DOMElement = document.createElement('div');
      DOMElement.className = XenoLib.joinClassNames('xenoLib-notifications', `xenoLib-centering-${LibrarySettings.notifications.position}`);
      ReactDOM.render(React.createElement(NotificationsWrapper, {}), DOMElement);
      document.querySelector('#app-mount').appendChild(DOMElement);
    } catch (e) {
      Logger.stacktrace('There has been an error loading the Notifications system, fallback object has been put in place to prevent errors', e);
      XenoLib.Notifications = {
        success(content, options = {}) {},
        info(content, options = {}) {},
        warning(content, options = {}) {},
        danger(content, options = {}) {},
        error(content, options = {}) {},
        show(content, options = {}) {},
        remove(id) {},
        update(id, options) {}
      };
    }
    /* NOTIFICATIONS END */

    global.XenoLib = XenoLib;

    const notifLocations = ['topLeft', 'topMiddle', 'topRight', 'bottomLeft', 'bottomMiddle', 'bottomRight'];
    const notifLocationClasses = [`${XenoLib.getClass('selected topLeft')} ${XenoLib.getClass('topLeft option')}`, `topMiddle-xenoLib ${XenoLib.getClass('topLeft option')}`, `${XenoLib.getClass('selected topRight')} ${XenoLib.getClass('topLeft option')}`, `${XenoLib.getClass('selected bottomLeft')} ${XenoLib.getClass('topLeft option')}`, `bottomMiddle-xenoLib ${XenoLib.getClass('topLeft option')}`, `${XenoLib.getClass('selected bottomRight')} ${XenoLib.getClass('topLeft option')}`];
    const PositionSelectorWrapperClassname = XenoLib.getClass('topLeft wrapper');
    const PositionSelectorSelectedClassname = XenoLib.getClass('topLeft selected');
    const PositionSelectorHiddenInputClassname = XenoLib.getClass('topLeft hiddenInput');
    const FormText = WebpackModules.getByDisplayName('FormText');
    class NotificationPosition extends React.PureComponent {
      constructor(props) {
        super(props);
        this.state = {
          position: props.position
        };
      }
      componentDidMount() {
        this._notificationId = XenoLib.Notifications.show('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur lacinia justo eget libero ultrices mollis.', { timeout: 0 });
      }
      componentWillUnmount() {
        XenoLib.Notifications.remove(this._notificationId);
      }
      getSelected() {
        switch (this.state.position) {
          case 'topLeft':
            return 'Top Left';
          case 'topMiddle':
            return 'Top Middle';
          case 'topRight':
            return 'Top Right';
          case 'bottomLeft':
            return 'Bottom Left';
          case 'bottomMiddle':
            return 'Bottom Middle';
          case 'bottomRight':
            return 'Bottom Right';
          default:
            return 'Unknown';
        }
      }
      render() {
        return React.createElement(
          'div',
          {},
          React.createElement(
            'div',
            {
              className: PositionSelectorWrapperClassname
            },
            notifLocations.map((e, i) => {
              return React.createElement(
                'label',
                {
                  className: XenoLib.joinClassNames(notifLocationClasses[i], { [PositionSelectorSelectedClassname]: this.state.position === e })
                },
                React.createElement('input', {
                  type: 'radio',
                  name: 'xenolib-notif-position-selector',
                  value: e,
                  onChange: () => {
                    this.props.onChange(e);
                    this.setState({ position: e });
                  },
                  className: PositionSelectorHiddenInputClassname
                })
              );
            })
          ),
          React.createElement(
            FormText,
            {
              type: FormText.Types.DESCRIPTION,
              className: DiscordClasses.Margins.marginTop8
            },
            this.getSelected()
          )
        );
      }
    }

    class NotificationPositionField extends Settings.SettingField {
      constructor(name, note, onChange, value) {
        super(name, note, onChange, NotificationPosition, {
          position: value,
          onChange: reactElement => position => {
            this.onChange(position);
          }
        });
      }
    }

    return class CXenoLib extends Plugin {
      constructor() {
        super();
        this.settings = LibrarySettings;
        XenoLib.changeName(__filename, '1XenoLib'); /* prevent user from changing libs filename */
        try {
          ModalStack.popWithKey(`${this.name}_DEP_MODAL`);
        } catch (e) {}
      }
      load() {
        super.load();
        if (!BdApi.Plugins) return; /* well shit what now */
        if (!BdApi.isSettingEnabled || !BdApi.disableSetting) return;
        const prev = BdApi.isSettingEnabled('fork-ps-2');
        if (prev) BdApi.disableSetting('fork-ps-2');
        const list = BdApi.Plugins.getAll().filter(k => k._XL_PLUGIN);
        for (let p = 0; p < list.length; p++) {
          try {
            BdApi.Plugins.reload(list[p].getName());
          } catch (e) {
            try {
              Logger.stacktrace(`Failed to reload plugin ${list[p].getName()}`, e);
            } catch (e) {
              Logger.error(`Failed telling you about failing to reload a plugin`, list[p], e);
            }
          }
        }
        if (prev) BdApi.enableSetting('fork-ps-2');
      }
      buildSetting(data) {
        if (data.type === 'position') {
          const setting = new NotificationPositionField(data.name, data.note, data.onChange, data.value);
          if (data.id) setting.id = data.id;
          return setting;
        } else if (data.type === 'color') {
          const setting = new XenoLib.Settings.ColorPicker(data.name, data.note, data.value, data.onChange, data.options);
          if (data.id) setting.id = data.id;
          return setting;
        }
        return super.buildSetting(data);
      }
      getSettingsPanel() {
        return this.buildSettingsPanel()
          .append(new XenoLib.Settings.PluginFooter(() => this.showChangelog()))
          .getElement();
      }
      saveSettings(category, setting, value) {
        this.settings[category][setting] = value;
        LibrarySettings[category][setting] = value;
        PluginUtilities.saveSettings(this.name, LibrarySettings);
        if (category === 'notifications') {
          if (setting === 'position') {
            const DOMElement = document.querySelector('.xenoLib-notifications');
            if (DOMElement) {
              DOMElement.className = XenoLib.joinClassNames('xenoLib-notifications', `xenoLib-centering-${LibrarySettings.notifications.position}`);
              Dispatcher.dirtyDispatch({ type: 'XL_NOTIFS_ANIMATED' });
            }
          } else if (setting === 'backdrop' || setting === 'backdropColor') {
            Dispatcher.wait(() => Dispatcher.dispatch({ type: 'XL_NOTIFS_SETTINGS_UPDATE', key: UPDATEKEY }), (UPDATEKEY = {}));
          }
        } else if (category === 'addons') {
          if (setting === 'extra') {
            if (value && !patchAddonCardAnyway.patched) patchAddonCardAnyway(true);
            XenoLib.Notifications.warning('Reopen plugins section for immediate effect');
          }
        }
      }
      showChangelog(footer) {
        XenoLib.showChangelog(`${this.name} has been updated!`, this.version, this._config.changelog);
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
    if (global.BdApi && 'function' == typeof BdApi.getPlugin) {
      const a = (c, a) => ((c = c.split('.').map(b => parseInt(b))), (a = a.split('.').map(b => parseInt(b))), !!(a[0] > c[0])) || !!(a[0] == c[0] && a[1] > c[1]) || !!(a[0] == c[0] && a[1] == c[1] && a[2] > c[2]),
        b = BdApi.getPlugin('ZeresPluginLibrary');
      ((b, c) => b && b._config && b._config.info && b._config.info.version && a(b._config.info.version, c))(b, '1.2.16') && (ZeresPluginLibraryOutdated = !0);
    }
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
        stop() {}
        handleMissingLib() {
          const a = BdApi.findModuleByProps('isModalOpenWithKey');
          if (a && a.isModalOpenWithKey(`${this.name}_DEP_MODAL`)) return;
          const b = !global.ZeresPluginLibrary,
            c = ZeresPluginLibraryOutdated ? 'Outdated Library' : 'Missing Library',
            d = `The Library ZeresPluginLibrary required for ${this.name} is ${ZeresPluginLibraryOutdated ? 'outdated' : 'missing'}.`,
            e = BdApi.findModuleByProps('push', 'update', 'pop', 'popWithKey'),
            f = BdApi.findModuleByDisplayName('Text'),
            g = BdApi.findModule(a => a.defaultProps && a.key && 'confirm-modal' === a.key()),
            h = () => BdApi.alert(c, BdApi.React.createElement('span', {}, BdApi.React.createElement('div', {}, d), `Due to a slight mishap however, you'll have to download the libraries yourself. This is not intentional, something went wrong, errors are in console.`, b || ZeresPluginLibraryOutdated ? BdApi.React.createElement('div', {}, BdApi.React.createElement('a', { href: 'https://betterdiscord.net/ghdl?id=2252', target: '_blank' }, 'Click here to download ZeresPluginLibrary')) : null));
          if (!e || !g || !f) return console.error(`Missing components:${(e ? '' : ' ModalStack') + (g ? '' : ' ConfirmationModalComponent') + (f ? '' : 'TextElement')}`), h();
          class i extends BdApi.React.PureComponent {
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
          class j extends g {
            submitModal() {
              this.props.onConfirm();
            }
          }
          let k = !1,
            l = !1;
          const m = e.push(
            a => {
              if (l) return null;
              try {
                return BdApi.React.createElement(
                  i,
                  {
                    label: 'missing dependency modal',
                    onError: () => {
                      e.popWithKey(m), h();
                    }
                  },
                  BdApi.React.createElement(
                    j,
                    Object.assign(
                      {
                        header: c,
                        children: [BdApi.React.createElement(f, { size: f.Sizes.SIZE_16, children: [`${d} Please click Download Now to download it.`] })],
                        red: !1,
                        confirmText: 'Download Now',
                        cancelText: 'Cancel',
                        onConfirm: () => {
                          if (k) return;
                          k = !0;
                          const a = require('request'),
                            b = require('fs'),
                            c = require('path');
                          a('https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js', (a, d, f) => {
                            try {
                              if (a || 200 !== d.statusCode) return e.popWithKey(m), h();
                              b.writeFile(c.join(BdApi.Plugins && BdApi.Plugins.folder ? BdApi.Plugins.folder : window.ContentManager.pluginsFolder, '0PluginLibrary.plugin.js'), f, () => {});
                            } catch (a) {
                              console.error('Fatal error downloading ZeresPluginLibrary', a), e.popWithKey(m), h();
                            }
                          });
                        }
                      },
                      a
                    )
                  )
                );
              } catch (a) {
                return console.error('There has been an error constructing the modal', a), (l = !0), e.popWithKey(m), h(), null;
              }
            },
            void 0,
            `${this.name}_DEP_MODAL`
          );
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
