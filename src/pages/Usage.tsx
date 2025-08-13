export default function Usage() {
	return (
		<div>
			<h2 className="text-2xl font-semibold tracking-tight text-slate-900">Usage</h2>
			<p className="mt-2 text-slate-600">Track executions and quotas for your account.</p>
			<div className="mt-6 overflow-x-auto">
				<table className="min-w-full text-sm">
					<thead>
						<tr className="text-left text-slate-500">
							<th className="py-2 pr-4">Date</th>
							<th className="py-2 pr-4">Executions</th>
							<th className="py-2 pr-4">Succeeded</th>
							<th className="py-2 pr-4">Failed</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-200">
						{Array.from({ length: 7 }).map((_, i) => (
							<tr key={i}>
								<td className="py-2 pr-4">2025-08-0{i + 1}</td>
								<td className="py-2 pr-4">{Math.floor(Math.random() * 1000)}</td>
								<td className="py-2 pr-4 text-emerald-600">{Math.floor(Math.random() * 900)}</td>
								<td className="py-2 pr-4 text-rose-600">{Math.floor(Math.random() * 100)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
} 