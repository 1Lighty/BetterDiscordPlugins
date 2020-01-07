//META{"name":"XenoLib","source":"https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/1XenoLib.plugin.js/"}*//
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
var XenoLib = (() => {
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
      version: '1.3.3',
      description: 'Simple library to complement plugins with shared code without lowering performance.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/1XenoLib.plugin.js'
    },
    changelog: [
      {
        title: 'Boring changes',
        type: 'Added',
        items: ['Optimized User Action notification.', 'Fixed odd behavior with notifications when updating them.', 'Added settings to change where the notifications should show.', 'Changed notification show animation to be duration based instead of physics based.', 'Fixed notifications sometimes getting stuck if you tried to close them.', 'Actually increment the version and push the changelog smh kms']
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
          }
        ]
      }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { ContextMenu, EmulatedTooltip, Toasts, Settings, Popouts, Modals, Utilities, WebpackModules, Filters, DiscordModules, ColorConverter, DOMTools, DiscordClasses, DiscordSelectors, ReactTools, ReactComponents, DiscordAPI, Logger, Patcher, PluginUpdater, PluginUtilities, DiscordClassModules, Structs } = Api;
    const { React, ModalStack, ContextMenuActions, ContextMenuItem, ContextMenuItemsGroup, ReactDOM, ChannelStore, GuildStore, UserStore, DiscordConstants, Dispatcher, GuildMemberStore, GuildActions, PrivateChannelActions, LayerManager, InviteActions } = DiscordModules;

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

    const ContextMenuSubMenuItem = WebpackModules.getByDisplayName('FluxContainer(SubMenuItem)');

    if (global.XenoLib) global.XenoLib.shutdown();
    const XenoLib = {};
    XenoLib.shutdown = () => {
      try {
        Patcher.unpatchAll();
      } catch (e) {
        Logger.stacktrace('Failed to unpatch all', e);
      }
      PluginUtilities.removeStyle('XenoLib-CSS');
      if (global.BDEvents) BDEvents.off('plugin-unloaded', listener);
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

    XenoLib.loadData = (name, key, defaultData, returnNull) => {
      try {
        return Object.assign(defaultData ? Utilities.deepclone(defaultData) : {}, BdApi.getData(name, key));
      } catch (err) {
        Logger.err(name, 'Unable to load data: ', err);
        if (returnNull) return null;
        return Utilities.deepclone(defaultData);
      }
    };

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
      .xenoLib-color-picker .xenoLib-button .text-2sI5Sd {
        opacity: 0;
        transform: translate3d(200%,0,0);
      }
      .xenoLib-color-picker .xenoLib-button:hover .text-2sI5Sd {
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
        padding: 20px 20px 0 20px;
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
      `
    );

    XenoLib.getUser = WebpackModules.getByProps('getUser', 'acceptAgreements').getUser;

    XenoLib.getClass = arg => {
      const args = arg.split(' ');
      return WebpackModules.getByProps(...args)[args[args.length - 1]];
    };
    XenoLib.getSingleClass = arg => XenoLib.getClass(arg).split(' ')[0];
    XenoLib.joinClassNames = WebpackModules.getModule(e => e.default && e.default.default);

    XenoLib.authorId = '239513071272329217';
    const requestUser = () =>
      XenoLib.getUser(XenoLib.authorId)
        .then(user => (XenoLib.author = user))
        .catch(() => setTimeout(requestUser, 1 * 60 * 1000));
    if (UserStore.getUser(XenoLib.authorId)) XenoLib.author = UserStore.getUser(XenoLib.authorId);
    else requestUser();
    XenoLib.supportServerId = '389049952732446731';

    try {
      /* const pluginAuthors = [
        {
          name: 'Lighty',
          id: XenoLib.authorId,
          supportServerId: XenoLib.supportServerId,
          supportServerInvite: 'NYvWdN5',
          donations: [
            {
              url: 'https://paypal.me/lighty13',
              name: 'Paypal'
            },
            {
              url: 'https://ko-fi.com/lighty_',
              name: 'Ko-fi'
            }
          ]
        }
      ]; */
      if (V2C_PluginCard && V2C_ThemeCard) {
        const ElectronShell = require('electron').shell;
        const LinkClassname = XenoLib.joinClassNames(XenoLib.getClass('anchorUnderlineOnHover anchor'), XenoLib.getClass('anchor anchorUnderlineOnHover'), 'bda-author');
        const handlePatch = (_this, _, ret) => {
          const author = Utilities.getNestedProp(ret, 'props.children.0.props.children.0.props.children.4');
          const footer = Utilities.getNestedProp(ret, 'props.children.2.props.children.0.props.children');
          /* if (!author) return;
          const donations = [];
          const support = [];
          for (let i = 0; i < pluginAuthors.length; i++) {
            const pluginAuthor = pluginAuthors[i];
            const onClick = () => {
              if (DiscordAPI.currentUser.id === pluginAuthor.id) return;
              PrivateChannelActions.ensurePrivateChannel(DiscordAPI.currentUser.id, pluginAuthor.id).then(() => {
                PrivateChannelActions.openPrivateChannel(DiscordAPI.currentUser.id, pluginAuthor.id);
                LayerManager.popLayer();
              });
            };
            if (typeof author.props.children !== 'string') {
              if (!Array.isArray(author.props.children)) return;
              for (let ii = 0; ii < author.props.children.length; ii++) {
                const name = author.props.children[ii];
                if (typeof name !== 'string') continue;
                const idx = name.indexOf(pluginAuthor.name);
                if (idx === -1) continue;
                console.log(author.props.children, name, idx, pluginAuthor.name);
                const pre = name.slice(0, idx);
                const post = name.slice(idx + pluginAuthor.name.length);
                author.props.children.splice(idx, 1, pre, React.createElement('a', { className: LinkClassname, onClick }, pluginAuthor.name), post);
                break;
              }
            } else {
              if (author.props.children.indexOf(pluginAuthor.name) === -1) continue;
              const idx = author.props.children.indexOf(pluginAuthor.name);
              const pre = author.props.children.slice(0, idx);
              const post = author.props.children.slice(idx + pluginAuthor.name.length);
              author.props.children = [pre, React.createElement('a', { className: LinkClassname, onClick }, pluginAuthor.name), post];
            }
            if (Array.isArray(pluginAuthor.donations) && pluginAuthor.donations.length) donations.push({ name: pluginAuthor.name, donations: pluginAuthor.donations });
            if (pluginAuthor.supportServerId && pluginAuthor.supportServerInvite) support.push({ name: pluginAuthor.name, id: pluginAuthor.supportServerId, invite: pluginAuthor.supportServerInvite });
          }
          if (!footer) return;
          if (donations.length) {
            footer.push(
              ' | ',
              React.createElement(
                'a',
                {
                  className: 'bda-link',
                  onClick: e => {
                    ContextMenuActions.openContextMenu(e, e =>
                      React.createElement(
                        'div',
                        { className: DiscordClasses.ContextMenu.contextMenu },
                        XenoLib.createContextMenuGroup([
                          donations.map(authorDonations =>
                            XenoLib.createContextMenuSubMenu(
                              authorDonations.name,
                              authorDonations.donations.map(donation => XenoLib.createContextMenuItem(donation.name, () => ElectronShell.openExternal(donation.url)))
                            )
                          )
                        ])
                      )
                    );
                  }
                },
                'Donate'
              )
            );
          }
          if (support.length) {
            footer.push(
              ' | ',
              React.createElement(
                'a',
                {
                  className: 'bda-link',
                  onClick: () => {
                    LayerManager.popLayer();
                    if (GuildStore.getGuild(support[0].id)) GuildActions.transitionToGuildSync(support[0].id);
                    else InviteActions.openNativeAppModal(support[0].invite);
                  }
                },
                'Support Server'
              )
            );
          }
          if (_this.props.plugin.showChangelog || _this.props.plugin.getChanges) {
            footer.push(
              ' | ',
              React.createElement(
                'a',
                {
                  className: 'bda-link',
                  onClick: () => {
                    if (_this.props.plugin.showChangelog) _this.props.plugin.showChangelog();
                    else Modals.showChangelogModal(_this.props.plugin.getName() + ' Changelog', _this.props.plugin.getVersion(), _this.props.plugin.getChanges());
                  }
                },
                'Changelog'
              )
            );
          }
          return; */
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
          }
          if (footer) {
            footer.push(
              ' | ',
              React.createElement('a', { className: 'bda-link', href: 'https://paypal.me/lighty13', target: '_blank' }, 'Paypal'),
              ' | ',
              React.createElement('a', { className: 'bda-link', href: 'https://ko-fi.com/lighty_', target: '_blank' }, 'Ko-fi'),
              ' | ',
              React.createElement(
                'a',
                {
                  className: 'bda-link',
                  onClick: () => {
                    LayerManager.popLayer();
                    if (GuildStore.getGuild(XenoLib.supportServerId)) GuildActions.transitionToGuildSync(XenoLib.supportServerId);
                    else InviteActions.openNativeAppModal('NYvWdN5');
                  }
                },
                'Support Server'
              )
            );
            if (_this.props.plugin.showChangelog || _this.props.plugin.getChanges) {
              footer.push(
                ' | ',
                React.createElement(
                  'a',
                  {
                    className: 'bda-link',
                    onClick: () => {
                      if (_this.props.plugin.showChangelog) _this.props.plugin.showChangelog();
                      else Modals.showChangelogModal(_this.props.plugin.getName() + ' Changelog', _this.props.plugin.getVersion(), _this.props.plugin.getChanges());
                    }
                  },
                  'Changelog'
                )
              );
            }
          }
        };
        Patcher.after(V2C_PluginCard.prototype, 'render', handlePatch);
        Patcher.after(V2C_ThemeCard.prototype, 'render', handlePatch);
      }
    } catch (e) {}

    XenoLib.__contextPatches = [];
    XenoLib.__contextPatches.__contextPatched = false;
    const existingContextMenus = ['NativeContextMenu', 'GuildRoleContextMenu', 'MessageContextMenu', 'DeveloperContextMenu', 'ScreenshareContextMenu'];
    const ContextMenuClassname = XenoLib.getSingleClass('subMenuContext contextMenu');
    const getContextMenuChild = val => {
      if (!val) return;
      const isValid = obj => obj.type === 'div' && obj.props && typeof obj.props.className === 'string' && obj.props.className.indexOf(ContextMenuClassname) !== -1 && Array.isArray(Utilities.getNestedProp(obj, 'props.children.props.children'));
      if (isValid(val)) return val.props.children;
      const children = Utilities.getNestedProp(val, 'props.children');
      if (!children) return;
      if (Array.isArray(children)) {
        for (let i = 0; i < children.length; i++) {
          const ret = getContextMenuChild(children[i]);
          if (ret) return ret.props.children;
        }
      } else if (isValid(children)) return children.props.children;
    };
    function patchAllContextMenus() {
      const handleContextMenu = (_this, ret, noRender) => {
        const menuGroups = getContextMenuChild(ret) || ret;
        if (!menuGroups) return Logger.warn('Failed to get context menu groups!', _this, ret);
        let [value, set] = noRender ? React.useState(false) : [];
        let [state, setState] = noRender ? React.useState({}) : [];
        /* emulate a react component */
        if (noRender) {
          _this.forceUpdate = () => set(!value);
          _this.state = state;
          _this.setState = setState;
        }
        if (!_this.state) _this.state = {};
        XenoLib.__contextPatches.forEach(e => {
          try {
            e(_this, menuGroups);
          } catch (e) {
            Logger.stacktrace('Error with patched context menu', e);
          }
        });
      };
      existingContextMenus.forEach(type => {
        const module = WebpackModules.getByDisplayName(type);
        if (!module) return Logger.warn(`Failed to find ContextMenu type`, type);
        Patcher.after(module.prototype, 'render', (_this, _, ret) => handleContextMenu(_this, ret));
      });
      function getModule(regex) {
        const modules = WebpackModules.getAllModules();
        for (const index in modules) {
          if (!modules.hasOwnProperty(index)) continue;
          const module = modules[index];
          if (!module.exports || !module.exports.__esModule || !module.exports.default) continue;
          /* if BDFDB was inited before us, patch the already patched function */
          if (module.exports.default.toString().search(regex) !== -1 || (module.exports.default.isBDFDBpatched && module.exports.default.originalsource.toString().search(regex) !== -1)) return module;
        }
      }
      const somemoremenus = [getModule(/case \w.ContextMenuTypes.CHANNEL_LIST_TEXT/), getModule(/case \w.ContextMenuTypes.GUILD_CHANNEL_LIST/), getModule(/case \w.ContextMenuTypes.USER_CHANNEL_MEMBERS/)];
      somemoremenus.forEach(menu => {
        if (!menu) return Logger.warn('Special context menu is undefined!');
        const origDef = menu.exports.default;
        const originalFunc = Utilities.getNestedProp(menu, 'exports.BDFDBpatch.default.originalMethod') || menu.exports.default;
        Patcher.after(menu.exports, 'default', (_, [props], ret) => handleContextMenu({ props }, ret, true));
        /* make it friendly to other plugins and libraries that search by string
           note: removing this makes BDFDB shit itself
         */
        Patcher.instead(menu.exports.default, 'toString', (_, args, __) => originalFunc.toString(...args));
        /* if BDFDB already patched it, patch the function BDFDB is storing in case it decides to unaptch
           this is to prevent BDFDB from removing our patch
           this function is never called in BDFDB, it's only stored for restore
        */
        if (origDef.isBDFDBpatched && menu.exports.BDFDBpatch && typeof menu.exports.BDFDBpatch.default.originalMethod === 'function') {
          Patcher.after(menu.exports.BDFDBpatch.default, 'originalMethod', (_, [props], ret) => handleContextMenu({ props }, ret, true));
          /* make it friendly to other plugins and libraries that search by string
           note: removing this makes BDFDB shit itself
          */
          Patcher.instead(menu.exports.BDFDBpatch.default.originalMethod, 'toString', (_, args, __) => originalFunc.toString(...args));
        }
      });
      XenoLib.__contextPatches.__contextPatched = true;
    }
    XenoLib.patchContext = callback => {
      XenoLib.__contextPatches.push(callback);
    };
    class ContextMenuWrapper extends React.PureComponent {
      render() {
        return React.createElement('div', { className: DiscordClasses.ContextMenu.contextMenu }, this.props.menu);
      }
    }
    XenoLib.createSharedContext = (menuCreation, props, type) => {
      if (props.__XenoLib_ContextMenus) {
        props.__XenoLib_ContextMenus.push(menuCreation);
      } else {
        props.__XenoLib_ContextMenus = [menuCreation];
        const oOnContextMenu = props.onContextMenu;
        props.onContextMenu = e => (typeof oOnContextMenu === 'function' && oOnContextMenu(e), ContextMenuActions.openContextMenu(e, e => React.createElement(ContextMenuWrapper, { menu: props.__XenoLib_ContextMenus.map(m => m()), type })));
      }
    };

    if (global.XenoLib) if (global.XenoLib.__contextPatches && global.XenoLib.__contextPatches.length) XenoLib.__contextPatches.push(...global.XenoLib.__contextPatches);
    XenoLib.unpatchContext = callback => XenoLib.__contextPatches.splice(XenoLib.__contextPatches.indexOf(callback), 1);
    patchAllContextMenus(); /* prevent BDFDB from being a gay piece of crap by patching it first */
    XenoLib.createContextMenuItem = (label, action, options = {}) =>
      React.createElement(ContextMenuItem, {
        label,
        action: () => {
          if (!options.noClose) ContextMenuActions.closeContextMenu();
          action();
        },
        ...options
      });
    XenoLib.createContextMenuSubMenu = (label, items, options = {}) =>
      React.createElement(ContextMenuSubMenuItem, {
        label,
        render: items,
        ...options
      });
    XenoLib.createContextMenuGroup = (children, options) => React.createElement(ContextMenuItemsGroup, { children, ...options });
    XenoLib.DiscordUtils = WebpackModules.getByProps('bindAll', 'debounce');

    const dialog = require('electron').remote.dialog;
    const showSaveDialog = dialog.showSaveDialogSync || dialog.showSaveDialog;
    const showOpenDialog = dialog.showOpenDialogSync || dialog.showOpenDialog;
    XenoLib.ReactComponents = {};

    XenoLib.ReactComponents.ButtonOptions = WebpackModules.getByProps('ButtonLink');
    XenoLib.ReactComponents.Button = XenoLib.ReactComponents.ButtonOptions.default;

    const MultiInputClassname = XenoLib.joinClassNames(DiscordClasses.BasicInputs.input.value, XenoLib.getClass('multiInput'));
    const MultiInputFirstClassname = XenoLib.getClass('multiInputFirst');
    const MultiInputFieldClassname = XenoLib.getClass('multiInputField');
    const ErrorMessageClassname = XenoLib.getClass('input errorMessage');
    const ErrorClassname = XenoLib.getClass('input error');
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
     */
    XenoLib.ReactComponents.FilePicker = class FilePicker extends React.PureComponent {
      constructor(props) {
        super(props);
        this.state = {
          multiInputFocused: false,
          path: props.path,
          error: null
        };
        XenoLib.DiscordUtils.bindAll(this, ['handleOnBrowse', 'handleChange']);
        this.delayedCallVerifyPath = new DelayedCall(500, () =>
          FsModule.access(this.state.path, FsModule.constants.W_OK, error => {
            const invalid = (error && error.message.match(/.*: (.*), access '/)[1]) || null;
            this.setState({ error: invalid });
            if (invalid && this.props.nullOnInvalid) this.props.onChange(null);
          })
        );
      }
      handleOnBrowse() {
        const path = showOpenDialog({ title: this.props.title, properties: this.props.properties });
        if (Array.isArray(path) && path.length) this.handleChange(path[0]);
      }
      handleChange(path) {
        this.props.onChange(path);
        this.setState({ path });
        this.delayedCallVerifyPath.delay();
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

    const Icon = WebpackModules.getByDisplayName('Icon');

    class ColorPickerModal extends React.PureComponent {
      constructor(props) {
        super(props);
        this.state = { value: props.value };
        XenoLib.DiscordUtils.bindAll(this, ['handleChange']);
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
              React.createElement(WebpackModules.getByDisplayName('ColorPicker'), {
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

    class ColorPicker extends React.PureComponent {
      constructor(props) {
        super(props);
        this.state = {
          error: null,
          value: props.value,
          multiInputFocused: false
        };
        XenoLib.DiscordUtils.bindAll(this, ['handleChange', 'handleColorPicker', 'handleReset']);
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
        ModalStack.push(e => React.createElement(ColorPickerModal, { ...e, defaultColor: ColorConverter.hex2int(this.props.defaultColor), value: ColorConverter.hex2int(this.props.value), onChange: this.handleChange }));
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
                className: 'xenoLib-button button-34kXw5 button-3tQuzi'
              },
              React.createElement('span', { className: 'text-2sI5Sd' }, 'Color picker'),
              React.createElement(
                'span',
                {
                  className: 'xenoLib-button-icon'
                },
                React.createElement(Icon, {
                  name: 'Dropper'
                })
              )
            ),
            React.createElement(
              XenoLib.ReactComponents.Button,
              {
                onClick: this.handleReset,
                color: (!!this.state.error && XenoLib.ReactComponents.ButtonOptions.ButtonColors.RED) || XenoLib.ReactComponents.ButtonOptions.ButtonColors.GREY,
                look: XenoLib.ReactComponents.ButtonOptions.ButtonLooks.GHOST,
                size: XenoLib.ReactComponents.Button.Sizes.MIN,
                className: 'xenoLib-button button-34kXw5 button-3tQuzi'
              },
              React.createElement('span', { className: 'text-2sI5Sd' }, 'Reset'),
              React.createElement(
                'span',
                {
                  className: 'xenoLib-button-icon xenoLib-revert'
                },
                React.createElement(Icon, {
                  name: 'ClockReverse'
                })
              )
            )
          ),
          !!this.state.error && React.createElement('div', { className: ErrorMessageClassname }, 'Error: ', this.state.error)
        );
      }
    }
    XenoLib.Settings = {};
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

    XenoLib.changeName = (currentName, newName) => {
      const path = require('path');
      const fs = require('fs');
      const pluginsFolder = path.dirname(currentName);
      const pluginName = path.basename(currentName).match(/^[^\.]+/)[0];
      if (pluginName === newName) return true;
      const wasEnabled = global.pluginCookie && pluginCookie[pluginName];
      try {
        fs.accessSync(currentName, fs.constants.W_OK | fs.constants.R_OK);
        const files = fs.readdirSync(pluginsFolder);
        files.forEach(file => {
          if (!file.startsWith(pluginName) || file.startsWith(newName) || file.indexOf('.plugin.js') !== -1) return;
          fs.renameSync(path.resolve(pluginsFolder, file), path.resolve(pluginsFolder, `${newName}${file.match(new RegExp(`^${pluginName}(.*)`))[1]}`));
        });
        fs.renameSync(currentName, path.resolve(pluginsFolder, `${newName}.plugin.js`));
        Toasts.success(`[XenoLib] ${pluginName} file has been renamed to ${newName}`);
        if (!global.pluginCookie || !global.pluginModule) Modals.showAlertModal('Plugin has been renamed', 'Plugin has been renamed, but your client mod has a missing feature, as such, the plugin could not be enabled (if it even was enabled).');
        else {
          if (!wasEnabled) return;
          const onLoaded = e => {
            if (e !== newName) return;
            BDEvents.off('plugin-loaded', onLoaded);
            pluginModule.enablePlugin(newName);
          };
          BDEvents.on('plugin-loaded', onLoaded);
        }
      } catch (e) {
        Logger.stacktrace('There has been an issue renaming a plugin', e);
      }
    };

    /* NOTIFICATIONS START */
    try {
      const zustand = WebpackModules.getByString('console.warn("Zustand: the 2nd arg');
      const [useStore, api] = zustand(e => ({ data: [] }));
      const defaultOptions = {
        loading: false,
        progress: -1,
        channelId: undefined,
        timeout: 1000,
        color: '#2196f3'
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
        danger(content, options = { n }) {
          return this.show(content, Object.assign({ color: '#f04747' }, options));
        },
        error(content, options = {}) {
          return this.danger(content, options);
        },
        /**
         * @param {string|*} content - Content to display. If it's a string, it'll be formatted with markdown, including URL support [like this](https://google.com/)
         * @param {object} options
         * @param {string} [options.channelId] Channel ID if content is a string which gets formatted, and you want to mention a role for example.
         * @param {Number} [options.timeout] Set to 0 to keep it permanently until user closes it, or if you want a progress bar
         * @param {Boolean} [options.loading] Makes the bar animate differently instead of fading in and out slowly
         * @param {Number} [options.progress] 0-100, -1 sets it to 100%, setting it to 100% closes the notification automatically
         * @param {string} [options.color] Bar color
         * @param {string} [options.allowDuplicates] By default, notifications that are similar get grouped together, use true to disable that
         * @return {Number} - Notification ID. Store this if you plan on force closing it, changing its content or want to set the progress
         */
        show(content, options = {}) {
          let id = null;
          api.setState(state => {
            if (!options.allowDuplicates) {
              const notif = state.data.find(n => n.content === content && n.timeout === options.timeout);
              if (notif) {
                id = notif.id;
                Dispatcher.dispatch({ type: 'XL_NOTIFS_DUPLICATE', id: notif.id });
                return state;
              }
            }
            if (state.data.length >= 100) return state;
            do {
              id = Math.floor(4294967296 * Math.random());
            } while (state.data.findIndex(n => n.id === id) !== -1);
            return { data: [].concat(state.data, [{ content, ...Object.assign(Utilities.deepclone(defaultOptions), options), id }]) };
          });
          return id;
        },
        remove(id) {
          Dispatcher.dispatch({ type: 'XL_NOTIFS_REMOVE', id });
        },
        /**
         * @param {Number} id Notification ID
         * @param {object} options
         * @param {string} [options.channelId] Channel ID if content is a string which gets formatted, and you want to mention a role for example.
         * @param {Boolean} [options.loading] Makes the bar animate differently instead of fading in and out slowly
         * @param {Number} [options.progress] 0-100, -1 sets it to 100%, setting it to 100% closes the notification automatically
         * @param {string} [options.color] Bar color
         */
        update(id, options) {
          delete options.id;
          api.setState(state => {
            const idx = state.data.findIndex(n => n.id === id);
            if (idx === -1) return state;
            state.data[idx] = Object.assign(state.data[idx], options);
            return state;
          });
          Dispatcher.dispatch({ type: 'XL_NOTIFS_UPDATE', id, ...options });
        }
      };
      XenoLib.Notifications = utils;
      XenoLib.Notifications.__api = api;
      XenoLib.Notifications.__api._DO_NOT_USE_THIS_IN_YOUR_PLUGIN_OR_YOU_WILL_CRY = 'Because it may be removed at any point in the future';
      const ReactSpring = WebpackModules.getByProps('useTransition');
      const BadgesModule = WebpackModules.getByProps('NumberBadge');
      const ParsersModule = WebpackModules.getByProps('parseAllowLinks', 'parse');
      const CloseButton = WebpackModules.getByProps('CloseButton').CloseButton;
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
          this._ref;
          this._animationCancel = () => {};
          this._oldOffsetHeight = 0;
          this._initialProgress = !this.props.timeout ? (this.state.loading && this.state.progress !== -1 ? this.state.progress : 100) : 0;
          XenoLib.DiscordUtils.bindAll(this, ['closeNow', 'handleResizeEvent', 'handleDispatch']);
        }
        componentDidMount() {
          this._unsubscribe = api.subscribe(_ => this.checkOffScreen());
          window.addEventListener('resize', this.handleResizeEvent);
          Dispatcher.subscribe('XL_NOTIFS_DUPLICATE', this.handleDispatch);
          Dispatcher.subscribe('XL_NOTIFS_REMOVE', this.handleDispatch);
          Dispatcher.subscribe('XL_NOTIFS_UPDATE', this.handleDispatch);
          Dispatcher.subscribe('XL_NOTIFS_ANIMATED', this.handleDispatch);
        }
        componentWillUnmount() {
          this._unsubscribe();
          window.window.removeEventListener('resize', this.handleResizeEvent);
          Dispatcher.unsubscribe('XL_NOTIFS_DUPLICATE', this.handleDispatch);
          Dispatcher.unsubscribe('XL_NOTIFS_REMOVE', this.handleDispatch);
          Dispatcher.unsubscribe('XL_NOTIFS_UPDATE', this.handleDispatch);
          Dispatcher.unsubscribe('XL_NOTIFS_ANIMATED', this.handleDispatch);
        }
        handleDispatch(e) {
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
          return typeof content === 'string' ? ParsersModule.parseAllowLinks(content, true, { channelId }) : content;
        }
        checkOffScreen() {
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
          this._animationCancel();
          this.setState({ closeFast: true });
        }
        handleResizeEvent() {
          if (this._oldOffsetHeight !== this._contentRef.offsetHeight) {
            this._animationCancel();
            this.forceUpdate();
          }
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
                if (isSettingHeight) Dispatcher.dispatch({ type: 'XL_NOTIFS_ANIMATED' });
                if (this.state.resetBar || this.state.hovered) {
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
                  if (this.state.progress !== 100 || !this.state.loading) return;
                }
                if (this.state.hovered && !this.state.closeFast) return;
                await next({ progress: 100 });
                this.state.leaving = true;
                await next({ opacity: 0, height: 0 });
                api.setState(state => ({ data: state.data.filter(n => n.id !== this.props.id) }));
              },
              config: key => {
                if (key === 'progress') {
                  let duration = this.props.timeout;
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
                    ref: e => e && (this._contentRef = e),
                    onMouseEnter: e => {
                      if (this.state.leaving || !this.props.timeout || this.state.closeFast) return;
                      this._animationCancel();
                      this.setState({ hovered: true });
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
                      className: 'xenoLib-notification-content'
                    },
                    React.createElement(ReactSpring.animated.div, {
                      className: XenoLib.joinClassNames('xenoLib-notification-loadbar', { 'xenoLib-notification-loadbar-striped': !this.props.timeout && this.state.loading, 'xenoLib-notification-loadbar-user': !this.props.timeout && !this.state.loading }),
                      style: { right: e.progress.to(e => 100 - e + '%'), filter: e.loadbrightness.to(e => `brightness(${e * 100}%)`) }
                    }),
                    React.createElement(CloseButton, {
                      onClick: e => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.closeNow();
                      },
                      onContextMenu: e => {
                        ContextMenuActions.openContextMenu(e, e =>
                          React.createElement(
                            'div',
                            { className: DiscordClasses.ContextMenu.contextMenu },
                            XenoLib.createContextMenuGroup([
                              XenoLib.createContextMenuItem('Close All', () => {
                                const state = api.getState();
                                state.data.forEach(notif => utils.remove(notif.id));
                              })
                            ])
                          )
                        );
                      },
                      className: 'xenoLib-notification-close'
                    }),
                    this.state.counter > 1 && BadgesModule.NumberBadge({ count: this.state.counter, className: 'xenLib-notification-counter', color: '#2196f3' }),
                    this.state.contentParsed
                    /* React.createElement('a', { onClick: this.closeNow }, 'close') */
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
        return notifications.map(item => React.createElement(Notification, { ...item, key: item.id })).reverse();
      }
      NotificationsWrapper.displayName = 'XenoLibNotifications';
      const DOMElement = document.createElement('div');
      DOMElement.className = XenoLib.joinClassNames('xenoLib-notifications', `xenoLib-centering-${LibrarySettings.notifications.position}`);
      ReactDOM.render(React.createElement(NotificationsWrapper, {}), DOMElement);
      document.querySelector('#app-mount').appendChild(DOMElement);
    } catch (e) {
      Logger.stacktrace('There has been an error loading the Notifications system', e);
    }
    /* NOTIFICATIONS END */

    global.XenoLib = XenoLib;
    const listener = e => {
      if (e !== 'XenoLib') return;
      XenoLib.shutdown();
      BDEvents.off('plugin-unloaded', listener);
    };
    if (global.BDEvents) {
      BDEvents.dispatch('xenolib-loaded');
      BDEvents.on('plugin-unloaded', listener);
    }

    XenoLib.changeName(__filename, '1XenoLib'); /* prevent user from changing libs filename */

    const notifLocations = ['topLeft', 'topMiddle', 'topRight', 'bottomLeft', 'bottomMiddle', 'bottomRight'];
    const notifLocationClasses = ['topLeft-3buHIc option-n0icdO', 'topMiddle-xenoLib option-n0icdO', 'topRight-3GKDeL option-n0icdO', 'bottomLeft-39-xss option-n0icdO', 'bottomMiddle-xenoLib option-n0icdO', 'bottomRight-1T56wW option-n0icdO'];
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
      }
      buildSetting(data) {
        if (data.type === 'position') {
          const setting = new NotificationPositionField(data.name, data.note, data.onChange, data.value);
          if (data.id) setting.id = data.id;
          return setting;
        }
        return super.buildSetting(data);
      }
      getSettingsPanel() {
        return this.buildSettingsPanel().getElement();
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
              Dispatcher.dispatch({ type: 'XL_NOTIFS_ANIMATED' });
            }
          }
        }
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

  return !global.ZeresPluginLibrary
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
          const header = `Missing Library`;
          const content = `The Library ZeresPluginLibrary required for ${this.name} is missing.`;
          const ModalStack = BdApi.findModuleByProps('push', 'update', 'pop', 'popWithKey');
          const TextElement = BdApi.findModuleByProps('Sizes', 'Weights');
          const ConfirmationModal = BdApi.findModule(m => m.defaultProps && m.key && m.key() === 'confirm-modal');
          const onFail = () => BdApi.getCore().alert(header, `${content}<br/>Due to a slight mishap however, you'll have to download the library yourself. After opening the link, do CTRL + S to download the library.<br/><br/><a href="https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js"target="_blank">Click here to download ZeresPluginLibrary</a>`);
          if (!ModalStack || !ConfirmationModal || !TextElement) return onFail();
          ModalStack.push(props => {
            return BdApi.React.createElement(
              ConfirmationModal,
              Object.assign(
                {
                  header,
                  children: [
                    TextElement({
                      color: TextElement.Colors.PRIMARY,
                      children: [`${content} Please click Download Now to install it.`]
                    })
                  ],
                  red: false,
                  confirmText: 'Download Now',
                  cancelText: 'Cancel',
                  onConfirm: () => {
                    const request = require('request');
                    const fs = require('fs');
                    const path = require('path');
                    const onDone = () => {
                      if (!global.pluginModule || !global.BDEvents) return;
                      const onLoaded = e => {
                        if (e !== 'ZeresPluginLibrary') return;
                        BDEvents.off('plugin-loaded', onLoaded);
                        pluginModule.reloadPlugin(this.name);
                      };
                      BDEvents.on('plugin-loaded', onLoaded);
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
            );
          });
        }

        start() {}

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
