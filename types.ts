import type { HTMLAttributes } from "astro/types"

export namespace Code {
	export type Source = string | string[]

	export type Language = "css" | "html" | "js" | "jsx" | "sh" | "svg" | "ts" | "tsx" | "xml"

	export interface Attributes extends HTMLAttributes<"code"> {
		code: Source
		lang: Language
	}
}
