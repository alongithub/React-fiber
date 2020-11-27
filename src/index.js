import React, {render, Component} from './react';

const root = document.getElementById('root');

// 普通jsx测试
const jsx = (
	<div>
		<p>
			Hello React fibber
		</p>
		<p>
			Hello along
		</p>
	</div>
)
// render(jsx, root);

// setTimeout(() => {
// 	render(
// 		<div className="newdiv">
// 			1
// 			<p>
// 				new div Hello React fibber
// 			</p>
// 			<p>
// 				Hello along
// 			</p>
// 		</div>, root
// 	)
// }, 5000)


// 测试类组件
class Greating extends Component {
	constructor(props) {
		super(props);
		this.state = {
			name: 'along'
		}
	}

	render() {
		return <div>
			along
			{/* {this.props.title} {this.state.name}
			<button onClick={
				() => {
					this.setState({
						name: '阿龙'
					})
				}
			}>修改名称</button> */}
		</div>
	}
}

render(<Greating title="hello"/>, root);

// 测试函数组件
function FnComponent(props) {
	return <div>{props.title} FnComponent</div>
}

// render(<FnComponent title="hello"/>, root);

// 测试类嵌套
class A extends Component {
	render() {
		return <div>{this.props.children}</div>
	}
}

class B extends Component {
	render() {
		return <A>B</A>
	}
}

// render(<B/>, root);