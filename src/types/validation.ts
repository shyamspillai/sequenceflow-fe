export type ValidationKind = 'text' | 'number' | 'date'

export type LogicalCombiner = 'all' | 'any'

export type TextRuleType = 'match' | 'in' | 'notEquals'
export type NumberRuleType = 'equals' | 'notEquals' | 'lt' | 'lte' | 'gt' | 'gte' | 'in' | 'between'
export type DateRuleType = 'before' | 'after' | 'between'

export type TextRule =
	| { type: 'match'; pattern: string; flags?: string; message?: string }
	| { type: 'in'; options: string[]; message?: string }
	| { type: 'notEquals'; value: string; message?: string }

export type NumberRule =
	| { type: 'equals'; value: number; message?: string }
	| { type: 'notEquals'; value: number; message?: string }
	| { type: 'lt'; value: number; message?: string }
	| { type: 'lte'; value: number; message?: string }
	| { type: 'gt'; value: number; message?: string }
	| { type: 'gte'; value: number; message?: string }
	| { type: 'in'; options: number[]; message?: string }
	| { type: 'between'; min: number; max: number; inclusive?: boolean; message?: string }

export type DateISO = string // ISO 8601 string
export type DateRule =
	| { type: 'before'; date: DateISO; inclusive?: boolean; message?: string }
	| { type: 'after'; date: DateISO; inclusive?: boolean; message?: string }
	| { type: 'between'; start: DateISO; end: DateISO; inclusive?: boolean; message?: string }

export type TextValidationConfig = { kind: 'text'; combiner: LogicalCombiner; rules: TextRule[] }
export type NumberValidationConfig = { kind: 'number'; combiner: LogicalCombiner; rules: NumberRule[] }
export type DateValidationConfig = { kind: 'date'; combiner: LogicalCombiner; rules: DateRule[] }

export type AnyValidationConfig = TextValidationConfig | NumberValidationConfig | DateValidationConfig 