import type { InputFieldConfig, JSONSchema } from '../types/workflow'

export function inputFieldsToJsonSchema(fields: InputFieldConfig[]): JSONSchema {
	const properties: Record<string, JSONSchema> = {}
	for (const f of fields) {
		if (f.inputKind === 'number') properties[f.key] = { type: 'number' }
		else if (f.inputKind === 'date') properties[f.key] = { type: 'string', format: 'date' }
		else properties[f.key] = { type: 'string' }
	}
	return { type: 'object', properties, required: Object.keys(properties) }
}

export function exampleFromSchema(schema: JSONSchema): unknown {
	if (!schema || typeof schema !== 'object') return {}
	if ('type' in schema && (schema as any).type === 'object' && (schema as any).properties && typeof (schema as any).properties === 'object') {
		const obj: Record<string, unknown> = {}
		for (const [key, prop] of Object.entries((schema as any).properties as Record<string, JSONSchema>)) {
			obj[key] = exampleFromSchema(prop as JSONSchema)
		}
		return obj
	}
	if ('type' in schema && (schema as any).type === 'number') return 0
	if ('type' in schema && (schema as any).type === 'string' && (schema as any).format === 'date') return '2025-01-01'
	if ('type' in schema && (schema as any).type === 'string') return ''
	return {}
} 