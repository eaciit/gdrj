const gulp  = require('gulp')
const gutil = require('gulp-util')
const babel = require('gulp-babel')
const sass  = require('gulp-sass')
const del   = require('del')

const basePathPublic = 'assets/core'
const sourcePathJS   = 'assets_core_src/js/**'
const sourcePathSASS = 'assets_core_src/sass/**'
const sourcePathImg  = 'assets_core_src/img/**'
const destPathJS     = `${basePathPublic}/js`
const destPathCSS    = `${basePathPublic}/css`
const destPathImg    = `${basePathPublic}/img`

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

gulp.task('default', ['clean', 'babel', 'babel:watch', 'sass', 'sass:watch'], noop)
