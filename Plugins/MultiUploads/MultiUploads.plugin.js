/**
 * @name MultiUploads
 * @version 1.1.5
 * @invite NYvWdN5
 * @donate https://paypal.me/lighty13
 * @website https://1lighty.github.io/BetterDiscordStuff/?plugin=MultiUploads
 * @source https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/MultiUploads/MultiUploads.plugin.js
 */
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
 * Copyright © 2019-2021, _Lighty_
 * All rights reserved.
 * Code may not be redistributed, modified or otherwise taken without explicit permission.
 */
module.exports = (() => {
  /* Setup */
  const config = {
    main: 'index.js',
    info: {
      name: 'MultiUploads',
      authors: [
        {
          name: 'Lighty',
          discord_id: '239513071272329217',
          github_username: 'LightyPon',
          twitter_username: ''
        }
      ],
      version: '1.1.5',
      description: 'Multiple uploads send in a single message, like on mobile. Hold shift while pressing the upload button to only upload one. Adds ability to paste multiple times.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/MultiUploads/MultiUploads.plugin.js'
    },
    changelog: [
      {
        title: 'fixed',
        type: 'fixed',
        items: ['Fixed multi file uploads not being spoilered.', 'Fixed comment not being attached to the message if you uploaded multiple files.']
      }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { Utilities, WebpackModules, DiscordModules, ReactComponents, Logger, PluginUtilities } = Api;
    const { ChannelStore, DiscordConstants, Dispatcher, Permissions } = DiscordModules;

    const rendererFunctionClass = (() => {
      try {
        const topContext = require('electron').webFrame.top.context;
        if (topContext === window) return null;
        return topContext.Function;
      } catch {
        return null;
      }
    })();
    const originalFunctionClass = Function;
    function createSmartPatcher(patcher) {
      const createPatcher = patcher => (moduleToPatch, functionName, callback, options = {}) => {
        try {
          var origDef = moduleToPatch[functionName];
        } catch (_) {
          return Logger.error(`Failed to patch ${functionName}`);
        }
        if (rendererFunctionClass && origDef && !(origDef instanceof originalFunctionClass) && origDef instanceof rendererFunctionClass) window.Function = rendererFunctionClass;
        const unpatches = [];
        try {
          unpatches.push(patcher(moduleToPatch, functionName, callback, options) || DiscordConstants.NOOP);
        } catch (err) {
          throw err;
        } finally {
          if (rendererFunctionClass) window.Function = originalFunctionClass;
        }
        try {
          if (origDef && origDef.__isBDFDBpatched && moduleToPatch.BDFDBpatch && typeof moduleToPatch.BDFDBpatch[functionName].originalMethod === 'function') {
            /* do NOT patch a patch by ZLIb, that'd be bad and cause double items in context menus */
            if ((Utilities.getNestedProp(ZeresPluginLibrary, 'Patcher.patches') || []).findIndex(e => e.module === moduleToPatch) !== -1 && moduleToPatch.BDFDBpatch[functionName].originalMethod.__originalFunction) return;
            unpatches.push(patcher(moduleToPatch.BDFDBpatch[functionName], 'originalMethod', callback, options));
          }
        } catch (err) {
          Logger.stacktrace('Failed to patch BDFDB patches', err);
        }
        return function unpatch() {
          unpatches.forEach(e => e());
        };
      };
      return {
        ...patcher, before: createPatcher(patcher.before),
        instead: createPatcher(patcher.instead),
        after: createPatcher(patcher.after)
      };
    }

    const Patcher = createSmartPatcher(Api.Patcher);

    const _ = WebpackModules.getByProps('bindAll', 'debounce');
    const { Upload } = WebpackModules.getByProps('Upload') || {};
    const MessageDraftUtils = WebpackModules.getByProps('saveDraft');
    const FileUtils = WebpackModules.getByProps('anyFileTooLarge');
    const GenericUploaderBase = WebpackModules.find(e => e.prototype && e.prototype.upload && e.prototype.cancel && !e.__proto__.prototype.cancel);
    const MessageFileUploader = WebpackModules.find(e => e.prototype && e.prototype.upload && e.__proto__ === GenericUploaderBase);
    const UploadUtils = WebpackModules.getByProps('upload', 'instantBatchUpload', 'cancel');

    return class MultiUploads extends Plugin {
      constructor() {
        super();
        try {
          WebpackModules.getByProps('openModal', 'hasModalOpen').closeModal(`${this.name}_DEP_MODAL`);
        } catch (e) { }
        _.bindAll(this, ['UPLOAD_MODAL_POP_FILE', 'UPLOAD_MODAL_PUSH_FILES', 'UPLOAD_MODAL_CLEAR_ALL_FILES']);
      }
      onStart() {
        this.promises = { cancelled: false };
        this.patchAll();
        this.uploads = [];
        if (!Upload) throw 'Upload class could not be found';
        Dispatcher.subscribe('UPLOAD_MODAL_POP_FILE', this.UPLOAD_MODAL_POP_FILE);
        Dispatcher.subscribe('UPLOAD_MODAL_PUSH_FILES', this.UPLOAD_MODAL_PUSH_FILES);
        Dispatcher.subscribe('UPLOAD_MODAL_CLEAR_ALL_FILES', this.UPLOAD_MODAL_CLEAR_ALL_FILES);
      }

      onStop() {
        this.promises.cancelled = true;
        Patcher.unpatchAll();
        Dispatcher.unsubscribe('UPLOAD_MODAL_POP_FILE', this.UPLOAD_MODAL_POP_FILE);
        Dispatcher.unsubscribe('UPLOAD_MODAL_PUSH_FILES', this.UPLOAD_MODAL_PUSH_FILES);
        Dispatcher.unsubscribe('UPLOAD_MODAL_CLEAR_ALL_FILES', this.UPLOAD_MODAL_CLEAR_ALL_FILES);
      }

      // Replicate UploadModalStore so we keep track of our own instead
      UPLOAD_MODAL_POP_FILE() {
        this.uploads.shift();
      }
      UPLOAD_MODAL_PUSH_FILES({ files, channelId }) {
        for (const file of files) this.uploads.push(new Upload(file, channelId));
      }
      UPLOAD_MODAL_CLEAR_ALL_FILES() {
        this.uploads = [];
      }

      /* PATCHES */

      patchAll() {
        this.patchMessageFileUploader();
        this.patchUploadModal(this.promises);
        this.patchInstantBatchUpload();
      }

      patchMessageFileUploader() {
        const superagent = WebpackModules.getByProps('getXHR');
        // Reverse engineered, override it entirely with our own implementation
        Patcher.instead(MessageFileUploader.prototype, 'upload', (_this, [file, message = {}]) => {
          const noSpoilerMessage = { ...message };
          // hasSpoiler has no use here, only used to check if images should be spoilered
          delete noSpoilerMessage.hasSpoiler;
          // make a fale foče if it's multi upload, and set the name to represent how many files we're uploading
          const fakeFile = Array.isArray(file) ? ({ ...file[0], name: `Uploading ${file.length} files...` }) : file;
          // call super.upload(fakeFile, noSpoilerImage);
          // since no access to super, this is the next best thing
          GenericUploaderBase.prototype.upload.call(_this, fakeFile, noSpoilerMessage);
          const req = superagent.post(_this._url);
          // if it's multiple files, attach them, each having a different field name
          // this was reversed by snooping mobile uploads, apparently each file is its own field
          // each field being file(file index) so file0 file1 file2 file3 file4 etc, with file being the default single upload
          if (Array.isArray(file)) {
            const numMap = {};
            file.forEach((e, idx) => {
              let { name } = e;
              // ensure no other file has the same name, otherwise we'll be in a world of pain
              if (file.find((e_, idx_) => e_.name === name && idx_ < idx)) {
                if (!numMap[name]) numMap[name] = 0;
                numMap[name]++;
                const split = name.split('.');
                // no extention, just append the number
                if (split.length === 1) name = `${numMap[name]}`;
                else {
                  // extract everything before the extension, add number, then the extension
                  const beforeExt = split.slice(0, -1);
                  const ext = split.slice(-1);
                  name = `${beforeExt.join('.')}${numMap[name]}.${ext}`;
                }
              }
              // attach, with its own unique file field
              req.attach(`file${idx}`, e, (message.hasSpoiler ? 'SPOILER_' : '') + name);
            });
          } else req.attach('file', file, (message.hasSpoiler ? 'SPOILER_' : '') + file.name);
          // added on replies update, dunno why? throws error if it's not here
          req.field('payload_json', JSON.stringify(noSpoilerMessage));
          // attach all other fields, sometimes value is a non valid type though
          _.each(noSpoilerMessage, (value, key) => {
            if (!value) return;
            req.field(key, value);
          });
          req.then(e => {
            if (e.ok) _this._handleComplete();
            else _this._handleError(e.body && e.body.code);
          }, _ => _this._handleError());
          const { xhr } = req;
          if (xhr.upload) xhr.upload.onprogress = (...props) => _this._handleXHRProgress(...props);
          xhr.addEventListener('progress', _this._handleXHRProgress, false);
          _this._handleStart(_ => req.abort());
        });
      }

      async patchUploadModal(promiseState) {
        const Upload = await ReactComponents.getComponentByName('Upload', `.${WebpackModules.getByProps('uploadModal').uploadModal.split(' ')[0]}`);
        if (promiseState.cancelled) return;
        const ParseUtils = WebpackModules.getByProps('parsePreprocessor');
        const WYSIWYGSerializeDeserialize = WebpackModules.getByProps('serialize', 'deserialize');
        const UploadModalUtils = WebpackModules.getByProps('popFirstFile');
        // our own function, just to check if we can send multiple messages at once
        Patcher.instead(Upload.component.prototype, 'canSendBulk', _this => {
          const { channel } = _this.props;
          if (!channel.rateLimitPerUser) return true;
          return Permissions.can(DiscordConstants.Permissions.MANAGE_CHANNELS, channel) || Permissions.can(DiscordConstants.Permissions.MANAGE_MESSAGES, channel);
        });
        // override this function in particular as it's easy to patch and is run after all checks are validated
        // which are @everyone, slowmode, whatnot
        Patcher.instead(Upload.component.prototype, 'submitUpload', (_this, [valid, content, upload, channel, hasSpoiler], orig) => {
          if (!valid || upload === null || !_this.props.hasAdditionalUploads || _this.__MU_onlySingle) return orig(valid, content, upload, channel, hasSpoiler);
          let parsed = ParseUtils.parse(channel, content);
          MessageDraftUtils.saveDraft(channel.id, '');
          _this.setState({
            textFocused: false,
            textValue: '',
            richValue: WYSIWYGSerializeDeserialize.deserialize('')
          });

          const canSendAll = _this.canSendBulk();

          // fetch group of files we can send in 1 message
          let files = this.getNextMessageGroup(channel.id);
          // upload them after a set timeout
          const startUpload = e => setTimeout(_ => (UploadUtils.upload(channel.id, files, _this.props.draftType, parsed, hasSpoiler), e && e()), 125);
          if (canSendAll) {
            // if we can send all of them, store the array locally because it'll be cleared at the end of this function
            const uploads = [...this.uploads];
            const start = _ => startUpload(_ => {
              // clear parsed, so we don't send same text multiple times
              parsed = { content: '', invalidEmojis: [], tts: false, validNonShortcutEmojis: [] };
              // remove previously sent files
              uploads.splice(0, files.length);
              if (!uploads.length) return;
              // fetch next group of files we can send in 1 message
              files = this.getNextMessageGroup(channel.id, uploads);
              start();
            });
            start();
          } else startUpload();

          // replica of the showNextFile function with only slight differences
          if (!canSendAll && files.length !== this.uploads.length) {
            _this.setState({
              transitioning: true
            });
            setTimeout(
              (() => {
                // clear multiple times
                for (let i = 0; i < files.length; i++) UploadModalUtils.popFirstFile();
              }
              ), 100
            );
            _this._transitionTimeout = setTimeout(
              (() => _this.setState({
                transitioning: false
              })
              ), 200
            );
          } else {
            // clear all instead of one
            UploadModalUtils.clearAll();
            _this.props.onClose();
          }
        });
        Patcher.instead(Upload.component.prototype, '_confirm', (_this, [e]) => {
          _this.__MU_onlySingle = e ? e.shiftKey : false;
          return _this._olConfirm();
        });
        const patchId = _.uniqueId('MultiUploads');
        Patcher.before(Upload.component.prototype, 'renderFooter', _this => {
          if (_this.handleSubmit.__MU_patched === patchId) return;
          if (!_this._olConfirm) _this._olConfirm = _this.confirm;
          _this.confirm = _this._confirm.bind(_this);
          _this.confirm.__MU_patched = patchId;
        });
        Patcher.after(Upload.component.prototype, 'renderFooter', (_this, _, ret) => {
          if (!_this.props.hasAdditionalUploads) return;
          const buttons = Utilities.findInReactTree(ret, e => Array.isArray(e) && e.find(e => e && e.props && e.props.onClick === _this.cancel));
          const uploadButtonProps = Utilities.findInReactTree(buttons, e => e && typeof e.children === 'function');
          if (!uploadButtonProps) return;
          const oChildren = uploadButtonProps.children;
          uploadButtonProps.children = e => {
            try {
              const ret = oChildren(e);
              if (_this.props.hasAdditionalUploads) {
                const uploadButton = Utilities.findInReactTree(ret, e => e && e.onClick === _this.confirm);
                const group = this.getNextMessageGroup(_this.props.channel.id);
                const { props } = uploadButton.children;
                if (group.length === this.uploads.length || _this.canSendBulk()) props.children = 'Upload All';
                else if (group.length > 1) props.children = `Upload ${group.length}`;
              }
              return ret;
            } catch (err) {
              Logger.stacktrace('Failed patching Upload button', err);
              try {
                return oChildren(e);
              } catch (err) {
                Logger.stacktrace('Failed calling original Upload button func', err);
                return null;
              }
            }
          };
        });
        const promptToUpload = WebpackModules.getByString('.Messages.UPLOAD_AREA_TOO_LARGE_TITLE');
        Patcher.after(Upload.component.prototype, 'render', (_this, _, ret) => {
          const channelTextEditorContainer = Utilities.findInReactTree(ret, e => Utilities.getNestedProp(e, 'type.type.render.displayName') === 'ChannelTextAreaContainer');
          if (!channelTextEditorContainer) return;
          channelTextEditorContainer.props.promptToUpload = promptToUpload;
        });
        Upload.forceUpdateAll();
      }

      patchInstantBatchUpload() {
        Patcher.instead(UploadUtils, 'instantBatchUpload', (_, [channelId, files], orig) => {
          if (files.length === 1) return orig(channelId, files);
          let fileGroup = this.getNextMessageGroup(channelId, files);
          const startUpload = e => setTimeout(_ => (UploadUtils.upload(channelId, fileGroup), e && e()), 125);
          const uploads = [...files];
          const start = _ => startUpload(_ => {
            uploads.splice(0, fileGroup.length);
            if (!uploads.length) return;
            fileGroup = this.getNextMessageGroup(channelId, uploads);
            start();
          });
          start();
        });
      }

      getNextMessageGroup(channelId, uploads = this.uploads) {
        const { guild_id } = ChannelStore.getChannel(channelId);
        const maxSize = FileUtils.maxFileSize(guild_id);
        if (!uploads.length) return [];
        const isUpload = !!uploads[0].file;
        const retAccum = [isUpload ? uploads[0].file : uploads[0]];
        let sizeAccum = isUpload ? uploads[0].file.size : uploads[0].size;
        for (let i = 1, len = uploads.length; i < len; i++) {
          const { file } = isUpload ? uploads[i] : { file: uploads[i] };
          if (sizeAccum + file.size > maxSize) break;
          retAccum.push(file);
          sizeAccum += file.size;
          if (retAccum.length >= 10) break;
        }
        return retAccum;
      }

      /* PATCHES */

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
    const a = (c, a) => ((c = c.split('.').map(b => parseInt(b))), (a = a.split('.').map(b => parseInt(b))), !!(a[0] > c[0])) || !!(a[0] == c[0] && a[1] > c[1]) || !!(a[0] == c[0] && a[1] == c[1] && a[2] > c[2]),
      b = BdApi.Plugins.get('ZeresPluginLibrary');
    ((b, c) => b && b._config && b._config.info && b._config.info.version && a(b._config.info.version, c))(b, '1.2.29') && (ZeresPluginLibraryOutdated = !0);
  } catch (e) {
    console.error('Error checking if ZeresPluginLibrary is out of date', e);
  }

  return !global.ZeresPluginLibrary || ZeresPluginLibraryOutdated || window.BDModules
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
        return this.description + window.BDModules ? '' : 'You are missing ZeresPluginLibrary for this plugin, please enable the plugin and click Download Now.';
      }
      start() { }
      stop() { }
      handleMissingLib() {
        if (window.BDModules) return;
        const a = BdApi.findModuleByProps('openModal', 'hasModalOpen');
        if (a && a.hasModalOpen(`${this.name}_DEP_MODAL`)) return;
        const b = !global.ZeresPluginLibrary,
          c = ZeresPluginLibraryOutdated ? 'Outdated Library' : 'Missing Library',
          d = `The Library ZeresPluginLibrary required for ${this.name} is ${ZeresPluginLibraryOutdated ? 'outdated' : 'missing'}.`,
          e = BdApi.findModuleByDisplayName('Text'),
          f = BdApi.findModuleByDisplayName('ConfirmModal'),
          g = () => BdApi.alert(c, BdApi.React.createElement('span', {}, BdApi.React.createElement('div', {}, d), 'Due to a slight mishap however, you\'ll have to download the libraries yourself. This is not intentional, something went wrong, errors are in console.', b || ZeresPluginLibraryOutdated ? BdApi.React.createElement('div', {}, BdApi.React.createElement('a', { href: 'https://betterdiscord.net/ghdl?id=2252', target: '_blank' }, 'Click here to download ZeresPluginLibrary')) : null));
        if (!a || !f || !e) return console.error(`Missing components:${(a ? '' : ' ModalStack') + (f ? '' : ' ConfirmationModalComponent') + (e ? '' : 'TextElement')}`), g();
        class h extends BdApi.React.PureComponent {
          constructor(a) {
            super(a), (this.state = { hasError: !1 });
          }
          componentDidCatch(a) {
            console.error(`Error in ${this.props.label}, screenshot or copy paste the error above to Lighty for help.`), this.setState({ hasError: !0 }), typeof this.props.onError === 'function' && this.props.onError(a);
          }
          render() {
            return this.state.hasError ? null : this.props.children;
          }
        }
        let i = !1,
          j = !1;
        const k = a.openModal(
          b => {
            if (j) return null;
            try {
              return BdApi.React.createElement(
                h,
                {
                  label: 'missing dependency modal',
                  onError: () => {
                    a.closeModal(k), g();
                  }
                },
                BdApi.React.createElement(
                  f,
                  {
                    header: c,
                    children: BdApi.React.createElement(e, { size: e.Sizes.SIZE_16, children: [`${d} Please click Download Now to download it.`] }),
                    red: !1,
                    confirmText: 'Download Now',
                    cancelText: 'Cancel',
                    onCancel: b.onClose,
                    onConfirm: () => {
                      if (i) return;
                      i = !0;
                      const b = require('request'),
                        c = require('fs'),
                        d = require('path');
                      b('https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js', (b, e, f) => {
                        try {
                          if (b || e.statusCode !== 200) return a.closeModal(k), g();
                          c.writeFile(d.join(BdApi.Plugins && BdApi.Plugins.folder ? BdApi.Plugins.folder : window.ContentManager.pluginsFolder, '0PluginLibrary.plugin.js'), f, () => { });
                        } catch (b) {
                          console.error('Fatal error downloading ZeresPluginLibrary', b), a.closeModal(k), g();
                        }
                      });
                    },
                    ...b,
                    onClose: () => { }
                  }
                )
              );
            } catch (b) {
              return console.error('There has been an error constructing the modal', b), (j = !0), a.closeModal(k), g(), null;
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
