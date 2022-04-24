const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const Gdk = imports.gi.Gdk;
const Lang = imports.lang;

const SETTINGS_SCHEMA = 'hijri-calendar';

const Gettext = imports.gettext.domain('hijri-calendar');
const _ = Gettext.gettext;

let extension = imports.misc.extensionUtils.getCurrentExtension();
let convenience = extension.imports.convenience;

const lang = extension.imports.locale.utils;

let Schema = convenience.getSettings(extension, SETTINGS_SCHEMA);

const commonFieldOptions = {
    visible: true,
    hexpand: true,
    can_focus: true,
}

const rows = [
    {
        label: _("Display Gregorian"),
        getField: () => {
            const item = new Gtk.Switch();
            Schema.bind('gregorian-display', item, 'active', Gio.SettingsBindFlags.DEFAULT);
            return item;
        }
    },
    {
        label: _("Gregorian Format"),
        getField: () => {
            const format = new Gtk.Entry();
            format.set_text(Schema.get_string('gregorian-display-format'));
            format.connect('changed', function (format) {
                Schema.set_string('gregorian-display-format', format.text);
            });
            return format;
        }
    },
    {
        label: _("Converter Format"),
        getField: () => {
            const format = new Gtk.Entry();
            format.set_text(Schema.get_string('converter-format'));
            format.connect('changed', function (format) {
                Schema.set_string('converter-format', format.text);
            });
            return format;
        }
    },
    {
        label: _("International Events"),
        getField: () => {
            const item = new Gtk.Switch();
            Schema.bind('event-world', item, 'active', Gio.SettingsBindFlags.DEFAULT);
            return item;
        }
    },
    {
        label: _("Display Language"),
        getField: () => {
            const languages = lang.listLanguages();
            const selectedLanguage = Schema.get_string('display-language');

            const languagesBox = new Gtk.ComboBoxText()
            languages.forEach(function (language, index) {
                languagesBox.append_text(language);
                if (language === selectedLanguage) {
                    languagesBox.set_active(index);
                }
            });
            languagesBox.connect('changed', function (combo) {
                Schema.set_string('display-language', combo.get_active_text());
            });
            return languagesBox;
        }
    },
    {
        label: _("Numeric System"),
        getField: () => {
            const numerals = lang.listNumerals();
            const selectedNumerals = Schema.get_string('numeral-system');
            const numeralsBox = new Gtk.ComboBoxText()
            numerals.forEach(function (systemId, index) {
                const system = lang.getNumerals(systemId);
                numeralsBox.append(systemId, system.label);
                if (systemId === selectedNumerals) {
                    numeralsBox.set_active(index);
                }
            });
            numeralsBox.connect('changed', function (combo) {
                Schema.set_string('numeral-system', combo.get_active_id());
            });
            return numeralsBox;
        }
    },
    {
        label: _("Days Adjustment"),
        getField: () => {
            const currentValue = Schema.get_int('date-adjustment') || 0;
            const GtkAdjustment = Gtk.Adjustment.new( currentValue, -3, 3, 1, 1, 0);
            const adjustment = Gtk.SpinButton.new(GtkAdjustment, 1, 0);
            adjustment.connect('changed', function (field) {
                Schema.set_int('date-adjustment', field.get_value_as_int());
            });
            return adjustment;
        }
    },
    {
        label: _("Use custom color"),
        getField: () => {
            const item = new Gtk.Switch();
            Schema.bind('custom-color', item, 'active', Gio.SettingsBindFlags.DEFAULT);
            return item;
        }
    },
    {
        label: _("Custom color"),
        getField: (context) => {
            let color = new Gtk.ColorButton();

            let _color = context.getColorByHexadecimal(Schema.get_string('color'));
            color.set_color(_color);

            color.connect('color-set', (function (color) {
                Schema.set_string('color', this.getHexadecimalByColor(color.get_color()));
            }).bind(this));
            return color;
        }
    },
    {
        label: _("Startup Notification"),
        getField: () => {
            const item = new Gtk.Switch();
            Schema.bind('startup-notification', item, 'active', Gio.SettingsBindFlags.DEFAULT);
            return item;
        }
    },
    {
        label: _("Widget Format"),
        getField: () => {
            const format = new Gtk.Entry();
            format.set_text(Schema.get_string('widget-format'));
            format.connect('changed', function (format) {
                Schema.set_string('widget-format', format.text);
            });
            return format;
        }
    }
]

function init()
{
}

const App = new Lang.Class({
    Name: 'HijriCalendar.App',

    _init: function ()
    {
        this.main_box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 20,
            border_width: 10
        });

        const frame = new Gtk.Frame({
            visible: true,
            can_focus: false,
            label_xalign: 0,
            shadow_type: Gtk.ShadowType.IN
        });

        const listBox = new Gtk.ListBox({
            can_focus: false,
            visible: true,
            selection_mode: Gtk.SelectionMode.NONE,
        });


        rows.forEach(({ label, getField }) => {

            const row = new Gtk.ListBoxRow({
                can_focus: true,
                visible: true,
            });

            const grid = new Gtk.Grid({
                can_focus: false,
                visible: true,
                margin_left: 12,
                margin_right: 12,
                margin_top: 12,
                margin_bottom: 12,
                row_spacing: 32,
                column_spacing: 32,
            });

            const labelWidget = new Gtk.Label({
                label,
                visible: true,
                can_focus: false,
                xalign: 0,
                hexpand: true,
            });

            const field = getField(this);

            grid.attach(labelWidget, 0, 0, 1, 1);
            grid.attach(field, 1, 0, 1, 1);
            row.add(grid);
            listBox.add(row);
        })

        frame.add(listBox);
        this.main_box.add(frame);

        this.main_box.show_all();
    },

    _scaleRound: function(value)
    {
        // Based on gtk/gtkcoloreditor.c
        value = Math.floor((value / 255) + 0.5);
        value = Math.max(value, 0);
        value = Math.min(value, 255);
        return value;
    },

    _dec2Hex: function(value)
    {
        value = value.toString(16);

        while (value.length < 2) {
            value = '0' + value;
        }

        return value;
    },

    getColorByHexadecimal: function(hex)
    {
        let colorArray = Gdk.Color.parse(hex);
        let color = null;

        if (colorArray[0]) {
            color = colorArray[1];
        } else {
            // On any error, default to red
            color = new Gdk.Color({red: 65535});
        }

        return color;
    },

    getHexadecimalByColor: function(color)
    {
        let red = this._scaleRound(color.red);
        let green = this._scaleRound(color.green);
        let blue = this._scaleRound(color.blue);
        return '#' + this._dec2Hex(red) + this._dec2Hex(green) + this._dec2Hex(blue);
    }
});

function buildPrefsWidget()
{
    let widget = new App();
    return widget.main_box;
}
