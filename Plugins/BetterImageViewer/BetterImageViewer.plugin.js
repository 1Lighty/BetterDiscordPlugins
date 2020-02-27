//META{"name":"BetterImageViewer","source":"https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/BetterImageViewer/BetterImageViewer.plugin.js","website":"https://1lighty.github.io/BetterDiscordStuff/?plugin=BetterImageViewer"}*//
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

var BetterImageViewer = (() => {
  /* Setup */
  const config = {
    main: 'index.js',
    info: {
      name: 'BetterImageViewer',
      authors: [
        {
          name: 'Lighty',
          discord_id: '239513071272329217',
          github_username: '1Lighty',
          twitter_username: ''
        }
      ],
      version: '1.0.2',
      description: 'Telegram image viewer ported to Discord. Adds ability to go between images in the current channel with arrow keys, or on screen buttons. Also provides info about the image, who posted it and when.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/BetterImageViewer/BetterImageViewer.plugin.js'
    },
    changelog: [
      {
        title: "Now you're thinking with portals!",
        type: 'fixed',
        items: ['Nav buttons and info are now an overlay which means, fixed an issue from a certain trash plugin from a certain bad developer of who we do not speak of.']
      },
      {
        title: 'how sad',
        type: 'fixed',
        items: ['Fixed plugin throwing a fit if image size was 1x1', 'Fixed some class issues making the authors name and send time not looking fancy']
      }
    ],
    defaultConfig: [
      {
        type: 'category',
        id: 'ui',
        name: 'UI settings',
        collapsible: true,
        shown: true,
        settings: [
          {
            name: 'Show image index and number of images left (estimated)',
            id: 'imageIndex',
            type: 'switch',
            value: true
          },
          {
            name: 'Show navigation buttons',
            id: 'navButtons',
            type: 'switch',
            value: true
          },
          {
            name: 'Show image resolution',
            note: 'Left is downscaled, right is original',
            id: 'infoResolution',
            type: 'switch',
            value: true
          },
          {
            name: 'Show image scale',
            note: 'Left value is % of original size, right is % downscaled',
            id: 'infoScale',
            type: 'switch',
            value: true
          },
          {
            name: 'Show image size',
            note: "Left is downscaled, right is original, ~ means they're the same",
            id: 'infoSize',
            type: 'switch',
            value: true
          }
        ]
      },
      {
        type: 'category',
        id: 'behavior',
        name: 'Behavior settings',
        collapsible: true,
        shown: false,
        settings: [
          {
            name: 'Use search API',
            note: "Without this, you'll only be able to view images currently cached in Discord.",
            id: 'searchAPI',
            type: 'switch',
            value: true
          },
          {
            name: 'Trigger search when hovering over navigation buttons when needed',
            id: 'hoverSearch',
            type: 'switch',
            value: false
          }
        ]
      }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { Utilities, WebpackModules, DiscordModules, ReactComponents, DiscordAPI, Logger, Patcher, PluginUtilities, PluginUpdater } = Api;
    const { React, ReactDOM, ModalStack, DiscordConstants, Dispatcher, GuildStore, GuildMemberStore, TextElement, MessageStore, APIModule, NavigationUtils } = DiscordModules;

    let PluginBrokenFatal = false;
    let overlayDOMNode;

    const { ARROW_LEFT, ARROW_RIGHT } = DiscordConstants.KeyboardKeys;
    const Icon = WebpackModules.getByDisplayName('Icon');
    const Clickable = WebpackModules.getByDisplayName('Clickable');

    const ImageUtils = Object.assign({}, WebpackModules.getByProps('getImageSrc'), WebpackModules.getByProps('getRatio'));

    const TrustedStore = WebpackModules.getByProps('isTrustedDomain');

    const ChannelMessages = (() => {
      try {
        const _channelMessages = WebpackModules.getByProps('_channelMessages')._channelMessages;
        if (!_channelMessages) throw '_channelMessages is undefined';
        return _channelMessages;
      } catch (e) {
        Logger.stacktrace('Failed to get _channelMessages! Plugin will not work!', e);
        PluginBrokenFatal = true;
        return {};
      }
    })();

    const getRatio = (width, height, minW = 400, minH = 300) => ImageUtils.getRatio(width, height, minW, minH);
    const getPlaceholder = (src, width, height, minW = 400, minH = 300) => ImageUtils.getImageSrc(src, width, height, getRatio(width, height, minW, minH), null);

    function extractImages(message) {
      const images = [];
      if (Array.isArray(message.attachments)) {
        message.attachments.forEach(({ filename, width, height, url: original, proxy_url: src }) => {
          if (!DiscordConstants.IMAGE_RE.test(filename) || (width <= 1 && height <= 1)) return;
          const max = ImageUtils.zoomFit(width, height);
          const placeholder = getPlaceholder(src, width, height, max.width, max.height);
          images.push({ width, height, src, original, placeholder });
        });
      }
      if (Array.isArray(message.embeds)) {
        message.embeds.forEach(({ image }) => {
          if (!image) return;
          const { width, height, url: original, proxyURL: src } = image;
          if (!src || (width <= 1 && height <= 1)) return;
          const max = ImageUtils.zoomFit(width, height);
          const placeholder = getPlaceholder(src, width, height, max.width, max.height);
          images.push({ width, height, original, src, placeholder });
        });
      }
      return images;
    }

    class LazyImage extends (() => {
      const LazyImage = WebpackModules.getByDisplayName('LazyImage');
      if (LazyImage) return LazyImage;
      Logger.error('Failed to get LazyImage! Plugin will not work!');
      PluginBrokenFatal = true;
      return class error {};
    })() {
      componentDidUpdate(props) {
        this._cancellers.forEach(e => e());
        this._cancellers.clear();
        super.componentDidUpdate(props);
        if (this.__BIV_updating) return;
        this.__BIV_updating = true;
        const max = ImageUtils.zoomFit(this.props.width, this.props.height);
        const src = getPlaceholder(this.props.src, this.props.width, this.props.height, max.width, max.height);
        const isLoaded = ImageUtils.isImageLoaded(src);
        if (!isLoaded) {
          if (this.state.readyState !== 'LOADING') this.setState({ readyState: 'LOADING' });
          this.loadImage(this.getSrc(this.getRatio(), false), this.handleImageLoad);
        } else if (this.state.readyState !== 'READY') {
          this.setState({ readyState: 'READY' });
        }
        this.__BIV_updating = false;
      }
      render() {
        const ret = super.render();
        if (!ret) {
          Logger.warn('LazyImage render returned null!', new Error()); /* should not occur */
          return ret;
        }
        ret.props.children = e =>
          React.createElement('img', {
            className: e.className || undefined,
            alt: e.alt,
            src: e.src,
            style: e.size,
            key: this.props.id /* force React to create a new element for a smooth transition */
          });
        return ret;
      }
    }
    const MessageRecordUtils = WebpackModules.getByProps('createMessageRecord');
    const Tooltip = WebpackModules.getByDisplayName('Tooltip');

    const SearchCache = {};
    const OldSearchCache = {};
    const ForwardSearchCache = {};
    const OldForwardSearchCache = {};

    function stripDeletedMessage(channelId, messageId) {
      for (const cache of [SearchCache, OldSearchCache, ForwardSearchCache, OldForwardSearchCache]) {
        const chc = cache[channelId];
        if (!Array.isArray(chc)) continue;
        const idx = chc.findIndex(e => e.id === messageId);
        if (idx === -1) continue;
        chc.splice(idx, 1);
      }
    }
    function stripPurgedMessages(channelId, messageIds) {
      for (const cache of [SearchCache, OldSearchCache, ForwardSearchCache, OldForwardSearchCache]) {
        const chc = cache[channelId];
        if (!Array.isArray(chc)) continue;
        for (const messageId of messageIds) {
          const idx = chc.findIndex(e => e.id === messageId);
          if (idx === -1) continue;
          chc.splice(idx, 1);
        }
      }
    }
    class ErrorCatcher extends React.PureComponent {
      constructor(props) {
        super(props);
        this.state = { errorLevel: 0 };
      }
      componentDidCatch(err, inf) {
        Logger.err(`Error in ${this.props.label}, screenshot or copy paste the error above to Lighty for help.`);
        this.setState({ errorLevel: this.state.errorLevel + 1 });
        if (typeof this.props.onError === 'function') this.props.onError(err, this.state.errorLevel);
      }
      render() {
        if (!this.state.errorLevel) return this.props.children;
        if (Array.isArray(this.props.fallback) && this.props.fallback[this.state.errorLevel - 1]) return this.props.fallback[this.state.errorLevel - 1];
        return null;
      }
    }

    const MessageTimestamp = (() => {
      try {
        const MessageTimestamp = WebpackModules.getByProps('MessageTimestamp').MessageTimestamp;
        if (!MessageTimestamp) throw 'MessageTimestamp is undefined';
        return MessageTimestamp;
      } catch (e) {
        Logger.stacktrace('Failed to get MessageTimestamp! Plugin will not work', e);
        PluginBrokenFatal = true;
        return () => {};
      }
    })();

    const TimingModule = WebpackModules.getByProps('DelayedCall');
    const APIEncodeModule = WebpackModules.getByProps('stringify');
    const ImageModal = WebpackModules.getByDisplayName('ImageModal');
    const ImageProps = ['height', 'width', 'original', 'placeholder', 'src'];
    const ClickableHeaderClassname = XenoLib.getClass('username clickableHeader');
    const UsernameClassname = XenoLib.getClass('botTag username');

    class RichImageModal extends (() => {
      if (ImageModal) return ImageModal;
      Logger.error('ImageModal is undefined! Plugin will not work!');
      PluginBrokenFatal = true;
      return class error {};
    })() {
      constructor(props) {
        super(props);
        this.state = {
          src: props.src,
          original: props.original,
          width: props.width,
          height: props.height,
          __BIV_data: props.__BIV_data,
          __BIV_index: props.__BIV_index,
          requesting: false,
          indexing: false,
          internalError: false,
          rateLimited: false,
          localRateLimited: 0,
          needsSearch: false,
          isNearingEdge: false,
          controlsHovered: false,
          unknownError: false,
          controlsHidden: false,
          imageSize: null,
          originalImageSize: null,
          basicImageInfo: null
        };
        XenoLib._.bindAll(this, ['handleMessageCreate', 'handleMessageDelete', 'handlePurge', 'handleKeyDown', 'handlePrevious', 'handleNext', 'handleMouseEnter', 'handleMouseLeave', 'handleFastJump']);
        if (props.__BIV_index === -1) {
          this.state.internalError = true;
          return;
        }
        const filtered = this.filterMessages(true);
        if (filtered.findIndex(m => m.id === this.state.__BIV_data.messageId) === -1) {
          this.state.internalError = true;
          return;
        }
        this._lastSearch = 0;
        this._cancellers = new Set();
        this._cachedMessages = [props.__BIV_data.messageId];
        this._preloading = new Set();
        if (SearchCache[DiscordAPI.currentChannel.id]) {
          OldSearchCache[DiscordAPI.currentChannel.id] = [...SearchCache[DiscordAPI.currentChannel.id]];
          if (SearchCache[DiscordAPI.currentChannel.id].noBefore) OldSearchCache[DiscordAPI.currentChannel.id].noBefore = SearchCache[DiscordAPI.currentChannel.id].noBefore;
          if (SearchCache[DiscordAPI.currentChannel.id]._totalResults) OldSearchCache[DiscordAPI.currentChannel.id]._totalResults = SearchCache[DiscordAPI.currentChannel.id]._totalResults;
        }
        const cache = SearchCache[DiscordAPI.currentChannel.id];
        if (cache && filtered[0]) {
          const idx = cache.findIndex(e => e.id === filtered[0].id);
          /* better cache utilization */
          if (idx !== -1) {
            this._searchCache = cache.slice(0, idx + 1);
            if (cache.noBefore) this._searchCache.noBefore = cache.noBefore;
            if (cache._totalResults) this._searchCache._totalResults = cache._totalResults;
            SearchCache[DiscordAPI.currentChannel.id] = this._searchCache;
          }
        }
        if (!this._searchCache) this._searchCache = SearchCache[DiscordAPI.currentChannel.id] = [];
        if (!this._searchCache._totalResults) this._searchCache._totalResults = 0;
        if (!ChannelMessages[DiscordAPI.currentChannel.id].hasMoreBefore) this._searchCache.noBefore = true;
        if (ForwardSearchCache[DiscordAPI.currentChannel.id]) OldForwardSearchCache[DiscordAPI.currentChannel.id] = [...ForwardSearchCache[DiscordAPI.currentChannel.id]];
        if (ChannelMessages[DiscordAPI.currentChannel.id].hasMoreAfter && !ChannelMessages[DiscordAPI.currentChannel.id]._after._wasAtEdge) {
          filtered.reverse();
          const cache = ForwardSearchCache[DiscordAPI.currentChannel.id];
          if (cache && filtered[0]) {
            const idx = cache.findIndex(e => e.id === filtered[0].id);
            /* god I hope I did this right */
            if (idx !== -1) {
              this._forwardSearchCache = cache.slice(idx);
              ForwardSearchCache[DiscordAPI.currentChannel.id] = this._forwardSearchCache;
            }
          }
        }
        if (!this._forwardSearchCache) this._forwardSearchCache = ForwardSearchCache[DiscordAPI.currentChannel.id] = [];
        this._followNew = ChannelMessages[DiscordAPI.currentChannel.id]._after._wasAtEdge;
        this._imageCounter = {};
        this._oFM = [];
        this.calculateImageNumNMax();
      }
      componentDidMount() {
        if (super.componentDidMount) super.componentDidMount();
        if (this.state.internalError) return;
        window.addEventListener('keydown', this.handleKeyDown);
        Dispatcher.subscribe('MESSAGE_CREATE', this.handleMessageCreate);
        Dispatcher.subscribe('MESSAGE_DELETE', this.handleMessageDelete);
        Dispatcher.subscribe('MESSAGE_DELETE_BULK', this.handlePurge);
        this.handlePreLoad();
      }
      componentWillUnmount() {
        if (super.componentWillUnmount) super.componentWillUnmount();
        if (this.state.internalError) return;
        window.removeEventListener('keydown', this.handleKeyDown);
        Dispatcher.unsubscribe('MESSAGE_CREATE', this.handleMessageCreate);
        Dispatcher.unsubscribe('MESSAGE_DELETE', this.handleMessageDelete);
        Dispatcher.unsubscribe('MESSAGE_DELETE_BULK', this.handlePurge);
        this._cancellers.forEach(e => e());
        this._cancellers.clear();
      }
      filterMessages(noCache) {
        const chan = ChannelMessages[DiscordAPI.currentChannel.id];
        const arr = [...((!noCache && this._searchCache) || []), ...chan._before._messages, ...chan._array, ...chan._after._messages, ...((!noCache && this._forwardSearchCache) || [])];
        return arr.filter((m, i) => arr.findIndex(a => a.id === m.id) === i && extractImages(m).length).sort((a, b) => a.timestamp.unix() - b.timestamp.unix());
      }
      getMessage(id) {
        return MessageStore.getMessage(DiscordAPI.currentChannel.id, id) || this.filterMessages().find(m => m.id === id);
      }
      calculateImageNumNMax() {
        const filtered = this.filterMessages();
        this._oFM = [...filtered];
        filtered.reverse();
        this._imageCounter = {};
        let imageCount = 1;
        filtered.forEach(message => {
          const images = extractImages(message);
          this._imageCounter[message.id] = imageCount;
          imageCount += images.length;
        });
        this._maxImages = imageCount - 1;
      }
      processCache(cache, lastId, reverse) {
        const OldChannelCache = cache[DiscordAPI.currentChannel.id];
        if (OldChannelCache && OldChannelCache.findIndex(m => m.id === lastId) !== -1) {
          const idx = OldChannelCache.findIndex(m => m.id === lastId);
          const images = reverse ? OldChannelCache.slice(idx) : OldChannelCache.slice(0, idx + 1);
          if (images.length > 2) {
            images.sort((a, b) => a.timestamp.unix() - b.timestamp.unix());
            if (reverse) {
              this._forwardSearchCache.push(...images);
            } else {
              this._searchCache.unshift(...images);
              if (OldChannelCache.noBefore) this._searchCache.noBefore = OldChannelCache.noBefore;
              if (OldChannelCache._totalResults) this._searchCache._totalResults = OldChannelCache._totalResults;
            }
            this.calculateImageNumNMax();
            this.forceUpdate();
            return true;
          }
        }
      }
      handleSearch(lastId, reverse) {
        if (!this.props.settings.behavior.searchAPI) return;
        if (reverse && !ChannelMessages[DiscordAPI.currentChannel.id].hasMoreAfter) return Logger.warn("Illegal operation, attempted to reverse search, but we're on newest image\n", new Error().stack);
        this.state.needsSearch = false;
        if ((this.state.requesting && !this.state.indexing) || (!reverse && this._searchCache.noBefore) || (reverse && this._followNew)) return;
        /* fully utilize both caches */
        if (this.processCache(OldForwardSearchCache, lastId, reverse)) return;
        if (this.processCache(OldSearchCache, lastId, reverse)) return;
        if (this.state.rateLimited) return;
        if (!this.state.indexing && Date.now() - this._lastSearch < 3500) {
          if (!this.state.localRateLimited) {
            this.state.localRateLimited = this.setState({
              localRateLimited: setTimeout(() => {
                this.state.localRateLimited = 0;
                this.handleSearch(lastId, reverse);
              }, 3500 - (Date.now() - this._lastSearch))
            });
            // Toasts.error('Slow down!');
          }
          return;
        }
        this._lastSearch = Date.now();
        APIModule.get({
          url: DiscordConstants.Endpoints.SEARCH_CHANNEL(DiscordAPI.currentChannel.id),
          query: APIEncodeModule.stringify({
            channel_id: DiscordAPI.currentChannel.id,
            has: 'image',
            include_nsfw: true,
            [reverse ? 'min_id' : 'max_id']: lastId
          })
        })
          .then(content => {
            if (content.status === 202) {
              this.setState({ indexing: true });
              setTimeout(() => this.handleSearch(lastId, reverse), content.body.retry_after || 5e3);
              return;
            } else if (content.status === 429) {
              this.setState({ rateLimited: content.body.retry_after || 5e3 });
              setTimeout(() => {
                this.setState({ rateLimited: false });
                this.handleSearch(lastId, reverse);
              }, content.body.retry_after || 5e3);
              return;
            } else if (content.status >= 400) {
              throw `Status ${content.status}`;
            }
            if (content.body.total_results <= 25) {
              if (reverse) this._followNew = true;
              else this._searchCache.noBefore = true;
            }
            const filtered = this.filterMessages();
            const images = [reverse ? filtered[filtered.length - 1] : filtered[0]];
            content.body.messages.forEach(group => {
              group.forEach(message => {
                if (images.findIndex(e => e.id === message.id) !== -1) return;
                const iMessage = MessageRecordUtils.createMessageRecord(message);
                if (!extractImages(iMessage).length) return;
                images.push(iMessage);
              });
            });
            images.sort((a, b) => a.timestamp.unix() - b.timestamp.unix());
            if (reverse) {
              this._forwardSearchCache.push(...images);
            } else {
              if (this._searchCache.noBefore) this._searchCache._totalResults = 0;
              else this._searchCache._totalResults = content.body.total_results - 25;
              this._searchCache.unshift(...images);
            }
            this.calculateImageNumNMax();
            this.setState({ requesting: false, indexing: false });
          })
          .catch(err => (Logger.stacktrace('There has been an issue searching', err), this.setState({ unknownError: true, indexing: false }), setTimeout(() => this.setState({ requesting: false }), 1000)));
        this.setState({ requesting: true, unknownError: false });
      }
      handleMessageCreate({ optimistic, channelId, message }) {
        if (optimistic || channelId !== DiscordAPI.currentChannel.id || !extractImages(message).length) return;
        if (this._followNew) this._forwardSearchCache.push(MessageRecordUtils.createMessageRecord(message));
        this.calculateImageNumNMax();
        this.forceUpdate();
      }
      handleMessageDeletes() {
        /* While for people that have loggers, which preserve deleted and purged messages,
           this is a non issue as the image stays. However for everyone else, if the image
           we are currently displaying is deleted, we will get lost and be unable to tell what
           image is before and after the current image. So force the user to go to a non
           deleted image, if that fails, force close we don't want to cause bugs like that,
           also it might trip internalError if we don't iirc which will hide everything the
           plugin adds, that's a big nono.
         */
        if (this.handleStart(true, true) && this.handleEnd(true, true)) {
          this.props.onClose(); /* we are trapped on an image that does not exist, give up */
          return XenoLib.Notifications.warning('[**BetterImageViewer**] All visible images were deleted, forcefully closed to avoid issues.', { timeout: 0 }); /* tell the user about the sudden closure, ps toasts suck for this */
        }
        this.calculateImageNumNMax();
        this.forceUpdate();
      }
      handleMessageDelete(e) {
        const { channelId, id: messageId } = e;
        if (e['__\x4e\x4f\x552Prevent\x46\x41\x47\x47\x4f\x54']) return;
        stripDeletedMessage(channelId, messageId);
        if (messageId !== this.state.__BIV_data.messageId) return;
        this.handleMessageDeletes();
      }
      handlePurge(e) {
        const { channelId, ids: messageIds } = e;
        if (e['__\x4e\x4f\x552Prevent\x46\x41\x47\x47\x4f\x54']) return;
        stripPurgedMessages(channelId, messageIds);
        if (channelId !== DiscordAPI.currentChannel.id || messageIds.indexOf(this.state.__BIV_data.messageId) === -1) return;
        for (const messageId of messageIds) {
          if (messageId === this.state.__BIV_data.messageId) continue;
          const idx = this._oFM.findIndex(e => e.id === messageId);
          if (idx === -1) continue;
          this._oFM.splice(idx, 1);
        }
        this.handleMessageDeletes();
      }
      handleMouseEnter(next) {
        this.state.controlsHovered = true;
        if (!this.state.needsSearch || (this.state.needsSearch === -1 && !next) || !this.props.settings.behavior.hoverSearch) return;
        const filtered = this.filterMessages();
        this.handleSearch(next ? filtered[filtered.length - 1].id : filtered[0].id, next);
      }
      handleMouseLeave() {
        this.state.controlsHovered = false;
      }
      handlePreLoad(keyboardMode, next, subsidiaryMessageId) {
        const filtered = this.filterMessages();
        const targetIdx = filtered.findIndex(m => m.id === (subsidiaryMessageId ? subsidiaryMessageId : this.state.__BIV_data.messageId));
        if (targetIdx === -1) Logger.warn('Unknown message\n', new Error());
        const isNearingEdge = next ? filtered.length - (targetIdx + 1) < 5 : targetIdx + 1 < 5;
        this.setState({ isNearingEdge });
        if (keyboardMode === -1 || isNearingEdge) {
          if (keyboardMode || this._maxImages < 2 || this.state.controlsHovered) {
            if (!next || (next && ChannelMessages[DiscordAPI.currentChannel.id].hasMoreAfter)) this.handleSearch(next ? filtered[filtered.length - 1].id : filtered[0].id, next);
          } else {
            this.state.needsSearch = next ? -1 : 1;
          }
        }
        if (targetIdx === -1) return this.setState({ internalError: true });
        const handleMessage = message => {
          if (this._cachedMessages.indexOf(message.id) !== -1 || this._preloading.has(message.id)) return;
          const data = extractImages(message);
          data.forEach(image => {
            const max = ImageUtils.zoomFit(image.width, image.height);
            const src = getPlaceholder(image.src, image.width, image.height, max.width, max.height);
            if (ImageUtils.isImageLoaded(src)) {
              this._cachedMessages.push(message.id);
              return;
            }
            const cancel = ImageUtils.loadImage(src, (e, r) => {
              if (cancel) this._cancellers.delete(cancel);
              this._cachedMessages.push(message.id);
              this._preloading.delete(message.id);
            });
            if (cancel) this._cancellers.add(cancel);
            this._preloading.add(message.id);
          });
        };
        filtered.slice(Math.max(targetIdx - 5, 0), Math.max(targetIdx, 0)).forEach(handleMessage);
        filtered.slice(Math.min(targetIdx + 1, filtered.length), Math.min(targetIdx + 5, filtered.length)).forEach(handleMessage);
      }
      handleKeyDown(e) {
        if (this.state.internalError) return;
        switch (e.which) {
          case ARROW_LEFT:
          case ARROW_RIGHT:
            e.preventDefault();
            this.state.controlsInactive = true;
            this.handleChangeImage(e.which === ARROW_RIGHT, true);
        }
      }
      handleEnd(keyboardMode, useInternal) {
        const filtered = useInternal ? this._oFM : this.filterMessages();
        const previousMessage = filtered.find((e, i) => filtered[i - 1] && filtered[i - 1].id === this.state.__BIV_data.messageId);
        if (!previousMessage) return true;
        const newData = {
          images: extractImages(previousMessage),
          messageId: previousMessage.id
        };
        this.setState({
          __BIV_data: newData,
          __BIV_index: 0,
          ...newData.images[0]
        });
        this.requestImageInfo(newData.images[0]);
        this.handlePreLoad(keyboardMode, true, previousMessage.id);
      }
      handleStart(keyboardMode, useInternal) {
        const filtered = useInternal ? this._oFM : this.filterMessages();
        const previousMessage = filtered.find((e, i) => filtered[i + 1] && filtered[i + 1].id === this.state.__BIV_data.messageId);
        if (!previousMessage) return true;
        const newData = {
          images: extractImages(previousMessage),
          messageId: previousMessage.id
        };
        this.setState({
          __BIV_data: newData,
          __BIV_index: newData.images.length - 1,
          ...newData.images[newData.images.length - 1]
        });
        this.requestImageInfo(newData.images[newData.images.length - 1]);
        this.handlePreLoad(keyboardMode, false, previousMessage.id);
      }
      handleChangeImage(next, keyboardMode) {
        if (next) {
          if (this.state.__BIV_index === this.state.__BIV_data.images.length - 1) return this.handleEnd(keyboardMode);
          this.state.__BIV_index++;
        } else {
          if (!this.state.__BIV_index) return this.handleStart(keyboardMode);
          this.state.__BIV_index--;
        }
        this.handlePreLoad(keyboardMode, next);
        this.setState(this.state.__BIV_data.images[this.state.__BIV_index]);
        this.requestImageInfo(this.state.__BIV_data.images[this.state.__BIV_index]);
      }
      handlePrevious() {
        this.handleChangeImage();
      }
      handleNext() {
        this.handleChangeImage(true);
      }
      handleFastJump(next) {
        const filtered = this.filterMessages();
        const iMessage = next ? filtered[filtered.length - 1] : filtered[0];
        const newData = {
          images: extractImages(iMessage),
          messageId: iMessage.id
        };
        this.setState({
          __BIV_data: newData,
          __BIV_index: newData.images.length - 1,
          ...newData.images[newData.images.length - 1]
        });
        this.requestImageInfo(newData.images[newData.images.length - 1]);
        this.handlePreLoad(-1, next);
      }
      render() {
        for (const prop of ImageProps) this.props[prop] = this.state[prop];
        const message = this.state.__BIV_data && this.getMessage(this.state.__BIV_data.messageId);
        const ret = super.render();
        if (!message || this.state.internalError) return ret;
        const currentImage = this._imageCounter[this.state.__BIV_data.messageId] + (this.state.__BIV_data.images.length - 1 - this.state.__BIV_index);
        ret.props.children[0].type = LazyImage;
        ret.props.children[0].props.id = message.id + currentImage;
        const iMember = DiscordAPI.currentGuild && GuildMemberStore.getMember(DiscordAPI.currentGuild.id, message.author.id);
        ret.props.children.push(
          ReactDOM.createPortal(
            [
              this.props.settings.ui.navButtons
                ? [
                    React.createElement(
                      Clickable,
                      {
                        className: XenoLib.joinClassNames('BIV-left', { 'BIV-disabled': currentImage === this._maxImages && (this._searchCache.noBefore || this.state.rateLimited), 'BIV-inactive': this.state.controlsInactive, 'BIV-hidden': !this.state.controlsHidden }),
                        onClick: this.handlePrevious,
                        onContextMenu: () => this.handleFastJump(),
                        onMouseEnter: () => this.handleMouseEnter(),
                        onMouseLeave: this.handleMouseLeave
                      },
                      React.createElement(Icon, { name: 'LeftCaret' })
                    ),
                    React.createElement(
                      Clickable,
                      {
                        className: XenoLib.joinClassNames('BIV-right', { 'BIV-disabled': currentImage === 1, 'BIV-inactive': this.state.controlsInactive, 'BIV-hidden': !this.state.controlsHidden }),
                        onClick: this.handleNext,
                        onContextMenu: () => this.handleFastJump(true),
                        onMouseEnter: () => this.handleMouseEnter(true),
                        onMouseLeave: this.handleMouseLeave
                      },
                      React.createElement(Icon, { name: 'RightCaret' })
                    )
                  ]
                : null,
              React.createElement(
                'div',
                {
                  className: XenoLib.joinClassNames('BIV-info', { 'BIV-inactive': this.state.controlsInactive, 'BIV-hidden': !this.state.controlsHidden })
                },
                this.props.settings.ui.imageIndex
                  ? React.createElement(
                      TextElement.default,
                      {
                        color: TextElement.Colors.PRIMARY,
                        weight: TextElement.Weights.SEMIBOLD
                      },
                      'Image ',
                      currentImage,
                      ' of ',
                      this._maxImages,
                      this._searchCache._totalResults
                        ? React.createElement(
                            Tooltip,
                            {
                              text: `Estimated ${this._maxImages + this._searchCache._totalResults} images in current channel`,
                              position: 'top'
                            },
                            e => React.createElement('span', e, ' (~', this._maxImages + this._searchCache._totalResults, ')')
                          )
                        : undefined
                    )
                  : null,
                React.createElement(
                  'div',
                  {
                    className: 'BIV-info-wrapper'
                  },
                  React.createElement(
                    TextElement.default,
                    {
                      color: TextElement.Colors.PRIMARY,
                      className: ClickableHeaderClassname
                    },
                    React.createElement(
                      'span',
                      {
                        className: UsernameClassname,
                        onContextMenu: e => {
                          WebpackModules.getByProps('openUserContextMenu').openUserContextMenu(e, message.author, DiscordAPI.currentChannel.discordObject);
                        },
                        style:
                          iMember && iMember.colorString
                            ? {
                                color: iMember.colorString
                              }
                            : null,
                        onClick: () => {
                          this.props.onClose();
                          NavigationUtils.transitionTo(`/channels/${(DiscordAPI.currentGuild && DiscordAPI.currentGuild.id) || '@me'}/${DiscordAPI.currentChannel.id}${message.id ? '/' + message.id : ''}`);
                        }
                      },
                      (iMember && iMember.nick) || message.author.username
                    ),
                    React.createElement(MessageTimestamp, {
                      timestamp: DiscordModules.Moment(message.timestamp)
                    }),
                    this._searchCache.noBefore &&
                      React.createElement(
                        'div',
                        {
                          className: XenoLib.joinClassNames('BIV-requesting', TextElement.Colors.RED)
                        },
                        React.createElement(
                          Tooltip,
                          {
                            text: 'You have reached the start of the channel'
                          },
                          e =>
                            React.createElement(Icon, {
                              ...e,
                              name: 'LeftCaret'
                            })
                        )
                      ),
                    this.state.isNearingEdge &&
                      !this.props.settings.behavior.searchAPI &&
                      React.createElement(
                        'div',
                        {
                          className: XenoLib.joinClassNames('BIV-requesting', TextElement.Colors.YELLOW)
                        },
                        React.createElement(
                          Tooltip,
                          {
                            text: 'You are nearing the edge of available images. If you want more, enable search API.'
                          },
                          e =>
                            React.createElement(Icon, {
                              ...e,
                              name: 'WarningTriangle'
                            })
                        )
                      ),
                    this.state.requesting &&
                      !this.state.unknownError &&
                      React.createElement(
                        'div',
                        {
                          className: 'BIV-requesting'
                        },
                        React.createElement(
                          Tooltip,
                          {
                            text: 'Requesting more...'
                          },
                          e =>
                            React.createElement(Icon, {
                              ...e,
                              name: 'UpdateAvailable'
                            })
                        )
                      ),
                    this.state.indexing &&
                      React.createElement(
                        'div',
                        {
                          className: 'BIV-requesting'
                        },
                        React.createElement(
                          Tooltip,
                          {
                            text: 'Indexing channel...'
                          },
                          e =>
                            React.createElement(Icon, {
                              ...e,
                              name: 'Nova_Search'
                            })
                        )
                      ),
                    this.state.localRateLimited || this.state.rateLimited
                      ? React.createElement(
                          'div',
                          {
                            className: XenoLib.joinClassNames('BIV-requesting', TextElement.Colors.RED)
                          },
                          React.createElement(
                            Tooltip,
                            {
                              text: 'You have been rate limited, please wait'
                            },
                            e =>
                              React.createElement(Icon, {
                                ...e,
                                name: 'Timer'
                              })
                          )
                        )
                      : undefined,
                    this._followNew &&
                      React.createElement(
                        'div',
                        {
                          className: XenoLib.joinClassNames('BIV-requesting', TextElement.Colors.RED)
                        },
                        React.createElement(
                          Tooltip,
                          {
                            text: 'You have reached the end of the channel and are listening for new images'
                          },
                          e =>
                            React.createElement(Icon, {
                              ...e,
                              name: 'RightCaret'
                            })
                        )
                      ),
                    this.state.unknownError &&
                      React.createElement(
                        'div',
                        {
                          className: XenoLib.joinClassNames('BIV-requesting', TextElement.Colors.RED)
                        },
                        React.createElement(
                          Tooltip,
                          {
                            text: 'Unknown error occured'
                          },
                          e =>
                            React.createElement(Icon, {
                              ...e,
                              name: 'Clear'
                            })
                        )
                      )
                  )
                )
              )
            ],
            overlayDOMNode
          )
        );
        return ret;
      }
    }

    return class BetterImageViewer extends Plugin {
      constructor() {
        super();
        XenoLib.changeName(__filename, this.name);
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
      }
      onStart() {
        if (!overlayDOMNode) {
          overlayDOMNode = document.createElement('div');
          overlayDOMNode.className = 'biv-overlay';
        }
        document.querySelector('#app-mount').append(overlayDOMNode);
        this.promises = { state: { cancelled: false } };
        if (PluginBrokenFatal) {
          PluginUpdater.checkForUpdate(this.name, this.version, this._config.info.github_raw);
          return XenoLib.Notifications.error(`[**${this.name}**] Plugin is in a broken state. Please update it, or ${GuildStore.getGuild(XenoLib.supportServerId) ? 'go to <#639665366380838924>' : '[join my support server](https://discord.gg/NYvWdN5)'} for further assistance.`, { timeout: 0 });
        }
        this.patchAll();
        Dispatcher.subscribe('MESSAGE_DELETE', this.handleMessageDelete);
        Dispatcher.subscribe('MESSAGE_DELETE_BULK', this.handlePurge);
        PluginUtilities.addStyle(
          this.short + '-CSS',
          `
          .BIV-left, .BIV-right {
            position: absolute;
            top: 90px;
            bottom: 90px;
            width: 90px;
            background-color: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
            transition: all .25s ease-in-out;
            color: gray;
          }

          .BIV-disabled {
            color: #4d4d4d;
          }

          .BIV-left.BIV-inactive, .BIV-right.BIV-inactive {
            opacity: 0;
          }

          .BIV-info.BIV-inactive {
            opacity: 0.65;
          }

          .BIV-left:not(.BIV-disabled):hover, .BIV-right:not(.BIV-disabled):hover {
            background-color: hsla(0, 0%, 49%, 0.2);
            color: white;
          }
        .BIV-left {
            left: 0;
        }
        .BIV-right {
            right: 0;
        }
        .BIV-left > svg, .BIV-right > svg {
            width: 30px;
            height: 30px;
        }
        .BIV-info {
            position: absolute;
            left: 18px;
            bottom: 12px;
            height: 42px;
            transition: opacity .35s ease-in-out;
        }
        .BIV-info-extra {
          left: unset;
          right: 12px;
          height: unset;
        }
        .BIV-info-extra > table {
          width: 200px;
        }
        .BIV-info-extra tr > td:nth-child(2) {
          text-align: end;
        }
        .BIV-info-wrapper {
            bottom: 0;
            position: absolute;
            white-space: nowrap;
        }
        .BIV-info-wrapper > .${TextElement.Colors.PRIMARY} {
          display: flex;
          align-items: center;
        }
        .BIV-requesting {
          display: flex;
          margin-left: 5px;
        }
        .BIV-requesting > svg[name="Nova_Search"], .BIV-requesting > svg[name="LeftCaret"], .BIV-requesting > svg[name="RightCaret"] {
          width: 16px;
          height: 16px;
        }

        .BIV-inactive {
          transition: opacity 1s ease-in-out;
        }

        .BIV-hidden {
          opacity: 0;
        }

        .BIV-info-wrapper .${UsernameClassname.split(' ')[0]} {
          max-width: 900px;
          overflow-x: hidden;
        }
        .biv-overlay {
          pointer-events: none;
          position: absolute;
          z-index: 1000;
          width: 100%;
          height: 100%;
        }
        .biv-overlay > * {
          pointer-events: all;
        }
        `
        );
      }

      onStop() {
        if (overlayDOMNode) overlayDOMNode.remove();
        this.promises.state.cancelled = true;
        Patcher.unpatchAll();
        Dispatcher.unsubscribe('MESSAGE_DELETE', this.handleMessageDelete);
        Dispatcher.unsubscribe('MESSAGE_DELETE_BULK', this.handlePurge);
        PluginUtilities.removeStyle(this.short + '-CSS');
      }

      /* zlib uses reference to defaultSettings instead of a cloned object, which sets settings as default settings, messing everything up */
      loadSettings(defaultSettings) {
        return PluginUtilities.loadSettings(this.name, Utilities.deepclone(this.defaultSettings ? this.defaultSettings : defaultSettings));
      }

      handleMessageDelete(e) {
        const { channelId, id: messageId } = e;
        if (e['__\x4e\x4f\x552Prevent\x46\x41\x47\x47\x4f\x54']) return;
        stripDeletedMessage(channelId, messageId);
      }
      handlePurge(e) {
        const { channelId, ids: messageIds } = e;
        if (e['__\x4e\x4f\x552Prevent\x46\x41\x47\x47\x4f\x54']) return;
        stripPurgedMessages(channelId, messageIds);
      }

      /* PATCHES */

      patchAll() {
        Utilities.suppressErrors(this.patchImageModal.bind(this), 'ImageModal patch')(this.promises.state);
        Utilities.suppressErrors(this.patchMessageAccessories.bind(this), 'MessageAccessories patch')(this.promises.state);
        this.patchLazyImageZoomable();
      }

      patchLazyImageZoomable() {
        Patcher.before(WebpackModules.getByDisplayName('LazyImageZoomable').prototype, 'render', (_this, _, ret) => {
          if (!_this.onZoom.__BIV_patched) {
            _this.onZoom = (e, n) => {
              e.preventDefault();
              if (e.currentTarget instanceof HTMLElement) e.currentTarget.blur();
              const original = _this.props.original || _this.props.src;
              ModalStack.push(e => {
                return React.createElement(
                  /* this safety net should prevent any major issues or crashes, in theory */
                  ErrorCatcher,
                  {
                    label: 'Image modal',
                    onError: (_, level) => {
                      if (level < 2) XenoLib.Notifications.error(`[${this.name}] Internal error, options will not show. If you repeatedly see this, join my support server, open up console (CTRL + SHIFT + I > click console) and screenshot any errors.`, { timeout: 0 });
                      if (level > 1) e.onClose();
                    },
                    fallback: [
                      React.createElement(
                        ImageModal,
                        Object.assign(
                          {
                            original,
                            src: _this.props.src,
                            width: _this.props.width,
                            height: _this.props.height,
                            animated: _this.props.animated,
                            children: _this.props.children,
                            placeholder: n.placeholder,
                            isTrusted: TrustedStore.isTrustedDomain(original),
                            onClickUntrusted: _this.onClickUntrusted
                          },
                          e
                        )
                      )
                    ]
                  },
                  React.createElement(
                    RichImageModal,
                    Object.assign(
                      {
                        original,
                        src: _this.props.src,
                        width: _this.props.width,
                        height: _this.props.height,
                        animated: _this.props.animated,
                        children: _this.props.children,
                        placeholder: n.placeholder,
                        isTrusted: TrustedStore.isTrustedDomain(original),
                        onClickUntrusted: _this.onClickUntrusted,
                        __BIV_data: _this.props.__BIV_data,
                        __BIV_index: _this.props.__BIV_data ? _this.props.__BIV_data.images.findIndex(m => m.src === _this.props.src) : -1,
                        settings: this.settings
                      },
                      e
                    )
                  )
                );
              });
            };
            _this.onZoom.__BIV_patched = true;
          }
        });
      }

      async patchMessageAccessories(promiseState) {
        const MessageAccessories = await ReactComponents.getComponentByName('MessageAccessories', `.${XenoLib.getSingleClass('embedWrapper container')}`);
        if (promiseState.cancelled) return;
        Patcher.before(MessageAccessories.component.prototype, 'render', _this => {
          _this.__BIV_data = {
            images: extractImages(_this.props.message),
            messageId: _this.props.message.id
          };
        });
        Patcher.before(MessageAccessories.component.prototype, 'renderEmbeds', _this => {
          if (!_this.renderEmbed.__BIV_patched) {
            const oRenderEmbed = _this.renderEmbed;
            _this.renderEmbed = (e, n) => {
              const oRenderImageComponent = n.renderImageComponent;
              n.renderImageComponent = a => {
                a.__BIV_data = _this.__BIV_data;
                return oRenderImageComponent(a);
              };
              return oRenderEmbed(e, n);
            };
            _this.renderEmbed.__BIV_patched = true;
          }
        });
        Patcher.after(MessageAccessories.component.prototype, 'renderAttachments', (_this, _, ret) => {
          if (!ret) return;
          ret.forEach(attachment => {
            const props = Utilities.getNestedProp(attachment, 'props.children.props');
            if (!props) return;
            const oRenderImageComponent = props.renderImageComponent;
            props.renderImageComponent = e => {
              e.__BIV_data = _this.__BIV_data;
              return oRenderImageComponent(e);
            };
          });
        });
        MessageAccessories.forceUpdateAll();
      }

      patchImageModal(promiseState) {
        /*  shared code
            these patches are for displaying image info
            but the same code is shared with RichImageModal
         */
        Patcher.after(ImageModal.prototype, 'handleMouseMove', _this => {
          if (_this.state.controlsInactive) {
            _this.setState({ controlsInactive: false });
          }
          if (_this.state.controlsHovered) _this._controlsInactiveDelayedCall.cancel();
          else _this._controlsInactiveDelayedCall.delay();
        });
        /* https://stackoverflow.com/questions/10420352/ */
        function humanFileSize(bytes, si) {
          const thresh = si ? 1000 : 1024;
          if (Math.abs(bytes) < thresh) return `${bytes}} B`;
          const units = si ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
          let u = -1;
          do {
            bytes /= thresh;
            ++u;
          } while (Math.abs(bytes) >= thresh && u < units.length - 1);
          return `${bytes.toFixed(1)} ${units[u]}`;
        }
        Patcher.after(ImageModal.prototype, 'requestImageInfo', (_this, [props, equalRatio]) => {
          const src = (props && props.src) || _this.props.src;
          const width = (props && props.width) || _this.props.width;
          const height = (props && props.height) || _this.props.height;
          const reqUrl = (() => {
            const split = src.split('?')[0];
            const SaveToRedux = BdApi.getPlugin('SaveToRedux');
            if (SaveToRedux) return SaveToRedux.formatURL(split, src.substr(src.indexOf('?')).indexOf('size=') !== -1, '', '', (props && props.original) || _this.props.original).url;
            return split;
          })();
          const max = ImageUtils.zoomFit(width, height);
          const ratio = getRatio(width, height, max.width, max.height);
          const aa = ImageUtils.getImageSrc(src, width, height, ratio);
          _this._headerRequest2 = RequestModule.head(aa, (err, res) => {
            if (err || res.statusCode >= 400) return _this.setState({ imageSize: -1 });
            _this.setState({ imageSize: humanFileSize(res.headers['content-length']) });
            if (equalRatio) _this.setState({ originalImageSize: humanFileSize(res.headers['content-length']) });
          });
          if (!equalRatio) {
            _this._headerRequest1 = RequestModule.head(reqUrl, (err, res) => {
              if (err || res.statusCode >= 400) return _this.setState({ originalImageSize: -1 });
              _this.setState({ originalImageSize: humanFileSize(res.headers['content-length']) });
            });
          }
        });
        const RequestModule = require('request');
        Patcher.after(ImageModal.prototype, 'componentDidMount', _this => {
          if (!_this.state || _this.state.internalError) return;
          const requestImageInfo = XenoLib._.debounce(_this.requestImageInfo.bind(_this), 750, { leading: true });
          _this.requestImageInfo = props => {
            const settings = this.settings.ui;
            if (!settings.infoResolution && settings.infoScale && settings.infoSize) return;
            const width = (props && props.width) || _this.props.width;
            const height = (props && props.height) || _this.props.height;
            const max = ImageUtils.zoomFit(width, height);
            const scaledRatio = getRatio(width, height, max.width, max.height) * window.devicePixelRatio;
            const finalRatio = scaledRatio < 1 ? scaledRatio : 1;
            if (settings.infoResolution || settings.infoScale) {
              _this.setState({
                basicImageInfo: {
                  width: Math.ceil(width * finalRatio),
                  height: Math.ceil(height * finalRatio),
                  ratio: finalRatio
                },
                imageSize: null,
                originalImageSize: null
              });
            } else _this.setState({ imageSize: null, originalImageSize: null });
            if (_this._headerRequest1) _this._headerRequest1.abort();
            if (_this._headerRequest2) _this._headerRequest2.abort();
            if (settings.infoSize) requestImageInfo(props, finalRatio === 1);
          };
          _this.requestImageInfo();
          _this._controlsHiddenTimeout = new TimingModule.Timeout();
          _this._controlsHiddenTimeout.start(300, () => _this.setState({ controlsHidden: true }));
          _this._controlsInactiveDelayedCall = new TimingModule.DelayedCall(3500, () => _this.setState({ controlsInactive: true }));
          _this._controlsInactiveDelayedCall.delay();
          _this.handleMouseMove = XenoLib._.throttle(_this.handleMouseMove.bind(_this), 500);
          window.addEventListener('mousemove', _this.handleMouseMove);
        });
        Patcher.after(ImageModal.prototype, 'componentWillUnmount', _this => {
          if (!_this.state || _this.state.internalError) return;
          if (_this._headerRequest1) _this._headerRequest1.abort();
          if (_this._headerRequest2) _this._headerRequest2.abort();
          _this._controlsHiddenTimeout.stop();
          _this._controlsInactiveDelayedCall.cancel();
          window.removeEventListener('mousemove', _this.handleMouseMove);
        });
        const renderTableEntry = (val1, val2) => React.createElement('tr', {}, React.createElement('td', {}, val1), React.createElement('td', {}, val2));
        Patcher.after(ImageModal.prototype, 'render', (_this, _, ret) => {
          if (!_this.state)
            _this.state = {
              controlsInactive: false,
              controlsHidden: false,
              imageSize: null,
              originalImageSize: null,
              basicImageInfo: null
            };
          if (_this.state.internalError) return;
          const settings = this.settings.ui;
          if (!settings.infoResolution && settings.infoScale && settings.infoSize) return;
          const { basicImageInfo, imageSize, originalImageSize } = _this.state;
          // splice in, otherwise ImageToClipboard freaks out
          ret.props.children.splice(
            1,
            0,
            ReactDOM.createPortal(
              React.createElement(
                'div',
                {
                  className: XenoLib.joinClassNames('BIV-info BIV-info-extra', { 'BIV-hidden': !_this.state.controlsHidden, 'BIV-inactive': _this.state.controlsInactive }, TextElement.Colors.PRIMARY)
                },
                React.createElement('table', {}, settings.infoResolution ? renderTableEntry(basicImageInfo ? `${basicImageInfo.width}x${basicImageInfo.height}` : 'NaNxNaN', `${_this.props.width}x${_this.props.height}`) : null, settings.infoScale ? renderTableEntry(basicImageInfo ? `${(basicImageInfo.ratio * 100).toFixed(0)}%` : 'NaN%', basicImageInfo ? `${(100 - basicImageInfo.ratio * 100).toFixed(0)}%` : 'NaN%') : null, settings.infoSize ? renderTableEntry(imageSize ? imageSize : 'NaN', originalImageSize ? (originalImageSize === imageSize ? '~' : originalImageSize) : 'NaN') : null)
              ),
              overlayDOMNode
            )
          );
        });
      }

      /* PATCHES */

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

  /* this new lib loader is lit */
  let ZeresPluginLibraryOutdated = false;
  let XenoLibOutdated = false;
  try {
    if (global.BdApi && typeof BdApi.getPlugin === 'function' /* you never know with those retarded client mods */) {
      const versionChecker = (a, b) => ((a = a.split('.').map(a => parseInt(a))), (b = b.split('.').map(a => parseInt(a))), !!(b[0] > a[0])) || !!(b[0] == a[0] && b[1] > a[1]) || !!(b[0] == a[0] && b[1] == a[1] && b[2] > a[2]);
      const isOutOfDate = (lib, minVersion) => lib && lib._config && lib._config.info && lib._config.info.version && versionChecker(lib._config.info.version, minVersion);
      const iZeresPluginLibrary = BdApi.getPlugin('ZeresPluginLibrary');
      const iXenoLib = BdApi.getPlugin('XenoLib');
      if (isOutOfDate(iZeresPluginLibrary, '1.2.10')) ZeresPluginLibraryOutdated = true;
      if (isOutOfDate(iXenoLib, '1.3.10')) XenoLibOutdated = true;
    }
  } catch (e) {
    console.error('Error checking if libraries are out of date', e);
  }

  return !global.ZeresPluginLibrary || !global.XenoLib || ZeresPluginLibraryOutdated || XenoLibOutdated
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
          const bothLibsShit = bothLibsMissing || ((XenoLibMissing || zlibMissing) && (XenoLibOutdated || ZeresPluginLibraryOutdated)) || XenoLibOutdated || ZeresPluginLibraryOutdated;
          const header = (() => {
            let ret = '';
            if (XenoLibMissing || zlibMissing) ret += `Missing${XenoLibOutdated || ZeresPluginLibraryOutdated ? ' and outdated' : ''} `;
            else if (XenoLibOutdated || ZeresPluginLibraryOutdated) ret += `Outdated `;
            ret += `${bothLibsShit ? 'Libraries' : 'Library'} `;
            return ret;
          })();
          const content = (() => {
            let ret = `The ${bothLibsShit ? 'libraries' : 'library'} `;
            if (XenoLibMissing || XenoLibOutdated) {
              ret += 'XenoLib ';
              if (zlibMissing || ZeresPluginLibraryOutdated) ret += 'and ZeresPluginLibrary ';
            } else if (zlibMissing || ZeresPluginLibraryOutdated) ret += 'ZeresPluginLibrary ';
            ret += `required for ${this.name} ${bothLibsShit ? 'are' : 'is'} ${XenoLibMissing || zlibMissing ? 'missing' : ''}${XenoLibOutdated || ZeresPluginLibraryOutdated ? (XenoLibMissing || zlibMissing ? ' and/or outdated' : 'outdated') : ''}.`;
            return ret;
          })();
          const ModalStack = BdApi.findModuleByProps('push', 'update', 'pop', 'popWithKey');
          const TextElement = BdApi.findModuleByProps('Sizes', 'Weights');
          const ConfirmationModal = BdApi.findModule(m => m.defaultProps && m.key && m.key() === 'confirm-modal');
          const onFail = () => BdApi.getCore().alert(header, `${content}<br/>Due to a slight mishap however, you'll have to download the libraries yourself. After opening the links, do CTRL + S to download the library.<br/>${zlibMissing || ZeresPluginLibraryOutdated ? '<br/><a href="http://betterdiscord.net/ghdl/?url=https://github.com/rauenzi/BDPluginLibrary/blob/master/release/0PluginLibrary.plugin.js"target="_blank">Click here to download ZeresPluginLibrary</a>' : ''}${XenoLibMissing || XenoLibOutdated ? '<br/><a href="http://betterdiscord.net/ghdl/?url=https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/1XenoLib.plugin.js"target="_blank">Click here to download XenoLib</a>' : ''}`);
          if (!ModalStack || !ConfirmationModal || !TextElement) return onFail();
          let modalId;
          const onHeckWouldYouLookAtThat = (() => {
            if (!global.pluginModule || !global.BDEvents) return;
            if (XenoLibMissing || XenoLibOutdated) {
              const listener = () => {
                BDEvents.off('xenolib-loaded', listener);
                ModalStack.popWithKey(modalId); /* make it easier on the user */
                pluginModule.reloadPlugin(this.name);
              };
              BDEvents.on('xenolib-loaded', listener);
              return () => BDEvents.off('xenolib-loaded', listener);
            }
            const onLibLoaded = e => {
              if (e !== 'ZeresPluginLibrary') return;
              BDEvents.off('plugin-loaded', onLibLoaded);
              BDEvents.off('plugin-reloaded', onLibLoaded);
              ModalStack.popWithKey(modalId); /* make it easier on the user */
              pluginModule.reloadPlugin(this.name);
            };
            BDEvents.on('plugin-loaded', onLibLoaded);
            BDEvents.on('plugin-reloaded', onLibLoaded);
            return () => (BDEvents.off('plugin-loaded', onLibLoaded), BDEvents.off('plugin-reloaded', onLibLoaded));
          })();
          class TempErrorBoundary extends BdApi.React.PureComponent {
            constructor(props) {
              super(props);
              this.state = { hasError: false };
            }
            componentDidCatch(err, inf) {
              console.error(`Error in ${this.props.label}, screenshot or copy paste the error above to Lighty for help.`);
              this.setState({ hasError: true });
              if (typeof this.props.onError === 'function') this.props.onError(err);
            }
            render() {
              if (this.state.hasError) return null;
              return this.props.children;
            }
          }
          modalId = ModalStack.push(props => {
            return BdApi.React.createElement(
              TempErrorBoundary,
              {
                label: 'missing dependency modal',
                onError: () => {
                  ModalStack.popWithKey(modalId); /* smh... */
                  onFail();
                }
              },
              BdApi.React.createElement(
                ConfirmationModal,
                Object.assign(
                  {
                    header,
                    children: [BdApi.React.createElement(TextElement, { color: TextElement.Colors.PRIMARY, children: [`${content} Please click Download Now to download ${bothLibsShit ? 'them' : 'it'}.`] })],
                    red: false,
                    confirmText: 'Download Now',
                    cancelText: 'Cancel',
                    onConfirm: () => {
                      onHeckWouldYouLookAtThat();
                      const request = require('request');
                      const fs = require('fs');
                      const path = require('path');
                      const waitForLibLoad = callback => {
                        if (!global.BDEvents) return callback();
                        const onLibLoaded = e => {
                          if (e !== 'ZeresPluginLibrary') return;
                          BDEvents.off('plugin-loaded', onLibLoaded);
                          BDEvents.off('plugin-reloaded', onLibLoaded);
                          callback();
                        };
                        BDEvents.on('plugin-loaded', onLibLoaded);
                        BDEvents.on('plugin-reloaded', onLibLoaded);
                      };
                      const onDone = () => {
                        if (!global.pluginModule || (!global.BDEvents && !global.XenoLib)) return;
                        if ((global.XenoLib && !XenoLibOutdated) || !global.BDEvents /* yolo */) return pluginModule.reloadPlugin(this.name);
                        const listener = () => {
                          BDEvents.off('xenolib-loaded', listener);
                          pluginModule.reloadPlugin(this.name);
                        };
                        BDEvents.on('xenolib-loaded', listener);
                      };
                      const downloadXenoLib = () => {
                        if (global.XenoLib && !XenoLibOutdated) return onDone();
                        request('https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/1XenoLib.plugin.js', (error, response, body) => {
                          if (error) return onFail();
                          onDone();
                          fs.writeFile(path.join(window.ContentManager.pluginsFolder, '1XenoLib.plugin.js'), body, () => {});
                        });
                      };
                      if (!global.ZeresPluginLibrary || ZeresPluginLibraryOutdated) {
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
