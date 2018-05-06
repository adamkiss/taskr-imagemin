'use strict'

const {extname} = require('path')
const imagemin = require('imagemin')
const {isEmptyObj} = require('taskr/lib/fn')

const PLUGIN_NAME = 'imagemin'
const defaultPlugins = ['gifsicle', 'jpegtran', 'optipng', 'svgo']
const validExts = ['.jpg', '.jpeg', '.png', '.gif', '.svg']

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

	const loadedDefaultPlugins = getDefaultPlugins()

	task.plugin('imagemin', {}, function * (file, config) {
		if (!('plugins' in config) || (!Array.isArray(config.plugins) || config.plugins.length === 0)) {
			// warn('Usage: imagemin({plugins: [plugins]}), plugins should be an array. Ignoring…')
			config.plugins = getDefaultPlugins()
		}

		config = Object.assign({}, {skip: () => false}, config)

		if (validExts.indexOf(extname(file.base).toLowerCase()) === -1 || config.skip(file)) {
			return log(`Skipping unsupported image ${file.base}`)
		}

		try {
			const use = config.plugins || loadedDefaultPlugins()
			file.data = yield imagemin.buffer(file.data, {use})
		} catch (err) {
			return error(err.message)
		}
	})
}
module.exports.PLUGIN_NAME = PLUGIN_NAME
