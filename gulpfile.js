var gulp = require('gulp');

gulp.task('browserify', function() {
  var browserify = require('browserify');
  var source = require('vinyl-source-stream');
  return browserify('./index.js')
    .bundle()
    .pipe(source('bundle.js'))
    .pipe(gulp.dest('./build/'));
});

gulp.task('server', function() {
	require('');
});

gulp.task('default', [ 'browserify']);
