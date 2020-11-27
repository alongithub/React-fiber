import { updateNodeElement } from "../DOM";
import { createTaskQueue, arrified, createStateNode, getTag, getRoot } from "../Misc"

const taskQueue = createTaskQueue();

let subTask = null;

let pendingCommit = null; // 用于保存最终构建完的fiber对象

const commitAllWork = (fiber) => {
	const effects = fiber.effects;
	effects.forEach(item => {

		if (item.tag === 'class_component') {
			item.stateNode.__fiber = item;
		}

		if (item.effectTag === "placement") { // 追加节点
			let fiber = item;
			let parentFiber = item.parent;
			while(parentFiber.tag === "class_component" || parentFiber.tag === "function_component") {
				parentFiber = parentFiber.parent;
			}

			if (fiber.tag === "host_component") {
				parentFiber.stateNode.appendChild(fiber.stateNode);
			}

		} else if (item.effectTag === "update") {
			// 执行更新
			if (item.type === item.alternate.type) {
				// 节点类型相同
				updateNodeElement(item.stateNode, item, item.alternate);
			} else {
				// 结点类型不相同
				// 直接用新节点替换
				item.parent.stateNode.replaceChild(
					item.stateNode,
					item.alternate.stateNode
				)
			}
		} else if (item.effectTag === 'delete') {
			item.parent.stateNode.removeChild(item.stateNode)
		}
	})

	// 备份旧的fiber对象
	fiber.stateNode.__rootFiberContainer = fiber;
}

const getFirstTask = () => {
	// 从任务队列中获取任务
	const task= taskQueue.pop();

	// 如果调用类组件的setstate, task 中会有from === class_component
	if (task.from === "class_component") {
		const root = getRoot(task.instance);
		task.instance.__fiber.partialState = task.partialState;
		return {
			props: root.props,
			stateNode: root.stateNode,
			tag: "host_root",
			effects: [],
			child: null,
			alternate: root
		}
	}

	// 返回最顶层节点 fiber对象
	if (task) {
		return {
			props: task.props,
			stateNode: task.dom,
			tag: "host_root",
			effects: [],
			child: null,
			alternate: task.dom.__rootFiberContainer
		}
	} else {
		return null;
	}
	

}

// TODO reconcileChildren 构建子节点的fiber对象
const reconcileChildren = (fiber, children) => {
	// children 可能是对象，也可能是数组，统一处理成数组
	const arrifiedChildren = arrified(children);

	let index = 0;
	let numberOfElements = arrifiedChildren.length;
	let element = null;
	let newFiber = null; // 子集fiber对象
	let prevFiber = null; // 上一个fiber对象

	let alternate = null;
	if (fiber.alternate && fiber.alternate.child) {
		alternate = fiber.alternate.child;
	}

	while(index < numberOfElements || alternate) {
		element = arrifiedChildren[index];

		if (!element && alternate) {
			// 删除操作
			alternate.effectTag = "delete";
			fiber.effects.push(alternate);
		} else if (element && alternate) {
			// 如果 element 存在，并且备份节点也存在，执行更新操作
			newFiber =  {
				type: element.type,
				props: element.props,
				tag: getTag(element),
				effects: [],
				effectTag: "update",
				parent: fiber,
				alternate
			};

			if (element.type === alternate.type) {
				// 新旧节点类型相同
				newFiber.stateNode = alternate.stateNode;
			} else {
				// 新旧节点类型不同
				newFiber.stateNode = createStateNode(newFiber);
			}
	
			
		} else if (element && !alternate) {
			// 初始渲染操作
			newFiber =  {
				type: element.type,
				props: element.props,
				tag: getTag(element),
				effects: [],
				effectTag: "placement",
				parent: fiber
			};
	
			newFiber.stateNode = createStateNode(newFiber);
		}

		
		// 只有第一个子节点会赋值给父节点的child，剩下的子节点赋值为上一子节点的兄弟节点
		if (index === 0) {
			fiber.child = newFiber;
		} else if (element) {
			prevFiber.sibling = newFiber;
		}

		if (alternate && alternate.sibling) {
			alternate = alternate.sibling;
		} else {
			alternate = null;
		}

		prevFiber = newFiber;

		index ++;
	}
}

const executeTask = fiber => {
	// 构建子集的fiber对象
	if (fiber.tag === "class_component") {

		if (fiber.stateNode.__fiber && fiber.stateNode.__fiber.partialState) {
			fiber.stateNode.state = {
				...fiber.stateNode.state,
				...fiber.stateNode.__fiber.partialState
			}
		}

		reconcileChildren(fiber, fiber.stateNode.render());
	} else if (fiber.tag === 'function_component') {
		reconcileChildren(fiber, fiber.stateNode(fiber.props));
	} else {
		reconcileChildren(fiber, fiber.props.children);
	}
	// reconcileChildren(fiber, fiber.props.children);

	if (fiber.child) {
		return fiber.child;
	}

	let currentExecutelyFiber = fiber; // 目前在处理的节点

	while(currentExecutelyFiber.parent) {
		// 将所有fiber对象保存到最顶层fiber的effects集合中，所有子节点协助最顶层收集fiber对象。
		currentExecutelyFiber.parent.effects = currentExecutelyFiber.parent.effects.concat(
			currentExecutelyFiber.effects.concat([currentExecutelyFiber])
		)
		if (currentExecutelyFiber.sibling) {
			return currentExecutelyFiber.sibling;
		}
		currentExecutelyFiber = currentExecutelyFiber.parent;
	}

	// 执行到这里时代表fiber构建完毕，可以开始进行渲染了
	pendingCommit = currentExecutelyFiber;
}

const workLoop = deadline => {
	// 如果没有当前任务尝试获取 任务队列中的任务
	if (!subTask) {
		subTask = getFirstTask();
	}
	// 如果当前任务存在并且浏览器有空余时间，处理这个任务，并在任务处理结束后返回一个新的任务
	while(subTask && deadline.timeRemaining() > 1) {
		subTask = executeTask(subTask);
	}

	if (pendingCommit) {
		commitAllWork(pendingCommit); // 提交fiber对象，准备构建dom
	}
}

const performTask = deadline => {
	// 执行任务
	workLoop(deadline);

	// 如果 subTask 有值， 或者 任务队列中还有值，继续请求执行任务
	if (subTask || !taskQueue.isEmpty()) {
		requestIdleCallback(performTask)
	}
}

export const render = (element, dom) => {
	console.log(element);
	// 1 向任务队列添加任务
	// 2.在浏览器空闲时执行任务 

	// 任务是通过vdom 对象构建fiber对象
	taskQueue.push({
		dom,
		props: {children: element}
	})

	requestIdleCallback(performTask);

}

export const scheduleUpdate = (instance, partialState) => {
	taskQueue.push({
		from: 'class_component',
		instance,
		partialState,
	});

	requestIdleCallback(performTask);
}