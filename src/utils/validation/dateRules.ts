import type { RulesLogic } from 'json-logic-js'
import type { DateValidationConfig, DateRule } from '../../types/validation'

function compileRule(rule: DateRule): RulesLogic {
	// compare ISO strings lexicographically is safe if normalized; keep simple
	switch (rule.type) {
		case 'before':
			return rule.inclusive
				? { '<=': [{ var: 'value' }, rule.date] }
				: { '<': [{ var: 'value' }, rule.date] }
		case 'after':
			return rule.inclusive
				? { '>=': [{ var: 'value' }, rule.date] }
				: { '>': [{ var: 'value' }, rule.date] }
		case 'between': {
			const startComp = rule.inclusive ? '>=' : '>'
			const endComp = rule.inclusive ? '<=' : '<'
			return { and: [ { [startComp]: [{ var: 'value' }, rule.start] } as RulesLogic, { [endComp]: [{ var: 'value' }, rule.end] } as RulesLogic ] }
		}
	}
}

export function compileDateConfigToJsonLogic(config: DateValidationConfig): RulesLogic | undefined {
	if (!config.rules.length) return undefined
	const compiled = config.rules.map(compileRule)
	return config.combiner === 'all' ? { and: compiled } : { or: compiled }
} 