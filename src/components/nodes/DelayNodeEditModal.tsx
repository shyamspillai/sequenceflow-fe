import { useState, useEffect } from 'react'
import type { DelayNode, DelayType } from '../../types/workflow'

export type DelayNodeEditModalProps = {
	isOpen: boolean
	node: DelayNode | null
	onClose: () => void
	onSave: (updates: Partial<DelayNode>) => void
}

export default function DelayNodeEditModal({ isOpen, node, onClose, onSave }: DelayNodeEditModalProps) {
	const [name, setName] = useState('')
	const [delayType, setDelayType] = useState<DelayType>('seconds')
	const [delayValue, setDelayValue] = useState(5)

	useEffect(() => {
		if (node) {
			setName(node.name)
			setDelayType(node.config.delayType)
			setDelayValue(node.config.delayValue)
		}
	}, [node])

	const handleSave = () => {
		if (!node) return
		onSave({
			name,
			config: {
				delayType,
				delayValue
			}
		})
		onClose()
	}

	if (!isOpen || !node) return null

	const formatDuration = (type: DelayType, value: number): string => {
		const units = {
			seconds: value === 1 ? 'second' : 'seconds',
			minutes: value === 1 ? 'minute' : 'minutes', 
			hours: value === 1 ? 'hour' : 'hours',
			days: value === 1 ? 'day' : 'days'
		}
		return `${value} ${units[type]}`
	}

	return (
		<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl border border-slate-200 w-[600px] max-w-[90vw]">
				<div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
					<div className="text-sm font-medium">Edit Delay Node</div>
					<button className="text-slate-500 text-sm" onClick={onClose}>Close</button>
				</div>
				<div className="p-4 space-y-4">
					<div>
						<label className="block text-xs text-slate-600 mb-1">Node Name</label>
						<input 
							className="w-full px-2 py-1 border rounded text-sm"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Delay"
						/>
					</div>

					<div className="grid grid-cols-2 gap-3">
						<div>
							<label className="block text-xs text-slate-600 mb-1">Duration</label>
							<input 
								type="number"
								min="1"
								className="w-full px-2 py-1 border rounded text-sm"
								value={delayValue}
								onChange={(e) => setDelayValue(Math.max(1, parseInt(e.target.value) || 1))}
							/>
						</div>
						<div>
							<label className="block text-xs text-slate-600 mb-1">Unit</label>
							<select 
								className="w-full px-2 py-1 border rounded text-sm"
								value={delayType}
								onChange={(e) => setDelayType(e.target.value as DelayType)}
							>
								<option value="seconds">Seconds</option>
								<option value="minutes">Minutes</option>
								<option value="hours">Hours</option>
								<option value="days">Days</option>
							</select>
						</div>
					</div>

					<div className="bg-blue-50 border border-blue-200 rounded p-3">
						<div className="text-xs text-blue-700 font-medium mb-1">Preview</div>
						<div className="text-sm text-blue-800">
							This node will delay downstream execution by <strong>{formatDuration(delayType, delayValue)}</strong>
						</div>
					</div>

					<div className="text-xs text-slate-500 bg-slate-50 border rounded p-3">
						<div className="font-medium mb-1">How delays work:</div>
						<ul className="space-y-1">
							<li>• The delay node completes immediately</li>
							<li>• Downstream nodes are scheduled to execute after the delay</li>
							<li>• Data flows through unchanged after the delay period</li>
							<li>• Delays are persistent and survive server restarts</li>
						</ul>
					</div>
				</div>
				<div className="px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
					<button className="px-3 py-1 text-sm text-slate-600 border rounded hover:bg-slate-50" onClick={onClose}>
						Cancel
					</button>
					<button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700" onClick={handleSave}>
						Save Changes
					</button>
				</div>
			</div>
		</div>
	)
} 