/*
 * grunt-minscript-tpl
 *
 *
 * Copyright (c) 2014 Robin Radic
 * Licensed under the MIT license.
 */

'use strict';
var lib = require('../lib');
var util = require('util');
var path = require('path');
var _ = require('lodash'),
//    chalk = require('chalk'),
    gradic = require('../lib'),
    Handlebars = require('handlebars'),
    fs = require('fs-extra'),
    semver = require('semver'),
    async = require('async'),
    exec = require('child_process').exec;

module.exports = function (grunt) {

    // Please see the Grunt documentation for more information regarding task
    // creation: http://gruntjs.com/creating-tasks

    /*

    if bower enabled do
        if syncVersions do

    npm version [patch/minor/major]

     */

    var ascmd = function(cmd, desc){
        return function(next){
            exec(cmd, function(err, stdin, stdout){
                console.log(cmd, desc, err, stdin, stdout);
                if(!err && typeof desc === 'string') grunt.log.ok(desc);
                next(err);
            });
        }
    };

    grunt.registerTask('publisher', 'Publish node/bower projects.', function (action) {
        grunt.config.requires(this.name);

        if(typeof action === 'undefined'){
            grunt.fail.fatal('Missing task action. usage: "grunt publisher:ACTION". Check "grunt publisher:help" for all options');
        } else if(['patch', 'minor', 'major'].indexOf(action) === -1) {
            grunt.fail.fatal('Invalid task action "' + action + '".');
        }

        var self = this;
        var taskDone = this.async();


        var options = _.merge({
            bower: {
                enabled: false,
                syncVersions: true
            },
            npm: {
                enabled: true,
                publish: false
            },
            git: {
                enabled: true,
                pushTag: true,
                pushMaster: true
            }
        }, grunt.config.get(this.name));

        var paths = {
            bower: path.join(process.cwd(), 'bower.json'),
            npm: path.join(process.cwd(), 'package.json')
        };

        var ok = grunt.log.ok;

        var version = semver(fs.readJsonFileSync(paths.npm).version);
        version.inc(action);

        var jobs = [];

        if(options.bower.enabled){
            if(options.bower.syncVersions){
                jobs.push(function(next){
                    var bower = fs.readJsonFileSync(paths.bower);
                    bower.version = version.toString();
                    fs.outputJSONSync(paths.bower, bower);
                    exec('git add bower.json', function(err, stdout, stderr){
                        if(err) next(err);
                        exec('git commit -m "synced bower with version of upcomming npm version"', function(err, stdout, stderr){
                            ok('bower synced');
                            next(err);
                        });
                    });
                });
            }
        }

        if(options.npm.enabled){
            jobs.push(ascmd('npm version ' + action, 'Increased npm version to ' + version.toString()));
            if(options.npm.publish){
                jobs.push(ascmd('npm publish', 'Publishing package on the webz'))
            }
        }

        if(options.git.enabled){
            if(options.git.pushTag){
                jobs.push(ascmd('git push -u origin v' + version.toString(), 'Pushed git tag version'));
            }
            if(options.git.pushMaster){
                jobs.push(ascmd('git push -u origin master', 'Pushed git master version'));
            }
        }


        async.waterfall(jobs, function(err, result){
            //ok('after waterfall');
            if(err) grunt.fail.fatal(err);
            taskDone();
        });




    });

};
