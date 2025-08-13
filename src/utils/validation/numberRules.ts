import type { RulesLogic } from 'json-logic-js'
import type { NumberValidationConfig, NumberRule } from '../../types/validation'

function compileRule(rule: NumberRule): RulesLogic {
	switch (rule.type) {
		case 'equals': return { '==': [{ var: 'value' }, rule.value] }
		case 'notEquals': return { '!=': [{ var: 'value' }, rule.value] }
		case 'lt': return { '<': [{ var: 'value' }, rule.value] }
		case 'lte': return { '<=': [{ var: 'value' }, rule.value] }
		case 'gt': return { '>': [{ var: 'value' }, rule.value] }
		case 'gte': return { '>=': [{ var: 'value' }, rule.value] }
		case 'in': return { in: [{ var: 'value' }, rule.options] }
		case 'between': {
			const min = rule.min
			const max = rule.max
			if (rule.inclusive) {
				return { and: [{ '>=': [{ var: 'value' }, min] }, { '<=': [{ var: 'value' }, max] }] }
			}
			return { and: [{ '>': [{ var: 'value' }, min] }, { '<': [{ var: 'value' }, max] }] }
		}
	}
}

export function compileNumberConfigToJsonLogic(config: NumberValidationConfig): RulesLogic | undefined {
	if (!config.rules.length) return undefined
	const compiled = config.rules.map(compileRule)
	return config.combiner === 'all' ? { and: compiled } : { or: compiled }
} 