/**
 * @name MessageLoggerV2
 * @version 1.10.5
 * @invite NYvWdN5
 * @donate https://paypal.me/lighty13
 * @website https://1lighty.github.io/BetterDiscordStuff/?plugin=MessageLoggerV2
 * @source https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/MessageLoggerV2/MessageLoggerV2.plugin.js
 * @updateUrl https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/MessageLoggerV2/MessageLoggerV2.plugin.js
 * @runAt idle
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
@else @*/
/*
 * Copyright © 2019-2026, 1Lighty
 * All rights reserved.
 * Code may not be redistributed, modified or otherwise taken without explicit permission.
 */


const MLV2_TYPE_L1 = Symbol('MLV2_TYPE_L1');
const MLV2_TYPE_L2 = Symbol('MLV2_TYPE_L2');
const MLV2_TYPE_L3 = Symbol('MLV2_TYPE_L3');
const USER_COUNTER_INTERVAL = 1000 * 60 * 60 * 24 * 1;

const { React, Webpack, Logger, Utils: { className } } = BdApi;

module.exports = class MessageLoggerV2 {
  getName() {
    return 'MessageLoggerV2';
  }
  getVersion() {
    return '1.10.5';
  }
  getAuthor() {
    return 'Lighty';
  }
  getDescription() {
    return 'Saves all deleted and purged messages, as well as all edit history and ghost pings. With highly configurable ignore options, and even restoring deleted messages after restarting Discord.';
  }
  load() { }
  start() {
    let onLoaded = () => {
      try {
        if (!this.UserStore) this.UserStore = Webpack.getByKeys('getCurrentUser', 'getUser');
        if (!this.UserStore || !(this.localUser = this.UserStore.getCurrentUser())) setTimeout(onLoaded, 1000);
        else this.initialize();
      } catch (err) {
        Logger.stacktrace(this.getName(), 'Failed to start!', err);
        Logger.error(this.getName(), `If you cannot solve this yourself, contact ${this.getAuthor()} and provide the errors shown here.`);
        this.stop();
        BdApi.UI.showNotification({
          title: this.getName(),
          content: `Failed to start! Try to CTRL + R, or update the plugin` /* , like so\n![image](https://i.imgur.com/tsv6aW8.png) */,
          duration: Infinity, // this.. feels dirty? I don't like how limited the built in notificaiton system is compared to mine, I'll be honest
          type: 'error'
        });
      }
    };
    this.pluginDir = BdApi.Plugins.folder;
    onLoaded();
  }
  stop() {
    try {
      this.shutdown();
      const currLocation = globalThis?.location?.pathname;
      const transitionTo = Webpack.getByStrings('transitionTo - Transitioning to ', { searchExports: true }) || (() => { });
      transitionTo('/channels/@me'); // dirty fix for crash
      if (currLocation) setTimeout(() => transitionTo(currLocation), 500);
    } catch (err) {
      // Logger.stacktrace(this.getName(), 'Failed to stop!', err);
    }
  }
  getChanges() {
    return [
      {
        title: 'Fixed',
        type: 'fixed',
        items: [
          'Fixed settings menu ceasing to function',
        ]
      },
      {
        title: 'MessageLoggerV2 is now standalone!',
        type: 'progress',
        items: [
          '----> **YOU CAN SAFELY DELETE XENOLIB AND ZERESPLUGINLIBRARY** <----',
          'You MUST delete them if you still have them!!'
        ]
      }
    ];
  }

  showChangelog() {
    const AnchorClasses = Webpack.getByKeys('anchor', 'anchorUnderlineOnHover') || {};
    const renderFooter = () => [
      React.createElement(this.TextElement || 'span',
        {
          variant: 'text-xs/normal'
        }, 'Need support? ',
        React.createElement('a', {
          className: className(AnchorClasses.anchor, AnchorClasses.anchorUnderlineOnHover),
          onClick: () => BdApi.UI.showInviteModal('NYvWdN5')
        },
          'Join my support server'
        ),
        '! Or consider donating via ',
        React.createElement('a', {
          className: className(AnchorClasses.anchor, AnchorClasses.anchorUnderlineOnHover),
          onClick: () => window.open('https://paypal.me/lighty13')
        },
          'Paypal'
        ),
        ', ',
        React.createElement('a', {
          className: className(AnchorClasses.anchor, AnchorClasses.anchorUnderlineOnHover),
          onClick: () => window.open('https://ko-fi.com/lighty_')
        },
          'Ko-fi'
        ),
        '!',
        '\nBy using these plugins, you agree to being part of the anonymous user counter, unless disabled in settings.'
      )
    ];
    BdApi.UI.showChangelogModal({
      title: `${this.getName()} has been updated!`,
      subtitle: `Version ${this.getVersion()}`,
      footer: renderFooter(),
      changes: this.getChanges()
    });
  }

  initialize() {
    if (this.__started) return BdApi.UI.showNotification({ title: this.getName(), content: `Tried to start twice..`, type: 'warning' });
    this.__started = true;

    const lodash = this.lodash = Webpack.getByKeys('bindAll', 'debounce');

    let defaultSettings = {
      obfuscateCSSClasses: true,
      autoBackup: false,
      dontSaveData: false,
      displayUpdateNotes: true,
      ignoreMutedGuilds: true,
      ignoreMutedChannels: true,
      ignoreBots: true,
      ignoreSelf: false,
      ignoreBlockedUsers: true,
      ignoreNSFW: false,
      ignoreLocalEdits: false,
      ignoreLocalDeletes: false,
      alwaysLogGhostPings: false,
      showOpenLogsButton: true,
      messageCacheCap: 1000,
      savedMessagesCap: 10000,
      reverseOrder: true,
      onlyLogWhitelist: true,
      whitelist: [],
      blacklist: [],
      notificationBlacklist: [],
      toastToggles: {
        sent: false,
        edited: true,
        deleted: true,
        ghostPings: true
      },
      toastTogglesDMs: {
        sent: false,
        edited: true,
        deleted: true,
        ghostPings: true,
        disableToastsForLocal: false
      },
      useNotificationsInstead: true,
      blockSpamEdit: false,
      disableKeybind: false,
      cacheAllImages: true,
      dontDeleteCachedImages: false,
      aggresiveMessageCaching: true,
      // openLogKeybind: [
      //   /* 162, 77 */
      // ], // ctrl + m on windows
      // openLogFilteredKeybind: [
      //   /* 162, 78 */
      // ], // ctrl + n on windows
      renderCap: 50,
      maxShownEdits: 5,
      hideNewerEditsFirst: true,
      displayDates: true,
      deletedMessageColor: '',
      editedMessageColor: '',
      useAlternativeDeletedStyle: false,
      showEditedMessages: true,
      showDeletedMessages: true,
      showPurgedMessages: true,
      showDeletedCount: true,
      showEditedCount: true,
      alwaysLogSelected: true,
      alwaysLogDM: true,
      restoreDeletedMessages: true,
      contextmenuSubmenuName: 'Message Logger',
      streamSafety: {
        showEdits: false,
        showDeletes: false,
        showButton: false,
        showNotifications: false,
        showContextMenu: false
      },
      imageCacheDir: this.pluginDir + '/MLV2_IMAGE_CACHE',
      flags: 0,
      autoUpdate: true,
      versionInfo: '0.0.0',
      userCounter: {
        enabled: true,
        enableTime: 0,
        lastSubmission: 0
      }
    };
    const Flags = {
      STOLEN: 1 << 0,
      STARTUP_HELP: 1 << 1
    };

    this.settings = this.loadData(this.getName(), 'settings', defaultSettings);
    let settingsChanged = false;

    if (this.settings.versionInfo === '1.7.55') {
      this.settings = lodash.cloneDeep(defaultSettings); // bad default settings
      settingsChanged = true;
    }

    if (this.settings.autoUpdate) {
      if (this._autoUpdateInterval) clearInterval(this._autoUpdateInterval);
      this._autoUpdateInterval = setInterval(_ => this.automaticallyUpdate(), 1000 * 60 * 60); // 1 hour
      this.automaticallyUpdate();
    }

    this.TextElement = Webpack.getBySource('"data-text-variant"', { declarationFilter: e => e?.toString?.()?.includes('"data-text-variant"') });

    if (global.XenoLib || global.ZeresPluginLibrary) {
      BdApi.UI.showConfirmationModal('XenoLib and ZeresPluginLibrary EOL', 'The libraries are deprecated and can cause issues, click Delete Now to delete them. Your Discord will refresh after.', {
        cancelText: null, confirmText: 'Delete Now', onConfirm: () => {
          const fs = require('fs');
          const path = require('path');
          const xenolibPath = BdApi.Plugins.get('XenoLib')?.filename;
          const zereslibPath = BdApi.Plugins.get('ZeresPluginLibrary')?.filename;
          if (xenolibPath) try {
            fs.unlinkSync(path.join(BdApi.Plugins.folder, xenolibPath));
          } catch (err) { }
          if (zereslibPath) try {
            fs.unlinkSync(path.join(BdApi.Plugins.folder, zereslibPath));
          } catch (err) { }
          location.reload(); // needed evil
        }
      });
      // have to do this else if to avoid overlapping modals, the user might just skip thru them
    } else if (this.settings.versionInfo !== this.getVersion() && this.settings.displayUpdateNotes) {
      this.showChangelog();
      this.settings.versionInfo = this.getVersion();
      settingsChanged = true;
    }

    if (settingsChanged) this.saveSettings();

    this.nodeModules = {
      electron: require('electron'),
      request: require('request'),
      fs: require('fs'),
      path: require('path')
    };

    let defaultConstruct = () => {
      return Object.assign(
        {},
        {
          messageRecord: {},
          deletedMessageRecord: {},
          editedMessageRecord: {},
          purgedMessageRecord: {}
        }
      );
    };
    let data;
    if (this.settings.dontSaveData) {
      data = defaultConstruct();
    } else {
      data = this.loadData(this.getName() + 'Data', 'data', defaultConstruct());
      const isBad = map => !(map && map.messageRecord && map.editedMessageRecord && map.deletedMessageRecord && map.purgedMessageRecord && typeof map.messageRecord == 'object' && typeof map.editedMessageRecord == 'object' && typeof map.deletedMessageRecord == 'object' && typeof map.purgedMessageRecord == 'object');
      if (isBad(data)) {
        if (this.settings.autoBackup) {
          data = this.loadData(this.getName() + 'Data', 'data', defaultConstruct());
          if (isBad(data)) {
            BdApi.UI.showNotification({ title: this.getName(), content: `Data and backup files were corrupted. All deleted/edited/purged messages have been erased.`, duration: Infinity, type: 'error' });
            data = defaultConstruct();
          } else {
            BdApi.UI.showNotification({ title: this.getName(), content: 'Data was corrupted, loaded backup!', type: 'warning' });
          }
        } else {
          BdApi.UI.showNotification({ title: this.getName(), content: 'Data was corrupted! Recommended to turn on auto backup in settings! All deleted/edited/purged messages have been erased.', duration: Infinity, type: 'error' });
          data = defaultConstruct();
        }
      }
    }
    /*
    const dataFileSize = this.nodeModules.fs.statSync(this.pluginDir + '/MessageLoggerV2Data.config.json').size / 1024 / 1024;
    // SEVERITY
    // 0 OK < 5MiB
    // 1 MILD < 10MiB
    // 2 DANGER < 20MiB
    // 3 EXTREME > 20MiB
    this.slowSaveModeStep = dataFileSize > 20 ? 3 : dataFileSize > 10 ? 2 : dataFileSize > 5 ? 1 : 0;
    ZeresPluginLibrary.Logger.info(this.getName(), `Data file size is ${dataFileSize.toFixed(2)}MB`);
    if (this.slowSaveModeStep) Logger.warn(this.getName(), 'Data file is too large, severity level', this.slowSaveModeStep);
*/

    this.messageStore = Webpack.Stores.MessageStore;

    this.ChannelStore = Webpack.Stores.ChannelStore;
    this.SelectedChannelStore = Webpack.Stores.SelectedChannelStore;

    if (!this.settings.dontSaveData) {
      const records = data.messageRecord;
      // data structure changed a wee bit, compensate instead of deleting user data or worse, erroring out
      for (let a in records) {
        const record = records[a];
        if (record.deletedata) {
          if (record.deletedata.deletetime) {
            record.delete_data = {};
            record.delete_data.time = record.deletedata.deletetime;
          }
          delete record.deletedata;
        } else if (record.delete_data && typeof record.delete_data.rel_ids !== 'undefined') delete record.delete_data.rel_ids;
        if (record.editHistory) {
          record.edit_history = [];
          for (let b in record.editHistory) {
            record.edit_history.push({ content: record.editHistory[b].content, time: record.editHistory[b].editedAt });
          }
          delete record.editHistory;
        }
        record.message = this.cleanupMessageObject(record.message); // fix up our past mistakes by sweeping it under the rug!
      }
    }

    this.cachedMessageRecord = [];
    this.messageRecord = data.messageRecord;
    this.deletedMessageRecord = data.deletedMessageRecord;
    this.editedMessageRecord = data.editedMessageRecord;
    this.purgedMessageRecord = data.purgedMessageRecord;
    this.tempEditedMessageRecord = {};
    this.editHistoryAntiSpam = {};
    this.localDeletes = [];

    this.settings.imageCacheDir = this.pluginDir + '/MLV2_IMAGE_CACHE';

    const imageCacheDirFailure = () => {
      this.settings.imageCacheDir = this.pluginDir + '/MLV2_IMAGE_CACHE';
      BdApi.UI.showNotification({ title: this.getName(), content: 'Failed to access custom image cache dir. It has been reset to plugins folder!', type: 'error' });
    };

    if (this.settings.cacheAllImages && !this.nodeModules.fs.existsSync(this.settings.imageCacheDir)) {
      try {
        this.nodeModules.fs.mkdirSync(this.settings.imageCacheDir);
      } catch (e) {
        imageCacheDirFailure();
      }
    }

    if (!this._imageCacheServer) {
      class ImageCacheServer {
        constructor(imagePath, name) {
          try {
            Webpack.getByKeys('bindAll', 'debounce').bindAll(this, ['_requestHandler', '_errorHandler']);
            this._server = require('http').createServer(this._requestHandler); // fuck bd 👍
            this._getMimetype = require('mime-types').lookup;
            this._parseURL = require('url').parse;
            this._fs = require('fs');
            this._path = require('path');
            this._imagePath = imagePath;
            this._name = name;
          } catch (err) {
            //Logger.error(this._name, 'Error in ImageCacheServer', err);
          }
        }
        start() {
          try {
            this._server.listen(7474, 'localhost', this._errorHandler);
          } catch (err) {
            //Logger.error(this._name, 'Error in ImageCacheServer', err);
          }
        }
        stop() {
          try {
            this._server.close();
          } catch (err) {
            //Logger.error(this._name, 'Error in ImageCacheServer', err);
          }
        }
        _errorHandler(err) {
          if (err) return Logger.error(this._name, 'Error in ImageCacheServer', err);
          Logger.info(this._name, 'ImageCacheServer: OK');
        }
        _requestHandler(req, res) {
          // parse URL
          const parsedUrl = this._parseURL(req.url);
          const parsedFile = this._path.parse(parsedUrl.pathname);
          // extract URL path
          let pathname = this._path.join(this._imagePath, parsedFile.base);
          console.log(pathname);
          this._fs.readFile(pathname, (err, data) => {
            if (err) {
              res.statusCode = 404;
              res.end(`No such file file: ${err}.`);
            } else {
              // if the file is found, set Content-type and send data
              res.setHeader('Content-type', this._getMimetype(parsedFile.ext));
              res.end(data);
            }
          });
        }
      }
      this._imageCacheServer = new ImageCacheServer(this.settings.imageCacheDir, this.getName());
    }
    this._imageCacheServer.start();

    defaultConstruct = undefined;

    /* backport from MLV3/rewrite */
    const CUser = Webpack.getByPrototypeKeys('getAvatarSource', 'isLocalBot');
    const userRecord = {};
    const lastSeenUser = {};
    for (const messageId in this.messageRecord) {
      const record = this.messageRecord[messageId];
      const userObj = record.message.author;
      if (!userObj || typeof userObj === 'string') continue;
      const date = new Date(record.message.timestamp);
      if (!(userRecord[userObj.id] && lastSeenUser[userObj.id] && lastSeenUser[userObj.id] > date)) {
        userRecord[userObj.id] = userObj;
        lastSeenUser[userObj.id] = date;
      }
    }

    // will revisit later if this becomes an issue, had a workaround for BDFDB
    this.Patcher = {
      before: (mod, func, cb) => BdApi.Patcher.before(this.getName(), mod, func, cb),
      // the instead patcher used to bind `this` context before handing over the orig function
      instead: (mod, func, cb) => BdApi.Patcher.instead(this.getName(), mod, func, (thisObj, args, orig) => cb(thisObj, args, (...aargs) => orig.call(thisObj, ...aargs))),
      after: (mod, func, cb) => BdApi.Patcher.after(this.getName(), mod, func, cb),
      unpatchAll: () => BdApi.Patcher.unbindAll(this.getName())
    };

    this.unpatches = [];

    this.unpatches.push(
      this.Patcher.after(this.UserStore, 'getUser', (_this, args, ret) => {
        if (!ret && !args[1]) {
          const userId = args[0];
          const users = this.UserStore.getUsers();
          if (userRecord[userId]) return (users[userId] = new CUser(userRecord[userId]));
        }
      })
    );

    const isMentioned = Webpack.getModule(e => typeof e === 'function' && e?.toString()?.includes('mentionEveryone') && e?.toString()?.includes('roles.includes'), { searchExports: true });
    const MessageActions = Webpack.getByKeys('fetchMessages', 'jumpToMessage');

    this.tools = {
      openUserContextMenu: null /* NeatoLib.Modules.get('openUserContextMenu').openUserContextMenu */, // TODO: move here
      getMessage: this.messageStore.getMessage,
      fetchMessages: MessageActions.fetchMessages.bind(MessageActions),
      transitionTo: Webpack.getByStrings('transitionTo - Transitioning to ', { searchExports: true }) || (() => { }),
      getChannel: this.ChannelStore.getChannel,
      copyToClipboard: global.copy,
      getServer: Webpack.getByKeys('getGuild', 'getGuildCount').getGuild,
      getUser: this.UserStore.getUser,
      parse: Webpack.getByKeys('parse', 'astParserFor').parse,
      getUserAsync: /* Webpack.getByKeys('getUser', 'acceptAgreements').getUser */ () => Promise.resolve(),
      isBlocked: Webpack.getByKeys('isBlocked').isBlocked,
      createMomentObject: Webpack.getByKeys('createFromInputFallback'),
      isMentioned: (e, id) => isMentioned({ userId: id, channelId: e.channel_id, mentionEveryone: e.mentionEveryone || e.mention_everyone, mentionUsers: e.mentions.map(e => e.id || e), mentionRoles: e.mentionRoles || e.mention_roles, mentionGames: [] }),
    };

    const { getClass } = this;

    this.createButton.classes = {
      button: (function () {
        let buttonData = Webpack.getByKeys('button', 'colorBrand');
        return `${buttonData.button} ${buttonData.lookFilled} ${buttonData.colorBrand} ${buttonData.sizeSmall} ${buttonData.grow}`;
      })(),
      buttonContents: getClass('button colorBrand contents')
    };

    this.safeGetClass = (func, fail, heckoff) => {
      try {
        return func();
      } catch (e) {
        if (heckoff) return fail;
        return fail + '-MLV2';
      }
    };

    this.multiClasses = {
      defaultColor: getClass('defaultColor'),
      get edited() {
        delete this.edited;
        return this.edited = className(getClass('separator timestamp'), getClass('separator timestampInline'));
      },
      markup: Webpack.getByKeys('markup')['markup'],
      message: {
        cozy: {
          containerBounded: this.safeGetClass(() => getClass('containerCozyBounded', true), 'containerCozyBounded'),
          header: this.safeGetClass(() => getClass('containerCozyBounded', true), 'headerCozy'),
          avatar: this.safeGetClass(() => getClass('containerCozyBounded', true), 'avatar'),
          headerMeta: this.safeGetClass(() => getClass('containerCozyBounded', true), 'headerCozyMeta'),
          username: this.safeGetClass(() => getClass('containerCozyBounded', true), 'username'),
          timestamp: this.safeGetClass(() => getClass('containerCozyBounded', true), 'timestampCozy'),
          content: this.safeGetClass(() => getClass('containerCozyBounded', true), 'contentCozy')
        }
      }
    };

    this.classes = {
      markup: this.getSingleClass('markup'),
      hidden: this.getSingleClass('spoilerContent hidden'),
      /* messages: this.safeGetClass(
        () => `.${Webpack.getByKeys('container', 'containerCompactBounded').container.split(/ /g)[0]} > div:not(.${Webpack.getByKeys('content', 'marginCompactIndent').content.split(/ /g)[0]})`,
        this.safeGetClass(() => `.${this.getSingleClass('scroller messages')} > .${this.getSingleClass('channelTextArea message')}`, 'Lighty-youre-a-failure-my-fucking-god'),
        true
      ), not even used...? */
      avatar: this.safeGetClass(() => this.getSingleClass('header avatar', true), 'avatar-MLV2')
    };

    this.muteModule = BdApi.Webpack.Stores.UserGuildSettingsStore;

    this.menu = {};
    this.menu.classes = {};
    this.menu.filter = '';
    this.menu.open = false;;

    const chatContent = Webpack.getByKeys('chatContent');
    this.observer.chatContentClass = ((chatContent && chatContent.chatContent) || 'chat-3bRxxu').split(/ /g)[0];
    this.observer.chatClass = this.getClass('chatContent chat') || 'chat_f75fb0';
    this.observer.titleClass = !chatContent ? 'ERROR-CLASSWTF' : this.getSingleClass('chatContent title');
    this.observer.containerCozyClass = this.safeGetClass(() => this.getSingleClass('containerCozyBounded', true), 'containerCozyBounded');

    this.localUser = this.UserStore.getCurrentUser();

    this.ModalStack = Webpack.getByKeys("openModal");

    this.deletedChatMessagesCount = {};
    this.editedChatMessagesCount = {};

    this.channelMessages = BdApi.Webpack.getByKeys('_channelMessages')?._channelMessages;

    if (!this.channelMessages) {
      Logger.error(this.getName(), 'Failed to find _channelMessages!');
      BdApi.UI.showNotification({ title: this.getName(), content: 'Failed to start plugin! Critical error: _channelMessagesf not found!', duration: Infinity, type: 'error' });
      return;
    }

    this.autoBackupSaveInterupts = 0;

    // have to patch (what was previously named) messageHasExpiredAttachmentUrl, otherwise Discord will needlessly
    // reload the channel causing scrolling issues, quite annoying!
    const AttachmentUtils = Webpack.getBySource('(["/attachments/","/ephemeral-attachments/"])');

    if (AttachmentUtils) {
      try {
        const targetName = Object.keys(AttachmentUtils).find(e => AttachmentUtils[e].toString().match(/return \w\.attachments\.some\(\w\)\|\|\w\.embeds\.some\(\w\)/));
        if (!targetName) throw new Error('Failed to find targetName');
        this.unpatches.push(
          this.Patcher.instead(AttachmentUtils, targetName, (_, args, original) => {
            const [message] = args;
            // check if ID is in messageRecord and force return false
            if (message.id && this.messageRecord[message.id]) return false;

            // run original otherwise to not interfere
            return original(...args);
          }
          )
        );
      } catch (e) {
        Logger.warn(this.getName(), 'Failed to patch AttachmentUtils!', e);
      }
    } else Logger.warn(this.getName(), 'Failed to find AttachmentUtils!');



    // unsure if this will stay functional, but last time I checked this ONLY returns the correct dispatcher since this specific filter
    // only matches all stores that use the main dispatcher
    this.dispatcher = Webpack.getByKeys('_dispatcher')?._dispatcher;

    if (!this.dispatcher) {
      Logger.error(this.getName(), 'Failed to find Dispatcher!');
      BdApi.UI.showNotification({ title: this.getName(), content: 'Failed to start plugin! Critical error: dispatcher not found!', duration: Infinity, type: 'error' });
      return;
    }

    this.unpatches.push(
      this.Patcher.instead(
        this.dispatcher,
        'dispatch',
        (_, args, original) => this.onDispatchEvent(args, original)
      )
    );
    this.unpatches.push(
      this.Patcher.instead(MessageActions, 'startEditMessage', (_, args, original) => {
        const channelId = args[0];
        const messageId = args[1];
        if (this.deletedMessageRecord[channelId] && this.deletedMessageRecord[channelId].indexOf(messageId) !== -1) return;
        return original(...args);
      })
    );

    this.noTintIds = [];
    this.editModifiers = {};

    this.style = {};

    this.style.deleted = this.obfuscatedClass('ml2-deleted');
    this.style.deletedAlt = this.obfuscatedClass('ml2-deleted-alt');
    this.style.edited = this.obfuscatedClass('ml2-edited');
    this.style.editedCompact = this.obfuscatedClass('ml2-edited-compact');
    this.style.tab = this.obfuscatedClass('ml2-tab');
    this.style.tabSelected = this.obfuscatedClass('ml2-tab-selected');
    this.style.textIndent = this.obfuscatedClass('ml2-help-text-indent');
    this.style.menuModalLarge = this.obfuscatedClass('MLv2-menu-modal-large');
    this.style.menu = this.obfuscatedClass('ML2-MENU');
    this.style.openLogs = this.obfuscatedClass('ML2-OL');
    this.style.filter = this.obfuscatedClass('ML2-FILTER');
    this.style.menuMessages = this.obfuscatedClass('ML2-MENU-MESSAGES');
    this.style.menuTabBar = this.obfuscatedClass('ML2-MENU-TABBAR');
    this.style.menuRoot = this.obfuscatedClass('MLv2-menu-root');
    this.style.imageRoot = this.obfuscatedClass('MLv2-image-root');
    this.style.inputWrapper = this.obfuscatedClass('MLv2-input-wrapper');
    this.style.multiInput = this.obfuscatedClass('MLv2-input');
    this.style.multiInputFirst = this.obfuscatedClass('MLv2-input-first');
    this.style.input = this.obfuscatedClass('MLv2-input-input');
    this.style.questionMark = this.obfuscatedClass('MLv2-question-mark');
    this.style.tabBarContainer = this.obfuscatedClass('MLv2-tab-bar-container');
    this.style.tabBar = this.obfuscatedClass('MLv2-tab-bar');
    this.style.tabBarItem = this.obfuscatedClass('MLv2-tab-bar-item');

    this.invalidateAllChannelCache();
    this.selectedChannel = this.getSelectedTextChannel();
    if (this.selectedChannel) this.cacheChannelMessages(this.selectedChannel.id);

    // todo: custom deleted message text color
    BdApi.DOM.addStyle(
      (this.style.css = !this.settings.obfuscateCSSClasses ? 'ML2-CSS' : this.randomString()),
      `
                .${this.style.deleted} .${this.classes.markup}, .${this.style.deleted} .${this.classes.markup} .hljs, .${this.style.deleted} .container-1ov-mD *{
                    color: #f04747 !important;
                }
                html #app-mount .${this.style.deletedAlt} {
                  background-color: rgba(240, 71, 71, 0.15) !important;
                }
                html #app-mount .${this.style.deletedAlt}:hover, html #app-mount .${this.style.deletedAlt}.selected-2P5D_Z {
                  background-color: rgba(240, 71, 71, 0.10) !important;
                }
                .theme-dark .${this.classes.markup}.${this.style.edited} .${this.style.edited} {
                    filter: brightness(70%);
                }
                .theme-light .${this.classes.markup}.${this.style.edited} .${this.style.edited} {
                    opacity: 0.5;
                }

                .${this.style.editedTagClicky} {
                    cursor: pointer;
                    pointer-events: all;
                }

                .${this.style.editedCompact} {
                    text-indent: 0;
                }

                .theme-dark .${this.style.deleted}:not(:hover) img:not(.${this.classes.avatar}), .${this.style.deleted}:not(:hover) .mention, .${this.style.deleted}:not(:hover) .reactions, .${this.style.deleted}:not(:hover) a {
                    filter: grayscale(100%) !important;
                }

                .${this.style.deleted} img:not(.${this.classes.avatar}), .${this.style.deleted} .mention, .${this.style.deleted} .reactions, .${this.style.deleted} a {
                    transition: filter 0.3s !important;
                }

                .theme-dark .${this.style.tab} {
                    border-color: transparent;
                    color: rgba(255, 255, 255, 0.4);
                    padding: 0px 24px;
                }
                .theme-light .${this.style.tab} {
                    border-color: transparent;
                    color: rgba(0, 0, 0, 0.4);
                    padding: 0px 24px;
                }

                #sent.${this.style.tab} {
                  display: none;
                }

                .${this.style.menuModalLarge} {
                  width: 960px;
                }

                .theme-dark  .${this.style.tabSelected} {
                    border-color: rgb(255, 255, 255);
                    color: rgb(255, 255, 255);
                }
                .theme-light  .${this.style.tabSelected} {
                    border-color: rgb(0, 0, 0);
                    color: rgb(0, 0, 0);
                }

                #${this.style.menuTabBar} {
                  justify-content: space-around;
                }

                .${this.style.textIndent} {
                    margin-left: 40px;
                }

                .${this.style.imageRoot} {
                  pointer-events: all;
                }

                #${this.style.menuMessages} {
                  max-height: 0px;
                }
                .${this.style.menuRoot} .${this.style.questionMark} {
                  margin-left: 5px;
                }
                .${this.style.menuRoot} h1[data-text-variant^="heading"] {
                  width: 100%;
                }
                .${this.style.menuRoot} {
                  width: 960px;
                }
                #${this.style.filter} {
                  opacity: 1;
                }
                .${this.style.inputWrapper} {
                  display: -webkit-box;
                  display: -ms-flexbox;
                  display: flex;
                  -webkit-box-orient: vertical;
                  -webkit-box-direction: normal;
                  -ms-flex-direction: column;
                  flex-direction: column;
                }
                .${this.style.multiInput} {
                  font-size: 16px;
                  -webkit-box-sizing: border-box;
                  box-sizing: border-box;
                  width: 100%;
                  border-radius: 3px;
                  color: var(--text-normal);
                  background-color: var(--deprecated-text-input-bg);
                  border: 1px solid var(--deprecated-text-input-border);
                  -webkit-transition: border-color .2s ease-in-out;
                  transition: border-color .2s ease-in-out;
                  display: -webkit-box;
                  display: -ms-flexbox;
                  display: flex;
                  -webkit-box-align: center;
                  -ms-flex-align: center;
                  align-items: center;
                }
                .${this.style.multiInputFirst} {
                  -webkit-box-flex: 1;
                  -ms-flex-positive: 1;
                  flex-grow: 1;
                }
                .${this.style.input} {
                  font-size: 16px;
                  -webkit-box-sizing: border-box;
                  box-sizing: border-box;
                  width: 100%;
                  border-radius: 3px;
                  color: var(--text-normal);
                  background-color: var(--deprecated-text-input-bg);
                  border: 1px solid var(--deprecated-text-input-border);
                  -webkit-transition: border-color .2s ease-in-out;
                  transition: border-color .2s ease-in-out;
                  padding: 10px;
                  height: 40px;
                  border: none;
                  background-color: transparent;
                }
                .${this.style.questionMark} {
                  display: -webkit-box;
                  display: -ms-flexbox;
                  display: flex;
                  -webkit-box-align: center;
                  -ms-flex-align: center;
                  align-items: center;
                  -webkit-box-pack: center;
                  -ms-flex-pack: center;
                  justify-content: center;
                  width: 32px;
                  height: 32px;
                  border-radius: 2px;
                  margin-right: 4px;
                  padding: 0;
                  min-width: 0;
                  min-height: 0;
                  background-color: var(--brand-experiment);
                }
                .${this.style.tabBarContainer} {
                  border-bottom: 1px solid var(--background-modifier-accent);
                  padding-left: 20px;
                }
                .${this.style.tabBar} {
                  display: flex;
                  height: 55px;
                  align-items: stretch;
                  -ms-flex-align: stretch;
                  -webkit-box-align: stretch;
                }
                .${this.style.tabBarItem} {
                  display: flex;
                  font-size: 14px;
                  margin-right: 40px;
                  border-bottom: 2px solid transparent;
                  align-items: center;
                  -ms-flex-align: center;
                  -webkit-box-align: center;
                  cursor: pointer;
                  line-height: 20px;
                  font-size: 16px;
                  position: relative;
                  font-weight: 500;
                  flex-shrink: 0;
                  -ms-flex-negative: 0;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                }
            `
    );
    this.patchMessages();
    this.patchModal();

    // const createKeybindListener = () => {
    //   this.keybindListener = new (Webpack.getModule(m => typeof m === 'function' && m.toString().includes('.default.setOnInputEventCallback')))();
    //   this.keybindListener.on('change', e => {
    //     if (this.settings.disableKeybind) return; // todo: destroy if disableKeybind is set to true and don't make one if it was true from the start
    //     // this is the hackiest thing ever but it works xdd
    //     if (!Webpack.getByKeys('isFocused').isFocused() || document.getElementsByClassName('bda-slist').length) return;
    //     const isKeyBind = keybind => {
    //       if (e.combo.length != keybind.length) return false;
    //       // console.log(e.combo);
    //       for (let i = 0; i < e.combo.length; i++) {
    //         if (e.combo[i][1] != keybind[i]) {
    //           return false;
    //         }
    //       }
    //       return true;
    //     };
    //     const close = () => {
    //       this.menu.filter = '';
    //       this.menu.open = false;
    //       this.ModalStack.closeModal(this.style.menu);
    //     };
    //     if (isKeyBind(this.settings.openLogKeybind)) {
    //       if (this.menu.open) return close();
    //       return this.openWindow();
    //     }
    //     if (isKeyBind(this.settings.openLogFilteredKeybind)) {
    //       if (this.menu.open) return close();
    //       if (!this.selectedChannel) {
    //         BdApi.UI.showToast('No channel selected', { type: 'error' });
    //         return this.openWindow();
    //       }
    //       this.menu.filter = `channel:${this.selectedChannel.id}`;
    //       this.openWindow();
    //     }
    //   });
    // };

    //this.powerMonitor = Webpack.getByKeys('remotePowerMonitor').remotePowerMonitor;

    // const refreshKeykindListener = () => {
    //   this.keybindListener.destroy();
    //   createKeybindListener();
    // };

    //this.keybindListenerInterval = setInterval(refreshKeykindListener, 30 * 1000 * 60); // 10 minutes

    //createKeybindListener();

    // this.powerMonitor.on(
    //   'resume',
    //   (this.powerMonitorResumeListener = () => {
    //     setTimeout(refreshKeykindListener, 1000);
    //   })
    // );
    /*
        this.unpatches.push(
          this.Patcher.instead(ZeresPluginLibrary.WebpackModules.getByDisplayName('TextAreaAutosize').prototype, 'focus', (thisObj, args, original) => {
            if (this.menu.open) return;
            return original(...args);
          })
        );

        this.unpatches.push(
          this.Patcher.instead(ZeresPluginLibrary.WebpackModules.getByDisplayName('LazyImage').prototype, 'getSrc', (thisObj, args, original) => {
            let indx;
            if (thisObj && thisObj.props && thisObj.props.src && ((indx = thisObj.props.src.indexOf('?ML2=true')), indx !== -1)) return thisObj.props.src.substr(0, indx);
            return original(...args);
          })
        ); */

    this.dataManagerInterval = setInterval(() => {
      this.handleMessagesCap();
    }, 60 * 1000 * 5); // every 5 minutes, no need to spam it, could be intensive

    this.menu.randomValidChannel = (() => {
      const channels = Webpack.Stores.GuildChannelStore.getChannels();
      var keys = Object.keys(channels);
      return channels[keys[(keys.length * Math.random()) << 0]];
    })();

    this.menu.userRequestQueue = [];

    this.menu.deleteKeyDown = false;
    document.addEventListener(
      'keydown',
      (this.keydownListener = e => {
        if (e.repeat) return;
        if (e.keyCode === 46) this.menu.deleteKeyDown = true;
      })
    );
    document.addEventListener(
      'keyup',
      (this.keyupListener = e => {
        if (e.repeat) return;
        if (e.keyCode === 46) this.menu.deleteKeyDown = false;
      })
    );

    this.menu.shownMessages = -1;
    const iconShit = Webpack.getByKeys('container', 'children', 'toolbar', 'iconWrapper');
    // Icon by font awesome
    // https://fontawesome.com/license
    this.channelLogButton = this.parseHTML(`<div tabindex="0" class="${iconShit.iconWrapper} ${iconShit.clickable}" role="button">
                                                        <svg aria-hidden="true" class="${iconShit.icon}" name="Open Logs" viewBox="0 0 576 512">
                                                            <path fill="currentColor" d="M218.17 424.14c-2.95-5.92-8.09-6.52-10.17-6.52s-7.22.59-10.02 6.19l-7.67 15.34c-6.37 12.78-25.03 11.37-29.48-2.09L144 386.59l-10.61 31.88c-5.89 17.66-22.38 29.53-41 29.53H80c-8.84 0-16-7.16-16-16s7.16-16 16-16h12.39c4.83 0 9.11-3.08 10.64-7.66l18.19-54.64c3.3-9.81 12.44-16.41 22.78-16.41s19.48 6.59 22.77 16.41l13.88 41.64c19.75-16.19 54.06-9.7 66 14.16 1.89 3.78 5.49 5.95 9.36 6.26v-82.12l128-127.09V160H248c-13.2 0-24-10.8-24-24V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24v-40l-128-.11c-16.12-.31-30.58-9.28-37.83-23.75zM384 121.9c0-6.3-2.5-12.4-7-16.9L279.1 7c-4.5-4.5-10.6-7-17-7H256v128h128v-6.1zm-96 225.06V416h68.99l161.68-162.78-67.88-67.88L288 346.96zm280.54-179.63l-31.87-31.87c-9.94-9.94-26.07-9.94-36.01 0l-27.25 27.25 67.88 67.88 27.25-27.25c9.95-9.94 9.95-26.07 0-36.01z"/>
                                                        </svg>
                                                    </div>`);
    this.channelLogButton.addEventListener('click', () => {
      this.openWindow();
    });
    this.channelLogButton.addEventListener('contextmenu', () => {
      if (!this.selectedChannel) return;
      this.menu.filter = `channel:${this.selectedChannel.id}`;
      this.openWindow();
    });
    BdApi.UI.createTooltip(this.channelLogButton, 'Open Logs', { side: 'bottom' });

    if (this.settings.showOpenLogsButton) setTimeout(() => this.addOpenLogsButton(), 1000); // I hate this.. buuut it works, at this point idk what order things are executing..

    this.unpatches.push(
      this.Patcher.instead(MessageActions, 'deleteMessage', (_, args, original) => {
        const messageId = args[1];
        if (this.messageRecord[messageId] && this.messageRecord[messageId].delete_data) return;
        this.localDeletes.push(messageId);
        if (this.localDeletes.length > 10) this.localDeletes.shift();
        return original(...args);
      })
    );

    this.unpatches.push(
      this.Patcher.instead(this.messageStore, 'getLastEditableMessage', (_this, [channelId]) => {
        const me = this.localUser.id;
        return _this
          .getMessages(channelId)
          .toArray()
          .reverse()
          .find(iMessage => iMessage.author.id === me && iMessage.state === 'SENT' && (!this.messageRecord[iMessage.id] || !this.messageRecord[iMessage.id].delete_data));
      })
    );
    this.patchContextMenus();

    if (!(this.settings.flags & Flags.STARTUP_HELP)) {
      this.settings.flags |= Flags.STARTUP_HELP;
      this.showLoggerHelpModal(true);
      this.saveSettings();
    }

    this.selfTestInterval = setInterval(() => {
      this.selfTestTimeout = setTimeout(() => {
        if (this.selfTestFailures > 4) {
          clearInterval(this.selfTestInterval);
          this.selfTestInterval = 0;
          return BdApi.alert(`${this.getName()}: internal error.`, `Self test failure: Failed to hook dispatch. Recommended to reload your discord (CTRL + R) as the plugin may be in a broken state! If you still see this error, open up the devtools console (CTRL + SHIFT + I, click console tab) and report the errors to ${this.getAuthor()} for further assistance.`);
        }
        Logger.warn(this.getName(), 'Dispatch is not hooked, all logger hooks may be invalid, attempting to reload self');
        this.selfTestFailures++;
        this.stop();
        this.start();
      }, 3000);
      this.dispatcher.dispatch({
        type: 'MESSAGE_LOGGER_V2_SELF_TEST'
      });
    }, 10000);

    try {
      if (this.settings.userCounter.enabled) {
        const { enableTime, lastSubmission } = this.settings.userCounter;
        let changed = false;
        if (enableTime) {
          if ((Date.now() - enableTime > USER_COUNTER_INTERVAL) && (Date.now() - lastSubmission > USER_COUNTER_INTERVAL)) {
            this.settings.userCounter.lastSubmission = Date.now();
            changed = true;
            BdApi.Net.fetch('https://astranika.com/api/analytics/submit').catch(err => { });
          }
        } else {
          this.settings.userCounter.enableTime = Date.now();
          changed = true;
        }
        if (changed) this.saveSettings();
      }
    } catch (err) {
      Logger.stacktrace(this.getName(), 'Failed to load user counter', err);
    }

    if (this.selfTestInited) return;
    this.selfTestFailures = 0;
    this.selfTestInited = true;
  }
  shutdown() {
    this.__started = false;
    const tryUnpatch = fn => {
      if (typeof fn !== 'function') return;
      try {
        // things can bug out, best to reload tbh, should maybe warn the user?
        fn();
      } catch (e) {
        Logger.stacktrace(this.getName(), 'Error unpatching', e);
      }
    };
    if (Array.isArray(this.unpatches)) for (let unpatch of this.unpatches) tryUnpatch(unpatch);
    BdApi.Patcher.unpatchAll(this.getName());
    if (this.MessageContextMenuPatch) tryUnpatch(this.MessageContextMenuPatch);
    if (this.ChannelContextMenuPatch) tryUnpatch(this.ChannelContextMenuPatch);
    if (this.GuildContextMenuPatch) tryUnpatch(this.GuildContextMenuPatch);
    try {
      this.Patcher.unpatchAll();
    } catch (e) { }
    this.forceReloadMessages();
    // if (this.keybindListener) this.keybindListener.destroy();
    if (this.style && this.style.css) BdApi.DOM.removeStyle(this.style.css);
    if (this.dataManagerInterval) clearInterval(this.dataManagerInterval);
    // if (this.keybindListenerInterval) clearInterval(this.keybindListenerInterval);
    if (this.selfTestInterval) clearInterval(this.selfTestInterval);
    if (this.selfTestTimeout) clearTimeout(this.selfTestTimeout);
    if (this._autoUpdateInterval) clearInterval(this._autoUpdateInterval);
    if (this.keydownListener) document.removeEventListener('keydown', this.keydownListener);
    if (this.keyupListener) document.removeEventListener('keyup', this.keyupListener);
    // if (this.powerMonitor) this.powerMonitor.removeListener('resume', this.powerMonitorResumeListener);
    if (this.channelLogButton) this.channelLogButton.remove();
    if (this._imageCacheServer) this._imageCacheServer.stop();
    if (typeof this._modalsApiUnsubcribe === 'function')
      try {
        this._modalsApiUnsubcribe();
      } catch { }
    // console.log('invalidating cache');
    this.invalidateAllChannelCache();
    //  if (this.selectedChannel) this.cacheChannelMessages(this.selectedChannel.id); // bad idea?
  }
  automaticallyUpdate(tryProxy) {
    BdApi.Net.fetch(
      tryProxy ?
        'https://astranika.com/bd/download?plugin=MessageLoggerV2' :
        'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/MessageLoggerV2/MessageLoggerV2.plugin.js',
      { headers: { origin: 'discord.com' } })
      .then(res => {
        if (res.ok) return res.text();
        throw new Error('Network response was not ok ' + response.statusText);
      })
      .then(data => {
        let remoteVersion = data.match(/['"][0-9]+\.[0-9]+\.[0-9]+['"]/i);
        if (!remoteVersion) throw new Error('Could not extract version from remote');
        remoteVersion = remoteVersion.toString().replace(/['"]/g, "");
        if (BdApi.Utils.semverCompare(this.getVersion(), remoteVersion) !== 1) return;
        const { writeFileSync } = require('fs');
        const { join, basename } = require('path');
        writeFileSync(join(__dirname, basename(__filename)), data);
        BdApi.UI.showNotification({ title: this.getName(), content: `Successfully updated!`, type: 'success' });
        BdApi.Plugins.reload(this.getName());
      })
      .catch(err => {
        Logger.stacktrace(this.getName(), 'Error trying to update', err);
        if (!tryProxy) return this.automaticallyUpdate(true);
        BdApi.UI.showNotification({ title: this.getName(), content: `Unable to check for updates!`, duration: 7500 });
      });
  }

  subscribeObserver(callback, filter) {
    if (!Array.isArray(this.observerListeners)) this.observerListeners = [];
    const sub = { callback, filter };
    this.observerListeners.push(sub);
    return sub;
  }
  subscribeToQuerySelector(callback, selector) {
    if (!Array.isArray(this.observerListeners)) this.observerListeners = [];
    const sub = {
      callback, filter: mutation => {
        return mutation.target.matches(selector)
          || Array.from(mutation.addedNodes).concat(Array.from(mutation.removedNodes))
            .find(n => n instanceof Element && (n.matches(selector) || n.querySelector(selector)));
      }
    };
    this.observerListeners.push(sub);
    return sub;
  }
  unsubscribeObserver(subscription) {
    if (!this.observerListeners.includes(subscription)) subscription = this.observerListeners.find(s => s.callback === subscription)
    this.lodash.remove(this.observerListeners, r => r === subscription);
  }
  // title-3qD0b- da-title container-1r6BKw da-container themed-ANHk51 da-themed
  // chatContent-a9vAAp da-chatContent
  observer(mutations) {
    if (this.observerListeners?.length) {
      for (const sub of this.observerListeners) {
        try {
          if (sub.filter(mutations)) sub.callback();
        } catch (err) {
          Logger.stacktrace(this.getName(), 'Error in observer subscribtion, removing', err);
          this.unsubscribeObserver(sub.callback);
        }
      }
    }

    const { addedNodes } = mutations;
    let isChat = false;
    let isTitle = false;
    for (const change of addedNodes) {
      //  || (isChat = typeof change.className === 'string' && change.className.indexOf(this.observer.chatContentClass) !== -1) || (isTitle = typeof change.className === 'string' && change.className.indexOf(this.observer.titleClass) !== -1) || (change.style && change.style.cssText === 'border-radius: 2px; background-color: rgba(114, 137, 218, 0);') || (typeof change.className === 'string' && change.className.indexOf(this.observer.containerCozyClass) !== -1)
      if (
        // check if we went from non chat to chat
        (isTitle = isChat = (change.classList?.contains(this.observer.chatClass) || change.firstElementChild?.classList?.contains(this.observer.chatClass)))
        ||
        (isChat = (change.classList?.contains(this.observer.chatContentClass)))
        ||
        (isTitle = (change.classList?.contains(this.observer.titleClass)))
      ) {
        try {
          if (isChat) {
            this.selectedChannel = this.getSelectedTextChannel();
            this.noTintIds = [];
            this.editModifiers = {};
          }
          if (!this.selectedChannel) return Logger.warn(this.getName(), 'Chat was loaded but no text channel is selected');
          if (isTitle && this.settings.showOpenLogsButton) {
            let srch = change.querySelector('div[class*="-search"]') || change.querySelector('div[class*="search_"]');
            if (!srch) return Logger.warn(this.getName(), 'Observer caught title loading, but no search bar was found! Open Logs button will not show!');
            if (this.channelLogButton && srch.parentElement) {
              srch.parentElement.insertBefore(this.channelLogButton, srch); // memory leak..?
            }
            srch = null;
            if (!isChat) return;
          }
          const showStuff = (map, name) => {
            if (map[this.selectedChannel.id] && map[this.selectedChannel.id]) {
              if (this.settings.useNotificationsInstead) {
                BdApi.UI.showNotification({
                  title: this.getName(),
                  content: `There are ${map[this.selectedChannel.id]} new ${name} messages in ${this.selectedChannel.name && this.selectedChannel.type !== 3 ? '#' + this.selectedChannel.name : 'DMs'}`
                });
              } else {
                BdApi.UI.showToast(`There are ${map[this.selectedChannel.id]} new ${name} messages in ${this.selectedChannel.name ? '#' + this.selectedChannel.name : 'DMs'}`, {
                  type: 'info',
                  onClick: () => this.openWindow(name),
                  timeout: 3000
                });
              }
              map[this.selectedChannel.id] = 0;
            }
          };
          if (this.settings.showDeletedCount) showStuff(this.deletedChatMessagesCount, 'deleted');
          if (this.settings.showEditedCount) showStuff(this.editedChatMessagesCount, 'edited');
        } catch (e) {
          Logger.stacktrace(this.getName(), 'Error in observer', e);
        }
        break;
      }
    }
  }
  getSettingsPanel() {
    const div = document.createElement('div');
    div.id = this.obfuscatedClass('ml2-settings-buttonbox');
    div.style.display = 'inline-flex';
    div.appendChild(this.createButton('Changelog', () => this.showChangelog()));
    div.appendChild(this.createButton('Stats', () => this.showStatsModal()));
    div.appendChild(this.createButton('Donate', () => window.open('https://paypal.me/lighty13')));
    div.appendChild(
      this.createButton('Support server', () => BdApi.UI.showInviteModal('NYvWdN5'))
    );
    div.appendChild(this.createButton('Help', () => this.showLoggerHelpModal()));
    let button = div.firstElementChild;
    while (button) {
      button.style.marginRight = button.style.marginLeft = `5px`;
      button = button.nextElementSibling;
    }

    const { TextElement, tools: { createMomentObject } } = this;

    class TimerWrapper extends React.PureComponent {
      constructor(...args) {
        super(...args);
        this.props.cbref.current = () => {
          const value = this.props.value();
          this.moment = createMomentObject(value + this.props.time);
          this.setState({ value });
        };
        this.state = { value: this.props.value() };
        this.moment = createMomentObject(this.state.value + this.props.time);
      }
      componentDidUpdate() {
        this.moment = createMomentObject(this.state.value + this.props.time);
      }
      componentDidMount() {
        const { moment } = this;
        const vv = moment.clone().seconds(0).add(1, 'm').diff(moment);
        this.timer = setInterval(() => {
          clearInterval(this.timer);
          this.timer = setInterval(() => this.forceUpdate(), 60 * 1000);
          this.forceUpdate();
        }, vv);
      }
      componentWillUnmount() {
        if (this.timer) clearInterval(this.timer);
      }
      render() {
        const { value } = this.state;
        const { after, active, inactive, time } = this.props;
        const future = (value + time);
        return React.createElement(TextElement, {}, value ? Date.now() > future ? active : `${after}${this.moment.fromNow()}` : inactive);
      }
    }

    const activeRef = { current: null };
    const lastRef = { current: null };

    return BdApi.UI.buildSettingsPanel({
      settings: [
        {
          name: 'Ignores and overrides',
          id: this.obfuscatedClass('ml2-settings-ignores-overrides'),
          type: 'category',
          collapsible: true,
          shown: false,
          settings: [
            {
              name: 'Ignore muted servers',
              id: 'ignoreMutedGuilds',
              type: 'switch',
              value: this.settings.ignoreMutedGuilds
            },
            {
              name: 'Ignore muted channels',
              id: 'ignoreMutedChannels',
              type: 'switch',
              value: this.settings.ignoreMutedChannels
            },
            {
              name: 'Ignore bots',
              id: 'ignoreBots',
              type: 'switch',
              value: this.settings.ignoreBots
            },
            {
              name: 'Ignore messages posted by you',
              id: 'ignoreSelf',
              type: 'switch',
              value: this.settings.ignoreSelf
            },
            {
              name: 'Ignore message edits from you',
              id: 'ignoreLocalEdits',
              type: 'switch',
              value: this.settings.ignoreLocalEdits
            },
            {
              name: 'Ignore message deletes from you',
              note: 'Only ignores if you delete your own message.',
              id: 'ignoreLocalDeletes',
              type: 'switch',
              value: this.settings.ignoreLocalDeletes
            },
            {
              name: 'Ignore blocked users',
              id: 'ignoreBlockedUsers',
              type: 'switch',
              value: this.settings.ignoreBlockedUsers
            },
            {
              name: 'Ignore NSFW channels',
              id: 'ignoreNSFW',
              type: 'switch',
              value: this.settings.ignoreNSFW
            },
            {
              name: 'Only log whitelist',
              id: 'onlyLogWhitelist',
              type: 'switch',
              value: this.settings.onlyLogWhitelist
            },
            {
              name: 'Always log selected channel, regardless of whitelist/blacklist',
              id: 'alwaysLogSelected',
              type: 'switch',
              value: this.settings.alwaysLogSelected
            },
            {
              name: 'Always log DMs, regardless of whitelist/blacklist',
              id: 'alwaysLogDM',
              type: 'switch',
              value: this.settings.alwaysLogDM
            },
            {
              name: 'Always log ghost pings, regardless of whitelist/blacklist',
              note: 'Messages sent in ignored/muted/blacklisted servers and channels will be logged and shown in sent, but only gets saved if a ghost ping occurs.',
              id: 'alwaysLogGhostPings',
              type: 'switch',
              value: this.settings.alwaysLogGhostPings
            }
          ]
        },
        {
          name: 'Display settings',
          id: this.obfuscatedClass('ml2-settings-display'),
          type: 'category',
          collapsible: true,
          shown: false,
          settings: [
            {
              name: 'Display dates with timestamps',
              id: 'displayDates',
              type: 'switch',
              value: this.settings.displayDates,
              onChange: () => {
                if (this.selectedChannel) {
                  // change NOW
                  this.invalidateAllChannelCache();
                  this.cacheChannelMessages(this.selectedChannel.id);
                }
              }
            },
            {
              name: 'Display deleted messages in chat',
              id: 'showDeletedMessages',
              type: 'switch',
              value: this.settings.showDeletedMessages,
              onChange: () => {
                this.invalidateAllChannelCache();
                if (this.selectedChannel) this.cacheChannelMessages(this.selectedChannel.id);
              }
            },
            {
              name: 'Display edited messages in chat',
              id: 'showEditedMessages',
              type: 'switch',
              value: this.settings.showEditedMessages,
              onChange: () => this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT' })
            },
            {
              name: 'Max number of shown edits',
              id: 'maxShownEdits',
              type: 'text',
              value: this.settings.maxShownEdits,
              onChange: val => {
                if (isNaN(val)) return BdApi.UI.showToast('Value must be a number!', { type: 'error' });
                this.settings.maxShownEdits = parseInt(val);
                this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT' });
              }
            },
            {
              name: 'Show oldest edit instead of newest if over the shown edits limit',
              id: 'hideNewerEditsFirst',
              type: 'switch',
              value: this.settings.hideNewerEditsFirst,
              onChange: () => this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT' })
            },
            {
              name: 'Use red background instead of red text for deleted messages',
              id: 'useAlternativeDeletedStyle',
              type: 'switch',
              value: this.settings.useAlternativeDeletedStyle,
              onChange: () => this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE' })
            },
            {
              name: 'Display purged messages in chat',
              id: 'showPurgedMessages',
              type: 'switch',
              value: this.settings.showPurgedMessages,
              onChange: () => {
                this.invalidateAllChannelCache();
                if (this.selectedChannel) this.cacheChannelMessages(this.selectedChannel.id);
              }
            },
            {
              name: 'Restore deleted messages after reload',
              id: 'restoreDeletedMessages',
              type: 'switch',
              value: this.settings.restoreDeletedMessages,
              onChange: val => {
                if (val) {
                  this.invalidateAllChannelCache();
                  if (this.selectedChannel) this.cacheChannelMessages(this.selectedChannel.id);
                }
              }
            },
            {
              name: 'Show amount of new deleted messages when entering a channel',
              id: 'showDeletedCount',
              type: 'switch',
              value: this.settings.showDeletedCount
            },
            {
              name: 'Show amount of new edited messages when entering a channel',
              id: 'showEditedCount',
              type: 'switch',
              value: this.settings.showEditedCount
            },
            {
              name: 'Display update notes',
              id: 'displayUpdateNotes',
              type: 'switch',
              value: this.settings.displayUpdateNotes
            },
            {
              name: 'Menu sort direction',
              id: 'reverseOrder',
              type: 'radio',
              value: this.settings.reverseOrder,
              options: [
                {
                  name: 'New - old',
                  value: false
                },
                {
                  name: 'Old - new',
                  value: true
                }
              ]
            },
            {
              name: 'Use notifications instead of toasts',
              note: "This works for edit, send, delete and purge toasts, as well as delete and edit count toasts. Toggle it if you don't know what this does.",
              id: 'useNotificationsInstead',
              type: 'switch',
              value: this.settings.useNotificationsInstead,
              onChange: e => (e ? BdApi.UI.showNotification({ title: this.getName(), content: 'Using notifications', type: 'success' }) : BdApi.UI.showToast('Using toasts', { type: 'success', timeout: 5000 }))
            }
          ]
        },
        {
          name: 'Misc settings',
          id: this.obfuscatedClass('ml2-settings-misc'),
          type: 'category',
          collapsible: true,
          shown: false,
          settings: [
            {
              name: 'Disable saving data. Logged messages are erased after reload/restart. Disables auto backup.',
              id: 'dontSaveData',
              type: 'switch',
              value: this.settings.dontSaveData,
              onChange: val => {
                if (!val) this.saveData();
                if (!val && this.settings.autoBackup) this.saveBackup();
              }
            },
            {
              name: "Auto backup data (won't fully prevent losing data, just prevent total data loss)",
              id: 'autoBackup',
              type: 'switch',
              value: this.settings.autoBackup,
              onChange: val => {
                if (val && !this.settings.dontSaveData) this.saveBackup();
              }
            } /*
                        {
                            // no time, TODO!
                            name: 'Deleted messages color',
                            id: 'deletedMessageColor',
                            type: 'color'
                        }, */,
            {
              name: 'Aggresive message caching (makes sure we have the data of any deleted or edited messages)',
              id: 'aggresiveMessageCaching',
              type: 'switch',
              value: this.settings.aggresiveMessageCaching
            },
            {
              name: 'Cache all images by storing them locally in the MLV2_IMAGE_CACHE folder inside the plugins folder',
              id: 'cacheAllImages',
              type: 'switch',
              value: this.settings.cacheAllImages
            },
            {
              name: "Don't delete cached images",
              note: "If the message the image is from is erased from data, the cached image will be kept. You'll have to monitor disk usage on your own!",
              id: 'dontDeleteCachedImages',
              type: 'switch',
              value: this.settings.dontDeleteCachedImages
            },
            {
              name: 'Display open logs button next to the search box top right in channels',
              id: 'showOpenLogsButton',
              type: 'switch',
              value: this.settings.showOpenLogsButton,
              onChange: val => {
                if (val) return this.addOpenLogsButton();
                this.removeOpenLogsButton();
              }
            },
            {
              name: 'Block spam edit notifications (if enabled)',
              id: 'blockSpamEdit',
              type: 'switch',
              value: this.settings.blockSpamEdit
            }
          ]
        },
        {
          name: 'Toast notifications for servers',
          id: this.obfuscatedClass('ml2-settings-toast-guilds'),
          type: 'category',
          collapsible: true,
          shown: false,
          settings: [
            {
              name: 'Message sent',
              id: 'sent',
              type: 'switch',
              value: this.settings.toastToggles.sent
            },
            {
              name: 'Message edited',
              id: 'edited',
              type: 'switch',
              value: this.settings.toastToggles.edited
            },
            {
              name: 'Message deleted',
              id: 'deleted',
              type: 'switch',
              value: this.settings.toastToggles.deleted
            },
            {
              name: 'Ghost pings',
              id: 'ghostPings',
              type: 'switch',
              value: this.settings.toastToggles.ghostPings
            },
            {
              name: 'Disable toasts for local user (yourself)',
              id: 'disableToastsForLocal',
              type: 'switch',
              value: this.settings.toastToggles.disableToastsForLocal
            }
          ]
        },
        {
          name: 'Toast notifications for DMs',
          id: this.obfuscatedClass('ml2-settings-toast-dms'),
          type: 'category',
          collapsible: true,
          shown: false,
          settings: [
            {
              name: 'Message sent',
              id: 'sent',
              type: 'switch',
              value: this.settings.toastTogglesDMs.sent
            },
            {
              name: 'Message edited',
              id: 'edited',
              type: 'switch',
              value: this.settings.toastTogglesDMs.edited
            },
            {
              name: 'Message deleted',
              id: 'deleted',
              type: 'switch',
              value: this.settings.toastTogglesDMs.deleted
            },
            {
              name: 'Ghost pings',
              id: 'ghostPings',
              type: 'switch',
              value: this.settings.toastTogglesDMs.ghostPings
            }
          ]
        },
        {
          name: 'Message caps',
          id: this.obfuscatedClass('ml2-settings-caps'),
          type: 'category',
          collapsible: true,
          shown: false,
          settings: [
            {
              name: 'Cached messages cap',
              note: 'Max number of sent messages logger should keep track of',
              id: 'messageCacheCap',
              type: 'text',
              value: this.settings.messageCacheCap,
              onChange: val => {
                if (isNaN(val)) return BdApi.UI.showToast('Value must be a number!', { type: 'error' });
                this.settings.messageCacheCap = parseInt(val);
                clearInterval(this.dataManagerInterval);
                this.dataManagerInterval = setInterval(() => {
                  this.handleMessagesCap();
                }, 60 * 1000 * 5);
              }
            },
            {
              name: 'Saved messages cap',
              note: "Max number of messages saved to disk, this limit is for deleted, edited and purged INDIVIDUALLY. So if you have it set to 1000, it'll be 1000 edits, 1000 deletes and 1000 purged messages max",
              id: 'savedMessagesCap',
              type: 'text',
              value: this.settings.savedMessagesCap,
              onChange: val => {
                if (isNaN(val)) return BdApi.UI.showToast('Value must be a number!', { type: 'error' });
                this.settings.savedMessagesCap = parseInt(val);
                clearInterval(this.dataManagerInterval);
                this.dataManagerInterval = setInterval(() => {
                  this.handleMessagesCap();
                }, 60 * 1000 * 5);
              }
            },
            {
              name: 'Menu message render cap',
              note: 'How many messages will show before the LOAD MORE button will show',
              id: 'renderCap',
              type: 'text',
              value: this.settings.renderCap,
              onChange: val => {
                if (isNaN(val)) return BdApi.UI.showToast('Value must be a number!', { type: 'error' });
                this.settings.renderCap = parseInt(val);
                clearInterval(this.dataManagerInterval);
              }
            }
          ]
        },
        {
          name: 'Advanced',
          id: this.obfuscatedClass('ml2-settings-advanced'),
          type: 'category',
          collapsible: true,
          shown: false,
          settings: [
            {
              name: 'Obfuscate CSS classes',
              note: 'Enable this if some plugin, library or theme is blocking you from using the plugin',
              id: 'obfuscateCSSClasses',
              type: 'switch',
              value: this.settings.obfuscateCSSClasses
            },
            {
              name: 'Automatic updates',
              note: "Do NOT disable unless you really don't want automatic updates",
              id: 'autoUpdate',
              type: 'switch',
              value: this.settings.autoUpdate,
              callback: val => {
                if (val) {
                  this._autoUpdateInterval = setInterval(_ => this.automaticallyUpdate(), 1000 * 60 * 15); // 15 minutes
                  this.automaticallyUpdate();
                } else {
                  clearInterval(this._autoUpdateInterval);
                }
              }
            },
            {
              name: 'Contextmenu submenu name',
              note: "Instead of saying Message Logger, make it say something else, so it's screenshot friendly",
              id: 'contextmenuSubmenuName',
              type: 'text',
              value: this.settings.contextmenuSubmenuName
            } /* ,
          {
            name: 'Image cache directory',
            note: 'Press enter to save the path',
            id: 'imageCacheDir',
            type: 'path',
            onChange: val => {
              console.log(this.settings.imageCacheDir, val, 'what?');
              if (this.settings.imageCacheDir === val) return;
              const savedImages = this.nodeModules.fs.readdirSync(this.settings.imageCacheDir);
              console.log(savedImages);
              if (!savedImages.length) return;
              https://stackoverflow.com/questions/10420352/
              function humanFileSize(bytes, si) {
                const thresh = si ? 1000 : 1024;
                if (Math.abs(bytes) < thresh) return `${bytes} B`;
                const units = si ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
                let u = -1;
                do {
                  bytes /= thresh;
                  ++u;
                } while (Math.abs(bytes) >= thresh && u < units.length - 1);
                return `${bytes.toFixed(1)}${units[u]}`;
              }
              let sz = 0;
              for (let image of savedImages) ;
              const size = humanFileSize(this.nodeModules.fs.statSync(this.settings.imageCacheDir).size);
              ZeresPluginLibrary.Modals.showModal('Move images', React.createElement(ZeresPluginLibrary.DiscordModules.TextElement.default, { color: ZeresPluginLibrary.DiscordModules.TextElement.Colors.PRIMARY, children: [`Would you like to move ${savedImages.length} images from the old folder to the new? Size of all images is ${size}.`] }), {
                confirmText: 'Yes',
                onConfirm: () => {}
              });
              //this.settings.imageCacheDir = val;
            }
          } */
          ]
        },
        {
          name: 'User count',
          id: this.obfuscatedClass('ml2-settings-usercounter'),
          type: 'category',
          collapsible: true,
          shown: false,
          settings: [
            {
              name: 'Enable user counter',
              note: 'Only active the next day after enabling this setting, enabling will mean you\'re anonymously counted in the user count',
              id: 'enabled',
              type: 'switch',
              value: this.settings.userCounter.enabled,
              onChange: val => {
                this.settings.userCounter.enableTime = val ? Date.now() : 0;
                this.settings.userCounter.lastSubmission = val ? Date.now() : 0;
                this.settings.userCounter.enabled = val;
                this.saveSettings();
                activeRef?.current();
                lastRef?.current();
              }
            },
            {
              type: 'custom',
              id: this.obfuscatedClass('ml2-settings-enableTime'),
              children: React.createElement(TimerWrapper, {
                after: 'User counter will be active ',
                active: 'User counter is currently active',
                inactive: 'User counter is currently inactive',
                time: USER_COUNTER_INTERVAL,
                value: () => this.settings.userCounter.enableTime,
                cbref: activeRef
              })
            },
            {
              type: 'custom',
              id: this.obfuscatedClass('ml2-settings-lastSubmission'),
              children: React.createElement(TimerWrapper, {
                after: 'Next user counter submission will be ',
                active: 'User counter submission will be submitted on next load',
                inactive: 'User counter submissions are inactive',
                time: USER_COUNTER_INTERVAL,
                value: () => this.settings.userCounter.lastSubmission,
                cbref: lastRef
              })
            }
          ]
        },
        {
          type: 'custom',
          id: this.obfuscatedClass('ml2-settings-footer'),
          children: React.createElement(BdApi.ReactUtils.wrapElement(div))
        }
      ],
      onChange: (category, id, value) => {
        switch (category) {
          case this.obfuscatedClass('ml2-settings-toast-guilds'): {
            this.settings.toastToggles[id] = value;
            break;
          }
          case this.obfuscatedClass('ml2-settings-toast-dms'): this.settings.toastTogglesDMs[id] = value;
          case this.obfuscatedClass('ml2-settings-caps'):
          case this.obfuscatedClass('ml2-settings-usercounter'): break;
          default: {
            this.settings[id] = value;
          }
        }
        this.saveSettings();
      }
    });
  }
  /* ==================================================-|| START HELPERS ||-================================================== */
  findInReactTree(tree, filter, options) {
    return BdApi.Utils.findInTree(tree, filter, { walkable: ["props", "children", "child", "sibling"] });
  }
  getClass(arg, thrw) {
    try {
      const args = arg.split(' ');
      return Webpack.getByKeys(...args)[args[args.length - 1]];
    } catch (e) {
      if (thrw) throw e;
      if (!this.getClass.__warns) this.getClass.__warns = [];
      if (this.localUser.id === '239513071272329217' && !this.getClass.__warns[arg] || Date.now() - this.getClass.__warns[arg] > 1000 * 60) {
        Logger.warn(this.getName(), `Failed to get class with props ${arg}`, e);
        this.getClass.__warns[arg] = Date.now();
      }
      return '';
    }
  };
  getSingleClass(arg, thrw) {
    try {
      return this.getClass(arg, thrw).split(' ')[0];
    } catch (e) {
      if (thrw) throw e;
      if (!this.getSingleClass.__warns) this.getSingleClass.__warns = [];
      if (this.localUser.id === '239513071272329217' && !this.getSingleClass.__warns[arg] || Date.now() - this.getSingleClass.__warns[arg] > 1000 * 60) {
        Logger.warn(this.getName(), `Failed to get class with props ${arg}`, e);
        this.getSingleClass.__warns[arg] = Date.now();
      }
      return '';
    }
  };
  loadData(name, key, defaultData) {
    const { lodash } = this;
    try {
      return lodash.mergeWith(defaultData ? lodash.cloneDeep(defaultData) : {}, BdApi.Data.load(name, key), (_, b) => {
        if (lodash.isArray(b)) return b;
      });
    } catch (err) {
      Logger.error(this.getName(), 'Unable to load data: ', err);
      if (returnNull) return null;
      return lodash.cloneDeep(defaultData);
    }
  }
  saveSettings() {
    BdApi.Data.save(this.getName(), 'settings', this.settings);
  }
  handleDataSaving() {
    // saveData/setPluginData is synchronous, can get slow with bigger files
    if (!this.handleDataSaving.errorPageClass) this.handleDataSaving.errorPageClass = '.' + this.getClass('errorPage');
    /* refuse saving on error page */
    if (!this.messageRecord || document.querySelector(this.handleDataSaving.errorPageClass)) return; /* did we crash? */
    if (!Object.keys(this.messageRecord).length) return BdApi.Data.delete(this.getName() + 'Data', 'data');
    const callback = err => {
      if (err) {
        BdApi.UI.showNotification({ title: this.getName(), content: 'There has been an error saving the data file', type: 'error' });
        Logger.stacktrace(this.getName(), 'There has been an error saving the data file', err);
      }
      if (this.settings.autoBackup) {
        if (this.saveBackupTimeout) this.autoBackupSaveInterupts++;
        if (this.autoBackupSaveInterupts < 4) {
          if (this.saveBackupTimeout) clearTimeout(this.saveBackupTimeout);
          // 20 seconds after, in case shits going down y'know, better not to spam save and corrupt it, don't become the thing you're trying to eliminate
          this.saveBackupTimeout = setTimeout(() => this.saveBackup(), 20 * 1000);
        }
      }
      this.requestedDataSave = 0;
    };
    const useEfficient = !window.ED;
    if (useEfficient) {
      this.efficientlySaveData(
        this.getName() + 'Data',
        'data',
        {
          messageRecord: this.messageRecord,
          deletedMessageRecord: this.deletedMessageRecord,
          editedMessageRecord: this.editedMessageRecord,
          purgedMessageRecord: this.purgedMessageRecord
        },
        callback
      );
    } else {
      BdApi.Data.save(this.getName() + 'Data', 'data', {
        messageRecord: this.messageRecord,
        deletedMessageRecord: this.deletedMessageRecord,
        editedMessageRecord: this.editedMessageRecord,
        purgedMessageRecord: this.purgedMessageRecord
      });
      callback();
    }
  }
  saveData() {
    if (!this.settings.dontSaveData && !this.requestedDataSave) this.requestedDataSave = setTimeout(() => this.handleDataSaving(), 1000); // needs to be async
  }
  efficientlySaveData(name, key, data, callback) {
    try {
      let loadedData;
      try {
        /* bd gay bruh */
        loadedData = BdApi.Data.load(name, key);
      } catch (err) { }
      if (loadedData) for (const key in data) loadedData[key] = data[key];
      this.nodeModules.fs.writeFile(this.nodeModules.path.join(this.pluginDir, `${name}.config.json`), JSON.stringify({ [key]: data }), callback);
    } catch (e) {
      BdApi.UI.showNotification({ title: this.getName(), content: 'There has been an error saving the data file', type: 'error' });
      Logger.stacktrace(this.getName(), 'There has been an error saving the data file', e);
    }
  }
  saveBackup() {
    const callback = err => {
      if (err) {
        BdApi.UI.showNotification({ title: this.getName(), content: 'There has been an error saving the data file', type: 'error' });
        Logger.stacktrace(this.getName(), 'There has been an error saving the data file', err);
      }
      this.saveBackupTimeout = 0;
      this.autoBackupSaveInterupts = 0;
      if (!this.loadData(this.getName() + 'DataBackup', 'data').messageRecord) this.saveBackupTimeout = setTimeout(() => this.saveBackup, 300); // don't be taxing
    };
    const useEfficient = !window.ED;
    if (useEfficient) {
      this.efficientlySaveData(
        this.getName() + 'DataBackup',
        'data',
        {
          messageRecord: this.messageRecord,
          deletedMessageRecord: this.deletedMessageRecord,
          editedMessageRecord: this.editedMessageRecord,
          purgedMessageRecord: this.purgedMessageRecord
        },
        callback
      );
    } else {
      BdApi.Data.save(this.getName() + 'DataBackup', 'data', {
        messageRecord: this.messageRecord,
        deletedMessageRecord: this.deletedMessageRecord,
        editedMessageRecord: this.editedMessageRecord,
        purgedMessageRecord: this.purgedMessageRecord
      });
      callback();
    }
  }
  parseHTML(html) {
    // TODO: drop this func, it's 75% slower than just making the elements manually
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
  }
  randomString() {
    let start = rand();
    while (start[0].toUpperCase() == start[0].toLowerCase()) start = rand();
    return start + '-' + rand();
    function rand() {
      return Math.random().toString(36).substr(2, 7);
    }
  }
  obfuscatedClass(selector) {
    if (!this.obfuscatedClass.obfuscations) this.obfuscatedClass.obfuscations = {};
    if (this.settings.obfuscateCSSClasses) {
      const { obfuscations } = this.obfuscatedClass;
      return obfuscations[selector] || (obfuscations[selector] = this.randomString());
    }
    return selector;
  }
  createTimeStamp(from = undefined, forcedDate = false) {
    // todo: timestamp for edited tooltip
    let date;
    if (from) date = new Date(from);
    else date = new Date();
    return (this.settings.displayDates || forcedDate) && forcedDate !== -1 ? `${date.toLocaleTimeString()}, ${date.toLocaleDateString()}` : forcedDate !== -1 ? date.toLocaleTimeString() : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  getCachedMessage(id, channelId = 0) {
    let cached = this.cachedMessageRecord.find(m => m.id == id);
    if (cached) return cached;
    if (channelId) return this.tools.getMessage(channelId, id); // if the message isn't cached, it returns undefined
    return null;
  }
  getEditedMessage(messageId, channelId) {
    if (this.editedMessageRecord[channelId] && this.editedMessageRecord[channelId].findIndex(m => m === messageId) != -1) {
      return this.messageRecord[messageId];
    }
    return null;
  }
  getSavedMessage(id) {
    /* DEPRECATED */
    return this.messageRecord[id];
  }
  cleanupUserObject(user) {
    /* backported from MLV2 rewrite */
    return {
      discriminator: user.discriminator,
      username: user.username,
      avatar: user.avatar,
      id: user.id,
      bot: user.bot,
      public_flags: typeof user.publicFlags !== 'undefined' ? user.publicFlags : user.public_flags
    };
  }
  cleanupMessageObject(message) {
    const ret = {
      mention_everyone: typeof message.mention_everyone !== 'boolean' ? typeof message.mentionEveryone !== 'boolean' ? false : message.mentionEveryone : message.mention_everyone,
      edited_timestamp: message.edited_timestamp || message.editedTimestamp && new Date(message.editedTimestamp).getTime() || null,
      attachments: message.attachments || [],
      channel_id: message.channel_id,
      reactions: (message.reactions || []).map(e => (!e.emoji.animated && delete e.emoji.animated, !e.me && delete e.me, e)),
      guild_id: message.guild_id || (this.ChannelStore.getChannel(message.channel_id) ? this.ChannelStore.getChannel(message.channel_id).guild_id : undefined),
      content: message.content,
      type: message.type,
      embeds: message.embeds || [],
      author: this.cleanupUserObject(message.author),
      mentions: (message.mentions || []).map(e => (typeof e === 'string' ? this.UserStore.getUser(e) ? this.cleanupUserObject(this.UserStore.getUser(e)) : e : this.cleanupUserObject(e))),
      mention_roles: message.mention_roles || message.mentionRoles || [],
      id: message.id,
      flags: message.flags,
      timestamp: new Date(message.timestamp).getTime(),
      referenced_message: null
    };
    if (ret.type === 19) {
      ret.message_reference = message.message_reference || message.messageReference;
      if (ret.message_reference) {
        if (message.referenced_message) {
          ret.referenced_message = this.cleanupMessageObject(message.referenced_message);
        } else if (this.messageStore.getMessage(ret.message_reference.channel_id, ret.message_reference.message_id)) {
          ret.referenced_message = this.cleanupMessageObject(this.messageStore.getMessage(ret.message_reference.channel_id, ret.message_reference.message_id));
        }
      }
    }
    this.fixEmbeds(ret);
    return ret;
  }
  createMiniFormattedData(message) {
    message = this.lodash.cloneDeep(message);
    const obj = {
      message: this.cleanupMessageObject(message), // works!
      local_mentioned: this.tools.isMentioned(message, this.localUser.id),
      /* ghost_pinged: false, */
      delete_data: null /*  {
                    time: integer,
                    hidden: bool
                } */,
      edit_history: null /* [
                    {
                        content: string,
                        timestamp: string
                    }
                ],
                edits_hidden: bool */
    };
    return obj;
  }
  getSelectedTextChannel() {
    return this.ChannelStore.getChannel(this.SelectedChannelStore.getChannelId());
  }
  invalidateAllChannelCache() {
    for (let channelId in this.channelMessages) this.invalidateChannelCache(channelId);
  }
  invalidateChannelCache(channelId) {
    if (!this.channelMessages[channelId]) return;
    this.channelMessages[channelId].ready = false;
  }
  cacheChannelMessages(id, relative) {
    // TODO figure out if I can use this to get messages at a certain point
    this.tools.fetchMessages({ channelId: id, limit: 50, jump: (relative && { messageId: relative, ML2: true }) || undefined });
  }
  /* UNUSED */
  cachenChannelMessagesRelative(channelId, messageId) {
    ZeresPluginLibrary.DiscordModules.APIModule.get({
      url: ZeresPluginLibrary.DiscordModules.DiscordConstants.Endpoints.MESSAGES(channelId),
      query: {
        before: null,
        after: null,
        limit: 50,
        around: messageId
      }
    })
      .then(res => {
        if (res.status != 200) return;
        const results = res.body;
        const final = results.filter(x => this.cachedMessageRecord.findIndex(m => x.id === m.id) == -1);
        this.cachedMessageRecord.push(...final);
      })
      .catch(err => {
        Logger.stacktrace(this.getName(), `Error caching messages from ${channelId} around ${messageId}`, err);
      });
  }
  formatMarkup(content, channelId) {
    const markup = document.createElement('div');

    const parsed = this.tools.parse(content, true, channelId ? { channelId: channelId } : {});
    // error, this render doesn't work with tags
    //  TODO: this parser and renderer sucks
    // this may be causing a severe memory leak over the course of a few hours
    const root = BdApi.ReactDOM.createRoot(markup);
    root.render(parsed);

    const hiddenClass = this.classes.hidden;

    const hidden = markup.getElementsByClassName(hiddenClass);

    for (let i = 0; i < hidden.length; i++) {
      hidden[i].classList.remove(hiddenClass);
    }
    let previousTab = this.menu.selectedTab;
    let previousOpen = this.menu.open;
    const callback = () => {
      if (this.menu.open === previousOpen && this.menu.selectedTab === previousTab) return; /* lol ez */
      try {
        root.unmount();
      } catch (e) {
        Logger.stacktrace(this.getName(), 'Error unmounting markup', e);
      }
      this.unsubscribeObserver(callback);
    };
    this.subscribeObserver(callback, mutation => {
      const nodes = Array.from(mutation.removedNodes);
      const directMatch = nodes.indexOf(markup) > -1;
      const parentMatch = nodes.some(parent => parent.contains(markup));
      return directMatch || parentMatch;
    });
    return markup;
  }
  clamp(val, min, max) {
    // this is so sad, can we hit Metalloriff?
    // his message logger added the func to Math obj and I didn't realize
    return Math.max(min, Math.min(val, max));
  }
  deleteEditedMessageFromRecord(id, editNum) {
    const record = this.messageRecord[id];
    if (!record) return;

    record.edit_history.splice(editNum, 1);
    if (!record.edit_history.length) record.edit_history = null;
    else return this.saveData();

    const channelId = record.message.channel_id;
    const channelMessages = this.editedMessageRecord[channelId];
    channelMessages.splice(
      channelMessages.findIndex(m => m === id),
      1
    );
    if (this.deletedMessageRecord[channelId] && this.deletedMessageRecord[channelId].findIndex(m => m === id) != -1) return this.saveData();
    if (this.purgedMessageRecord[channelId] && this.purgedMessageRecord[channelId].findIndex(m => m === id) != -1) return this.saveData();
    delete this.messageRecord[id];
    this.saveData();
  }
  jumpToMessage(channelId, messageId, guildId) {
    if (this.menu.open) this.ModalStack.closeModal(this.style.menu);
    this.tools.transitionTo(`/channels/${guildId || '@me'}/${channelId}${messageId ? '/' + messageId : ''}`);
  }
  isImage(url) {
    return /\.(jpe?g|png|gif|bmp)(?:$|\?)/i.test(url);
  }
  cleanupEmbed(embed) {
    /* backported code from MLV2 rewrite */
    if (!embed.id) return embed; /* already cleaned */
    const retEmbed = {};
    if (typeof embed.rawTitle === 'string') retEmbed.title = embed.rawTitle;
    if (typeof embed.rawDescription === 'string') retEmbed.description = embed.rawDescription;
    if (typeof embed.referenceId !== 'undefined') retEmbed.reference_id = embed.referenceId;
    if (typeof embed.color === 'string') {
      let { color } = embed;
      if (color.length === 4) color = `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
      retEmbed.color = this.lodash.parseInt(color.slice(1), 16);
    }
    if (typeof embed.type !== 'undefined') retEmbed.type = embed.type;
    if (typeof embed.url !== 'undefined') retEmbed.url = embed.url;
    if (typeof embed.provider === 'object') retEmbed.provider = { name: embed.provider.name, url: embed.provider.url };
    if (typeof embed.footer === 'object') retEmbed.footer = { text: embed.footer.text, icon_url: embed.footer.iconURL, proxy_icon_url: embed.footer.iconProxyURL };
    if (typeof embed.author === 'object') retEmbed.author = { name: embed.author.name, url: embed.author.url, icon_url: embed.author.iconURL, proxy_icon_url: embed.author.iconProxyURL };
    if (typeof embed.timestamp === 'object' && embed.timestamp._isAMomentObject) retEmbed.timestamp = embed.timestamp.milliseconds();
    if (typeof embed.thumbnail === 'object') {
      if (typeof embed.thumbnail.proxyURL === 'string' || (typeof embed.thumbnail.url === 'string' && !embed.thumbnail.url.endsWith('?format=jpeg'))) {
        retEmbed.thumbnail = {
          url: embed.thumbnail.url,
          proxy_url: typeof embed.thumbnail.proxyURL === 'string' ? embed.thumbnail.proxyURL.split('?format')[0] : undefined,
          width: embed.thumbnail.width,
          height: embed.thumbnail.height
        };
      }
    }
    if (typeof embed.image === 'object') {
      retEmbed.image = {
        url: embed.image.url,
        proxy_url: embed.image.proxyURL,
        width: embed.image.width,
        height: embed.image.height
      };
    }
    if (typeof embed.video === 'object') {
      retEmbed.video = {
        url: embed.video.url,
        proxy_url: embed.video.proxyURL,
        width: embed.video.width,
        height: embed.video.height
      };
    }
    if (Array.isArray(embed.fields) && embed.fields.length) {
      retEmbed.fields = embed.fields.map(e => ({ name: e.rawName, value: e.rawValue, inline: e.inline }));
    }
    return retEmbed;
  }
  fixEmbeds(message) {
    message.embeds = message.embeds.map(this.cleanupEmbed);
  }
  isCompact() {
    return false; // fix if someone complains, no one has so far so who cares
  }
  /* ==================================================-|| END HELPERS ||-================================================== */
  /* ==================================================-|| START MISC ||-================================================== */
  addOpenLogsButton() {
    if (!this.selectedChannel) return;
    const parent = document.querySelector('div[class*="chat_"] div[class*="toolbar_"]');
    if (!parent) return;
    const srch = parent.querySelector('div[class*="search_"]'); // you know who you are that think this is my issue
    if (!srch) return;
    parent.insertBefore(this.channelLogButton, srch);
  }
  removeOpenLogsButton() {
    this.channelLogButton.remove();
  }
  showLoggerHelpModal(initial = false) {
    BdApi.UI.showConfirmationModal('Logger help',
      React.createElement('div', { className: this.multiClasses.defaultColor, style: { maxHeight: '0', minHeight: '60vh' } },
        initial ? React.createElement('span', { style: { fontSize: '40px' } },
          'As you are a ', React.createElement('strong', null, 'first time user'),
          ', you must know in order to have a server be logged, you must ', React.createElement('strong', null, 'RIGHT CLICK'),
          ' a server or channel and add it to the whitelist.', React.createElement('br'),
          'Alternatively if this behavior is unwanted, you can always log all unmuted servers and channels by disabling ',
          React.createElement('strong', null, 'Only log whitelist'),
          ' in logger settings under ', React.createElement('strong', null, 'IGNORES AND OVERRIDES'),
          '.', React.createElement('br'), React.createElement('br')
        ) : null,
        'Hello! This is the ', this.getName(), ' help modal! You may at any time open this in plugin settings by clicking the help button, or in the menu by pressing the question mark button and then then Logger help button.', React.createElement('br'),
        React.createElement('strong', null, 'Menu:'), React.createElement('br'), React.createElement('br'),
        React.createElement('div', { className: this.style.textIndent },
          'DELETE + LEFT-CLICK:', React.createElement('br'),
          React.createElement('div', { className: this.style.textIndent },
            'Clicking on a message, deletes the message', React.createElement('br'),
            'Clicking on an edit deletes that specific edit', React.createElement('br'),
            'Clicking on the timestamp deletes all messages in that message group'
          ), React.createElement('br'),
          'RIGHT-CLICK:', React.createElement('br'),
          React.createElement('div', { className: this.style.textIndent },
            'Right-clicking the timestamp opens up options for the entire message group'
          ), React.createElement('br')
        ),
        React.createElement('strong', null, 'Toasts:'), React.createElement('br'),
        React.createElement('div', { className: this.style.textIndent },
          'Note: Little "notifications" in discord that tell you if a message was edited, deleted, purged etc are called Toasts!', React.createElement('br'), React.createElement('br'),
          'LEFT-CLICK:', React.createElement('br'),
          React.createElement('div', { className: this.style.textIndent },
            'Opens menu with the relevant tab', React.createElement('br')
          ), React.createElement('br'),
          'RIGHT-CLICK:', React.createElement('br'),
          React.createElement('div', { className: this.style.textIndent },
            'Jumps to relevant message in the relevant channel', React.createElement('br')
          ), React.createElement('br'),
          'MIDDLE-CLICK/SCROLLWHEEL-CLICK:', React.createElement('br'),
          React.createElement('div', { className: this.style.textIndent },
            'Only dismisses/closes the Toast.', React.createElement('br')
          ), React.createElement('br')
        ),
        React.createElement('strong', null, 'Notifications:'), React.createElement('br'),
        React.createElement('div', { className: this.style.textIndent },
          'Note: They show in the top right corner and are called notifications. Can be enabled in Settings > Display Settings, all the way at the bottom.', React.createElement('br'), React.createElement('br'),
          'LEFT-CLICK:', React.createElement('br'),
          React.createElement('div', { className: this.style.textIndent },
            'Opens menu with the relevant tab', React.createElement('br')
          ), React.createElement('br'),
          'RIGHT-CLICK:', React.createElement('br'),
          React.createElement('div', { className: this.style.textIndent },
            'Jumps to relevant message in the relevant channel', React.createElement('br')
          ), React.createElement('br')
        ),
        React.createElement('strong', null, 'Open Logs button (top right next to search):'), React.createElement('br'),
        React.createElement('div', { className: this.style.textIndent },
          'LEFT-CLICK:', React.createElement('br'),
          React.createElement('div', { className: this.style.textIndent },
            'Opens menu', React.createElement('br')
          ), React.createElement('br'),
          'RIGHT-CLICK:', React.createElement('br'),
          React.createElement('div', { className: this.style.textIndent },
            'Opens filtered menu that only shows messages from selected channel', React.createElement('br')
          ), React.createElement('br')
        ),
        React.createElement('strong', null, 'Whitelist/blacklist, ignores and overrides:'), React.createElement('br'),
        React.createElement('div', { className: this.style.textIndent },
          'WHITELIST-ONLY:', React.createElement('br'),
          React.createElement('div', { className: this.style.textIndent },
            'All servers are ignored unless whitelisted', React.createElement('br'),
            'Muted channels in whitelisted servers are ignored unless whitelisted or "Ignore muted channels" is disabled', React.createElement('br'),
            'All channels in whitelisted servers are logged unless blacklisted, or muted and "Ignore muted channels" is enabled'
          ), React.createElement('br'),
          'DEFAULT:', React.createElement('br'),
          React.createElement('div', { className: this.style.textIndent },
            'All servers are logged unless blacklisted or muted and "Ignore muted servers" is enabled', React.createElement('br'),
            'Muted channels are ignored unless whitelisted or "Ignore muted channels" is disabled', React.createElement('br'),
            'Muted servers are ignored unless whitelisted or "Ignore muted servers" is disabled', React.createElement('br'),
            'Whitelisted channels in muted or blacklisted servers are logged'
          ), React.createElement('br'),
          'ALL:', React.createElement('br'),
          React.createElement('div', { className: this.style.textIndent },
            'Whitelisted channels in blacklisted servers are logged', React.createElement('br'),
            'Blacklisted channels in whitelisted servers are ignored', React.createElement('br'),
            '"Always log selected channel" overrides blacklist, whitelist-only mode, NSFW channel ignore, mute', React.createElement('br'),
            '"Always log DMs" overrides blacklist as well as whitelist-only mode', React.createElement('br'),
            'Channels marked NSFW and not whitelisted are ignored unless "Ignore NSFW channels" is disabled'
          ), React.createElement('br')
        ),
        React.createElement('strong', null, 'Chat:'), React.createElement('br'),
        React.createElement('div', { className: this.style.textIndent },
          'RIGHT-CLICK:', React.createElement('br'),
          React.createElement('div', { className: this.style.textIndent },
            'Right-clicking an edit (darkened text) allows you to delete that edit, or hide edits', React.createElement('br'),
            'Right-clicking on a edited or deleted message gives you the option to hide the deleted message or hide or unhide edits, remove the edited or deleted message from log and remove deleted tint which makes the message look like it isn\'t deleted.'
          ), React.createElement('br')
        )
      ),
      {
        confirmText: 'OK',
        cancelText: null
        // sizing is currently not exposed.. nor is classes, so can't fix
        // https://github.com/BetterDiscord/BetterDiscord/issues/1793
        // https://github.com/BetterDiscord/BetterDiscord/pull/1837
      }
    );
  }
  showStatsModal() {
    const elements = [];
    let totalMessages = Object.keys(this.messageRecord).length;
    let messageCounts = [];
    let spaceUsageMB = 0;
    let cachedImageCount = 0;
    let cachedImagesUsageMB = 0;

    let mostDeletesChannel = { num: 0, id: '' };
    let mostEditsChannel = { num: 0, id: '' };
    let deleteDataTemp = {};
    let editDataTemp = {};

    for (const map of [this.deletedMessageRecord, this.editedMessageRecord, this.cachedMessageRecord]) {
      let messageCount = 0;
      if (!Array.isArray(map)) {
        for (const channelId in map) {
          if (!deleteDataTemp[channelId]) deleteDataTemp[channelId] = [];
          if (!editDataTemp[channelId]) editDataTemp[channelId] = [];
          for (const messageId of map[channelId]) {
            messageCount++;
            const record = this.messageRecord[messageId];
            if (!record) continue; // wtf?
            if (record.delete_data && deleteDataTemp[channelId].findIndex(m => m === messageId)) deleteDataTemp[channelId].push(messageId);
            if (record.edit_history && editDataTemp[channelId].findIndex(m => m === messageId)) editDataTemp[channelId].push(messageId);
          }
        }
      }
      for (const channelId in deleteDataTemp) if (deleteDataTemp[channelId].length > mostDeletesChannel.num) mostDeletesChannel = { num: deleteDataTemp[channelId].length, id: channelId };
      for (const channelId in editDataTemp) if (editDataTemp[channelId].length > mostEditsChannel.num) mostEditsChannel = { num: editDataTemp[channelId].length, id: channelId };

      messageCounts.push(messageCount);
    }
    const addLine = (name, value) => {
      elements.push(
        React.createElement('div', { className: this.multiClasses.defaultColor, key: name },
          React.createElement('strong', null, `${name}: `),
          value
        )
      );
    };
    addLine('Total messages', totalMessages);
    addLine('Deleted message count', messageCounts[0]);
    addLine('Edited message count', messageCounts[1]);
    addLine('Sent message count', this.cachedMessageRecord.length);

    let channel = this.tools.getChannel(mostDeletesChannel.id);
    if (channel) addLine('Most deletes', mostDeletesChannel.num + ' ' + this.getLiteralName(channel.guild_id, channel.id));
    if (channel) addLine('Most edits', mostEditsChannel.num + ' ' + this.getLiteralName(channel.guild_id, channel.id));

    //    addLine('Data file size', (this.nodeModules.fs.statSync(this.pluginDir + '/MessageLoggerV2Data.config.json').size / 1024 / 1024).toFixed(2) + 'MB');
    //  addLine('Data file size severity', this.slowSaveModeStep == 0 ? 'OK' : this.slowSaveModeStep == 1 ? 'MILD' : this.slowSaveModeStep == 2 ? 'BAD' : 'EXTREME');

    BdApi.UI.showConfirmationModal('Data stats', React.createElement('div', null, elements), {
      confirmText: 'OK',
      cancelText: null
    });
  }
  _findLastIndex(array, predicate) {
    let l = array.length;
    while (l--) {
      if (predicate(array[l], l, array))
        return l;
    }
    return -1;
  }
  /*
  how it works:
  messages, stripped into IDs and times into var IDs:
  [1, 2, 3, 4, 5, 6, 7]
   ^                 ^
   lowestTime      highestTime
   deletedMessages, stripped into IDs and times into var savedIDs:
   sorted by time, newest to oldest
   lowest IDX that is higher than lowestTime, unless channelEnd, then it's 0
   highest IDX that is lower than highestTime, unless channelStart, then it's savedIDs.length - 1

   savedIDs sliced start lowest IDX, end highest IDX + 1
   appended IDs
   sorted by time, oldest to newest
   iterated, checked if ID is in messages, if not, fetch from this.messageRecord and splice it in at
   specified index
  */
  reAddDeletedMessages(messages, deletedMessages, channelStart, channelEnd) {
    if (!messages.length || !deletedMessages.length) return;
    const DISCORD_EPOCH = 14200704e5;
    const IDs = [];
    const savedIDs = [];
    for (let i = 0, len = messages.length; i < len; i++) {
      const { id } = messages[i];
      IDs.push({ id: id, time: (id / 4194304) + DISCORD_EPOCH });
    }
    for (let i = 0, len = deletedMessages.length; i < len; i++) {
      const id = deletedMessages[i];
      const record = this.messageRecord[id];
      if (!record) continue;
      if (!record.delete_data) {
        /* SOME WIZARD BROKE THE LOGGER LIKE THIS, WTFFFF */
        this.deleteMessageFromRecords(id);
        continue;
      }
      if (record.delete_data.hidden) continue;
      savedIDs.push({ id: id, time: (id / 4194304) + DISCORD_EPOCH });
    }
    savedIDs.sort((a, b) => a.time - b.time);
    if (!savedIDs.length) return;
    const { time: lowestTime } = IDs[IDs.length - 1];
    const [{ time: highestTime }] = IDs;
    const lowestIDX = channelEnd ? 0 : savedIDs.findIndex(e => e.time > lowestTime);
    if (lowestIDX === -1) return;
    const highestIDX = channelStart ? savedIDs.length - 1 : this._findLastIndex(savedIDs, e => e.time < highestTime);
    if (highestIDX === -1) return;
    const reAddIDs = savedIDs.slice(lowestIDX, highestIDX + 1);
    reAddIDs.push(...IDs);
    reAddIDs.sort((a, b) => b.time - a.time);
    for (let i = 0, len = reAddIDs.length; i < len; i++) {
      const { id } = reAddIDs[i];
      if (messages.findIndex((e) => e.id === id) !== -1) continue;
      const { message } = this.messageRecord[id];
      messages.splice(i, 0, message);
    }
  }
  getLiteralName(guildId, channelId, useTags = false) {
    useTags = false;  // remove when markdown works in notifs smh
    // TODO, custom channel server failure text
    const guild = this.tools.getServer(guildId);
    const channel = this.tools.getChannel(channelId); // todo
    /* if (typeof guildNameBackup !== 'number' && guild && guildNameBackup)  */ if (guildId) {
      const channelName = (channel ? channel.name : 'unknown-channel');
      const guildName = (guild ? guild.name : 'unknown-server');
      if (useTags && channel) return `${guildName}, <#${channel.id}>`;
      return `${guildName}, #${channelName}`;
    } else if (channel && channel.name.length) {
      return `group ${channel.name}`;
    } else if (channel && channel.type == 3) {
      let finalGroupName = '';
      for (let i of channel.recipients) {
        const user = this.tools.getUser(i);
        if (!user) continue;
        if (useTags) finalGroupName += ', <@' + user.id + '>';
        else finalGroupName += ',' + user.username;
      }
      if (!finalGroupName.length) {
        return 'unknown group';
      } else {
        finalGroupName = finalGroupName.substr(1);
        if (useTags) return `group ${finalGroupName}`;
        finalGroupName = finalGroupName.length > 10 ? finalGroupName.substr(0, 10 - 1) + '...' : finalGroupName;
        return `group ${finalGroupName}`;
      }
    } else if (channel && channel.recipients) {
      const user = this.tools.getUser(channel.recipients[0]);
      if (!user) return 'DMs';
      if (useTags) return `<@${user.id}> DMs`;
      return `${user.username} DMs`;
    } else {
      return 'DMs';
    }
  }
  saveDeletedMessage(message, targetMessageRecord) {
    let result = this.createMiniFormattedData(message);
    result.delete_data = {};
    const id = message.id;
    const channelId = message.channel_id;
    result.delete_data.time = new Date().getTime();
    result.ghost_pinged = result.local_mentioned; // it's simple bruh
    if (!Array.isArray(targetMessageRecord[channelId])) targetMessageRecord[channelId] = [];
    if (this.messageRecord[id]) {
      const record = this.messageRecord[id];
      record.delete_data = result.delete_data;
      record.ghost_pinged = result.ghost_pinged;
    } else {
      this.messageRecord[id] = result;
    }
    if (this.messageRecord[id].message.attachments) {
      const attachments = this.messageRecord[id].message.attachments;
      for (let i = 0; i < attachments.length; i++) {
        attachments[i].url = attachments[i].proxy_url; // proxy url lasts longer
      }
    }
    if (this.settings.cacheAllImages) this.cacheMessageImages(this.messageRecord[id].message);
    targetMessageRecord[channelId].push(id);
  }
  createButton(label, callback) {
    const classes = this.createButton.classes;
    const ret = this.parseHTML(`<button type="button" class="${classes.button}"><div class="${classes.buttonContents}">${label}</div></button>`);
    if (callback) ret.addEventListener('click', callback);
    return ret;
  }
  createModal(options, image, name) {
    if (image) {
      const openMediaViewer = Webpack.getBySource('Media Viewer Modal', { declarationFilter: e => typeof e === 'function' });
      if (typeof openMediaViewer !== 'function') return BdApi.UI.showToast('Failed to open image modal, missing dependency');
      if (!options.message) return;

      /*
      {
          "items": [
              {
                  "url": "https://media.discordapp.net/attachments/633043211920736272/1504159671789944832/bafkreiblgtjkdczvqzfiqbf45wc4ji5eaxfhbzvadoeqrckft64vdfjwjq.webp?ex=6a05f95b&is=6a04a7db&hm=85b2b5862087323806b92a4dbd91fdd22294408448909846b92acfcc316055f2&",
                  "width": 1362,
                  "height": 1192,
                  "type": "IMAGE",
                  "contentType": "image/webp",
                  "originalContentType": "image/webp",
                  "zoomThumbnailPlaceholder": "https://media.discordapp.net/attachments/633043211920736272/1504159671789944832/bafkreiblgtjkdczvqzfiqbf45wc4ji5eaxfhbzvadoeqrckft64vdfjwjq.webp?ex=6a05f95b&is=6a04a7db&hm=85b2b5862087323806b92a4dbd91fdd22294408448909846b92acfcc316055f2&=&format=webp&width=400&height=350",
                  "animated": false,
                  "srcIsAnimated": false,
                  "trigger": "CLICK",
                  "sourceMetadata": {
                      "message": <MESSAGE>,
                      "identifier": {
                          "type": "attachment",
                          "attachmentId": "1504159671789944832",
                          "filename": "bafkreiblgtjkdczvqzfiqbf45wc4ji5eaxfhbzvadoeqrckft64vdfjwjq.webp",
                          "size": 34200
                      }
                  },
                  "original": "https://cdn.discordapp.com/attachments/633043211920736272/1504159671789944832/bafkreiblgtjkdczvqzfiqbf45wc4ji5eaxfhbzvadoeqrckft64vdfjwjq.webp?ex=6a05f95b&is=6a04a7db&hm=85b2b5862087323806b92a4dbd91fdd22294408448909846b92acfcc316055f2&"
              }
          ],
          "shouldHideMediaOptions": false,
          "location": "ImageComponentForMessageAttachment",
          "contextKey": "default"
      }
      */
      const { message } = options;
      const attachment = message.attachments[options.idx];
      if (!attachment) return BdApi.UI.showToast('Failed to open image modal, attachment idx does not exist');

      return openMediaViewer({
        items: [
          {
            url: attachment.url,
            width: attachment.width,
            height: attachment.height,
            type: 'IMAGE',
            contentType: attachment.content_type,
            originalContentType: attachment.original_content_type,
            zoomThumbnailPlaceholder: attachment.proxy_url,
            animated: false,
            srcIsAnimated: false,
            trigger: 'CLICK',
            original: attachment.original
          }
        ],
        shouldHideMediaOptions: true
      });
    }
    this.ModalStack.openModal(props => React.createElement(this.createModal.confirmationModal, Object.assign({}, options, props, options.onClose ? { onClose: options.onClose } : {})), { modalKey: name });
  }
  getMessageAny(id) {
    const record = this.messageRecord[id];
    if (!record) return this.cachedMessageRecord.find(m => m.id == id);
    return record.message;
  }
  async cacheImage(url, attachmentIdx, attachmentId, messageId, channelId, attempts = 0) {
    const res = await fetch(url);
    if (res.status != 200) {
      if (res.status == 404 || res.status == 403) return;
      attempts++;
      if (attempts > 3) return Logger.warn(this.getName(), `Failed to get image ${attachmentId} for caching, error code ${res.status}`);
      return setTimeout(() => this.cacheImage(url, attachmentIdx, attachmentId, messageId, channelId, attempts), 1000);
    }
    const fileExtension = url.match(/(\.[0-9a-z]+)(?:$|\?)/i)[1];
    const ab = await res.arrayBuffer();
    this.nodeModules.fs.writeFileSync(`${this.settings.imageCacheDir}/${attachmentId}${fileExtension}`, Buffer.from(ab));
  }
  cacheMessageImages(message) {
    // don't block it, ugly but works, might rework later
    setTimeout(() => {
      for (let i = 0; i < message.attachments.length; i++) {
        const attachment = message.attachments[i];
        if (!this.isImage(attachment.url)) continue;
        this.cacheImage(attachment.url, i, attachment.id, message.id, message.channel_id);
      }
    }, 0);
  }
  /* ==================================================-|| END MISC ||-================================================== */
  /* ==================================================-|| START MESSAGE MANAGMENT ||-================================================== */
  deleteMessageFromRecords(id) {
    const record = this.messageRecord[id];
    if (!record) {
      for (let map of [this.deletedMessageRecord, this.editedMessageRecord, this.purgedMessageRecord]) {
        for (let channelId in map) {
          const index = map[channelId].findIndex(m => m === id);
          if (index == -1) continue;
          map[channelId].splice(index, 1);
          if (!map[channelId].length) delete map[channelId];
        }
      }
      return;
    }
    // console.log('Deleting', record);
    const channelId = record.message.channel_id;
    for (let map of [this.deletedMessageRecord, this.editedMessageRecord, this.purgedMessageRecord]) {
      if (!map[channelId]) continue;
      const index = map[channelId].findIndex(m => m === id);
      if (index == -1) continue;
      map[channelId].splice(index, 1);
      if (!map[channelId].length) delete map[channelId];
    }
    delete this.messageRecord[id];
  }
  handleMessagesCap() {
    try {
      // TODO: add empty record and infinite loop checking for speed improvements
      const extractAllMessageIds = map => {
        let ret = [];
        for (let channelId in map) {
          for (let messageId of map[channelId]) {
            ret.push(messageId);
          }
        }
        return ret;
      };
      if (this.cachedMessageRecord.length > this.settings.messageCacheCap) this.cachedMessageRecord.splice(0, this.cachedMessageRecord.length - this.settings.messageCacheCap);
      let changed = false;
      const deleteMessages = map => {
        this.sortMessagesByAge(map);
        const toDelete = map.length - this.settings.savedMessagesCap;
        for (let i = map.length - 1, deleted = 0; i >= 0 && deleted != toDelete; i--, deleted++) {
          this.deleteMessageFromRecords(map[i]);
        }
        changed = true;
      };
      const handleInvalidEntries = map => {
        for (let channelId in map) {
          for (let messageIdIdx = map[channelId].length - 1; messageIdIdx >= 0; messageIdIdx--) {
            if (!Array.isArray(map[channelId])) {
              delete map[channelId];
              changed = true;
              continue;
            }
            if (!this.messageRecord[map[channelId][messageIdIdx]]) {
              map[channelId].splice(messageIdIdx, 1);
              changed = true;
            }
          }
          if (!map[channelId].length) {
            delete map[channelId];
            changed = true;
          }
        }
      };
      for (let map of [this.deletedMessageRecord, this.editedMessageRecord, this.purgedMessageRecord]) handleInvalidEntries(map);
      // I have no idea how to optimize this, HELP!
      //const checkIsInRecords = (channelId, messageId) => {
      //  // for (let map of [this.deletedMessageRecord, this.editedMessageRecord, this.purgedMessageRecord]) if (map[channelId] && map[channelId].indexOf(messageId) !== -1) return true;
      //  let map = this.deletedMessageRecord[channelId];
      //  if (map && map.indexOf(messageId) !== -1) return true;
      //  map = this.editedMessageRecord[channelId];
      //  if (map && map.indexOf(messageId) !== -1) return true;
      //  map = this.purgedMessageRecord[channelId];
      //  if (map && map.indexOf(messageId) !== -1) return true;
      //  return false;
      //};

      //for (const messageId in this.messageRecord) {
      //  if (!checkIsInRecords(this.messageRecord[messageId].message.channel_id, messageId)) {/*  delete this.messageRecord[messageId]; */ }
      //}
      let deletedMessages = extractAllMessageIds(this.deletedMessageRecord);
      let editedMessages = extractAllMessageIds(this.editedMessageRecord);
      let purgedMessages = extractAllMessageIds(this.purgedMessageRecord);
      for (let map of [deletedMessages, editedMessages, purgedMessages]) if (map.length > this.settings.savedMessagesCap) deleteMessages(map);
      if (changed) this.saveData();
      if (!this.settings.cacheAllImages) return;
      if (!this.settings.dontDeleteCachedImages) {
        const savedImages = this.nodeModules.fs.readdirSync(this.settings.imageCacheDir);
        const msgs = Object.values(this.messageRecord)
          .filter(e => e.delete_data)
          .map(({ message: { attachments } }) => attachments)
          .filter(e => e.length);
        for (let img of savedImages) {
          const [attId] = img.split('.');
          if (isNaN(attId)) continue;
          let found = false;
          for (let i = 0, len = msgs.length; i < len; i++) {
            if (msgs[i].findIndex(({ id }) => id === attId) !== -1) {
              found = true;
              break;
            }
          }
          if (found) continue;
          this.nodeModules.fs.unlink(`${this.settings.imageCacheDir}/${img}`, e => e && Logger.error(this.getName(), 'Error deleting unreferenced image, what the shit', e.message));
        }
      }
      // 10 minutes
      for (let id in this.editHistoryAntiSpam) if (new Date().getTime() - this.editHistoryAntiSpam[id].times[0] < 10 * 60 * 1000) delete this.editHistoryAntiSpam[id];
    } catch (e) {
      Logger.stacktrace(this.getName(), 'Error clearing out data', e);
    }
  }
  /* ==================================================-|| END MESSAGE MANAGMENT ||-================================================== */
  onDispatchEvent(args, callDefault) {
    const dispatch = args[0];
    let ret = Promise.resolve();

    if (!dispatch) return callDefault(...args);

    try {
      if (dispatch.type === 'MESSAGE_LOGGER_V2_SELF_TEST') {
        clearTimeout(this.selfTestTimeout);
        //console.log('Self test OK');
        this.selfTestFailures = 0;
        return ret;
      }
      // if (dispatch.type == 'EXPERIMENT_TRIGGER') return callDefault(...args);
      // console.log('INFO: onDispatchEvent -> dispatch', dispatch);
      if (dispatch.type === 'CHANNEL_SELECT') {
        ret = callDefault(...args);
        this.selectedChannel = this.getSelectedTextChannel();
        return ret;
      }

      if (dispatch.ML2 && dispatch.type === 'MESSAGE_DELETE') return callDefault(...args);

      if (dispatch.type !== 'MESSAGE_CREATE' && dispatch.type !== 'MESSAGE_DELETE' && dispatch.type !== 'MESSAGE_DELETE_BULK' && dispatch.type !== 'MESSAGE_UPDATE' && dispatch.type !== 'LOAD_MESSAGES_SUCCESS') return callDefault(...args);

      // console.log('INFO: onDispatchEvent -> dispatch', dispatch);

      if (dispatch.message && (dispatch.message.type !== 0 && dispatch.message.type !== 19 && (dispatch.message.type !== 20 || (dispatch.message.flags & 64) === 64))) return callDefault(...args); // anti other shit 1

      const channel = this.tools.getChannel(dispatch.message ? dispatch.message.channel_id : dispatch.channelId);
      if (!channel) return callDefault(...args);
      const guild = channel.guild_id ? this.tools.getServer(channel.guild_id) : false;

      let author = dispatch.message && dispatch.message.author ? this.tools.getUser(dispatch.message.author.id) : false;
      if (!author) author = (this.channelMessages[channel.id]?.get(dispatch.message?.id || dispatch.id) || {}).author;
      if (!author) {
        // last ditch attempt
        let message = this.getCachedMessage(dispatch.message?.id || dispatch.id, channel.id);
        if (message) author = this.tools.getUser(message.author.id);
      }

      if (!author && !(dispatch.type == 'LOAD_MESSAGES_SUCCESS' || dispatch.type == 'MESSAGE_DELETE_BULK')) return callDefault(...args);

      const isLocalUser = author && author.id === this.localUser.id;

      if (author && author.bot && this.settings.ignoreBots) return callDefault(...args);
      if (author && isLocalUser && this.settings.ignoreSelf) return callDefault(...args);
      if (author && this.settings.ignoreBlockedUsers && this.tools.isBlocked(author.id) && !isLocalUser) return callDefault(...args);
      if (author && author.avatar === 'clyde') return callDefault(...args);

      if (this.settings.ignoreLocalEdits && dispatch.type === 'MESSAGE_UPDATE' && isLocalUser) return callDefault(...args);
      if (this.settings.ignoreLocalDeletes && dispatch.type === 'MESSAGE_DELETE' && isLocalUser && this.localDeletes.findIndex(m => m === dispatch.id) !== -1) return callDefault(...args);

      let guildIsMutedReturn = false;
      let channelIgnoreReturn = false;

      const isInWhitelist = id => this.settings.whitelist.findIndex(m => m === id) != -1;
      const isInBlacklist = id => this.settings.blacklist.findIndex(m => m === id) != -1;
      const guildWhitelisted = guild && isInWhitelist(guild.id);
      const channelWhitelisted = isInWhitelist(channel.id);

      const guildBlacklisted = guild && isInBlacklist(guild.id);
      const channelBlacklisted = isInBlacklist(channel.id);

      let doReturn = false;

      if (guild) {
        guildIsMutedReturn = this.settings.ignoreMutedGuilds && this.muteModule.isMuted(guild.id);
        channelIgnoreReturn = (this.settings.ignoreNSFW && channel.nsfw && !channelWhitelisted) || (this.settings.ignoreMutedChannels && (this.muteModule.isChannelMuted(guild.id, channel.id) || (channel.parent_id && this.muteModule.isChannelMuted(guild.id, channel.parent_id))));
      }

      if (!((this.settings.alwaysLogSelected && this.selectedChannel && this.selectedChannel.id == channel.id) || (this.settings.alwaysLogDM && !guild))) {
        if (guildBlacklisted) {
          if (!channelWhitelisted) doReturn = true; // not whitelisted
        } else if (guildWhitelisted) {
          if (channelBlacklisted) doReturn = true; // channel blacklisted
          if (channelIgnoreReturn && !channelWhitelisted) doReturn = true;
        } else {
          if (this.settings.onlyLogWhitelist) {
            if (!channelWhitelisted) doReturn = true; // guild not in either list, channel not whitelisted
          } else {
            if (channelBlacklisted) doReturn = true; // channel blacklisted
            if (channelIgnoreReturn || guildIsMutedReturn) {
              if (!channelWhitelisted) doReturn = true;
            }
          }
        }
      }

      if (doReturn && this.settings.alwaysLogGhostPings) {
        if (dispatch.type === 'MESSAGE_DELETE') {
          const deleted = (this.tempEditedMessageRecord[dispatch.id] && this.tempEditedMessageRecord[dispatch.id].message) || this.getCachedMessage(dispatch.id, dispatch.channelId);
          if (!deleted || (deleted.type !== 0 && deleted.type !== 19 && deleted.type !== 20)) return callDefault(...args); // nothing we can do past this point..
          if (!this.tools.isMentioned(deleted, this.localUser.id)) return callDefault(...args);
          const record = this.messageRecord[dispatch.id];
          if ((!this.selectedChannel || this.selectedChannel.id != channel.id) && (guild ? this.settings.toastToggles.ghostPings : this.settings.toastTogglesDMs.ghostPings) && (!record || !record.ghost_pinged)) {
            BdApi.UI.showNotification({ title: this.getName(), content: `You got ghost pinged in ${this.getLiteralName(channel.guild_id, channel.id, true)}`, type: 'warning', duration: Infinity, onClick: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id) });
            if (!this.settings.useNotificationsInstead) {
              BdApi.UI.showToast(`You got ghost pinged in ${this.getLiteralName(channel.guild_id, channel.id)}`, {
                type: 'warning',
                onClick: () => this.openWindow('ghostpings'),
                onContext: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id),
                timeout: 4500
              });
            }
          }
          this.saveDeletedMessage(deleted, this.deletedMessageRecord);
          this.saveData();
          if (this.getSelectedTextChannel()?.id === dispatch.channelId) this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE', id: dispatch.id });
        } else if (dispatch.type === 'MESSAGE_UPDATE') {
          if (!dispatch.message.edited_timestamp) {
            if (dispatch.message.embeds) {
              let last = this.getCachedMessage(dispatch.message.id);
              if (last) last.embeds = dispatch.message.embeds.map(this.cleanupEmbed);
            }
            return callDefault(...args);
          }
          let isSaved = this.getEditedMessage(dispatch.message.id, channel.id);
          const last = this.getCachedMessage(dispatch.message.id, channel.id);
          const lastEditedSaved = isSaved || this.tempEditedMessageRecord[dispatch.message.id];
          // if we have lastEdited then we can still continue as we have all the data we need to process it.
          if (!last && !lastEditedSaved) return callDefault(...args); // nothing we can do past this point..

          if (lastEditedSaved && !lastEditedSaved.message.edited_timestamp) lastEditedSaved.message.edited_timestamp = dispatch.message.edited_timestamp;

          if (isSaved && !lastEditedSaved.local_mentioned) {
            lastEditedSaved.message.content = dispatch.message.content; // don't save history, just the value so we don't confuse the user
            return callDefault(...args);
          }

          let ghostPinged = false;
          if (lastEditedSaved) {
            // last is not needed, we have all the data already saved
            if (lastEditedSaved.message.content === dispatch.message.content) return callDefault(...args); // we don't care about that
            lastEditedSaved.edit_history.push({
              content: lastEditedSaved.message.content,
              time: new Date().getTime()
            });
            lastEditedSaved.message.content = dispatch.message.content;
            ghostPinged = !lastEditedSaved.ghost_pinged && lastEditedSaved.local_mentioned && !this.tools.isMentioned(dispatch.message, this.localUser.id);
          } else {
            if (last.content === dispatch.message.content) return callDefault(...args); // we don't care about that
            let data = this.createMiniFormattedData(last);
            data.edit_history = [
              {
                content: last.content,
                time: new Date().getTime()
              }
            ];
            data.message.content = dispatch.message.content;
            this.tempEditedMessageRecord[data.message.id] = data;
            ghostPinged = this.tools.isMentioned(last, this.localUser.id) && !this.tools.isMentioned(dispatch.message, this.localUser.id);
          }

          if (isSaved) this.saveData();

          if (!ghostPinged) return callDefault(...args);

          if (!isSaved) {
            const data = this.tempEditedMessageRecord[dispatch.message.id];
            data.ghost_pinged = true;
            this.messageRecord[dispatch.message.id] = data;
            if (!this.editedMessageRecord[channel.id]) this.editedMessageRecord[channel.id] = [];
            this.editedMessageRecord[channel.id].push(dispatch.message.id);
            this.saveData();
          } else {
            const lastEdited = this.getEditedMessage(dispatch.message.id, channel.id);
            if (!lastEdited) return callDefault(...args);
            lastEdited.ghost_pinged = true;
            this.saveData();
          }

          if ((!this.selectedChannel || this.selectedChannel.id != channel.id) && (guild ? this.settings.toastToggles.ghostPings : this.settings.toastTogglesDMs.ghostPings)) {
            BdApi.UI.showNotification({ title: this.getName(), content: `You got ghost pinged in ${this.getLiteralName(channel.guild_id, channel.id, true)}`, type: 'warning', duration: Infinity, onClick: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id) });
            if (!this.settings.useNotificationsInstead) {
              BdApi.UI.showToast(`You got ghost pinged in ${this.getLiteralName(channel.guild_id, channel.id)}`, {
                type: 'warning',
                onClick: () => this.openWindow('ghostpings'),
                onContext: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id),
                timeout: 4500
              });
            }
          }
        } else if (dispatch.type == 'MESSAGE_CREATE' && dispatch.message && (dispatch.message.content.length || (dispatch.message.attachments && dispatch.message.attachments.length) || (dispatch.message.embeds && dispatch.message.embeds.length)) && dispatch.message.state != 'SENDING' && !dispatch.optimistic && (dispatch.message.type === 0 || dispatch.message.type === 19 || dispatch.message.type === 20) && this.tools.isMentioned(dispatch.message, this.localUser.id)) {
          if (this.cachedMessageRecord.findIndex(m => m.id === dispatch.message.id) != -1) return callDefault(...args);
          this.cachedMessageRecord.push(dispatch.message);
        }
      }
      if (doReturn) return callDefault(...args);

      if (dispatch.type == 'LOAD_MESSAGES_SUCCESS') {
        if (!this.settings.restoreDeletedMessages) return callDefault(...args);
        if (dispatch.jump && dispatch.jump.ML2) delete dispatch.jump;
        const deletedMessages = this.deletedMessageRecord[channel.id];
        const purgedMessages = this.purgedMessageRecord[channel.id];
        try {
          const recordIDs = [...(deletedMessages || []), ...(purgedMessages || [])];
          const fetchUser = id => this.tools.getUser(id) || dispatch.messages.find(e => e.author.id === id)
          for (let i = 0, len = recordIDs.length; i < len; i++) {
            const id = recordIDs[i];
            if (!this.messageRecord[id]) continue;
            const { message } = this.messageRecord[id];
            for (let j = 0, len2 = message.mentions.length; j < len2; j++) {
              const user = message.mentions[j];
              const cachedUser = fetchUser(user.id || user);
              if (cachedUser) message.mentions[j] = this.cleanupUserObject(cachedUser);
            }
            const author = fetchUser(message.author.id);
            if (!author) continue;
            message.author = this.cleanupUserObject(author);
          }
        } catch { }
        if ((!deletedMessages && !purgedMessages) || (!this.settings.showPurgedMessages && !this.settings.showDeletedMessages)) return callDefault(...args);
        if (this.settings.showDeletedMessages && deletedMessages) this.reAddDeletedMessages(dispatch.messages, deletedMessages, !dispatch.hasMoreAfter && !dispatch.isBefore, !dispatch.hasMoreBefore && !dispatch.isAfter);
        if (this.settings.showPurgedMessages && purgedMessages) this.reAddDeletedMessages(dispatch.messages, purgedMessages, !dispatch.hasMoreAfter && !dispatch.isBefore, !dispatch.hasMoreBefore && !dispatch.isAfter);
        return callDefault(...args);
      }

      const notificationsBlacklisted = this.settings.notificationBlacklist.indexOf(channel.id) !== -1 || (guild && this.settings.notificationBlacklist.indexOf(guild.id) !== -1);

      if (dispatch.type == 'MESSAGE_DELETE') {
        const deleted = this.getCachedMessage(dispatch.id, dispatch.channelId);

        if (this.settings.aggresiveMessageCaching) {
          const channelMessages = this.channelMessages[channel.id];
          if (!channelMessages || !channelMessages.ready) this.cacheChannelMessages(channel.id);
        }

        if (!deleted) return callDefault(...args); // nothing we can do past this point..

        if (this.deletedMessageRecord[channel.id] && this.deletedMessageRecord[channel.id].findIndex(m => m === deleted.id) != -1) {
          if (!this.settings.showDeletedMessages) ret = callDefault(...args);
          return ret;
        }

        if (deleted.type !== 0 && deleted.type !== 19 && (deleted.type !== 20 || (deleted.flags & 64) === 64)) return callDefault(...args);

        if (this.settings.showDeletedCount) {
          if (!this.deletedChatMessagesCount[channel.id]) this.deletedChatMessagesCount[channel.id] = 0;
          if (!this.selectedChannel || this.selectedChannel.id != channel.id) this.deletedChatMessagesCount[channel.id]++;
        }
        if (!notificationsBlacklisted) {
          if (guild ? this.settings.toastToggles.deleted && ((isLocalUser && !this.settings.toastToggles.disableToastsForLocal) || !isLocalUser) : this.settings.toastTogglesDMs.deleted && !isLocalUser) {
            if (this.settings.useNotificationsInstead) {
              BdApi.UI.showNotification({ title: this.getName(), content: `Message deleted from ${this.getLiteralName(channel.guild_id, channel.id, true)}`, type: 'error', onClick: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id) });
            } else {
              BdApi.UI.showToast(`Message deleted from ${this.getLiteralName(channel.guild_id, channel.id)}`, {
                type: 'error',
                onClick: () => this.openWindow('deleted'),
                onContext: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id),
                timeout: 4500
              });
            }
          }
        }

        const record = this.messageRecord[dispatch.id];

        if ((!this.selectedChannel || this.selectedChannel.id != channel.id) && (guild ? this.settings.toastToggles.ghostPings : this.settings.toastTogglesDMs.ghostPings) && (!record || !record.ghost_pinged) && this.tools.isMentioned(deleted, this.localUser.id)) {
          BdApi.UI.showNotification({ title: this.getName(), content: `You got ghost pinged in ${this.getLiteralName(channel.guild_id, channel.id, true)}`, type: 'warning', duration: Infinity, onClick: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id) });
          if (!this.settings.useNotificationsInstead) {
            BdApi.UI.showToast(`You got ghost pinged in ${this.getLiteralName(channel.guild_id, channel.id)}`, {
              type: 'warning',
              onClick: () => this.openWindow('ghostpings'),
              onContext: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id),
              timeout: 4500
            });
          }
        }

        this.saveDeletedMessage(deleted, this.deletedMessageRecord);
        // if (this.settings.cacheAllImages) this.cacheImages(deleted);
        if (!this.settings.showDeletedMessages) ret = callDefault(...args);
        else if (this.getSelectedTextChannel()?.id === dispatch.channelId) this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE', id: dispatch.id });
        this.saveData();
      } else if (dispatch.type == 'MESSAGE_DELETE_BULK') {
        if (this.settings.showDeletedCount) {
          if (!this.deletedChatMessagesCount[channel.id]) this.deletedChatMessagesCount[channel.id] = 0;
          if (!this.selectedChannel || this.selectedChannel.id != channel.id) this.deletedChatMessagesCount[channel.id] += dispatch.ids.length;
        }

        let failedMessage = false;

        for (let i = 0; i < dispatch.ids.length; i++) {
          const purged = this.getCachedMessage(dispatch.ids[i], channel.id);
          if (!purged) {
            failedMessage = true;
            continue;
          }
          this.saveDeletedMessage(purged, this.purgedMessageRecord);
          if (this.getSelectedTextChannel()?.id === dispatch.channelId) this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE', id: purged.id });
        }

        if (failedMessage && this.aggresiveMessageCaching)
          // forcefully cache the channel in case there are active convos there
          this.cacheChannelMessages(channel.id);
        else if (this.settings.aggresiveMessageCaching) {
          const channelMessages = this.channelMessages[channel.id];
          if (!channelMessages || !channelMessages.ready) this.cacheChannelMessages(channel.id);
        }
        if (!notificationsBlacklisted) {
          if (guild ? this.settings.toastToggles.deleted : this.settings.toastTogglesDMs.deleted) {
            if (this.settings.useNotificationsInstead) {
              BdApi.UI.showNotification({ title: this.getName(), content: `${dispatch.ids.length} messages bulk deleted from ${this.getLiteralName(channel.guild_id, channel.id, true)}`, type: 'error', onClick: () => this.jumpToMessage(channel.id, undefined, guild && guild.id) });
            } else {
              BdApi.UI.showToast(`${dispatch.ids.length} messages bulk deleted from ${this.getLiteralName(channel.guild_id, channel.id)}`, {
                type: 'error',
                onClick: () => this.openWindow('purged'),
                onContext: () => this.jumpToMessage(channel.id, undefined, guild && guild.id),
                timeout: 4500
              });
            }
          }
        }
        if (!this.settings.showPurgedMessages) ret = callDefault(...args);
        this.saveData();
      } else if (dispatch.type == 'MESSAGE_UPDATE') {
        if (!dispatch.message.edited_timestamp) {
          if (dispatch.message.embeds) {
            let last = this.getCachedMessage(dispatch.message.id);
            if (last) last.embeds = dispatch.message.embeds.map(this.cleanupEmbed);
          }
          return callDefault(...args);
        }

        if (this.settings.showEditedCount) {
          if (!this.editedChatMessagesCount[channel.id]) this.editedChatMessagesCount[channel.id] = 0;
          if (!this.selectedChannel || this.selectedChannel.id != channel.id) this.editedChatMessagesCount[channel.id]++;
        }

        if (this.settings.aggresiveMessageCaching) {
          const channelMessages = this.channelMessages[channel.id];
          if (!channelMessages || !channelMessages.ready) this.cacheChannelMessages(channel.id);
        }

        const last = this.getCachedMessage(dispatch.message.id, channel.id);
        const lastEditedSaved = this.getEditedMessage(dispatch.message.id, channel.id);

        if (lastEditedSaved && !lastEditedSaved.message.edited_timestamp) lastEditedSaved.message.edited_timestamp = dispatch.message.edited_timestamp;

        // if we have lastEdited then we can still continue as we have all the data we need to process it.
        if (!last && !lastEditedSaved) return callDefault(...args); // nothing we can do past this point..
        let ghostPinged = false;
        if (lastEditedSaved) {
          // last is not needed, we have all the data already saved
          // console.log(lastEditedSaved.message);
          // console.log(dispatch.message);
          if (lastEditedSaved.message.content === dispatch.message.content) {
            return callDefault(...args); // we don't care about that
          }
          lastEditedSaved.edit_history.push({
            content: lastEditedSaved.message.content,
            time: new Date().getTime()
          });
          lastEditedSaved.message.content = dispatch.message.content;
          ghostPinged = !lastEditedSaved.ghost_pinged && lastEditedSaved.local_mentioned && !this.tools.isMentioned(dispatch.message, this.localUser.id);
          if (ghostPinged) lastEditedSaved.ghost_pinged = true;
        } else {
          if (last.content === dispatch.message.content) {
            return callDefault(...args); // we don't care about that
          }
          let data = this.createMiniFormattedData(last);
          data.edit_history = [
            {
              content: last.content,
              time: new Date().getTime()
            }
          ];
          ghostPinged = this.tools.isMentioned(last, this.localUser.id) && !this.tools.isMentioned(dispatch.message, this.localUser.id);
          data.message.content = dispatch.message.content;
          if (ghostPinged) data.ghost_pinged = true;
          this.messageRecord[data.message.id] = data;
          if (!this.editedMessageRecord[channel.id]) this.editedMessageRecord[channel.id] = [];
          this.editedMessageRecord[channel.id].push(data.message.id);
        }
        if (!notificationsBlacklisted) {
          if (guild ? this.settings.toastToggles.edited && ((isLocalUser && !this.settings.toastToggles.disableToastsForLocal) || !isLocalUser) : this.settings.toastTogglesDMs.edited && !isLocalUser) {
            if (!this.settings.blockSpamEdit) {
              if (!this.editHistoryAntiSpam[author.id]) {
                this.editHistoryAntiSpam[author.id] = {
                  blocked: false,
                  times: [new Date().getTime()]
                };
              } else {
                this.editHistoryAntiSpam[author.id].times.push(new Date().getTime());
              }
              if (this.editHistoryAntiSpam[author.id].times.length > 10) this.editHistoryAntiSpam[author.id].times.shift();
              if (this.editHistoryAntiSpam[author.id].times.length === 10 && new Date().getTime() - this.editHistoryAntiSpam[author.id].times[0] < 60 * 1000) {
                if (!this.editHistoryAntiSpam[author.id].blocked) {
                  if (this.settings.useNotificationsInstead) {
                    BdApi.UI.showNotification({ title: this.getName(), content: `Edit notifications from <@${author.id}> have been temporarily blocked for 1 minute.`, type: 'warning', duration: 7500 });
                  } else {
                    BdApi.UI.showToast(`Edit notifications from ${author.username} have been temporarily blocked for 1 minute.`, {
                      type: 'warning',
                      timeout: 7500
                    });
                  }
                  this.editHistoryAntiSpam[author.id].blocked = true;
                }
              } else if (this.editHistoryAntiSpam[author.id].blocked) {
                this.editHistoryAntiSpam[author.id].blocked = false;
                this.editHistoryAntiSpam[author.id].times = [];
              }
            }
            if (this.settings.blockSpamEdit || !this.editHistoryAntiSpam[author.id].blocked) {
              if (this.settings.useNotificationsInstead) {
                BdApi.UI.showNotification({ title: this.getName(), content: `Message edited in ${this.getLiteralName(channel.guild_id, channel.id, true)}`, onClick: () => this.jumpToMessage(channel.id, dispatch.message.id, guild && guild.id) });
              } else {
                BdApi.UI.showToast(`Message edited in ${this.getLiteralName(channel.guild_id, channel.id)}`, {
                  type: 'info',
                  onClick: () => this.openWindow('edited'),
                  onContext: () => this.jumpToMessage(channel.id, dispatch.message.id, guild && guild.id),
                  timeout: 4500
                });
              }
            }
          }
        }
        if ((!this.selectedChannel || this.selectedChannel.id != channel.id) && (guild ? this.settings.toastToggles.ghostPings : this.settings.toastTogglesDMs.ghostPings) && ghostPinged) {
          BdApi.UI.showNotification({ title: this.getName(), content: `You got ghost pinged in ${this.getLiteralName(channel.guild_id, channel.id, true)}`, type: 'warning', onClick: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id) });
          if (!this.settings.useNotificationsInstead) {
            BdApi.UI.showToast(`You got ghost pinged in ${this.getLiteralName(channel.guild_id, channel.id)}`, {
              type: 'warning',
              onClick: () => this.openWindow('ghostpings'),
              onContext: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id),
              timeout: 4500
            });
          }
        }
        this.saveData();
        return callDefault(...args);
      } else if (dispatch.type == 'MESSAGE_CREATE' && dispatch.message && (dispatch.message.content.length || (dispatch.message.attachments && dispatch.message.attachments.length) || (dispatch.message.embeds && dispatch.message.embeds.length)) && dispatch.message.state != 'SENDING' && !dispatch.optimistic && (dispatch.message.type === 0 || dispatch.message.type === 19 || dispatch.message.type === 20)) {
        if (this.cachedMessageRecord.findIndex(m => m.id === dispatch.message.id) != -1) return callDefault(...args);
        this.cachedMessageRecord.push(dispatch.message);

        /* if (this.menu.open && this.menu.selectedTab == 'sent') this.refilterMessages(); */

        if (this.settings.aggresiveMessageCaching) {
          const channelMessages = this.channelMessages[channel.id];
          if (!channelMessages || !channelMessages.ready) this.cacheChannelMessages(channel.id);
        }
        if (!notificationsBlacklisted) {
          if ((guild ? this.settings.toastToggles.sent : this.settings.toastTogglesDMs.sent) && (!this.selectedChannel || this.selectedChannel.id != channel.id)) {
            if (this.settings.useNotificationsInstead) {
              BdApi.UI.showNotification({ title: this.getName(), content: `Message sent in ${this.getLiteralName(channel.guild_id, channel.id, true)}`, onClick: () => this.jumpToMessage(dispatch.channelId, dispatch.id, guild && guild.id) });
            } else {
              BdApi.UI.showToast(`Message sent in ${this.getLiteralName(channel.guild_id, channel.id)}`, { type: 'info', onClick: () => this.openWindow('sent'), onContext: () => this.jumpToMessage(channel.id, dispatch.message.id, guild && guild.id), timeout: 4500 });
            }
          }
        }
        return callDefault(...args);
      } else return callDefault(...args);
    } catch (err) {
      Logger.stacktrace(this.getName(), 'Error in onDispatchEvent', err);
    }
    return ret;
  }
  /* ==================================================-|| START MENU ||-================================================== */
  processUserRequestQueue() {
    return;
    if (!this.processUserRequestQueue.queueIntervalTime) this.processUserRequestQueue.queueIntervalTime = 500;
    if (this.menu.queueInterval) return;
    const messageDataManager = () => {
      return;
      if (!this.menu.userRequestQueue.length) {
        clearInterval(this.menu.queueInterval);
        this.menu.queueInterval = 0;
        return;
      }
      const data = this.menu.userRequestQueue.shift();
      this.tools
        .getUserAsync(data.id)
        .then(res => {
          for (let ss of data.success) ss(res);
        })
        .catch(reason => {
          if (reason.status == 429 && typeof reason.body.retry_after === 'number') {
            clearInterval(this.menu.queueInterval);
            this.menu.queueInterval = 0;
            this.processUserRequestQueue.queueIntervalTime += 50;
            setTimeout(messageDataManager, reason.body.retry_after);
            Logger.warn(this.getName(), 'Rate limited, retrying in', reason.body.retry_after, 'ms');
            this.menu.userRequestQueue.push(data);
            return;
          }
          Logger.warn(this.getName(), `Failed to get info for ${data.username}, reason:`, reason);
          for (let ff of data.fail) ff();
        });
    };
    this.menu.queueInterval = setInterval(messageDataManager, this.processUserRequestQueue.queueIntervalTime);
  }
  getReactInstance(node) {
    const domNode = node;
    if (!(domNode instanceof Element)) return undefined;
    return domNode[Object.keys(domNode).find((key) => key.startsWith("__reactInternalInstance") || key.startsWith("__reactFiber") || key.startsWith("__reactContainer"))];
  }
  async patchMessages() {
    const Tooltip = Webpack.getBySource('VoidTooltip cannot find DOM node', { declarationFilter: e => e.Colors && e.prototype?.shouldShowTooltip }) || (e => e.children);
    const dateFormat = Webpack.getModule(e => typeof e === 'function' && e?.toString()?.includes('sameDay'), { searchExports: true });
    //const i18n = ZeresPluginLibrary.WebpackModules.find(e => e.Messages && e.Messages.HOME);
    /* suck it you retarded asshole devilfuck */
    const SuffixEdited = React.memo(e => {
      const text = (e.__MLV2_hasMore === 'before' || e.__MLV2_hasMore === 'after') ? `There are ${e.__MLV2_numHidden} more edited messages ${e.__MLV2_hasMore} this one! Click to show!` : null;
      return React.createElement(
        Tooltip,
        {
          text: [(e.timestamp && e.__MLV2_shouldShow ? dateFormat(e.timestamp, 'LLLL') : null), text && React.createElement('br'), text],
          shouldShow: e.__MLV2_shouldShow || !!text
        },
        tt => React.createElement(
          'time',
          Object.assign({
            dateTime: e.timestamp ? e.timestamp.toISOString() : null,
            className: className(this.multiClasses.edited, { [this.style.editedTagClicky]: !!text }),
            role: 'note'
          }, tt, {
            onClick: () => {
              try {
                tt.onClick();
              } catch (err) {
                Logger.stacktrace(this.getName(), 'Failed to execute tooltip onClick', err);
              }
              try {
                if (!text) return;
                e.__MLV2_showAllMessages();
              } catch (err) {
                Logger.stacktrace(this.getName(), 'Failed to show all edited messages', err);
              }
            }
          }), `(${/* i18n.Messages.MESSAGE_EDITED uhhhhhhhhh what now? */'edited'})${e.__MLV2_hasMore === 'before' ? ` <(${e.__MLV2_numHidden})` : e.__MLV2_hasMore === 'after' ? ` (${e.__MLV2_numHidden})>` : ''}`))
    });
    SuffixEdited.displayName = 'SuffixEdited';
    await new Promise(res => {
      const sub = this.subscribeToQuerySelector(() => (this.unsubscribeObserver(sub), res()), 'li[class*="messageListItem__"]');
    })
    const MemoMessage = Webpack.getBySource("Message must not be a thread starter message", { declarationFilter: x => String(x?.type).includes("Message must not be a thread starter message") });
    const MessageContent = Webpack.getModule(e => !!e?.type?.toString()?.match(/,\w=\w\.state===\w\.(?:\w[^.]+)\.SEND_FAILED,\w=\w\.state===\w\.(?:\w[^.]+)\.SENDING/));

    if (!MessageContent || !MemoMessage) return BdApi.UI.showNotification({ title: this.getName(), content: '[MessageLoggerV2] Failed to patch message components, edit history and deleted tint will not show!', type: 'error', duration: Infinity });

    const parseContent = (() => {
      const parse = Webpack.getByStrings('customRenderedContent', 'hideSimpleEmbedContent');
      if (!parse) {
        Logger.warn(this.getName(), 'Could not set up parseContent, edits will not have markdown');
        BdApi.UI.showNotification({ title: this.getName(), content: 'Internal error: parseContent not found, edits will not have markdown!', type: 'warning' });
        return e => e?.content;
      }
      return function parseContent() {
        const ReactDispatcher = Object.values(React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE).find(e => e.useState);
        const oUseMemo = ReactDispatcher.useMemo;
        ReactDispatcher.useMemo = memo => memo();
        try {
          return parse(...arguments);
        } catch (err) {
          Logger.stacktrace(this.getName(), 'Error in parseContent', err);
          BdApi.UI.showNotification({ title: this.getName(), content: 'Internal error: parseContent failed to execute!', type: 'warning' });
        } finally {
          ReactDispatcher.useMemo = oUseMemo;
        }
        return {};
      }
    })();

    const useStateConstant = {};
    this.unpatches.push(
      this.Patcher.after(MessageContent, 'type', (_, [props], ret) => {
        const forceUpdate = React.useState(useStateConstant)[1];
        React.useEffect(
          () => {
            function callback(e) {
              if (!e || !e.id || e.id === props.message.id) {
                forceUpdate({});
              }
            }
            this.dispatcher.subscribe('MLV2_FORCE_UPDATE_MESSAGE_CONTENT', callback);
            return () => {
              this.dispatcher.unsubscribe('MLV2_FORCE_UPDATE_MESSAGE_CONTENT', callback);
            };
          },
          [props.message.id, forceUpdate]
        );
        if ((typeof props.className === 'string' && ~props.className.indexOf('repliedTextContent'))) return;
        if (!this.editedMessageRecord[props.message.channel_id] || this.editedMessageRecord[props.message.channel_id].indexOf(props.message.id) === -1) return;
        const record = this.messageRecord[props.message.id];
        if (!record || !Array.isArray(ret.props.children)) return;
        const createEditedMessage = (edit, editNum, options = { isSingular: false, noSuffix: false, hasMore: 'none', numHidden: 0 }) => {
          const { isSingular = false, noSuffix = false, hasMore = 'none', numHidden = 0 } = options;

          const result = React.createElement(() => // avoiding breaking the rules of react hooks :p
            [
              parseContent({ channel_id: props.message.channel_id, mentionChannels: props.message.mentionChannels, content: edit.content, embeds: [], isCommandType: () => false, hasFlag: () => false }, {}).content,
              noSuffix
                ? null
                : React.createElement(SuffixEdited, {
                  timestamp: new Date(edit.time),
                  __MLV2_hasMore: hasMore,
                  __MLV2_numHidden: numHidden,
                  __MLV2_shouldShow: !!isSingular,
                  __MLV2_showAllMessages: () => {
                    if (record.edits_hidden) record.edits_hidden = false;
                    if (this.settings.maxShownEdits && record.edit_history.length > this.settings.maxShownEdits) this.editModifiers[props.message.id] = { showAllEdits: true };
                    forceUpdate({});
                  }
                })
            ]
          );

          return React.createElement(
            BdApi.Components.ErrorBoundary,
            { name: 'Edit history' },
            editNum === -1 ? result : React.createElement(
              Tooltip,
              {
                text: !!record.delete_data ? null : 'Edited: ' + this.createTimeStamp(edit.time),
                position: 'left',
                hideOnClick: true,
                shouldShow: !isSingular
              },
              _ =>
                React.createElement(
                  'div', // required div for the tooltip to properly position itself
                  {
                    ..._,
                    className: className({ [this.style.editedCompact]: props.compact && !isSingular, [this.style.edited]: !isSingular }),
                    editNum
                  },
                  result
                )
            )
          );
        };
        ret.props.className = className(ret.props.className, this.style.edited);
        const modifier = this.editModifiers[props.message.id];
        if (modifier?.editNum) {
          ret.props.children = [createEditedMessage(record.edit_history[modifier.editNum], -1, { isSingular: true, noSuffix: modifier.noSuffix })];
          return;
        }

        const oContent = Array.isArray(ret.props.children[0]) ? ret.props.children[0] : ret.props.children[1];

        if ((!this.settings.showEditedMessages && !modifier?.showAllEdits) || record.edits_hidden) {
          ret.props.children = [
            oContent,
            React.createElement(SuffixEdited, {
              timestamp: new Date(props.message.editedTimestamp),
              __MLV2_hasMore: 'before',
              __MLV2_numHidden: record.edit_history.length,
              __MLV2_shouldShow: true,
              __MLV2_showAllMessages: () => {
                if (record.edits_hidden) record.edits_hidden = false;
                if (this.settings.maxShownEdits && record.edit_history.length > this.settings.maxShownEdits) this.editModifiers[props.message.id] = { showAllEdits: true };
                forceUpdate({});
              }
            })
          ];
          return;
        }

        const edits = [];
        let i = 0;
        let max = record.edit_history.length;
        let hasMore = 'none';
        let hasMoreIdx = -1;
        if (this.settings.maxShownEdits && !modifier?.showAllEdits) {
          if (record.edit_history.length > this.settings.maxShownEdits) {
            if (this.settings.hideNewerEditsFirst) {
              max = this.settings.maxShownEdits;
              hasMore = 'after';
              hasMoreIdx = max - 1;
            } else {
              i = record.edit_history.length - this.settings.maxShownEdits;
              hasMore = 'before';
              hasMoreIdx = i;
            }
          }
        }
        const numHidden = record.edit_history.length - this.settings.maxShownEdits;
        for (; i < max; i++) {
          const edit = record.edit_history[i];
          if (!edit) continue;
          let editNum = i;
          edits.push(createEditedMessage(edit, editNum, i === hasMoreIdx ? { hasMore, numHidden } : {}));
        }
        ret.props.children = [edits, oContent];
      })
    );

    const messageClass = this.getSingleClass('ephemeral message');
    const _self = this;
    function Message(props, ...whatever) {
      try {
        const ret = props.__MLV2_type(props, ...whatever);
        if (!props.__MLV2_deleteTime) return ret;
        const oRef = ret.props.children.ref;
        ret.props.children.ref = e => {
          if (e && !e.__tooltip) {
            BdApi.UI.createTooltip(e, 'Deleted: ' + _self.tools.createMomentObject(props.__MLV2_deleteTime).format('LLLL'), { side: 'left' });
            e.__tooltip = true;
          }
          if (typeof oRef === 'function') return oRef(e);
          else if (this.lodash.isObject(oRef)) oRef.current = e;
        };
        return ret;
      } catch (err) {
        Logger.stacktrace(_self.getName(), 'Error in Message replacement component', err);
      }
      return null;
    }
    this.unpatches.push(
      this.Patcher.after(MemoMessage, 'type', (_, [props], ret) => {
        const forceUpdate = React.useState(useStateConstant)[1];
        React.useEffect(
          () => {
            function callback(e) {
              if (!e || !e.id || e.id === props.message.id) forceUpdate({});
            }
            this.dispatcher.subscribe('MLV2_FORCE_UPDATE_MESSAGE', callback);
            return () => {
              this.dispatcher.unsubscribe('MLV2_FORCE_UPDATE_MESSAGE', callback);
            };
          },
          [props.message.id, forceUpdate]
        );
        const record = this.messageRecord[props.message.id];
        if (!record) return;
        if (props.message.editedTimestamp) record.message.edited_timestamp = new Date(props.message.editedTimestamp).getTime();
        if (!record.delete_data) return;
        if (this.noTintIds.indexOf(props.message.id) !== -1) return;
        const message = this.findInReactTree(ret, e => e && typeof e?.props?.className === 'string' && ~e?.props?.className?.split(' ').indexOf(messageClass));
        if (!message) return;
        message.props.className += ' ' + (this.settings.useAlternativeDeletedStyle ? this.style.deletedAlt : this.style.deleted);
        message.props.__MLV2_deleteTime = record.delete_data.time;
        message.props.__MLV2_type = message.type;
        message.type = Message;
      })
    );
    this.forceReloadMessages();
  }
  forceReloadMessages() {
    const instance = BdApi.Utils.findInTree(this.getReactInstance(document.querySelector('.chatContent-3KubbW')), e => ((typeof e?.memoizedProps?.showQuarantinedUserBanner) === 'boolean'), { walkable: ['return'] })?.stateNode;
    if (!instance) return;
    const unpatch = this.Patcher.after(instance, 'render', (_this, _, ret) => {
      unpatch();
      if (!ret) return;
      ret.key = Math.random().toString(36).substring(2, 10).toUpperCase();
      ret.ref = () => _this.forceUpdate();
    });
    instance.forceUpdate();
  }
  closeContextMenu() {
    this.dispatcher.dispatch({ type: 'CONTEXT_MENU_CLOSE' });
  }
  patchModal() {
    let Button = null;
    try {
      const ButtonOptionsRaw = Webpack.getModule(e => {
        if (typeof e === 'function') return false;
        const possFuncs = Object.values(e);
        if (possFuncs.length < 3 || possFuncs.length > 8) return false;
        if (!possFuncs.some(e => typeof e === 'object' && e?.BRAND_INVERTED && typeof e.BRAND_INVERTED !== 'function')) return false;
        return true;
      })
      for (let item of Object.values(ButtonOptionsRaw)) {
        if (typeof item !== 'function') continue;
        const funcString = item.toString();
        if (!funcString.includes(',buttonRef:')) continue;
        Button = item;
        break;
      }
    } catch (e) {
      Logger.stacktrace(this.getName(), 'Error getting Button component', e);
    }

    if (!Button) Logger.warn(this.getName(), 'Could not find Button component');

    try {
      const confirmationModalRegex = /header:\w,children:\w,confirmText:\w,cancelText:\w,className:\w,onConfirm:\w,onCancel:\w,onClose:\w,onCloseCallback:\w/;
      const confirmModal = Object.values(Webpack.getBySource(confirmationModalRegex) || {}).find(e => typeof e === 'function' && e.toString().match(confirmationModalRegex)) || (() => null);
      this.createModal.confirmationModal = props => {
        try {
          const ret = confirmModal(props);
          if (!ret) return null;
          if (props.size) ret.props.size = props.size;

          if (props.onCancel) {
            const cancelButton = this.findInReactTree(ret, e => e && e.type === Button && e.props && e.props.look);
            if (cancelButton) cancelButton.props.onClick = props.onCancel;
          }
          return ret;
        } catch (err) {
          if (props.onCancel) props.onCancel();
          else props.onClose();
          return null;
        }
      };
    } catch { }
    if (this.ModalStack.useModalsStore?.subscribe) {
      this._modalsApiUnsubcribe = this.ModalStack.useModalsStore.subscribe(_ => {
        if (this.menu.open && !this.ModalStack.hasModalOpen(this.style.menu)) {
          this.menu.filter = '';
          this.menu.open = false;
          this.menu.shownMessages = -1;
          if (this.menu.messages) this.menu.messages.length = 0;
        }
      });
    }
    /*
    this.createModal.confirmationModal = class ConfirmationModal extends ZeresPluginLibrary.DiscordModules.ConfirmationModal {
      constructor(props) {
        super(props);
        this._handleSubmit = this.handleSubmit.bind(this);
        this._handleClose = this.handleClose.bind(this);
        this.handleSubmit = this.handleSubmitEx.bind(this);
        this.handleClose = this.handleCloseEx.bind(this);
      }
      handleSubmitEx(e) {
        if (this.props.ml2Data) onClearLog(e);
        else return this._handleSubmit(e);
      }
      handleCloseEx(e) {
        if (this.props.ml2Data) onChangeOrder(e);
        else return this._handleClose(e);
      }
      render() {
        const ret = super.render();
        if (!ret) return ret;
        delete ret.props['aria-label'];
        return ret;
      }
    };
    this.unpatches.push(
      ZeresPluginLibrary.Patcher.instead(this.getName(), ZeresPluginLibrary.DiscordModules.ConfirmationModal.prototype, 'componentDidMount', (thisObj, args, original) => {
        if (thisObj.props.ml2Data) {
          if (this.menu.refilterOnMount) {
            this.refilterMessages();
            this.menu.refilterOnMount = false;
          }
          document.getElementById(this.style.menuMessages).parentElement.parentElement.parentElement.scrollTop = this.scrollPosition;
        }
        return original(...args);
      })
    );
*/
  }
  buildMenu(setup) {
    const ret = BdApi.ContextMenu.buildMenu(setup);
    return props => ret({ ...props, onClose: _ => { } });
  }
  // >>-|| POPULATION ||-<<
  createMessageGroup(message, isStart) {
    let deleted = false;
    let edited = false;
    let details = 'Sent in';
    let channel = this.tools.getChannel(message.channel_id);
    let timestamp = message.timestamp;
    let author = this.tools.getUser(message.author.id);
    let noUserInfo = false;
    let userInfoBeingRequested = true;
    const isBot = message.author.bot;
    const record = this.messageRecord[message.id];
    if (record) {
      deleted = !!record.delete_data;
      edited = !!record.edit_history;

      if (deleted && edited) {
        details = 'Edited and deleted from';
        timestamp = record.delete_data.time;
      } else if (deleted) {
        details = 'Deleted from';
        timestamp = record.delete_data.time;
      } else if (edited) {
        details = 'Last edit in'; // todo: purged?
        if (typeof record.edit_history[record.edit_history.length - 1].time !== 'string') timestamp = record.edit_history[record.edit_history.length - 1].time;
      }
    }

    details += ` ${this.getLiteralName(message.guild_id || (channel && channel.guild_id), message.channel_id)} `;

    details += `at ${this.createTimeStamp(timestamp, true)}`;

    if (deleted || edited) details += ` (sent ${this.createTimeStamp(message.timestamp)})`;

    details = details.replace(/[<>"&]/g, c => ({ "<": "&lt;", ">": "&gt;", "\"": "&quot;", "&": "&amp;" })[c]);
    if (!this.createMessageGroup.classes) {
      this.createMessageGroup.classes = {
        containerBounded: this.safeGetClass(() => Webpack.getByKeys('containerCozyBounded').containerCozyBounded, 'containerCozyBounded'),
        message: this.safeGetClass(() => `.${Webpack.getByKeys('containerCozyBounded').containerCozyBounded.split(/ /g)[0]} > div`, '.containerCozyBounded-MLV2 > div', true),
        header: this.safeGetClass(() => Webpack.getByKeys('containerCozyBounded').headerCozy, 'headerCozy'),
        avatar: this.safeGetClass(() => this.getClass('header avatar', true), 'avatar'),
        headerMeta: this.safeGetClass(() => Webpack.getByKeys('containerCozyBounded').headerCozyMeta, 'headerCozyMeta'),
        username: this.safeGetClass(() => Webpack.getByKeys('containerCozyBounded').username, 'username'),
        timestamp: this.safeGetClass(() => Webpack.getByKeys('containerCozyBounded').timestampCozy, 'timestampCozy'),
        timestampSingle: this.safeGetClass(() => Webpack.getByKeys('containerCozyBounded').timestampCozy.split(/ /g)[0], 'timestampCozy'),
        content: this.safeGetClass(() => Webpack.getByKeys('containerCozyBounded').contentCozy, 'contentCozy'),
        avatarSingle: this.safeGetClass(() => Webpack.getByKeys('containerCozyBounded').avatar.split(/ /g)[0], 'avatar'),
        avatarImg: this.getClass('edited avatar'),
        avatarImgSingle: this.getSingleClass('edited avatar'),
        botTag: Webpack.getByKeys('botTagRegular')?.botTagRegular + ' ' + /* Webpack.getByKeys('botTagCozy').botTagCozy */'botTagCozy_c19a55',
        markupSingle: this.safeGetClass(() => Webpack.getByKeys('markup').markup.split(/ /g)[0], 'markup__75297')
      };
    }
    const classes = this.createMessageGroup.classes;
    const getAvatarOf = user => {
      if (!user.avatar) return '/assets/322c936a8c8be1b803cd94861bdfa868.png';
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
    };
    if (!classes.extra)
      classes.extra = [
        /* 0 */ className(this.getClass('groupStart message'), this.getClass('groupStart cozyMessage'), this.getClass('systemMessage groupStart'), this.getClass('zalgo wrapper'), this.getClass('zalgo cozy'), this.getClass('cozy zalgo')),
        /* 1 */ className(this.getClass('groupStart message'), this.getClass('groupStart cozyMessage'), this.getClass('zalgo wrapper'), this.getClass('zalgo cozy'), this.getClass('cozy zalgo')),
        /* 2 */ this.getClass('isSending header'),
        /* 3 */ className(this.getClass('edited avatar'), this.getClass('edited avatar clickable')),
        /* 4 */ className(this.getClass('timestampTooltip username'), this.getClass('edited avatar clickable')),
        /* 5 */ className(this.getClass('separator timestamp'), this.getClass('separator timestampInline')),
        /* 6 */ className(this.multiClasses.markup, this.getClass('buttonContainer markupRtl')),
        /* 7 */ this.getClass('avatarDecoration messageContent'),
        /* 8 */ className(this.getClass('zalgo latin24CompactTimeStamp'), this.getClass('separator timestamp'), this.getClass('alt timestampVisibleOnHover'), this.getClass('timestampVisibleOnHover alt')),
        /* 9 */ this.getClass('latin24CompactTimeStamp separator'),
        /* 10 */ this.getSingleClass('timestampTooltip username'),
        /* 11 */ this.getSingleClass('separator timestamp'),
        /* 12 */ this.getClass('zalgo contents')
      ];

    const element = isStart
      ? this.parseHTML(`<div class="${classes.extra[0]}">
                                      <div class="${classes.extra[12]}">
                                        <img src="${getAvatarOf(message.author)}" class="${classes.extra[3]}" alt=" "><h2 class="${classes.extra[2]}"><span class="${classes.extra[4]}" role="button">${message.author.username.replace(/[<>"]/g, c => ({ "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c])}</span>${(isBot && `<span class="${classes.botTag}">BOT</span>`) || ''}<span class="${classes.extra[5]}"><span >${details}</span></span></h2>
                                        <div class="${classes.extra[6]}"></div>
                                      </div>
                                      <div class="${classes.extra[7]}"></div>
                                    </div>`)
      : this.parseHTML(`<div class="${classes.extra[1]}">
                                    <div class="${classes.extra[12]}">
                                      <span class="${classes.extra[8]}">
                                        <span>
                                          <i class="${classes.extra[9]}">[</i>
                                          ${this.createTimeStamp(timestamp, -1)}
                                          <i class="${classes.extra[9]}">] </i>
                                        </span>
                                      </span>
                                      <div class="${classes.extra[6]}"></div>
                                    </div>
                                    <div class="${classes.extra[7]}"></div>
                                  </div>`);
    element.messageId = message.id;
    const profImg = element.getElementsByClassName(classes.avatarImgSingle)[0];
    if (profImg) {
      profImg.onerror = () => {
        profImg.src = '/assets/322c936a8c8be1b803cd94861bdfa868.png';
      };
      const verifyProfilePicture = () => {
        if (message.author.avatar != author.avatar && author.avatar) {
          profImg.src = getAvatarOf(author);
          if (record) {
            record.message.author.avatar = author.avatar;
          }
        } else {
          if (record) record.message.author.avatar = null;
        }
      };
      if (!isBot || true) {
        if (!author) {
          author = message.author;
          if (this.menu.userRequestQueue.findIndex(m => m.id === author.id) == -1) {
            this.menu.userRequestQueue.push({
              id: author.id,
              username: author.username,
              success: [
                res => {
                  author = $.extend(true, {}, res);
                  verifyProfilePicture();
                  userInfoBeingRequested = false;
                }
              ],
              fail: [
                () => {
                  noUserInfo = true;
                  userInfoBeingRequested = false;
                }
              ]
            });
          } else {
            const dt = this.menu.userRequestQueue.find(m => m.id === author.id);
            dt.success.push(res => {
              author = $.extend(true, {}, res);
              verifyProfilePicture();
              userInfoBeingRequested = false;
            });
            dt.fail.push(() => {
              noUserInfo = true;
              userInfoBeingRequested = false;
            });
          }
        } else {
          userInfoBeingRequested = false;
          verifyProfilePicture();
        }
      }
      const profIcon = element.getElementsByClassName(classes.avatarImgSingle)[0];/*
      profIcon.addEventListener('click', () => {
        //if (isBot) return BdApi.UI.showToast('User is a bot, this action is not possible on a bot.', { type: 'error', timeout: 5000 });
        if (userInfoBeingRequested) return BdApi.UI.showToast('Internal error', { type: 'info', timeout: 5000 });
        if (noUserInfo) return BdApi.UI.showToast('Could not get user info!', { type: 'error' });
        ZeresPluginLibrary.Popouts.showUserPopout(profIcon, author);
      });
      profIcon.addEventListener('contextmenu', e => {
        //if (isBot) return BdApi.UI.showToast('User is a bot, this action is not possible on a bot.', { type: 'error', timeout: 5000 });
        if (userInfoBeingRequested) return BdApi.UI.showToast('Internal error', { type: 'info', timeout: 5000 });
        if (noUserInfo) return BdApi.UI.showToast('Could not get user info! You can only delete or copy to clipboard!', { timeout: 5000 });
        Webpack.getByKeys('openUserContextMenu').openUserContextMenu(e, author, channel || this.menu.randomValidChannel);
      });
      const nameLink = element.getElementsByClassName(classes.extra[10])[0];
      nameLink.addEventListener('click', () => {
        //if (isBot) return BdApi.UI.showToast('User is a bot, this action is not possible on a bot.', { type: 'error', timeout: 5000 });
        if (userInfoBeingRequested) return BdApi.UI.showToast('Internal error', { type: 'info', timeout: 5000 });
        if (noUserInfo) return BdApi.UI.showToast('Could not get user info!', { type: 'error' });
        ZeresPluginLibrary.Popouts.showUserPopout(nameLink, author);
      });
      nameLink.addEventListener('contextmenu', e => {
        //if (isBot) return BdApi.UI.showToast('User is a bot, this action is not possible on a bot.', { type: 'error', timeout: 5000 });
        if (userInfoBeingRequested) return BdApi.UI.showToast('Internal error', { type: 'info', timeout: 5000 });
        if (noUserInfo) return BdApi.UI.showToast('Could not get user info! You can only delete or copy to clipboard!', { type: 'error', timeout: 5000 });
        Webpack.getByKeys('openUserContextMenu').openUserContextMenu(e, author, channel || this.menu.randomValidChannel);
      }); */
      const timestampEl = element.getElementsByClassName(classes.extra[11])[0];
      timestampEl.addEventListener('contextmenu', e => {
        const messages = [element];
        let target = element.nextElementSibling;
        while (target && target.classList && !target.classList.contains(this.getSingleClass('systemMessage groupStart'))) {
          messages.push(target);
          target = target.nextElementSibling;
        }
        if (!messages.length) return;
        const messageIds = [];
        for (let i = 0; i < messages.length; i++) if (messages[i] && messages[i].messageId) messageIds.push(messages[i].messageId);
        if (!messageIds.length) return;
        BdApi.ContextMenu.open(
          e,
          this.buildMenu([
            {
              type: 'group',
              items: [
                {
                  label: 'Copy Formatted Message',
                  action: () => {
                    this.closeContextMenu();
                    let result = '';
                    for (let msgid of messageIds) {
                      const record = this.messageRecord[msgid];
                      if (!record) continue;
                      if (!result.length) result += `> **${record.message.author.username}** | ${this.createTimeStamp(record.message.timestamp, true)}\n`;
                      result += `> ${record.message.content.replace(/\n/g, '\n> ')}\n`;
                    }
                    navigator.clipboard.writeText(result)
                      .then(_ => BdApi.UI.showToast('Copied!', { type: 'success' }))
                      .catch(_ => BdApi.UI.showToast('Failed to copy!', { type: 'error' }));
                  }
                },
                {
                  type: 'item',
                  label: 'Remove Group From Log',
                  action: () => {
                    this.closeContextMenu();
                    let invalidatedChannelCache = false;
                    for (let msgid of messageIds) {
                      const record = this.messageRecord[msgid];
                      if (!record) continue; // the hell
                      if ((record.edit_history && !record.edits_hidden) || (record.delete_data && !record.delete_data.hidden)) this.invalidateChannelCache((invalidatedChannelCache = record.message.channel_id));
                      this.deleteMessageFromRecords(msgid);
                    }
                    if (invalidatedChannelCache) this.cacheChannelMessages(invalidatedChannelCache);
                    this.refilterMessages(); // I don't like calling that, maybe figure out a way to animate it collapsing on itself smoothly
                    this.saveData();
                  }
                }
              ]
            }
          ])
        );
      });
      timestampEl.addEventListener('click', e => {
        if (!this.menu.deleteKeyDown) return;
        const messages = [element];
        let target = element.nextElementSibling;
        while (target && target.classList && !target.classList.contains(this.getSingleClass('systemMessage groupStart'))) {
          messages.push(target);
          target = target.nextElementSibling;
        }
        if (!messages.length) return;
        const messageIds = [];
        for (let i = 0; i < messages.length; i++) if (messages[i] && messages[i].messageId) messageIds.push(messages[i].messageId);
        if (!messageIds.length) return;
        let invalidatedChannelCache = false;
        for (let msgid of messageIds) {
          const record = this.messageRecord[msgid];
          if (!record) continue; // the hell
          if ((record.edit_history && !record.edits_hidden) || (record.delete_data && !record.delete_data.hidden)) this.invalidateChannelCache((invalidatedChannelCache = record.message.channel_id));
          this.deleteMessageFromRecords(msgid);
        }
        if (invalidatedChannelCache) this.cacheChannelMessages(invalidatedChannelCache);
        this.refilterMessages(); // I don't like calling that, maybe figure out a way to animate it collapsing on itself smoothly
        this.saveData();
      });
      BdApi.UI.createTooltip(timestampEl, 'Sent at ' + this.tools.createMomentObject(message.timestamp).format('LLLL'), { side: 'top' });
    }
    const messageContext = e => {
      let target = e.target;
      if (!target.classList.contains('mention') || (target.tagName == 'DIV' && target.classList.contains(Webpack.getByKeys('imageErrorWrapper').imageErrorWrapper.split(/ /g)[0]))) {
        let isMarkup = false;
        let isEdited = false;
        let isBadImage = target.tagName == 'DIV' && target.classList == Webpack.getByKeys('imageErrorWrapper').imageErrorWrapper;
        if (!isBadImage) {
          while (target && (!target.classList || !(isMarkup = target.classList.contains(this.classes.markup)))) {
            if (target.classList && target.classList.contains(this.style.edited)) isEdited = target;
            target = target.parentElement;
          }
        }

        if (isMarkup || isBadImage) {
          const messageId = message.id;
          const record = this.getSavedMessage(messageId);
          if (!record) return;
          let editNum = -1;
          if (isEdited) editNum = isEdited.edit;
          const menuItems = [];
          if (channel) {
            menuItems.push({
              type: 'item',
              label: 'Jump to Message',
              action: () => {
                this.closeContextMenu();
                this.jumpToMessage(message.channel_id, messageId, message.guild_id);
              }
            });
          }
          if (!isBadImage || record.message.content.length) {
            menuItems.push(
              {
                type: 'item',
                label: 'Copy Text',
                action: () => {
                  this.closeContextMenu();
                  navigator.clipboard.writeText(editNum != -1 ? record.edit_history[editNum].content : record.message.content)
                    .then(_ => BdApi.UI.showToast('Copied!', { type: 'success' }))
                    .catch(_ => BdApi.UI.showToast('Failed to copy!', { type: 'error' }));
                }
              },
              {
                type: 'item',
                label: 'Copy Formatted Message',
                action: () => {
                  this.closeContextMenu();
                  const content = editNum != -1 ? record.edit_history[editNum].content : record.message.content;
                  const result = `> **${record.message.author.username}** | ${this.createTimeStamp(record.message.timestamp, true)}\n> ${content.replace(/\n/g, '\n> ')}`;
                  navigator.clipboard.writeText(result)
                    .then(_ => BdApi.UI.showToast('Copied!', { type: 'success' }))
                    .catch(_ => BdApi.UI.showToast('Failed to copy!', { type: 'error' }));
                }
              }
            );
          }
          if (record.delete_data && record.delete_data.hidden) {
            menuItems.push({
              type: 'item',
              label: 'Unhide Deleted Message',
              action: () => {
                this.closeContextMenu();
                record.delete_data.hidden = false;
                this.invalidateChannelCache(record.message.channel_id); // good idea?
                this.cacheChannelMessages(record.message.channel_id);
                this.saveData();
                BdApi.UI.showToast('Unhidden!', { type: 'success' });
              }
            });
          }
          if (record.edit_history) {
            if (editNum != -1) {
              menuItems.push({
                type: 'item',
                label: 'Delete Edit',
                action: () => {
                  this.closeContextMenu();
                  this.deleteEditedMessageFromRecord(messageId, editNum);
                  this.refilterMessages(); // I don't like calling that, maybe figure out a way to animate it collapsing on itself smoothly
                  BdApi.UI.showToast('Deleted!', { type: 'success' });
                }
              });
            }
            if (record.edits_hidden) {
              menuItems.push({
                type: 'item',
                label: 'Unhide Edits',
                action: () => {
                  this.closeContextMenu();
                  record.edits_hidden = false;
                  this.saveData();
                  BdApi.UI.showToast('Unhidden!', { type: 'success' });
                }
              });
            }
          }
          menuItems.push(
            {
              type: 'item',
              label: 'Remove From Log',
              action: () => {
                this.closeContextMenu();
                let invalidatedChannelCache = false;
                if ((record.edit_history && !record.edits_hidden) || (record.delete_data && !record.delete_data.hidden)) this.invalidateChannelCache((invalidatedChannelCache = record.message.channel_id));
                this.deleteMessageFromRecords(messageId);
                this.refilterMessages(); // I don't like calling that, maybe figure out a way to animate it collapsing on itself smoothly
                if (invalidatedChannelCache) this.cacheChannelMessages(invalidatedChannelCache);
                this.saveData();
                if (record.message.channel_id !== this.selectedChannel.id) return;
                if (record.delete_data) {
                  this.dispatcher.dispatch({
                    type: 'MESSAGE_DELETE',
                    id: messageId,
                    channelId: record.message.channel_id,
                    ML2: true // ignore ourselves lol, it's already deleted
                    // on a side note, probably does nothing if we don't ignore
                  });
                } else {
                  this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                }
              }
            },
            {
              type: 'item',
              label: 'Copy Message ID',
              action: () => {
                this.closeContextMenu();
                navigator.clipboard.writeText(messageId)
                  .then(_ => BdApi.UI.showToast('Copied!', { type: 'success' }))
                  .catch(_ => BdApi.UI.showToast('Failed to copy!', { type: 'error' }));
              }
            },
            {
              type: 'item',
              label: 'Copy Author ID',
              action: () => {
                this.closeContextMenu();
                navigator.clipboard.writeText(message.author.id)
                  .then(_ => BdApi.UI.showToast('Copied!', { type: 'success' }))
                  .catch(_ => BdApi.UI.showToast('Failed to copy!', { type: 'error' }));
              }
            }
          );
          BdApi.ContextMenu.open(
            e,
            this.buildMenu([
              {
                type: 'group',
                items: menuItems
              }
            ])
          );
          return;
        }
      }
    };
    element.addEventListener('contextmenu', e => messageContext(e));
    element.addEventListener('click', e => {
      if (!this.menu.deleteKeyDown) return;
      let target = e.target;
      let isMarkup = false;
      let isEdited = false;
      let isBadImage = target.tagName == 'DIV' && target.classList == Webpack.getByKeys('imageErrorWrapper').imageErrorWrapper;
      if (!isBadImage) {
        while (!target.classList.contains('message-2qnXI6') && !(isMarkup = target.classList.contains(this.classes.markup))) {
          if (target.classList.contains(this.style.edited)) isEdited = target;
          target = target.parentElement;
        }
      }
      if (!isMarkup && !isBadImage) return;
      const messageId = message.id;
      const record = this.messageRecord[messageId];
      if (!record) return;
      this.invalidateChannelCache(record.message.channel_id); // good idea?
      this.cacheChannelMessages(record.message.channel_id);
      if (isEdited) {
        this.deleteEditedMessageFromRecord(messageId, isEdited.edit);
      } else {
        this.deleteMessageFromRecords(messageId);
      }
      this.refilterMessages(); // I don't like calling that, maybe figure out a way to animate it collapsing on itself smoothly
      this.saveData();
    });
    return element;
  }
  populateParent(parent, messages) {
    let lastMessage;
    let lastType; /* unused */
    let messageGroup;
    const populate = i => {
      try {
        // todo: maybe make the text red if it's deleted?
        const messageId = messages[i];
        const record = this.getSavedMessage(messageId);
        const message = record ? record.message : this.getMessageAny(messageId);
        if (!message) return;
        // todo: get type and use it
        if (!messageGroup /*  || !lastType */ || !lastMessage || lastMessage.channel_id != message.channel_id || lastMessage.author.id != message.author.id || new Date(message.timestamp).getDate() !== new Date(lastMessage.timestamp).getDate() || (message.attachments.length && message.content.length)) {
          messageGroup = this.createMessageGroup(message, true);
        } else {
          messageGroup = this.createMessageGroup(message);
        }
        lastMessage = message;
        const markup = messageGroup.getElementsByClassName(this.classes.markup)[0];
        const contentDiv = messageGroup.getElementsByClassName(this.getSingleClass('avatarDecoration messageContent'))[0];
        if (record && record.edit_history) {
          markup.classList.add(this.style.edited);
          for (let ii = 0; ii < record.edit_history.length; ii++) {
            const hist = record.edit_history[ii];
            const editedMarkup = this.formatMarkup(hist.content, message.channel_id);
            editedMarkup.insertAdjacentHTML('beforeend', `<time class="${this.multiClasses.edited}">(edited)</time>`); // TODO, change this
            BdApi.UI.createTooltip(editedMarkup, 'Edited at ' + (typeof hist.time === 'string' ? hist.time : this.createTimeStamp(hist.time)), { side: 'left' });
            editedMarkup.classList.add(this.style.edited);
            editedMarkup.edit = ii;
            markup.appendChild(editedMarkup);
          }
        }
        markup.append(this.formatMarkup(message.content, message.channel_id));
        if (!record) {
          const channel = this.tools.getChannel(message.channel_id);
          const guild = this.tools.getServer(channel && channel.guild_id);
          markup.addEventListener('click', () => this.jumpToMessage(message.channel_id, message.id, guild && guild.id));
        }
        // todo, embeds
        // how do I do embeds?

        // why don't attachments show for sent messages? what's up with that?
        if (message.attachments.length) {
          // const attachmentsContent = this.parseHTML(`<div class="${this.multiClasses.message.cozy.content}"></div>`);
          const attemptToUseCachedImage = (attachmentId, attachmentIdx, hidden, filename, width, height) => {
            const img = document.createElement('img');
            img.classList = Webpack.getByKeys('clickable').clickable;
            img.messageId = messageId;
            img.idx = attachmentIdx;
            img.id = attachmentId; // USED FOR FINDING THE IMAGE THRU CONTEXT MENUS
            if (hidden) {
              img.src = `https://i.clouds.tf/q2vy/r8q6.png#${record.message.channel_id},${img.id}`;
              img.width = 200;
            } else {
              img.src = 'http://localhost:7474/' + attachmentId + filename.match(/\.[0-9a-z]+$/i)[0] + `#${record.message.channel_id},${img.id}`;
              img.width = 256;
            }
            img.addEventListener('click', e => {
              if (this.menu.deleteKeyDown) {
                this.deleteMessageFromRecords(messageId);
                this.refilterMessages(); // I don't like calling that, maybe figure out a way to animate it collapsing on itself smoothly
                this.saveData();
                return;
              }
              this.createModal(
                {
                  src: img.src + '?ML2=true', // self identify
                  placeholder: img.src, // cute image here
                  original: img.src,
                  width: width,
                  height: height,
                  onClickUntrusted: e => e.openHref(),
                  className: this.style.imageRoot
                },
                true
              );
            });
            img.onerror = () => {
              const imageErrorWrapperDiv = document.createElement('div');
              imageErrorWrapperDiv.classList = Webpack.getByKeys('imageErrorWrapper').imageErrorWrapper;
              imageErrorWrapperDiv.messageId = messageId;
              contentDiv.replaceChild(imageErrorWrapperDiv, img);
            };
            contentDiv.appendChild(img);
            return true;
          };
          const handleCreateImage = (attachment, idx) => {
            if (attachment.url == 'ERROR') {
              attemptToUseCachedImage(attachment.id, idx, attachment.hidden, attachment.filename, attachment.width, attachment.height);
            } else {
              if (!this.isImage(attachment.url)) return; // bruh
              const img = document.createElement('img');
              img.classList = Webpack.getByKeys('clickable').clickable;
              img.messageId = messageId;
              img.id = attachment.id; // USED FOR FINDING THE IMAGE THRU CONTEXT MENUS
              img.idx = idx;
              // img.style.minHeight = '104px'; // bruh?
              if (record) {
                img.addEventListener('click', () => {
                  if (this.menu.deleteKeyDown) {
                    this.deleteMessageFromRecords(messageId);
                    this.refilterMessages(); // I don't like calling that, maybe figure out a way to animate it collapsing on itself smoothly
                    this.saveData();
                    return;
                  }
                  this.createModal({ message, idx }, true);
                });
              }
              img.onerror = () => {
                if (img.triedCache) {
                  const imageErrorWrapperDiv = document.createElement('div');
                  imageErrorWrapperDiv.classList = Webpack.getByKeys('imageErrorWrapper').imageErrorWrapper;
                  imageErrorWrapperDiv.messageId = messageId;
                  contentDiv.replaceChild(imageErrorWrapperDiv, img);
                }
                if (record) {
                  fetch(attachment.url, { method: 'HEAD' }).then(res => {
                    try {
                      if (res.status != 404) return;
                      record.message.attachments[idx].url = 'ERROR';
                      img.src = 'http://localhost:7474/' + attachment.id + attachment.filename.match(/\.[0-9a-z]+$/)[0];
                      img.triedCache = true;
                    } catch (err) {
                      console.error('Failed loading cached image', err.message);
                    }
                  }).catch(err => {
                    console.error('Failed loading cached image', err.message);
                  });
                }
              };
              if (attachment.hidden) {
                img.src = `https://i.clouds.tf/q2vy/r8q6.png#${record.message.channel_id},${img.id}`;
                img.width = 200;
              } else {
                img.src = attachment.url;
                img.width = this.clamp(attachment.width, 200, 650);
              }
              contentDiv.appendChild(img);
            }
          };
          for (let ii = 0; ii < message.attachments.length; ii++) handleCreateImage(message.attachments[ii], ii);
        }
        if (message.embeds && message.embeds.length && false) {
          const ddiv = document.createElement('div');
          // TODO: optimize
          if (!this.populateParent.__embedcontainer) this.populateParent.__embedcontainer = this.safeGetClass(() => Webpack.getByKeys('containerCozy', 'gifFavoriteButton').containerCozy, 'containerCozy');
          ddiv.className = this.populateParent.__embedcontainer;
          const fuckme = new (ZeresPluginLibrary.WebpackModules.getByDisplayName('MessageAccessories'))({ channel: this.tools.getChannel(message.channel_id) || this.menu.randomValidChannel });
          for (const embed of message.embeds) {
            const embedBase = {
              GIFVComponent: ZeresPluginLibrary.WebpackModules.getByDisplayName('LazyGIFV'),
              ImageComponent: ZeresPluginLibrary.WebpackModules.getByDisplayName('LazyImageZoomable'),
              LinkComponent: ZeresPluginLibrary.WebpackModules.getByDisplayName('MaskedLink'),
              VideoComponent: ZeresPluginLibrary.WebpackModules.getByDisplayName('LazyVideo'),
              allowFullScreen: true,
              autoPlayGif: true,
              backgroundOpacity: '',
              className: Webpack.getByKeys('embedWrapper', 'gifFavoriteButton').embedWrapper,
              embed: Webpack.getByKeys('sanitizeEmbed').sanitizeEmbed(message.channel_id, message.id, embed),
              hideMedia: false,
              inlineGIFV: true,
              maxMediaHeight: 300,
              maxMediaWidth: 400,
              maxThumbnailHeight: 80,
              maxThumbnailWidth: 80,
              suppressEmbed: false,
              renderTitle: fuckme.renderEmbedTitle.bind(fuckme),
              renderDescription: fuckme.renderEmbedDescription.bind(fuckme),
              renderLinkComponent: Webpack.getByKeys('defaultRenderLinkComponent').defaultRenderLinkComponent,
              renderImageComponent: Webpack.getByKeys('renderImageComponent').renderImageComponent,
              renderVideoComponent: Webpack.getByKeys('renderVideoComponent').renderVideoComponent,
              renderAudioComponent: Webpack.getByKeys('renderAudioComponent').renderAudioComponent,
              renderMaskedLinkComponent: Webpack.getByKeys('renderMaskedLinkComponent').renderMaskedLinkComponent
            };
            ZeresPluginLibrary.DiscordModules.ReactDOM.render(React.createElement(ZeresPluginLibrary.WebpackModules.getByDisplayName('Embed'), embedBase), ddiv);
          }
          contentDiv.appendChild(ddiv);
        }
        if (!contentDiv.childElementCount && !message.content.length) return; // don't bother
        //messageContent.appendChild(divParent);
        parent.appendChild(messageGroup);
      } catch (err) {
        Logger.stacktrace(this.getName(), 'Error in populateParent', err);
      }
    };
    let i = 0;
    const addMore = () => {
      for (let added = 0; i < messages.length && (added < this.settings.renderCap || (this.menu.shownMessages != -1 && i < this.menu.shownMessages)); i++, added++) populate(i);
      handleMoreMessages();
      this.menu.shownMessages = i;
    };
    const handleMoreMessages = () => {
      if (i < messages.length) {
        const div = document.createElement('div');
        const moreButton = this.createButton('LOAD MORE', function () {
          this.parentElement.remove();
          addMore();
        });
        moreButton.style.width = '100%';
        moreButton.style.marginBottom = '20px';
        div.appendChild(moreButton);
        parent.appendChild(div);
      }
    };

    if (this.settings.renderCap) addMore();
    else for (; i < messages.length; i++) populate(i);
    this.processUserRequestQueue();
    if (!messages.length) {
      const strong = document.createElement('strong');
      strong.className = this.multiClasses.defaultColor;
      strong.innerText = "Not to worry, the logger is not broken! There simply wasn't anything logged in the selected tab.";
      parent.appendChild(strong);
    }
  }
  // >>-|| FILTERING ||-<<
  sortMessagesByAge(map) {
    // sort direction: new - old
    map.sort((a, b) => {
      const recordA = this.messageRecord[a];
      const recordB = this.messageRecord[b];
      if (!recordA || !recordB) return 0;
      let timeA = new Date(recordA.message.timestamp).getTime();
      let timeB = new Date(recordB.message.timestamp).getTime();
      if (recordA.edit_history && typeof recordA.edit_history[recordA.edit_history.length - 1].time !== 'string') timeA = recordA.edit_history[recordA.edit_history.length - 1].time;
      if (recordB.edit_history && typeof recordB.edit_history[recordB.edit_history.length - 1].time !== 'string') timeB = recordB.edit_history[recordB.edit_history.length - 1].time;
      if (recordA.delete_data && recordA.delete_data.time) timeA = recordA.delete_data.time;
      if (recordB.delete_data && recordB.delete_data.time) timeB = recordB.delete_data.time;
      return parseInt(timeB) - parseInt(timeA);
    });
  }
  getFilteredMessages() {
    let messages = [];

    const pushIdsIntoMessages = map => {
      for (let channel in map) {
        for (let messageIdIDX in map[channel]) {
          messages.push(map[channel][messageIdIDX]);
        }
      }
    };
    const checkIsMentioned = map => {
      for (let channel in map) {
        for (let messageIdIDX in map[channel]) {
          const messageId = map[channel][messageIdIDX];
          const record = this.getSavedMessage(messageId);
          if (!record) continue;
          if (record.ghost_pinged) {
            messages.push(messageId);
          }
        }
      }
    };

    if (this.menu.selectedTab == 'sent') {
      for (let i of this.cachedMessageRecord) {
        messages.push(i.id);
      }
    }
    if (this.menu.selectedTab == 'edited') pushIdsIntoMessages(this.editedMessageRecord);
    if (this.menu.selectedTab == 'deleted') pushIdsIntoMessages(this.deletedMessageRecord);
    if (this.menu.selectedTab == 'purged') pushIdsIntoMessages(this.purgedMessageRecord);
    if (this.menu.selectedTab == 'ghostpings') {
      checkIsMentioned(this.deletedMessageRecord);
      checkIsMentioned(this.editedMessageRecord);
      checkIsMentioned(this.purgedMessageRecord);
    }

    const filters = this.menu.filter.split(',');

    for (let i = 0; i < filters.length; i++) {
      const split = filters[i].split(':');
      if (split.length < 2) continue;

      const filterType = split[0].trim().toLowerCase();
      const filter = split[1].trim().toLowerCase();

      if (filterType == 'server' || filterType == 'guild')
        messages = messages.filter(x => {
          const message = this.getMessageAny(x);
          if (!message) return false;
          const channel = this.tools.getChannel(message.channel_id);
          const guild = this.tools.getServer(message.guild_id || (channel && channel.guild_id));
          return (message.guild_id || (channel && channel.guild_id)) == filter || (guild && guild.name.toLowerCase().includes(filter.toLowerCase()));
        });

      if (filterType == 'channel')
        messages = messages.filter(x => {
          const message = this.getMessageAny(x);
          if (!message) return false;
          const channel = this.tools.getChannel(message.channel_id);
          return message.channel_id == filter || (channel && channel.name.toLowerCase().includes(filter.replace('#', '').toLowerCase()));
        });

      if (filterType == 'message' || filterType == 'content')
        messages = messages.filter(x => {
          const message = this.getMessageAny(x);
          return x == filter || (message && message.content.toLowerCase().includes(filter.toLowerCase()));
        });

      if (filterType == 'user')
        messages = messages.filter(x => {
          const message = this.getMessageAny(x);
          if (!message) return false;
          const channel = this.tools.getChannel(message.channel_id);
          const member = Webpack.Stores.GuildMemberStore.getMember(message.guild_id || (channel && channel.guild_id), message.author.id);
          return message.author.id == filter || message.author.username.toLowerCase().includes(filter.toLowerCase()) || (member && member.nick && member.nick.toLowerCase().includes(filter.toLowerCase()));
        });

      if (filterType == 'has') {
        switch (filter) {
          case 'image':
            messages = messages.filter(x => {
              const message = this.getMessageAny(x);
              if (!message) return false;
              if (Array.isArray(message.attachments)) if (message.attachments.some(({ filename }) => /\.(png|jpe?g|webp|gif)$/i.test(filename))) return true;
              if (Array.isArray(message.embeds)) return message.embeds.some(({ image }) => !!image);
              return false;
            });
            break;
          case 'link':
            messages = messages.filter(x => {
              const message = this.getMessageAny(x);
              if (!message) return false;
              return message.content.search(/https?:\/\/[\w\W]{2,}/) !== -1;
            });
            break;
        }
      }
    }

    if (this.menu.selectedTab != 'sent') {
      this.sortMessagesByAge(messages);
      if (this.settings.reverseOrder) messages.reverse(); // this gave me a virtual headache
    } else if (!this.settings.reverseOrder) messages.reverse(); // this gave me a virtual headache

    return messages;
  }
  // >>-|| REPOPULATE ||-<<
  refilterMessages() {
    const messagesDIV = document.getElementById(this.style.menuMessages);
    const original = messagesDIV.style.display;
    messagesDIV.style.display = 'none';
    while (messagesDIV.firstChild) messagesDIV.removeChild(messagesDIV.firstChild);
    this.menu.messages = this.getFilteredMessages();
    this.populateParent(messagesDIV, this.menu.messages);
    messagesDIV.style.display = original;
  }
  // >>-|| HEADER ||-<<
  openTab(tab) {
    const tabBar = document.getElementById(this.style.menuTabBar);
    if (!tabBar) return BdApi.UI.showToast(`Error switching to tab ${tab}!`, { type: 'error', timeout: 3000 });
    tabBar.querySelector(`.${this.style.tabSelected}`).classList.remove(this.style.tabSelected);
    tabBar.querySelector('#' + tab).classList.add(this.style.tabSelected);
    this.menu.selectedTab = tab;
    setTimeout(() => this.refilterMessages(), 0);
  }
  createHeader() {
    if (!this.createHeader.classes || this.createHeader.classes.__errored) {
      try {
        const TabBarStuffs = Webpack.getByKeys('body', 'tabBar');
        this.createHeader.classes = {
          itemTabBarItem: this.style.tabBarItem,
          tabBarContainer: this.style.tabBarContainer,
          tabBar: this.style.tabBar,
          tabBarSingle: this.style.tabBar
        };
      } catch {
        this.createHeader.classes = {
          itemTabBarItem: 'tabBarItem' + ' ' + 'item',
          tabBarContainer: 'tabBarContainer',
          tabBar: 'tabBar',
          tabBarSingle: 'tabBar',
          __errored: true
        };
      }
    }
    const classes = this.createHeader.classes;
    const createTab = (title, id) => {
      const tab = this.parseHTML(`<div id="${id}" class="${classes.itemTabBarItem} ${this.style.tab} ${id == this.menu.selectedTab ? this.style.tabSelected : ''}" role="button">${title}</div>`);
      tab.addEventListener('mousedown', () => this.openTab(id));
      return tab;
    };
    const tabBar = this.parseHTML(`<div class="${classes.tabBarContainer}"><div class="${classes.tabBar}" id="${this.style.menuTabBar}"></div></div>`);
    const tabs = tabBar.getElementsByClassName(classes.tabBarSingle)[0];
    tabs.appendChild(createTab('Sent', 'sent'));
    tabs.appendChild(createTab('Deleted', 'deleted'));
    tabs.appendChild(createTab('Edited', 'edited'));
    tabs.appendChild(createTab('Purged', 'purged'));
    tabs.appendChild(createTab('Ghost pings', 'ghostpings'));
    tabBar.style.marginRight = '20px';
    return tabBar;
  }
  createTextBox() {
    if (!this.createTextBox.classes || this.createTextBox.classes.__errored) {
      try {
        this.createTextBox.classes = {
          inputWrapper: this.style.inputWrapper,
          inputMultiInput: this.style.multiInput,
          multiInputFirst: this.style.multiInputFirst,
          inputDefaultMultiInputField: this.style.input,
          questionMark: this.style.questionMark,
          icon: this.style.questionMark,
          focused: Webpack.getByKeys('focused').focused.split(/ /g),
          questionMarkSingle: this.style.questionMark
        }
      } catch {
        this.createTextBox.classes = {
          inputWrapper: 'inputMini inputWrapper',
          inputMultiInput: 'inputPrefix input' + ' ' + 'multiInput',
          multiInputFirst: 'multiInputFirst',
          inputDefaultMultiInputField: 'inputPrefix inputDefault' + ' ' + 'multiInputField',
          questionMark: 'questionMark',
          icon: 'questionMark',
          focused: 'focused',
          questionMarkSingle: 'questionMark',
          __errored: true
        }
      }
    }
    const classes = this.createTextBox.classes;
    let textBox = this.parseHTML(
      `<div class="${classes.inputWrapper}"><div class="${classes.inputMultiInput}"><div class="${classes.inputWrapper} ${classes.multiInputFirst}"><input class="${classes.inputDefaultMultiInputField}" name="username" type="text" placeholder="Message filter" maxlength="999" value="${this.menu.filter}" id="${this.style.filter}"></div><span tabindex="0" class="${classes.questionMark}" role="button"><svg name="QuestionMark" class="${classes.icon}" aria-hidden="false" width="16" height="16" viewBox="0 0 24 24"><g fill="currentColor" fill-rule="evenodd" transform="translate(7 4)"><path d="M0 4.3258427C0 5.06741573.616438356 5.68539326 1.35616438 5.68539326 2.09589041 5.68539326 2.71232877 5.06741573 2.71232877 4.3258427 2.71232877 2.84269663 4.31506849 2.78089888 4.5 2.78089888 4.68493151 2.78089888 6.28767123 2.84269663 6.28767123 4.3258427L6.28767123 4.63483146C6.28767123 5.25280899 5.97945205 5.74719101 5.42465753 6.05617978L4.19178082 6.73595506C3.51369863 7.10674157 3.14383562 7.78651685 3.14383562 8.52808989L3.14383562 9.64044944C3.14383562 10.3820225 3.76027397 11 4.5 11 5.23972603 11 5.85616438 10.3820225 5.85616438 9.64044944L5.85616438 8.96067416 6.71917808 8.52808989C8.1369863 7.78651685 9 6.30337079 9 4.69662921L9 4.3258427C9 1.48314607 6.71917808 0 4.5 0 2.21917808 0 0 1.48314607 0 4.3258427zM4.5 12C2.5 12 2.5 15 4.5 15 6.5 15 6.5 12 4.5 12L4.5 12z"></path></g></svg></span></div></div>`
    );
    const inputEl = textBox.getElementsByTagName('input')[0];
    inputEl.addEventListener('focusout', e => {
      DOMTokenList.prototype.remove.apply(e.target.parentElement.parentElement.classList, classes.focused);
    });
    inputEl.addEventListener('focusin', e => {
      DOMTokenList.prototype.add.apply(e.target.parentElement.parentElement.classList, classes.focused);
    });
    const onUpdate = e => {
      if (this.menu.filterSetTimeout) clearTimeout(this.menu.filterSetTimeout);
      this.menu.filter = inputEl.value;
      const filters = this.menu.filter.split(',');
      // console.log(filters);
      if (!filters[0].length) return this.refilterMessages();
      this.menu.filterSetTimeout = setTimeout(() => {
        if (filters[0].length) {
          for (let i = 0; i < filters.length; i++) {
            const split = filters[i].split(':');
            if (split.length < 2) return;
          }
        }
        this.refilterMessages();
      }, 200);
    };
    inputEl.addEventListener('keyup', onUpdate); // maybe I can actually use keydown but it didn't work for me
    inputEl.addEventListener('paste', onUpdate);
    const helpButton = textBox.getElementsByClassName(classes.questionMarkSingle)[0];
    helpButton.addEventListener('click', () => {
      const helpText =
        `"server: <server name or server id>" - Filter results with the specified server name or id.
"channel: <channel name or channel id>" - Filter results with the specified channel name or id.
"user: <username, nickname or user id>" - Filter results with the specified username, nickname or userid.
"message: <text or message id>" or "content: <text or message id>" - Filter results with the specified message content.
"has: <image or link> - Filter results to only images or links

Separate the search tags with commas.
Example: server: BetterDiscord, message: heck

Pro tip: Right clicking the icon will filter the messages to the current channel.`;

      BdApi.UI.showConfirmationModal('Filter help',
        React.createElement('div', { className: this.multiClasses.defaultColor },
          React.createElement('p', {
            style: {
              whiteSpace: 'pre-wrap'
            }
          }, helpText
          ),
          React.createElement(BdApi.Components.Button, {
            onClick: _ => this.showLoggerHelpModal()
          }, 'Logger help'
          )
        ),
        {
          confirmText: 'OK',
          cancelText: null,
        });
    });
    BdApi.UI.createTooltip(helpButton, 'Help!', { side: 'top' });
    return textBox;
  }
  // >>-|| MENU MODAL CREATION ||-<<
  openWindow(type) {
    if (this.menu.open) {
      this.menu.scrollPosition = 0;
      if (type) this.openTab(type);
      return;
    }
    this.menu.open = true;
    if (type) this.menu.selectedTab = type;
    if (!this.menu.selectedTab) this.menu.selectedTab = 'deleted';
    const messagesDIV = this.parseHTML(`<div id="${this.style.menuMessages}"></div>`);
    const viewportHeight = document.getElementById('app-mount').getBoundingClientRect().height;
    messagesDIV.style.minHeight = viewportHeight * 0.514090909 + 'px'; // hack but ok
    //messagesDIV.style.display = 'none';
    const onChangeOrder = el => {
      this.settings.reverseOrder = !this.settings.reverseOrder;
      el.target.innerText = 'Sort direction: ' + (!this.settings.reverseOrder ? 'new - old' : 'old - new'); // maybe a func?
      this.saveSettings();
      this.refilterMessages();
    };

    const onClearLog = e => {
      if (document.getElementById(this.style.filter).parentElement.parentElement.className.indexOf(this.createTextBox.classes.focused[0]) != -1) return;
      let type = this.menu.selectedTab;
      if (type === 'ghostpings') type = 'ghost pings';
      else type += ' messages';

      BdApi.UI.showConfirmationModal('Clear log',
        `Are you sure you want to delete all ${type}${this.menu.filter.length ? ' that also match filter' : ''}?`,
        {
          confirmText: 'Confirm',
          danger: true,
          cancelText: 'Cancel',
          onConfirm: () => {
            if (this.menu.selectedTab == 'sent') {
              if (!this.menu.filter.length)
                for (let id of this.menu.messages)
                  this.cachedMessageRecord.splice(
                    this.cachedMessageRecord.findIndex(m => m.id === id),
                    1
                  );
              else this.cachedMessageRecord.length = 0; // hack, does it cause a memory leak?
            } else {
              for (let id of this.menu.messages) {
                const record = this.messageRecord[id];
                let isSelected = false;
                if (record) {
                  this.invalidateChannelCache(record.message.channel_id);
                  if (this.selectedChannel) isSelected = record.message.channel_id === this.selectedChannel.id;
                }
                this.deleteMessageFromRecords(id);
                if (this.selectedChannel && isSelected) this.cacheChannelMessages(this.selectedChannel.id);
              }
              this.saveData();
            }
            setImmediate(_ => this.refilterMessages());
            // this.menu.refilterOnMount = true;
          }
        });
    };

    // unfortunately the BdApi.UI.showConfirmationModal doesn't support what I have in mind here, so this will have to stay
    // more specifically, does not support overriding what the confirm and cancel buttons do entirely
    // they inadvertently close the modal which is not the intended functionality
    this.createModal(
      {
        confirmText: 'Clear log',
        cancelText: 'Sort direction: ' + (!this.settings.reverseOrder ? 'new - old' : 'old - new'),
        header: React.createElement(BdApi.ReactUtils.wrapElement([this.createTextBox(), this.createHeader()])),
        className: this.style.menuModalLarge,
        children: [React.createElement(BdApi.ReactUtils.wrapElement([messagesDIV]))],
        onCancel: onChangeOrder,
        onConfirm: onClearLog,
        onClose: _ => { },
        ml2Data: true,
        className: this.style.menuRoot,
        ref: e => {
          if (!e) return;
          /* advanced tech! */
          const stateNode = BdApi.Utils.getNestedValue(e, '_reactInternalFiber.return.return.stateNode.firstChild.childNodes.1.firstChild');
          if (!stateNode) return;
          stateNode.addEventListener(
            'scroll',
            this.lodash.debounce(() => {
              this.scrollPosition = document.getElementById(this.style.menuMessages).parentElement.parentElement.parentElement.scrollTop;
            }, 100)
          );
        }
      },
      false,
      this.style.menu
    );
    let loadAttempts = 0;
    const loadMessages = () => {
      loadAttempts++;
      try {
        this.refilterMessages();
      } catch (e) {
        if (loadAttempts > 4) {
          BdApi.UI.showNotification({ title: this.getName(), content: `Couldn't load menu messages! Report this issue to Lighty, error info is in console`, type: 'error', duration: Infinity });
          Logger.stacktrace(this.getName(), 'Failed loading menu', e);
          return;
        }
        setTimeout(loadMessages, 100);
      }
    };
    setTimeout(loadMessages, 100);
  }
  /* ==================================================-|| END MENU ||-================================================== */
  /* ==================================================-|| START CONTEXT MENU ||-================================================== */
  patchContextMenus() {
    const _this = this;

    this.unpatches.push(BdApi.ContextMenu.patch('message', (ret, props) => {
      const menu = BdApi.Utils.getNestedValue(
        this.findInReactTree(ret, e => e && e.navId === 'message'),
        'children'
      );
      if (!Array.isArray(menu)) return;

      const newItems = [];
      const addElement = (label, action, options = {}) => newItems.push({ label, action, ...options });

      addElement('Open Logs', () => this.openWindow());

      const messageId = props.message.id;
      const channelId = props.channel.id;
      const record = this.messageRecord[messageId];
      if (record) {
        /*
                addElement('Show in menu', () => {
                    this.menu.filter = `message:${messageId}`;
                    this.openWindow();
                }); */
        if (record.delete_data) {
          const options = menu.find(m => m.props.children && m.props.children.length > 10);
          options.props.children.splice(0, options.props.children.length);
          addElement(
            'Hide Deleted Message',
            () => {
              this.dispatcher.dispatch({
                type: 'MESSAGE_DELETE',
                id: messageId,
                channelId: channelId,
                ML2: true // ignore ourselves lol, it's already deleted
                // on a side note, probably does nothing if we don't ignore
              });
              BdApi.UI.showToast('Hidden!', { type: 'success' });
              record.delete_data.hidden = true;
              this.saveData();
            }
          );
          const idx = this.noTintIds.indexOf(messageId);
          addElement(
            `${idx !== -1 ? 'Add' : 'Remove'} Deleted Tint`,
            () => {
              if (idx !== -1) this.noTintIds.splice(idx, 1);
              else this.noTintIds.push(messageId);
              BdApi.UI.showToast(idx !== -1 ? 'Added!' : 'Removed!', { type: 'success' });
            }
          );
        }
        if (record.edit_history) {
          if (record.edits_hidden) {
            addElement(
              'Unhide Edits',
              () => {
                record.edits_hidden = false;
                this.saveData();
                this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
              }
            );
          } else {
            let target = props.target;
            if (target) {
              while (target && target.className && target.className.indexOf(this.style.edited) === -1) {
                target = target.parentElement;
              }
              if (target) {
                const modifiers = this.editModifiers[messageId];
                const editNum = target.getAttribute('editNum');
                if (modifiers?.editNum) {
                  addElement(
                    `${modifiers.noSuffix ? 'Show' : 'Hide'} (edited) Tag`,
                    () => {
                      modifiers.noSuffix = true;
                      this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                    }
                  );
                  addElement(
                    `Undo Show As Message`,
                    () => {
                      delete modifiers.editNum;
                      if (!Object.keys(modifiers).length) delete this.editModifiers[messageId];
                      this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                    },
                    this.obfuscatedClass('undo-show-as-message')
                  );
                } else {
                  if (typeof editNum !== 'undefined' && editNum !== null) {
                    addElement(
                      'Show Edit As Message',
                      () => {
                        if (modifiers) modifiers.editNum = parseInt(editNum);
                        else this.editModifiers[messageId] = { editNum };
                        this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                      }
                    );
                    addElement(
                      'Delete Edit',
                      () => {
                        this.deleteEditedMessageFromRecord(messageId, parseInt(editNum));
                        this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                      },
                      { color: 'danger' }
                    );
                  }
                  if (this.settings.showEditedMessages) {
                    addElement(
                      'Hide Edits',
                      () => {
                        record.edits_hidden = true;
                        this.saveData();
                        this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                      }
                    );
                  }

                  if (modifiers?.showAllEdits) {
                    addElement(
                      'Undo show all edits',
                      () => {
                        delete modifiers.showAllEdits;
                        if (!Object.keys(modifiers).length) delete this.editModifiers[messageId];
                        this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                      },
                      this.obfuscatedClass('undo-show-all-edits')
                    )
                  } else if (this.settings.maxShownEdits && record.edit_history.length > this.settings.maxShownEdits) {
                    addElement(
                      'Show All Edits',
                      () => {
                        this.editModifiers[messageId] = { showAllEdits: true };
                        this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
                      }
                    );
                  }
                }
              }
            }
          }
        }
        if (record) {
          addElement(
            'Remove From Log',
            () => {
              this.deleteMessageFromRecords(messageId);
              this.saveData();
              if (record.delete_data) {
                this.dispatcher.dispatch({
                  type: 'MESSAGE_DELETE',
                  id: messageId,
                  channelId: channelId,
                  ML2: true // ignore ourselves lol, it's already deleted
                  // on a side note, probably does nothing if we don't ignore
                });
              } else {
                this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
              }
            },
            { color: 'danger' }
          );
        }
      }

      menu.push(BdApi.ContextMenu.buildMenuChildren([{
        type: 'group',
        items: [{
          type: 'submenu',
          label: this.settings.contextmenuSubmenuName,
          items: newItems
        }]
      }]));
    }));

    const handleWhiteBlackList = (newItems, id) => {
      const addElement = (label, action, options = {}) => newItems.push({ label, action, ...options });
      const whitelistIdx = this.settings.whitelist.findIndex(m => m === id);
      const blacklistIdx = this.settings.blacklist.findIndex(m => m === id);
      if (whitelistIdx == -1 && blacklistIdx == -1) {
        addElement(
          `Add to Whitelist`,
          () => {
            this.settings.whitelist.push(id);
            this.saveSettings();
            BdApi.UI.showToast('Added!', { type: 'success' });
          }
        );
        addElement(
          `Add to Blacklist`,
          () => {
            this.settings.blacklist.push(id);
            this.saveSettings();
            BdApi.UI.showToast('Added!', { type: 'success' });
          }
        );
      } else if (whitelistIdx != -1) {
        addElement(
          `Remove From Whitelist`,
          () => {
            this.settings.whitelist.splice(whitelistIdx, 1);
            this.saveSettings();
            BdApi.UI.showToast('Removed!', { type: 'success' });
          }
        );
        addElement(
          `Move to Blacklist`,
          () => {
            this.settings.whitelist.splice(whitelistIdx, 1);
            this.settings.blacklist.push(id);
            this.saveSettings();
            BdApi.UI.showToast('Moved!', { type: 'success' });
          }
        );
      } else {
        addElement(
          `Remove From Blacklist`,
          () => {
            this.settings.blacklist.splice(blacklistIdx, 1);
            this.saveSettings();
            BdApi.UI.showToast('Removed!', { type: 'success' });
          }
        );
        addElement(
          `Move to Whitelist`,
          () => {
            this.settings.blacklist.splice(blacklistIdx, 1);
            this.settings.whitelist.push(id);
            this.saveSettings();
            BdApi.UI.showToast('Moved!', { type: 'success' });
          }
        );
      }
      const notifIdx = this.settings.notificationBlacklist.indexOf(id);
      addElement(
        `${notifIdx === -1 ? 'Add To' : 'Remove From'} Notification Blacklist`,
        () => {
          if (notifIdx === -1) this.settings.notificationBlacklist.push(id);
          else this.settings.notificationBlacklist.splice(notifIdx, 1);
          this.saveSettings();
          BdApi.UI.showToast(notifIdx === -1 ? 'Added!' : 'Removed!', { type: 'success' });
        }
      );
    };

    this.unpatches.push(BdApi.ContextMenu.patch('channel-context', (ret, props) => {
      if (props.channel.type === 4) return; // categories
      const menu = BdApi.Utils.getNestedValue(
        this.findInReactTree(ret, e => e && e.navId === 'channel-context'),
        'children'
      );
      if (!Array.isArray(menu)) return;

      const newItems = [];
      const addElement = (label, action, options = {}) => newItems.push({ label, action, ...options });

      addElement('Open Logs', () => this.openWindow());
      addElement(
        `Open Log For Channel`,
        () => {
          _this.menu.filter = `channel:${props.channel.id}`;
          _this.openWindow();
        }
      );
      handleWhiteBlackList(newItems, props.channel.id);

      menu.push(BdApi.ContextMenu.buildMenuChildren([{
        type: 'group',
        items: [{
          type: 'submenu',
          label: this.settings.contextmenuSubmenuName,
          items: newItems
        }]
      }]));
    }));

    this.unpatches.push(BdApi.ContextMenu.patch('guild-context', (ret, props) => {
      const menu = BdApi.Utils.getNestedValue(
        this.findInReactTree(ret, e => e && e.navId === 'guild-context'),
        'children'
      );
      if (!Array.isArray(menu)) return;

      const newItems = [];
      const addElement = (label, action, options = {}) => newItems.push({ label, action, ...options });

      addElement('Open Logs', () => this.openWindow());

      addElement(
        `Open Log For Guild`,
        () => {
          _this.menu.filter = `guild:${props.guild.id}`;
          _this.openWindow();
        }
      );
      handleWhiteBlackList(newItems, props.guild.id);

      menu.push(BdApi.ContextMenu.buildMenuChildren([{
        type: 'group',
        items: [{
          type: 'submenu',
          label: this.settings.contextmenuSubmenuName,
          items: newItems
        }]
      }]));
    }));

    this.unpatches.push(BdApi.ContextMenu.patch('user-context', (ret, props) => {
      const menu = BdApi.Utils.getNestedValue(
        this.findInReactTree(ret, e => e && e.navId === 'user-context'),
        'children'
      );
      if (!Array.isArray(menu)) return;

      const newItems = [];
      const addElement = (label, action, options = {}) => newItems.push({ label, action, ...options });

      addElement('Open Logs', () => this.openWindow());
      addElement(
        `Open Log For User`,
        () => {
          _this.menu.filter = `user:${props.user.id}`;
          _this.openWindow();
        }
      );

      if (props.channel?.isDM()) {
        addElement(
          `Open Log For DM`,
          () => {
            _this.menu.filter = `channel:${props.channel.id}`;
            _this.openWindow();
          }
        );

        handleWhiteBlackList(newItems, props.channel.id);
      }

      menu.push(BdApi.ContextMenu.buildMenuChildren([{
        type: 'group',
        items: [{
          type: 'submenu',
          label: this.settings.contextmenuSubmenuName,
          items: newItems
        }]
      }]));
    }));

    this.unpatches.push(BdApi.ContextMenu.patch('gdm-context', (ret, props) => {
      const menu = BdApi.Utils.getNestedValue(
        this.findInReactTree(ret, e => e && e.navId === 'gdm-context'),
        'children'
      );
      if (!Array.isArray(menu)) return;

      const newItems = [];
      const addElement = (label, action, options = {}) => newItems.push({ label, action, ...options });

      addElement('Open Logs', () => this.openWindow());
      addElement(
        `Open Log For Channel`,
        () => {
          _this.menu.filter = `channel:${props.channel.id}`;
          _this.openWindow();
        }
      );
      handleWhiteBlackList(newItems, props.channel.id);

      menu.push(BdApi.ContextMenu.buildMenuChildren([{
        type: 'group',
        items: [{
          type: 'submenu',
          label: this.settings.contextmenuSubmenuName,
          items: newItems
        }]
      }]));
    }));

    this.unpatches.push(BdApi.ContextMenu.patch('image-context', (ret, props) => {
      const menu = BdApi.Utils.getNestedValue(
        this.findInReactTree(ret, e => e && e.navId === 'image-context'),
        'children'
      );
      if (!Array.isArray(menu)) return;

      const newItems = [];
      const addElement = (label, action, options = {}) => newItems.push({ label, action, ...options });
      let matched;
      let isCached = false;
      if (!props.src) return;
      if (props.src.startsWith('data:image/png')) {
        const cut = props.src.substr(0, 100);
        matched = cut.match(/;(\d+);(\d+);/);
        isCached = true;
      } else {
        matched = props.src.match(/.*ments\/(\d+)\/(\d+)\//);
        if (!matched) matched = props.src.match(/r8q6.png#(\d+),(\d+)/);
        if (!matched) {
          matched = props.src.match(/localhost:7474.*#(\d+),(\d+)/);
          isCached = true;
        }
      }
      if (!matched) return;
      const channelId = matched[1];
      const attachmentId = matched[2];
      const element = document.getElementById(attachmentId);
      if (!element) return;
      const attachmentIdx = element.idx;
      const record = this.getSavedMessage(element.messageId);
      if (!record) return;
      addElement(
        'Save to Folder',
        () => {
          const { dialog } = this.nodeModules.electron.remote;
          dialog
            .showSaveDialog({
              defaultPath: record.message.attachments[attachmentIdx].filename
            })
            .then(({ filePath: dir }) => {
              try {
                if (!dir) return;
                const attemptToUseCached = () => {
                  const srcFile = `${this.settings.imageCacheDir}/${attachmentId}${record.message.attachments[attachmentIdx].filename.match(/\.[0-9a-z]+$/)[0]}`;
                  if (!this.nodeModules.fs.existsSync(srcFile)) return BdApi.UI.showToast('Image does not exist locally!', { type: 'error', timeout: 5000 });
                  this.nodeModules.fs.copyFileSync(srcFile, dir);
                  BdApi.UI.showToast('Saved!', { type: 'success' });
                };
                if (isCached) {
                  attemptToUseCached();
                } else {
                  const req = fetch(record.message.attachments[attachmentIdx].url);
                  req.then(res => {
                    if (res.status == 200) {
                      req
                        .then(res => res.blob())
                        .then(blob => {
                          this.nodeModules.fs.writeFile(dir, blob, () => BdApi.UI.showToast('Saved!', { type: 'success' }));
                        });
                    } else {
                      attemptToUseCached();
                    }
                  });
                }
              } catch (err) {
                console.error('Failed saving', err.message);
              }
            });
        },
        this.obfuscatedClass('save-to')
      );
      addElement(
        'Copy to Clipboard',
        () => {
          const { clipboard, nativeImage } = this.nodeModules.electron;
          const attemptToUseCached = () => {
            const srcFile = `${this.settings.imageCacheDir}/${attachmentId}${record.message.attachments[attachmentIdx].filename.match(/\.[0-9a-z]+$/)[0]}`;
            if (!this.nodeModules.fs.existsSync(srcFile)) return BdApi.UI.showToast('Image does not exist locally!', { type: 'error', timeout: 5000 });
            clipboard.write({ image: srcFile });
            BdApi.UI.showToast('Copied!', { type: 'success' });
          };
          if (isCached) {
            attemptToUseCached();
          } else {
            const path = this.nodeModules.path;
            const process = require('process');
            // ImageToClipboard by Zerebos
            this.nodeModules.request({ url: record.message.attachments[attachmentIdx].url, encoding: null }, (error, response, buffer) => {
              try {
                if (error || response.statusCode != 200) {
                  BdApi.UI.showToast('Failed to copy. Image may not exist. Attempting to use local image cache.', { type: 'error' });
                  attemptToUseCached();
                  return;
                }
                if (process.platform === 'win32' || process.platform === 'darwin') {
                  clipboard.write({ image: nativeImage.createFromBuffer(buffer) });
                } else {
                  const file = path.join(process.env.HOME, 'ml2temp.png');
                  this.nodeModules.fs.writeFileSync(file, buffer, { encoding: null });
                  clipboard.write({ image: file });
                  this.nodeModules.fs.unlinkSync(file);
                }
                BdApi.UI.showToast('Copied!', { type: 'success' });
              } catch (err) {
                console.error('Failed to cached', err.message);
              }
            });
          }
        },
        this.obfuscatedClass('copy-to')
      );
      addElement(
        'Jump to Message',
        () => {
          this.jumpToMessage(channelId, element.messageId, record.message.guild_id);
        },
        this.obfuscatedClass('jump-to')
      );
      if (record.delete_data && record.delete_data.hidden) {
        addElement(
          'Unhide Deleted Message',
          () => {
            record.delete_data.hidden = false;
            this.invalidateChannelCache(record.message.channel_id); // good idea?
            this.cacheChannelMessages(record.message.channel_id);
            this.saveData();
            BdApi.UI.showToast('Unhidden!', { type: 'success' });
          },
          this.obfuscatedClass('unhide-deleted')
        );
      }
      if (record.edit_history && record.edits_hidden) {
        addElement(
          'Unhide Message History',
          () => {
            record.edits_hidden = false;
            this.invalidateChannelCache(record.message.channel_id); // good idea?
            this.cacheChannelMessages(record.message.channel_id);
            this.saveData();
            BdApi.UI.showToast('Unhidden!', { type: 'success' });
          },
          this.obfuscatedClass('unhide-edited')
        );
      }
      addElement(
        'Remove From Log',
        () => {
          this.deleteMessageFromRecords(element.messageId);
          this.refilterMessages(); // I don't like calling that, maybe figure out a way to animate it collapsing on itself smoothly
          this.saveData();
          if (record.delete_data) this.dispatcher.dispatch({ type: 'MESSAGE_DELETE', id: messageId, channelId: channelId, ML2: true });
          else this.dispatcher.dispatch({ type: 'MLV2_FORCE_UPDATE_MESSAGE_CONTENT', id: messageId });
        },
        this.obfuscatedClass('remove')
      );
      if (!props.src.startsWith('https://i.clouds.tf/q2vy/r8q6.png')) {
        addElement(
          'Hide Image From Log',
          () => {
            record.message.attachments[attachmentIdx].hidden = true;
            element.src = `https://i.clouds.tf/q2vy/r8q6.png#${channelId},${attachmentId}`;
            element.width = 200;
          },
          this.obfuscatedClass('hide-image')
        );
      } else {
        addElement(
          'Unhide Image From Log',
          () => {
            record.message.attachments[attachmentIdx].hidden = false;
            const srcFile = `http://localhost:7474/${attachmentId}${record.message.attachments[attachmentIdx].filename.match(/\.[0-9a-z]+$/)[0]}#${channelId},${attachmentId}`;
            element.src = record.message.attachments[attachmentIdx].url === 'ERROR' ? srcFile : record.message.attachments[attachmentIdx].url;
            element.width = record.message.attachments[attachmentIdx].url === 'ERROR' ? 256 : this.clamp(record.message.attachments[attachmentIdx].width, 200, 650);
          },
          this.obfuscatedClass('unhide-image')
        );
      }

      menu.push(BdApi.ContextMenu.buildMenuChildren([{
        type: 'group',
        items: [{
          type: 'submenu',
          label: this.settings.contextmenuSubmenuName,
          items: newItems
        }]
      }]));
    }));
  }
  /* ==================================================-|| END CONTEXT MENU ||-================================================== */
};
/*@end @*/
