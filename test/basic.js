const join = require('path').join
const Taskr = require('taskr')
const test = require('ava')
const reporter = require('taskr/lib/reporter')

const dir = join(__dirname, 'fixtures')
const plugins = [require('@taskr/clear'), require('../')] // eslint-disable-line import/order

const tmpDir = str => join(__dirname, str)
const create = tasks => new Taskr({tasks, plugins})

test('attach `imagemin` to taskr and task', t => {
	t.plan(3)

	const taskr = create({
		* basic(task) {
			t.true('imagemin' in task)

			const tmp = tmpDir('tmp1')
			yield task.source(`${dir}/*.*`).imagemin().target(tmp)

			const arr = yield task.$.expand(`${tmp}/*.*`)
			t.is(arr.length, 5, 'copied five files to target directory')
			// yield task.clear(tmp) // Cleanup
		}
	})

	t.true('imagemin' in taskr.plugins)
	reporter.call(taskr)

	return taskr.start('basic')
})
