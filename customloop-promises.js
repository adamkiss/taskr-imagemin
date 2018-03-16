/**
 * Documentation: Writing Plugins
 * @see https://github.com/lukeed/taskr#plugin
 * @see https://github.com/lukeed/taskr#external-plugins
 */

const {extname} = require('path')
const imagemin = require('imagemin')
const prettyBytes = require('pretty-bytes')
const plur = require('plur')

const {isEmptyObj} = require('taskr/lib/fn')

const PLUGIN_NAME = 'imagemin'
const defaultPlugins = ['gifsicle', 'jpegtran', 'optipng', 'svgo']
const validExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg']

const VERBOSE = process.env.VERBOSE

const stats = {
	bytes: 0,
	savedBytes: 0,
	filesOptimised: 0,
	filesTotal: 0
}

function imageminPromise(use, file, stats, error) {
	try {
		const originalSize = file.data.length
		console.log(file.dir)
		return imagemin
			.buffer(file.data, {use})
			.then(data => {
				const optimizedSize = data.length
				const saved = originalSize - optimizedSize
				// const percent = originalSize > 0 ? saved / originalSize * 100 : 0

				stats.filesTotal++
				if (saved > 0) {
					stats.bytes += originalSize
					stats.savedBytes += saved
					stats.filesOptimised++
				}

				return Object.assign(file, {data, _imagemin: true})
			})
	} catch (err) {
		return error(err.message)
	}
}

module.exports = function (task) {
	const log = (str, p) => task.emit('plugin_log', {error: str, plugin: p || PLUGIN_NAME})
	const warn = (str, p) => task.emit('plugin_warning', {warning: str, plugin: p || PLUGIN_NAME})
	const error = (str, p) => task.emit('plugin_error', {error: str, plugin: p || PLUGIN_NAME})

	const getDefaultPlugins = () =>
		defaultPlugins.reduce((plugins, plugin) => {
			try {
				// Load plugin and call it with default settings
				return plugins.concat(require(`imagemin-${plugin}`)())
			} catch (err) {
				warn(`Couldn't load default plugin "${plugin}"`)
				return plugins
			}
		}, [])

	task.plugin('imagemin', {every: false}, function * (files, plugins, options) {
		if (!Array.isArray(plugins) || plugins.length === 0) {
			warn('Usage: imagemin([plugins]), plugins should be an array. Ignoring…')
			plugins = getDefaultPlugins()
		}

		if (isEmptyObj(plugins)) {
			plugins = getDefaultPlugins()
		}

		if (!Array.isArray(plugins)) {
			return warn('Usage: imagemin([plugins]), plugins should be an array. Ignoring…')
		}

		const use = plugins || getDefaultPlugins()
		const opts = Object.assign({}, {skip: f => false}, options)

		const skippedFiles = []
		const promises = []
		let index = files.length
		while (index--) {
			const file = files[index]

			if (validExts.indexOf(extname(file.base).toLowerCase()) === -1 || opts.skip(file)) {
				log(`Skipping file ${file.base}`)
				skippedFiles.push(file)
			} else {
				promises.push(imageminPromise(use, file, stats, error))
			}
		}

		const promiseFiles = yield Promise.all(promises)
		this._.files = skippedFiles.concat(promiseFiles)

		const percent = stats.bytes > 0 ? (stats.savedBytes / stats.bytes) * 100 : 0
		let msg = `Minified ${stats.filesOptimised} ${plur('image', stats.filesOptimised)} out of ${stats.filesTotal}`;

		if (stats.filesOptimised > 0) {
			msg += ` (saved ${prettyBytes(stats.savedBytes)} - ${percent.toFixed(1).replace(/\.0$/, '')}%)`;
		}

		warn(msg)
	})
}
