import { useMemo, useState, useEffect } from 'react'
import type { AnyValidationConfig, LogicalCombiner, TextRule, NumberRule, DateRule } from '../../types/validation'
import { compileValidationConfigToJsonLogic } from '../../utils/validation/compile'
import { applyJsonLogic } from '../../utils/validation/jsonLogic'

type Props = {
	initial?: AnyValidationConfig
	value: unknown
	onChange: (config: AnyValidationConfig, compiledRule: import('json-logic-js').RulesLogic | undefined) => void
}

export default function RuleBuilder({ initial, value, onChange }: Props) {
	const [kind, setKind] = useState<AnyValidationConfig['kind']>(initial?.kind ?? 'text')
	const [combiner, setCombiner] = useState<LogicalCombiner>(initial?.combiner ?? 'all')
	const [textRules, setTextRules] = useState<TextRule[]>(initial?.kind === 'text' ? initial.rules : [])
	const [numberRules, setNumberRules] = useState<NumberRule[]>(initial?.kind === 'number' ? initial.rules : [])
	const [dateRules, setDateRules] = useState<DateRule[]>(initial?.kind === 'date' ? initial.rules : [])

	const config: AnyValidationConfig = useMemo(() => {
		if (kind === 'text') return { kind, combiner, rules: textRules }
		if (kind === 'number') return { kind, combiner, rules: numberRules }
		return { kind, combiner, rules: dateRules }
	}, [kind, combiner, textRules, numberRules, dateRules])

	const compiled = useMemo(() => compileValidationConfigToJsonLogic(config), [config])
	const testResult = useMemo(() => applyJsonLogic(compiled, { value }), [compiled, value])

	// emit on changes (post-render) to avoid render loops
	useEffect(() => {
		onChange(config, compiled)
	}, [config, compiled, onChange])

	return (
		<div className="space-y-3">
			<div className="flex items-center gap-2">
				<label className="text-xs text-slate-600">Kind</label>
				<select className="border rounded px-2 py-1 text-xs" value={kind} onChange={(e) => setKind(e.target.value as any)}>
					<option value="text">Text</option>
					<option value="number">Number</option>
					<option value="date">Date</option>
				</select>
				<label className="text-xs text-slate-600">When</label>
				<select className="border rounded px-2 py-1 text-xs" value={combiner} onChange={(e) => setCombiner(e.target.value as any)}>
					<option value="all">All rules pass</option>
					<option value="any">Any rule passes</option>
				</select>
			</div>

			{kind === 'text' && (
				<TextRulesEditor rules={textRules} onChange={setTextRules} />
			)}
			{kind === 'number' && (
				<NumberRulesEditor rules={numberRules} onChange={setNumberRules} />
			)}
			{kind === 'date' && (
				<DateRulesEditor rules={dateRules} onChange={setDateRules} />
			)}

			<div className="rounded border p-2">
				<div className="text-xs font-medium text-slate-700">Test with current value</div>
				<div className="text-xs mt-1">Result: <span className={testResult.isValid ? 'text-green-700' : 'text-red-700'}>{testResult.isValid ? 'Valid' : `Invalid${testResult.message ? `: ${testResult.message}` : ''}`}</span></div>
			</div>
		</div>
	)
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="rounded border border-slate-200 p-2">
			<div className="text-xs font-medium text-slate-700 mb-2">{title}</div>
			{children}
		</div>
	)
}

function Row({ children }: { children: React.ReactNode }) {
	return <div className="flex items-center gap-2 mb-2">{children}</div>
}

function TextRulesEditor({ rules, onChange }: { rules: TextRule[]; onChange: (r: TextRule[]) => void }) {
	const [csv, setCsv] = useState<string[]>(rules.map(r => r.type === 'in' ? r.options.join(',') : ''))
	useEffect(() => {
		setCsv((prev) => {
			const next = [...prev]
			while (next.length < rules.length) next.push('')
			if (next.length > rules.length) next.length = rules.length
			return next.map((s, i) => rules[i]?.type === 'in' ? (s || rules[i].type === 'in' ? (rules[i] as any).options?.join(',') ?? '' : '') : '')
		})
	}, [rules.length])
	return (
		<Section title="Text Rules">
			{rules.map((r, i) => (
				<Row key={i}>
					<select className="border rounded px-2 py-1 text-xs" value={r.type} onChange={(e) => {
						const t = e.target.value as TextRule['type']
						setCsv((prev) => prev.map((s, idx) => idx === i ? '' : s))
						onChange(rules.map((x, idx) => idx === i ? (t === 'match' ? { type: 'match', pattern: '' } : t === 'in' ? { type: 'in', options: [] } : { type: 'notEquals', value: '' }) : x))
					}}>
						<option value="match">Match</option>
						<option value="in">In</option>
						<option value="notEquals">Not Equals</option>
					</select>
					{r.type === 'match' && (
						<input className="border rounded px-2 py-1 text-xs" placeholder="pattern" value={r.pattern} onChange={(e) => onChange(rules.map((x, idx) => idx === i ? { ...r, pattern: e.target.value } : x))} />
					)}
					{r.type === 'in' && (
						<input className="border rounded px-2 py-1 text-xs w-64" placeholder="comma,separated,options" value={csv[i] ?? ''} onChange={(e) => {
							const val = e.target.value
							setCsv((prev) => prev.map((s, idx) => idx === i ? val : s))
							onChange(rules.map((x, idx) => idx === i ? { ...r, options: val.split(',').map(s => s.trim()).filter(Boolean) } : x))
						}} />
					)}
					{r.type === 'notEquals' && (
						<input className="border rounded px-2 py-1 text-xs" placeholder="value" value={r.value} onChange={(e) => onChange(rules.map((x, idx) => idx === i ? { ...r, value: e.target.value } : x))} />
					)}
					<button className="text-xs text-red-600" onClick={() => { setCsv(csv.filter((_, idx) => idx !== i)); onChange(rules.filter((_, idx) => idx !== i)) }}>Remove</button>
				</Row>
			))}
			<button className="text-xs text-blue-700" onClick={() => { setCsv([...csv, '']); onChange([...rules, { type: 'match', pattern: '' }]) }}>+ Add rule</button>
		</Section>
	)
}

function NumberRulesEditor({ rules, onChange }: { rules: NumberRule[]; onChange: (r: NumberRule[]) => void }) {
	const [csv, setCsv] = useState<string[]>(rules.map(r => r.type === 'in' ? r.options.join(',') : ''))
	useEffect(() => {
		setCsv((prev) => {
			const next = [...prev]
			while (next.length < rules.length) next.push('')
			if (next.length > rules.length) next.length = rules.length
			return next.map((s, i) => rules[i]?.type === 'in' ? (s || rules[i].type === 'in' ? (rules[i] as any).options?.join(',') ?? '' : '') : '')
		})
	}, [rules.length])
	return (
		<Section title="Number Rules">
			{rules.map((r, i) => (
				<Row key={i}>
					<select className="border rounded px-2 py-1 text-xs" value={r.type} onChange={(e) => {
						const t = e.target.value as NumberRule['type']
						setCsv((prev) => prev.map((s, idx) => idx === i ? '' : s))
						onChange(rules.map((x, idx) => idx === i ? (t === 'in' ? { type: 'in', options: [] } : t === 'between' ? { type: 'between', min: 0, max: 1, inclusive: true } : { type: t as any, value: 0 }) : x))
					}}>
						<option value="equals">Equals</option>
						<option value="notEquals">Not Equals</option>
						<option value="lt">Less Than</option>
						<option value="lte">Less Than or Equal</option>
						<option value="gt">Greater Than</option>
						<option value="gte">Greater Than or Equal</option>
						<option value="in">In</option>
						<option value="between">Between</option>
					</select>
					{('value' in r) && (
						<input type="number" className="border rounded px-2 py-1 text-xs" value={r.value} onChange={(e) => onChange(rules.map((x, idx) => idx === i ? { ...(r as any), value: Number(e.target.value) } : x))} />
					)}
					{r.type === 'in' && (
						<input className="border rounded px-2 py-1 text-xs w-64" placeholder="1,2,3" value={csv[i] ?? ''} onChange={(e) => {
							const val = e.target.value
							setCsv((prev) => prev.map((s, idx) => idx === i ? val : s))
							onChange(rules.map((x, idx) => idx === i ? { ...r, options: val.split(',').map(s => s.trim()).filter(Boolean).map(Number) } : x))
						}} />
					)}
					{r.type === 'between' && (
						<>
							<input type="number" className="border rounded px-2 py-1 text-xs w-24" value={r.min} onChange={(e) => onChange(rules.map((x, idx) => idx === i ? { ...r, min: Number(e.target.value) } : x))} />
							<input type="number" className="border rounded px-2 py-1 text-xs w-24" value={r.max} onChange={(e) => onChange(rules.map((x, idx) => idx === i ? { ...r, max: Number(e.target.value) } : x))} />
							<label className="text-xs"><input type="checkbox" className="mr-1" checked={r.inclusive ?? false} onChange={(e) => onChange(rules.map((x, idx) => idx === i ? { ...r, inclusive: e.target.checked } : x))} /> Inclusive</label>
						</>
					)}
					<button className="text-xs text-red-600" onClick={() => { setCsv(csv.filter((_, idx) => idx !== i)); onChange(rules.filter((_, idx) => idx !== i)) }}>Remove</button>
				</Row>
			))}
			<button className="text-xs text-blue-700" onClick={() => { setCsv([...csv, '']); onChange([...rules, { type: 'equals', value: 0 }]) }}>+ Add rule</button>
		</Section>
	)
}

function DateRulesEditor({ rules, onChange }: { rules: DateRule[]; onChange: (r: DateRule[]) => void }) {
	return (
		<Section title="Date Rules">
			{rules.map((r, i) => (
				<Row key={i}>
					<select className="border rounded px-2 py-1 text-xs" value={r.type} onChange={(e) => {
						const t = e.target.value as DateRule['type']
						onChange(rules.map((x, idx) => idx === i ? (t === 'between' ? { type: 'between', start: '', end: '', inclusive: true } : { type: t as any, date: '', inclusive: true }) : x))
					}}>
						<option value="before">Before</option>
						<option value="after">After</option>
						<option value="between">Between</option>
					</select>
					{(r.type === 'before' || r.type === 'after') && (
						<input type="date" className="border rounded px-2 py-1 text-xs" value={r.date} onChange={(e) => onChange(rules.map((x, idx) => idx === i ? { ...(r as any), date: e.target.value } : x))} />
					)}
					{r.type === 'between' && (
						<>
							<input type="date" className="border rounded px-2 py-1 text-xs" value={r.start} onChange={(e) => onChange(rules.map((x, idx) => idx === i ? { ...r, start: e.target.value } : x))} />
							<input type="date" className="border rounded px-2 py-1 text-xs" value={r.end} onChange={(e) => onChange(rules.map((x, idx) => idx === i ? { ...r, end: e.target.value } : x))} />
							<label className="text-xs"><input type="checkbox" className="mr-1" checked={r.inclusive ?? false} onChange={(e) => onChange(rules.map((x, idx) => idx === i ? { ...r, inclusive: e.target.checked } : x))} /> Inclusive</label>
						</>
					)}
					<button className="text-xs text-red-600" onClick={() => onChange(rules.filter((_, idx) => idx !== i))}>Remove</button>
				</Row>
			))}
			<button className="text-xs text-blue-700" onClick={() => onChange([...rules, { type: 'before', date: '', inclusive: true }])}>+ Add rule</button>
		</Section>
	)
} 