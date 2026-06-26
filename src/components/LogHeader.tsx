import { LogEntry } from '../types/hos';

interface Props {
  log: LogEntry;
  onChange: (updates: Partial<LogEntry>) => void;
}

interface FieldProps {
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}

function Field({ label, value, onChange, type = 'text', placeholder, className = '' }: FieldProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
      />
    </div>
  );
}

export default function LogHeader({ log, onChange }: Props) {
  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
          U.S. DEPARTMENT OF TRANSPORTATION — Driver's Daily Log (24 Hours)
        </h2>
        <label className="flex items-center gap-2 text-xs text-orange-700 font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={log.adverseConditions}
            onChange={e => onChange({ adverseConditions: e.target.checked })}
            className="w-4 h-4 accent-orange-500"
          />
          Adverse Driving Conditions (+2 hrs)
        </label>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field
          label="Driver Name"
          value={log.driverName}
          onChange={v => onChange({ driverName: v })}
          placeholder="Full legal name"
        />
        <Field
          label="Co-Driver"
          value={log.coDriver}
          onChange={v => onChange({ coDriver: v })}
          placeholder="Name of co-driver"
        />
        <Field
          label="Total Miles Driving Today"
          value={log.totalMilesDriving || ''}
          onChange={v => onChange({ totalMilesDriving: parseInt(v, 10) || 0 })}
          type="number"
          placeholder="0"
        />
        <Field
          label="Shipping Documents / PRO No."
          value={log.shippingDocuments}
          onChange={v => onChange({ shippingDocuments: v })}
          placeholder="Bill of lading / manifest"
        />
        <Field
          label="Truck / Tractor No."
          value={log.truckNumber}
          onChange={v => onChange({ truckNumber: v })}
          placeholder="Unit number"
        />
        <Field
          label="Trailer No."
          value={log.trailerNumber}
          onChange={v => onChange({ trailerNumber: v })}
          placeholder="Trailer number"
        />
        <Field
          label="Name of Carrier"
          value={log.carrierName}
          onChange={v => onChange({ carrierName: v })}
          placeholder="Motor carrier name"
          className="md:col-span-2"
        />
        <Field
          label="Main Office Address"
          value={log.mainOfficeAddress}
          onChange={v => onChange({ mainOfficeAddress: v })}
          placeholder="City, State"
          className="md:col-span-2"
        />
      </div>
    </div>
  );
}
