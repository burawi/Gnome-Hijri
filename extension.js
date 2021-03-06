const St = imports.gi.St;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const MainLoop = imports.mainloop;
const Lang = imports.lang;
const MessageTray = imports.ui.messageTray;
const Clutter = imports.gi.Clutter;

const ExtensionUtils = imports.misc.extensionUtils;
const extension = ExtensionUtils.getCurrentExtension();
const convenience = extension.imports.convenience;

const HijriDate = extension.imports.HijriDate;
const Calendar = extension.imports.calendar;

const Events = extension.imports.Events;
const str = extension.imports.strFunctions;
const lang = extension.imports.locale.utils;

const Schema = convenience.getSettings(extension, 'hijri-calendar');
const ConverterTypes = {
    fromGregorian: 0,
    fromHijri: 1,
};

let messageTray;

const HijriCalendar = new Lang.Class({
    Name: 'HijriCalendar.HijriCalendar',
    Extends: PanelMenu.Button,

    _init() {
        messageTray = new MessageTray.MessageTray();
        this.parent(0.0);

        this.label = new St.Label({
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.actor.add_actor(this.label);

        // some codes for coloring label
        if (Schema.get_boolean('custom-color'))
            this.label.set_style(`color: ${Schema.get_string('color')}`);


        let that = this;
        this.schema_color_change_signal = Schema.connect('changed::color', Lang.bind(
            that, function () {
                if (Schema.get_boolean('custom-color'))
                    that.label.set_style(`color: ${Schema.get_string('color')}`);
            }
        ));

        this.schema_custom_color_signal = Schema.connect('changed::custom-color', Lang.bind(
            that, function () {
                if (Schema.get_boolean('custom-color'))
                    that.label.set_style(`color: ${Schema.get_string('color')}`);
                else
                    that.label.set_style('color:');
            }
        ));

        this.schema_widget_format_signal = Schema.connect('changed::widget-format', Lang.bind(
            that, function () {
                this._updateDate(true, true);
            }
        ));

        this.schema_widget_format_signal = Schema.connect('changed::numeral-system', Lang.bind(
            that, function () {
                this._updateDate(true, true);
            }
        ));

        this.schema_widget_format_signal = Schema.connect('changed::date-adjustment', Lang.bind(
            that, function () {
                this._updateDate(true, true);
            }
        ));

        this.schema_widget_format_signal = Schema.connect('changed::display-language', Lang.bind(
            that, function () {
                this._updateDate(true, true);
                this._generateConverterPart();
            }
        ));
        // /////////////////////////////

        this._today = '';

        let vbox = new St.BoxLayout({vertical: true});
        let calendar = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        calendar.actor.add_child(vbox);
        this.menu.addMenuItem(calendar);

        this._calendar = new Calendar.Calendar();
        vbox.add_actor(this._calendar.actor);

        this._generateConverterPart();

        // action buttons
        let actionButtons = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        this.menu.addMenuItem(actionButtons);

        // Add preferences button
        let icon = new St.Icon({
            icon_name: 'preferences-system-symbolic',
            icon_size: 16,
        });

        let preferencesIcon = new St.Button({
            child: icon,
            style_class: 'message-list-clear-button button',
            reactive: true,
            can_focus: true,
            track_hover: true,
            accessible_name: _('Preferences'),
        });
        preferencesIcon.connect('clicked', () => {
            this.menu.actor.hide();
            if (typeof ExtensionUtils.openPrefs === 'function') {
                ExtensionUtils.openPrefs();
            } else {
                Util.spawn([
                    'gnome-shell-extension-prefs',
                    Me.uuid,
                ]);
            }
            return 0;
        });
        actionButtons.actor.add(preferencesIcon, {expand: true, x_fill: false});

        this.menu.connect('open-state-changed', Lang.bind(that, function (menu, isOpen) {
            if (isOpen) {
                let now = new Date();
                now = HijriDate.HijriDate.toHijri(now.getFullYear(), now.getMonth() + 1, now.getDate());
                that._calendar.setDate(now);
            }
        }));
    },

    _updateDate(skip_notification, force) {
        const langPack = lang.getLangStrings();
        this._isHoliday = false;
        let _date = new Date();
        this._events = '';

        // convert to Hijri
        _date = HijriDate.HijriDate.toHijri(_date.getFullYear(), _date.getMonth() + 1, _date.getDate());

        // if today is "today" just return, don't change anything!
        if (!force && this._today === _date.yearDays)
            return true;


        // set today as "today"
        this._today = _date.yearDays;

        // set indicator label and popupmenu
        // get events of today
        let ev = new Events.Events();
        let events = ev.getEvents(new Date());
        events[0] = events[0] !== '' ? `\n${events[0]}` : '';

        // is holiday?
        if (events[1])
            this.label.add_style_class_name('hcalendar-holiday');
        else
            this.label.remove_style_class_name('hcalendar-holiday');


        this.label.set_text(
            str.format(
                this._calendar.format(
                    Schema.get_string('widget-format'),
                    _date.day,
                    _date.month,
                    _date.year,
                    'hijri'
                )
            )
        );

        _date = str.format(`${_date.day} ${langPack.largeHijriMonthNames[_date.month - 1]} ${_date.year}`);
        if (!skip_notification)
            notify(_date, events[0]);


        return true;
    },

    _generateConverterPart() {
        // Add date conversion button
        const langPack = lang.getLangStrings();
        if (this.converterMenu)
            this.converterMenu.destroy();
        this.converterMenu = new PopupMenu.PopupSubMenuMenuItem(langPack.convertDate);
        this.menu.addMenuItem(this.converterMenu);
        this.converterVbox = new St.BoxLayout({vertical: true});
        let converterSubMenu = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        converterSubMenu.actor.add_child(this.converterVbox);
        this.converterMenu.menu.addMenuItem(converterSubMenu);

        let middleBox = new St.BoxLayout({style_class: 'hcalendar-converter-box'});

        this._activeConverter = ConverterTypes.fromGregorian;

        let fromGregorian = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            label: langPack.fromGregorian,
            accessible_name: 'fromGregorian',
            style_class: 'popup-menu-item button hcalendar-button fromGregorian active',
        });
        fromGregorian.connect('clicked', Lang.bind(this, this._toggleConverter));
        fromGregorian.TypeID = ConverterTypes.fromGregorian;

        let fromHijri = new St.Button({
            reactive: true,
            can_focus: true,
            track_hover: true,
            label: langPack.fromHijri,
            accessible_name: 'fromHijri',
            style_class: 'popup-menu-item button hcalendar-button fromHijri',
        });
        fromHijri.connect('clicked', Lang.bind(this, this._toggleConverter));
        fromHijri.TypeID = ConverterTypes.fromHijri;

        middleBox.add(fromHijri);
        middleBox.add(fromGregorian);

        this.converterVbox.add(middleBox);

        let converterHbox = new St.BoxLayout({style_class: 'hcalendar-converter-box'});

        this.converterYear = new St.Entry({
            name: 'year',
            hint_text: langPack.year,
            can_focus: true,
            style_class: 'hcalendar-converter-entry',
        });
        this.converterYear.clutter_text.connect('text-changed', Lang.bind(this, this._onModifyConverter));
        converterHbox.add(this.converterYear, {expand: true});

        this.converterMonth = new St.Entry({
            name: 'month',
            hint_text: langPack.month,
            can_focus: true,
            style_class: 'hcalendar-converter-entry',
        });
        converterHbox.add(this.converterMonth, {expand: true});
        this.converterMonth.clutter_text.connect('text-changed', Lang.bind(this, this._onModifyConverter));

        this.converterDay = new St.Entry({
            name: 'day',
            hint_text: langPack.day,
            can_focus: true,
            style_class: 'hcalendar-converter-entry',
        });
        converterHbox.add(this.converterDay, {expand: true});
        this.converterDay.clutter_text.connect('text-changed', Lang.bind(this, this._onModifyConverter));

        this.converterVbox.add(converterHbox);

        this.convertedDatesVbox = new St.BoxLayout({vertical: true});
        this.converterVbox.add(this.convertedDatesVbox);
    },

    _onModifyConverter() {
        // erase old date
        let convertedDatesChildren = this.convertedDatesVbox.get_children();
        for (let i = 0; i < convertedDatesChildren.length; i++)
            convertedDatesChildren[i].destroy();


        let year = this.converterYear.get_text();
        let month = this.converterMonth.get_text();
        let day = this.converterDay.get_text();

        // check if data is numerical and not empty
        if (isNaN(day) || isNaN(month) || isNaN(year) || !day || !month || !year || year.length !== 4)
            return;


        const conversionFunctions = {
            [ConverterTypes.fromGregorian]: HijriDate.HijriDate.toHijri,
            [ConverterTypes.fromHijri]: HijriDate.HijriDate.fromHijri,
        };
        const conversionResultTypes = {
            [ConverterTypes.fromGregorian]: 'hijri',
            [ConverterTypes.fromHijri]: 'gregorian',
        };
        const conversionFunction = conversionFunctions[this._activeConverter];
        const conversionResult = conversionFunction(year, month, day);
        const conversionResultType = conversionResultTypes[this._activeConverter];

        const button = new St.Button({
            label: this._calendar.format(
                Schema.get_string('converter-format'),
                conversionResult.day,
                conversionResult.month,
                conversionResult.year,
                conversionResultType
            ),
            style_class: 'calendar-day hcalendar-date-label',
        });
        this.convertedDatesVbox.add(button, {expand: true, x_fill: true, x_align: St.Align.MIDDLE});
        button.connect('clicked', Lang.bind(button, function () {
            St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, this.label);
        }));
    },

    _toggleConverter(button) {
        // skip because it is already active
        if (this._activeConverter === button.TypeID)
            return;


        // first remove active classes then highlight the clicked button
        let tabBox = button.get_parent();
        let tabBoxChildren = tabBox.get_children();

        for (let i = 0; i < tabBoxChildren.length; i++) {
            let tabButton = tabBoxChildren[i];
            tabButton.remove_style_class_name('active');
        }

        button.add_style_class_name('active');
        this._activeConverter = button.TypeID;

        this._onModifyConverter();
    },
});

/**
 *
 * @param msg
 * @param details
 */
function notify(msg, details) {
    let source = new MessageTray.SystemNotificationSource();
    messageTray.add(source);
    let notification = new MessageTray.Notification(source, msg, details);
    notification.setTransient(true);
    source.notify(notification);
}


let _indicator;
let _timer;

/**
 *
 * @param metadata
 */
function init(metadata) {
}

/**
 *
 */
function enable() {
    _indicator = new HijriCalendar();
    Main.panel.addToStatusArea('hijri_calendar', _indicator);
    _indicator._updateDate(!Schema.get_boolean('startup-notification'));
    _timer = MainLoop.timeout_add(3000, Lang.bind(_indicator, _indicator._updateDate));
}

/**
 *
 */
function disable() {
    Schema.disconnect(_indicator.schema_color_change_signal);
    Schema.disconnect(_indicator.schema_custom_color_signal);
    Schema.disconnect(_indicator.schema_widget_format_signal);

    _indicator.destroy();
    MainLoop.source_remove(_timer);
}

/**
 *
 * @param uuid
 */
function launch_extension_prefs(uuid) {
    Main.extensionManager.openExtensionPrefs(uuid, '', {});
}
