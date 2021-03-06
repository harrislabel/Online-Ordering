require(['app'], function(app) {

    app.config.paths['tests_list'] = "../core/js/utest/_tests_list";
    app.config.paths['e2e_list'] = "../core/js/utest/_e2e_list";
    app.config.paths['blanket'] = "../core/js/utest/jasmine/lib/jasmine2/blanket";
    app.config.paths['jasmine_blanket'] = "../core/js/utest/jasmine/lib/jasmine2/jasmine-blanket";

    app.config.shim['jasmine_blanket'] = {deps: ['blanket'],  exports: 'blanket'};

    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000; //30sec.

    var skins = app.skins;

    // add skins
    skins.set('WEBORDER', 'weborder'); // add `weborder` skin
    skins.set('WEBORDER_MOBILE', 'weborder_mobile'); // add `weborder` skin
    skins.set('PAYPAL', 'paypal', '../dev/skins/paypal'); // set `paypal` skin
    skins.set('MLB', 'mlb', '../dev/skins/mlb'); // set `mlb` skin
    skins.set('DIRECTORY_MOBILE', 'directory_mobile', '../dev/skins/directory_mobile'); // set `directory` skin

    // set REVEL_HOST
    //app.REVEL_HOST = window.location.origin;
    app.REVEL_HOST = 'https://weborder-dev-branch.revelup.com';

    if(!app.REVEL_HOST)
        return alert('REVEL_HOST is undefined. Please assign it in main.js file. (Need add app.REVEL_HOST = <url>;)');

    // set config for require
    require.config(app.config);

    require(['cssua', 'functions', 'errors', 'tests_list', 'e2e_list', 'settings', 'tax', 'main_router', 'locale'], function() {
        app.get = parse_get_params();
        // invoke beforeStart onfig
        app.beforeInit();

        // init errors object and check browser version
        var errors = App.Data.errors = new App.Models.Errors();
        window.alert_message = function(){};

        // init settings object
        var settings = App.Data.settings = new App.Models.Settings({
            supported_skins: app.skins.available
        });
        settings.set({
            'img_path' : 'test/path/',
            'settings_skin' : { img_default : 'test/img_default' },
            'establishment' : 1,
            'host': 'testHost'
        });

        // init Locale object
        var locale = App.Data.locale = new App.Models.Locale;
        settings.on('change:skin', function() {
            locale.dfd_load = locale.loadLanguagePack(); // load a language pack from backend
            locale.dfd_load.done(function() {
                _loc = locale.toJSON();
                _.extend(ERROR, _loc.ERRORS);
                _.extend(MSG, _loc.MSG);
                delete _loc.ERRORS;
                delete _loc.MSG;
            });
            locale.on('showError', function() {
                errors.alert(ERROR.LOAD_LANGUAGE_PACK, true); // user notification
            });
        });

        $.ajax({
            type: "GET",
            url: "js/utest/data/Settings.json",
            dataType: "json",
            async: false,
            success: function(data) {
                settings.set('settings_system', data);
            }
        });


        if (typeof end2endMode != 'undefined' && end2endMode === true) {
            var srv_name = /^http[s]*:\/\/([^\.\s]+)\./.exec(window.location.origin), hostName;
           // if (srv_name[1] == "localhost")
                hostName = 'https://weborder-dev-branch.revelup.com';
           // else
           //     hostName = window.location.origin;

            settings.set({
                establishment: 18,
                host: hostName
                //host: 'https://weborder-dev-branch.revelup.com'
            });

            require(e2e_tests_list, function() {
                $(window).trigger('load');
            });
        }
        else {

            if (App.Data.devMode == true) {
                //starting the tests without code coverage testing:
                require(tests_list, function() {
                    $(window).trigger('load');
                });
            }
            else {
                require(['jasmine_blanket'], function(blanket) {

                    blanket.options('debug', true);
                    blanket.options('filter', 'js');
                    blanket.options('antifilter', [ 'js/libs/', 'js/utest/' ]);
                    blanket.options('branchTracking', true);

                    var jasmineEnv = jasmine.getEnv();
                    jasmineEnv.addReporter(new jasmine.BlanketReporter());
                    jasmineEnv.updateInterval = 1000;

                    $(document).ready(function() {
                        locale.dfd_load.done(function() {
                            require(tests_list, function(spec) {
                                window.onload();
                            });
                        });
                    });
                });
            }
        }
    });

});