import { memo, useMemo } from 'react'
import { Handle, Position, type NodeProps, type Node as FlowNode } from '@xyflow/react'
import type { ApiCallNodeData, HttpMethod } from '../../types/workflow'

const methodColors: Record<HttpMethod, string> = {
	GET: 'bg-blue-100 text-blue-800',
	POST: 'bg-green-100 text-green-800',
	PUT: 'bg-orange-100 text-orange-800',
	PATCH: 'bg-yellow-100 text-yellow-800',
	DELETE: 'bg-red-100 text-red-800',
	HEAD: 'bg-gray-100 text-gray-800',
	OPTIONS: 'bg-purple-100 text-purple-800',
}

function ApiCallNodeComponent({ data }: NodeProps<FlowNode<ApiCallNodeData>>) {
	const { base } = data
	
	const displayUrl = useMemo(() => {
		const url = base.config.url || 'https://api.example.com/endpoint'
		return url.length > 40 ? url.substring(0, 37) + '...' : url
	}, [base.config.url])

	const hasHeaders = base.config.headers?.filter(h => h.enabled && h.key).length > 0
	const hasBody = base.config.bodyTemplate && ['POST', 'PUT', 'PATCH'].includes(base.config.method)

	return (
		<div className="relative rounded-md border border-slate-200 bg-white shadow-sm w-[320px]">
			<div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
				<div className="text-xs font-medium text-slate-700">{base.name}</div>
				<button 
					className="text-[11px] text-blue-700 hover:text-blue-800" 
					onClick={() => data.openEditor?.(base.id)}
				>
					Edit
				</button>
			</div>
			
			<div className="p-3 space-y-2">
				{/* Method and URL */}
				<div className="flex items-center gap-2">
					<span className={`px-2 py-1 rounded text-[10px] font-medium ${methodColors[base.config.method]}`}>
						{base.config.method}
					</span>
					<span className="text-[11px] text-slate-600 font-mono flex-1 truncate" title={base.config.url}>
						{displayUrl}
					</span>
				</div>

				{/* Status */}
				<div className="text-[11px] text-slate-500">
					Ready to execute during workflow run
				</div>

				{/* Configuration indicators */}
				<div className="flex items-center gap-3 text-[10px] text-slate-500">
					{hasHeaders && (
						<span className="flex items-center gap-1">
							<span className="w-2 h-2 bg-blue-400 rounded-full"></span>
							Headers
						</span>
					)}
					{hasBody && (
						<span className="flex items-center gap-1">
							<span className="w-2 h-2 bg-green-400 rounded-full"></span>
							Body
						</span>
					)}
					{base.config.timeoutMs && (
						<span className="flex items-center gap-1">
							<span className="w-2 h-2 bg-orange-400 rounded-full"></span>
							{base.config.timeoutMs}ms
						</span>
					)}
				</div>

				{/* Input schema info */}
				{base.inputSchema && Object.keys(base.inputSchema).length > 0 && (
					<div className="text-[10px] text-slate-500">
						Accepts upstream data for templating
					</div>
				)}
			</div>

			<Handle type="target" position={Position.Left} id="in" />
			<Handle type="source" position={Position.Right} id="out" />
		</div>
	)
}

export default memo(ApiCallNodeComponent) 