import { useEffect, useMemo, useRef, useState } from 'react'
import type { NotificationNode } from '../../types/workflow'
import { exampleFromSchema } from '../../utils/schema'
import { interpolateTemplate } from '../../utils/template'

export type NotificationModalProps = {
	isOpen: boolean
	node: NotificationNode
	onClose: () => void
	onSave: (updates: { template: string }) => void
}

export default function NotificationNodeEditModal({ isOpen, node, onClose, onSave }: NotificationModalProps) {
	const [template, setTemplate] = useState<string>(node.config.template ?? '')
	const [sample, setSample] = useState<string>('{}')
	const textareaRef = useRef<HTMLTextAreaElement | null>(null)

	useEffect(() => {
		if (!isOpen) return
		try {
			const ex = exampleFromSchema(node.inputSchema)
			setSample(JSON.stringify(ex, null, 2))
		} catch {
			setSample('{}')
		}
	}, [isOpen, node.inputSchema])

	const parsedSample = useMemo(() => { try { return JSON.parse(sample) } catch { return {} } }, [sample])

	const fieldOptions = useMemo(() => {
		const props = (node.inputSchema as any)?.properties as Record<string, unknown> | undefined
		return props ? Object.keys(props) : []
	}, [node.inputSchema])

	const preview = useMemo(() => interpolateTemplate(template, parsedSample), [template, parsedSample])

	if (!isOpen) return null
	return (
		<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl border border-slate-200 w-[900px] max-w-[98vw]">
				<div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
					<div className="text-sm font-medium">Edit Notification</div>
					<button className="text-slate-500 text-sm" onClick={onClose}>Close</button>
				</div>
				<div className="p-4 grid grid-cols-3 gap-4">
					<aside className="col-span-1 border border-slate-200 rounded p-2">
						<div className="text-xs font-medium mb-2">Available fields</div>
						{fieldOptions.length === 0 ? (
							<div className="text-[11px] text-red-600">No fields available from upstream schema. Connect an input node first.</div>
						) : (
							<div className="flex flex-wrap gap-1">
								{fieldOptions.map(k => (
									<button key={k} className="px-2 py-0.5 text-[11px] rounded border hover:bg-slate-50" onClick={() => {
										const el = textareaRef.current
										if (!el) return
										const start = el.selectionStart
										const end = el.selectionEnd
										const before = template.slice(0, start)
										const after = template.slice(end)
										const insertion = `{{ ${k} }}`
										const next = before + insertion + after
										setTemplate(next)
										requestAnimationFrame(() => {
											el.focus()
											el.selectionStart = el.selectionEnd = start + insertion.length
										})
									}}>{k}</button>
								))}
							</div>
						)}
					</aside>
					<div className="col-span-2 space-y-3">
						<div>
							<label className="block text-xs text-slate-600 mb-1">Sample Input (JSON)</label>
							<textarea className="w-full border rounded p-2 text-xs h-28 font-mono" value={sample} onChange={(e) => setSample(e.target.value)} />
						</div>
						<div>
							<label className="block text-xs text-slate-600 mb-1">Template</label>
							<textarea ref={textareaRef} className="w-full border rounded p-2 text-sm h-32 font-mono" placeholder="Hello {{ firstName }}" value={template} onChange={(e) => setTemplate(e.target.value)} />
							<div className="text-[11px] text-slate-500 mt-1">Use {'{{ fieldName }}'} to insert values.</div>
						</div>
						<div className="rounded-md border border-slate-200 p-3">
							<div className="text-xs font-medium text-slate-700 mb-2">Preview</div>
							<div className="text-[12px] text-slate-800 whitespace-pre-wrap break-words min-h-12">{preview || <span className="text-slate-400">No output</span>}</div>
						</div>
					</div>
				</div>
				<div className="px-4 py-3 border-t border-slate-200 flex items-center justify-end gap-2">
					<button className="px-3 py-1.5 text-sm rounded border" onClick={onClose}>Cancel</button>
					<button className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white" onClick={() => onSave({ template })}>Save</button>
				</div>
			</div>
		</div>
	)
} 