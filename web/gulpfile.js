'use strict'

const gulp  = require('gulp')
const gutil = require('gulp-util')
const babel = require('gulp-babel')
const sass  = require('gulp-sass')
const less  = require('gulp-less')
const path  = require('path')
const del   = require('del')

const basePathPublic = 'assets/core'
const sourcePathJS   = 'assets_core_src/js/**'
const sourcePathSASS = 'assets_core_src/sass/**'
const sourcePathLESS = 'assets_core_src/less/**'
const destPathJS     = `${basePathPublic}/js`
const destPathCSS    = `${basePathPublic}/css`

const noop = (() => {})

gulp.task('clean', () => {
	del([`${basePathPublic}/*/*`])
})

gulp.task('babel', () => {
	gulp.src(sourcePathJS)
		.pipe(babel({ presets: ['es2015'] }).on('error', gutil.log))
		.pipe(gulp.dest(destPathJS))
})

gulp.task('babel:watch', () => {
	gulp.watch(sourcePathJS, ['babel'])
})

gulp.task('sass', () => {
	gulp.src(sourcePathSASS)
		.pipe(sass().on('error', sass.logError))
		.pipe(gulp.dest(destPathCSS))
})

gulp.task('sass:watch', () => {
	gulp.watch(sourcePathSASS, ['sass'])
})

gulp.task('less', function () {
	let sourcePathBootstrapLESS = sourcePathLESS.replace('**', 'kendo.bootstrap.less')

	gulp.src(sourcePathBootstrapLESS)
		.pipe(less({ paths: [path.join(__dirname, 'less', 'includes')] })
			.on('error', gutil.log))
		.pipe(gulp.dest(destPathCSS))
});

gulp.task('less:watch', () => {
	gulp.watch(sourcePathLESS, ['less'])
})

let tasks = ['clean', 'babel', 'babel:watch', 'sass', 'sass:watch', 'less', 'less:watch']
gulp.task('default', tasks, noop)
