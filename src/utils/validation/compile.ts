import type { RulesLogic } from 'json-logic-js'
import type { AnyValidationConfig } from '../../types/validation'
import { compileTextConfigToJsonLogic } from './textRules'
import { compileNumberConfigToJsonLogic } from './numberRules'
import { compileDateConfigToJsonLogic } from './dateRules'

export function compileValidationConfigToJsonLogic(config?: AnyValidationConfig): RulesLogic | undefined {
	if (!config) return undefined
	switch (config.kind) {
		case 'text': return compileTextConfigToJsonLogic(config)
		case 'number': return compileNumberConfigToJsonLogic(config)
		case 'date': return compileDateConfigToJsonLogic(config)
	}
} 