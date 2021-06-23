/**
 * @name InAppNotifications
 * @description Show a notification in Discord when someone sends a message, just like on mobile.
 * @author 1Lighty
 * @authorId 239513071272329217
 * @version 1.1.0
 * @invite NYvWdN5
 * @donate https://paypal.me/lighty13
 * @website https://1lighty.github.io/BetterDiscordStuff/?plugin=InAppNotifications
 * @source https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/InAppNotifications/InAppNotifications.plugin.js
 * @updateUrl https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/InAppNotifications/InAppNotifications.plugin.js
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
 * Copyright © 2019-2020, _Lighty_
 * All rights reserved.
 * Code may not be redistributed, modified or otherwise taken without explicit permission.
 */
module.exports = (() => {
  /* Setup */
  const config = {
    main: 'index.js',
    info: {
      name: 'InAppNotifications',
      authors: [
        {
          name: 'Lighty',
          discord_id: '239513071272329217',
          github_username: 'LightyPon',
          twitter_username: ''
        }
      ],
      version: '1.1.0',
      description: 'Show a notification in Discord when someone sends a message, just like on mobile.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/InAppNotifications/InAppNotifications.plugin.js'
    },
    defaultConfig: [
      {
        name: 'Ignore DND mode',
        id: 'dndIgnore',
        type: 'switch',
        value: true
      },
      {
        name: 'Show notifications from DMs',
        id: 'dms',
        type: 'switch',
        value: true
      },
      {
        name: 'Show notifications from group DMs',
        id: 'groupDMs',
        type: 'switch',
        value: true
      },
      {
        name: 'Show notifications from servers',
        id: 'servers',
        type: 'switch',
        value: true
      },
      {
        name: 'Always show pings',
        note: 'This overrides all settings above except dnd mode',
        id: 'pings',
        type: 'switch',
        value: true
      },
      {
        name: 'Always show notifications for replies',
        note: 'This overrides all settings above except dnd mode, always makes a notification whether it pings you or not',
        id: 'replies',
        type: 'switch',
        value: false
      },
      {
        name: 'Pin reply notifications',
        note: 'Needs option above to work, ensures you can see it',
        id: 'pinReplies',
        type: 'switch',
        value: true
      },
      {
        name: 'Show notifications even when not focused',
        id: 'showNoFocus',
        type: 'switch',
        value: true
      },
      {
        name: 'Spoiler media from NSFW marked channels',
        id: 'spoilerNSFW',
        type: 'switch',
        value: false
      },
      {
        name: 'Spoiler all media',
        id: 'spoilerAll',
        type: 'switch',
        value: false
      },
      {
        name: 'Friend request accept notification',
        note: 'Show a notification when someone accepts your friend request',
        id: 'friendRequestAccept',
        type: 'switch',
        value: true
      },
      {
        name: 'Incoming friend request notification',
        note: 'Show a notification when someone adds you',
        id: 'friendRequestIncoming',
        type: 'switch',
        value: true
      },
      {
        name: 'Bar color',
        id: 'color',
        type: 'color',
        value: '#4a90e2',
        options: {
          defaultColor: '#4a90e2'
        }
      },
      {
        name: 'Set bar color to top role color',
        id: 'roleColor',
        type: 'switch',
        value: true
      },
      {
        name: 'Calculate timeout by number of words',
        note: 'Long text will stay for longer',
        id: 'wpmTimeout',
        type: 'switch',
        value: true
      },
      {
        name: 'Words per minute',
        id: 'wordsPerMinute',
        type: 'slider',
        value: 300,
        min: 50,
        max: 900,
        markers: Array.from(Array(18), (_, i) => (i + 1) * 50),
        stickToMarkers: true
      },
      {
        name: 'Bar color for keyword notifications',
        id: 'keywordColor',
        type: 'color',
        value: '#43b581',
        options: {
          defaultColor: '#43b581'
        }
      },
      {
        name: 'Use other bar color for keyword notifications',
        id: 'useKeywordColor',
        type: 'switch',
        value: true
      },
      {
        name: 'Pin keyword notifications',
        note: 'Keyword notifications will not auto close',
        id: 'pinKeyword',
        type: 'switch',
        value: true
      },
      {
        name: 'Keyword notifications',
        note: 'Show a notification if it matches a keyword',
        id: 'keywords',
        type: 'keywords',
        value: []
      },
      {
        name: 'User ID blacklist',
        note: 'Ignore notifications from certain users via ID',
        id: 'userIds',
        type: 'ids',
        value: []
      },
      {
        name: 'Channel ID blacklist',
        note: 'Ignore notifications from certain channels via ID',
        id: 'channelIds',
        type: 'ids',
        value: []
      },
      {
        name: 'Server ID blacklist',
        note: 'Ignore notifications from certain servers via ID',
        id: 'serverIds',
        type: 'ids',
        value: []
      },
      {
        type: 'note'
      }
    ],
    changelog: [
      {
        title: 'added',
        type: 'added',
        items: [
          'Added option for keyword notifications to have a different color (on by default).',
          'Added option to pin keyword notifications (on by default).',
          'Added option to pin reply notifications (on by default).',
          'Added option to spoiler media coming from NSFW marked channels (off by default).',
          'Added option to spoiler all media (off by default).',
          'Now respects your spoiler settings, so if you turned off spoilers, it should not display any spoilers now.',
          'Fixed notifications appearing whenever they felt like it apparently.',
          'Also fixed a bug when you updated from the wannabe plugin by an unnamed developer to mine.',
          '<:wack:600391312197550090>'
        ]
      }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { ContextMenu, EmulatedTooltip, Toasts, Settings, Popouts, Modals, Utilities, WebpackModules, Filters, DiscordModules, ColorConverter, DOMTools, DiscordClasses, DiscordSelectors, ReactTools, ReactComponents, DiscordAPI, Logger, PluginUpdater, PluginUtilities, DiscordClassModules, Structs } = Api;
    const { React, ModalStack, ContextMenuActions, ContextMenuItem, ContextMenuItemsGroup, ReactDOM, GuildStore, UserStore, DiscordConstants, Dispatcher, GuildMemberStore, GuildActions, SwitchRow, EmojiUtils, RadioGroup, Permissions, FlexChild, PopoutOpener, Textbox, RelationshipStore, WindowInfo, UserSettingsStore, NavigationUtils, UserNameResolver, SelectedChannelStore, PrivateChannelActions } = DiscordModules;

    const Patcher = XenoLib.createSmartPatcher(Api.Patcher);

    const ChannelStore = WebpackModules.getByProps('getChannel', 'getDMFromUserId');

    const LurkerStore = WebpackModules.getByProps('isLurking');
    const MuteStore = WebpackModules.getByProps('allowNoMessages');
    const isMentionedUtils = WebpackModules.getByProps('isRawMessageMentioned');
    const ParserModule = WebpackModules.getByProps('astParserFor', 'parse');
    const MessageClasses = WebpackModules.getByProps('username', 'messageContent');
    const MarkupClassname = XenoLib.getClass('markup');
    const { Messages } = WebpackModules.getByProps('Messages') || {};
    const SysMessageUtils = WebpackModules.getByProps('getSystemMessageUserJoin', 'stringify');
    const MessageParseUtils = (WebpackModules.getByProps('parseAndRebuild', 'default') || {}).default;
    const CUser = WebpackModules.getByPrototypes('getAvatarSource', 'isLocalBot');
    const TextElement = WebpackModules.getByDisplayName('Text');
    const MessageComponent = WebpackModules.getByProps('MessageAccessories');
    const MessageActionCreators = WebpackModules.getByProps('createMessageRecord');
    const PlainTextUtils = WebpackModules.getByProps('isPlaintextPreviewableFile');
    const TextInput = WebpackModules.getByDisplayName('TextInput');
    const Switch = WebpackModules.getByDisplayName('Switch');
    const { default: Scroller } = WebpackModules.find(e => e.hasOwnProperty('ScrollEvent')) || {};
    const { TooltipContainer } = WebpackModules.getByProps('TooltipContainer') || {};
    const TimestampUtils = WebpackModules.getByProps('fromTimestamp');
    const FormText = WebpackModules.getByDisplayName('FormText');
    // const OverflowMenu = WebpackModules.getByDisplayName('OverflowMenu');
    const Button = WebpackModules.getByProps('Colors', 'Hovers', 'Looks', 'Sizes', 'Link');
    const AckUtils = WebpackModules.getByProps('ack', 'bulkAck');
    const UnreadStore = WebpackModules.getByProps('hasUnread', 'getMentionCount');
    const { SpoilerDisplayContext } = WebpackModules.getByProps('SpoilerDisplayContext') || {};
    const PermissionsStore = WebpackModules.getByProps('can', 'canManageUser');
    const shouldRenderSpoilers = WebpackModules.getByString('SpoilerRenderSetting.ON_CLICK');


    function PlusAlt(props) {
      return React.createElement('svg', { width: 24, height: 24, viewBox: '0 0 18 18', ...props }, React.createElement('polygon', { fill: 'currentColor', points: '15 10 10 10 10 15 8 15 8 10 3 10 3 8 8 8 8 3 10 3 10 8 15 8' }));
    }

    function CloseButton(props) {
      return React.createElement('svg', { width: 24, height: 24, viewBox: '0 0 24 24', ...props }, React.createElement('path', { fill: 'currentColor', d: 'M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z' }));
    }

    class KeywordItem extends React.PureComponent {
      constructor(props) {
        super(props);
        this.onTextChange = this.onTextChange.bind(this);
        this.onSwitchChange = this.onSwitchChange.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleRemove = this.handleRemove.bind(this);
        this.state = {
          value: props.keyword,
          caseSensitive: props.caseSensitive
        };
      }
      onTextChange(value) {
        this.setState({ value });
      }
      onSwitchChange(caseSensitive) {
        this.setState({ caseSensitive });
        this.handleBlur();
      }
      handleKeyPress(e) {
        if (e.which === 13) e.currentTarget.blur();
      }
      handleBlur() {
        this.props.onSave(this.state.value, this.state.caseSensitive, this.props.id);
      }
      handleRemove() {
        this.props.onRemove(this.props.id);
      }
      render() {
        /* eslint-disable function-call-argument-newline */
        /* eslint-disable indent */
        return (
          // eslint-disable-next-line function-paren-newline
          React.createElement(FlexChild, { className: 'IAN-item-wrapper', align: FlexChild.Align.CENTER },
            // eslint-disable-next-line function-paren-newline
            React.createElement(FlexChild, { className: 'positionRelative-3HNyhz', style: { width: '100%' } },
              React.createElement(TextInput, {
                autoFocus: false,
                disabled: false,
                maxLength: 999,
                onChange: this.onTextChange,
                onKeyPress: this.handleKeyPress,
                onBlur: this.handleBlur,
                size: 'mini',
                type: 'text',
                value: this.state.value,
                className: 'IAN-maxWidth IAN-inputInvisWrapepr',
                inputClassName: 'IAN-inputInvis'
              }),
              React.createElement('div', { className: 'IAN-inputText' }, this.state.value)
            ),
            // eslint-disable-next-line function-paren-newline
            React.createElement(FlexChild, { align: FlexChild.Align.CENTER, style: { margin: 0 } },
            // eslint-disable-next-line function-paren-newline
              React.createElement(TooltipContainer, { hideOnClick: false, text: this.state.caseSensitive ? 'Case sensitive' : 'Case insensitive' },
                React.createElement(Switch, {
                  onChange: this.onSwitchChange,
                  checked: this.state.caseSensitive
                })
              )
            ),
            // eslint-disable-next-line function-paren-newline
            React.createElement(FlexChild, { align: FlexChild.Align.CENTER, style: { marginLeft: 0 } },
              React.createElement(Button, { size: Button.Sizes.MIN, color: Button.Colors.GREY, look: Button.Looks.BLANK, className: 'IAN-sideButton', onClick: this.handleRemove }, React.createElement(CloseButton))
            )
          )
        );
        /* eslint-enable function-call-argument-newline */
        /* eslint-enable indent */
      }
    }

    class KeywordsComponent extends React.PureComponent {
      constructor(props) {
        super(props);
        this.onTextChange = this.onTextChange.bind(this);
        this.onSwitchChange = this.onSwitchChange.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.handleSave = this.handleSave.bind(this);
        this.handleSaveButton = this.handleSaveButton.bind(this);
        this.handleRemoveItem = this.handleRemoveItem.bind(this);
        this.state = {
          value: '',
          caseSensitive: false,
          items: props.value
        };
      }
      onTextChange(value) {
        this.setState({ value });
      }
      onSwitchChange(caseSensitive) {
        this.setState({ caseSensitive });
      }
      handleKeyPress(e) {
        if (e.which !== 13) return;
        this.handleSave();
      }
      handleSave(keyword = this.state.value, caseSensitive = this.state.caseSensitive, id = TimestampUtils.fromTimestamp(Date.now())) {
        keyword = keyword.trim();
        let found = true;
        const item = this.state.items.find(e => e.id === id) || (found = false, {});
        if (!keyword) {
          if (found) this.handleRemoveItem(id);
          return;
        }
        item.keyword = keyword;
        item.caseSensitive = caseSensitive;
        item.id = id;
        if (!found) this.state.items.unshift(item);
        this.props.onChange(this.state.items);
        if (!found) this.setState({ value: '', caseSensitive: false });
      }
      handleSaveButton() {
        this.handleSave();
      }
      handleRemoveItem(id) {
        const idx = this.state.items.findIndex(e => e.id === id);
        if (idx === -1) return;
        this.state.items.splice(idx, 1);
        this.props.onChange(this.state.items);
        this.forceUpdate();
      }
      render() {
        /* eslint-disable function-call-argument-newline */
        /* eslint-disable indent */
        return [
          React.createElement(FormText, { type: 'description' }, this.props.subTitle),
          // eslint-disable-next-line function-paren-newline
          React.createElement(FlexChild, { direction: FlexChild.Direction.VERTICAL, className: 'IAN-items-wrapper' },
          // eslint-disable-next-line function-paren-newline
            React.createElement(FlexChild, { style: { marginRight: 16 } },
              React.createElement(TextInput, {
                autoFocus: false,
                disabled: false,
                maxLength: 999,
                onChange: this.onTextChange,
                onKeyPress: this.handleKeyPress,
                size: 'default',
                type: 'text',
                value: this.state.value,
                className: 'IAN-maxWidth'
              }),
              // eslint-disable-next-line function-paren-newline
              React.createElement(FlexChild, { align: FlexChild.Align.CENTER, style: { marginRight: 0 } },
              // eslint-disable-next-line function-paren-newline
                React.createElement(TooltipContainer, { hideOnClick: false, text: this.state.caseSensitive ? 'Case sensitive' : 'Case insensitive' },
                  React.createElement(Switch, {
                    onChange: this.onSwitchChange,
                    checked: this.state.caseSensitive
                  })
                )
              ),
              // eslint-disable-next-line function-paren-newline
              React.createElement(FlexChild, { align: FlexChild.Align.CENTER, style: { marginLeft: 0 } },
                React.createElement(Button, { size: Button.Sizes.MIN, color: Button.Colors.GREY, look: Button.Looks.BLANK, className: 'IAN-sideButton', onClick: this.handleSaveButton }, React.createElement(PlusAlt))
              )
            ),
            // eslint-disable-next-line function-paren-newline
            React.createElement(Scroller, { className: 'IAN-itemsScroller' }, this.state.items.map(e => React.createElement(KeywordItem, { key: e.id, onSave: this.handleSave, onRemove: this.handleRemoveItem, ...e })))
          )
        ];
        /* eslint-enable function-call-argument-newline */
        /* eslint-enable indent */
      }
    }

    class Keywords extends Settings.SettingField {
      constructor(name, note, value, onChange) {
        super(name, '', onChange, KeywordsComponent, {
          onChange: reactElement => keywords => {
            this.onChange(keywords);
          },
          value,
          subTitle: note
        });
      }
    }

    class SomeIDItem extends React.PureComponent {
      constructor(props) {
        super(props);
        this.onTextChange = this.onTextChange.bind(this);
        this.handleBlur = this.handleBlur.bind(this);
        this.handleRemove = this.handleRemove.bind(this);
        this.state = {
          value: props.someId
        };
      }
      onTextChange(value) {
        this.setState({ value });
      }
      handleKeyPress(e) {
        if (e.which === 13) e.currentTarget.blur();
      }
      handleBlur() {
        this.props.onSave(this.state.value, this.props.id);
      }
      handleRemove() {
        this.props.onRemove(this.props.id);
      }
      render() {
        /* eslint-disable function-call-argument-newline */
        /* eslint-disable indent */
        return (
          // eslint-disable-next-line function-paren-newline
          React.createElement(FlexChild, { className: 'IAN-item-wrapper', align: FlexChild.Align.CENTER },
            // eslint-disable-next-line function-paren-newline
            React.createElement(FlexChild, { className: 'positionRelative-3HNyhz', style: { width: '100%' } },
              React.createElement(TextInput, {
                autoFocus: false,
                disabled: false,
                maxLength: 999,
                onChange: this.onTextChange,
                onKeyPress: this.handleKeyPress,
                onBlur: this.handleBlur,
                size: 'mini',
                type: 'text',
                value: this.state.value,
                className: 'IAN-maxWidth IAN-inputInvisWrapepr',
                inputClassName: 'IAN-inputInvis'
              }),
              React.createElement('div', { className: 'IAN-inputText' }, this.state.value)
            ),
            // eslint-disable-next-line function-paren-newline
            React.createElement(FlexChild, { align: FlexChild.Align.CENTER, style: { marginLeft: 0 } },
              React.createElement(Button, { size: Button.Sizes.MIN, color: Button.Colors.GREY, look: Button.Looks.BLANK, className: 'IAN-sideButton', onClick: this.handleRemove }, React.createElement(CloseButton))
            )
          )
        );
        /* eslint-enable function-call-argument-newline */
        /* eslint-enable indent */
      }
    }

    class SomeIDsComponent extends React.PureComponent {
      constructor(props) {
        super(props);
        this.onTextChange = this.onTextChange.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.handleSave = this.handleSave.bind(this);
        this.handleSaveButton = this.handleSaveButton.bind(this);
        this.handleRemoveItem = this.handleRemoveItem.bind(this);
        this.state = {
          value: '',
          items: props.value
        };
      }
      onTextChange(value) {
        this.setState({ value });
      }
      handleKeyPress(e) {
        if (e.which !== 13) return;
        this.handleSave();
      }
      handleSave(someId = this.state.value, id = TimestampUtils.fromTimestamp(Date.now())) {
        someId = someId.trim();
        let found = true;
        const item = this.state.items.find(e => e.id === id) || (found = false, {});
        if (!someId) {
          if (found) this.handleRemoveItem(id);
          return;
        }
        item.someId = someId;
        item.id = id;
        if (!found) this.state.items.unshift(item);
        this.props.onChange(this.state.items);
        if (!found) this.setState({ value: '' });
      }
      handleSaveButton() {
        this.handleSave();
      }
      handleRemoveItem(id) {
        const idx = this.state.items.findIndex(e => e.id === id);
        if (idx === -1) return;
        this.state.items.splice(idx, 1);
        this.props.onChange(this.state.items);
        this.forceUpdate();
      }
      render() {
        /* eslint-disable function-call-argument-newline */
        /* eslint-disable indent */
        return [
          React.createElement(FormText, { type: 'description' }, this.props.subTitle),
          // eslint-disable-next-line function-paren-newline
          React.createElement(FlexChild, { direction: FlexChild.Direction.VERTICAL, className: 'IAN-items-wrapper' },
          // eslint-disable-next-line function-paren-newline
            React.createElement(FlexChild, { style: { marginRight: 16 } },
              React.createElement(TextInput, {
                autoFocus: false,
                disabled: false,
                maxLength: 999,
                onChange: this.onTextChange,
                onKeyPress: this.handleKeyPress,
                size: 'default',
                type: 'text',
                value: this.state.value,
                className: 'IAN-maxWidth'
              }),
              // eslint-disable-next-line function-paren-newline
              React.createElement(FlexChild, { align: FlexChild.Align.CENTER, style: { marginLeft: 0 } },
                React.createElement(Button, { size: Button.Sizes.MIN, color: Button.Colors.GREY, look: Button.Looks.BLANK, className: 'IAN-sideButton', onClick: this.handleSaveButton }, React.createElement(PlusAlt))
              )
            ),
            // eslint-disable-next-line function-paren-newline
            React.createElement(Scroller, { className: 'IAN-itemsScroller' }, this.state.items.map(e => React.createElement(SomeIDItem, { key: e.id, onSave: this.handleSave, onRemove: this.handleRemoveItem, ...e })))
          )
        ];
        /* eslint-enable function-call-argument-newline */
        /* eslint-enable indent */
      }
    }

    class SomeIDs extends Settings.SettingField {
      constructor(name, note, value, onChange) {
        super(name, '', onChange, SomeIDsComponent, {
          onChange: reactElement => ids => {
            this.onChange(ids);
          },
          value,
          subTitle: note
        });
      }
    }

    class ExtraText extends Settings.SettingField {
      constructor(name, note) {
        super(name, note, null, TextElement, {
          children: 'To change the position or backdrop background color of the notifications, check XenoLib settings.'
        });
      }
    }

    const currentChannel = _ => {
      const channel = ChannelStore.getChannel(SelectedChannelStore.getChannelId());
      return channel ? Structs.Channel.from(channel) : null;
    };

    const MessageRenderers = WebpackModules.getByProps('renderImageComponent');
    const ImageUtils = WebpackModules.getByProps('fit', 'getRatio');

    const IMAGE_RE = /\.(png|jpe?g|webp|gif)$/i;
    const VIDEO_RE = /\.(mp4|webm|mov)$/i;
    const AUDIO_RE = /\.(mp3|m4a|ogg|wav|flac)$/i;

    class MessageAccessories extends (MessageComponent && MessageComponent.MessageAccessories || React.PureComponent) {
      constructor(props) {
        super(props);
        this.renderImageComponent = this.renderImageComponent.bind(this);
        this.renderVideoComponent = this.renderVideoComponent.bind(this);
        this.setContainerRef = this.setContainerRef.bind(this);
      }
      renderImageComponent(props) {
        const { width, height } = ImageUtils.fit(props.width, props.height, this.state.__IAN_maxWidth || 290, props.height);
        props.width = width;
        props.height = height;
        props.__BIV_embed = true;
        return MessageRenderers.renderImageComponent(props);
      }
      renderVideoComponent(props) {
        const { width, height } = ImageUtils.fit(props.width, props.height, this.state.__IAN_maxWidth || 290, props.height);
        props.width = width;
        props.height = height;
        props.__BIV_embed = true;
        return MessageRenderers.renderVideoComponent(props);
      }
      renderAttachments(e) {
        const ret = super.renderAttachments(e);
        if (!ret) return ret;
        const finalRet = [];
        let files = 0;
        let textFiles = 0;
        const images = 0;
        const videos = 0;
        for (const item of ret) {
          const props = Utilities.findInReactTree(ret, e => e && e.attachment && typeof e.attachment.content_type === 'string');
          props.renderImageComponent = this.renderImageComponent;
          props.renderVideoComponent = this.renderVideoComponent;
          props.__IAN_spoilerAll = this.props.spoilerAll;
          const { attachment } = props;
          if ((IMAGE_RE.test(attachment.filename) && attachment.width > 0 && attachment.width > 0) || (VIDEO_RE.test(attachment.filename) && attachment.proxy_url)) {
            finalRet.push(item);
            break;
            /* } else if (AUDIO_RE.test(attachment.filename)) { */
          } else if (PlainTextUtils.isPlaintextPreviewableFile(attachment.filename)) {
            textFiles++;
            finalRet.push(item);
            break;
          } else {
            files++;
            finalRet.push(item);
            if (files >= 3) break;
            if (textFiles && files >= 2) break;
          }
        }
        const remaining = ret.length - finalRet.length;
        if (remaining) finalRet.push(React.createElement('div', {
          className: 'messageAttachment-1aDidq',
          style: {
            width: '100%'
          }
        }, React.createElement('div', {
          className: 'attachment-33OFj0',
          style: {
            textAlign: 'center',
            padding: 5
          }
        }, React.createElement('div', {
          style: {
            borderRadius: 12
          }
        }, remaining === 1 ? '1 more attachment' : `${remaining} more attachments`))));

        return finalRet;
      }
      renderEmbeds(e) {
        const ret = super.renderEmbeds(e);
        if (!ret) return ret;
        const finalRet = [];
        for (const item of ret) {
          const embed = Utilities.findInReactTree(item, e => e && typeof e.maxMediaHeight !== 'undefined');
          if (!embed) continue;
          const { width, height } = ImageUtils.fit(embed.maxMediaWidth, embed.maxMediaHeight, this.state.__IAN_maxWidth ? this.state.__IAN_maxWidth - 25 : 275, embed.maxMediaHeight);
          embed.maxMediaWidth = width;
          embed.maxMediaHeight = height;
          embed.spoiler = this.props.spoilerAll;
          finalRet.push(item);
          break;
        }
        const remaining = ret.length - finalRet.length;
        if (remaining) finalRet.push(React.createElement('div', {
          className: 'messageAttachment-1aDidq',
          style: {
            width: '100%'
          }
        }, React.createElement('div', {
          className: 'attachment-33OFj0',
          style: {
            textAlign: 'center',
            padding: 5
          }
        }, React.createElement('div', {
          style: {
            borderRadius: 12
          }
        }, remaining === 1 ? '1 more embed' : `${remaining} more embeds`))));

        return finalRet;
      }
      setContainerRef(ref) {
        if (!ref) return;
        this.setState({
          __IAN_maxWidth: ref.offsetWidth
        });
      }
      handleOnClick(e) {
        e.stopPropagation();
      }
      render() {
        if (!super.render) return 'MessageAccessories could not be found!';
        const ret = super.render();
        if (ret) {
          ret.ref = this.setContainerRef;
          ret.props.onClick = this.handleOnClick;
        }
        return ret;
      }
    }

    const FriendsSectionSetter = WebpackModules.find(e => e.setSection && ~e.setSection.toString().indexOf('FRIENDS_SET_SECTION'));

    const RetTypes = {
      REPLY: 'reply',
      KEYWORD: 'keyword'
    };

    return class InAppNotifications extends Plugin {
      constructor() {
        super();
        /*
         * why are we letting Zere, the braindead American let control BD when he can't even
         * fucking read clearly documented and well known standards, such as __filename being
         * the files full fucking path and not just the filename itself, IS IT REALLY SO HARD
         * TO FUCKING READ?! https://nodejs.org/api/modules.html#modules_filename
         */
        const _zerecantcode_path = require('path');
        const theActualFileNameZere = _zerecantcode_path.join(__dirname, _zerecantcode_path.basename(__filename));
        XenoLib.changeName(theActualFileNameZere, 'InAppNotifications');
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
            } catch (e) { }
          }
        };
        const oMESSAGE_CREATE = this.MESSAGE_CREATE.bind(this);
        this.MESSAGE_CREATE = e => {
          try {
            oMESSAGE_CREATE(e);
          } catch (e) {
            this.errorCount++;
            if (this.errorCount >= 10) {
              Logger.stacktrace('Error in MESSAGE_CREATE dispatch handler', e);
              PluginUpdater.checkForUpdate(this.name, this.version, this._config.info.github_raw);
              XenoLib.Notifications.error(`[**${this.name}**] Plugin is throwing errors and is in a broken state, please update it or ${GuildStore.getGuild(XenoLib.supportServerId) ? 'go to <#639665366380838924>' : '[join my support server](https://discord.gg/NYvWdN5)'} for further assistance.`, { timeout: 0 });
              try {
                this.onStop();
              } catch (e) { }
            }
          }
        };
        this.events = ['MESSAGE_CREATE', 'MESSAGE_UPDATE', 'FRIEND_REQUEST_ACCEPTED', 'RELATIONSHIP_ADD', 'CHANNEL_SELECT'];
        this.handleUnreadsChanged = this.handleUnreadsChanged.bind(this);
        for (const event of this.events) this[event] = Utilities.suppressErrors(this[event].bind(this), `${event} listener`);
        try {
          WebpackModules.getByProps('openModal', 'hasModalOpen').closeModal(`${this.name}_DEP_MODAL`);
        } catch (e) { }
      }
      onStart() {
        if (window.Lightcord || window.LightCord || window.LightNative) return XenoLib.Notifications.warning(`[${this.getName()}] Lightcord is an unofficial and unsafe client with stolen code that is falsely advertising that it is safe, Lightcord has allowed the spread of token loggers hidden within plugins redistributed by them, and these plugins are not made to work on it. Your account is very likely compromised by malicious people redistributing other peoples plugins, especially if you didn't download this plugin from [GitHub](https://github.com/1Lighty/BetterDiscordPlugins/edit/master/Plugins/MessageLoggerV2/MessageLoggerV2.plugin.js), you should change your password immediately. Consider using a trusted client mod like [BandagedBD](https://rauenzi.github.io/BetterDiscordApp/) or [Powercord](https://powercord.dev/) to avoid losing your account.`, { timeout: 0 });
        try {
          /* do not, under any circumstances, let this kill the plugin */
          const CUSTOM_RULES = XenoLib._.cloneDeep(WebpackModules.getByProps('RULES').RULES);
          for (const rule of Object.keys(CUSTOM_RULES)) CUSTOM_RULES[rule].raw = null;
          for (const rule of ['paragraph', 'text', 'codeBlock', 'emoji', 'inlineCode']) CUSTOM_RULES[rule].raw = e => e.content;
          for (const rule of ['autolink', 'br', 'link', 'newline', 'url']) delete CUSTOM_RULES[rule];
          for (const rule of ['blockQuote', 'channel', 'em', 'mention', 'roleMention', 's', 'spoiler', 'strong', 'u']) CUSTOM_RULES[rule].raw = (e, t, n) => t(e.content, n);
          CUSTOM_RULES.customEmoji.raw = e => e.name;
          const astTools = WebpackModules.getByProps('flattenAst');
          const SimpleMarkdown = WebpackModules.getByProps('parserFor', 'outputFor');
          const parser = SimpleMarkdown.parserFor(CUSTOM_RULES);
          const render = SimpleMarkdown.htmlFor(SimpleMarkdown.ruleOutput(CUSTOM_RULES, 'raw'));
          this._timeUnparser = (e = '', r = true, a = {}) => render(astTools.constrainAst(astTools.flattenAst(parser(e, { inline: r, ...a }))));
        } catch (err) {
          Logger.stacktrace('Failed to create custom unparser', err);
          this._timeUnparser = null;
        }

        if (!Array.isArray(this.settings.keywords)) this.settings.keywords = [];

        this.n10nMap = {};

        this.errorCount = 0;
        for (const event of this.events) Dispatcher.subscribe(event, this[event]);
        // UnreadStore.addChangeListener(this.handleUnreadsChanged);
        const o = Error.captureStackTrace;
        const ol = Error.stackTraceLimit;
        Error.stackTraceLimit = 0;
        try {
          const check1 = a => a[0] === 'L' && a[3] === 'h' && a[7] === 'r';
          const check2 = a => a.length === 13 && a[0] === 'B' && a[7] === 'i' && a[12] === 'd';
          const mod = WebpackModules.find(e => Object.keys(e).findIndex(check1) !== -1) || {};
          (Utilities.getNestedProp(mod, `${Object.keys(mod).find(check1)}.${Object.keys(Utilities.getNestedProp(mod, Object.keys(window).find(check1) || '') || {}).find(check2)}.Utils.removeDa`) || DiscordConstants.NOOP)({});
        } finally {
          Error.stackTraceLimit = ol;
          Error.captureStackTrace = o;
        }
        this.patchAll();
        PluginUtilities.addStyle(
          `${this.short }-CSS`,
          `
          .IAN-message {
            padding-left: 40px;
            position: relative;
            min-height: 36px;
            pointer-events: none;
          }
          .IAN-message .IAN-avatar {
            left: -2px;
            pointer-events: none;
            width: 32px;
            height: 32px;
            top: 0;
            position: absolute;
            border-radius: 50%;
          }
          .IAN-message > .${MessageClasses.username.split(' ')[0]} {
            font-size: 0.9rem;
            line-height: unset;
            display: block;
          }
          .IAN-message > .${MarkupClassname.split(' ')[0]} {
            line-height: unset;
          }
          .IAN-message {
            max-height: calc(100vh - 150px);
          }
          .IAN-message > .${MarkupClassname.split(' ')[0]}, .IAN-message > .${MessageClasses.username.split(' ')[0]} {
            overflow: hidden
          }
          .IAN-message .container-1ov-mD > .embedWrapper-lXpS3L,
          .IAN-message .messageAttachment-1aDidq .wrapper-2TxpI8,
          .IAN-message .messageAttachment-1aDidq .attachment-33OFj0,
          .IAN-message .messageAttachment-1aDidq .container-1pMiXm,
          .IAN-message .container-1ov-mD .spoilerContainer-331r0R:not([aria-expanded="true"]),
          .IAN-message .${MarkupClassname.split(' ')[0]} .spoilerText-3p6IlD.hidden-HHr2R9  {
            pointer-events: all;
          }
          .IAN-message .messageAttachment-1aDidq .codeView-1JPDeA {
            max-height: 25vh;
          }
          .IAN-message .messageAttachment-1aDidq,
          .IAN-message .embedWrapper-lXpS3L:not(.spoiler-1PPAUc):not(.embedMedia-1guQoW) {
            width: 100% !important;
          }
          .IAN-message .container-1ov-mD,
          .IAN-message > .${MarkupClassname.split(' ')[0]} {
            margin-top: 5px;
          }
          .IAN-maxWidth {
            width: 100%;
          }
          .IAN-sideButton {
            width: 40px;
            min-height: 38px;
            color: var(--interactive-normal);
          }
          .IAN-items-wrapper {
            padding: 10px;
            padding-right: 0;
            background-color: var(--background-secondary);
          }
          .IAN-item-wrapper {
            padding-top: 5px;
          }
          .IAN-inputInvisWrapepr {
            z-index: 1;
          }
          .IAN-item-wrapper .IAN-inputInvis {
            opacity: 0;
            transition: opacity .1s ease-in-out, border-color .2s ease-in-out;
          }
          .IAN-item-wrapper:hover .IAN-inputInvis,
          .IAN-item-wrapper .IAN-inputInvis:focus {
            opacity: 1;
          }
          .IAN-inputText {
            position: absolute;
            line-height: 16px;
            padding: 5px 8px;
            height: 26px;
            color: var(--text-normal);
          }
          .IAN-itemsScroller {
            max-height: 220px;
          }
        `
        );
      }

      onStop() {
        for (const event of this.events) Dispatcher.unsubscribe(event, this[event]);
        // UnreadStore.removeChangeListener(this.handleUnreadsChanged);
        Patcher.unpatchAll();
        PluginUtilities.removeStyle(`${this.short }-CSS`);
      }

      buildSetting(data) {
        switch (data.type) {
          case 'note': return new ExtraText('', '');
          case 'keywords': {
            return new Keywords(data.name, data.note, data.value, data.onChange);
            break;
          }
          case 'ids': {
            return new SomeIDs(data.name, data.note, data.value, data.onChange);
            break;
          }
        }

        return XenoLib.buildSetting(data);
      }

      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
      escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
      }

      shouldNotify(message, iChannel, iAuthor) {
        if (!DiscordAPI.currentUser || !iChannel || !iAuthor) return false;
        if (!this.settings.showNoFocus && !WindowInfo.isFocused()) return false;
        const ciChannel = currentChannel();
        const cUID = DiscordAPI.currentUser.id;
        if (ciChannel && ciChannel.id === iChannel.id) return false; // ignore if channel is open
        if (iChannel.isManaged()) return false; // not sure what managed channels are.. System maybe?
        const guildId = iChannel.getGuildId();
        if (guildId && LurkerStore.isLurking(guildId)) return false; // ignore servers you're lurking in
        if (iAuthor.id === cUID || RelationshipStore.isBlocked(iAuthor.id)) return false; // ignore if from self or if it's a blocked user
        if (!this.settings.dndIgnore && UserSettingsStore.status === DiscordConstants.StatusTypes.DND) return false; // ignore if in DND mode and settings allow
        if (this.settings.pings && ~message.mentions.map(e => (typeof e !== 'string' ? e.id : e)).indexOf(cUID)) return true; // if mentioned, always show notification
        if (this.settings.replies && message.referenced_message && message.referenced_message.author && message.referenced_message.author.id === cUID && ~message.referenced_message.mentions.map(e => (typeof e !== 'string' ? e.id : e)).indexOf(cUID)) return RetTypes.REPLY; // always show notifications for replies
        if (this.settings.userIds.length) if (~this.settings.userIds.findIndex(e => e.someId === iAuthor.id)) return false;
        if (this.settings.channelIds.length) if (~this.settings.channelIds.findIndex(e => e.someId === iChannel.id)) return false;
        if (guildId && this.settings.serverIds.length) if (~this.settings.serverIds.findIndex(e => e.someId === guildId)) return false;
        if (this.settings.keywords.length) for (const { keyword, caseSensitive } of this.settings.keywords) if ((new RegExp(this.escapeRegExp(keyword), caseSensitive ? 'g' : 'gi')).test(message.content)) return RetTypes.KEYWORD;
        if (iChannel.type === DiscordConstants.ChannelTypes.DM && !this.settings.dms) return false;
        if (iChannel.type === DiscordConstants.ChannelTypes.GROUP_DM && !this.settings.groupDMs) return false;
        if ((iChannel.type === DiscordConstants.ChannelTypes.GUILD_ANNOUNCEMENT || iChannel.type === DiscordConstants.ChannelTypes.GUILD_TEXT) && !this.settings.servers) return false;
        if (MuteStore.allowAllMessages(iChannel)) return true;// channel has notif settings set to all messages
        return isMentionedUtils.isRawMessageMentioned(message, cUID, MuteStore.isSuppressEveryoneEnabled(guildId), MuteStore.isSuppressRolesEnabled(iChannel.guild_id));
      }

      getChannelName(iChannel, iAuthor) {
        switch (iChannel.type) {
          case DiscordConstants.ChannelTypes.GROUP_DM:
            if (iChannel.name !== '') return iChannel.name;
            const recipients = iChannel.recipients.map(e => (e === iAuthor.id ? iAuthor : UserStore.getUser(e))).filter(e => e);
            return recipients.length > 0 ? recipients.map(e => e.username).join(', ') : Messages.UNNAMED;
          case DiscordConstants.ChannelTypes.GUILD_ANNOUNCEMENT:
          case DiscordConstants.ChannelTypes.GUILD_TEXT:
            return `#${ iChannel.name}`;
          default:
            return iChannel.name;
        }
      }

      getActivity(e, t, n, r) {
        switch (e.type) {
          case DiscordConstants.ChannelTypes.GUILD_ANNOUNCEMENT:
          case DiscordConstants.ChannelTypes.GUILD_TEXT:
            return t;
          case DiscordConstants.ChannelTypes.GROUP_DM:
            return n;
          case DiscordConstants.ChannelTypes.DM:
          default:
            return r;
        }
      }

      makeTextChatNotification(iChannel, message, iAuthor) {
        const author = UserNameResolver.getName(iChannel.guild_id, iChannel.id, iAuthor);
        let channel = author;
        switch (iChannel.type) {
          case DiscordConstants.ChannelTypes.GUILD_ANNOUNCEMENT:
          case DiscordConstants.ChannelTypes.GUILD_TEXT:
            const iGuild = GuildStore.getGuild(iChannel.guild_id);
            if (message.type === DiscordConstants.MessageTypes.DEFAULT || iGuild) channel += ` (${this.getChannelName(iChannel)}, ${iGuild.name})`;
            break;
          case DiscordConstants.ChannelTypes.GROUP_DM:
            const newChannel = this.getChannelName(iChannel, iAuthor);
            if (!iChannel.isManaged() || !iAuthor.bot || channel !== newChannel) channel += ` (${newChannel})`;
        }
        let d = message.content;
        if (message.activity && message.application) {
          const targetMessage = message.activity.type === DiscordConstants.ActivityActionTypes.JOIN ? this.getActivity(iChannel, Messages.NOTIFICATION_MESSAGE_CREATE_GUILD_ACTIVITY_JOIN, Messages.NOTIFICATION_MESSAGE_CREATE_GROUP_DM_ACTIVITY_JOIN, Messages.NOTIFICATION_MESSAGE_CREATE_DM_ACTIVITY_JOIN) : this.getActivity(iChannel, Messages.NOTIFICATION_MESSAGE_CREATE_GUILD_ACTIVITY_SPECTATE, Messages.NOTIFICATION_MESSAGE_CREATE_GROUP_DM_ACTIVITY_SPECTATE, Messages.NOTIFICATION_MESSAGE_CREATE_DM_ACTIVITY_SPECTATE);
          d = targetMessage.format({ user: author, game: message.application.name });
        } else if (message.activity && message.activity.type === DiscordConstants.ActivityActionTypes.LISTEN) {
          const targetMessage = this.getActivity(iChannel, Messages.NOTIFICATION_MESSAGE_CREATE_GUILD_ACTIVITY_LISTEN, Messages.NOTIFICATION_MESSAGE_CREATE_GROUP_DM_ACTIVITY_LISTEN, Messages.NOTIFICATION_MESSAGE_CREATE_DM_ACTIVITY_LISTEN);
          d = targetMessage.format({ user: author });
        } else if (message.type !== DiscordConstants.MessageTypes.DEFAULT && message.type !== DiscordConstants.MessageTypes.REPLY) {
          const content = SysMessageUtils.stringify(message);
          if (!content) return null;
          d = MessageParseUtils.unparse(content, iChannel.id, true);
        }

        return {
          icon: iAuthor.getAvatarURL(iChannel.guild_id, true),
          title: channel,
          content: d
        };
      }

      MESSAGE_CREATE({ channelId, message }) {
        const iChannel = ChannelStore.getChannel(channelId);
        if (!iChannel) return; // what?
        let iAuthor = UserStore.getUser(message.author.id);
        if (!iAuthor) {
          iAuthor = new CUser(message.author);
          UserStore.getUsers()[message.author.id] = iAuthor;
        }
        const notifyStatus = this.shouldNotify(message, iChannel, iAuthor);
        if (!notifyStatus) return;
        const { icon, title, content } = this.makeTextChatNotification(iChannel, message, iAuthor) || {};
        if (!title) return; /* wah */
        const iMember = GuildMemberStore.getMember(iChannel.guild_id, iAuthor.id);
        const iMessage = DiscordModules.MessageStore.getMessage(channelId, message.id) || MessageActionCreators.createMessageRecord(message);
        const color = notifyStatus === RetTypes.KEYWORD && this.settings.useKeywordColor ? this.settings.keywordColor : this.settings.roleColor && iMember && iMember.colorString;
        const timeout = ((notifyStatus === RetTypes.KEYWORD && this.settings.pinKeyword) || (notifyStatus === RetTypes.REPLY && this.settings.pinReplies)) ? 0 : this.calculateTimeout(title, content);
        const options = {
          timeout,
          onClick: () => {
            NavigationUtils.transitionTo(`/channels/${iChannel.guild_id || '@me'}/${iChannel.id}`);
          },
          onContext: () => {
            AckUtils.ack(iChannel.id);
            XenoLib.Notifications.remove(notifId);
          },
          onLeave: () => {
            delete this.n10nMap[message.id];
          },
          color: color || this.settings.color
        };
        const notifId = XenoLib.Notifications.show(this.renderContent(icon, title, content, iChannel, iMessage), options);
        if (!notifId) return; // uuh, notification overload?
        if (this.n10nMap[message.id]) return; // duplicate

        this.n10nMap[message.id] = {
          iAuthor,
          iMessage,
          iChannel,
          notifId,
          options,
          notifyStatus
        };
        //this.showNotification(notif, iChannel, iMessage, this.settings.roleColor && iMember && iMember.colorString);
      }

      MESSAGE_UPDATE({ message }) {
        if (!this.n10nMap[message.id]) return;
        const { iAuthor, iMessage: oiMessage, iChannel, notifId, options, notifyStatus } = this.n10nMap[message.id];
        const iMessage = DiscordModules.MessageStore.getMessage(iChannel.id, message.id) || MessageActionCreators.updateMessageRecord(oiMessage, message);
        const { icon, title, content } = this.makeTextChatNotification(iChannel, iMessage, iAuthor) || {};
        const timeout = ((notifyStatus === RetTypes.KEYWORD && this.settings.pinKeyword) || (notifyStatus === RetTypes.REPLY && this.settings.pinReplies)) ? 0 : this.calculateTimeout(title, content);
        if (!title) return; /* wah */
        XenoLib.Notifications.update(notifId, {
          ...options,
          content: this.renderContent(icon, title, content, iChannel, iMessage),
          timeout
        });
        this.n10nMap[message.id] = {
          iAuthor,
          iMessage,
          iChannel,
          notifId,
          options,
          notifyStatus
        };
      }

      FRIEND_REQUEST_ACCEPTED({ user }) {
        if (!this.settings.friendRequestAccept) return;
        let iUser = UserStore.getUser(user.id);
        if (!iUser) {
          iUser = new CUser(user);
          UserStore.getUsers()[user.id] = iUser;
        }
        XenoLib.Notifications.success(this.renderContent(iUser.getAvatarURL(null, true), iUser.tag, Messages.NOTIFICATION_ACCEPTED_FRIEND_REQUEST), {
          onClick: () => {
            PrivateChannelActions.openPrivateChannel(iUser.id);
          },
          timeout: this.calculateTimeout(iUser.tag, Messages.NOTIFICATION_ACCEPTED_FRIEND_REQUEST)
        });
      }

      RELATIONSHIP_ADD({ relationship: { type, user } }) {
        if (!this.settings.friendRequestIncoming || type !== DiscordConstants.RelationshipTypes.PENDING_INCOMING) return;
        let iUser = UserStore.getUser(user.id);
        if (!iUser) {
          iUser = new CUser(user);
          UserStore.getUsers()[user.id] = iUser;
        }
        XenoLib.Notifications.success(this.renderContent(iUser.getAvatarURL(null, true), iUser.tag, Messages.NOTIFICATION_PENDING_FRIEND_REQUEST), {
          onClick: () => {
            NavigationUtils.transitionTo(DiscordConstants.Routes.FRIENDS);
            FriendsSectionSetter.setSection(DiscordConstants.FriendsSections.PENDING);
          },
          timeout: this.calculateTimeout(iUser.tag, Messages.NOTIFICATION_PENDING_FRIEND_REQUEST)
        });
      }

      CHANNEL_SELECT({ channelId }) {
        const entries = Object.entries(this.n10nMap);
        for (const [id, { iChannel, notifId }] of entries) {
          if (iChannel.id !== channelId) continue;
          XenoLib.Notifications.remove(notifId);
        }
      }

      handleUnreadsChanged() {
        const cache = {};
        for (const { iChannel, iMessage, notifId } of Object.values(this.n10nMap)) {
          if (!UnreadStore.hasUnread(iChannel.id)) {
            XenoLib.Notifications.remove(notifId);
            continue;
          }
          const timestamp = cache[iChannel.id] || UnreadStore.getOldestUnreadTimestamp(iChannel.id);
          if (!cache[iChannel.id]) cache[iChannel.id] = timestamp;
          const time = Math.trunc((iMessage.id / 4194304) + 14200704e5);
          if (timestamp >= time) XenoLib.Notifications.remove(notifId);
        }
      }

      calculateTime(text) {
        let words = 0;
        if (this._timeUnparser) try {
          text = this._timeUnparser(text);
        } catch (err) {
          Logger.stacktrace(`Failed to unparse text ${text}`, err);
          this._timeUnparser = null;
        }

        /* https://github.com/ngryman/reading-time */
        function ansiWordBound(c) {
          return c === ' ' || c === '\n' || c === '\r' || c === '\t';
        }
        for (let i = 0; i < text.length;) {
          for (; i < text.length && !ansiWordBound(text[i]); i++);
          words++;
          for (; i < text.length && ansiWordBound(text[i]); i++);
        }
        return (words / this.settings.wordsPerMinute) * 60 * 1000;
      }

      calculateTimeout(title, content) {
        return Math.max(this.settings.wpmTimeout ? Math.min(this.calculateTime(title) + this.calculateTime(content), 60000) : 0, 5000);
      }

      renderContent(icon, title, content, iChannel, iMessage) {
        const renderSpoilers = iChannel ? shouldRenderSpoilers(UserSettingsStore.renderSpoilers, PermissionsStore.can(DiscordConstants.Permissions.MANAGE_MESSAGES, iChannel)) : true;
        return (
          React.createElement(
            'div',
            {
              className: 'IAN-message'
            },
            React.createElement('img', {
              className: 'IAN-avatar',
              src: icon
            }),
            React.createElement(
              'span',
              {
                className: XenoLib.joinClassNames(MessageClasses.username, 'overflow-WK9Ogt')
              },
              title
            ),
            React.createElement(SpoilerDisplayContext.Provider, {
              value: renderSpoilers
            }, React.createElement('div', { className: XenoLib.joinClassNames(MarkupClassname, MessageClasses.messageContent) }, ParserModule.parse(content, true, { channelId: iChannel && iChannel.id }))),
            // eslint-disable-next-line function-call-argument-newline
            iChannel && iMessage ? React.createElement(SpoilerDisplayContext.Provider, {
              value: (this.settings.spoilerAll || this.settings.spoilerNSFW && iChannel.nsfw) ? false : renderSpoilers
            }, React.createElement(MessageAccessories, {
              channel: iChannel,
              message: iMessage,
              canDeleteAttachments: false,
              canSuppressEmbeds: false,
              compact: true,
              disableReactionCreates: true,
              disableReactionReads: true,
              disableReactionUpdates: true,
              gifAutoPlay: true,
              hasSpoilerEmbeds: false,
              inlineAttachmentMedia: true,
              inlineEmbedMedia: true,
              isInteracting: false,
              isLurking: false,
              isPendingMember: false,
              onAttachmentContextMenu: () => { },
              renderEmbeds: true,
              renderReactions: true,
              spoilerAll: this.settings.spoilerAll || (this.settings.spoilerNSFW && iChannel.nsfw)
            })) : null
          )
        );
      }

      /* PATCHES */

      patchAll() {
        Utilities.suppressErrors(this.patchShouldNotify.bind(this), 'shouldNotify patch')();
        Utilities.suppressErrors(this.patchAttachment.bind(this), 'Attachment patch')();
      }

      patchShouldNotify() {
        Patcher.after(WebpackModules.getByProps('shouldDisplayNotifications'), 'shouldDisplayNotifications', () => (WindowInfo.isFocused() ? false : undefined));
      }

      patchAttachment() {
        const Attachment = WebpackModules.find(e => e.default && ~e.default.toString().indexOf('canRemoveAttachment'));
        Patcher.before(Attachment, 'default', (_, args) => {
          const [props] = args;
          if (!props.__IAN_spoilerAll) return;
          args[1] = props.attachment.spoiler;
          props.attachment.spoiler = true;
        });
        Patcher.after(Attachment, 'default', (_, args) => {
          const [props] = args;
          if (!props.__IAN_spoilerAll) return;
          // eslint-disable-next-line prefer-destructuring
          props.attachment.spoiler = args[1];
          delete args[1];
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
    const i = (i, n) => ((i = i.split('.').map(i => parseInt(i))), (n = n.split('.').map(i => parseInt(i))), !!(n[0] > i[0]) || !!(n[0] == i[0] && n[1] > i[1]) || !!(n[0] == i[0] && n[1] == i[1] && n[2] > i[2])),
      n = (n, e) => n && n._config && n._config.info && n._config.info.version && i(n._config.info.version, e),
      e = BdApi.Plugins.get('ZeresPluginLibrary'),
      o = BdApi.Plugins.get('XenoLib');
    n(e, '1.2.29') && (ZeresPluginLibraryOutdated = !0), n(o, '1.3.38') && (XenoLibOutdated = !0);
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
        return `${this.description } You are missing libraries for this plugin, please enable the plugin and click Download Now.`;
      }
      start() { }
      stop() { }
      handleMissingLib() {
        const a = BdApi.findModuleByProps('openModal', 'hasModalOpen');
        if (a && a.hasModalOpen(`${this.name}_DEP_MODAL`)) return;
        const b = !global.XenoLib,
          c = !global.ZeresPluginLibrary,
          d = (b && c) || ((b || c) && (XenoLibOutdated || ZeresPluginLibraryOutdated)),
          e = (() => {
            let a = '';
            return b || c ? (a += `Missing${XenoLibOutdated || ZeresPluginLibraryOutdated ? ' and outdated' : ''} `) : (XenoLibOutdated || ZeresPluginLibraryOutdated) && (a += 'Outdated '), (a += `${d ? 'Libraries' : 'Library'} `), a;
          })(),
          f = (() => {
            let a = `The ${d ? 'libraries' : 'library'} `;
            return b || XenoLibOutdated ? ((a += 'XenoLib '), (c || ZeresPluginLibraryOutdated) && (a += 'and ZeresPluginLibrary ')) : (c || ZeresPluginLibraryOutdated) && (a += 'ZeresPluginLibrary '), (a += `required for ${this.name} ${d ? 'are' : 'is'} ${b || c ? 'missing' : ''}${XenoLibOutdated || ZeresPluginLibraryOutdated ? (b || c ? ' and/or outdated' : 'outdated') : ''}.`), a;
          })(),
          g = BdApi.findModuleByDisplayName('Text'),
          h = BdApi.findModuleByDisplayName('ConfirmModal'),
          i = () => BdApi.alert(e, BdApi.React.createElement('span', {}, BdApi.React.createElement('div', {}, f), 'Due to a slight mishap however, you\'ll have to download the libraries yourself. This is not intentional, something went wrong, errors are in console.', c || ZeresPluginLibraryOutdated ? BdApi.React.createElement('div', {}, BdApi.React.createElement('a', { href: 'https://betterdiscord.net/ghdl?id=2252', target: '_blank' }, 'Click here to download ZeresPluginLibrary')) : null, b || XenoLibOutdated ? BdApi.React.createElement('div', {}, BdApi.React.createElement('a', { href: 'https://betterdiscord.net/ghdl?id=3169', target: '_blank' }, 'Click here to download XenoLib')) : null));
        if (!a || !h || !g) return console.error(`Missing components:${(a ? '' : ' ModalStack') + (h ? '' : ' ConfirmationModalComponent') + (g ? '' : 'TextElement')}`), i();
        class j extends BdApi.React.PureComponent {
          constructor(a) {
            super(a), (this.state = { hasError: !1 }), (this.componentDidCatch = a => (console.error(`Error in ${this.props.label}, screenshot or copy paste the error above to Lighty for help.`), this.setState({ hasError: !0 }), typeof this.props.onError === 'function' && this.props.onError(a))), (this.render = () => (this.state.hasError ? null : this.props.children));
          }
        }
        let k = !1,
          l = !1;
        const m = a.openModal(
          b => {
            if (l) return null;
            try {
              return BdApi.React.createElement(
                j,
                { label: 'missing dependency modal', onError: () => (a.closeModal(m), i()) },
                BdApi.React.createElement(
                  h,
                  {
                    header: e,
                    children: BdApi.React.createElement(g, { size: g.Sizes.SIZE_16, children: [`${f} Please click Download Now to download ${d ? 'them' : 'it'}.`] }),
                    red: !1,
                    confirmText: 'Download Now',
                    cancelText: 'Cancel',
                    onCancel: b.onClose,
                    onConfirm: () => {
                      if (k) return;
                      k = !0;
                      const b = require('request'),
                        c = require('fs'),
                        d = require('path'),
                        e = BdApi.Plugins && BdApi.Plugins.folder ? BdApi.Plugins.folder : window.ContentManager.pluginsFolder,
                        f = () => {
                          (global.XenoLib && !XenoLibOutdated) ||
                              b('https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/1XenoLib.plugin.js', (b, f, g) => {
                                try {
                                  if (b || f.statusCode !== 200) return a.closeModal(m), i();
                                  c.writeFile(d.join(e, '1XenoLib.plugin.js'), g, () => { });
                                } catch (b) {
                                  console.error('Fatal error downloading XenoLib', b), a.closeModal(m), i();
                                }
                              });
                        };
                      !global.ZeresPluginLibrary || ZeresPluginLibraryOutdated
                        ? b('https://raw.githubusercontent.com/rauenzi/BDPluginLibrary/master/release/0PluginLibrary.plugin.js', (b, g, h) => {
                          try {
                            if (b || g.statusCode !== 200) return a.closeModal(m), i();
                            c.writeFile(d.join(e, '0PluginLibrary.plugin.js'), h, () => { }), f();
                          } catch (b) {
                            console.error('Fatal error downloading ZeresPluginLibrary', b), a.closeModal(m), i();
                          }
                        })
                        : f();
                    },
                    ...b,
                    onClose: () => { }
                  }
                )
              );
            } catch (b) {
              return console.error('There has been an error constructing the modal', b), (l = !0), a.closeModal(m), i(), null;
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
