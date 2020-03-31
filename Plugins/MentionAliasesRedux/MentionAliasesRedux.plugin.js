//META{"name":"MentionAliasesRedux","source":"https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/MentionAliasesRedux/MentionAliasesRedux.plugin.js","website":"https://1lighty.github.io/BetterDiscordStuff/?plugin=MentionAliasesRedux"}*//
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
var MentionAliasesRedux = (() => {
  /* Setup */
  const config = {
    main: 'index.js',
    info: {
      name: 'MentionAliasesRedux',
      authors: [
        {
          name: 'Lighty',
          discord_id: '239513071272329217',
          github_username: 'LightyPon',
          twitter_username: ''
        }
      ],
      version: '2.0.8',
      description: 'Set custom @mention aliases, that can also appear next to their name (nearly) anywhere, as well as have mention groups to mention multiple people at once.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/MentionAliasesRedux/MentionAliasesRedux.plugin.js'
    },
    changelog: [
      {
        title: 'sad',
        type: 'fixed',
        items: ['Temporarily disabled faulty patches']
      }
    ],
    defaultConfig: [
      {
        type: 'category',
        id: 'display',
        name: 'Display settings',
        collapsible: true,
        shown: true,
        settings: [
          {
            name: 'Display tags menu button',
            id: 'displayButton',
            type: 'switch',
            value: true
          },
          {
            name: 'Display owner tags',
            id: 'displayOwnerTags',
            type: 'switch',
            value: true
          },
          {
            name: 'Display tag in user popups',
            id: 'displayPopupTags',
            type: 'switch',
            value: true
          },
          {
            name: 'Display tags in members list',
            id: 'displayMemberTags',
            type: 'switch',
            value: true
          },
          {
            name: 'Display tag in messages',
            id: 'displayMessageTags',
            type: 'switch',
            value: true
          },
          {
            name: 'Display tag on the right side of the name in compact mode',
            id: 'displayRightCompact',
            type: 'switch',
            value: true
          },
          {
            name: 'Display alias in AKA in DMs',
            id: 'displayAKATags',
            type: 'switch',
            value: true
          },
          {
            name: 'Display tag in DMs list',
            id: 'displayDMTags',
            type: 'switch',
            value: true
          },
          {
            name: 'Display tag in Mutual Friends tab in user modals',
            id: 'displayMutualFriendsTags',
            type: 'switch',
            value: true
          },
          {
            name: 'Display tag in friends list',
            id: 'displayFriendsListTags',
            type: 'switch',
            value: true
          },
          {
            name: 'Tag text color',
            id: 'tagColor',
            type: 'color',
            value: '#ffffff',
            options: {
              defaultColor: '#ffffff'
            }
          },
          {
            name: 'Tag background color',
            id: 'tagBackground',
            type: 'color',
            value: '#56555e',
            options: {
              defaultColor: '#56555e'
            }
          },
          {
            name: 'Tag preview',
            type: 'preview'
          }
        ]
      }
    ]
  };

  /* Build */
  const buildPlugin = ([Plugin, Api]) => {
    const { ContextMenu, EmulatedTooltip, Toasts, Settings, Popouts, Modals, Utilities, WebpackModules, Filters, DiscordModules, ColorConverter, DOMTools, DiscordClasses, DiscordSelectors, ReactTools, ReactComponents, DiscordAPI, Logger, Patcher, PluginUpdater, PluginUtilities, DiscordClassModules, Structs } = Api;
    const { React, ModalStack, ContextMenuActions, ContextMenuItem, ContextMenuItemsGroup, ReactDOM, ChannelStore, GuildStore, UserStore, DiscordConstants, Dispatcher, GuildMemberStore, GuildActions, SwitchRow, EmojiUtils, RadioGroup, Permissions, TextElement, FlexChild, PopoutOpener, Textbox, UserSettingsStore, MessageStore } = DiscordModules;

    const UserStatusStore = WebpackModules.getByProps('getStatus');

    const ChannelTextAreaButton = WebpackModules.getByDisplayName('ChannelTextAreaButton');
    const Clickable = WebpackModules.getByDisplayName('Clickable');
    const DeprecatedModal = WebpackModules.getByDisplayName('DeprecatedModal');
    const FormItem = WebpackModules.getByDisplayName('FormItem');
    const FormText = WebpackModules.getByDisplayName('FormText');
    const FormTitle = WebpackModules.getByDisplayName('FormTitle');
    const Icon = WebpackModules.getByDisplayName('Icon');
    const ListItem = WebpackModules.getByDisplayName('ListItem');

    const AutocompleteContentClassname = XenoLib.getClass('autocomplete content');
    const AutocompleteDescriptionClassname = XenoLib.getClass('autocomplete description');
    const AvatarWrapperClassname = XenoLib.getClass('layout avatar');
    const ChannelTextAreaButtonClassname = XenoLib.getClass('textArea button');
    const CloseButtonClassname = XenoLib.joinClassNames(XenoLib.getClass('channel closeButton'), XenoLib.getClass('item clickable'));
    const CloseIconClassname = XenoLib.getClass('channel closeIcon');
    const ContentTitleClassname = XenoLib.getClass('autocomplete contentTitle');
    const EmptyPlaceHolderBodyClassname = XenoLib.getClass('emptyPlaceholder body');
    const EmptyPlaceHolderClassname = XenoLib.getClass('emptyPlaceholder');
    const InputClassname = XenoLib.getClass('reset input');
    const ItemChannelClassname = XenoLib.getClass('channel');
    const MemberTagClassname = XenoLib.joinClassNames('mentionAlias', XenoLib.getClass('botTagRegular'), XenoLib.getClass('member botTag'));
    const MessageCompactTagClassname = XenoLib.joinClassNames('mentionAlias', XenoLib.getClass('botTagRegular'), XenoLib.getClass('botTagCompact'));
    const MessageCozyTagClassname = XenoLib.joinClassNames('mentionAlias', XenoLib.getClass('botTagRegular'), XenoLib.getClass('botTagCozy'));
    const ModalContainerClassname = XenoLib.getClass('mobile container');
    const ModalContentClassname = XenoLib.getClass('mobile container content');
    const NoteClassname = XenoLib.getClass('switchItem note');
    const PopoutTagClassname = XenoLib.joinClassNames('mentionAlias', XenoLib.getClass('botTagRegular'), XenoLib.getClass('nameTag bot'));

    const roughlyMatches = WebpackModules.getByRegex(/{var \w=\w\.length,\w=\w\.length;if\(\w>\w\)return!1;if\(\w===\w\)return \w===\w;\w:/);
    const AnimatedAvatar = (WebpackModules.getByProps('AnimatedAvatar') || {}).AnimatedAvatar;
    const renderAvatar = user => React.createElement(AnimatedAvatar, { size: 'SIZE_32', src: user.getAvatarURL(), status: UserStatusStore.getStatus(user.id), isMobile: UserStatusStore.isMobileOnline(user.id), isTyping: false, statusTooltip: true });
    const renderAlias = (name, description, color, noAt) => React.createElement(FlexChild, { align: FlexChild.Align.CENTER, className: AutocompleteContentClassname }, React.createElement(FlexChild.Child, { grow: 1 }, React.createElement(TextElement.default, { style: { color } }, noAt ? undefined : '@', name)), React.createElement(TextElement.default, { className: AutocompleteDescriptionClassname }, description));

    class NewGroupModal extends React.PureComponent {
      constructor(props) {
        super(props);
        this.state = { name: '' };
        XenoLib.DiscordUtils.bindAll(this, ['handleClose', 'handleSubmit']);
      }
      handleSubmit(e) {
        e.preventDefault();
        if (!this.state.name.length) return Toasts.error('A name is needed!');
        Dispatcher.dispatch({ type: 'MA_SET_GROUP', id: Math.floor(4294967296 * Math.random()), name: this.state.name, users: [this.props.userId] });
        this.handleClose();
      }
      handleClose() {
        this.props.onClose();
      }
      render() {
        return React.createElement(
          DeprecatedModal,
          { className: ModalContainerClassname, tag: 'form', onSubmit: this.handleSubmit, size: DeprecatedModal.Sizes.SMALL },
          React.createElement(DeprecatedModal.Header, {}, React.createElement(FormTitle, { tag: 'h4' }, 'New Group')),
          React.createElement(DeprecatedModal.Content, { className: ModalContentClassname }, React.createElement(FormItem, { title: 'Group Name', className: InputClassname }, React.createElement(Textbox, { autoFocus: true, maxLength: 32, value: this.state.name, onChange: name => this.setState({ name }) })), React.createElement(FormText, { className: NoteClassname, type: 'description' }, 'User will be added to the group automatically.')),
          React.createElement(DeprecatedModal.Footer, {}, React.createElement(XenoLib.ReactComponents.Button, { type: 'submit', color: XenoLib.ReactComponents.Button.Colors.BRAND }, 'Save'), React.createElement(XenoLib.ReactComponents.Button, { type: 'button', look: XenoLib.ReactComponents.Button.Looks.LINK, color: XenoLib.ReactComponents.Button.Colors.PRIMARY, onClick: this.handleClose }, 'Cancel'))
        );
      }
    }

    class SetGroupModal extends React.PureComponent {
      constructor(props) {
        super(props);
        this.state = { name: props.group.name, users: props.group.users };
        XenoLib.DiscordUtils.bindAll(this, ['handleClose', 'handleSubmit']);
      }
      handleSubmit(e) {
        e.preventDefault();
        if (!this.state.name.length) return Toasts.error('A name is needed!');
        Dispatcher.dispatch({ type: 'MA_SET_GROUP', id: this.props.group.id, name: this.state.name, users: (this.state.users.length && this.state.users) || null });
        this.handleClose();
      }
      handleClose() {
        this.props.onClose();
      }
      renderUser(user, index) {
        if (!user) return;
        return React.createElement(
          ListItem,
          { className: ItemChannelClassname, avatar: renderAvatar(user), name: user.username /* possibly their alias? */, /* subText: this.renderSubtitle() */ style: { maxWidth: 'unset', marginLeft: 0 } },
          React.createElement(
            Clickable,
            {
              className: CloseButtonClassname,
              style: { display: 'block' },
              onClick: () => {
                this.state.users.splice(index, 1);
                this.forceUpdate();
              }
            },
            React.createElement(Icon, { className: CloseIconClassname, name: 'Nova_Close' })
          )
        );
      }
      render() {
        return React.createElement(
          DeprecatedModal,
          { className: ModalContainerClassname, tag: 'form', onSubmit: this.handleSubmit, size: DeprecatedModal.Sizes.SMALL },
          React.createElement(DeprecatedModal.Header, {}, React.createElement(Textbox, { maxLength: 32, value: this.state.name, onChange: name => this.setState({ name }) }), React.createElement(XenoLib.ReactComponents.Button, { type: 'button', look: XenoLib.ReactComponents.Button.Looks.LINK, color: XenoLib.ReactComponents.Button.Colors.PRIMARY, onClick: this.handleClose }, 'Cancel'), React.createElement(XenoLib.ReactComponents.Button, { type: 'submit', color: XenoLib.ReactComponents.Button.Colors.BRAND }, 'Save')),
          React.createElement(
            DeprecatedModal.Content,
            { className: ModalContentClassname } /*React.createElement(FlexChild,{justify: FlexChild.Justify.CENTER,className: 'MA-add-user'},React.createElement('img', {className: 'addRoleIcon-3YjErH',src: '/assets/cef02719c12d8aaf38894c16dca7fbe6.svg'})), */,
            this.state.users.map((userId, index) => this.renderUser(UserStore.getUser(userId), index))
          )
        );
      }
    }

    class SetAliasModal extends (WebpackModules.getByDisplayName('ChangeNickname') || (Logger.error('Failed to find modal "ChangeNickname"'), class fuck {})) {
      constructor(props) {
        super(props);
        this.handleSubmit = this.handleSubmitPatch.bind(this);
        this.renderWarning = () => {};
      }
      handleSubmitPatch(e) {
        e.preventDefault();
        Dispatcher.dispatch({ type: 'MA_SET_ALIAS', userId: this.props.user.id, alias: this.state.nick || null });
        this.close();
      }
      render() {
        this.props.errors = {};
        const ret = super.render();
        ret.props.children[0].props.children.props.children = 'Change Alias';
        ret.props.children[1].props.children[1].props.title = 'Alias';
        ret.props.children[1].props.children[2].props.children = 'Reset Alias';
        return ret;
      }
    }

    class AliasItem extends React.PureComponent {
      constructor(props) {
        super(props);
        this.state = { hovered: false };
      }
      render() {
        const m = {};
        m[XenoLib.getClass('autocomplete selector')] = this.state.hovered;
        m[XenoLib.getClass('avatar layout')] = this.props.isUser;
        return React.createElement('div', { className: XenoLib.joinClassNames(WebpackModules.getByProps('autocomplete', 'selector').selector, WebpackModules.getByProps('autocomplete', 'selector').selectable, m), onMouseEnter: () => this.setState({ hovered: true }), onMouseLeave: () => this.setState({ hovered: false }), onContextMenu: this.props.onContextMenu, onClick: this.props.onClick }, this.props.children);
      }
    }

    class AliasesPopout extends React.PureComponent {
      constructor(props) {
        super(props);
        this.state = { mentions: props.getMentions() };
        XenoLib.DiscordUtils.bindAll(this, ['handleContextMenu', 'handleClick', 'handleMentionsChange']);
      }
      handleClick(text, rich) {
        if (!this.props.channelTextAreaRef._editorRef) return Toasts.error('Internal error, cannot get _editorRef');
        /* hm.. */
        this.props.channelTextAreaRef._editorRef.ref.current.insertText(/* UserSettingsStore.useRichChatTextBox ? rich : */ text, true);
      }
      handleMentionsChange() {
        this.setState({ mentions: this.props.getMentions() });
      }
      handleContextMenu(e, id, isGroup) {
        ContextMenuActions.openContextMenu(e, e =>
          React.createElement(
            'div',
            { className: DiscordClasses.ContextMenu.contextMenu },
            XenoLib.createContextMenuGroup([
              XenoLib.createContextMenuItem(
                'Remove',
                () => {
                  if (isGroup) {
                    this.props.setGroup(id, null, null);
                  } else {
                    this.props.setAlias(id, null);
                  }
                  this.handleMentionsChange();
                },
                { disabled: ((DiscordAPI.currentGuild && DiscordAPI.currentGuild.ownerId) || DiscordAPI.currentChannel.ownerId) === id }
              ),
              XenoLib.createContextMenuItem('Edit', () => {
                if (isGroup) {
                  ModalStack.push(e => React.createElement(SetGroupModal, { ...e, group: Utilities.deepclone(this.props.getGroup(id)) }));
                } else {
                  ModalStack.push(() => React.createElement(SetAliasModal, { user: UserStore.getUser(id), nick: this.props.getUserAlias(id) }));
                }
              })
            ])
          )
        );
      }
      renderHeader(title, paddedTop) {
        return React.createElement(TextElement.default, { className: ContentTitleClassname, weight: TextElement.Weights.SEMIBOLD, size: TextElement.Sizes.SMALL, style: { paddingBottom: 8, paddingTop: paddedTop ? 8 : 0, paddingLeft: 8 } }, title);
      }
      render() {
        const children = [];
        try {
          this.state.mentions.users.forEach(({ userId, alias }, index) => {
            if (!index) children.push(this.renderHeader(`Users—${this.state.mentions.users.length}`));
            const user = UserStore.getUser(userId);
            children.push(React.createElement(AliasItem, { isUser: true, onContextMenu: e => this.handleContextMenu(e, userId), onClick: () => this.handleClick(`@${user.tag}`, `<@${userId}>`) }, React.createElement('div', { className: AvatarWrapperClassname }, renderAvatar(user)), renderAlias(alias, user.tag, undefined, true)));
          });
          this.state.mentions.groups.forEach((group, index) => {
            if (!index) children.push(this.renderHeader(`Groups—${this.state.mentions.groups.length}`, true));
            const groupUsers = this.props.getGroupUsers(group.users);
            if (groupUsers.note.length > 32) groupUsers.note = groupUsers.note.substr(0, 32 - 3) + '...';
            children.push(React.createElement(AliasItem, { onContextMenu: e => this.handleContextMenu(e, group.id, true), onClick: () => this.handleClick(groupUsers.tags, groupUsers.tagsIds) }, renderAlias(group.name, groupUsers.note, undefined, false)));
          });
          if (!children.length) {
            children.push(React.createElement('div', { className: EmptyPlaceHolderClassname }, React.createElement('div', { className: EmptyPlaceHolderBodyClassname }, 'Well this is awkward.. No aliases\nfound, not even the owner!')));
          }
        } catch (e) {
          Logger.stacktrace('Failed to render popup', e);
          return null;
        }
        return children;
      }
    }

    class Preview extends React.Component {
      render() {
        return React.createElement(
          'div',
          {},
          React.createElement(
            'span',
            {
              className: XenoLib.getClass('botTagCozy username'),
              style: {
                color: 'rgb(126, 0, 255)'
              }
            },
            '_Lighty_'
          ),
          React.createElement('span', { className: MessageCozyTagClassname }, 'Plugin Author')
        );
      }
    }

    class PreviewField extends Settings.SettingField {
      constructor(name, note) {
        super(name, note, () => {}, Preview);
      }
    }

    return class MentionAliasesRedux extends Plugin {
      constructor() {
        super();
        XenoLib._.bindAll(this, ['openAliasesPopout', 'queryAliases', 'setAlias', 'setGroup', 'handleSetAliasDispatch', 'handleSetGroupDispatch', 'getUserAlias', 'forceUpdateAll', 'handleContextMenu']);
        XenoLib.changeName(__filename, 'MentionAliasesRedux');
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
        this.__menuBroken = false;
        this.patchedModules = [];
        /* migrate settings */
        if (typeof this.settings.aliases !== 'undefined') {
          const settings = Utilities.deepclone(this.defaultSettings);
          settings.display.displayButton = this.settings.displayButton;
          settings.display.displayOwnerTags = this.settings.displayOwnerTags;
          settings.display.displayPopupTags = this.settings.displayPopupTags;
          settings.display.displayMemberTags = this.settings.displayMemberTags;
          settings.display.displayMessageTags = this.settings.displayMessageTags;
          settings.display.displayRightCompact = this.settings.displayRightCompact;
          settings.display.displayAKATags = this.settings.displayAKATags;
          settings.display.displayDMTags = this.settings.displayDMTags;
          this.aliases = this.settings.aliases;
          this.groups = Object.values(this.settings.groups);
          this.groups.forEach(group => {
            group.users = Object.values(group.users);
            group.id = Math.floor(4294967296 * Math.random());
          });
          this.settings = settings;
          this.saveSettings();
          this.saveAliases();
          this.saveGroups();
        }
        this.aliases = XenoLib.loadData(this.name, 'aliases', { data: { '239513071272329217': 'Author' } }).data;
        this.groups = XenoLib.loadData(this.name, 'groups', { data: [] }).data;
        this.promises = { state: { cancelled: false } };
        this.patchAll();
        Dispatcher.subscribe('MA_SET_ALIAS', this.handleSetAliasDispatch);
        Dispatcher.subscribe('MA_SET_GROUP', this.handleSetGroupDispatch);
        PluginUtilities.addStyle(
          this.short + '-CSS',
          `
                .MA-add-user {
                  flex: 1 1 auto;
                  position: absolute;
                  width: 100%;
                  left: 0;
                }
                .MA-add-user > img {
                  opacity: .7;
                  transition: opacity .2s ease;
                }
                .MA-add-user > img:hover {
                  opacity: 1;
                }
                .MA-add-user > img {
                  cursor: pointer;
                }
                `
        );
        this.toggleTagCSS();
      }

      onStop() {
        this.promises.state.cancelled = true;
        Patcher.unpatchAll();
        XenoLib.unpatchContext(this.handleContextMenu);
        Dispatcher.unsubscribe('MA_SET_ALIAS', this.handleSetAliasDispatch);
        Dispatcher.unsubscribe('MA_SET_GROUP', this.handleSetGroupDispatch);
        PluginUtilities.removeStyle(this.short + '-CSS');
        this.toggleTagCSS(true);
        this.forceRerenderMessages();
      }

      buildSetting(data) {
        if (data.type === 'color') {
          const setting = new XenoLib.Settings.ColorPicker(data.name, data.note, data.value, data.onChange, data.options);
          if (data.id) setting.id = data.id;
          return setting;
        } else if (data.type === 'preview') {
          return new PreviewField(data.name, data.note);
        }
        return super.buildSetting(data);
      }

      /* zlib uses reference to defaultSettings instead of a cloned object, which sets settings as default settings, messing everything up */
      loadSettings(defaultSettings) {
        return PluginUtilities.loadSettings(this.name, Utilities.deepclone(this.defaultSettings ? this.defaultSettings : defaultSettings));
      }

      saveSettings(_, setting, value) {
        super.saveSettings(_, setting, value);
        if (setting === 'tagColor' || setting === 'tagBackground') this.toggleTagCSS();
        else this.forceUpdateAll();
      }

      toggleTagCSS(removeOnly) {
        PluginUtilities.removeStyle(this.short + '-tags-CSS');
        if (removeOnly) return;
        PluginUtilities.addStyle(
          this.short + '-tags-CSS',
          `
        .mentionAlias {
          background: ${this.settings.display.tagBackground};
          color: ${this.settings.display.tagColor};
      }`
        );
      }

      saveAliases() {
        PluginUtilities.saveData(this.name, 'aliases', { data: this.aliases });
      }

      saveGroups() {
        PluginUtilities.saveData(this.name, 'groups', { data: this.groups });
      }

      handleContextMenu(_this, ret) {
        if (!_this.props.user) return;
        ret.props.children.push(
          XenoLib.createContextMenuGroup([
            XenoLib.createContextMenuSubMenu('Mention Aliases', [
              XenoLib.createContextMenuItem('Set Alias', () => ModalStack.push(() => React.createElement(SetAliasModal, { user: _this.props.user, nick: this.getUserAlias(_this.props.user.id) }))),
              XenoLib.createContextMenuSubMenu('Groups', [
                this.groups.map(group => {
                  const users = group.users;
                  const isPart = users.indexOf(_this.props.user.id) !== -1;
                  const onClick = () => {
                    if (isPart) {
                      users.splice(users.indexOf(_this.props.user.id), 1);
                      if (!users.length) {
                        this.setGroup(group.id, null, null);
                      } else {
                        Toasts.success('Removed!');
                      }
                    } else {
                      users.push(_this.props.user.id);
                      Toasts.success('Added!');
                    }
                  };
                  return XenoLib.createContextMenuSubMenu(
                    group.name,
                    [
                      XenoLib.createContextMenuItem((isPart && 'Remove') || 'Add', onClick),
                      XenoLib.createContextMenuItem('Edit', () => ModalStack.push(e => React.createElement(SetGroupModal, { ...e, group: Utilities.deepclone(group) }))),
                      XenoLib.createContextMenuItem('Delete Group', () => {
                        this.setGroup(group.id, null, null);
                      })
                    ],
                    {
                      action: () => {
                        ContextMenuActions.closeContextMenu();
                        onClick();
                      }
                    }
                  );
                }),
                XenoLib.createContextMenuItem('New Group', () => ModalStack.push(e => React.createElement(NewGroupModal, { ...e, userId: _this.props.user.id })))
              ])
            ])
          ])
        );
      }

      handleSetAliasDispatch({ userId, alias }) {
        this.setAlias(userId, alias);
      }

      handleSetGroupDispatch({ id, name, users }) {
        this.setGroup(id, name, users);
      }

      getUserAlias(id) {
        const alias = this.aliases[id];
        if (alias) return alias;
        if (this.settings.display.displayOwnerTags && DiscordAPI.currentGuild && DiscordAPI.currentGuild.ownerId === id) return 'Owner';
      }

      createAlias(alias, className) {
        return React.createElement('span', { className }, alias);
      }

      patchTag(tag, alias) {
        const orig = tag.type;
        tag.type = e => {
          try {
            const ret = orig(e);
            const orig2 = ret.type;
            ret.type = e => {
              try {
                const ret2 = orig2(e);
                ret2.props.children.push(this.createAlias(alias, PopoutTagClassname));
                return ret2;
              } catch (e) {
                Logger.stacktrace('patchTag level 2', e);
                try {
                  return orig2(e);
                } catch (e) {
                  return null;
                }
              }
            };
            return ret;
          } catch (e) {
            Logger.stacktrace('patchTag', e);
            try {
              return orig(e);
            } catch (e) {
              return null;
            }
          }
        };
      }

      getGroupUsers(users) {
        const ret = {
          note: '',
          tags: '',
          tagsIds: ''
        };
        for (const userId of users) {
          const user = UserStore.getUser(userId);
          if (!user) continue;
          if (ret.note.length) ret.note += ' ';
          if (ret.tags.length) ret.tags += ' ';
          ret.note += user.username;
          ret.tags += `@${user.username}#${user.discriminator}`;
          ret.tagsIds += `<@${user.id}>`;
        }
        return ret;
      }

      queryAliases(query = null) {
        const ret = {
          users: [],
          groups: [],
          lowPriority: {
            users: [],
            groups: []
          }
        };
        const canTag = userId => {
          if (DiscordAPI.currentChannel.discordObject.isPrivate()) {
            return DiscordAPI.currentChannel.discordObject.recipients.indexOf(userId) !== -1 || userId === DiscordAPI.currentUser.id;
          } else {
            return GuildMemberStore.isMember(DiscordAPI.currentGuild.id, userId) && Permissions.can(DiscordConstants.Permissions.VIEW_CHANNEL, userId, DiscordAPI.currentChannel.discordObject);
          }
        };
        for (const userId in this.aliases) {
          if (!UserStore.getUser(userId) || !canTag(userId)) continue;
          const alias = this.getUserAlias(userId);
          if (null === query || alias.toLowerCase().includes(query)) ret.users.push({ userId, alias });
          else if (Object.keys(ret.lowPriority.users).length < 3 && roughlyMatches(query, alias.toLowerCase())) ret.lowPriority.users.push({ userId, alias });
        }
        const ownerId = (DiscordAPI.currentGuild && DiscordAPI.currentGuild.ownerId) || DiscordAPI.currentChannel.ownerId;
        if (UserStore.getUser(ownerId)) {
          if (ownerId && ('owner'.includes(query) || null === query)) ret.users.push({ userId: ownerId, alias: 'Owner' });
          else if (ownerId && roughlyMatches(query, 'owner')) ret.lowPriority.users.push({ userId: ownerId, alias: 'Owner' });
        }

        for (const group of this.groups) {
          let lowPriority = false;
          if (null !== query && !group.name.toLowerCase().includes(query)) {
            lowPriority = roughlyMatches(query, group.name.toLowerCase());
            if (!lowPriority) continue;
          }
          const users = [];
          for (const userId of group.users) {
            if (!UserStore.getUser(userId) || !canTag(userId)) continue;
            users.push(userId);
          }
          if (!users.length) continue;
          ((lowPriority && ret.lowPriority.groups) || ret.groups).push({
            name: group.name,
            users: users,
            id: group.id
          });
        }
        return ret;
      }

      async forceRerenderMessages() {
        if (ZeresPluginLibrary.DiscordAPI.currentChannel) {
          const Messages = await ReactComponents.getComponentByName('Messages', `.${XenoLib.getSingleClass('messages messagesWrapper')}`);
          const unpatch = ZeresPluginLibrary.Patcher.after(this.name + 'RERENDER', Messages.component.prototype, 'render', (_this, _, ret) => {
            unpatch();
            const scroller = Utilities.getNestedProp(ret, 'props.children.1');
            if (!scroller) return;
            /* crash repellent */
            scroller.props.children[1].forEach(e => (e.key = DiscordModules.KeyGenerator()));
          });
          Messages.forceUpdateAll();
        }
      }

      /* PATCHES */

      patchAll() {
        Utilities.suppressErrors(this.patchUserPopouts.bind(this), 'UserPopout patch')(this.promises.state);
        Utilities.suppressErrors(this.patchUserModals.bind(this), 'UserProfileBody patch')(this.promises.state);
        Utilities.suppressErrors(this.patchMemberListItem.bind(this), 'MemberListItem patch')(this.promises.state);
        //Utilities.suppressErrors(this.patchPrivateChannel.bind(this), 'PrivateChannel patch')(this.promises.state);
        //Utilities.suppressErrors(this.patchPeopleListItem.bind(this), 'FriendRow patch')(this.promises.state);
        Utilities.suppressErrors(this.patchMutualFriends.bind(this), 'MutualFriends patch')(this.promises.state);
        Utilities.suppressErrors(this.patchChannelTextArea.bind(this), 'ChannelTextArea patch')(this.promises.state);
        Utilities.suppressErrors(this.patchMessageUsername.bind(this), 'MessageUsername patch')(this.promises.state);
        Utilities.suppressErrors(this.patchGetNicknames.bind(this), 'getNicknames patch')(this.promises.state);
        Utilities.suppressErrors(this.patchQueryMentionResults.bind(this), 'queryMentionResults patch')(this.promises.state);
        Utilities.suppressErrors(this.patchRoleAutoComplete.bind(this), 'RoleAutoComplete patch')(this.promises.state);
        Utilities.suppressErrors(this.patchSelectAutocompletion.bind(this), 'selectAutocompletion patch')(this.promises.state);
        XenoLib.patchContext(this.handleContextMenu);
      }

      async patchUserPopouts(promiseState) {
        const UserPopout = await ReactComponents.getComponentByName('UserPopout', DiscordSelectors.UserPopout.userPopout);
        if (promiseState.cancelled) return;
        Patcher.after(UserPopout.component.prototype, 'render', (_this, _, ret) => {
          const alias = this.getUserAlias(_this.props.userId);
          const tag = Utilities.getNestedProp(ret, 'props.children.props.children.0.props.children.0.props.children.1.props.children.1.props.children');
          if (!this.settings.display.displayPopupTags || !alias || !tag) return;
          this.patchTag(tag, alias);
        });
        UserPopout.forceUpdateAll();
      }

      async patchUserModals(promiseState) {
        const UserProfileBody = await ReactComponents.getComponentByName('UserProfileBody', DiscordSelectors.UserModal.root);
        if (promiseState.cancelled) return;
        Patcher.after(UserProfileBody.component.prototype, 'render', (_this, _, ret) => {
          const alias = this.getUserAlias(_this.props.user.id);
          const tag = Utilities.getNestedProp(ret, 'props.children.props.children.0.props.children.0.props.children.1.props.children.0');
          if (!this.settings.display.displayPopupTags || !alias || !tag) return;
          this.patchTag(tag, alias);
        });
        UserProfileBody.forceUpdateAll();
      }

      patchMessageUsername() {
        const MessageHeader = WebpackModules.getByIndex(WebpackModules.getIndex(e => e.default && e.default.toString().indexOf('.ComponentActions.ANIMATE_CHAT_AVATAR') !== -1));
        Patcher.after(MessageHeader, 'default', (_, [props], ret) => {
          const forceUpdate = React.useState()[1];
          React.useEffect(
            function() {
              const e = function() {
                forceUpdate({});
              };
              Dispatcher.subscribe('MAR_FORCE_UPDATE', e); /* this will make it easier to update the message later */
              return function() {
                Dispatcher.unsubscribe('MAR_FORCE_UPDATE', e);
              };
            },
            [props.message.id, forceUpdate]
          );
          if (!props.message.author || !this.settings.display.displayMessageTags) return;
          const alias = this.getUserAlias(props.message.author.id);
          if (!alias) return;
          const username = Utilities.getNestedProp(
            Utilities.findInReactTree(ret.props.children, e => e && e.props && Array.isArray(e.props.children) && e.props.children.findIndex(m => m && m.type && m.type.displayName === 'Popout') !== -1),
            'props.children'
          );
          if (!username) return; /* eh? */
          if (DiscordAPI.UserSettings.displayCompact && !this.settings.display.displayRightCompact) username.unshift(this.createAlias(alias, MessageCompactTagClassname));
          else username.push(this.createAlias(alias, MessageCozyTagClassname));
        });
        if (!DiscordAPI.currentChannel) return;
        this.forceRerenderMessages();
      }

      async patchMemberListItem(promiseState) {
        const MemberListItem = await ReactComponents.getComponentByName('MemberListItem', `.${XenoLib.getSingleClass('offline member', true)}`);
        if (promiseState.cancelled) return;
        Patcher.after(MemberListItem.component.prototype, 'render', (_this, _, ret) => {
          if (!_this.props.user || !this.settings.display.displayMemberTags) return;
          const alias = this.getUserAlias(_this.props.user.id);
          if (!alias) return;
          ret.props.decorators.props.children.push(this.createAlias(alias, MemberTagClassname));
        });
        this.patchedModules.push(MemberListItem);
        MemberListItem.forceUpdateAll();
      }

      async patchPrivateChannel(promiseState) {
        const PrivateChannel = await ReactComponents.getComponentByName('PrivateChannel', `.${XenoLib.getSingleClass('closeButton channel', true)}`);
        if (promiseState.cancelled) return;
        const TypePatch = function(e) {
          console.log(e);
          const ret = e.__oldTypeMA(e);
          const nameAndDecorators = Utilities.getNestedProp(ret, 'props.children.props.children.1.props.children.0.props.children');
          if (!nameAndDecorators) return ret;
          nameAndDecorators.push(this.createAlias(e.__aliasMA, MemberTagClassname));
          return ret;
        }.bind(this);
        Patcher.after(PrivateChannel.component.prototype, 'render', (_this, _, ret) => {
          if (!_this.props.user || !this.settings.display.displayDMTags) return;
          const alias = this.getUserAlias(_this.props.user.id);
          if (!alias) return;
          ret.props.__oldTypeMA = ret.type;
          ret.props.__aliasMA = alias;
          ret.type = TypePatch;
        });
        this.patchedModules.push(PrivateChannel);
        PrivateChannel.forceUpdateAll();
      }
      /* friends list */
      async patchPeopleListItem(promiseState) {
        const PeopleListItem = await ReactComponents.getComponentByName('PeopleListItem', `.${XenoLib.getSingleClass('peopleListItem', true)}`);
        if (promiseState.cancelled) return;
        const TypePatch3 = function(e) {
          try {
            const ret = new e.__oldType3MA(e);
            ret.props.children.splice(1, 0, this.createAlias(e.__aliasMA, MemberTagClassname));
            return ret;
          } catch (err) {
            Logger.stacktrace('Error in TypePatch3 for PeopleListItem patch', err);
            try {
              return new e.__oldType3MA(e);
            } catch (err2) {
              Logger.stacktrace('Error 2 in TypePatch3 for PeopleListItem patch', err2);
              return null;
            }
          }
        }.bind(this);
        const TypePatch2 = function(e) {
          try {
            const ret = new e.__oldType2MA(e);
            ret.props.__oldType3MA = ret.type;
            ret.type = TypePatch3;
            return ret;
          } catch (err) {
            Logger.stacktrace('Error in TypePatch2 for PeopleListItem patch', err);
            try {
              return new e.__oldType2MA(e);
            } catch (err2) {
              Logger.stacktrace('Error 2 in TypePatch2 for PeopleListItem patch', err2);
              return null;
            }
          }
        }.bind(this);
        const TypePatch1 = function(e) {
          try {
            const ret = new e.__oldType1MA(e);
            ret.props.__oldType2MA = ret.type;
            const DiscordTag = Utilities.getNestedProp(ret, 'props.children.1.props.children.0');
            if (DiscordTag) {
              DiscordTag.props.__aliasMA = e.__aliasMA;
              DiscordTag.props.__oldType2MA = DiscordTag.type;
              DiscordTag.type = TypePatch2;
            }
            return ret;
          } catch (err) {
            Logger.stacktrace('Error in TypePatch1 for PeopleListItem patch', err);
            try {
              return new e.__oldType1MA(e);
            } catch (err2) {
              Logger.stacktrace('Error 2 in TypePatch1 for PeopleListItem patch', err2);
              return null;
            }
          }
        }.bind(this);
        TypePatch2.displayName = 'DiscordTag';
        TypePatch3.displayName = 'NameTag';
        Patcher.after(PeopleListItem.component.prototype, 'render', (_this, _, ret) => {
          if (!this.settings.display.displayFriendsListTags) return;
          const alias = this.getUserAlias(_this.props.user.id);
          if (!alias) return;
          const UserInfo = Utilities.getNestedProp(ret, 'props.children.props.children.0');
          if (!UserInfo) return;
          UserInfo.props.__aliasMA = alias;
          UserInfo.props.__oldType1MA = UserInfo.type;
          UserInfo.type = TypePatch1;
        });
        this.patchedModules.push(PeopleListItem);
        PeopleListItem.forceUpdateAll();
      }
      /* mutual friends */
      async patchMutualFriends(promiseState) {
        const MutualFriends = await ReactComponents.getComponentByName('MutualFriends', `.${XenoLib.getSingleClass('scroller themeGhostHairline', true)}`);
        if (promiseState.cancelled) return;
        const TypePatch3 = function(e) {
          try {
            const ret = new e.__oldType3MA(e);
            ret.props.children.push(this.createAlias(e.__aliasMA, MemberTagClassname));
            return ret;
          } catch (err) {
            Logger.stacktrace('Error in TypePatch3 for MutualFriends patch', err);
            try {
              return new e.__oldType3MA(e);
            } catch (err2) {
              Logger.stacktrace('Error 2 in TypePatch3 for MutualFriends patch', err2);
              return null;
            }
          }
        }.bind(this);
        const TypePatch2 = function(e) {
          try {
            const ret = new e.__oldType2MA(e);
            ret.props.__oldType3MA = ret.type;
            ret.type = TypePatch3;
            return ret;
          } catch (err) {
            Logger.stacktrace('Error in TypePatch2 for MutualFriends patch', err);
            try {
              return new e.__oldType2MA(e);
            } catch (err2) {
              Logger.stacktrace('Error 2 in TypePatch2 for MutualFriends patch', err2);
              return null;
            }
          }
        }.bind(this);
        const TypePatch1 = function(e) {
          try {
            const ret = new e.__oldType1MA(e);
            const DiscordTag = Utilities.getNestedProp(ret, 'props.children.1');
            if (!DiscordTag) return ret;
            DiscordTag.props.__aliasMA = e.__aliasMA;
            DiscordTag.props.__oldType2MA = DiscordTag.type;
            DiscordTag.type = TypePatch2;
            return ret;
          } catch (err) {
            Logger.stacktrace('Error in TypePatch1 for MutualFriends patch', err);
            try {
              return new e.__oldType1MA(e);
            } catch (err2) {
              Logger.stacktrace('Error 2 in TypePatch1 for MutualFriends patch', err2);
              return null;
            }
          }
        }.bind(this);
        TypePatch1.displayName = 'FriendRow';
        TypePatch2.displayName = 'DiscordTag';
        TypePatch3.displayName = 'NameTag';
        Patcher.after(MutualFriends.component.prototype, 'render', (_this, _, ret) => {
          if (!this.settings.display.displayMutualFriendsTags) return;
          const children = Utilities.getNestedProp(ret, 'props.children');
          if (!children || !Array.isArray(children)) return;
          children.forEach(item => {
            const alias = this.getUserAlias(item.props.user.id);
            if (!alias) return;
            item.props.__aliasMA = alias;
            item.props.__oldType1MA = item.type;
            item.type = TypePatch1;
          });
          return;
        });
        MutualFriends.forceUpdateAll();
      }
      /* add mentions popout button */
      async patchChannelTextArea(promiseState) {
        const ChannelTextAreaContainer = WebpackModules.find(m => m.type && m.type.render && m.type.render.displayName === 'ChannelTextAreaContainer');
        const unpatch = Patcher.after(ChannelTextAreaContainer.type, 'render', (_this, _, ret) => {
          if (this.__menuBroken) return;
          const ChannelEditorContainer = Utilities.getNestedProp(ret, 'props.children.0.props.children.props.children.1');
          if (!ChannelEditorContainer || ChannelEditorContainer.props.disabled || !this.settings.display.displayButton) return;
          const buttons = Utilities.getNestedProp(ret, 'props.children.0.props.children.props.children.2.props.children');
          if (!buttons) return;
          const _editorRef = Utilities.getNestedProp(ChannelEditorContainer, 'ref.current');
          buttons.unshift(
            React.createElement(
              XenoLib.ReactComponents.ErrorBoundary,
              { label: 'MAR TXTAREA Button', onError: unpatch },
              React.createElement(ChannelTextAreaButton, {
                iconName: 'Nova_At',
                icon: e => React.createElement('svg', { ...e, width: 24, height: 24, viewBox: '0 0 24 24', style: { pointerEvents: 'none' } }, React.createElement('path', { d: 'M12 2C6.486 2 2 6.486 2 12C2 17.515 6.486 22 12 22C14.039 22 15.993 21.398 17.652 20.259L16.521 18.611C15.195 19.519 13.633 20 12 20C7.589 20 4 16.411 4 12C4 7.589 7.589 4 12 4C16.411 4 20 7.589 20 12V12.782C20 14.17 19.402 15 18.4 15L18.398 15.018C18.338 15.005 18.273 15 18.209 15H18C17.437 15 16.6 14.182 16.6 13.631V12C16.6 9.464 14.537 7.4 12 7.4C9.463 7.4 7.4 9.463 7.4 12C7.4 14.537 9.463 16.6 12 16.6C13.234 16.6 14.35 16.106 15.177 15.313C15.826 16.269 16.93 17 18 17L18.002 16.981C18.064 16.994 18.129 17 18.195 17H18.4C20.552 17 22 15.306 22 12.782V12C22 6.486 17.514 2 12 2ZM12 14.599C10.566 14.599 9.4 13.433 9.4 11.999C9.4 10.565 10.566 9.399 12 9.399C13.434 9.399 14.6 10.565 14.6 11.999C14.6 13.433 13.434 14.599 12 14.599Z', fill: 'currentColor' })),
                label: 'Open Aliases',
                className: ChannelTextAreaButtonClassname,
                onClick: e => !this.__menuBroken && this.openAliasesPopout(e, { _editorRef })
              })
            )
          );
        });
      }

      openAliasesPopout({ target }, ref) {
        PopoutOpener.openPopout(
          target,
          {
            showArrow: true,
            position: 'top',
            zIndexBoost: 1,
            render: _ => {
              try {
                return React.createElement(
                  XenoLib.ReactComponents.ErrorBoundary,
                  {
                    label: 'Popout',
                    onError: () => _.onClose()
                  },
                  React.createElement(
                    'div',
                    {
                      className: WebpackModules.getByProps('header', 'messagesPopoutWrap').messagesPopoutWrap,
                      style: { maxHeight: Structs.Screen.height - 43 - 25 - 40 }
                    },
                    React.createElement(WebpackModules.getByProps('Header', 'EmptyStateBottom').Header, {
                      title: 'Defined User Aliases'
                    }),
                    React.createElement(
                      WebpackModules.getByDisplayName('VerticalScroller'),
                      {
                        className: XenoLib.getClass('messagesPopoutWrap messagesPopout')
                      },
                      React.createElement(AliasesPopout, {
                        getUserAlias: this.getUserAlias,
                        getGroup: id => this.groups.find(m => m.id === id),
                        getMentions: this.queryAliases,
                        getGroupUsers: this.getGroupUsers,
                        setAlias: this.setAlias,
                        setGroup: this.setGroup,
                        channelTextAreaRef: ref
                      })
                    ),
                    false
                  )
                );
              } catch (e) {
                Logger.stacktrace('There has been an issue loading the menu', e);
                XenoLib.Notifications.error('There has been an issue loading the menu. Open up the console using CTRL + SHIFT + I, click console, and show any errors to Lighty in the support server. Menu button has been disabled.', { timeout: 0 });
                this.__menuBroken = true;
                this.forceUpdateAll();
                _.onClose();
                return null;
              }
            }
          },
          'MentionAliasesRedux'
        );
      }

      patchGetNicknames() {
        Patcher.after(WebpackModules.getByProps('getNicknames'), 'getNicknames', (_this, args, ret) => {
          if (!this.settings.display.displayAKATags) return;
          const userId = args[0];
          const alias = this.getUserAlias(userId);
          if (!alias) return;
          ret.push(alias);
        });
      }

      patchQueryMentionResults() {
        Patcher.after(WebpackModules.getByProps('queryMentionResults'), 'queryMentionResults', (_, [query], ret) => {
          if (!query.length) return;
          const mentions = this.queryAliases(query.toLowerCase());
          const appendUsers = (object, lowpr) => {
            object.forEach(({ userId, alias }) => {
              const idx = ret.users.findIndex(m => m.user.id == userId);
              if (idx !== -1) ret.users.splice(idx, 1); /* it's easier to just move it to the top */
              ret.users.unshift({
                nick: alias,
                score: (lowpr && 1) || 10, // I don't think this does anything // months later, I STILL don't know what this does
                user: UserStore.getUser(userId),
                status: UserStatusStore.getStatus(userId)
              });
            });
          };
          appendUsers(mentions.lowPriority.users, true);
          appendUsers(mentions.users);
          if (ret.users.length > 10) ret.users.splice(9, ret.users.length - 10);
          const appendGroups = groups => {
            groups.forEach(group => {
              const groupUsers = this.getGroupUsers(group.users);
              ret.roles.unshift({
                name: group.name,
                note: groupUsers.note,
                mentioned_users: groupUsers.tags,
                mentioned_users_ids: groupUsers.tagsIds,
                MA: true
              });
            });
          };
          appendGroups(mentions.lowPriority.groups);
          appendGroups(mentions.groups);
        });
      }

      patchRoleAutoComplete() {
        Patcher.instead(WebpackModules.getByDisplayName('Autocomplete').Role.prototype, 'renderContent', (_this, _, orig) => {
          var role = _this.props.role;
          if (!role.MA) return orig();
          return renderAlias(role.name, role.note, role.colorString);
        });
      }

      patchSelectAutocompletion() {
        Patcher.instead(WebpackModules.getByPrototypes('selectAutocompletion').prototype, 'selectAutocompletion', (_this, args, orig) => {
          const selected = args[0];
          const type = _this.state.autocompleteType;
          const _editorRef = _this.props.editorRef.current;
          if (type !== 'MENTIONS' || !_editorRef) return orig(...args);
          const autocompletes = _this.state.autocompletes;
          const role = autocompletes.roles[selected - autocompletes.users.length - autocompletes.globals.length];
          if (!role || !role.MA) return orig(...args);
          _editorRef.insertAutocomplete(role.mentioned_users, role.mentioned_users_ids);
        });
      }

      /* PATCHES */

      setAlias(userId, alias) {
        if (!alias || !alias.length) {
          delete this.aliases[userId];
          Toasts.success('Removed!');
        } else {
          this.aliases[userId] = alias;
          Toasts.success('Saved!');
        }
        this.saveAliases();
        this.forceUpdateAll();
      }

      setGroup(id, name, users) {
        const groupIdx = this.groups.findIndex(m => m.id === id);
        if (!users || !users.length) {
          this.groups.splice(groupIdx, 1);
          Toasts.success('Removed!');
        } else {
          if (groupIdx !== -1) {
            const group = this.groups[groupIdx];
            group.name = name;
            group.users = users;
          } else {
            this.groups.push({ id, name, users });
          }
          Toasts.success('Saved!');
        }
        this.saveGroups();
      }

      forceUpdateAll() {
        this.patchedModules.forEach(module => module.forceUpdateAll());
        Dispatcher.dirtyDispatch({ type: 'MAR_FORCE_UPDATE' });
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
      n(e, '1.2.10') && (ZeresPluginLibraryOutdated = !0), n(o, '1.3.13') && (XenoLibOutdated = !0);
    }
  } catch (i) {
    console.error('Error checking if libraries are out of date', i);
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
          const a = !global.XenoLib,
            b = !global.ZeresPluginLibrary,
            c = (a && b) || ((a || b) && (XenoLibOutdated || ZeresPluginLibraryOutdated)) || XenoLibOutdated || ZeresPluginLibraryOutdated,
            d = (() => {
              let d = '';
              return a || b ? (d += `Missing${XenoLibOutdated || ZeresPluginLibraryOutdated ? ' and outdated' : ''} `) : (XenoLibOutdated || ZeresPluginLibraryOutdated) && (d += `Outdated `), (d += `${c ? 'Libraries' : 'Library'} `), d;
            })(),
            e = (() => {
              let d = `The ${c ? 'libraries' : 'library'} `;
              return a || XenoLibOutdated ? ((d += 'XenoLib '), (b || ZeresPluginLibraryOutdated) && (d += 'and ZeresPluginLibrary ')) : (b || ZeresPluginLibraryOutdated) && (d += 'ZeresPluginLibrary '), (d += `required for ${this.name} ${c ? 'are' : 'is'} ${a || b ? 'missing' : ''}${XenoLibOutdated || ZeresPluginLibraryOutdated ? (a || b ? ' and/or outdated' : 'outdated') : ''}.`), d;
            })(),
            f = BdApi.findModuleByProps('push', 'update', 'pop', 'popWithKey'),
            g = BdApi.findModuleByProps('Sizes', 'Weights'),
            h = BdApi.findModule(a => a.defaultProps && a.key && 'confirm-modal' === a.key()),
            i = () => BdApi.getCore().alert(d, `${e}<br/>Due to a slight mishap however, you'll have to download the libraries yourself. After opening the links, do CTRL + S to download the library.<br/>${b || ZeresPluginLibraryOutdated ? '<br/><a href="http://betterdiscord.net/ghdl/?url=https://github.com/rauenzi/BDPluginLibrary/blob/master/release/0PluginLibrary.plugin.js"target="_blank">Click here to download ZeresPluginLibrary</a>' : ''}${a || XenoLibOutdated ? '<br/><a href="http://betterdiscord.net/ghdl/?url=https://github.com/1Lighty/BetterDiscordPlugins/blob/master/Plugins/1XenoLib.plugin.js"target="_blank">Click here to download XenoLib</a>' : ''}`);
          if (!f || !h || !g) return i();
          let j;
          const k = (() => {
            if (!global.pluginModule || !global.BDEvents) return;
            if (a || XenoLibOutdated) {
              const a = () => {
                BDEvents.off('xenolib-loaded', a), f.popWithKey(j), pluginModule.reloadPlugin(this.name);
              };
              return BDEvents.on('xenolib-loaded', a), () => BDEvents.off('xenolib-loaded', a);
            }
            const b = a => {
              'ZeresPluginLibrary' !== a || (BDEvents.off('plugin-loaded', b), BDEvents.off('plugin-reloaded', b), f.popWithKey(j), pluginModule.reloadPlugin(this.name));
            };
            return BDEvents.on('plugin-loaded', b), BDEvents.on('plugin-reloaded', b), () => (BDEvents.off('plugin-loaded', b), BDEvents.off('plugin-reloaded', b));
          })();
          class l extends BdApi.React.PureComponent {
            constructor(a) {
              super(a), (this.state = { hasError: !1 });
            }
            componentDidCatch(a, b) {
              console.error(`Error in ${this.props.label}, screenshot or copy paste the error above to Lighty for help.`), this.setState({ hasError: !0 }), 'function' == typeof this.props.onError && this.props.onError(a);
            }
            render() {
              return this.state.hasError ? null : this.props.children;
            }
          }
          j = f.push(a =>
            BdApi.React.createElement(
              l,
              {
                label: 'missing dependency modal',
                onError: () => {
                  f.popWithKey(j), i();
                }
              },
              BdApi.React.createElement(
                h,
                Object.assign(
                  {
                    header: d,
                    children: [BdApi.React.createElement(g, { color: g.Colors.PRIMARY, children: [`${e} Please click Download Now to download ${c ? 'them' : 'it'}.`] })],
                    red: !1,
                    confirmText: 'Download Now',
                    cancelText: 'Cancel',
                    onConfirm: () => {
                      k();
                      const a = require('request'),
                        b = require('fs'),
                        c = require('path'),
                        d = a => {
                          if (!global.BDEvents) return a();
                          const b = c => {
                            'ZeresPluginLibrary' !== c || (BDEvents.off('plugin-loaded', b), BDEvents.off('plugin-reloaded', b), a());
                          };
                          BDEvents.on('plugin-loaded', b), BDEvents.on('plugin-reloaded', b);
                        },
                        e = () => {
                          if (!global.pluginModule || (!global.BDEvents && !global.XenoLib)) return;
                          if ((global.XenoLib && !XenoLibOutdated) || !global.BDEvents) return pluginModule.reloadPlugin(this.name);
                          const a = () => {
                            BDEvents.off('xenolib-loaded', a), pluginModule.reloadPlugin(this.name);
                          };
                          BDEvents.on('xenolib-loaded', a);
                        },
                        f = () => (global.XenoLib && !XenoLibOutdated ? e() : void a('https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/1XenoLib.plugin.js', (a, d, f) => (a ? i() : void (e(), b.writeFile(c.join(window.ContentManager.pluginsFolder, '1XenoLib.plugin.js'), f, () => {})))));
                      !global.ZeresPluginLibrary || ZeresPluginLibraryOutdated ? a('https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js', (a, e, g) => (a ? i() : void (d(f), b.writeFile(c.join(window.ContentManager.pluginsFolder, '0PluginLibrary.plugin.js'), g, () => {})))) : f();
                    }
                  },
                  a
                )
              )
            )
          );
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
