/**
 * @name: 创建任务队列
 * @test: test font
 * @msg: 
 * @param {*}
 * @return {*}
 */
const createTaskQueue = () => {
	const taskQueue = []
	return {
		push: item => taskQueue.push(item), // 向任务队列添加任务
		pop: () => taskQueue.shift(), // 获取任务
		isEmpty: () => taskQueue.length === 0, // 判断是否还有任务
	}
}

export default createTaskQueue;