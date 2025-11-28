import { useState, useEffect } from 'react';
import { Modal } from './Modal';

export function TokenModal({ isOpen, onClose, onSave, currentToken, onCopy }) {
  const [token, setToken] = useState('');

  useEffect(() => {
    if (isOpen) {
      setToken(currentToken || '');
    }
  }, [isOpen, currentToken]);

  const handleSave = () => {
    if (!token.trim()) {
      return;
    }
    onSave(token.trim());
    onClose();
  };

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setToken(result);
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    if (onCopy) onCopy();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🔑 API Токен">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Токен для API запитів
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition font-mono text-sm"
              placeholder="API токен"
            />
            <button
              onClick={copyToken}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
              title="Копіювати"
            >
              📋
            </button>
          </div>
        </div>

        <button
          onClick={generateToken}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition"
        >
          🔄 Генерувати новий токен
        </button>

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
