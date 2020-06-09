//META{"name":"SaveToRedux","source":"https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/SaveToRedux/SaveToRedux.plugin.js","website":"https://1lighty.github.io/BetterDiscordStuff/?plugin=SaveToRedux","authorId":"239513071272329217","invite":"NYvWdN5","donate":"https://paypal.me/lighty13"}*//
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
var SaveToRedux = (() => {
  /* Setup */
  const config = {
    main: 'index.js',
    info: {
      name: 'SaveToRedux',
      authors: [
        {
          name: 'Lighty',
          discord_id: '239513071272329217',
          github_username: 'LightyPon',
          twitter_username: ''
        }
      ],
      version: '2.1.3',
      description: 'Allows you to save images, videos, profile icons, server icons, reactions, emotes and custom status emotes to any folder quickly, as well as install plugins from direct links.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/SaveToRedux/SaveToRedux.plugin.js'
    },
    changelog: [
      {
        title: 'fixed',
        type: 'fixed',
        items: ['Fixed startup error on canary']
      }
    ],
    defaultConfig: [
      {
        type: 'category',
        id: 'saveOptions',
        name: 'File save settings',
        collapsible: true,
        shown: false,
        settings: [
          {
            name: 'Filename preview',
            type: 'preview'
          },
          {
            name: 'File name save',
            id: 'fileNameType',
            type: 'dropdown',
            value: 0,
            options: [
              { label: 'Original', value: 0 },
              { label: 'Date', value: 1 },
              { label: 'Random', value: 2 },
              { label: 'Original + random', value: 3 },
              { label: 'Custom', value: 4 }
            ]
          },
          { name: 'Custom file name save', note: 'Available options: file rand date time day month year hours minutes seconds name. options must be wrapped in ${<OPTION>}!', id: 'customFileName', type: 'textbox', value: '${file}_${date}_${time}' },
          { name: 'Random string length', id: 'randLength', type: 'textbox', value: 7 },
          {
            name: 'Conflicting filename mode',
            id: 'conflictingFilesHandle',
            type: 'radio',
            value: 0,
            options: [
              { name: 'Warn', value: 0 },
              { name: 'Overwrite', value: 1 },
              { name: 'Append number: (1)', value: 2 },
              { name: 'Append random', value: 3 },
              { name: 'Save as...', value: 4 }
            ]
          },
          { name: 'User and Server icons get saved by the users or servers name, instead of randomized', id: 'saveByName', type: 'switch', value: true },
          { name: 'Append server name or DM name to image/file name', id: 'appendCurrentName', type: 'switch', value: false }
        ]
      },
      { type: 'category', id: 'misc', name: 'Misc', collapsible: true, shown: false, settings: [{ name: 'Context menu option at the bottom instead of top', id: 'contextMenuOnBottom', type: 'switch', value: true }] }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { Settings, Modals, Utilities, WebpackModules, DiscordModules, DiscordClasses, ReactComponents, DiscordAPI, Logger, PluginUpdater, PluginUtilities, ReactTools } = Api;
    const { React, ContextMenuActions, GuildStore, DiscordConstants, Dispatcher, SwitchRow, EmojiUtils, EmojiStore, RadioGroup, EmojiInfo, ModalStack } = DiscordModules;
    const Patcher = XenoLib.createSmartPatcher(Api.Patcher);

    const TextComponent = WebpackModules.getByDisplayName('Text');
    const getEmojiURL = Utilities.getNestedProp(WebpackModules.getByProps('getEmojiURL'), 'getEmojiURL');
    const showAlertModal = Utilities.getNestedProp(
      WebpackModules.find(m => m.show && m.show.toString().search(/\w\.minorText,\w=\w\.onConfirmSecondary/)),
      'show'
    );

    const dialog = Utilities.getNestedProp(require('electron'), 'remote.dialog');
    const openPath = Utilities.getNestedProp(require('electron'), 'shell.openPath') || Utilities.getNestedProp(require('electron'), 'shell.openItem');
    const DelayedCall = Utilities.getNestedProp(WebpackModules.getByProps('DelayedCall'), 'DelayedCall');
    const FsModule = require('fs');
    const RequestModule = require('request');
    const PathModule = require('path');
    const MimeTypesModule = require('mime-types');
    const FormItem = WebpackModules.getByDisplayName('FormItem');
    const Messages = Utilities.getNestedProp(WebpackModules.getByProps('Messages'), 'Messages');
    const TextInput = WebpackModules.getByDisplayName('TextInput');
    const AvatarModule = WebpackModules.getByProps('getChannelIconURL');
    const MessageShit = WebpackModules.find(m => m.default && m.getMessage);
    const TrustStore = WebpackModules.getByProps('isTrustedDomain');

    const isTrustedDomain = url => {
      for (const domain of isTrustedDomain.domains) if (url.search(domain) !== -1) return true;
      return TrustStore.isTrustedDomain(url);
    };
    isTrustedDomain.domains = [/\/\/steamuserimages-\w\.akamaihd\.net\//, /\/\/steamcdn-\w\.akamaihd\.net\//, /\/\/steamcommunity-\w\.akamaihd\.net\//, '//cdn.discordapp.com/', '//media.discordapp.net/', /\/\/images-ext-\d\.discordapp\.net\//, '//i.ytimg.com/', /\/\/static\d\.e621\.net\//, /\/\/static\d\.e926\.net\//, '//pbs.twimg.com/', '//preview.redd.it/', '//cdn.shopify.com/', '//discordapp.com/', '//i.imgur.com/', '//i.clouds.tf/', '//image.prntscr.com/', '//i.giphy.com/', '//media.tenor.co/'];

    const MessageStrings = {
      UNTRUSTED_LINK: (() => {
        try {
          return MessageShit.getMessage("If you see this, SaveToRedux has failed to get a safe proxied version of the image URL **!!{url}!!**. If you do not recognize the domain, it's best you don't download from it as it could potentially be an IP logger.\n\nAre you sure you want to download an image from this domain?", 'en-US');
        } catch (e) {
          Logger.stacktrace('Failed to create message', e);
          return null;
        }
      })()
    };

    class FolderEditor extends React.Component {
      constructor(props) {
        super(props);
        this.state = {
          name: props.name,
          path: props.path
        };
        XenoLib.DiscordUtils.bindAll(this, ['handleNameChange', 'handlePathChange']);
      }
      handleNameChange(name) {
        this.setState({ name });
        this.props.onNameChange(name);
      }
      handlePathChange(path) {
        this.setState({ path });
        this.props.onPathChange(path);
      }
      render() {
        return [
          React.createElement(
            FormItem,
            {
              className: DiscordClasses.Margins.marginBottom20.value,
              title: Messages.GUILD_FOLDER_NAME
            },
            React.createElement(TextInput, {
              maxLength: DiscordConstants.MAX_GUILD_FOLDER_NAME_LENGTH * 4,
              value: this.state.name,
              onChange: this.handleNameChange,
              placeholder: Messages.SERVER_FOLDER_PLACEHOLDER,
              autoFocus: true
            })
          ),
          React.createElement(
            FormItem,
            {
              className: DiscordClasses.Margins.marginBottom20,
              title: 'Folder path'
            },
            React.createElement(XenoLib.ReactComponents.FilePicker, {
              path: this.state.path,
              placeholder: 'Path to folder',
              onChange: this.handlePathChange,
              properties: ['openDirectory', 'createDirectory'],
              nullOnInvalid: true
            })
          )
        ];
      }
    }

    class Preview extends React.Component {
      constructor(props) {
        super(props);
        this.state = {
          date: new Date(),
          rand: props.rand
        };
        this.handleSettingsUpdate = this.handleSettingsUpdate.bind(this);
      }
      componentDidMount() {
        Dispatcher.subscribe('ST_SETTINGS_UPDATE', this.handleSettingsUpdate);
      }
      componentWillUnmount() {
        Dispatcher.unsubscribe('ST_SETTINGS_UPDATE', this.handleSettingsUpdate);
      }

      handleSettingsUpdate(e) {
        if (typeof e.rand !== 'undefined') this.setState({ rand: e.rand });
        else this.forceUpdate();
      }
      render() {
        return React.createElement(TextComponent, {}, this.props.formatFilename('unknown', this.state.date, this.state.rand), '.png');
      }
    }

    class PreviewField extends Settings.SettingField {
      constructor(name, note, data, onChange) {
        super(name, note, onChange, Preview, data);
      }
    }

    /*
     * I DO NOT OWN THESE TWO
     */
    function sanitizeFileName(r, e) {
      // https://github.com/parshap/node-sanitize-filename
      function n(r, n) {
        function o(r, e, n) {
          // https://github.com/parshap/truncate-utf8-bytes
          function t(r) {
            return r >= 55296 && 56319 >= r;
          }
          function u(r) {
            return r >= 56320 && 57343 >= r;
          }
          if ('string' != typeof e) throw new Error('Input must be string');
          for (var i, f, c = e.length, o = 0, l = 0; c > l; l += 1) {
            if (((i = e.charCodeAt(l)), (f = e[l]), t(i) && u(e.charCodeAt(l + 1)) && ((l += 1), (f += e[l])), (o += r(f)), o === n)) return e.slice(0, l + 1);
            if (o > n) return e.slice(0, l - f.length + 1);
          }
          return e;
        }
        if ('string' != typeof r) throw new Error('Input must be string');
        var l = Buffer.byteLength.bind(Buffer),
          a = o.bind(null, l),
          p = r.replace(t, n).replace(u, n).replace(i, n).replace(f, n).replace(c, n);
        return a(p, e.extLength);
      }
      var t = /[\/\?<>\\:\*\|"]/g,
        u = /[\x00-\x1f\x80-\x9f]/g,
        i = /^\.+$/,
        f = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i,
        c = /[\. ]+$/,
        o = (e && e.replacement) || '',
        l = n(r, o);
      return '' === o ? l : n(l, '');
    }

    /*

    class ContextMenuItem extends (() => {
      if (DiscordModules.ContextMenuItem) return DiscordModules.ContextMenuItem;

      return class fuck{};
    }) */

    const faultyVars = [];
    {
      const vars = { TextComponent, getEmojiURL, openPath, DelayedCall, FormItem, Messages, TextInput, AvatarModule, TrustStore };
      for (const varName in vars) {
        if (!vars[varName]) faultyVars.push(varName);
      }
    }

    const isImage = e => /\.{0,1}(png|jpe?g|webp|gif|svg)$/i.test(e);
    const isVideo = e => /\.{0,1}(mp4|webm|mov)$/i.test(e);
    const isAudio = e => /\.{0,1}(mp3|ogg|wav|flac|m4a)$/i.test(e);

    const useIdealExtensions = url => (url.indexOf('/a_') !== -1 ? url.replace('.webp', '.gif').replace('.png', '.gif') : url.replace('.webp', '.png'));

    return class SaveToRedux extends Plugin {
      constructor() {
        super();
        XenoLib.DiscordUtils.bindAll(this, ['formatFilename']);
        XenoLib.changeName(__filename, 'SaveToRedux');
        const oOnStart = this.onStart.bind(this);
        this.onStart = () => {
          try {
            oOnStart();
          } catch (e) {
            Logger.stacktrace('Failed to start!', e);
            PluginUpdater.checkForUpdate(this.name, this.version, this._config.info.github_raw);
            XenoLib.Notifications.error(`[**${this.name}**] Failed to start! Please update it, press CTRL + R, or ${GuildStore.getGuild(XenoLib.supportServerId) ? 'go to <#639665366380838924>' : '[join my support server](https://discord.gg/NYvWdN5)'} for further assistance.`, { timeout: 0 });
            try {
              this.onStop();
            } catch (e) {}
          }
        };
        try {
          ModalStack.popWithKey(`${this.name}_DEP_MODAL`);
        } catch (e) {}
      }
      onStart() {
        this.promises = { state: { cancelled: false } };
        if (faultyVars.length) {
          Logger.error(`Following vars are invalid: ${faultyVars.map(e => '\n' + e).reduce((e, b) => e + b, '')}`);
          PluginUpdater.checkForUpdate(this.name, this.version, this._config.info.github_raw);
          return XenoLib.Notifications.error(`[**${this.name}**] Plugin is in a broken state. Please update it, press CTRL + R or ${GuildStore.getGuild(XenoLib.supportServerId) ? 'go to <#639665366380838924>' : '[join my support server](https://discord.gg/NYvWdN5)'} for further assistance.`, { timeout: 0 });
        }
        this.folders = XenoLib.loadData(this.name, 'folders', { data: [] }).data;
        this.channelMessages = WebpackModules.find(m => m._channelMessages)._channelMessages;
        this.patchAll();
        PluginUtilities.addStyle(
          this.short + '-CSS',
          `
        .ST-modal {
            min-height: 320px;
        }
        .ST-randomize {
          justify-content: unset;
        }
        .ST-randomize > .${XenoLib.getSingleClass('lookBlank contents')} {
          margin: 0;
        }
        #user-context-str + .${XenoLib.getSingleClass('layerContainer layer')} {
          z-index: 1;
        }
        `
        );
        this.lastUsedFolder = -1;
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
        if (data.type === 'preview') {
          return new PreviewField(data.name, data.note, {
            rand: this.rand(),
            formatFilename: this.formatFilename
          });
        }
        return super.buildSetting(data);
      }

      saveSettings(_, setting, value) {
        super.saveSettings(_, setting, value);
        Dispatcher.dispatch({ type: 'ST_SETTINGS_UPDATE', rand: setting === 'randLength' ? this.rand() : undefined });
      }

      saveFolders() {
        PluginUtilities.saveData(this.name, 'folders', { data: this.folders });
      }

      /* PATCHES */

      patchAll() {
        Utilities.suppressErrors(this.patchEmojiPicker.bind(this), 'EmojiPicker patch')(this.promises.state);
        Utilities.suppressErrors(this.patchReactions.bind(this), 'Reaction patch')(this.promises.state);
        this.patchContextMenus();
      }

      patchEmojiPicker() {
        return;
        const EmojiPickerListRow = WebpackModules.getModule(m => m.default && m.default.displayName == 'EmojiPickerListRow');
        Patcher.after(EmojiPickerListRow, 'default', (_, __, returnValue) => {
          for (const emoji of returnValue.props.children) {
            const emojiObj = emoji.props.children.props.emoji;
            const url = emojiObj.id ? getEmojiURL({ id: emojiObj.id, animated: emojiObj.animated }) : 'https://discord.com' + EmojiInfo.getURL(emojiObj.surrogates);
            const oOnContextMenu = emoji.props.onContextMenu;
            emoji.props.onContextMenu = e => {
              if (oOnContextMenu) {
                let timeout = 0;
                const unpatch = Patcher.before(ContextMenuActions, 'openContextMenu', (_, args) => {
                  const old = args[1];
                  args[1] = e => {
                    try {
                      const _ret = old(e);
                      const ret = _ret.type(_ret.props);
                      const children = Utilities.getNestedProp(ret, 'props.children.0.props.children');
                      if (Array.isArray(children)) children.push(this.constructMenu(url.split('?')[0], 'Emoji', emojiObj.uniqueName));
                      return ret;
                    } catch (err) {
                      Logger.error('Some error happened in emoji picker context menu', err);
                      return null;
                    }
                  };
                  unpatch();
                  clearTimeout(timeout);
                });
                timeout = setTimeout(unpatch, 1000);
                return oOnContextMenu(e);
              } else {
                ContextMenuActions.openContextMenu(e, _ => React.createElement('div', { className: DiscordClasses.ContextMenu.contextMenu }, XenoLib.createContextMenuGroup([this.constructMenu(url.split('?')[0], 'Emoji', emojiObj.uniqueName)])));
              }
            };
          }
        });
      }

      async patchReactions(promiseState) {
        const Reaction = await ReactComponents.getComponentByName('Reaction', `.${XenoLib.getSingleClass('reactionMe reactions')} > div:not(.${XenoLib.getSingleClass('reactionMe reactionBtn')})`);
        if (promiseState.cancelled) return;
        const unpatch = Patcher.after(Reaction.component.prototype, 'render', (_this, _, ret) => {
          const oChildren = ret.props.children;
          ret.props.children = e => {
            try {
              const oChRet = oChildren(e);
              const url = _this.props.emoji.id ? getEmojiURL({ id: _this.props.emoji.id, animated: _this.props.emoji.animated }) : 'https://discord.com' + EmojiInfo.getURL(_this.props.emoji.name);
              XenoLib.createSharedContext(oChRet, () => XenoLib.createContextMenuGroup([this.constructMenu(url.split('?')[0], 'Reaction', _this.props.emoji.name)]));
              return oChRet;
            } catch (e) {
              Logger.stacktrace('Error in Reaction patch', e);
              unpatch(); // for the better..
              return null;
            }
          };
        });
        Reaction.forceUpdateAll();
      }

      patchContextMenus() {
        this.patchUserContextMenus();
        this.patchImageContextMenus();
        this.patchGuildContextMenu();
      }

      patchUserContextMenus() {
        const CTXs = WebpackModules.findAll(m => m.default && m.default.displayName && (m.default.displayName.endsWith('UserContextMenu') || m.default.displayName === 'GroupDMContextMenu'));
        for (const CTX of CTXs) {
          Patcher.after(CTX, 'default', (_, [props], ret) => {
            const menu = Utilities.getNestedProp(
              Utilities.findInReactTree(ret, e => e && e.type && e.type.displayName === 'Menu'),
              'props.children'
            );
            if (!Array.isArray(menu)) return;
            let saveType;
            let url;
            let customName;
            if (props.user && props.user.getAvatarURL) {
              saveType = 'Avatar';
              url = props.user.getAvatarURL();
              if (this.settings.saveOptions.saveByName) customName = props.user.username;
            } else if (props.channel && props.channel.type === 3 /* group DM */) {
              url = AvatarModule.getChannelIconURL(props.channel);
              saveType = 'Icon';
            } else return Logger.warn('Uknonwn context menu') /* hurr durr? */;
            if (!url.indexOf('/assets/')) url = 'https://discordapp.com' + url;
            url = useIdealExtensions(url);
            try {
              const submenu = this.constructMenu(url.split('?')[0], saveType, customName);
              const group = XenoLib.createContextMenuGroup([submenu]);
              if (this.settings.misc.contextMenuOnBottom) menu.push(group);
              else menu.unshift(group);
            } catch (e) {
              Logger.warn('Failed to parse URL...', url, e);
            }
          });
        }
      }

      patchImageContextMenus() {
        const patchHandler = (props, ret, isImageMenu) => {
          const menu = Utilities.getNestedProp(
            Utilities.findInReactTree(ret, e => e && e.type && e.type.displayName === 'Menu'),
            'props.children'
          );
          if (!Array.isArray(menu)) return;
          const [state, setState] = React.useState({});
          let src;
          let saveType = 'File';
          let url = '';
          let proxiedUrl = '';
          let customName = '';
          if (isImageMenu && (Utilities.getNestedProp(props, 'target.parentNode.className') || '').indexOf(XenoLib.getSingleClass('clickable imageWrapper')) !== -1) {
            const inst = ReactTools.getOwnerInstance(Utilities.getNestedProp(props, 'target.parentNode.parentNode'));
            proxiedUrl = props.src;
            if (inst) src = inst.props.original;
            if (typeof proxiedUrl === 'string') proxiedUrl = proxiedUrl.split('?')[0];
            /* if src does not have an extension but the proxied URL does, use the proxied URL instead */
            if (typeof src !== 'string' || src.indexOf('discordapp.com/channels') !== -1 || (!(isImage(src) || isVideo(src) || isAudio(src)) && (isImage(proxiedUrl) || isVideo(proxiedUrl) || isAudio(proxiedUrl)))) {
              src = proxiedUrl;
              proxiedUrl = '';
            }
          }
          if (!src) src = Utilities.getNestedProp(props, 'attachment.href') || Utilities.getNestedProp(props, 'attachment.url');
          /* is that enough specific cases? */
          if (typeof src === 'string') {
            src = src.split('?')[0];
            if (src.indexOf('//giphy.com/gifs/') !== -1) src = `https://i.giphy.com/media/${src.match(/-([^-]+)$/)[1]}/giphy.gif`;
            else if (src.indexOf('//tenor.com/view/') !== -1) {
              src = props.src;
              saveType = 'Video';
            } else if (src.indexOf('//preview.redd.it/') !== -1) {
              src = src.replace('preview', 'i');
            } else if (src.indexOf('twimg.com/') !== -1) saveType = 'Image';
          }
          if (!src) {
            let C = props.target;
            let proxiedsauce;
            let sauce;
            while (null != C) {
              if (C instanceof HTMLImageElement && null != C.src) proxiedsauce = C.src;
              if (C instanceof HTMLVideoElement && null != C.src) proxiedsauce = C.src;
              if (C instanceof HTMLAnchorElement && null != C.href) sauce = C.href;
              C = C.parentNode;
            }
            if (!proxiedsauce && !sauce) return;
            if (proxiedsauce) proxiedsauce = proxiedsauce.split('?')[0];
            if (sauce) sauce = sauce.split('?')[0];
            // Logger.info('sauce', sauce, 'proxiedsauce', proxiedsauce);
            /* do not check if proxiedsauce is an image video or audio, it will always be video or image!
               an anchor element however is just a link which could be anything! so best we check it
               special handler for github links, discord attachments and plugins
             */
            if (sauce && sauce.indexOf('//github.com/') !== -1 && (sauce.indexOf('.plugin.js') === sauce.length - 10 || sauce.indexOf('.theme.css') === sauce.length - 10)) {
              const split = sauce.slice(sauce.indexOf('//github.com/') + 13).split('/');
              split.splice(2, 1);
              sauce = 'https://raw.githubusercontent.com/' + split.join('/');
            }
            if (!proxiedsauce && (!sauce || !(isImage(sauce) || isVideo(sauce) || isAudio(sauce) || sauce.indexOf('//cdn.discordapp.com/attachments/') !== -1 || sauce.indexOf('//raw.githubusercontent.com/') !== -1))) return;
            src = sauce;
            proxiedUrl = proxiedsauce;
            /* if src does not have an extension but the proxied URL does, use the proxied URL instead */
            if (!src || (!(isImage(sauce) || isVideo(sauce) || isAudio(sauce)) && (isImage(proxiedsauce) || isVideo(proxiedsauce) || isAudio(proxiedsauce)))) {
              src = proxiedsauce;
              proxiedUrl = '';
            }
            if (!src) return;
          }
          url = src;
          if (!url) return;
          if (isImage(url) || url.indexOf('//steamuserimages') !== -1) saveType = 'Image';
          else if (isVideo(url)) saveType = 'Video';
          else if (isAudio(url)) saveType = 'Audio';
          if (url.indexOf('app.com/emojis/') !== -1) {
            saveType = 'Emoji';
            const emojiId = url.split('emojis/')[1].split('.')[0];
            const emoji = EmojiUtils.getDisambiguatedEmojiContext().getById(emojiId);
            if (!emoji) {
              if (!DiscordAPI.currentChannel || !this.channelMessages[DiscordAPI.currentChannel.id]) return;
              const message = this.channelMessages[DiscordAPI.currentChannel.id]._array.find(m => m.content.indexOf(emojiId) !== -1);
              if (message && message.content) {
                const group = message.content.match(new RegExp(`<a?:([^:>]*):${emojiId}>`));
                if (group && group[1]) customName = group[1];
              }
              if (!customName) {
                const alt = props.target.alt;
                if (alt) customName = alt.split(':')[1] || alt;
              }
            } else customName = emoji.name;
          } else if (state.__STR_extension) {
            if (isImage(state.__STR_extension)) saveType = 'Image';
            else if (isVideo(state.__STR_extension)) saveType = 'Video';
            else if (isAudio(state.__STR_extension)) saveType = 'Audio';
          } else if (url.indexOf('//discordapp.com/assets/') !== -1 && props.target && props.target.className.indexOf('emoji') !== -1) {
            const alt = props.target.alt;
            if (alt) {
              customName = alt.split(':')[1] || alt;
              const name = EmojiStore.convertSurrogateToName(customName);
              if (name) {
                const match = name.match(EmojiStore.EMOJI_NAME_RE);
                if (match) customName = EmojiStore.getByName(match[1]).uniqueName;
              }
            }
            saveType = 'Emoji';
          } else if (url.indexOf('.plugin.js') === url.length - 10) saveType = 'Plugin';
          else if (url.indexOf('.theme.css') === url.length - 10) saveType = 'Theme';
          try {
            const submenu = this.constructMenu(
              url.split('?')[0],
              saveType,
              customName,
              targetUrl => {
                if (state.__STR_requesting || state.__STR_requested) return;
                if (!isTrustedDomain(targetUrl)) return;
                state.__STR_requesting = true;
                RequestModule.head(targetUrl, (err, res) => {
                  if (err) return setState({ __STR_requesting: false, __STR_requested: true });
                  const extension = MimeTypesModule.extension(res.headers['content-type']);
                  setState({ __STR_requesting: false, __STR_requested: true, __STR_extension: extension });
                });
                targetUrl;
              },
              state.__STR_extension,
              proxiedUrl
            );
            const group = XenoLib.createContextMenuGroup([submenu]);
            if (this.settings.misc.contextMenuOnBottom) menu.push(group);
            else menu.unshift(group);
          } catch (e) {
            Logger.warn('Failed to parse URL...', url, e);
          }
        };

        Patcher.after(
          WebpackModules.find(m => m.default && m.default.displayName && m.default.displayName === 'NativeImageContextMenu'),
          'default',
          (_, [props], ret) => patchHandler(props, ret, true)
        );
        Patcher.after(
          WebpackModules.find(m => m.default && m.default.displayName && m.default.displayName === 'MessageContextMenu'),
          'default',
          (_, [props], ret) => patchHandler(props, ret)
        );
        Patcher.after(
          WebpackModules.find(m => m.default && m.default.displayName && m.default.displayName === 'MessageSearchResultContextMenu'),
          'default',
          (_, [props], ret) => patchHandler(props, ret)
        );
      }

      patchGuildContextMenu() {
        Patcher.after(
          WebpackModules.find(m => m.default && m.default.displayName && m.default.displayName === 'GuildContextMenu'),
          'default',
          (_, [props], ret) => {
            const menu = Utilities.getNestedProp(
              Utilities.findInReactTree(ret, e => e && e.type && e.type.displayName === 'Menu'),
              'props.children'
            );
            if (!Array.isArray(menu)) return;
            let url = props.guild.getIconURL();
            if (!url) return;
            let customName;
            if (this.settings.saveOptions.saveByName) customName = props.guild.name;
            url = useIdealExtensions(url);
            try {
              const submenu = this.constructMenu(url.split('?')[0], 'Icon', customName);
              const group = XenoLib.createContextMenuGroup([submenu]);
              if (this.settings.misc.contextMenuOnBottom) menu.push(group);
              else menu.unshift(group);
            } catch (e) {
              Logger.warn('Failed to parse URL...', url, e);
            }
          }
        );
      }

      /* PATCHES */

      rand() {
        let result = '';
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const charactersLength = characters.length;
        for (var i = 0; i < this.settings.saveOptions.randLength; i++) {
          result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
      }

      getLocationName() {
        if (DiscordAPI.currentGuild) return DiscordAPI.currentGuild.name;
        if (!DiscordAPI.currentChannel) return '';
        if (DiscordAPI.currentChannel.recipient) return DiscordAPI.currentChannel.recipient.username;
        if (DiscordAPI.currentChannel.name) return DiscordAPI.currentChannel.name;
        return DiscordAPI.currentChannel.members.reduce((p, c) => (p ? `${p}, ${c.username}` : c.username), '');
      }

      formatFilename(name, previewDate, previewRand, extension, throwFail) {
        const date = previewDate || new Date();
        const rand = previewRand || this.rand();
        let ret = 'INTERNAL_ERROR';
        switch (this.settings.saveOptions.fileNameType) {
          case 0: // original
            ret = name;
            break;
          case 1: // date
            ret = `${date.toLocaleDateString().split('/').join('-')} ${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
            break;
          case 2: // random
            ret = rand;
            break;
          case 3: // original + random
            ret = `${name}-${rand}`;
            break;
          case 4: // custom
            // options file rand date time day month year hours minutes seconds name
            ret = Utilities.formatTString(this.settings.saveOptions.customFileName, {
              rand,
              file: name,
              date: date.toLocaleDateString().split('/').join('-'),
              time: `${date.getMinutes()}-${date.getSeconds()}-${date.getMilliseconds()}`,
              day: date.getDate(), // note to self: getDate gives you the day of month
              month: date.getMonth() + 1, // getMonth gives 0-11
              year: date.getFullYear(),
              hours: date.getHours(),
              minutes: date.getMinutes(),
              seconds: date.getSeconds(),
              name: this.getLocationName()
            });
        }
        if (this.settings.saveOptions.fileNameType !== 4) {
          if (this.settings.saveOptions.appendCurrentName && (DiscordAPI.currentGuild || DiscordAPI.currentChannel)) {
            const name = this.getLocationName();
            if (name) ret += `-${name}`;
          }
        }
        ret = sanitizeFileName(ret, { extLength: extension ? 255 - (extension.length + 1) : 255 });
        if (!ret.length && throwFail) throw 'CUST_ERROR_1';
        return ret;
      }

      formatURL(url, requiresSize, customName, fallbackExtension, proxiedUrl, failNum = 0, forceKeepOriginal = false) {
        // url = url.replace(/\/$/, '');
        if (requiresSize) url += '?size=2048';
        else if (url.indexOf('twimg.com/') !== -1) url = url.replace(':small', ':orig').replace(':medium', ':orig').replace(':large', ':orig');
        else if (url.indexOf('.e621.net/') !== -1 || url.indexOf('.e926.net/') !== -1) {
          if (failNum <= 1) url = url.replace('preview/', '').replace('sample/', '');
          if (failNum === 1) url = url.replace(/.jpe?g/, '.png');
        }
        const match = url.match(/(?:\/)([^\/]+?)(?:(?:\.)([^.\/?:]+)){0,1}(?:[^\w\/\.]+\w+){0,1}(?:(?:\?[^\/]+){0,1}|(?:\/){0,1})$/);
        let name = customName || match[1];
        let extension = match[2] || fallbackExtension;
        if (url.indexOf('//media.tenor.co') !== -1) {
          extension = name;
          name = url.match(/\/\/media.tenor.co\/[^\/]+\/([^\/]+)\//)[1];
        } else if (url.indexOf('//i.giphy.com/media/') !== -1) name = url.match(/\/\/i\.giphy\.com\/media\/([^\/]+)\//)[1];
        let forceSaveAs = false;
        try {
          if (!forceKeepOriginal) name = this.formatFilename(name, undefined, undefined, extension, true);
          else name = sanitizeFileName(name, { extLength: extension ? 255 - (extension.length + 1) : 255 });
        } catch (e) {
          if (e !== 'CUST_ERROR_1') throw e;
          forceSaveAs = true;
        }
        const isTrusted = isTrustedDomain(url);
        const ret = { fileName: (extension && `${name}.${extension}`) || name, url: isTrusted ? url : proxiedUrl || url, name, extension, untrusted: !isTrusted && !proxiedUrl, forceSaveAs };
        // Logger.info(`[formatURL] url \`${url}\` requiresSize \`${requiresSize}\` customName \`${customName}\`, ret ${JSON.stringify(ret, '', 1)}`);
        return ret;
      }

      constructMenu(url, type, customName, onNoExtension = () => {}, fallbackExtension, proxiedUrl) {
        const subItems = [];
        const folderSubMenus = [];
        const formattedurl = this.formatURL(url, type === 'Icon' || type === 'Avatar', customName, fallbackExtension, proxiedUrl, 0, type === 'Theme' || type === 'Plugin');
        if (!formattedurl.extension) onNoExtension(formattedurl.url);
        let notifId;
        let downloadAttempts = 0;
        const shouldDoMultiAttempts = url.indexOf('.e621.net/') !== -1 || url.indexOf('.e926.net/') !== -1;
        const downloadEx = (path, openOnSave) => {
          if (!notifId) notifId = XenoLib.Notifications.info(`Downloading ${type}`, { timeout: 0, loading: true, progress: 0 });
          /* https://stackoverflow.com/questions/10420352/ */
          function humanFileSize(bytes, si, noUnit, unit) {
            const thresh = si ? 1000 : 1024;
            if (Math.abs(bytes) < thresh) return `${bytes} B`;
            const units = si ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
            let u = -1;
            do {
              bytes /= thresh;
              ++u;
            } while (Math.abs(bytes) >= thresh && u < units.length - 1);
            if (!noUnit) unit.a = units[u];
            return `${bytes.toFixed(1)}${noUnit && unit.a === units[u] ? '' : ' ' + units[u]}`;
          }
          const unit = { a: '' };
          const update = () => XenoLib.Notifications.update(notifId, { content: `Downloading ${type} ${humanFileSize(receivedBytes, false, true, unit)}/${humanFileSize(totalBytes, false, false, unit)}`, progress: (receivedBytes / totalBytes) * 100 });
          const throttledUpdate = XenoLib._.throttle(update, 50);
          let totalBytes = 0;
          let receivedBytes = 0;
          const req = RequestModule(formattedurl.url);
          req
            .on('data', chunk => {
              receivedBytes += chunk.length;
              throttledUpdate();
            })
            .on('response', res => {
              if (res.statusCode == 200) {
                totalBytes = parseInt(res.headers['content-length']);
                update();
                req
                  .pipe(FsModule.createWriteStream(path))
                  .on('finish', () => {
                    if (openOnSave) openPath(path);
                    BdApi.showToast(`Saved to '${PathModule.resolve(path)}'`, { type: 'success' });
                  })
                  .on('error', e => {
                    BdApi.showToast(`Failed to save! ${e}`, { type: 'error', timeout: 10000 });
                    XenoLib.Notifications.remove(notifId);
                    notifId = undefined;
                  });
              } else if (res.statusCode == 404) {
                if (shouldDoMultiAttempts && downloadAttempts < 2) {
                  downloadAttempts++;
                  const newUrl = this.formatURL(url, type === 'Icon' || type === 'Avatar', customName, fallbackExtension, proxiedUrl, downloadAttempts, type === 'Theme' || type === 'Plugin').url;
                  if (newUrl !== formattedurl.url) {
                    formattedurl.url = newUrl;
                    return downloadEx(path, openOnSave);
                  }
                }
                BdApi.showToast('Image does not exist!', { type: 'error' });
                XenoLib.Notifications.remove(notifId);
                notifId = undefined;
              } else {
                BdApi.showToast(`Unknown error. ${res.statusCode}`, { type: 'error' });
                XenoLib.Notifications.remove(notifId);
                notifId = undefined;
              }
            });
        };

        const download = (path, openOnSave) => {
          const onOk = () => downloadEx(path, openOnSave);
          if (formattedurl.untrusted) {
            showAlertModal({
              title: Messages.HOLD_UP,
              body: MessageStrings.UNTRUSTED_LINK.format({ url: formattedurl.url }),
              cancelText: Messages.MASKED_LINK_CANCEL,
              confirmText: Messages.MASKED_LINK_CONFIRM,
              minorText: Messages.MASKED_LINK_TRUST_THIS_DOMAIN,
              onConfirm: onOk,
              onConfirmSecondary: function () {
                WebpackModules.getByProps('trustDomain').trustDomain(formattedurl.url);
                onOk();
              }
            });
          } else {
            onOk();
          }
        };

        const saveAs = (folder, onOk) => {
          let val = formattedurl.name;
          let inputRef = null;
          /*           let delayedCall = new DelayedCall(350, () => {
            inputRef.props.value = val = sanitizeFileName(val, 255 - (formattedurl.extension ? formattedurl.extension.length + 1 : 0));
            inputRef.forceUpdate();
          }); */
          Modals.showModal(
            'Save as...',
            React.createElement(
              FormItem,
              {
                title: 'Name your file'
              },
              React.createElement(TextInput, {
                maxLength: 255 - (formattedurl.extension ? formattedurl.extension.length + 1 : 0),
                ref: e => (inputRef = e),
                value: val,
                onChange: e => {
                  val = e;
                  inputRef.props.value = val;
                  if (val.trim() !== sanitizeFileName(val.trim(), 255 - (formattedurl.extension ? formattedurl.extension.length + 1 : 0))) inputRef.props.error = 'Invalid characters in name';
                  else inputRef.props.error = undefined;
                  inputRef.forceUpdate();
                },
                placeholder: formattedurl.name,
                autoFocus: true,
                error: !folder ? 'Invalid filename, please set a name' : folder === -1 ? 'File already exists, try another name' : undefined
              }),
              React.createElement(XenoLib.ReactComponents.Button, {
                children: 'Randomize',
                className: XenoLib.joinClassNames(DiscordClasses.Margins.marginBottom20.value, XenoLib.getClass('input reset'), 'ST-randomize'),
                color: XenoLib.ReactComponents.Button.Colors.PRIMARY,
                look: XenoLib.ReactComponents.ButtonOptions.ButtonLooks.LINK,
                onClick: () => {
                  val = this.rand();
                  inputRef.props.value = val;
                  inputRef.forceUpdate();
                }
              })
            ),
            {
              confirmText: 'Save',
              onConfirm: () => {
                const onDoShitOrWhateverFuckThisShitMan = val => {
                  if (!folder || folder === -1) return onOk(val);
                  this.lastUsedFolder = this.folders.findIndex(m => m === folder);
                  if (!val.length) val = formattedurl.name;
                  else formattedurl.name = val;
                  saveFile(folder.path + `/${val}${formattedurl.extension ? '.' + formattedurl.extension : ''}`, folder.path, false, false);
                };
                const sanitized = sanitizeFileName(val, 255 - (formattedurl.extension ? formattedurl.extension.length + 1 : 0));
                if (val !== sanitized) {
                  if (!sanitized.length) return saveAs(undefined, onOk);
                  return Modals.showConfirmationModal('Invalid characters', `There are invalid characters in the filename. Do you want to strip them? Resulting filename will be ${sanitized}`, {
                    onConfirm: () => {
                      onOk(sanitized);
                      onDoShitOrWhateverFuckThisShitMan(sanitized);
                    }
                  });
                }
                onDoShitOrWhateverFuckThisShitMan(val);
              }
            }
          );
        };

        const saveFile = (path, basePath, openOnSave, dontWarn, resolved) => {
          try {
            FsModule.accessSync(PathModule.dirname(path), FsModule.constants.W_OK);
          } catch (err) {
            Logger.stacktrace('Failed to save to folder', err);
            return BdApi.showToast(`Error saving to folder: ${err.message.match(/.*: (.*), access '/)[1]}`, { type: 'error' });
          }
          const handleSaveAs = invFilename => saveAs(invFilename ? -1 : undefined, fileName => ((formattedurl.forceSaveAs = false), saveFile(`${basePath}/${fileName}${formattedurl.extension ? '.' + formattedurl.extension : ''}`, basePath, openOnSave, dontWarn, true)));
          if (formattedurl.forceSaveAs && !resolved) return handleSaveAs();
          if (!dontWarn && FsModule.existsSync(path)) {
            const handleConflict = mode => {
              switch (mode) {
                case 2: {
                  let num = 1;
                  try {
                    while (FsModule.existsSync(path)) {
                      path = `${basePath}/${formattedurl.name}(${num})${formattedurl.extension ? '.' + formattedurl.extension : ''}`;
                      num++;
                      if (num > 99) return Logger.err('Save attempt passed num 99!');
                    }
                  } catch (e) {
                    return Logger.stacktrace('Error finding good number', e);
                  }
                  break;
                }
                case 3: {
                  path = `${basePath}/${formattedurl.name}-${this.rand()}${formattedurl.extension ? '.' + formattedurl.extension : ''}`;
                  break;
                }
                case 4:
                  return handleSaveAs(true);
              }
              download(path, openOnSave);
            };
            if (this.settings.saveOptions.conflictingFilesHandle && !formattedurl.forceSaveAs) {
              handleConflict(this.settings.saveOptions.conflictingFilesHandle);
            } else {
              let ref1, ref2;
              Modals.showModal(
                'File conflict',
                [
                  React.createElement(
                    WebpackModules.getByDisplayName('Text'),
                    {
                      className: WebpackModules.getByProps('defaultColor').defaultColor + ' ' + WebpackModules.getByProps('marginBottom20').marginBottom20
                    },
                    'A file with the existing name already exists! What do you want to do?'
                  ),
                  React.createElement(RadioGroup, {
                    className: WebpackModules.getByProps('marginBottom20').marginBottom20,
                    clearable: false,
                    searchable: false,
                    options: [
                      {
                        name: 'Overwrite',
                        value: 1
                      },
                      {
                        name: 'Append number: (1)',
                        value: 2
                      },
                      {
                        name: 'Append random',
                        value: 3
                      },
                      {
                        name: 'Save as...',
                        value: 4
                      }
                    ],
                    value: 1,
                    ref: e => (ref1 = e),
                    onChange: e => {
                      ref1.props.value = e.value;
                      ref1.forceUpdate();
                    }
                  }),
                  React.createElement(SwitchRow, {
                    children: 'Disable this warning and save this option',
                    note: 'This can be changed in settings',
                    value: 0,
                    ref: e => (ref2 = e),
                    onChange: e => {
                      const checked = e.currentTarget.checked;
                      ref2.props.value = checked;
                      ref2.forceUpdate();
                    }
                  })
                ],
                {
                  confirmText: 'Ok',
                  cancelText: 'Cancel',
                  size: Modals.ModalSizes.SMALL,
                  red: false,
                  onConfirm: () => {
                    if (ref2.props.value) {
                      this.settings.saveOptions.conflictingFilesHandle = ref1.props.value;
                      this.saveSettings();
                    }
                    handleConflict(ref1.props.value);
                  }
                }
              );
            }
          } else {
            download(path, openOnSave);
          }
        };

        const folderSubMenu = (folder, idx) => {
          return XenoLib.createContextMenuSubMenu(
            folder.name,
            [
              XenoLib.createContextMenuItem(
                'Remove Folder',
                () => {
                  this.folders.splice(idx, 1);
                  this.saveFolders();
                  BdApi.showToast('Removed!', { type: 'success' });
                },
                'remove-folder'
              ),
              XenoLib.createContextMenuItem(
                'Open Folder',
                () => {
                  openPath(folder.path);
                },
                'open-folder'
              ),
              XenoLib.createContextMenuItem(
                'Save',
                () => {
                  this.lastUsedFolder = idx;
                  const path = folder.path + `/${formattedurl.fileName}`;
                  saveFile(path, folder.path);
                },
                'save'
              ),
              XenoLib.createContextMenuItem('Save As...', () => saveAs(folder), 'savetoredux-save-as'),
              XenoLib.createContextMenuItem(
                'Save And Open',
                () => {
                  this.lastUsedFolder = idx;
                  const path = folder.path + `/${formattedurl.fileName}`;
                  saveFile(path, folder.path, true);
                },
                'save-and-open'
              ),
              XenoLib.createContextMenuItem(
                'Edit',
                () => {
                  let __name = folder.name.slice(0);
                  let __path = folder.path.slice(0);
                  const saveFolder = () => {
                    if (!__path || !__path.length) return BdApi.showToast('Invalid path', { type: 'error' });
                    folder.name = __name;
                    folder.path = __path;
                    this.saveFolders();
                  };
                  Modals.showModal(
                    'Edit folder',
                    React.createElement(FolderEditor, {
                      name: __name,
                      path: __path,
                      onNameChange: e => (__name = e),
                      onPathChange: e => (__path = e)
                    }),
                    {
                      confirmText: 'Create',
                      onConfirm: saveFolder,
                      size: XenoLib.joinClassNames(Modals.ModalSizes.MEDIUM, 'ST-modal')
                    }
                  );
                },
                'edit'
              )
            ],
            idx,
            {
              action: () => {
                this.lastUsedFolder = this.folders.findIndex(m => m === folder);
                const path = folder.path + `/${formattedurl.fileName}`;
                saveFile(path, folder.path);
              }
            }
          );
        };
        for (const folderIDX in this.folders) folderSubMenus.push(folderSubMenu(this.folders[folderIDX], folderIDX));
        subItems.push(
          ...folderSubMenus,
          XenoLib.createContextMenuItem(
            'Add Folder',
            () => {
              dialog
                .showOpenDialog({
                  title: 'Add folder',
                  properties: ['openDirectory', 'createDirectory']
                })
                .then(({ filePaths: [path] }) => {
                  if (!path) return BdApi.showToast('Maybe next time.');
                  let idx;
                  if ((idx = this.folders.findIndex(m => m.path === path)) !== -1) return BdApi.showToast(`Folder already exists as ${this.folders[idx].name}!`, { type: 'error', timeout: 5000 });
                  const folderName = PathModule.basename(path);
                  let __name = folderName;
                  let __path = path.slice(0);
                  const saveFolder = () => {
                    if (!__path || !__path.length) return BdApi.showToast('Invalid path', { type: 'error' });
                    this.folders.push({
                      path: __path,
                      name: __name || 'Unnamed'
                    });
                    this.saveFolders();
                    BdApi.showToast('Added!', { type: 'success' });
                  };
                  Modals.showModal(
                    'Create New Folder',
                    React.createElement(FolderEditor, {
                      name: folderName,
                      path: path,
                      onNameChange: e => (__name = e),
                      onPathChange: e => (__path = e)
                    }),
                    {
                      confirmText: 'Create',
                      onConfirm: saveFolder,
                      size: XenoLib.joinClassNames(Modals.ModalSizes.MEDIUM, 'ST-modal')
                    }
                  );
                });
            },
            'add-folder'
          ),
          XenoLib.createContextMenuItem(
            'Save As...',
            () => {
              dialog
                .showSaveDialog({
                  defaultPath: formattedurl.fileName,
                  filters: formattedurl.extension
                    ? [
                        {
                          name: /\.{0,1}(png|jpe?g|webp|gif|svg)$/i.test(formattedurl.extension) ? 'Images' : /\.{0,1}(mp4|webm|mov)$/i.test(formattedurl.extension) ? 'Videos' : /\.{0,1}(mp3|ogg|wav|flac)$/i.test(formattedurl.extension) ? 'Audio' : 'Files',
                          extensions: [formattedurl.extension]
                        },
                        {
                          name: 'All Files',
                          extensions: ['*']
                        }
                      ]
                    : undefined
                })
                .then(({ filePath: path }) => {
                  if (!path) return BdApi.showToast('Maybe next time.');
                  saveFile(path, undefined, false, true);
                });
            },
            'save-as'
          ),
          type === 'Plugin'
            ? XenoLib.createContextMenuItem(
                `Install Plugin`,
                () => {
                  saveFile(BdApi.Plugins.folder + `/${formattedurl.fileName}`, undefined, false, true);
                },
                'install-plugin',
                {
                  /* onContextMenu: () => console.log('wee!'), tooltip: 'Right click to install and enable'  */
                  tooltip: 'No overwrite warning'
                }
              )
            : null,
          type === 'Theme'
            ? XenoLib.createContextMenuItem(
                `Install Theme`,
                () => {
                  saveFile(BdApi.Themes.folder + `/${formattedurl.fileName}`, undefined, false, true);
                },
                'install-theme',
                {
                  /* onContextMenu: () => console.log('wee!'), tooltip: 'Right click to install and enable'  */
                  tooltip: 'No overwrite warning'
                }
              )
            : null
        );
        return XenoLib.createContextMenuSubMenu(`Save ${type} To`, subItems, 'str', {
          action: () => {
            if (this.lastUsedFolder === -1) return BdApi.showToast('No folder has been used yet', { type: 'error' });
            const folder = this.folders[this.lastUsedFolder];
            if (!folder) return BdApi.showToast('Folder no longer exists', { type: 'error' });
            const path = folder.path + `/${formattedurl.fileName}`;
            saveFile(path, folder.path);
          }
        });
      }

      showChangelog(footer) {
        XenoLib.showChangelog(`${this.name} has been updated!`, this.version, this._config.changelog);
      }

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
  let XenoLibOutdated = false;
  try {
    if (global.BdApi && 'function' == typeof BdApi.getPlugin) {
      const i = (i, n) => ((i = i.split('.').map(i => parseInt(i))), (n = n.split('.').map(i => parseInt(i))), !!(n[0] > i[0]) || !!(n[0] == i[0] && n[1] > i[1]) || !!(n[0] == i[0] && n[1] == i[1] && n[2] > i[2])),
        n = (n, e) => n && n._config && n._config.info && n._config.info.version && i(n._config.info.version, e),
        e = BdApi.getPlugin('ZeresPluginLibrary'),
        o = BdApi.getPlugin('XenoLib');
      n(e, '1.2.17') && (ZeresPluginLibraryOutdated = !0), n(o, '1.3.20') && (XenoLibOutdated = !0);
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
            h = BdApi.findModuleByProps('Sizes', 'Weights'),
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
                      children: [BdApi.React.createElement(h, { color: h.Colors.PRIMARY, children: [`${f} Please click Download Now to download ${d ? 'them' : 'it'}.`] })],
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
