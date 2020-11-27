import {createDOMElement, updateDOMElement} from '../../DOM';
import {createReactInstance} from '../createReactInstance';
const createStateNode = fiber => {
	if (fiber.tag === 'host_component') {
		// 普通节点，创建dom对象
		return createDOMElement(fiber);
	} else {
		// 组件
		return createReactInstance(fiber);
	}
}

export default createStateNode;