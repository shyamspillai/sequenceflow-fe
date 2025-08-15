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
	updateNodeValues?: (nodeId: string, values: Record<string, unknown>) => void
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

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export type HttpHeader = {
	id: string
	key: string
	value: string
	enabled: boolean
}

export type ApiRequestTemplate = {
	id: string
	name: string
	description?: string
	category?: string
	method: HttpMethod
	url: string
	headers: HttpHeader[]
	bodyTemplate?: string
	expectedStatusCodes?: number[]
	tags?: string[]
}

export type ApiCallNodeConfig = {
	// API request configuration
	method: HttpMethod
	url: string
	headers: HttpHeader[]
	bodyTemplate?: string // Template string that can use input data
	timeoutMs?: number
	retryCount?: number
	expectedStatusCodes?: number[] // Expected success status codes (default: [200, 201, 202, 204])
	
	// Future: API library template reference
	templateId?: string // Reference to a predefined API template
	libraryTemplate?: ApiRequestTemplate // Embedded template data
	
	// Authentication (future extensibility)
	authType?: 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth'
	authConfig?: Record<string, unknown>
}

export type ApiCallNode = BaseNode<'apiCall', ApiCallNodeConfig> & {
	inputSchema: JSONSchema
	outputSchema: {
		type: 'object'
		properties: {
			status: { type: 'number' }
			statusText: { type: 'string' }
			data: { 
				type: 'object'
				properties?: Record<string, { type: string }>
			}
			headers: { type: 'object' }
			success: { type: 'boolean' }
			error?: { type: 'string' }
		}
	}
}

export type ApiCallNodeData = {
	base: ApiCallNode
	inputValue?: Record<string, unknown>
	responsePreview?: {
		status?: number
		statusText?: string
		data?: unknown
		headers?: Record<string, string>
		success?: boolean
		error?: string
	}
	openEditor?: (nodeId: string) => void
	updateOutput?: (nodeId: string, output: Record<string, unknown>) => void
}

export type DelayType = 'seconds' | 'minutes' | 'hours' | 'days'

export type DelayNodeConfig = {
	delayType: DelayType
	delayValue: number
}

export type DelayNode = BaseNode<'delay', DelayNodeConfig> & {
	inputSchema: JSONSchema
	outputSchema: JSONSchema
}

export type DelayNodeData = {
	base: DelayNode
	openEditor?: (nodeId: string) => void
	updateOutput?: (nodeId: string, output: Record<string, unknown>) => void
}

export type WorkflowNode = InputTextNode | DecisionNode | NotificationNode | ApiCallNode | DelayNode
export type WorkflowNodeData = InputTextNodeData | DecisionNodeData | NotificationNodeData | ApiCallNodeData | DelayNodeData 