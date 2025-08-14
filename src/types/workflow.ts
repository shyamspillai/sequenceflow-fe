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
	updateOutput?: (nodeId: string, output: Record<string, unknown>) => void
}

export type DecisionPredicate = {
	id: string
	targetField?: string
	validationConfig?: import('./validation').AnyValidationConfig
	validationLogic?: import('json-logic-js').RulesLogic
}

export type DecisionCondition = {
	id: string
	name: string
	// legacy single-field mode
	targetField?: string
	kind?: InputKind
	validationConfig?: import('./validation').AnyValidationConfig
	validationLogic?: import('json-logic-js').RulesLogic
	// new multi-predicate mode
	predicates?: DecisionPredicate[]
	combiner?: 'all' | 'any'
}

export type DecisionNodeConfig = {
	decisions: DecisionCondition[]
}

export type DecisionNode = BaseNode<'decision', DecisionNodeConfig> & {
	// inputSchema should mirror upstream node's output schema when connected
	inputSchema: JSONSchema
	outputSchema: JSONSchema
}

export type DecisionNodeData = {
	base: DecisionNode
	sampleInput?: Record<string, unknown>
	openEditor?: (nodeId: string) => void
	inputValue?: Record<string, unknown>
	updateOutput?: (nodeId: string, output: Record<string, unknown>) => void
}

export type NotificationNodeConfig = {
	template: string
}

export type NotificationNode = BaseNode<'notification', NotificationNodeConfig> & {
	inputSchema: JSONSchema
	outputSchema: {}
}

export type NotificationNodeData = {
	base: NotificationNode
	previewText?: string
	openEditor?: (nodeId: string) => void
	inputValue?: Record<string, unknown>
	updateOutput?: (nodeId: string, output: Record<string, unknown>) => void
}

export type WorkflowNode = InputTextNode | DecisionNode | NotificationNode
export type WorkflowNodeData = InputTextNodeData | DecisionNodeData | NotificationNodeData 