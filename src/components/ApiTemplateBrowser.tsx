import { useState, useEffect } from 'react'
import type { ApiTemplate, GroupedApiTemplates, ApiProvider } from '../types/api-template'
import { PROVIDER_LABELS, CATEGORY_LABELS, METHOD_COLORS } from '../types/api-template'
import { apiTemplateService } from '../services/apiTemplateService'

interface ApiTemplateBrowserProps {
	isOpen: boolean
	onClose: () => void
	onSelectTemplate: (template: ApiTemplate) => void
}

export default function ApiTemplateBrowser({ isOpen, onClose, onSelectTemplate }: ApiTemplateBrowserProps) {
	const [groupedTemplates, setGroupedTemplates] = useState<GroupedApiTemplates>({})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [searchTerm, setSearchTerm] = useState('')
	const [selectedProvider, setSelectedProvider] = useState<string>('all')
	const [selectedCategory, setSelectedCategory] = useState<string>('all')
	const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)

	useEffect(() => {
		if (isOpen) {
			loadTemplates()
		}
	}, [isOpen])

	const loadTemplates = async () => {
		try {
			setLoading(true)
			setError(null)
			const templates = await apiTemplateService.getGroupedTemplates()
			setGroupedTemplates(templates)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load templates')
		} finally {
			setLoading(false)
		}
	}

	const getAllTemplates = (): ApiTemplate[] => {
		const allTemplates: ApiTemplate[] = []
		Object.values(groupedTemplates).forEach(providerTemplates => {
			Object.values(providerTemplates).forEach(categoryTemplates => {
				allTemplates.push(...categoryTemplates)
			})
		})
		return allTemplates
	}

	const getFilteredTemplates = (): ApiTemplate[] => {
		let templates = getAllTemplates()

		// Filter by search term
		if (searchTerm) {
			const term = searchTerm.toLowerCase()
			templates = templates.filter(template =>
				template.name.toLowerCase().includes(term) ||
				template.description?.toLowerCase().includes(term) ||
				template.tags.some(tag => tag.toLowerCase().includes(term))
			)
		}

		// Filter by provider
		if (selectedProvider !== 'all') {
			templates = templates.filter(template => template.provider === selectedProvider)
		}

		// Filter by category
		if (selectedCategory !== 'all') {
			templates = templates.filter(template => template.category === selectedCategory)
		}

		return templates
	}

	const providers = Object.keys(groupedTemplates)
	const categories = [...new Set(getAllTemplates().map(t => t.category))]

	if (!isOpen) return null

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl w-[95vw] h-[85vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between p-4 border-b">
					<h2 className="text-xl font-semibold">API Template Library</h2>
					<button 
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
					>
						×
					</button>
				</div>

				{/* Filters */}
				<div className="p-4 border-b bg-gray-50">
					<div className="flex gap-4 items-center flex-wrap">
						<div className="flex-1 min-w-64">
							<input
								type="text"
								placeholder="Search templates..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="w-full px-3 py-2 border rounded-md text-sm"
							/>
						</div>
						<div>
							<select
								value={selectedProvider}
								onChange={(e) => setSelectedProvider(e.target.value)}
								className="px-3 py-2 border rounded-md text-sm"
							>
								<option value="all">All Providers</option>
								{providers.map(provider => (
									<option key={provider} value={provider}>
										{PROVIDER_LABELS[provider as ApiProvider] || provider}
									</option>
								))}
							</select>
						</div>
						<div>
							<select
								value={selectedCategory}
								onChange={(e) => setSelectedCategory(e.target.value)}
								className="px-3 py-2 border rounded-md text-sm"
							>
								<option value="all">All Categories</option>
								{categories.map(category => (
									<option key={category} value={category}>
										{CATEGORY_LABELS[category] || category}
									</option>
								))}
							</select>
						</div>
					</div>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-hidden">
					{loading ? (
						<div className="flex items-center justify-center h-full">
							<div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
						</div>
					) : error ? (
						<div className="flex items-center justify-center h-full text-red-500">
							<div className="text-center">
								<div className="mb-2">❌ {error}</div>
								<button
									onClick={loadTemplates}
									className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
								>
									Retry
								</button>
							</div>
						</div>
					) : (
						<div className="h-full overflow-y-auto p-4">
							<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
								{getFilteredTemplates().map(template => (
									<TemplateCard
										key={template.id}
										template={template}
										isExpanded={expandedTemplate === template.id}
										onToggleExpand={() => setExpandedTemplate(
											expandedTemplate === template.id ? null : template.id
										)}
										onSelect={() => {
											onSelectTemplate(template)
											onClose()
										}}
									/>
								))}
							</div>
							{getFilteredTemplates().length === 0 && (
								<div className="text-center text-gray-500 mt-8">
									No templates found matching your criteria
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	)
}

interface TemplateCardProps {
	template: ApiTemplate
	isExpanded: boolean
	onToggleExpand: () => void
	onSelect: () => void
}

function TemplateCard({ template, isExpanded, onToggleExpand, onSelect }: TemplateCardProps) {
	const formatJson = (obj: any) => {
		try {
			return JSON.stringify(obj, null, 2)
		} catch {
			return String(obj)
		}
	}

	return (
		<div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
			<div className="flex items-start justify-between mb-2">
				<div className="flex-1">
					<h3 className="font-medium text-sm">{template.name}</h3>
					<p className="text-xs text-gray-600 mt-1">
						{PROVIDER_LABELS[template.provider]} • {CATEGORY_LABELS[template.category]}
					</p>
				</div>
				<span className={`px-2 py-1 rounded text-xs font-mono ${METHOD_COLORS[template.method]}`}>
					{template.method}
				</span>
			</div>
			
			{template.description && (
				<p className="text-xs text-gray-700 mb-3 line-clamp-2">{template.description}</p>
			)}

			{/* URL Preview */}
			<div className="mb-3 p-2 bg-gray-50 rounded text-xs">
				<div className="text-gray-500 mb-1">Endpoint:</div>
				<div className="font-mono text-gray-800 break-all">{template.url}</div>
			</div>
			
			{/* Tags and Custom Badge */}
			<div className="flex items-center justify-between text-xs text-gray-500 mb-3">
				<div className="flex flex-wrap gap-1">
					{template.tags.slice(0, 2).map(tag => (
						<span key={tag} className="bg-gray-100 px-2 py-1 rounded">
							{tag}
						</span>
					))}
					{template.tags.length > 2 && (
						<span className="bg-gray-100 px-2 py-1 rounded">
							+{template.tags.length - 2}
						</span>
					)}
				</div>
				{template.isCustom && (
					<span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">Custom</span>
				)}
			</div>

			{/* Sample Response Section */}
			<div className="border-t pt-3">
				<button
					onClick={onToggleExpand}
					className="flex items-center justify-between w-full text-xs text-gray-600 hover:text-gray-800 mb-2"
				>
					<span className="font-medium">📄 Sample Response</span>
					<span className="transform transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
						▼
					</span>
				</button>
				
				{isExpanded && template.sampleResponse && (
					<div className="mb-3">
						<pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto font-mono max-h-48 overflow-y-auto">
							{formatJson(template.sampleResponse)}
						</pre>
					</div>
				)}

				{/* Documentation */}
				{isExpanded && template.documentation && (
					<div className="mb-3 p-2 bg-blue-50 rounded">
						<div className="text-xs text-blue-800 font-medium mb-1">📖 Documentation</div>
						<div className="text-xs text-blue-700">{template.documentation}</div>
					</div>
				)}

				{/* Action Button */}
				<button
					onClick={onSelect}
					className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
				>
					🚀 Use This Template
				</button>
			</div>
		</div>
	)
} 