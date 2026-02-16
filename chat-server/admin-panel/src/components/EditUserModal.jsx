import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useTranslation } from '../i18n';

export function EditUserModal({ isOpen, onClose, userId, userInfo, onSave }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && userInfo) {
      setName(userInfo.user_name || userInfo.name || '');
      setNotes(userInfo.admin_notes || '');
    }
  }, [isOpen, userInfo]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 60) return;
    const trimmedNotes = notes.trim();
    if (trimmedNotes.length > 300) return;
    onSave(userId, trimmedName, trimmedNotes);
    onClose();
  };

  const isValid = name.trim().length >= 2 && name.trim().length <= 60 && notes.trim().length <= 300;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('editUser.title')} size="sm">
      <div className="space-y-4">
        {/* Name field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('editUser.name')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('editUser.namePlaceholder')}
            maxLength={60}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="text-xs text-gray-400 mt-1">{name.trim().length}/60</div>
        </div>

        {/* Notes field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('editUser.notes')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('editUser.notesPlaceholder')}
            maxLength={300}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <div className="text-xs text-gray-400 mt-1">{notes.trim().length}/300</div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            {t('editUser.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className="px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition"
          >
            {t('editUser.save')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
