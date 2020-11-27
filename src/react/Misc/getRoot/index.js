
// 找到最外层fiber对象
const getRoot = instance => {
	let fiber = instance.__fiber;
	while(fiber.parent) {
		fiber = fiber.parent;
	}
	return fiber;
}

export default getRoot;