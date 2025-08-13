export type JSONSchema = Record<string, unknown>

export type BaseNode<TType extends string = string, TConfig extends Record<string, unknown> = Record<string, unknown>> = {
	id: string
	type: TType
	name: string
	inputSchema: JSONSchema
	outputSchema: JSONSchema
	config: TConfig
	validationLogic?: import('json-logic-js').RulesLogic
	connections: string[]
}

export type InputKind = 'text' | 'number' | 'date'

export type InputFieldConfig = {
	id: string
	key: string
	label: string
	inputKind: InputKind
	placeholder?: string
	defaultValue?: string | number
	validationLogic?: import('json-logic-js').RulesLogic
	validationConfig?: import('./validation').AnyValidationConfig
}

export type InputTextNodeConfig = {
	// legacy single-field properties are deprecated in favor of fields[]
	placeholder?: string
	defaultValue?: string | number
	inputKind?: InputKind
	fields: InputFieldConfig[]
}

export type InputTextNode = BaseNode<'inputText', InputTextNodeConfig> & {
	inputSchema: {}
	outputSchema: JSONSchema
}

export type InputTextNodeData = {
	base: InputTextNode
	value?: Record<string, string | number>
	errors?: Record<string, string | null>
	openEditor?: (nodeId: string) => void
}

export type WorkflowNode = InputTextNode 