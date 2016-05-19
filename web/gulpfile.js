'use strict'

const gulp  = require('gulp')
const gutil = require('gulp-util')
const babel = require('gulp-babel')
const sass  = require('gulp-sass')
const less  = require('gulp-less')
const path  = require('path')
const del   = require('del')

const baseSourcePath = 'src'
const baseDestPath   = 'assets/core'
const sourcePathJS   = `${baseSourcePath}/js/**`
const sourcePathSASS = `${baseSourcePath}/sass/**`
const sourcePathLESS = `${baseSourcePath}/less/**`
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

gulp.task('sass', () => {
	gulp.src(sourcePathSASS)
		.pipe(sass().on('error', sass.logError))
		.pipe(gulp.dest(destPathCSS))
})

gulp.task('sass:watch', ['sass'], () => {
	gulp.watch(sourcePathSASS, ['sass'])
})

gulp.task('less', function () {
	let sourcePathBootstrapLESS = sourcePathLESS.replace('**', 'kendo.ez.less')

	gulp.src(sourcePathBootstrapLESS)
		.pipe(less({ paths: [path.join(__dirname, 'less', 'includes')] })
			.on('error', gutil.log))
		.pipe(gulp.dest(destPathCSS))
});

gulp.task('less:watch', ['less'], () => {
	gulp.watch(sourcePathLESS, ['less'])
})

let tasks = ['clean', 'babel:watch', 'sass:watch', 'less:watch']
gulp.task('default', tasks, noop)
