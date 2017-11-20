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

	let totalBytes = 0
	let totalSavedBytes = 0
	let totalFiles = 0

	task.plugin('imagemin', {every: false}, function * (files, plugins) {
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

		let index = files.length
		while (index--) {
			const file = files[index]
			if (validExts.indexOf(extname(file.base).toLowerCase()) === -1) {
				warn(`Skipping unsupported image ${file.base}`)
				continue
			}

			try {
				const originalSize = file.data.length

				file.data = yield imagemin.buffer(file.data, {use})
				files[index] = file

				console.log(file.data.length)

				const optimizedSize = file.data.length
				const saved = originalSize - optimizedSize
				const percent = originalSize > 0 ? saved / originalSize * 100 : 0

				if (VERBOSE >= 2) {
					const savedMsg = `saved ${prettyBytes(saved)} - ${percent.toFixed(1).replace(/\.0$/, '')}%`
					const msg = saved > 0 ? savedMsg : 'already optimized'
					warn(`✔ ${file.base}: ${msg}`)
				}

				if (saved > 0) {
					totalBytes += originalSize
					totalSavedBytes += saved
					totalFiles++
				}
			} catch (err) {
				return error(err.message)
			}
		}

		const percent = totalBytes > 0 ? (totalSavedBytes / totalBytes) * 100 : 0
		let msg = `Minified ${totalFiles} ${plur('image', totalFiles)}`;

		if (totalFiles > 0) {
			msg += ` (saved ${prettyBytes(totalSavedBytes)} - ${percent.toFixed(1).replace(/\.0$/, '')}%)`;
		}

		warn(msg)
	})
}
