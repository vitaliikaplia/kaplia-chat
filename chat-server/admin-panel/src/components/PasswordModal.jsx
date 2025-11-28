import { useState } from 'react';
import { Modal } from './Modal';

export function PasswordModal({ isOpen, onClose, onSave }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!password) {
      setError('Введіть новий пароль');
      return;
    }
    if (password !== confirmPassword) {
      setError('Паролі не співпадають');
      return;
    }
    if (password.length < 6) {
      setError('Пароль має бути не менше 6 символів');
      return;
    }

    onSave(password);
    setPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="🔐 Змінити пароль">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Новий пароль
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder="Введіть новий пароль"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Підтвердіть пароль
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            placeholder="Повторіть пароль"
          />
        </div>

        {error && (
          <div className="text-red-500 text-sm">{error}</div>
        )}

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
