const join = require('path').join
const Taskr = require('taskr')
const test = require('ava')
const reporter = require('taskr/lib/reporter')

const im = {
	gifsicle: require('imagemin-gifsicle'),
	jpegtran: require('imagemin-jpegtran'),
	optipng: require('imagemin-optipng'),
	svgo: require('imagemin-svgo')
}

const dir = join(__dirname, 'fixtures')
const plugins = [require('@taskr/clear'), require('../')] // eslint-disable-line import/order

const tmpDir = str => join(__dirname, str)
const create = tasks => new Taskr({tasks, plugins})

test('attach `imagemin` to taskr and task', t => {
	t.plan(3)

	const taskr = create({
		* exposed(task) {
			t.true('imagemin' in task)

			const tmp = tmpDir('tmp2')
			yield task.source(`${dir}/*.*`).imagemin([
				im.gifsicle({interlaced: true}),
				im.jpegtran({progressive: true}),
				im.optipng({optimizationLevel: 5}),
				im.svgo()
			]).target(tmp)

			const arr = yield task.$.expand(`${tmp}/*.*`)
			t.is(arr.length, 5, 'copied five files to target directory')
			// yield task.clear(tmp) // Cleanup
		}
	})

	t.true('imagemin' in taskr.plugins)
	reporter.call(taskr)

	return taskr.start('exposed')
})
