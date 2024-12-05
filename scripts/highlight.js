export const Highlight = globalThis.Highlight || class Highlight extends Set {
	constructor(range) {
		super([range])
	}
}

export const highlights = globalThis.CSS?.highlights || new Map()

export const highlight = async (node, tokens, type, index = 0) => {
	for (const token of tokens) {
		if (typeof token === "string") {
			const range = new StaticRange({
				startContainer: node,
				startOffset: index,
				endContainer: node,
				endOffset: index + token.length,
			})

			if (highlights.has(type)) {
				highlights.get(type).add(range)
			} else {
				highlights.set(type, new Highlight(range))
			}
		} else {
			highlight(node, [].concat(token.content), token.type, index)
		}

		// biome-ignore lint/style/noParameterAssign: deliberate
		index += token.length
	}
}
