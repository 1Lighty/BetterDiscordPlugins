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
 * CopyrightÂ© 2019-2020, _Lighty_
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
      version: '1.2.3',
      description: 'Simple library to complement plugins with shared code without lowering performance.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/1XenoLib.plugin.js'
    },
    changelog: [
      {
        title: 'Hopefully fixed',
        type: 'fixed',
        items: ['Fixed BDFDB causing issues with patching context menus']
      }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { ContextMenu, EmulatedTooltip, Toasts, Settings, Popouts, Modals, Utilities, WebpackModules, Filters, DiscordModules, ColorConverter, DOMTools, DiscordClasses, DiscordSelectors, ReactTools, ReactComponents, DiscordAPI, Logger, Patcher, PluginUpdater, PluginUtilities, DiscordClassModules, Structs } = Api;
    const { React, ModalStack, ContextMenuActions, ContextMenuItem, ContextMenuItemsGroup, ReactDOM, ChannelStore, GuildStore, UserStore, DiscordConstants, Dispatcher, GuildMemberStore, GuildActions, PrivateChannelActions, LayerManager, InviteActions } = DiscordModules;

    const ContextMenuSubMenuItem = WebpackModules.getByDisplayName('FluxContainer(SubMenuItem)');

    if (global.XenoLib) global.XenoLib.shutdown();
    const XenoLib = {};
    XenoLib.shutdown = () => {
      Patcher.unpatchAll();
      PluginUtilities.removeStyle('XenoLib-CSS');
      if (global.BDEvents) BDEvents.off('plugin-unloaded', listener);
    };

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
      if (V2C_PluginCard && V2C_ThemeCard) {
        const LinkClassname = XenoLib.joinClassNames(XenoLib.getClass('anchorUnderlineOnHover anchor'), XenoLib.getClass('anchor anchorUnderlineOnHover'), 'bda-author');
        const handlePatch = (_this, _, ret) => {
          const author = Utilities.getNestedProp(ret, 'props.children.0.props.children.0.props.children.4');
          const footer = Utilities.getNestedProp(ret, 'props.children.2.props.children.0.props.children');
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
      const handleContextMenu = (_this, ret) => {
        const menuGroups = getContextMenuChild(ret) || ret;
        if (!menuGroups) return Logger.warn('Failed to get context menu groups!', _this, ret);
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
        Patcher.after(menu.exports, 'default', (_, [props], ret) => handleContextMenu({ props }, ret));
        /* make it friendly to other plugins and libraries that search by string
           note: removing this makes BDFDB shit itself
         */
        Patcher.instead(menu.exports.default, 'toString', (_, args, __) => originalFunc.toString(...args));
        /* if BDFDB already patched it, patch the function BDFDB is storing in case it decides to unaptch
           this is to prevent BDFDB from removing our patch
           this function is never called in BDFDB, it's only stored for restore
        */
        if (origDef.isBDFDBpatched && menu.exports.BDFDBpatch && typeof menu.exports.BDFDBpatch.default.originalMethod === 'function') {
          Patcher.after(menu.exports.BDFDBpatch.default, 'originalMethod', (_, [props], ret) => handleContextMenu({ props }, ret));
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
          ContextMenuActions.closeContextMenu();
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

    XenoLib.loadData = (name, key, defaultData) => {
      try {
        return Object.assign(defaultData ? Utilities.deepclone(defaultData) : {}, BdApi.getData(name, key));
      } catch (err) {
        Logger.err(name, 'Unable to load data: ', err);
        return Utilities.deepclone(defaultData);
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
            pluginModule.startPlugin(newName);
          };
          BDEvents.on('plugin-loaded', onLoaded);
        }
      } catch (e) {
        Logger.stacktrace('There has been an issue renaming a plugin', e);
      }
    };

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

    return class XenoLib extends Plugin {
      onStart() {
        Toasts.info('Starting me does nothing :)');
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
