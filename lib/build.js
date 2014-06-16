'use strict';

var cm = require('./common');
var es = require('event-stream');
var gulp = require('gulp');
var path = require('path');
var rename = require('gulp-rename');
var changed = require('gulp-changed');

var ECT = require('ect');

var DIR = cm.BUILD_DIR;

var renderer = ECT({
  root: path.resolve(DIR + '/gh-pages/views'),
  ext: '.html'
});

module.exports = {

  bower: function (done, bwrData) {

    var almostDone = cm._.after(5, done);

    gulp.src('./branch/bower/.travis.yml')
      .pipe(gulp.dest(DIR + '/bower/'))
      .on('end', almostDone);

    gulp.src('./branch/bower/bower.tmpl.json')
      .pipe(cm.processTemplateFile({ bwr: cm._.assign({}, cm.bwr, bwrData) }))
      .pipe(rename('bower.json'))
      .pipe(gulp.dest(DIR + '/bower/'))
      .on('end', almostDone);

    gulp.src(path.join('../../dist/', cm.public.main_dist_dir || '') + '/**')
      .pipe(gulp.dest(DIR + '/bower/'))
      .on('end', almostDone);

    gulp.src('../../CHANGELOG.md')
      .pipe(gulp.dest(DIR + '/bower/'))
      .on('end', almostDone);

    gulp.src('../../LICENCE')
      .pipe(gulp.dest(DIR + '/bower/'))
      .on('end', almostDone);
  },


  subbower: function (moduleName, bwrData) {
    return function (done) {

      var almostDone = cm._.after(5, done);
      var destination = DIR + '/subbower/' + moduleName;

      gulp.src('./branch/bower/.travis.yml')
        .pipe(gulp.dest(destination))
        .on('end', almostDone);

      gulp.src('./branch/bower/bower.tmpl.json')
        .pipe(cm.processTemplateFile({ bwr: cm._.assign({}, cm.bwr, bwrData) }))
        .pipe(rename('bower.json'))
        .pipe(gulp.dest(destination))
        .on('end', almostDone);

      gulp.src(path.join('../../dist/', cm.public.sub_dist_dir || '', moduleName) + '/**')
        .pipe(gulp.dest(destination))
        .on('end', almostDone);

      gulp.src('../../CHANGELOG.md')
        .pipe(gulp.dest(destination))
        .on('end', almostDone);

      gulp.src('../../LICENCE')
        .pipe(gulp.dest(destination))
        .on('end', almostDone);
    };
  },


  ghpages: function () {

    var destinationRoot = DIR + '/gh-pages';

    (function (destination) {

      //
      // Initial copies
      //

      gulp.task('Initialize publisher gh-pages', function () {
        return gulp.src(['**', '!bower_components{,/**}'], { cwd: 'branch/gh-pages'})
          .pipe(changed(destination))
          .pipe(gulp.dest(destination));
      });

      gulp.task('Copy the demo html page to the the views folder', function () {
        return gulp.src('demo/**', { cwd: '../..'})
          .pipe(changed(destination))
          .pipe(gulp.dest(destination));
      });

      //
      // JS FILE PROCESSING
      //

      var defaultjs = [
        'bower_components/prettify.js',
        'bower_components/angular/angular.min.js',
        'bower_components/angular-bootstrap/ui-bootstrap-tpls.min.js',
        'js/prettifyDirective.js',
        'js/plunker.js',
        'js/app-publisher.js'
      ];

      gulp.task('copie js to output', function () {
        return gulp.src(defaultjs, { base: 'branch/gh-pages', cwd: 'branch/gh-pages' })
          .pipe(changed(destination))
          .pipe(gulp.dest(destination));
      });

      var jsFiles = cm.public.js || [];

      if (typeof jsFiles === 'function') {
        jsFiles = cm.public.js(defaultjs);
      } else {
        jsFiles = defaultjs.concat(cm.public.bowerComponents.map(function (file) {
          return 'bower_components/' + file;
        })).concat(jsFiles);
      }

      //
      // Process demo pages
      //

      gulp.task('process demo pages', ['Initialize publisher gh-pages', 'Copy the demo html page to the the views folder'], function () {
        return gulp.src(['*.html', '!_*'], { cwd: DIR + '/gh-pages/views'})
          .pipe(changed(destination))
          .pipe(es.map(function (file, cb) {
            file.contents = new Buffer(renderer.render(file.path, cm._.extend(cm, {
              jsFiles: jsFiles
            })));
            cb(null, file);
          }))
          .pipe(gulp.dest(destination));
      });

    })(destinationRoot);

    //
    // Copie distribution files
    //

    (function (destination) {

      gulp.task('copie dist files', function () {
        gulp.src(path.join('../../dist/', cm.public.main_dist_dir || '') + '/**')
          .pipe(changed(destination))
          .pipe(gulp.dest(destination));
      });

    })(destinationRoot + '/dist');

    //
    // Copie bower dep
    //

    (function (destination) {

      gulp.task('copie bower dep default', function () {
        return gulp.src([
          'bower_components/bootstrap/dist/css/bootstrap.min.css',
          'bower_components/bootstrap/dist/fonts/glyphicons-halflings-regular.eot',
          'bower_components/bootstrap/dist/fonts/glyphicons-halflings-regular.svg',
          'bower_components/bootstrap/dist/fonts/glyphicons-halflings-regular.ttf',
          'bower_components/bootstrap/dist/fonts/glyphicons-halflings-regular.woff'
        ], { base: 'branch/gh-pages/bower_components', cwd: 'branch/gh-pages'})
          .pipe(changed(destination))
          .pipe(gulp.dest(destination));
      });
      gulp.task('copie bower dep from local', function () {
        return gulp.src(cm.public.bowerComponents, { base: '../', cwd: '../../bower_components'})
          .pipe(changed(destination))
          .pipe(gulp.dest(destination));
      });
      gulp.task('copie bower dep', ['copie bower dep default', 'copie bower dep from local']);

    })(destinationRoot + '/bower_components');

    return gulp.start(
      'process demo pages',
      'copie bower dep',
      'copie dist files',
      'copie js to output'
    );
  }
};
