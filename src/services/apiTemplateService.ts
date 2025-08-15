import type { ApiTemplate, GroupedApiTemplates, ApiProvider, ApiTemplateCategory } from '../types/api-template'

class ApiTemplateService {
	private baseUrl: string

	constructor() {
		this.baseUrl = (import.meta as any)?.env?.VITE_SEQUENCE_BE_BASE_URL || 
					   (window as any)?.SEQUENCE_BE_BASE_URL ||
					   'http://localhost:3000'
	}

	async getAllTemplates(): Promise<ApiTemplate[]> {
		const response = await fetch(`${this.baseUrl}/api-templates`)
		if (!response.ok) {
			throw new Error('Failed to fetch API templates')
		}
		return response.json()
	}

	async getGroupedTemplates(): Promise<GroupedApiTemplates> {
		const response = await fetch(`${this.baseUrl}/api-templates/grouped`)
		if (!response.ok) {
			throw new Error('Failed to fetch grouped API templates')
		}
		return response.json()
	}

	async getTemplatesByProvider(provider: ApiProvider): Promise<ApiTemplate[]> {
		const response = await fetch(`${this.baseUrl}/api-templates?provider=${provider}`)
		if (!response.ok) {
			throw new Error('Failed to fetch templates by provider')
		}
		return response.json()
	}

	async getTemplatesByCategory(category: ApiTemplateCategory): Promise<ApiTemplate[]> {
		const response = await fetch(`${this.baseUrl}/api-templates?category=${category}`)
		if (!response.ok) {
			throw new Error('Failed to fetch templates by category')
		}
		return response.json()
	}

	async getTemplateById(id: string): Promise<ApiTemplate> {
		const response = await fetch(`${this.baseUrl}/api-templates/${id}`)
		if (!response.ok) {
			throw new Error('Failed to fetch template')
		}
		return response.json()
	}

	async createTemplate(template: Partial<ApiTemplate>): Promise<ApiTemplate> {
		const response = await fetch(`${this.baseUrl}/api-templates`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(template),
		})
		if (!response.ok) {
			throw new Error('Failed to create template')
		}
		return response.json()
	}

	async updateTemplate(id: string, updates: Partial<ApiTemplate>): Promise<ApiTemplate> {
		const response = await fetch(`${this.baseUrl}/api-templates/${id}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(updates),
		})
		if (!response.ok) {
			throw new Error('Failed to update template')
		}
		return response.json()
	}

	async deleteTemplate(id: string): Promise<void> {
		const response = await fetch(`${this.baseUrl}/api-templates/${id}`, {
			method: 'DELETE',
		})
		if (!response.ok) {
			throw new Error('Failed to delete template')
		}
	}
}

export const apiTemplateService = new ApiTemplateService() 