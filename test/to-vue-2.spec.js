const {default: toVue2} = require('vue-2-3/to-vue-2');
const Vue = require('vue');
const Vue3 = require('vue3');
const {mount} = require('@vue/test-utils');
const {createApp, provide, inject, nextTick} = Vue3;

toVue2.register(Vue, Vue3);

describe('Error handling', () => {
	test('throw error when used in vue 3 app', () => {
		const Vue3Component = {
			props: ['propWorks'],
			template: `
				I'm Vue 3
			`,
		};

		const initApp = () => {
			const app = createApp({
				template: `
				<div>
					<vue3-component>
						Default slot
					</vue3-component>
				</div>
				`,
				components: {
					Vue3Component: toVue2(Vue3Component),
				},
			});
			app.config.warnHandler = () => {};
			app.mount(document.createElement('div'));
		};

		expect(initApp).toThrow('toVue2 must be used to mount a component in a Vue 2 app');
	});
});

describe('Vue 3 component in a Vue 2 app', () => {
	test('render w/ class, style, attrs, props, slots', () => {
		const Vue3Component = {
			setup() {
				return {
					setupWorks: 'Setup Works',
				};
			},
			props: ['propWorks'],
			inheritAttrs: false,
			template: `
				I'm Vue 3

				{{ setupWorks }}

				{{ propWorks }}

				<div v-bind="$attrs" />

				<slot />
				<slot name="named-slot" />
				<slot name="template-slot" />
				<slot name="element-slot" />
			`,
		};

		const vm = mount({
			template: `
			<div>
				I'm Vue 2

				<vue3-component
					class="static"
					:class="'dynamic'"
					style="margin: 0;"
					:style="{ color: 'red' }"
					:prop-works="'Prop works!'"
					title="attr inherited"
				>
					Default slot

					<div>some element</div>

					<template #named-slot>
						Named slot
					</template>

					<div slot="element-slot">
						Element slot
					</div>

				</vue3-component>
			</div>
			`,
			components: {
				Vue3Component: toVue2(Vue3Component),
			},
		});

		expect(vm.html()).toMatchSnapshot();
	});

	test('ref & API', () => {
		const Vue3Component = {
			template: '<button>Im Vue 3</button>',
		};

		const app = mount({
			template: '<div><vue-3-component ref="test" /></div>',
			components: {
				Vue3Component: toVue2(Vue3Component),
			},
		});

		const button = app.findComponent({ref: 'test'});

		expect(button.element.tagName).toBe('BUTTON');
		expect(button.vm.v3.$el.tagName).toBe('BUTTON');
	});

	test('reactivity', async () => {
		const Vue3Component = {
			props: ['number'],
			template: `
				<div>
					I'm Vue 3

					Prop: {{ number }}

					<slot />
					<slot name="named-slot" />
					<slot name="template-slot" />
					<slot name="element-slot" />
					<slot name="conditional-slot" />
				</div>
			`,
		};

		const vm = mount({
			template: `
			<div>
				I'm Vue 2
				{{ number }}

				<template v-if="number % 2">
					Conditional
				</template>
				<vue3-component
					v-if="shown"
					:number="number"
					:title="'Attribute ' + number"
				>
					Default slot {{ number * 2 }}

					<template #named-slot>
						Named slot {{ number * 3 }}
					</template>

					<div slot="element-slot">
						Element slot {{ number * 4}}
					</div>

					<template
						v-if="number % 2"
						slot="conditional-slot"
					>
						Conditional slot
					</template>
				</vue3-component>
			</div>
			`,
			components: {
				Vue3Component: toVue2(Vue3Component),
			},
			data() {
				return {
					number: 0,
					shown: true,
				};
			},
		});

		expect(vm.html()).toMatchSnapshot();

		await vm.setData({number: 1});
		await nextTick();

		expect(vm.html()).toMatchSnapshot();

		await vm.setData({number: 2});
		await nextTick();

		expect(vm.html()).toMatchSnapshot();

		await vm.setData({number: 3});
		await nextTick();

		expect(vm.html()).toMatchSnapshot();

		await vm.setData({shown: false});
		await nextTick();

		expect(vm.html()).toMatchSnapshot();
	});

	test('event-listeners', async () => {
		const clickHandler = jest.fn();
		const customEventHandler = jest.fn();

		const Vue3Component = {
			template: '<button @click="$emit(\'custom-event\')">I\'m Vue 3</button>',
		};

		const vm = mount({
			template: `
			<div>
				I'm Vue 2

				<vue3-component
					id="button"
					@click.capture.once="clickHandler"
					@custom-event="customEventHandler"
				>
					Click me
				</vue3-component>
			</div>
			`,
			components: {
				Vue3Component: toVue2(Vue3Component),
			},
			methods: {
				clickHandler,
				customEventHandler,
			},
		});

		vm.find('#button').element.click();
		vm.find('#button').element.click();
		expect(clickHandler).toHaveBeenCalledTimes(1);
		expect(customEventHandler).toHaveBeenCalledTimes(2);
	});

	describe('provide/inject', () => {
		test('object provide', async () => {
			const randomValue = Math.random();
			const Vue3Parent = {
				template: '<slot/>',
				provide: {
					randomValue,
				},
			};

			const Vue3Child = {
				template: '{{ randomValue }}',
				inject: ['randomValue'],
			};

			const vm = mount({
				template: `
				<div>
					<vue3-parent>
						<vue3-child />
					</vue3-parent>
				</div>
				`,
				components: {
					Vue3Parent: toVue2(Vue3Parent),
					Vue3Child: toVue2(Vue3Child),
				},
			});

			expect(vm.html()).toBe(`<div>${randomValue}</div>`);
		});

		test('function provide', async () => {
			const randomValue = Math.random();
			const Vue3Parent = {
				template: '<slot/>',
				provide() {
					return {
						randomValue,
					};
				},
			};

			const Vue3Child = {
				template: '{{ randomValue }}',
				inject: ['randomValue'],
			};

			const vm = mount({
				template: `
				<div>
					<vue3-parent>
						<vue3-child />
					</vue3-parent>
				</div>
				`,
				components: {
					Vue3Parent: toVue2(Vue3Parent),
					Vue3Child: toVue2(Vue3Child),
				},
			});

			expect(vm.html()).toBe(`<div>${randomValue}</div>`);
		});

		// Waiting on https://github.com/vuejs/vue-next/issues/2615
		// test('function provide symbol key', async () => {
		// 	const key = Symbol('zx');

		// 	const randomValue = Math.random();

		// 	const Vue3Parent = {
		// 		template: '<slot/>',
		// 		provide() {
		// 			return {
		// 				a: 1,
		// 				[key]: randomValue,
		// 			};
		// 		},
		// 	};

		// 	const Vue3Child = {
		// 		template: '{{ randomValue }}',
		// 		inject: {
		// 			randomValue: key,
		// 		},
		// 		mounted() {
		// 			console.log(this);
		// 		}
		// 	};

		// 	const vm = mount({
		// 		template: `
		// 		<div>
		// 			<vue3-parent>
		// 				<vue3-child />
		// 			</vue3-parent>
		// 		</div>
		// 		`,
		// 		components: {
		// 			Vue3Parent: toVue2(Vue3Parent),
		// 			Vue3Child: toVue2(Vue3Child)
		// 		},
		// 	});

		// 	expect(vm.html()).toBe(`<div>${randomValue}</div>`);
		// });

		test('setup provide/inject', async () => {
			const randomValue = Math.random();
			const symbolKey = Symbol('provide');
			const Vue3Parent = {
				template: '<slot/>',
				setup() {
					provide('randomValue', randomValue);
					provide(symbolKey, 1);
				},
			};

			const Vue3Child = {
				setup() {
					const randomValue = inject('randomValue');
					const symbolInjection = inject(symbolKey);
					return {
						randomValue,
						symbolInjection,
					};
				},
				template: '{{ randomValue }} {{ symbolInjection }}',
			};

			const vm = mount({
				template: `
				<div>
					<vue3-parent>
						<vue3-child />
					</vue3-parent>
				</div>
				`,
				components: {
					Vue3Parent: toVue2(Vue3Parent),
					Vue3Child: toVue2(Vue3Child),
				},
			});

			expect(vm.html()).toBe(`<div>${randomValue} 1</div>`);
		});
	});

	test.todo('providing from Vue 2 component to Vue 3');
});
