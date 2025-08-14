export function getByPath(obj: any, path: string): any {
	if (!obj || !path) return undefined
	const parts = path.split('.')
	let cur = obj
	for (const p of parts) {
		if (cur && Object.prototype.hasOwnProperty.call(cur, p)) {
			cur = cur[p]
		} else {
			return undefined
		}
	}
	return cur
}

export function interpolateTemplate(template: string, data: Record<string, any>): string {
	if (!template) return ''
	return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, expr: string) => {
		const key = String(expr).trim()
		const val = getByPath(data, key)
		return val === undefined || val === null ? '' : String(val)
	})
} 