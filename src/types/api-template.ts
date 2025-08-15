export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export type ApiTemplateCategory = 'enrichment' | 'email' | 'lead-scoring' | 'crm' | 'notification' | 'data' | 'custom'

export type ApiProvider = 'apollo' | 'zoominfo' | 'hubspot' | 'salesforce' | 'clearbit' | 'lemlist' | 'outreach' | 'custom' | 'jsonplaceholder' | 'mock'

export interface ApiHeader {
	id: string
	key: string
	value: string
	enabled: boolean
	description?: string
}

export interface ApiParameter {
	id: string
	key: string
	value: string
	description?: string
	required?: boolean
}

export interface ApiTemplate {
	id: string
	name: string
	description?: string
	provider: ApiProvider
	category: ApiTemplateCategory
	method: HttpMethod
	url: string
	headers: ApiHeader[]
	bodyTemplate?: string
	parameters: ApiParameter[]
	timeoutMs: number
	expectedStatusCodes: number[]
	sampleResponse?: any
	documentation?: string
	tags: string[]
	isActive: boolean
	isCustom: boolean
	createdAt: string
	updatedAt: string
}

export interface GroupedApiTemplates {
	[provider: string]: {
		[category: string]: ApiTemplate[]
	}
}

export const PROVIDER_LABELS: Record<ApiProvider, string> = {
	apollo: 'Apollo.io',
	zoominfo: 'ZoomInfo',
	hubspot: 'HubSpot',
	salesforce: 'Salesforce',
	clearbit: 'Clearbit',
	lemlist: 'Lemlist',
	outreach: 'Outreach',
	custom: 'Custom',
	jsonplaceholder: 'JSONPlaceholder',
	mock: 'Mock APIs'
}

export const CATEGORY_LABELS: Record<ApiTemplateCategory, string> = {
	enrichment: 'Data Enrichment',
	email: 'Email Automation',
	'lead-scoring': 'Lead Scoring',
	crm: 'CRM Operations',
	notification: 'Notifications',
	data: 'Data Operations',
	custom: 'Custom'
}

export const METHOD_COLORS: Record<HttpMethod, string> = {
	GET: 'bg-green-100 text-green-800',
	POST: 'bg-blue-100 text-blue-800',
	PUT: 'bg-orange-100 text-orange-800',
	PATCH: 'bg-yellow-100 text-yellow-800',
	DELETE: 'bg-red-100 text-red-800',
	HEAD: 'bg-gray-100 text-gray-800',
	OPTIONS: 'bg-purple-100 text-purple-800'
} 