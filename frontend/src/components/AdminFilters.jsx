import { CATEGORIES, STATUSES, LANGUAGES } from '../data/options';

const FIELDS = [
  ['category', 'Category', 'All Categories', CATEGORIES],
  ['status', 'Status', 'All Statuses', STATUSES],
  ['language', 'Language', 'All Languages', LANGUAGES],
];

/** Category / status / language dropdowns shared by the admin dashboard and grievance list. */
export default function AdminFilters({ filters, onChange }) {
  return (
    <div className="filters-grid">
      {FIELDS.map(([key, label, all, options]) => (
        <div key={key} className="field-group">
          <label className="input-label">{label}</label>
          <select className="input-field" value={filters[key]} onChange={(e) => onChange({ ...filters, [key]: e.target.value })}>
            <option value="">{all}</option>
            {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}
