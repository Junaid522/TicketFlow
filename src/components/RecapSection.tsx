import { RecapValues, ScheduleType } from '../types/hos';

interface Props {
  recap70: RecapValues;
  recap60: RecapValues;
  schedule: ScheduleType;
  onScheduleChange: (s: ScheduleType) => void;
}

interface RecapTableProps {
  label: string;
  limit: number;
  days: number;
  values: RecapValues;
  active: boolean;
  onSelect: () => void;
}

function fmt(n: number): string {
  return n.toFixed(2);
}

function RecapTable({ label, limit, days, values, active, onSelect }: RecapTableProps) {
  const { a, b, aStar, c } = values;
  return (
    <div
      className={`flex-1 border rounded-lg p-3 cursor-pointer transition-all ${
        active ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 ${
            active ? 'border-blue-500 bg-blue-500' : 'border-gray-400'
          }`}
        />
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{label}</span>
      </div>

      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-1 text-gray-500 font-medium">Col</th>
            <th className="text-left py-1 text-gray-500 font-medium">Description</th>
            <th className="text-right py-1 text-gray-500 font-medium">Hours</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100">
            <td className="py-1 font-bold text-gray-700 pr-2">A</td>
            <td className="py-1 text-gray-600">On-duty hours today (lines 3 & 4)</td>
            <td className="py-1 text-right font-mono text-gray-800">{fmt(a)}</td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="py-1 font-bold text-gray-700 pr-2">B</td>
            <td className="py-1 text-gray-600">
              Total on-duty last {days} days incl. today
            </td>
            <td
              className={`py-1 text-right font-mono font-bold ${
                b > limit ? 'text-red-600' : 'text-gray-800'
              }`}
            >
              {fmt(b)}
            </td>
          </tr>
          <tr className="border-b border-gray-100">
            <td className="py-1 font-bold text-gray-500 pr-2">A*</td>
            <td className="py-1 text-gray-500">Oldest day dropping off tomorrow</td>
            <td className="py-1 text-right font-mono text-gray-500">{fmt(aStar)}</td>
          </tr>
          <tr>
            <td className="py-1 font-bold text-green-700 pr-2">C</td>
            <td className="py-1 text-gray-600">Hours available tomorrow</td>
            <td
              className={`py-1 text-right font-mono font-bold ${
                c <= 0 ? 'text-red-600' : c < 2 ? 'text-yellow-600' : 'text-green-700'
              }`}
            >
              {fmt(c)}
            </td>
          </tr>
        </tbody>
      </table>

      <p className="mt-2 text-[10px] text-gray-400">
        * Taking 34 consecutive hours off resets the {limit}-hr cycle to zero.
      </p>
    </div>
  );
}

export default function RecapSection({ recap70, recap60, schedule, onScheduleChange }: Props) {
  return (
    <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3">
        Recap — Complete at End of Day
      </h3>
      <div className="flex gap-3">
        <RecapTable
          label="70 Hour / 8 Day"
          limit={70}
          days={8}
          values={recap70}
          active={schedule === '70_8'}
          onSelect={() => onScheduleChange('70_8')}
        />
        <RecapTable
          label="60 Hour / 7 Day"
          limit={60}
          days={7}
          values={recap60}
          active={schedule === '60_7'}
          onSelect={() => onScheduleChange('60_7')}
        />
      </div>
    </div>
  );
}
