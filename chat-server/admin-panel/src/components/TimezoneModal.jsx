import { useState, useEffect } from 'react';
import { Modal } from './Modal';

const TIMEZONE_OPTIONS = [
  { value: '-12', label: 'UTC -12:00' },
  { value: '-11', label: 'UTC -11:00' },
  { value: '-10', label: 'UTC -10:00' },
  { value: '-9.5', label: 'UTC -09:30' },
  { value: '-9', label: 'UTC -09:00' },
  { value: '-8', label: 'UTC -08:00' },
  { value: '-7', label: 'UTC -07:00' },
  { value: '-6', label: 'UTC -06:00' },
  { value: '-5', label: 'UTC -05:00' },
  { value: '-4', label: 'UTC -04:00' },
  { value: '-3.5', label: 'UTC -03:30' },
  { value: '-3', label: 'UTC -03:00' },
  { value: '-2', label: 'UTC -02:00' },
  { value: '-1', label: 'UTC -01:00' },
  { value: '0', label: 'UTC +00:00' },
  { value: '1', label: 'UTC +01:00' },
  { value: '2', label: 'UTC +02:00' },
  { value: '3', label: 'UTC +03:00' },
  { value: '3.5', label: 'UTC +03:30' },
  { value: '4', label: 'UTC +04:00' },
  { value: '4.5', label: 'UTC +04:30' },
  { value: '5', label: 'UTC +05:00' },
  { value: '5.5', label: 'UTC +05:30' },
  { value: '5.75', label: 'UTC +05:45' },
  { value: '6', label: 'UTC +06:00' },
  { value: '6.5', label: 'UTC +06:30' },
  { value: '7', label: 'UTC +07:00' },
  { value: '8', label: 'UTC +08:00' },
  { value: '8.75', label: 'UTC +08:45' },
  { value: '9', label: 'UTC +09:00' },
  { value: '9.5', label: 'UTC +09:30' },
  { value: '10', label: 'UTC +10:00' },
  { value: '10.5', label: 'UTC +10:30' },
  { value: '11', label: 'UTC +11:00' },
  { value: '12', label: 'UTC +12:00' },
  { value: '12.75', label: 'UTC +12:45' },
  { value: '13', label: 'UTC +13:00' },
  { value: '14', label: 'UTC +14:00' },
];

export function TimezoneModal({ isOpen, onClose, config, onSave }) {
  const [timezone, setTimezone] = useState('0');
  const [dateFormat, setDateFormat] = useState('d.m.Y');
  const [timeFormat, setTimeFormat] = useState('H:i');

  useEffect(() => {
    if (isOpen && config) {
      setTimezone(config.timezone || '0');
      setDateFormat(config.dateFormat || 'd.m.Y');
      setTimeFormat(config.timeFormat || 'H:i');
    }
  }, [isOpen, config]);

  const handleSave = () => {
    onSave(timezone, dateFormat, timeFormat);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🌍 Часовий пояс та формат">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Часовий пояс
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
          >
            {TIMEZONE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Формат дати
          </label>
          <input
            type="text"
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono"
            placeholder="d.m.Y"
          />
          <p className="text-xs text-gray-500 mt-1">
            Формати: d (день), m (місяць), Y (рік)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Формат часу
          </label>
          <input
            type="text"
            value={timeFormat}
            onChange={(e) => setTimeFormat(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono"
            placeholder="H:i"
          />
          <p className="text-xs text-gray-500 mt-1">
            Формати: H (години 24), g (години 12), i (хвилини), s (секунди), A (AM/PM)
          </p>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition"
        >
          Зберегти
        </button>
      </div>
    </Modal>
  );
}
