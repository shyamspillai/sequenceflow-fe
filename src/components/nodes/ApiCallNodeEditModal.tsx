import { useState, useEffect } from 'react'
import type { ApiCallNode, HttpMethod, HttpHeader } from '../../types/workflow'
import type { ApiTemplate } from '../../types/api-template'
import ApiTemplateBrowser from '../ApiTemplateBrowser'

type Props = {
	isOpen: boolean
	node: ApiCallNode
	onClose: () => void
	onSave: (updates: { 
		method: HttpMethod
		url: string
		headers: HttpHeader[]
		bodyTemplate?: string
		timeoutMs?: number
		expectedStatusCodes?: number[]
	}) => void
}

const httpMethods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']

export default function ApiCallNodeEditModal({ isOpen, node, onClose, onSave }: Props) {
	const [method, setMethod] = useState<HttpMethod>(node.config.method || 'GET')
	const [url, setUrl] = useState(node.config.url || '')
	const [headers, setHeaders] = useState<HttpHeader[]>(node.config.headers || [])
	const [bodyTemplate, setBodyTemplate] = useState(node.config.bodyTemplate || '')
	const [timeoutMs, setTimeoutMs] = useState(node.config.timeoutMs || 10000)
	const [expectedStatusCodes, setExpectedStatusCodes] = useState<string>(
		node.config.expectedStatusCodes?.join(', ') || '200, 201, 202, 204'
	)
	const [showTemplateBrowser, setShowTemplateBrowser] = useState(false)

	useEffect(() => {
		if (isOpen) {
			setMethod(node.config.method || 'GET')
			setUrl(node.config.url || '')
			setHeaders(node.config.headers || [])
			setBodyTemplate(node.config.bodyTemplate || '')
			setTimeoutMs(node.config.timeoutMs || 10000)
			setExpectedStatusCodes(node.config.expectedStatusCodes?.join(', ') || '200, 201, 202, 204')
		}
	}, [isOpen, node])

	const addHeader = () => {
		setHeaders([...headers, { 
			id: crypto.randomUUID(), 
			key: '', 
			value: '', 
			enabled: true 
		}])
	}

	const updateHeader = (id: string, field: keyof HttpHeader, value: string | boolean) => {
		setHeaders(headers.map(h => h.id === id ? { ...h, [field]: value } : h))
	}

	const removeHeader = (id: string) => {
		setHeaders(headers.filter(h => h.id !== id))
	}

	const handleTemplateSelect = (template: ApiTemplate) => {
		// Apply template to form
		setMethod(template.method as HttpMethod)
		setUrl(template.url)
		setHeaders(template.headers.map(h => ({
			id: h.id,
			key: h.key,
			value: h.value,
			enabled: h.enabled
		})))
		setBodyTemplate(template.bodyTemplate || '')
		setTimeoutMs(template.timeoutMs)
		setExpectedStatusCodes(template.expectedStatusCodes.join(', '))
	}

	const handleSave = () => {
		const statusCodes = expectedStatusCodes
			.split(',')
			.map(s => parseInt(s.trim()))
			.filter(n => !isNaN(n))

		onSave({
			method,
			url: url.trim(),
			headers: headers.filter(h => h.key.trim()),
			bodyTemplate: bodyTemplate.trim() || undefined,
			timeoutMs: timeoutMs > 0 ? timeoutMs : undefined,
			expectedStatusCodes: statusCodes.length > 0 ? statusCodes : [200, 201, 202, 204]
		})
	}

	const supportsBody = ['POST', 'PUT', 'PATCH'].includes(method)

	if (!isOpen) return null

	return (
		<>
			<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
				<div className="bg-white rounded-lg shadow-xl border border-slate-200 w-[800px] max-w-[95vw] max-h-[90vh] overflow-hidden">
					<div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
						<div className="text-sm font-medium">Configure API Call</div>
						<button className="text-slate-500 text-sm hover:text-slate-700" onClick={onClose}>
							Close
						</button>
					</div>
					
					<div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
						<div className="space-y-4">
							{/* Template Library Section */}
							<div className="border rounded-lg p-3 bg-blue-50">
								<div className="flex items-center justify-between mb-2">
									<div className="text-sm font-medium text-blue-800">API Template Library</div>
									<button 
										className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
										onClick={() => setShowTemplateBrowser(true)}
									>
										📚 Browse Templates
									</button>
								</div>
								<div className="text-xs text-blue-700">
									Choose from pre-configured API templates for Apollo.io, HubSpot, ZoomInfo, and more!
								</div>
							</div>

							{/* Method and URL */}
							<div className="grid grid-cols-4 gap-3">
								<div>
									<label className="block text-xs text-slate-600 mb-1">HTTP Method</label>
									<select 
										className="w-full px-2 py-1 border rounded text-sm"
										value={method}
										onChange={(e) => setMethod(e.target.value as HttpMethod)}
									>
										{httpMethods.map(m => (
											<option key={m} value={m}>{m}</option>
										))}
									</select>
								</div>
								<div className="col-span-3">
									<label className="block text-xs text-slate-600 mb-1">URL</label>
									<input 
										className="w-full px-2 py-1 border rounded text-sm font-mono"
										placeholder="https://api.example.com/endpoint"
										value={url}
										onChange={(e) => setUrl(e.target.value)}
									/>
									<div className="text-[10px] text-slate-500 mt-1">
										Use templates like {`{{field_name}}`} to insert data from input
									</div>
								</div>
							</div>

							{/* Headers */}
							<div>
								<div className="flex items-center justify-between mb-2">
									<label className="text-xs text-slate-600">Headers</label>
									<button 
										className="text-xs text-blue-600 hover:text-blue-700"
										onClick={addHeader}
									>
										+ Add Header
									</button>
								</div>
								<div className="space-y-2 max-h-32 overflow-y-auto">
									{headers.map(header => (
										<div key={header.id} className="flex items-center gap-2">
											<input
												type="checkbox"
												checked={header.enabled}
												onChange={(e) => updateHeader(header.id, 'enabled', e.target.checked)}
												className="w-4 h-4"
											/>
											<input
												className="flex-1 px-2 py-1 border rounded text-xs"
												placeholder="Header name"
												value={header.key}
												onChange={(e) => updateHeader(header.id, 'key', e.target.value)}
											/>
											<input
												className="flex-1 px-2 py-1 border rounded text-xs"
												placeholder="Header value"
												value={header.value}
												onChange={(e) => updateHeader(header.id, 'value', e.target.value)}
											/>
											<button
												className="text-xs text-red-600 hover:text-red-700 px-1"
												onClick={() => removeHeader(header.id)}
											>
												Remove
											</button>
										</div>
									))}
									{headers.length === 0 && (
										<div className="text-xs text-slate-500 py-2">
											No custom headers. Common headers like Content-Type are added automatically.
										</div>
									)}
								</div>
							</div>

							{/* Request Body */}
							{supportsBody && (
								<div>
									<label className="block text-xs text-slate-600 mb-1">Request Body Template</label>
									<textarea
										className="w-full px-2 py-1 border rounded text-xs font-mono h-24"
										placeholder={`{
  "field_name": "{{field_name}}",
  "static_value": "example"
}`}
										value={bodyTemplate}
										onChange={(e) => setBodyTemplate(e.target.value)}
									/>
									<div className="text-[10px] text-slate-500 mt-1">
										JSON template using {`{{field_name}}`} syntax for input data interpolation
									</div>
								</div>
							)}

							{/* Advanced Settings */}
							<div className="grid grid-cols-2 gap-3">
								<div>
									<label className="block text-xs text-slate-600 mb-1">Timeout (ms)</label>
									<input
										type="number"
										className="w-full px-2 py-1 border rounded text-sm"
										value={timeoutMs}
										onChange={(e) => setTimeoutMs(parseInt(e.target.value) || 10000)}
										min="1000"
										max="60000"
										step="1000"
									/>
								</div>
								<div>
									<label className="block text-xs text-slate-600 mb-1">Expected Status Codes</label>
									<input
										className="w-full px-2 py-1 border rounded text-sm"
										placeholder="200, 201, 202, 204"
										value={expectedStatusCodes}
										onChange={(e) => setExpectedStatusCodes(e.target.value)}
									/>
									<div className="text-[10px] text-slate-500 mt-1">
										Comma-separated list of success status codes
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
						<button 
							className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800"
							onClick={onClose}
						>
							Cancel
						</button>
						<button 
							className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
							onClick={handleSave}
						>
							Save
						</button>
					</div>
				</div>
			</div>

			<ApiTemplateBrowser
				isOpen={showTemplateBrowser}
				onClose={() => setShowTemplateBrowser(false)}
				onSelectTemplate={handleTemplateSelect}
			/>
		</>
	)
} 