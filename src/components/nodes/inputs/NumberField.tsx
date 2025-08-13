import { memo } from 'react'

type Props = {
	value: number | ''
	placeholder?: string
	onChange: (value: number | '') => void
	invalid?: boolean
}

function NumberField({ value, placeholder, onChange, invalid }: Props) {
	return (
		<input
			type="number"
			className={`w-56 rounded-md border px-2 py-1 text-sm outline-none transition ${invalid ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-slate-300 focus:border-blue-500'}`}
			placeholder={placeholder}
			value={value}
			onChange={(e) => {
				const val = e.target.value
				onChange(val === '' ? '' : Number(val))
			}}
		/>
	)
}

export default memo(NumberField) 