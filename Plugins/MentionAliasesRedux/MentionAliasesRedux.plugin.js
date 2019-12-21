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
 * Copyright© 2019-2020, _Lighty_
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
      version: '2.0.2',
      description: 'Set custom @mention aliases, that can also appear next to their name (nearly) anywhere, as well as have mention groups to mention multiple people at once.',
      github: 'https://github.com/1Lighty',
      github_raw: 'https://raw.githubusercontent.com/1Lighty/BetterDiscordPlugins/master/Plugins/MentionAliasesRedux/MentionAliasesRedux.plugin.js'
    },
    changelog: [
      {
        title: 'plugin has been renamed!',
        type: 'added',
        items: ['Plugin has been renamed to MentionAliasesRedux to avoid issues loading due to the original plugin, as well as to be able to distinguish between the two more easily.']
      },
      {
        title: 'fixed',
        type: 'fixed',
        items: ['Fixed plugin description being wrong', 'Fixed menu button not showing']
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
    const { React, ModalStack, ContextMenuActions, ContextMenuItem, ContextMenuItemsGroup, ReactDOM, ChannelStore, GuildStore, UserStore, DiscordConstants, Dispatcher, GuildMemberStore, GuildActions, SwitchRow, EmojiUtils, RadioGroup, Permissions, TextElement, FlexChild, PopoutOpener, Textbox } = DiscordModules;

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
    const AnimatedAvatar = WebpackModules.getByProps('AnimatedAvatar').AnimatedAvatar;
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

    class SetAliasModal extends WebpackModules.getByDisplayName('ChangeNickname') {
      constructor(props) {
        super(props);
        this.handleSubmit = this.handleSubmitPatch.bind(this);
        this.renderWarning = () => { };
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
        m[WebpackModules.getByProps('autocomplete', 'selector').selectorSelected] = this.state.hovered;
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
        this.props.channelTextAreaRef._editorRef.appendText(text);
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
            if (!index) children.push(this.renderHeader(`Users—”${this.state.mentions.users.length}`));
            const user = UserStore.getUser(userId);
            children.push(React.createElement(AliasItem, { isUser: true, onContextMenu: e => this.handleContextMenu(e, userId), onClick: () => this.handleClick(`@${user.tag}`, `<@${userId}>`) }, React.createElement('div', { className: AvatarWrapperClassname }, renderAvatar(user)), renderAlias(alias, user.tag, undefined, true)));
          });
          this.state.mentions.groups.forEach((group, index) => {
            if (!index) children.push(this.renderHeader(`Groups—”${this.state.mentions.groups.length}`, true));
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
        super(name, note, () => { }, Preview);
      }
    }

    return class MentionAliasesRedux extends Plugin {
      constructor() {
        super();
        XenoLib.DiscordUtils.bindAll(this, ['openAliasesPopout', 'queryAliases', 'setAlias', 'setGroup', 'handleSetAliasDispatch', 'handleSetGroupDispatch', 'getUserAlias', 'forceUpdateAll', 'handleContextMenu']);
        XenoLib.changeName(__filename, 'MentionAliasesRedux');
      }
      onStart() {
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
          const ret = orig(e);
          const orig2 = ret.type;
          ret.type = e => {
            const ret2 = orig2(e);
            ret2.props.children.push(this.createAlias(alias, PopoutTagClassname));
            return ret2;
          };
          return ret;
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

      /* PATCHES */

      patchAll() {
        Utilities.suppressErrors(this.patchUserPopouts.bind(this), 'UserPopout patch')(this.promises.state);
        Utilities.suppressErrors(this.patchUserModals.bind(this), 'UserProfileBody patch')(this.promises.state);
        Utilities.suppressErrors(this.patchMemberListItem.bind(this), 'MemberListItem patch')(this.promises.state);
        Utilities.suppressErrors(this.patchPrivateChannel.bind(this), 'PrivateChannel patch')(this.promises.state);
        Utilities.suppressErrors(this.patchFriendRow.bind(this), 'FriendRow patch')(this.promises.state);
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
        const MessageModule = WebpackModules.getByProps('MessageUsername', 'Message');
        Patcher.after(MessageModule.MessageUsername.prototype, 'render', (_this, args, ret) => {
          if (!_this.props.message.author || !this.settings.display.displayMessageTags) return;
          const alias = this.getUserAlias(_this.props.message.author.id);
          if (!alias) return;
          const oChildren = ret.props.children;
          ret.props.children = e => {
            const ret2 = oChildren(e);
            if (DiscordAPI.UserSettings.displayCompact && !this.settings.display.displayRightCompact) ret2.props.children.unshift(this.createAlias(alias, MessageCompactTagClassname));
            else ret2.props.children.push(this.createAlias(alias, MessageCozyTagClassname));
            return ret2;
          };
        });
        /* reason for div:not is so it doesn't match anything that is not an actual message, like pins */
        const Message = new ReactComponents.ReactComponent('Message', MessageModule.Message, `.${XenoLib.getSingleClass('messageEditorCompact container')} > div:not(.${XenoLib.getSingleClass('marginCompactIndent content')})`);
        this.patchedModules.push(Message);
        Message.forceUpdateAll();
      }

      async patchMemberListItem(promiseState) {
        const MemberListItem = await ReactComponents.getComponentByName('MemberListItem', `.${XenoLib.getSingleClass('offline member')}`);
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
        const PrivateChannel = await ReactComponents.getComponentByName('PrivateChannel', `.${XenoLib.getSingleClass('closeButton channel')}`);
        if (promiseState.cancelled) return;
        const TypePatch = function (e) {
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
      async patchFriendRow(promiseState) {
        const FriendRow = await ReactComponents.getComponentByName('FriendRow', `.${XenoLib.getSingleClass('friendsColumn friendsRow')}`);
        if (promiseState.cancelled) return;
        const TypePatch2 = function (e) {
          try {
            const ret = new e.__oldType2MA(e);
            ret.props.children.splice(1, 0, this.createAlias(e.__aliasMA, MemberTagClassname));
            return ret;
          } catch (err) {
            Logger.stacktrace('Error in TypePatch2 for FriendRow patch', err);
            try {
              return new e.__oldType2MA(e);
            } catch (err2) {
              Logger.stacktrace('Error 2 in TypePatch2 for FriendRow patch', err2);
              return null;
            }
          }
        }.bind(this);
        const TypePatch1 = function (e) {
          try {
            const ret = new e.__oldType1MA(e);
            ret.props.__oldType2MA = ret.type;
            ret.type = TypePatch2;
            return ret;
          } catch (err) {
            Logger.stacktrace('Error in TypePatch1 for FriendRow patch', err);
            try {
              return new e.__oldType1MA(e);
            } catch (err2) {
              Logger.stacktrace('Error 2 in TypePatch1 for FriendRow patch', err2);
              return null;
            }
          }
        }.bind(this);
        TypePatch1.displayName = 'DiscordTag';
        TypePatch2.displayName = 'NameTag';
        Patcher.after(FriendRow.component.prototype, 'render', (_this, _, ret) => {
          if (!this.settings.display.displayFriendsListTags) return;
          const alias = this.getUserAlias(_this.props.user.id);
          if (!alias) return;
          const DiscordTag = Utilities.getNestedProp(ret, 'props.children.0.props.children.1');
          DiscordTag.props.__aliasMA = alias;
          DiscordTag.props.__oldType1MA = DiscordTag.type;
          DiscordTag.type = TypePatch1;
        });
        this.patchedModules.push(FriendRow);
        FriendRow.forceUpdateAll();
      }
      /* mutual friends */
      async patchMutualFriends(promiseState) {
        const MutualFriends = await ReactComponents.getComponentByName('MutualFriends', `.${XenoLib.getSingleClass('scroller themeGhostHairline')}`);
        if (promiseState.cancelled) return;
        const TypePatch3 = function (e) {
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
        const TypePatch2 = function (e) {
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
        const TypePatch1 = function (e) {
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
        const ChannelTextArea = await ReactComponents.getComponentByName('ChannelTextAreaForm', `.${XenoLib.getSingleClass('channelTextArea')}`);
        if (promiseState.cancelled) return;
        Patcher.after(
          WebpackModules.find(m => m.render && m.render.displayName === 'ChannelTextAreaContainer'),
          'render',
          (_this, _, ret) => {
            const props = Utilities.getNestedProp(ret, 'props.children.0.props.children.props.children.2.props.children.2.props');
            if (!props || props.disabled || !this.settings.display.displayButton) return;
            const buttons = Utilities.getNestedProp(ret, 'props.children.0.props.children.props.children.2.props.children');
            if (!buttons) return;
            const _editorRef = Utilities.getNestedProp(props, 'editorRef.current');
            buttons.unshift(
              React.createElement(ChannelTextAreaButton, {
                iconName: 'Nova_At',
                label: 'Open Aliases',
                className: ChannelTextAreaButtonClassname,
                onClick: e => this.openAliasesPopout(e, { _editorRef })
              })
            );
          }
        );
        this.patchedModules.push(ChannelTextArea);
        ChannelTextArea.forceUpdateAll();
      }

      openAliasesPopout({ target }, ref) {
        PopoutOpener.openPopout(
          target,
          {
            showArrow: true,
            position: 'top',
            zIndexBoost: 1,
            render: () => {
              return React.createElement(
                'div',
                {
                  className: ZLibrary.WebpackModules.getByProps('header', 'messagesPopoutWrap').messagesPopoutWrap + ' ' + ZLibrary.WebpackModules.getByProps('themedPopout').themedPopout,
                  style: { maxHeight: Structs.Screen.height - 43 - 25 - 40 }
                },
                WebpackModules.getByProps('Header', 'EmptyStateBottom').Header({
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
              );
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
          if (type !== 'MENTIONS' || !_this._editorRef) return orig(...args);
          const autocompletes = _this.props.autocompletes;
          const role = autocompletes.roles[selected - autocompletes.users.length - autocompletes.globals.length];
          if (!role || !role.MA) return orig(...args);
          _this._editorRef.insertAutocomplete(role.mentioned_users, role.mentioned_users_ids);
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
      stop() { }
      load() {
        const XenoLibMissing = !global.XenoLib;
        const zlibMissing = !global.ZeresPluginLibrary;
        const bothLibsMissing = XenoLibMissing && zlibMissing;
        const header = `Missing ${(bothLibsMissing && 'Libraries') || 'Library'}`;
        const content = `The ${(bothLibsMissing && 'Libraries') || 'Library'} ${(zlibMissing && 'ZeresPluginLibrary') || ''} ${(XenoLibMissing && (zlibMissing ? 'and XenoLib' : 'XenoLib')) || ''} required for ${this.name} ${(bothLibsMissing && 'are') || 'is'} missing.`;
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
                children: [TextElement({ color: TextElement.Colors.PRIMARY, children: [`${content} Please click Download Now to install ${(bothLibsMissing && 'them') || 'it'}.`] })],
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
                      fs.writeFile(path.join(window.ContentManager.pluginsFolder, '1XenoLib.plugin.js'), body, () => { });
                    });
                  };
                  if (!global.ZeresPluginLibrary) {
                    request('https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js', (error, response, body) => {
                      if (error) return onFail();
                      waitForLibLoad(downloadXenoLib);
                      fs.writeFile(path.join(window.ContentManager.pluginsFolder, '0PluginLibrary.plugin.js'), body, () => { });
                    });
                  } else downloadXenoLib();
                }
              },
              props
            )
          );
        });
      }

      start() { }
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
