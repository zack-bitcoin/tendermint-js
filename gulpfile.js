var gulp = require('gulp');

gulp.task('browserify', function() {
  var browserify = require('browserify');
  var source = require('vinyl-source-stream');
  return browserify('./index.js', {debug: true})
    .bundle()
    .pipe(source('bundle.js'))
    .pipe(gulp.dest('./build/'));
});

gulp.task('default', ['browserify']);
