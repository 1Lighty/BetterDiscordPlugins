//META{"name":"BetterImageViewer","source":"https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/BetterImageViewer/BetterImageViewer.plugin.js","website":"https://1lighty.github.io/BetterDiscordStuff/?plugin=BetterImageViewer","authorId":"239513071272329217","invite":"NYvWdN5","donate":"https://paypal.me/lighty13"}*//
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
      version: '1.3.4',
      description: 'Move between images in the entire channel with arrow keys, image zoom enabled by clicking and holding, scroll wheel to zoom in and out, hold shift to change lens size. Image previews will look sharper no matter what scaling you have, and will take up as much space as possible.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/BetterImageViewer/BetterImageViewer.plugin.js'
    },
    changelog: [
      {
        title: 'fixed',
        type: 'fixed',
        items: ['Fixed image zoom.']
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
          },
          {
            name: 'Always load full resolution image',
            note: "You won't notice a difference. You can also force it to load the full resolution image by ctrl + clicking the image preview. the first resolution on bottom right will turn red when it's enabled.",
            id: 'loadFull',
            type: 'switch',
            value: false
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
          },
          {
            name: 'DEBUG',
            note: 'do not touch',
            id: 'debug',
            type: 'switch',
            value: false
          }
        ]
      },
      {
        type: 'category',
        id: 'zoom',
        name: 'Image Zoom settings',
        collapsible: true,
        shown: false,
        settings: [
          {
            name: 'Enable image zoom',
            id: 'enabled',
            type: 'switch',
            value: true
          },
          {
            name: 'Zoom enable mode',
            id: 'enableMode',
            type: 'radio',
            value: 0,
            options: [
              { name: 'Click and hold', value: 0 },
              { name: 'Click to toggle', value: 1 },
              { name: 'Scroll to toggle', value: 2 }
            ]
          },
          {
            name: 'Anti-aliasing',
            note: 'On low resolution images, pixels become blurry',
            id: 'interp',
            type: 'switch',
            value: true
          },
          {
            name: 'Round lens',
            note: 'why',
            id: 'round',
            type: 'switch',
            value: true
          },
          {
            name: 'Allow lens to go out of bounds',
            note: 'Allows the lens to go beyond the border of the image',
            id: 'outOfBounds',
            type: 'switch',
            value: false
          },
          {
            name: 'Allow lens to clip out of view',
            note: 'Allows the lens to go beyond the window',
            id: 'outOfScreen',
            type: 'switch',
            value: true
          },
          {
            name: 'Movement smoothing',
            note: 'Not recommended to disable. Smooths out movement and zoom',
            id: 'smoothing',
            type: 'switch',
            value: true
          }
        ]
      }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { Utilities, WebpackModules, DiscordModules, ReactComponents, DiscordAPI, Logger, Patcher, PluginUtilities, PluginUpdater, Structs } = Api;
    const { React, ReactDOM, ModalStack, DiscordConstants, Dispatcher, GuildStore, GuildMemberStore, MessageStore, APIModule, NavigationUtils, ChannelStore } = DiscordModules;

    let PluginBrokenFatal = false;
    let NoImageZoom = false;
    let overlayDOMNode;

    const { ARROW_LEFT, ARROW_RIGHT } = (() => {
      try {
        const keys = DiscordConstants.KeyboardKeys;
        if (!keys) throw 'KeyboardKeys is undefined';
        return keys;
      } catch (e) {
        Logger.stacktrace('Failed to get KeyboardKeys', e);
        return { ARROW_LEFT: 37, ARROW_RIGHT: 39 };
      }
    })();
    const Clickable = WebpackModules.getByDisplayName('Clickable');
    const TextElement = WebpackModules.getByDisplayName('Text');

    const _ImageUtils = WebpackModules.getByProps('getImageSrc');
    const ImageUtils = Object.assign({}, WebpackModules.getByProps('getImageSrc') || {}, WebpackModules.getByProps('getRatio') || {}, {
      zoomFit: (e, t) => ImageUtils.fit(e, t, Math.ceil(Math.round(0.86 * window.innerWidth * devicePixelRatio)), Math.ceil(Math.round(0.8 * window.innerHeight * devicePixelRatio))),
      getImageSrc: (e, t, n, r = 1, a = null) => {
        var o = t;
        var i = n;
        if (r < 1) {
          o = Math.round(t * r);
          i = Math.round(n * r);
        }
        return ImageUtils.getSrcWithWidthAndHeight(e, t, n, o, i, a);
      },
      getSizedImageSrc: (e, t, n, r) => _ImageUtils.getSizedImageSrc(e, t, n, r)
    });

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
        const appendImage = image => {
          const { width, height, url: original, proxyURL: src } = image;
          if (images.findIndex(e => e.src === src) !== -1) return;
          if (!src || (width <= 1 && height <= 1)) return;
          const max = ImageUtils.zoomFit(width, height);
          const placeholder = getPlaceholder(src, width, height, max.width, max.height);
          images.push({ width, height, original, src, placeholder });
        };
        message.embeds.forEach(({ image, images }) => {
          if (!image && (!images || !images.length)) return;
          if (images && images.length) for (const image of images) appendImage(image);
          if (image) appendImage(image);
        });
      }
      return images;
    }
    const ReactSpring = WebpackModules.getByProps('useTransition');
    const zoomConfig = { mass: 1, tension: 1750, friction: 75, clamp: false };

    class Image extends (() => {
      const Image = WebpackModules.getByDisplayName('Image');
      if (Image) return Image;
      Logger.error('Failed to get Image!');
      NoImageZoom = true;
      return class error {};
    })() {
      constructor(props) {
        super(props);
        this.state = { zooming: false, visible: false, panelWH: props.__BIV_hiddenSettings.panelWH, zoom: 1.5 };
        XenoLib._.bindAll(this, ['handleMouseDown', 'handleMouseUp', 'handleMouseWheel', 'setRef']);
        try {
          this._handleMouseMove = this.handleMouseMove.bind(this);
          this.handleMouseMove = e => this.state.zooming && this._handleMouseMove(e.clientX, e.clientY);
          this._handleSaveLensWHChangeDC = new TimingModule.DelayedCall(1000, this._handleSaveLensWHChange.bind(this));
          this._controller = new ReactSpring.Controller({ panelX: 0, panelY: 0, panelWH: 0, offsetX: 0, offsetY: 0 });
          this._zoomController = new ReactSpring.Controller({ zoom: 1.5 });
        } catch (err) {
          Logger.stacktrace(`Failed constructing Image`, err);
          XenoLib.Notifications.error(`[**${config.info.name}**] Image zoom has encountered an error and has been temporarily disabled to prevent Discord from crashing. More info in console.`, { timeout: 0 });
          this.__BIV_crash = true;
        }
      }
      componentDidMount() {
        if (super.componentDidMount) super.componentDidMount();
        if (this.__BIV_crash) return;
        window.addEventListener('mouseup', this.handleMouseUp);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mousewheel', this.handleMouseWheel);
        this.getRawImage();
        if (!this._ref) return Logger.warn('this._ref is null!');
        this._bcr = this._ref.getBoundingClientRect();
      }
      componentWillUnmount() {
        if (super.componentWillUnmount) super.componentWillUnmount();
        if (this.__BIV_crash) return;
        window.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mousewheel', this.handleMouseWheel);
        this._handleSaveLensWHChangeDC.cancel();
        this._handleSaveLensWHChange();
        this._controller.destroy();
        this._controller = null;
        this._zoomController.destroy();
        this._zoomController = null;
      }
      componentDidUpdate(prevProps, prevState, snapshot) {
        if (super.componentDidUpdate) super.componentDidUpdate(prevProps, prevState, snapshot);
        if (this.__BIV_crash) return;
        if (this.props.src !== prevProps.src) {
          this.state.zoom = 1.5;
          this.updateZoomController({ zoom: 1.5, immediate: !this.state.zooming });
          if (this.state.zooming) this.setState({ zooming: false });
          this.getRawImage();
        }
        if (!this._ref) return Logger.warn('this._ref is null!');
        this._bcr = this._ref.getBoundingClientRect();
      }
      updateController(props, noStart = false) {
        this._controller.update({ ...props, immediate: !this.props.__BIV_settings.smoothing || props.immediate, config: zoomConfig });
        if (!noStart) this._controller.start();
      }
      updateZoomController(props) {
        this._zoomController.update({ ...props, immediate: !this.props.__BIV_settings.smoothing || props.immediate, config: zoomConfig }).start();
      }
      _handleSaveLensWHChange() {
        Dispatcher.dirtyDispatch({ type: 'BIV_LENS_WH_CHANGE', value: this.state.panelWH });
      }
      handleMouseDown(e) {
        if (e.button !== DiscordConstants.MouseButtons.PRIMARY) return;
        if (e.ctrlKey) {
          Dispatcher.dirtyDispatch({ type: 'BIV_LOAD_FULLRES' });
          return;
        }
        if (this.state.zooming) return this.setState({ zooming: false });
        else if (this.props.__BIV_settings.enableMode === 2) return; /* scroll to toggle */
        this._handleMouseMove(e.clientX, e.clientY, true);
        this.setState({ zooming: true, visible: true });
        e.preventDefault();
      }
      handleMouseUp() {
        /* click and hold mode */
        if (this.props.__BIV_settings.enableMode !== 0) return;
        this.setState({ zooming: false });
      }
      handleMouseMove(cx, cy, start) {
        if (!this.props.__BIV_settings.outOfBounds) {
          cx = Math.min(this._bcr.left + this._bcr.width, Math.max(this._bcr.left, cx));
          cy = Math.min(this._bcr.top + this._bcr.height, Math.max(this._bcr.top, cy));
        }
        let panelWH = this.state.panelWH;
        if (!this.props.__BIV_settings.outOfScreen) {
          if (Structs.Screen.height < Structs.Screen.width && panelWH > Structs.Screen.height) panelWH = Structs.Screen.height - 2;
          else if (Structs.Screen.height > Structs.Screen.width && panelWH > Structs.Screen.width) panelWH = Structs.Screen.width - 2;
        }
        const offsetX = cx - this._bcr.left;
        const offsetY = cy - this._bcr.top;
        let panelX = cx - panelWH / 2;
        let panelY = cy - panelWH / 2;
        if (!this.props.__BIV_settings.outOfScreen) {
          if (panelX < 0) panelX = 0;
          else if (panelX + panelWH > Structs.Screen.width) panelX = Structs.Screen.width - (panelWH + 2);
          if (panelY < 0) panelY = 0;
          else if (panelY + panelWH > Structs.Screen.height) panelY = Structs.Screen.height - (panelWH + 2);
        }
        this.updateController({ panelX, panelY, offsetX, offsetY, panelWH, immediate: start });
      }
      handleMouseWheel(e) {
        /* scroll to toggle mode */
        const scrollToggle = this.props.__BIV_settings.enableMode === 2;
        if ((!scrollToggle || (scrollToggle && e.shiftKey)) && !this.state.zooming) return;
        if (e.deltaY < 0) {
          if (e.shiftKey) {
            this.state.panelWH *= 1.1;
            if (Structs.Screen.height > Structs.Screen.width && this.state.panelWH > (this.props.__BIV_settings.outOfScreen ? Structs.Screen.height * 2 : Structs.Screen.height)) this.state.panelWH = this.props.__BIV_settings.outOfScreen ? Structs.Screen.height * 2 : Structs.Screen.height - 2;
            else if (Structs.Screen.height < Structs.Screen.width && this.state.panelWH > (this.props.__BIV_settings.outOfScreen ? Structs.Screen.width * 2 : Structs.Screen.width)) this.state.panelWH = this.props.__BIV_settings.outOfScreen ? Structs.Screen.width * 2 : Structs.Screen.width - 2;
            this.state.panelWH = Math.ceil(this.state.panelWH);
            this._handleMouseMove(e.clientX, e.clientY);
            this._handleSaveLensWHChangeDC.delay();
          } else {
            this.state.zoom = Math.min(this.state.zoom * 1.1, 60);
            this.updateZoomController({ zoom: this.state.zoom });
            if (scrollToggle && !this.state.zooming) {
              this._handleMouseMove(e.clientX, e.clientY, true);
              this.setState({ zooming: true, visible: true });
            }
          }
        } else if (e.deltaY > 0) {
          if (e.shiftKey) {
            this.state.panelWH *= 0.9;
            if (this.state.panelWH < 75) this.state.panelWH = 75;
            this.state.panelWH = Math.ceil(this.state.panelWH);
            this._handleMouseMove(e.clientX, e.clientY);
            this._handleSaveLensWHChangeDC.delay();
          } else {
            const nextZoom = this.state.zoom * 0.9;
            this.state.zoom = Math.max(nextZoom, 1);
            this.updateZoomController({ zoom: this.state.zoom });
            if (scrollToggle && nextZoom < 1) this.setState({ zooming: false });
          }
        }
      }
      getRawImage(failed) {
        if (this.props.__BIV_animated) return;
        if (typeof this.__BIV_failNum !== 'number') this.__BIV_failNum = 0;
        if (failed) this.__BIV_failNum++;
        else this.__BIV_failNum = 0;
        const src = this.props.src;
        const fullSource = (() => {
          const split = src.split('?')[0];
          /* a user experienced some issues due to EXIF data */
          const isJpeg = split.indexOf('//media.discordapp.net/attachments/') !== -1 && split.search(/.jpe?g$/i) !== -1;
          const SaveToRedux = BdApi.getPlugin && BdApi.getPlugin('SaveToRedux');
          const needsSize = src.substr(src.indexOf('?')).indexOf('size=') !== -1;
          try {
            if (SaveToRedux && !PluginUpdater.defaultComparator(SaveToRedux.version, '2.0.12')) return SaveToRedux.formatURL((!isJpeg && this.props.__BIV_original) || '', needsSize, '', '', split, this.__BIV_failNum).url;
          } catch (_) {}
          return split + (needsSize ? '?size=2048' : '');
        })();
        this.state.raw = fullSource;
      }
      renderLens(ea, props) {
        return React.createElement(
          ReactSpring.animated.div,
          {
            style: {
              width: props.panelWH,
              height: props.panelWH,
              transform: ReactSpring.to([props.panelX, props.panelY], (x, y) => `translate3d(${x}px, ${y}px, 0)`),
              opacity: ea.opacity
            },
            className: XenoLib.joinClassNames('BIV-zoom-lens', { 'BIV-zoom-lens-round': this.props.__BIV_settings.round })
          },
          React.createElement(
            ReactSpring.animated.div,
            {
              style: {
                transform: ReactSpring.to([props.imgLeft, props.imgTop], (x, y) => `translate3d(${x}px, ${y}px, 0)`)
              }
            },
            React.createElement(this.props.__BIV_animated ? ReactSpring.animated.video : ReactSpring.animated.img, {
              onError: _ => this.getRawImage(true),
              src: this.props.__BIV_animated ? this.props.__BIV_src : this.state.raw,
              width: props.imgWidth,
              height: props.imgHeight,
              style: this.props.__BIV_settings.interp
                ? undefined
                : {
                    imageRendering: 'pixelated'
                  },
              ...(this.props.__BIV_animated ? { autoPlay: true, muted: true, loop: true } : {})
            })
          )
        );
      }
      setRef(e) {
        this._ref = e;
      }
      render() {
        const ret = super.render();
        if (this.__BIV_crash) return ret;
        ret.props.onMouseDown = this.handleMouseDown;
        for (const prop in ret.props) if (!prop.indexOf('__BIV')) delete ret.props[prop];
        ret.ref = this.setRef;
        if (this.state.visible) {
          ret.props.children.push(
            React.createElement(
              XenoLib.ReactComponents.ErrorBoundary,
              {
                label: 'Image zoom',
                onError: () => {
                  XenoLib.Notifications.error(`[**${config.info.name}**] Image zoom has encountered a rendering error and has been temporarily disabled to prevent Discord from crashing. More info in console.`, { timeout: 0 });
                }
              },
              ReactDOM.createPortal(
                React.createElement(
                  ReactSpring.Spring,
                  {
                    native: true,
                    from: { opacity: 0 },
                    to: { opacity: this.state.zooming ? 1 : 0 },
                    config: { duration: 100 },
                    onRest: () => {
                      !this.state.zooming && this.setState({ visible: false });
                    }
                  },
                  ea => [
                    React.createElement(ReactSpring.animated.div, {
                      style: {
                        opacity: ea.opacity
                      },
                      className: 'BIV-zoom-backdrop'
                    }),
                    this.renderLens(ea, {
                      imgLeft: ReactSpring.to([this._zoomController.animated.zoom, this._controller.animated.offsetX, this._controller.animated.panelX], (z, x, a) => -a + (this._bcr.left - ((this._bcr.width * z - this._bcr.width) / (this._bcr.width * z)) * x * z)),
                      imgTop: ReactSpring.to([this._zoomController.animated.zoom, this._controller.animated.offsetY, this._controller.animated.panelY], (z, y, a) => -a + (this._bcr.top - ((this._bcr.height * z - this._bcr.height) / (this._bcr.height * z)) * y * z)),
                      imgWidth: this._zoomController.animated.zoom.to(e => e * this.props.width),
                      imgHeight: this._zoomController.animated.zoom.to(e => e * this.props.height),
                      panelX: this._controller.animated.panelX,
                      panelY: this._controller.animated.panelY,
                      panelWH: this._controller.animated.panelWH
                    })
                  ]
                ),
                overlayDOMNode
              )
            )
          );
        }
        return ret;
      }
    }

    class LazyImage extends (() => {
      const LazyImage = WebpackModules.getByDisplayName('LazyImage');
      if (LazyImage) return LazyImage;
      Logger.error('Failed to get LazyImage! Plugin will not work!');
      PluginBrokenFatal = true;
      return class error {};
    })() {
      constructor(props) {
        super(props);
        this.renderChildren = this.renderChildren.bind(this);
      }
      componentDidUpdate(props, prevState, snapshot) {
        this._cancellers.forEach(e => e());
        this._cancellers.clear();
        super.componentDidUpdate(props, prevState, snapshot);
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
      renderChildren(e) {
        return React.createElement('img', {
          className: e.className || undefined,
          alt: e.alt,
          src: e.src,
          style: e.size,
          key: this.props.id /* force React to create a new element for a smooth transition */
        });
      }
      render() {
        const ret = super.render();
        if (!ret) {
          Logger.warn('LazyImage render returned null!', new Error()); /* should not occur */
          return ret;
        }
        ret.props.__BIV_original = this.props.__BIV_original;
        ret.props.children = this.renderChildren;
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
    const APIEncodeModule = WebpackModules.getByProps('stringify', 'parse', 'encode');
    const ImageModal = WebpackModules.getByDisplayName('ImageModal');
    const ImageProps = ['height', 'width', 'original', 'placeholder', 'src'];
    const UsernameClassname = XenoLib.getClass('botTag username');
    const ClickableClassname = XenoLib.getClass('username clickable');
    const CozyClassname = XenoLib.getClass('zalgo cozy');

    /* discord gay */
    const LeftCaretIcon = e => React.createElement('svg', { ...e, name: 'LeftCaret', width: 24, height: 24, viewBox: '0 0 24 24' }, React.createElement('polygon', { points: '18.35 4.35 16 2 6 12 16 22 18.35 19.65 10.717 12', fill: 'currentColor', fillRule: 'nonzero' }));
    const RightCaretIcon = e => React.createElement('svg', { ...e, name: 'RightCaret', width: 24, height: 24, viewBox: '0 0 24 24' }, React.createElement('polygon', { points: '8.47 2 6.12 4.35 13.753 12 6.12 19.65 8.47 22 18.47 12', fill: 'currentColor', fillRule: 'nonzero' }));
    const WarningTriangleIcon = e => React.createElement('svg', { ...e, name: 'WarningTriangle', width: 16, height: 16, viewBox: '0 0 24 24' }, React.createElement('path', { d: 'M1,21 L23,21 L12,2 L1,21 L1,21 Z M13,18 L11,18 L11,16 L13,16 L13,18 L13,18 Z M13,14 L11,14 L11,10 L13,10 L13,14 L13,14 Z', fill: 'currentColor' }));
    const UpdateAvailableIcon = e => React.createElement('svg', { ...e, name: 'UpdateAvailable', width: 16, height: 16, viewBox: '0 0 24 24', className: 'BIV-searching-icon-spin' }, React.createElement('path', { d: 'M5,8 L9,12 L6,12 C6,15.31 8.69,18 12,18 C13.01,18 13.97,17.75 14.8,17.3 L16.26,18.76 C15.03,19.54 13.57,20 12,20 C7.58,20 4,16.42 4,12 L1,12 L5,8 Z M18,12 C18,8.69 15.31,6 12,6 C10.99,6 10.03,6.25 9.2,6.7 L7.74,5.24 C8.97,4.46 10.43,4 12,4 C16.42,4 20,7.58 20,12 L23,12 L19,16 L15,12 L18,12 Z', fill: 'currentColor', fillRule: 'nonzero' }));
    const SearchIcon = e => React.createElement('svg', { ...e, name: 'Nova_Search', width: 24, height: 24, viewBox: '0 0 24 24' }, React.createElement('path', { d: 'M21.707 20.293L16.314 14.9C17.403 13.504 18 11.799 18 10C18 7.863 17.167 5.854 15.656 4.344C14.146 2.832 12.137 2 10 2C7.863 2 5.854 2.832 4.344 4.344C2.833 5.854 2 7.863 2 10C2 12.137 2.833 14.146 4.344 15.656C5.854 17.168 7.863 18 10 18C11.799 18 13.504 17.404 14.9 16.314L20.293 21.706L21.707 20.293ZM10 16C8.397 16 6.891 15.376 5.758 14.243C4.624 13.11 4 11.603 4 10C4 8.398 4.624 6.891 5.758 5.758C6.891 4.624 8.397 4 10 4C11.603 4 13.109 4.624 14.242 5.758C15.376 6.891 16 8.398 16 10C16 11.603 15.376 13.11 14.242 14.243C13.109 15.376 11.603 16 10 16Z', fill: 'currentColor' }));
    const TimerIcon = e => React.createElement('svg', { ...e, name: 'Timer', width: 16, height: 16, viewBox: '0 0 24 24' }, React.createElement('path', { d: 'M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42C16.07 4.74 14.12 4 12 4c-4.97 0-9 4.03-9 9s4.02 9 9 9 9-4.03 9-9c0-2.12-.74-4.07-1.97-5.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z', fill: 'currentColor', fillRule: 'nonzero' }));
    const ClearIcon = e => React.createElement('svg', { ...e, name: 'Clear', width: 18, height: 18, viewBox: '0 0 18 18' }, React.createElement('path', { d: 'M9,2 C12.871,2 16,5.129 16,9 C16,12.871 12.871,16 9,16 C5.129,16 2,12.871 2,9 C2,5.129 5.129,2 9,2 L9,2 Z M11.6925,5.25 L9,7.9425 L6.3075,5.25 L5.25,6.3075 L7.9425,9 L5.25,11.6925 L6.3075,12.75 L9,10.0575 L11.6925,12.75 L12.75,11.6925 L10.0575,9 L12.75,6.3075 L11.6925,5.25 Z', fill: 'currentColor', fillRule: 'nonzero' }));

    const EditorTools = WebpackModules.getByProps('getFirstTextBlock');
    const SearchTools = WebpackModules.getByProps('tokenizeQuery', 'getSearchQueryFromTokens');
    // const SearchResultsWrap = XenoLib.getSingleClass('noResults searchResultsWrap') || 'ERRORCLASS';
    const SearchStore = WebpackModules.getByProps('getCurrentSearchId');

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
          controlsVisible: false,
          imageSize: null,
          originalImageSize: null,
          basicImageInfo: null,
          showFullRes: false
        };
        XenoLib._.bindAll(this, ['handleMessageCreate', 'handleMessageDelete', 'handlePurge', 'handleKeyDown', 'handlePrevious', 'handleNext', 'handleMouseLeave']);
        this.handleMouseEnterLeft = this._handleMouseEnter.bind(this, false);
        this.handleMouseEnterRight = this._handleMouseEnter.bind(this, true);
        this.handleFastJumpLeft = this._handleFastJump.bind(this, false);
        this.handleFastJumpRight = this._handleFastJump.bind(this, true);
        if (props.__BIV_index === -1) {
          this.state.internalError = true;
          return;
        }
        try {
          const filtered = this.filterMessages(true);
          if (!props.__BIV_isSearch && filtered.findIndex(m => m.id === this.state.__BIV_data.messageId) === -1) {
            this.state.internalError = true;
            return;
          }
          this._lastSearch = 0;
          this._cancellers = new Set();
          this._cachedMessages = [props.__BIV_data.messageId];
          this._preloading = new Set();
          if (!props.__BIV_isSearch) {
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
            this._searchId = DiscordAPI.currentGuild ? DiscordAPI.currentGuild.id : DiscordAPI.currentChannel.id;
          } else {
            this._followNew = false;
            this._searchCache = [];
            this._forwardSearchCache = [];
            const images = [];
            this._searchId = SearchStore.getCurrentSearchId();
            const searchResults = SearchStore.getResults(this._searchId);
            searchResults.forEach(group => {
              group.forEach(iMessage => {
                if (!iMessage.isSearchHit || images.findIndex(e => e.id === iMessage.id) !== -1) return;
                if (!extractImages(iMessage).length) return;
                images.push(iMessage);
              });
            });
            images.sort((a, b) => a.timestamp.unix() - b.timestamp.unix());
            /* discord search is le broken lol */
            /* if (Utilities.getNestedProp(ZeresPluginLibrary.ReactTools.getOwnerInstance(document.querySelector(`.${SearchResultsWrap}`)), 'state.searchMode') === DiscordConstants.SearchModes.OLDEST) images.reverse(); */
            this._searchCache._totalResults = SearchStore.getTotalResults(this._searchId);
            this._searchCache.unshift(...images);
            let searchString = EditorTools.getFirstTextBlock(SearchStore.getEditorState(this._searchId));
            let searchquery;
            let o;
            let s;
            for (o = SearchTools.tokenizeQuery(searchString), searchquery = SearchTools.getSearchQueryFromTokens(o), s = 0; s < o.length; s++) {
              SearchTools.filterHasAnswer(o[s], o[s + 1]) || (searchString = searchString.substring(0, o[s].start) + searchString.substring(o[s].end));
            }
            this._searchProps = searchquery;
          }
          this._searchType = GuildStore.getGuild(this._searchId) ? DiscordConstants.SearchTypes.GUILD : DiscordConstants.SearchTypes.CHANNEL;
          this._imageCounter = {};
          this._oFM = [];
          this.calculateImageNumNMax();
        } catch (err) {
          Logger.stacktrace('Failed constructing RichImageModal', err);
          /* XenoLib.Notifications.error(`[**${config.info.name}**] Serious internal error. More info in console.`) */
          this.state.internalError = -1;
        }
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
        const chan = this.props.__BIV_isSearch ? [] : ChannelMessages[DiscordAPI.currentChannel.id];
        const arr = [...((!noCache && this._searchCache) || []), ...(!this.props.__BIV_isSearch ? [...chan._before._messages, ...chan._array, ...chan._after._messages] : []), ...((!noCache && this._forwardSearchCache) || [])];
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
        if (!this.props.__BIV_settings.behavior.searchAPI) return;
        if (!this.props.__BIV_isSearch && reverse && !ChannelMessages[DiscordAPI.currentChannel.id].hasMoreAfter) return Logger.warn("Illegal operation, attempted to reverse search, but we're on newest image\n", new Error().stack);
        this.state.needsSearch = false;
        if ((this.state.requesting && !this.state.indexing) || (!reverse && this._searchCache.noBefore) || (reverse && this._followNew)) return;
        /* fully utilize both caches */
        if (!this.props.__BIV_isSearch && this.processCache(OldForwardSearchCache, lastId, reverse)) return;
        if (!this.props.__BIV_isSearch && this.processCache(OldSearchCache, lastId, reverse)) return;
        if (this.state.rateLimited) return;
        if (!this.state.indexing && Date.now() - this._lastSearch < 3500) {
          if (!this.state.localRateLimited) {
            this.state.localRateLimited = this.setState({
              localRateLimited: setTimeout(() => {
                this.state.localRateLimited = 0;
                this.handleSearch(lastId, reverse);
              }, 3500 - (Date.now() - this._lastSearch))
            });
          }
          return;
        }
        this._lastSearch = Date.now();
        const query = Object.assign({}, this.props.__BIV_isSearch ? this._searchProps : { channel_id: DiscordAPI.currentChannel.id }, { has: 'image', include_nsfw: true, [reverse ? 'min_id' : 'max_id']: lastId }, reverse ? { sort_order: 'asc' } : {});
        APIModule.get({
          url: this._searchType === DiscordConstants.SearchTypes.GUILD ? DiscordConstants.Endpoints.SEARCH_GUILD(this._searchId) : DiscordConstants.Endpoints.SEARCH_CHANNEL(this._searchId),
          query: APIEncodeModule.stringify(query)
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
                if ((this.props.__BIV_isSearch && !message.hit) || images.findIndex(e => e.id === message.id) !== -1) return;
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
        if (this.props.__BIV_isSearch) return;
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
        stripDeletedMessage(channelId, messageId);
        if (messageId !== this.state.__BIV_data.messageId) return;
        this.handleMessageDeletes();
      }
      handlePurge(e) {
        const { channelId, ids: messageIds } = e;
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
      _handleMouseEnter(next) {
        this.state.controlsHovered = true;
        if (this.props.__BIV_settings.behavior.debug) this.forceUpdate();
        if (!this.state.needsSearch || (this.state.needsSearch === -1 && !next) || !this.props.__BIV_settings.behavior.hoverSearch) return;
        const filtered = this.filterMessages();
        this.handleSearch(next ? filtered[filtered.length - 1].id : filtered[0].id, next);
      }
      handleMouseLeave() {
        this.state.controlsHovered = false;
        if (this.props.__BIV_settings.behavior.debug) this.forceUpdate();
      }
      handlePreLoad(keyboardMode, next, subsidiaryMessageId) {
        const filtered = this.filterMessages();
        const targetIdx = filtered.findIndex(m => m.id === (subsidiaryMessageId ? subsidiaryMessageId : this.state.__BIV_data.messageId));
        if (targetIdx === -1) Logger.warn('Unknown message\n', new Error());
        const isNearingEdge = next ? filtered.length - (targetIdx + 1) < 5 : targetIdx + 1 < 5;
        this.setState({ isNearingEdge, showFullRes: false });
        if (keyboardMode === -1 || isNearingEdge) {
          /* search required, wait for user input if none of these are tripped */
          if (keyboardMode || this.state.controlsHovered) {
            if (!next || (next && (this.props.__BIV_isSearch || ChannelMessages[DiscordAPI.currentChannel.id].hasMoreAfter))) this.handleSearch(next ? filtered[filtered.length - 1].id : filtered[0].id, next);
          } else {
            this.state.needsSearch = next ? -1 : 1;
          }
        }
        if (targetIdx === -1) {
          XenoLib.Notifications.error(`[**${config.info.name}**] Anomaly detected, disabling controls.`, { timeout: 5000 });
          return this.setState({ internalError: true });
        }
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
          if (this.state.__BIV_index === this.state.__BIV_data.images.length - 1) {
            if (!this.handleEnd(keyboardMode)) return;
          } else this.state.__BIV_index++;
        } else {
          if (!this.state.__BIV_index) {
            if (!this.handleStart(keyboardMode)) return;
          } else this.state.__BIV_index--;
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
      _handleFastJump(next) {
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
        if (this.state.internalError === -1) throw 'If you see this, something went HORRIBLY wrong!';
        for (const prop of ImageProps) this.props[prop] = this.state[prop];
        const message = this.state.__BIV_data && this.getMessage(this.state.__BIV_data.messageId);
        const ret = super.render();
        if (this.state.internalError || (!message && this.state.__BIV_data)) return ret;
        if (!message) {
          if (!this.__couldNotFindMessage) XenoLib.Notifications.error(`[**${config.info.name}**] Something went wrong.. Could not find associated message for current image.`, { timeout: 7500 });
          this.__couldNotFindMessage = true;
          return ret;
        } else this.__couldNotFindMessage = false;
        const currentImage = this._imageCounter[this.state.__BIV_data.messageId] + (this.state.__BIV_data.images.length - 1 - this.state.__BIV_index);
        ret.props.children[0].type = LazyImage;
        ret.props.children[0].props.id = message.id + currentImage;
        ret.props.children[0].props.__BIV_original = this.props.original;
        const iMember = DiscordAPI.currentGuild && GuildMemberStore.getMember(DiscordAPI.currentGuild.id, message.author.id);
        ret.props.children.push(
          ReactDOM.createPortal(
            [
              this.props.__BIV_settings.ui.navButtons || this.props.__BIV_settings.behavior.debug
                ? [
                    React.createElement(
                      Clickable,
                      {
                        className: XenoLib.joinClassNames('BIV-left', { 'BIV-disabled': currentImage === this._maxImages && (this._searchCache.noBefore || this.state.rateLimited), 'BIV-inactive': this.state.controlsInactive, 'BIV-hidden': !this.state.controlsVisible }),
                        onClick: this.handlePrevious,
                        onContextMenu: this.handleFastJumpLeft,
                        onMouseEnter: this.handleMouseEnterLeft,
                        onMouseLeave: this.handleMouseLeave
                      },
                      React.createElement(LeftCaretIcon)
                    ),
                    React.createElement(
                      Clickable,
                      {
                        className: XenoLib.joinClassNames('BIV-right', { 'BIV-disabled': currentImage === 1, 'BIV-inactive': this.state.controlsInactive, 'BIV-hidden': !this.state.controlsVisible }),
                        onClick: this.handleNext,
                        onContextMenu: this.handleFastJumpRight,
                        onMouseEnter: this.handleMouseEnterRight,
                        onMouseLeave: this.handleMouseLeave
                      },
                      React.createElement(RightCaretIcon)
                    )
                  ]
                : null,
              React.createElement(
                'div',
                {
                  className: XenoLib.joinClassNames('BIV-info', { 'BIV-inactive': this.state.controlsInactive, 'BIV-hidden': !this.state.controlsVisible })
                },
                this.props.__BIV_settings.ui.imageIndex || this.props.__BIV_settings.behavior.debug
                  ? React.createElement(
                      TextElement,
                      {
                        className: 'BIV-text-bold'
                      },
                      'Image ',
                      currentImage,
                      ' of ',
                      this._maxImages,
                      this._searchCache._totalResults || this.props.__BIV_settings.behavior.debug
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
                    TextElement,
                    {
                      className: XenoLib.joinClassNames(CozyClassname, 'BIV-info-wrapper-text')
                    },
                    React.createElement(
                      'span',
                      {
                        className: XenoLib.joinClassNames(UsernameClassname, ClickableClassname),
                        onContextMenu: e => {
                          WebpackModules.getByProps('openUserContextMenu').openUserContextMenu(e, message.author, ChannelStore.getChannel(message.channel_id));
                        },
                        style:
                          iMember && iMember.colorString
                            ? {
                                color: iMember.colorString
                              }
                            : null,
                        onClick: () => {
                          this.props.onClose();
                          NavigationUtils.transitionTo(`/channels/${(DiscordAPI.currentGuild && DiscordAPI.currentGuild.id) || '@me'}/${message.channel_id}${message.id ? '/' + message.id : ''}`);
                        }
                      },
                      (iMember && iMember.nick) || message.author.username
                    ),
                    React.createElement(MessageTimestamp, {
                      timestamp: DiscordModules.Moment(message.timestamp)
                    }),
                    (this.props.__BIV_settings.behavior.debug || this._searchCache.noBefore) &&
                      React.createElement(
                        'div',
                        {
                          className: XenoLib.joinClassNames('BIV-requesting', TextElement.Colors.ERROR)
                        },
                        React.createElement(
                          Tooltip,
                          {
                            text: 'You have reached the start of the channel'
                          },
                          e => React.createElement(LeftCaretIcon, e)
                        )
                      ),
                    (this.props.__BIV_settings.behavior.debug || (this.state.isNearingEdge && !this.props.__BIV_settings.behavior.searchAPI)) &&
                      React.createElement(
                        'div',
                        {
                          className: XenoLib.joinClassNames('BIV-requesting', TextElement.Colors.STATUS_YELLOW)
                        },
                        React.createElement(
                          Tooltip,
                          {
                            text: 'You are nearing the edge of available images. If you want more, enable search API.'
                          },
                          e => React.createElement(WarningTriangleIcon, e)
                        )
                      ),
                    (this.props.__BIV_settings.behavior.debug || (this.state.requesting && !this.state.unknownError)) &&
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
                          e => React.createElement(UpdateAvailableIcon, e)
                        )
                      ),
                    (this.props.__BIV_settings.behavior.debug || this.state.indexing) &&
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
                          e => React.createElement(SearchIcon, e)
                        )
                      ),
                    this.props.__BIV_settings.behavior.debug || this.state.localRateLimited || this.state.rateLimited
                      ? React.createElement(
                          'div',
                          {
                            className: XenoLib.joinClassNames('BIV-requesting', TextElement.Colors.ERROR)
                          },
                          React.createElement(
                            Tooltip,
                            {
                              text: 'You have been rate limited, please wait'
                            },
                            e => React.createElement(TimerIcon, e)
                          )
                        )
                      : undefined,
                    (this.props.__BIV_settings.behavior.debug || this._followNew) &&
                      React.createElement(
                        'div',
                        {
                          className: XenoLib.joinClassNames('BIV-requesting', TextElement.Colors.ERROR)
                        },
                        React.createElement(
                          Tooltip,
                          {
                            text: 'You have reached the end of the channel and are listening for new images'
                          },
                          e => React.createElement(RightCaretIcon, e)
                        )
                      ),
                    (this.props.__BIV_settings.behavior.debug || this.state.unknownError) &&
                      React.createElement(
                        'div',
                        {
                          className: XenoLib.joinClassNames('BIV-requesting', TextElement.Colors.ERROR)
                        },
                        React.createElement(
                          Tooltip,
                          {
                            text: 'Unknown error occured'
                          },
                          e => React.createElement(ClearIcon, e)
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
        this.handleWHChange = this.handleWHChange.bind(this);
        const oOnStart = this.onStart.bind(this);
        this._startFailure = message => {
          PluginUpdater.checkForUpdate(this.name, this.version, this._config.info.github_raw);
          XenoLib.Notifications.error(`[**${this.name}**] ${message} Please update it, press CTRL + R, or ${GuildStore.getGuild(XenoLib.supportServerId) ? 'go to <#639665366380838924>' : '[join my support server](https://discord.gg/NYvWdN5)'} for further assistance.`, { timeout: 0 });
        };
        this.onStart = () => {
          try {
            oOnStart();
          } catch (e) {
            Logger.stacktrace('Failed to start!', e);
            this._startFailure('Failed to start!');
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
        if (!overlayDOMNode) {
          overlayDOMNode = document.createElement('div');
          overlayDOMNode.className = 'biv-overlay';
        }
        document.querySelector('#app-mount').append(overlayDOMNode);
        this.promises = { state: { cancelled: false } };
        if (PluginBrokenFatal) return this._startFailure('Plugin is in a broken state.');
        if (NoImageZoom) this._startFailure('Image zoom is broken.');
        if (!NoImageZoom && BdApi.getPlugin('ImageZoom') && BdApi.Plugins.isEnabled('ImageZoom')) XenoLib.Notifications.warning(`[**${this.name}**] Using **ImageZoom** while having the zoom function in **${this.name}** enabled is unsupported! Please disable one or the other.`, { timeout: 15000 });
        if (BdApi.getPlugin('Better Image Popups') && BdApi.Plugins.isEnabled('Better Image Popups')) XenoLib.Notifications.warning(`[**${this.name}**] Using **Better Image Popups** with **${this.name}** is completely unsupported and will cause issues. **${this.name}** fully supersedes it in terms of features as well, please either disable **Better Image Popups** or delete it to avoid issues.`, { timeout: 0 });
        this.hiddenSettings = XenoLib.loadData(this.name, 'hidden', { panelWH: 500 });
        this.patchAll();
        Dispatcher.subscribe('MESSAGE_DELETE', this.handleMessageDelete);
        Dispatcher.subscribe('MESSAGE_DELETE_BULK', this.handlePurge);
        Dispatcher.subscribe('BIV_LENS_WH_CHANGE', this.handleWHChange);
        PluginUtilities.addStyle(
          this.short + '-CSS',
          `
          .BIV-left,
          .BIV-right {
            position: absolute;
            top: 90px;
            bottom: 90px;
            width: 90px;
            background-color: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
            transition: all 0.25s ease-in-out;
            color: gray;
          }
          .BIV-disabled {
            color: #4d4d4d;
          }
          .BIV-left.BIV-inactive,
          .BIV-right.BIV-inactive {
            opacity: 0;
          }
          .BIV-info.BIV-inactive {
            opacity: 0.65;
          }
          .BIV-left:not(.BIV-disabled):hover,
          .BIV-right:not(.BIV-disabled):hover {
            background-color: hsla(0, 0%, 49%, 0.2);
            color: #fff;
          }
          .BIV-left {
            left: 0;
          }
          .BIV-right {
            right: 0;
          }
          .BIV-left > svg,
          .BIV-right > svg {
            width: 30px;
            height: 30px;
          }
          .BIV-info {
            position: absolute;
            left: 18px;
            bottom: 12px;
            height: 42px;
            transition: opacity 0.35s ease-in-out;
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
          .BIV-info-wrapper > .BIV-info-wrapper-text {
            display: flex;
            align-items: center;
          }
          .BIV-requesting {
            display: flex;
            margin-left: 5px;
          }
          .BIV-requesting > svg[name='Nova_Search'],
          .BIV-requesting > svg[name='LeftCaret'],
          .BIV-requesting > svg[name='RightCaret'] {
            width: 16px;
            height: 16px;
          }
          .BIV-zoom-backdrop,
          .biv-overlay {
            width: 100%;
            height: 100%;
            position: absolute;
          }
          .BIV-inactive {
            transition: opacity 1s ease-in-out;
          }
          .BIV-hidden {
            opacity: 0;
          }
          .BIV-info-wrapper .${XenoLib.getClass('header username')} {
            max-width: 900px;
            overflow-x: hidden;
            margin-right: 0.25rem;
          }
          .biv-overlay {
            pointer-events: none;
            z-index: 1000;
          }
          .biv-overlay > * {
            pointer-events: all;
          }
          @keyframes BIV-spin {
            0% {
              transform: rotate(0);
            }
            to {
              transform: rotate(1turn);
            }
          }
          .BIV-searching-icon-spin {
            animation: BIV-spin 2s linear infinite;
          }
          .BIV-zoom-lens {
            overflow: hidden;
            cursor: none;
            border: solid #0092ff;
            border-width: thin;
          }
          .BIV-zoom-lens-round {
            border-radius: 50%;
            border: 2px solid #0092ff;
          }
          .BIV-zoom-backdrop {
            background: rgba(0, 0, 0, 0.4);
          }
          .BIV-text-bold {
            font-weight: 600;
          }
          .${WebpackModules.find(e => Object.keys(e).length === 2 && e.modal && e.inner).modal.split(' ')[0]} > .${WebpackModules.find(e => Object.keys(e).length === 2 && e.modal && e.inner).inner.split(' ')[0]} > .${XenoLib.getSingleClass('imageZoom imageWrapper')} {
            display: table; /* lol */
          }
        `
        );
      }

      onStop() {
        this.promises.state.cancelled = true;
        Patcher.unpatchAll();
        Dispatcher.unsubscribe('MESSAGE_DELETE', this.handleMessageDelete);
        Dispatcher.unsubscribe('MESSAGE_DELETE_BULK', this.handlePurge);
        Dispatcher.unsubscribe('BIV_LENS_WH_CHANGE', this.handleWHChange);
        PluginUtilities.removeStyle(this.short + '-CSS');
        if (overlayDOMNode) overlayDOMNode.remove();
        overlayDOMNode = null;
      }

      saveHiddenSettings() {
        PluginUtilities.saveData(this.name, 'hidden', this.hiddenSettings);
      }

      handleMessageDelete(e) {
        const { channelId, id: messageId } = e;
        stripDeletedMessage(channelId, messageId);
      }
      handlePurge(e) {
        const { channelId, ids: messageIds } = e;
        stripPurgedMessages(channelId, messageIds);
      }
      handleWHChange({ value }) {
        this.hiddenSettings.panelWH = value;
        this.saveHiddenSettings();
      }

      /* PATCHES */

      patchAll() {
        Utilities.suppressErrors(this.patchMessageAccessories.bind(this), 'MessageAccessories patches')(this.promises.state);
        Utilities.suppressErrors(this.patchLazyImageZoomable.bind(this), 'LazyImageZoomable patches')();
        Utilities.suppressErrors(this.patchImageModal.bind(this), 'ImageModal patches')();
        Utilities.suppressErrors(this.patchLazyImage.bind(this), 'LazyImage patches')();
        Utilities.suppressErrors(this.patchImageScaling.bind(this), 'image scaling patches')();
      }

      patchLazyImageZoomable() {
        const patchKey = DiscordModules.KeyGenerator();
        Patcher.before(WebpackModules.getByDisplayName('LazyImageZoomable').prototype, 'render', (_this, _, ret) => {
          if (_this.onZoom.__BIV_patched !== patchKey) {
            _this.onZoom = (e, n) => {
              let isSearch = e.target;
              while (isSearch && typeof isSearch.className === 'string' && isSearch.className.indexOf('searchResultMessage') === -1) isSearch = isSearch.parentElement;
              isSearch = !!isSearch;
              e.preventDefault();
              if (e.currentTarget instanceof HTMLElement) e.currentTarget.blur();
              e = null;
              const original = _this.props.original || _this.props.src;
              ModalStack.push(e => {
                try {
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
                          __BIV_isSearch: isSearch,
                          __BIV_settings: this.settings
                        },
                        e
                      )
                    )
                  );
                } catch (err) {
                  /* juuuuust in case, modal crashes can be brutal */
                  Logger.stacktrace('Error creating image modal', err);
                  e.onClose();
                  return null;
                }
              });
            };
            _this.onZoom.__BIV_patched = patchKey;
          }
        });
      }

      async patchMessageAccessories(promiseState) {
        const selector = `.${XenoLib.getSingleClass('embedWrapper container')}`;
        const MessageAccessories = await ReactComponents.getComponentByName('MessageAccessories', selector);
        if (!MessageAccessories.selector) MessageAccessories.selector = selector;
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
            _this.renderEmbed = function (e, n) {
              const oRenderImageComponent = n.renderImageComponent;
              if (!oRenderImageComponent.__BIV_patched) {
                n.renderImageComponent = function (a) {
                  a.__BIV_data = _this.__BIV_data;
                  return oRenderImageComponent(a);
                };
                n.renderImageComponent.__BIV_patched = true;
              }
              return oRenderEmbed(e, n);
            };
            _this.renderEmbed.__BIV_patched = true;
          }
        });
        Patcher.after(MessageAccessories.component.prototype, 'renderAttachments', (_this, _, ret) => {
          if (!ret) return;
          for (let attachment of ret) {
            let props = Utilities.getNestedProp(attachment, 'props.children.props');
            if (!props) continue;
            const oRenderImageComponent = props.renderImageComponent;
            props.renderImageComponent = function (e) {
              e.__BIV_data = _this.__BIV_data;
              return oRenderImageComponent(e);
            };
            attachment = null;
            props = null;
          }
          ret = null;
        });
        MessageAccessories.forceUpdateAll();
      }

      patchImageModal() {
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
          if (Math.abs(bytes) < thresh) return `${bytes} B`;
          const units = si ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
          let u = -1;
          do {
            bytes /= thresh;
            ++u;
          } while (Math.abs(bytes) >= thresh && u < units.length - 1);
          return `${bytes.toFixed(1)} ${units[u]}`;
        }
        Patcher.after(ImageModal.prototype, 'requestImageInfo', (_this, [props, equalRatio]) => {
          const original = (props && props.original) || _this.props.original;
          const src = (props && props.src) || _this.props.src;
          const width = (props && props.width) || _this.props.width;
          const height = (props && props.height) || _this.props.height;
          const reqUrl = (() => {
            const split = src.split('?')[0];
            const SaveToRedux = BdApi.getPlugin && BdApi.getPlugin('SaveToRedux');
            const needsSize = src.substr(src.indexOf('?')).indexOf('size=') !== -1;
            try {
              if (SaveToRedux) return SaveToRedux.formatURL(original || '', needsSize, '', '', split).url;
            } catch (_) {}
            return split + (needsSize ? '?size=2048' : '');
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
            const scaledRatio = getRatio(width, height, max.width, max.height);
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
          _this._controlsVisibleTimeout = new TimingModule.Timeout();
          _this._controlsVisibleTimeout.start(300, () => _this.setState({ controlsVisible: true }));
          _this._controlsInactiveDelayedCall = new TimingModule.DelayedCall(3500, () => _this.setState({ controlsInactive: true }));
          _this._controlsInactiveDelayedCall.delay();
          _this.handleMouseMove = XenoLib._.throttle(_this.handleMouseMove.bind(_this), 500);
          window.addEventListener('mousemove', _this.handleMouseMove);
          Dispatcher.subscribe(
            'BIV_LOAD_FULLRES',
            (_this._fullresHandler = () => {
              if (_this.state.showFullRes) return;
              _this.setState({
                showFullRes: true
              });
            })
          );
        });
        Patcher.after(ImageModal.prototype, 'componentWillUnmount', _this => {
          if (!_this.state || _this.state.internalError) return;
          if (_this._headerRequest1) _this._headerRequest1.abort();
          if (_this._headerRequest2) _this._headerRequest2.abort();
          if (!_this._controlsVisibleTimeout) {
            /* since the BdApi is like a child on cocaine, I'll just wrap it in a try catch */
            let reloadFailed = false;
            try {
              BdApi.Plugins.reload(this.name);
            } catch (e) {
              try {
                pluginModule.reloadPlugin(this.name);
              } catch (e) {
                reloadFailed = true;
              }
            }
            XenoLib.Notifications.warning(`[**${this.name}**] Something's not right.. ${reloadFailed ? 'Reloading self failed..' : 'Reloading self.'}`);
          }
          if (_this._controlsVisibleTimeout) _this._controlsVisibleTimeout.stop();
          if (_this._controlsInactiveDelayedCall) _this._controlsInactiveDelayedCall.cancel();
          window.removeEventListener('mousemove', _this.handleMouseMove);
          Dispatcher.unsubscribe('BIV_LOAD_FULLRES', _this._fullresHandler);
        });
        const renderTableEntry = (val1, val2) => React.createElement('tr', {}, React.createElement('td', {}, val1), React.createElement('td', {}, val2));
        Patcher.after(ImageModal.prototype, 'render', (_this, _, ret) => {
          if (!_this.state)
            _this.state = {
              controlsInactive: false,
              controlsVisible: false,
              imageSize: null,
              originalImageSize: null,
              basicImageInfo: null,
              showFullRes: false
            };
          if (this.settings.ui.loadFull) _this.state.showFullRes = true;
          const imageProps = Utilities.getNestedProp(ret, 'props.children.0.props');
          if (imageProps) imageProps.__BIV_full_res = _this.state.showFullRes;
          if (_this.state.internalError) return;
          const settings = this.settings.ui;
          const debug = this.settings.behavior.debug;
          if (!settings.infoResolution && settings.infoScale && settings.infoSize && !debug) return;
          const { basicImageInfo, imageSize, originalImageSize } = _this.state;
          // splice in, otherwise ImageToClipboard freaks out
          ret.props.children.splice(
            1,
            0,
            /* portals are cool o; */
            ReactDOM.createPortal(
              React.createElement(
                'div',
                {
                  className: XenoLib.joinClassNames('BIV-info BIV-info-extra', { 'BIV-hidden': !_this.state.controlsVisible, 'BIV-inactive': _this.state.controlsInactive && !debug }, TextElement.Colors.STANDARD)
                },
                React.createElement('table', {}, settings.infoResolution || debug ? renderTableEntry(basicImageInfo ? React.createElement('span', { className: _this.state.showFullRes ? TextElement.Colors.ERROR : undefined }, `${basicImageInfo.width}x${basicImageInfo.height}`) : 'NaNxNaN', `${_this.props.width}x${_this.props.height}`) : null, settings.infoScale || debug ? renderTableEntry(basicImageInfo ? `${(basicImageInfo.ratio * 100).toFixed(0)}%` : 'NaN%', basicImageInfo ? `${(100 - basicImageInfo.ratio * 100).toFixed(0)}%` : 'NaN%') : null, settings.infoSize || debug ? renderTableEntry(imageSize ? imageSize : 'NaN', originalImageSize ? (originalImageSize === imageSize ? '~' : originalImageSize) : 'NaN') : null, debug ? Object.keys(_this.state).map(key => (!XenoLib._.isObject(_this.state[key]) && key !== 'src' && key !== 'original' && key !== 'placeholder' ? renderTableEntry(key, String(_this.state[key])) : null)) : null)
              ),
              overlayDOMNode
            )
          );
        });
      }

      patchLazyImage() {
        if (NoImageZoom) return;
        const LazyImage = WebpackModules.getByDisplayName('LazyImage');
        const SectionStore = WebpackModules.find(m => m.getSection && !m.getProps);
        const NO_SIDEBAR = 0.666178623635432;
        const SEARCH_SIDEBAR = 0.3601756956193265;
        const MEMBERS_SIDEBAR = 0.49048316246120055;
        // Patcher.instead(LazyImage.prototype, 'handleSidebarChange', (_this, [forced]) => {
        //   const { state } = _this;
        //   if (!DiscordAPI.currentChannel) {
        //     state.__BIV_sidebarMultiplier = null;
        //     return;
        //   }
        //   const section = SectionStore.getSection();
        //   let newMultiplier;
        //   if (section === 'SEARCH') newMultiplier = SEARCH_SIDEBAR;
        //   else if (section !== 'MEMBERS' || (!SelectedGuildStore.getGuildId() && DiscordAPI.currentChannel.type !== 'GROUP_DM')) newMultiplier = NO_SIDEBAR;
        //   else newMultiplier = MEMBERS_SIDEBAR;
        //   if (!forced && newMultiplier !== state.__BIV_sidebarMultiplier) _this.setState({ __BIV_sidebarMultiplier: newMultiplier });
        //   else state.__BIV_sidebarMultiplier = newMultiplier;
        // });
        // Patcher.after(LazyImage.prototype, 'componentDidMount', _this => {
        //   if (typeof _this.props.__BIV_index !== 'undefined' /*  || _this.props.__BIV_isVideo */ || (_this.props.className && _this.props.className.indexOf('embedThumbnail') !== -1)) {
        //     _this.handleSidebarChange = null;
        //     return;
        //   }
        //   _this.handleSidebarChange = _this.handleSidebarChange.bind(_this);
        //   SectionStore.addChangeListener(_this.handleSidebarChange);
        // });
        // Patcher.after(LazyImage.prototype, 'componentWillUnmount', _this => {
        //   if (!_this.handleSidebarChange) return;
        //   SectionStore.removeChangeListener(_this.handleSidebarChange);
        // });
        Patcher.instead(LazyImage.prototype, 'componentDidUpdate', (_this, [props, state]) => {
          /* custom handler, original one caused issues with GIFs not animating */
          const animated = LazyImage.isAnimated(_this.props);
          if (animated !== LazyImage.isAnimated(props)) {
            if (animated) _this.observeVisibility();
            else _this.unobserveVisibility();
          } else if (state.readyState !== _this.state.readyState && animated) _this.observeVisibility();
          else if (!animated) _this.unobserveVisibility();
        });
        // Patcher.before(LazyImage.prototype, 'getRatio', _this => {
        //   if (typeof _this.props.__BIV_index !== 'undefined' /*  || _this.props.__BIV_isVideo */ || (_this.props.className && _this.props.className.indexOf('embedThumbnail') !== -1)) return;
        //   if (typeof _this.state.__BIV_sidebarType === 'undefined') _this.handleSidebarChange(true);
        //   if (_this.state.__BIV_sidebarMultiplier === null) return;
        //   const scale = window.innerWidth / (window.innerWidth * window.devicePixelRatio);
        //   _this.props.maxWidth = Math.max(Math.min(innerWidth * devicePixelRatio * _this.state.__BIV_sidebarMultiplier * (1 + (1 - devicePixelRatio)), _this.props.width * scale), 400);
        //   _this.props.maxHeight = Math.max(Math.min(innerHeight * devicePixelRatio * 0.6777027027027027, _this.props.height * scale), 300);
        // });
        Patcher.instead(LazyImage.prototype, 'getSrc', (_this, [ratio, forcePng], orig) => {
          if (_this.props.__BIV_full_res) return _this.props.src;
          return orig(ratio, forcePng);
        });
        Patcher.after(LazyImage.prototype, 'render', (_this, _, ret) => {
          if (!ret) return;
          if (!this.settings.zoom.enabled || _this.props.onZoom || _this.state.readyState !== 'READY' || _this.props.__BIV_isVideo) return;
          /* fix scaling issues for all images */
          const scale = window.innerWidth / (window.innerWidth * window.devicePixelRatio);
          ret.props.width = ret.props.width * scale;
          ret.props.height = ret.props.height * scale;
          if (_this.props.animated && ret.props.children) {
            /* dirty */
            try {
              ret.props.__BIV_src = ret.props.children({ size: {} }).props.src;
            } catch (e) {
              return;
            }
          }
          ret.type = Image;
          ret.props.__BIV_settings = this.settings.zoom;
          ret.props.__BIV_animated = _this.props.animated;
          ret.props.__BIV_hiddenSettings = this.hiddenSettings;
        });
        Patcher.after(WebpackModules.getByDisplayName('LazyVideo').prototype, 'render', (_, __, ret) => {
          if (!ret) return;
          ret.props.__BIV_isVideo = true;
        });
      }

      patchImageScaling() {
        Patcher.instead(WebpackModules.getByProps('zoomFit'), 'zoomFit', (_, [e, t]) => ImageUtils.zoomFit(e, t));
        Patcher.instead(_ImageUtils, 'getImageSrc', (_, args) => ImageUtils.getImageSrc(...args));
        Patcher.before(_ImageUtils, 'getSizedImageSrc', (_, args) => {
          const toAdd = window.innerWidth / (window.innerWidth * window.devicePixelRatio);
          args[1] *= toAdd;
          args[2] *= toAdd;
        });
      }

      /* PATCHES */

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
      n(e, '1.2.14') && (ZeresPluginLibraryOutdated = !0), n(o, '1.3.17') && (XenoLibOutdated = !0);
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
            h = BdApi.findModuleByDisplayName('Text'),
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
                      children: [BdApi.React.createElement(h, { size: h.Sizes.SIZE_16, children: [`${f} Please click Download Now to download ${d ? 'them' : 'it'}.`] })],
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
