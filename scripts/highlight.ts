import type { TokenStream } from "./prism.ts"

export const Highlight = globalThis.Highlight || class Highlight extends Set {
	constructor(range: AbstractRange) {
		super([range])
	}
}

export const highlights = globalThis.CSS?.highlights || new Map()

export const highlight = async (node: Node, tokens: TokenStream, type: any, index = 0) => {
	for (const token of tokens) {
		if (typeof token === "string") {
			const range = new StaticRange({
				startContainer: node,
				startOffset: index,
				endContainer: node,
				endOffset: index + token.length,
			})

			if (highlights.has(type)) {
				highlights.get(type)!.add(range)
			} else {
				highlights.set(type, new Highlight(range))
			}
		} else {
			highlight(node, [].concat(token.content as any), token.type, index)
		}

		index += token.length
	}
}
