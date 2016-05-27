'use strict'

const gulp    = require('gulp')
const gutil   = require('gulp-util')
const babel   = require('gulp-babel')
const compass = require('gulp-compass')
const path    = require('path')
const del     = require('del')

const baseSourcePath = 'src'
const baseDestPath   = 'assets/core'
const sourcePathJS   = `${baseSourcePath}/js/**.js`
const sourcePathSASS = `${baseSourcePath}/sass/**.sass`
const destPathJS     = `${baseDestPath}/js`
const destPathCSS    = `${baseDestPath}/css`

const noop = (() => {})

gulp.task('clean', () => {
	del([`${baseDestPath}/*/*`])
})

gulp.task('babel', () => {
	gulp.src(sourcePathJS)
		.pipe(babel({ presets: ['es2015'] }).on('error', gutil.log))
		.pipe(gulp.dest(destPathJS))
})

gulp.task('babel:watch', ['babel'], () => {
	gulp.watch(sourcePathJS, ['babel'])
})

gulp.task('compass', () => {
	gulp.src(sourcePathSASS)
		.pipe(compass({
			css: destPathCSS,
			sass: './src/sass'
		}).on('error', gutil.log))
		.pipe(gulp.dest(destPathCSS))
})

gulp.task('compass:watch', ['compass'], () => {
	gulp.watch(sourcePathSASS, ['compass'])
})

// gulp.task('compass', function() {
//   gulp.src('./src/*.scss')
//     .pipe(compass({
//       project: path.join(__dirname, 'assets'),
//       css: 'css',
//       sass: 'sass'
//     }))
//     .pipe(gulp.dest('app/assets/temp'));
// });

let tasks = ['clean', 'babel:watch', 'compass:watch']
gulp.task('default', tasks, noop)
