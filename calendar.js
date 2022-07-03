const Clutter = imports.gi.Clutter;
const Lang = imports.lang;
const St = imports.gi.St;
const Pango = imports.gi.Pango;

const ExtensionUtils = imports.misc.extensionUtils;
const extension = ExtensionUtils.getCurrentExtension();
const convenience = extension.imports.convenience;

const HijriDate = extension.imports.HijriDate;

const str = extension.imports.strFunctions;
const lang = extension.imports.locale.utils;
const Events = extension.imports.Events;

const Schema = convenience.getSettings(extension, 'hijri-calendar');

/**
 *
 * @param dateA
 * @param dateB
 */
function _sameDay(dateA, dateB) {
    return dateA.year === dateB.year &&
    dateA.month === dateB.month &&
    dateA.day === dateB.day;
}

/**
 *
 */
function Calendar() {
    this._init();
}

Calendar.prototype = {
    weekdayAbbr: lang.getLangStrings().weekdayAbbr,
    _weekStart: 6,

    _init() {
        // Start off with the current date
        this._selectedDate = new Date();
        this._selectedDate = HijriDate.HijriDate.toHijri(this._selectedDate.getFullYear(), this._selectedDate.getMonth() + 1, this._selectedDate.getDate());

        this.actor = new St.Widget({
            // homogeneous: false,
            style_class: 'calendar',
            layout_manager: new Clutter.GridLayout(),
            reactive: true,
        });

        this.actor.connect('scroll-event', Lang.bind(this, this._onScroll));

        this._buildHeader();

        let that = this;
        Schema.connect('changed::display-language', Lang.bind(
            that, function () {
                that._buildHeader();
                this._update();
            }
        ));
    },

    // Sets the calendar to show a specific date
    setDate(date) {
        if (!_sameDay(date, this._selectedDate))
            this._selectedDate = date;


        this._update();
    },

    // Sets the calendar to show a specific date
    format(format, day, month, year, calendar) {
        const langPack = lang.getLangStrings();
        let months =
        {
            gregorian:
            {
                small: langPack.smallGregorianMonthNames,
                large: langPack.largeGregorianMonthNames,
            },
            hijri:
            {
                small: langPack.smallHijriMonthNames,
                large: langPack.largeHijriMonthNames,
            },
        };

        let find = ['%Y', '%y', '%MM', '%mm', '%M', '%m', '%D', '%d'];
        let replace = [
            year,
            `${year}`.slice(-2),
            months[calendar]['large'][month - 1],
            months[calendar]['small'][month - 1],
            `0${month}`.slice(-2),
            month,
            `0${day}`.slice(-2),
            day,
        ];
        return str.replace(find, replace, format);
    },

    _buildHeader() {
        const sysRTL = Clutter.get_default_text_direction() === Clutter.TextDirection.RTL;
        const langRTL = lang.getLangMetadata().dir === 'rtl';
        const inversed = sysRTL !== langRTL;

        if (langRTL)
            this._colPosition = 6;
        else
            this._colPosition = 0;


        this.actor.destroy_all_children();

        // Top line of the calendar '<| year month |>'
        this._topBox = new St.BoxLayout();
        this.actor.layout_manager.attach(this._topBox, 0, 0, 7, 1);


        const buttons = [
            {
                icon_name: sysRTL ? 'go-last-symbolic' : 'go-first-symbolic',
                action: inversed ? this._onNextYearButtonClicked : this._onPrevYearButtonClicked,
            },
            {
                icon_name: sysRTL ? 'go-next-symbolic' : 'go-previous-symbolic',
                action: inversed ? this._onNextMonthButtonClicked : this._onPrevMonthButtonClicked,
            },
            {
                icon_name: sysRTL ? 'go-previous-symbolic' : 'go-next-symbolic',
                action: inversed ? this._onPrevMonthButtonClicked : this._onNextMonthButtonClicked,
            },
            {
                icon_name: sysRTL ? 'go-first-symbolic' : 'go-last-symbolic',
                action: inversed ? this._onPrevYearButtonClicked : this._onNextYearButtonClicked,
            },
        ];

        this._monthLabel = new St.Label({style_class: 'calendar-month-label'});
        let style = 'pager-button hcalendar-top-button';
        buttons.forEach(({icon_name, action}, index) => {
            const icon = new St.Icon({icon_name});
            const button = new St.Button({style_class: style, child: icon});
            button.connect('clicked', Lang.bind(this, action));
            icon.set_icon_size(16);
            this._topBox.add(button);

            if (index === (buttons.length / 2 - 1))
                this._topBox.add(this._monthLabel, {col: 2, expand: true, x_fill: false, x_align: St.Align.MIDDLE});
        });

        // Add weekday labels...

        this._weekdayLabels = [];
        for (let i = 0; i < 7; i++) {
            this._weekdayLabels[i] = new St.Label({
                style_class: 'calendar-day-base calendar-day-heading hcalendar-rtl',
            });
            this.actor.layout_manager.attach(this._weekdayLabels[i], Math.abs(this._colPosition - i), 1, 1, 1);
        }

        // All the children after this are days, and get removed when we update the calendar
        this._firstDayIndex = this.actor.get_children().length;
    },

    _onScroll(actor, event) {
        switch (event.get_scroll_direction()) {
        case Clutter.ScrollDirection.UP:
        case Clutter.ScrollDirection.LEFT:
            this._onNextMonthButtonClicked();
            break;
        case Clutter.ScrollDirection.DOWN:
        case Clutter.ScrollDirection.RIGHT:
            this._onPrevMonthButtonClicked();
            break;
        }
    },

    _onPrevMonthButtonClicked() {
        let newDate = this._selectedDate;
        let oldMonth = newDate.month;
        if (oldMonth === 1) {
            newDate.month = 12;
            newDate.year--;
        } else {
            newDate.month--;
        }

        this.setDate(newDate);
    },

    _onNextMonthButtonClicked() {
        let newDate = this._selectedDate;
        let oldMonth = newDate.month;
        if (oldMonth === 12) {
            newDate.month = 1;
            newDate.year++;
        } else {
            newDate.month++;
        }

        this.setDate(newDate);
    },

    _onPrevYearButtonClicked() {
        let newDate = this._selectedDate;
        newDate.year--;

        this.setDate(newDate);
    },

    _onNextYearButtonClicked() {
        let newDate = this._selectedDate;
        newDate.year++;

        this.setDate(newDate);
    },

    _update() {
        let now = new Date();
        const langPack = lang.getLangStrings();
        now = HijriDate.HijriDate.toHijri(now.getFullYear(), now.getMonth() + 1, now.getDate());

        if (this._selectedDate.year === now.year)
            this._monthLabel.text = langPack.largeHijriMonthNames[this._selectedDate.month - 1];
        else
            this._monthLabel.text = `${langPack.largeHijriMonthNames[this._selectedDate.month - 1]} ${str.format(this._selectedDate.year)}`;


        for (let i = 0; i < 7; i++)
            this._weekdayLabels[i].text = langPack.weekdayAbbr[i];


        // Remove everything but the topBox and the weekday labels
        let children = this.actor.get_children();
        for (let i = this._firstDayIndex; i < children.length; i++)
            children[i].destroy();


        // Start at the beginning of the week before the start of the month
        let iter = this._selectedDate;
        iter = HijriDate.HijriDate.fromHijri(iter.year, iter.month, 1);
        iter = new Date(iter.year, iter.month - 1, iter.day);
        let daysToWeekStart = (7 + iter.getDay() - this._weekStart) % 7;
        iter.setDate(iter.getDate() - daysToWeekStart);

        let row = 2;
        let ev = new Events.Events();
        let events;
        while (true) {
            let p_iter = HijriDate.HijriDate.toHijri(iter.getFullYear(), iter.getMonth() + 1, iter.getDate());
            let button = new St.Button({label: str.format(p_iter.day)});

            button.connect('clicked', Lang.bind(this, function () {
                this.setDate(p_iter);
            }));

            // find events and holidays
            events = ev.getEvents(iter);

            let styleClass = ' calendar-day-base calendar-day hcalendar-day ';
            if (events[1])
                styleClass += ' calendar-nonwork-day hcalendar-nonwork-day ';
            else
                styleClass += ' calendar-work-day hcalendar-work-day ';

            if (row === 2)
                styleClass = ` calendar-day-top ${styleClass}`;
            if (iter.getDay() === this._weekStart - 1)
                styleClass = ` calendar-day-left ${styleClass}`;

            if (_sameDay(now, p_iter))
                styleClass += ' calendar-today ';
            else if (p_iter.month !== this._selectedDate.month)
                styleClass += ' calendar-other-month-day hcalendar-other-month-day ';


            if (_sameDay(this._selectedDate, p_iter))
                button.add_style_pseudo_class('active');


            if (events[0])
                styleClass += ' hcalendar-day-with-events ';

            button.style_class = styleClass;

            this.actor.layout_manager.attach(
                button,
                Math.abs(this._colPosition - (7 + iter.getDay() - this._weekStart) % 7),
                row,
                1,
                1
            );

            iter.setDate(iter.getDate() + 1);

            if (iter.getDay() === this._weekStart) {
                // We stop on the first "first day of the week" after the month we are displaying
                if (p_iter.month > this._selectedDate.month || p_iter.year > this._selectedDate.year)
                    break;

                row++;
            }
        }

        // find gregorian date
        let g_selectedDate = HijriDate.HijriDate.fromHijri(this._selectedDate.year, this._selectedDate.month, this._selectedDate.day);
        g_selectedDate = new Date(g_selectedDate.year, g_selectedDate.month - 1, g_selectedDate.day);

        // find hijri date of today
        let h_selectedDate = HijriDate.HijriDate.toHijri(g_selectedDate.getFullYear(), g_selectedDate.getMonth() + 1, g_selectedDate.getDate());

        // add gregorian date
        if (Schema.get_boolean('gregorian-display')) {
            let _datesBox_g = new St.BoxLayout();
            this.actor.layout_manager.attach(_datesBox_g, 0, ++row, 7, 1);

            let button = new St.Button({
                label: this.format(
                    Schema.get_string('gregorian-display-format'),
                    g_selectedDate.getDate(),
                    g_selectedDate.getMonth() + 1,
                    g_selectedDate.getFullYear(),
                    'gregorian'
                ),
                style_class: 'calendar-day hcalendar-date-label',
            });
            _datesBox_g.add(button, {expand: true, x_fill: true, x_align: St.Align.MIDDLE});
            button.connect('clicked', Lang.bind(button, function () {
                St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, this.label);
            }));
        }

        // add event box for selected date
        events = ev.getEvents(g_selectedDate);

        if (events[0]) {
            let _eventBox = new St.BoxLayout();
            this.actor.layout_manager.attach(_eventBox, 0, ++row, 7, 1);
            let bottomLabel = new St.Label({
                text: str.format(events[0]),
                style_class: 'hcalendar-event-label',
            });

            /* Wrap truncate some texts!
             * And I cannot make height of eventBox flexible!
             * I think it's a bug in St library!
             **/
            bottomLabel.clutter_text.line_wrap = true;
            bottomLabel.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
            bottomLabel.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
            _eventBox.add(bottomLabel, {expand: true, x_fill: true, y_fill: true, x_align: St.Align.MIDDLE});
        }
    },
};
