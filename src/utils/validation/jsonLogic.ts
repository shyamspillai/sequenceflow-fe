import jsonLogic, { type RulesLogic } from 'json-logic-js'

export type ValidationResult = { isValid: boolean; message: string | null }

export function applyJsonLogic(rule: RulesLogic | undefined, context: unknown): ValidationResult {
	if (!rule) return { isValid: true, message: null }
	try {
		const result = jsonLogic.apply(rule, context as Record<string, unknown>)
		if (typeof result === 'string') return { isValid: false, message: result }
		return { isValid: Boolean(result), message: Boolean(result) ? null : 'Invalid value' }
	} catch {
		return { isValid: false, message: 'Validation error' }
	}
} 