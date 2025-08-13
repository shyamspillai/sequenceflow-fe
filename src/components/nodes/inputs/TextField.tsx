import { memo } from 'react'

type Props = {
	value: string
	placeholder?: string
	onChange: (value: string) => void
	invalid?: boolean
}

function TextField({ value, placeholder, onChange, invalid }: Props) {
	return (
		<input
			type="text"
			className={`w-56 rounded-md border px-2 py-1 text-sm outline-none transition ${invalid ? 'border-red-400 focus:border-red-500 bg-red-50' : 'border-slate-300 focus:border-blue-500'}`}
			placeholder={placeholder}
			value={value}
			onChange={(e) => onChange(e.target.value)}
		/>
	)
}

export default memo(TextField) 