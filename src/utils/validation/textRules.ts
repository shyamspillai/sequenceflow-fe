import type { RulesLogic } from 'json-logic-js'
import type { TextValidationConfig, TextRule } from '../../types/validation'

function compileRule(rule: TextRule): RulesLogic {
	switch (rule.type) {
		case 'match': {
			// emulate regex by using JS within json-logic via custom op not supported; fallback: string contains for basic UX
			// Use simple contains as a portable option here
			return { 'in': [rule.pattern, { var: 'value' }] }
		}
		case 'in': {
			return { in: [{ var: 'value' }, rule.options] }
		}
		case 'notEquals': {
			return { '!=': [{ var: 'value' }, rule.value] }
		}
	}
}

export function compileTextConfigToJsonLogic(config: TextValidationConfig): RulesLogic | undefined {
	if (!config.rules.length) return undefined
	const compiled = config.rules.map(compileRule)
	return config.combiner === 'all' ? { and: compiled } : { or: compiled }
} 