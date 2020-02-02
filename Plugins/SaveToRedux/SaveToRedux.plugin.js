//META{"name":"SaveToRedux","source":"https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/SaveToRedux/SaveToRedux.plugin.js","website":"https://1lighty.github.io/BetterDiscordStuff/?plugin=SaveToRedux"}*//
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
      version: '2.0.8',
      description: 'Allows you to save images, videos, profile icons, server icons, reactions, emotes and custom status emotes to any folder quickly.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/SaveToRedux/SaveToRedux.plugin.js'
    },
    changelog: [
      {
        title: 'sad',
        type: 'fixed',
        items: ['Fixed crash if XenoLib or ZeresPluginLib were missing']
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
              { name: 'Append random', value: 3 }
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
    const { ContextMenu, EmulatedTooltip, Toasts, Settings, Popouts, Modals, Utilities, WebpackModules, Filters, DiscordModules, ColorConverter, DOMTools, DiscordClasses, DiscordSelectors, ReactTools, ReactComponents, DiscordAPI, Logger, Patcher, PluginUpdater, PluginUtilities, DiscordClassModules, Structs } = Api;
    const { React, ModalStack, ContextMenuActions, ContextMenuItem, ContextMenuItemsGroup, ReactDOM, ChannelStore, GuildStore, UserStore, DiscordConstants, Dispatcher, GuildMemberStore, GuildActions, SwitchRow, EmojiUtils, RadioGroup } = DiscordModules;

    const ContextMenuSubMenuItem = WebpackModules.getByDisplayName('FluxContainer(SubMenuItem)');
    const TextComponent = WebpackModules.getByDisplayName('Text');
    const getEmojiURL = WebpackModules.getByProps('getEmojiURL').getEmojiURL;
    const showAlertModal = WebpackModules.find(m => m.show && m.show.toString().search(/\w\.minorText,\w=\w\.onConfirmSecondary/)).show;

    const dialog = require('electron').remote.dialog;
    const openSaveDialog = dialog.showSaveDialogSync || dialog.showSaveDialog;
    const openOpenDialog = dialog.showOpenDialogSync || dialog.showOpenDialog;
    const openItem = require('electron').shell.openItem;
    const FsModule = require('fs');
    const RequestModule = require('request');
    const PathModule = require('path');
    const MimeTypesModule = require('mime-types');
    const FormItem = WebpackModules.getByDisplayName('FormItem');
    const Messages = WebpackModules.getByProps('Messages').Messages;
    const TextInput = WebpackModules.getByDisplayName('TextInput');
    const AvatarModule = WebpackModules.getByProps('getChannelIconURL');

    const MessageShit = WebpackModules.find(m => m.default && m.getMessage);
    const TrustStore = WebpackModules.getByProps('isTrustedDomain');

    const isTrustedDomain = url => {
      for (const domain of isTrustedDomain.domains) if (url.search(domain) !== -1) return true;
      return TrustStore.isTrustedDomain(url);
    };
    isTrustedDomain.domains = [/\/\/steamuserimages-\w\.akamaihd\.net\//, /\/\/steamcdn-\w\.akamaihd\.net\//, /\/\/steamcommunity-\w\.akamaihd\.net\//, '//cdn.discordapp.com/', '//media.discordapp.net/', /\/\/images-ext-\d\.discordapp\.net\//, '//i.ytimg.com/', /\/\/static\d\.e621\.net\//, '//pbs.twimg.com/', '//preview.redd.it/', '//cdn.shopify.com/', '//discordapp.com/', '//i.imgur.com/', '//i.clouds.tf/', '//image.prntscr.com/', '//i.giphy.com/', '//media.tenor.co/'];

    const MessageStrings = {
      UNTRUSTED_LINK: MessageShit.getMessage("If you see this, SaveToRedux has failed to get a safe proxied version of the image URL **!!{url}!!**. If you do not recognize the domain, it's best you don't download from it as it could potentially be an IP logger.\n\nAre you sure you want to download an image from this domain?", 'en-US')
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
        return React.createElement(TextComponent, { color: TextComponent.Colors.PRIMARY }, this.props.formatFilename('unknown', this.state.date, this.state.rand), '.png');
      }
    }

    class PreviewField extends Settings.SettingField {
      constructor(name, note, data, onChange) {
        super(name, note, onChange, Preview, data);
      }
    }

    return class SaveToRedux extends Plugin {
      constructor() {
        super();
        this.promises = {
          state: { cancelled: false },
          cancel() {
            this.state.cancelled = true;
          },
          restore() {
            this.state.cancelled = false;
          }
        };
        XenoLib.DiscordUtils.bindAll(this, ['handleContextMenu', 'formatFilename']);
        XenoLib.changeName(__filename, 'SaveToRedux');
      }
      onStart() {
        /* trigger settings migration */
        if (typeof this.settings.folders !== 'undefined') {
          const settings = Utilities.deepclone(this.defaultSettings);
          const folders = [];
          settings.saveOptions.fileNameType = this.settings.fileNameType;
          settings.saveOptions.customFileName = this.settings.customFileName;
          settings.saveOptions.randLength = this.settings.randLength;
          settings.saveOptions.conflictingFilesHandle = this.settings.conflictingFilesHandle;
          settings.misc.contextMenuOnBottom = this.settings.contextMenuOnBottom;
          Object.values(this.settings.folders).forEach(folder => folders.push({ name: folder.name, path: folder.path }));
          this.settings = settings;
          this.folders = folders;
          this.saveSettings();
          this.saveFolders();
        }
        this.promises = { state: { cancelled: false } };
        this.folders = XenoLib.loadData(this.name, 'folders', {
          data: []
        }).data;
        this.channelMessages = WebpackModules.find(m => m._channelMessages)._channelMessages;
        this.patchAll();
        PluginUtilities.addStyle(
          this.short + '-CSS',
          `
        .ST-modal {
            min-height: 320px;
        }
        `
        );
        this.lastUsedFolder = -1;
      }

      onStop() {
        this.promises.state.cancelled = true;
        Patcher.unpatchAll();
        XenoLib.unpatchContext(this.handleContextMenu);
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
        XenoLib.patchContext(this.handleContextMenu);
        Utilities.suppressErrors(this.patchReactions.bind(this), 'Reaction patch')(this.promises.state);
      }

      async patchReactions(promiseState) {
        const Reaction = await ReactComponents.getComponentByName('Reaction', `.${XenoLib.getSingleClass('reactionMe reactions')} > div:not(.${XenoLib.getSingleClass('reactionMe reactionBtn')})`);
        if (promiseState.cancelled) return;
        Patcher.after(Reaction.component.prototype, 'render', (_this, _, ret) => {
          const oChildren = ret.props.children;
          ret.props.children = e => {
            const oChRet = oChildren(e);
            const url = _this.props.emoji.id ? getEmojiURL({ id: _this.props.emoji.id, animated: _this.props.emoji.animated }) : WebpackModules.getByProps('getURL').getURL(_this.props.emoji.name);
            XenoLib.createSharedContext(
              () => {
                const submenu = this.constructMenu(url.split('?')[0], 'Reaction', _this.props.emoji.name);
                return XenoLib.createContextMenuGroup([submenu]);
              },
              oChRet.props,
              'MESSAGE_REACTIONS'
            );
            return oChRet;
          };
        });
        Reaction.forceUpdateAll();
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

      formatFilename(name, previewDate, previewRand) {
        const date = previewDate || new Date();
        const rand = previewRand || this.rand();
        let ret = 'INTERNAL_ERROR';
        switch (this.settings.saveOptions.fileNameType) {
          case 0: // original
            ret = name;
            break;
          case 1: // date
            ret = `${date
              .toLocaleDateString()
              .split('/')
              .join('-')} ${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;
            break;
          case 2: // random
            ret = rand;
            break;
          case 3: // original + random
            ret = `${name}-${rand}`;
            break;
          case 4: // custom
            // options file rand date time day month year hours minutes seconds name
            return Utilities.formatTString(this.settings.saveOptions.customFileName, {
              rand,
              file: name,
              date: date
                .toLocaleDateString()
                .split('/')
                .join('-'),
              time: `${date.getMinutes()}-${date.getSeconds()}-${date.getMilliseconds()}`,
              day: date.getDay(),
              month: date.getMonth(),
              year: date.getFullYear(),
              hours: date.getHours(),
              minutes: date.getMinutes(),
              seconds: date.getSeconds(),
              name: this.getLocationName()
            });
        }
        if (this.settings.saveOptions.appendCurrentName && (DiscordAPI.currentGuild || DiscordAPI.currentChannel)) {
          const name = this.getLocationName();
          if (name) ret += `-${name}`;
        }
        return ret;
      }

      formatURL(url, requiresSize, customName, fallbackExtension, proxiedUrl) {
        // url = url.replace(/\/$/, '');
        if (url.indexOf('/a_') !== -1) url = url.replace('.webp', '.gif').replace('.png', '.gif');
        else url = url.replace('.webp', '.png');
        if (requiresSize) url += '?size=2048';
        const match = url.match(/(?:\/)([^\/]+?)(?:(?:\.)([^.\/?:]+)){0,1}(?:[^\w\/\.]+\w+){0,1}(?:(?:\?[^\/]+){0,1}|(?:\/){0,1})$/);
        let name = customName || match[1];
        let extension = match[2] || fallbackExtension;
        if (url.indexOf('//media.tenor.co') !== -1) {
          extension = name;
          name = url.match(/\/\/media.tenor.co\/[^\/]+\/([^\/]+)\//)[1];
        } else if (url.indexOf('//i.giphy.com/media/') !== -1) name = url.match(/\/\/i\.giphy\.com\/media\/([^\/]+)\//)[1];
        name = this.formatFilename(name);
        const isTrusted = isTrustedDomain(url);
        const ret = { fileName: (extension && `${name}.${extension}`) || name, url: isTrusted ? url : proxiedUrl || url, name, extension, untrusted: !isTrusted && !proxiedUrl };
        // Logger.info(`[formatURL] url \`${url}\` requiresSize \`${requiresSize}\` customName \`${customName}\`, ret ${JSON.stringify(ret, '', 1)}`);
        return ret;
      }

      constructMenu(url, type, customName, onNoExtension = () => {}, fallbackExtension, proxiedUrl) {
        const createSubMenu = (name, items, callback) =>
          XenoLib.createContextMenuSubMenu(name, items, {
            action: () => {
              if (!callback) return;
              ContextMenuActions.closeContextMenu();
              callback();
            }
          });
        const subItems = [];
        const folderSubMenus = [];
        const formattedurl = this.formatURL(url, type === 'Icon' || type === 'Avatar', customName, fallbackExtension, proxiedUrl);
        if (!formattedurl.extension) onNoExtension(formattedurl.url);
        const downloadEx = (path, openOnSave) => {
          const req = RequestModule(formattedurl.url);
          req.on('response', res => {
            if (res.statusCode == 200) {
              req
                .pipe(FsModule.createWriteStream(path))
                .on('finish', () => {
                  if (openOnSave) openItem(path);
                  BdApi.showToast(`Saved to '${path}'`, { type: 'success' });
                })
                .on('error', e => BdApi.showToast(`Failed to save! ${e}`, { type: 'error', timeout: 10000 }));
            } else if (res.statusCode == 404) BdApi.showToast('Image does not exist!', { type: 'error' });
            else BdApi.showToast(`Unknown error. ${res.statusCode}`, { type: 'error' });
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
              onConfirmSecondary: function() {
                WebpackModules.getByProps('trustDomain').trustDomain(formattedurl.url);
                onOk();
              }
            });
          } else {
            onOk();
          }
        };

        const saveFile = (path, basePath, openOnSave, dontWarn) => {
          try {
            FsModule.accessSync(PathModule.dirname(path), FsModule.constants.W_OK);
          } catch (err) {
            return BdApi.showToast(`Error saving to folder: ${err.message.match(/.*: (.*), access '/)[1]}`, { type: 'error' });
          }
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
                }
              }
              download(path, openOnSave);
            };
            if (this.settings.saveOptions.conflictingFilesHandle) {
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

        const folderSubMenu = folder => {
          return createSubMenu(
            folder.name,
            [
              XenoLib.createContextMenuItem('Remove Folder', () => {
                const index = this.folders.findIndex(m => m === folder);
                if (index === -1) return BdApi.showToast("Fatal error! Attempted to remove a folder that doesn't exist!", { type: 'error', timeout: 5000 });
                this.folders.splice(index, 1);
                this.saveFolders();
                BdApi.showToast('Removed!', { type: 'success' });
              }),
              XenoLib.createContextMenuItem('Open Folder', () => {
                openItem(folder.path);
              }),
              XenoLib.createContextMenuItem('Save', () => {
                this.lastUsedFolder = this.folders.findIndex(m => m === folder);
                const path = folder.path + `/${formattedurl.fileName}`;
                saveFile(path, folder.path);
              }),
              XenoLib.createContextMenuItem('Save As...', () => {
                let val = '';
                let inputRef = null;
                Modals.showModal(
                  'Save as...',
                  React.createElement(
                    FormItem,
                    {
                      className: DiscordClasses.Margins.marginBottom20,
                      title: 'Name your file'
                    },
                    React.createElement(TextInput, {
                      maxLength: DiscordConstants.MAX_GUILD_FOLDER_NAME_LENGTH,
                      ref: e => (inputRef = e),
                      value: val,
                      onChange: e => {
                        val = e;
                        inputRef.props.value = e;
                        inputRef.forceUpdate();
                      },
                      placeholder: formattedurl.name,
                      autoFocus: true
                    })
                  ),
                  {
                    confirmText: 'Save',
                    onConfirm: () => {
                      this.lastUsedFolder = this.folders.findIndex(m => m === folder);
                      if (!val.length) val = formattedurl.name;
                      else formattedurl.name = val;
                      saveFile(folder.path + `/${val}${formattedurl.extension ? '.' + formattedurl.extension : ''}`, folder.path, false, false);
                    }
                  }
                );
                /* const path = this.openSaveDialog({ defaultPath: folder.path + `/${formattedurl.fileName}` });
                if (!path) return BdApi.showToast('Maybe next time.');
                saveFile(path, undefined, false, true); */
              }),
              XenoLib.createContextMenuItem('Save And Open', () => {
                this.lastUsedFolder = this.folders.findIndex(m => m === folder);
                const path = folder.path + `/${formattedurl.fileName}`;
                saveFile(path, folder.path, true);
              }),
              XenoLib.createContextMenuItem('Edit', () => {
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
              })
            ],
            () => {
              this.lastUsedFolder = this.folders.findIndex(m => m === folder);
              const path = folder.path + `/${formattedurl.fileName}`;
              saveFile(path, folder.path);
            }
          );
        };
        for (const folder of this.folders) folderSubMenus.push(folderSubMenu(folder));
        subItems.push(
          ...folderSubMenus,
          XenoLib.createContextMenuItem('Add Folder', () => {
            const path = openOpenDialog({
              title: 'Add folder',
              properties: ['openDirectory', 'createDirectory']
            });
            if (!path) return BdApi.showToast('Maybe next time.');
            let idx;
            if ((idx = this.folders.findIndex(m => m.path === path[0])) !== -1) return BdApi.showToast(`Folder already exists as ${this.folders[idx].name}!`, { type: 'error', timeout: 5000 });
            const folderName = PathModule.basename(path[0]);
            let __name = folderName;
            let __path = path[0].slice(0);
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
                path: path[0],
                onNameChange: e => (__name = e),
                onPathChange: e => (__path = e)
              }),
              {
                confirmText: 'Create',
                onConfirm: saveFolder,
                size: XenoLib.joinClassNames(Modals.ModalSizes.MEDIUM, 'ST-modal')
              }
            );
          }),
          XenoLib.createContextMenuItem('Save As...', () => {
            const path = openSaveDialog({
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
            });
            if (!path) return BdApi.showToast('Maybe next time.');
            saveFile(path, undefined, false, true);
          })
        );
        return createSubMenu(`Save ${type} To`, subItems, () => {
          if (this.lastUsedFolder === -1) return BdApi.showToast('No folder has been used yet', { type: 'error' });
          const folder = this.folders[this.lastUsedFolder];
          if (!folder) return BdApi.showToast('Folder no longer exists', { type: 'error' });
          const path = folder.path + `/${formattedurl.fileName}`;
          saveFile(path, folder.path);
        });
      }

      handleContextMenu(_this, ret) {
        if (!ret) return ret;
        // Logger.info(_this, ret);
        const type = _this.props.type;
        let saveType = 'File';
        let url = '';
        let proxiedUrl = '';
        let customName = '';
        const isImage = e => /\.{0,1}(png|jpe?g|webp|gif|svg)$/i.test(e);
        const isVideo = e => /\.{0,1}(mp4|webm|mov)$/i.test(e);
        const isAudio = e => /\.{0,1}(mp3|ogg|wav|flac)$/i.test(e);
        if (type === 'NATIVE_IMAGE' || type === 'MESSAGE_MAIN') {
          let src;
          if (type === 'NATIVE_IMAGE') {
            src = Utilities.getNestedProp(ret, 'props.children.props.href') || Utilities.getNestedProp(_this, 'props.href');
            proxiedUrl = Utilities.getNestedProp(ret, 'props.children.props.src') || Utilities.getNestedProp(_this, 'props.src');
            if (typeof proxiedUrl === 'string') proxiedUrl = proxiedUrl.split('?')[0];
            /* if src does not have an extension but the proxied URL does, use the proxied URL instead */
            if (typeof src !== 'string' || src.indexOf('discordapp.com/channels') !== -1 || (!(isImage(src) || isVideo(src) || isAudio(src)) && (isImage(proxiedUrl) || isVideo(proxiedUrl) || isAudio(proxiedUrl)))) {
              src = proxiedUrl;
              proxiedUrl = '';
            }
          }
          // Logger.info('src', src, 'proxiedUrl', proxiedUrl, _this, ret);
          if (!src) src = Utilities.getNestedProp(_this, 'props.attachment.href') || Utilities.getNestedProp(_this, 'props.attachment.url');
          /* is that enough specific cases? */
          if (typeof src === 'string') {
            src = src.split('?')[0];
            if (src.indexOf('//giphy.com/gifs/') !== -1) src = `https://i.giphy.com/media/${src.match(/-([^-]+)$/)[1]}/giphy.gif`;
            else if (src.indexOf('//tenor.com/view/') !== -1) {
              src = _this.props.src;
              saveType = 'Video';
            } else if (src.indexOf('//preview.redd.it/') !== -1) {
              src = src.replace('preview', 'i');
            } else if (src.indexOf('twimg.com/') !== -1) saveType = 'Image';
          }
          if (!src) {
            let C = _this.props.target;
            let proxiedsauce;
            let sauce;
            while (null != C) {
              if (C instanceof HTMLImageElement && null != C.src) proxiedsauce = C.src;
              if (C instanceof HTMLAnchorElement && null != C.href) sauce = C.href;
              C = C.parentNode;
            }
            if (!proxiedsauce && !sauce) return;
            if (proxiedsauce) proxiedsauce = proxiedsauce.split('?')[0];
            if (sauce) sauce = sauce.split('?')[0];
            // Logger.info('sauce', sauce, 'proxiedsauce', proxiedsauce);
            /* do not check if proxiedsauce is an image video or audio, it will always be video or image!
               an anchor element however is just a link which could be anything! so best we check it
             */
            if (!proxiedsauce && !(isImage(sauce) || isVideo(sauce) || isAudio(sauce))) return;
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
                const alt = _this.props.target.alt;
                if (alt) customName = alt.split(':')[1] || alt;
              }
            } else customName = emoji.name;
          } else if (_this.state.__STR_extension) {
            if (isImage(_this.state.__STR_extension)) saveType = 'Image';
            else if (isVideo(_this.state.__STR_extension)) saveType = 'Video';
            else if (isAudio(_this.state.__STR_extension)) saveType = 'Audio';
          } else if (url.indexOf('//discordapp.com/assets/') !== -1 && _this.props.target && _this.props.target.className.indexOf('emoji') !== -1) {
            const alt = _this.props.target.alt;
            if (alt) customName = alt.split(':')[1] || alt;
          }
          if (!Array.isArray(ret.props.children)) ret.props.children = [ret.props.children];
        } else if (type === 'GUILD_ICON_BAR') {
          saveType = 'Icon';
          url = _this.props.guild.getIconURL();
          if (!url) return;
          if (this.settings.saveOptions.saveByName) customName = _this.props.guild.name;
        } else {
          if (_this.props.user && _this.props.user.getAvatarURL) {
            saveType = 'Avatar';
            url = _this.props.user.getAvatarURL();
            if (this.settings.saveOptions.saveByName) customName = _this.props.user.username;
          } else if (_this.props.channel && _this.props.channel.type === 3 /* group DM */) {
            url = AvatarModule.getChannelIconURL(_this.props.channel);
            saveType = 'Icon';
          } else return /* hurr durr? */;
          if (url.startsWith('/assets/')) url = 'https://discordapp.com' + url;
        }
        try {
          const submenu = this.constructMenu(
            url.split('?')[0],
            saveType,
            customName,
            targetUrl => {
              if (_this.state.__STR_requesting || _this.state.__STR_requested) return;
              if (!isTrustedDomain(targetUrl)) return;
              _this.state.__STR_requesting = true;
              RequestModule.head(targetUrl, (err, res) => {
                if (err) return _this.setState({ __STR_requesting: false, __STR_requested: true });
                const extension = MimeTypesModule.extension(res.headers['content-type']);
                _this.setState({
                  __STR_requesting: false,
                  __STR_requested: true,
                  __STR_extension: extension
                });
              });
              targetUrl;
            },
            _this.state.__STR_extension,
            proxiedUrl
          );
          const group = XenoLib.createContextMenuGroup([submenu]);
          const targetGroup = ret.props.children;

          if (this.settings.misc.contextMenuOnBottom) targetGroup.push(group);
          else targetGroup.unshift(group);
        } catch (e) {
          Logger.warn('Failed to parse URL...', url, e);
        }
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
          const ezlibMissing = !global.XenoLib;
          const zlibMissing = !global.ZeresPluginLibrary;
          const bothLibsMissing = ezlibMissing && zlibMissing;
          const header = `Missing ${(bothLibsMissing && 'Libraries') || 'Library'}`;
          const content = `The ${(bothLibsMissing && 'Libraries') || 'Library'} ${(zlibMissing && 'ZeresPluginLibrary') || ''} ${(ezlibMissing && (zlibMissing ? 'and XenoLib' : 'XenoLib')) || ''} required for ${this.name} ${(bothLibsMissing && 'are') || 'is'} missing.`;
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
                  children: [BdApi.React.createElement(TextElement, { color: TextElement.Colors.PRIMARY, children: [`${content} Please click Download Now to install ${(bothLibsMissing && 'them') || 'it'}.`] })],
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
